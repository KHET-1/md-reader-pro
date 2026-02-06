//! IPC module for plugin mode communication
//!
//! Handles stdin/stdout JSON messaging with MD Reader Pro host.

use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::io::{BufRead, Write};
use tracing::debug;

use crate::analyzer;
use crate::config::Config;
use crate::path_validator;

/// Incoming message from host
#[derive(Debug, Deserialize)]
pub struct PluginMessage {
    pub id: String,
    pub action: String,
    #[serde(default)]
    pub payload: serde_json::Value,
}

/// Outgoing response to host
#[derive(Debug, Serialize)]
pub struct PluginResponse {
    pub id: String,
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

impl PluginResponse {
    pub fn success(id: String, data: serde_json::Value) -> Self {
        Self {
            id,
            success: true,
            data: Some(data),
            error: None,
        }
    }

    pub fn error(id: String, error: String) -> Self {
        Self {
            id,
            success: false,
            data: None,
            error: Some(error),
        }
    }
}

/// Analysis result for file
#[derive(Debug, Serialize)]
pub struct FileAnalysis {
    pub path: String,
    pub size: u64,
    pub file_type: String,
    pub permissions: String,
    pub hash: Option<String>,
    pub line_count: Option<u64>,
    pub word_count: Option<u64>,
    pub is_binary: bool,
}

/// Report result
#[derive(Debug, Serialize)]
pub struct Report {
    pub generated_at: String,
    pub files_analyzed: usize,
    pub total_size: u64,
    pub analyses: Vec<FileAnalysis>,
}

/// Run the plugin server (IPC mode)
pub async fn run_plugin_server() -> Result<()> {
    // Send ready signal
    let ready = PluginResponse::success(
        "init".to_string(),
        serde_json::json!({
            "status": "ready",
            "version": env!("CARGO_PKG_VERSION"),
            "capabilities": ["analyze", "report", "browse"]
        }),
    );
    send_response(&ready)?;

    // Main message loop
    let stdin = std::io::stdin();
    let reader = stdin.lock();

    for line in reader.lines() {
        let line = match line {
            Ok(l) => l,
            Err(e) => {
                debug!("stdin read error: {}", e);
                break;
            }
        };

        if line.is_empty() {
            continue;
        }

        let response = match serde_json::from_str::<PluginMessage>(&line) {
            Ok(msg) => handle_message(msg).await,
            Err(e) => PluginResponse::error(
                "unknown".to_string(),
                format!("Invalid message: {}", e),
            ),
        };

        send_response(&response)?;
    }

    Ok(())
}

/// Send response to stdout
fn send_response(response: &PluginResponse) -> Result<()> {
    let json = serde_json::to_string(response)?;
    let mut stdout = std::io::stdout().lock();
    writeln!(stdout, "{}", json)?;
    stdout.flush()?;
    Ok(())
}

/// Handle incoming message
async fn handle_message(msg: PluginMessage) -> PluginResponse {
    match msg.action.as_str() {
        "ping" => handle_ping(msg.id),
        "analyze" => handle_analyze(msg.id, msg.payload).await,
        "deep_analyze" => handle_deep_analyze(msg.id, msg.payload).await,
        "report" => handle_report(msg.id, msg.payload).await,
        "browse" => handle_browse(msg.id, msg.payload).await,
        "set_theme" => handle_set_theme(msg.id, msg.payload),
        "get_capabilities" => handle_capabilities(msg.id),
        "set_allowed_directories" => handle_set_allowed_directories(msg.id, msg.payload),
        "add_allowed_directory" => handle_add_allowed_directory(msg.id, msg.payload),
        "clear_allowed_directories" => handle_clear_allowed_directories(msg.id),
        "shutdown" => handle_shutdown(msg.id),
        _ => PluginResponse::error(
            msg.id,
            format!("Unknown action: {}", msg.action),
        ),
    }
}

fn handle_ping(id: String) -> PluginResponse {
    PluginResponse::success(id, serde_json::json!({ "pong": true }))
}

async fn handle_analyze(id: String, payload: serde_json::Value) -> PluginResponse {
    let files: Vec<String> = match payload.get("files") {
        Some(f) => serde_json::from_value(f.clone()).unwrap_or_default(),
        None => return PluginResponse::error(id, "Missing 'files' in payload".to_string()),
    };

    if files.is_empty() {
        return PluginResponse::error(id, "No files provided".to_string());
    }

    // Validate all paths first
    let validated_paths = match path_validator::validate_paths(&files) {
        Ok(paths) => paths,
        Err(e) => {
            return PluginResponse::error(
                id,
                format!("Path validation failed: {}", e),
            );
        }
    };

    let mut analyses = Vec::new();
    let config = Config::default();

    for path in &validated_paths {
        match analyze_file(path.to_str().unwrap_or(""), &config).await {
            Ok(analysis) => analyses.push(analysis),
            Err(e) => {
                return PluginResponse::error(
                    id,
                    format!("Failed to analyze {}: {}", path.display(), e),
                );
            }
        }
    }

    PluginResponse::success(
        id,
        serde_json::json!({
            "files_analyzed": analyses.len(),
            "analyses": analyses
        }),
    )
}

async fn analyze_file(path: &str, _config: &Config) -> Result<FileAnalysis> {
    // Validate path for security
    let validated_path = path_validator::validate_path(path)?;
    let path_str = validated_path.to_string_lossy();
    
    let metadata = tokio::fs::metadata(&validated_path).await?;
    let file_type = if metadata.is_dir() {
        "directory".to_string()
    } else if metadata.is_symlink() {
        "symlink".to_string()
    } else {
        // Try to detect by extension
        validated_path
            .extension()
            .and_then(|e| e.to_str())
            .map(|e| e.to_lowercase())
            .unwrap_or_else(|| "unknown".to_string())
    };

    #[cfg(unix)]
    let permissions = {
        use std::os::unix::fs::PermissionsExt;
        format!("{:o}", metadata.permissions().mode() & 0o777)
    };
    #[cfg(not(unix))]
    let permissions = if metadata.permissions().readonly() {
        "readonly".to_string()
    } else {
        "readwrite".to_string()
    };

    // Read file for text analysis if not too large
    let (line_count, word_count, is_binary) = if metadata.is_file() && metadata.len() < 10_000_000 {
        match tokio::fs::read(&validated_path).await {
            Ok(content) => {
                let is_binary = content.iter().take(8192).any(|&b| b == 0);
                if is_binary {
                    (None, None, true)
                } else {
                    let text = String::from_utf8_lossy(&content);
                    let lines = text.lines().count() as u64;
                    let words = text.split_whitespace().count() as u64;
                    (Some(lines), Some(words), false)
                }
            }
            Err(_) => (None, None, false),
        }
    } else {
        (None, None, false)
    };

    Ok(FileAnalysis {
        path: path_str.to_string(),
        size: metadata.len(),
        file_type,
        permissions,
        hash: None, // Could add SHA256 here
        line_count,
        word_count,
        is_binary,
    })
}

async fn handle_report(id: String, payload: serde_json::Value) -> PluginResponse {
    let files: Vec<String> = match payload.get("files") {
        Some(f) => serde_json::from_value(f.clone()).unwrap_or_default(),
        None => return PluginResponse::error(id, "Missing 'files' in payload".to_string()),
    };

    let config = Config::default();
    let mut analyses = Vec::new();
    let mut total_size = 0u64;

    for path in &files {
        match analyze_file(path, &config).await {
            Ok(analysis) => {
                total_size += analysis.size;
                analyses.push(analysis);
            }
            Err(e) => {
                debug!("Skipping {}: {}", path, e);
            }
        }
    }

    let report = Report {
        generated_at: chrono_lite_now(),
        files_analyzed: analyses.len(),
        total_size,
        analyses,
    };

    PluginResponse::success(id, serde_json::to_value(report).unwrap())
}

async fn handle_browse(id: String, payload: serde_json::Value) -> PluginResponse {
    let path = payload
        .get("path")
        .and_then(|p| p.as_str())
        .unwrap_or(".");

    // Validate path for security
    let validated_path = match path_validator::validate_path(path) {
        Ok(p) => p,
        Err(e) => {
            return PluginResponse::error(id, format!("Invalid path: {}", e));
        }
    };

    let mut entries = Vec::new();

    match tokio::fs::read_dir(&validated_path).await {
        Ok(mut dir) => {
            while let Ok(Some(entry)) = dir.next_entry().await {
                let name = entry.file_name().to_string_lossy().to_string();
                let file_type = if entry.path().is_dir() {
                    "directory"
                } else {
                    "file"
                };
                entries.push(serde_json::json!({
                    "name": name,
                    "path": entry.path().to_string_lossy(),
                    "type": file_type
                }));
            }
        }
        Err(e) => {
            return PluginResponse::error(id, format!("Failed to read directory: {}", e));
        }
    }

    PluginResponse::success(
        id,
        serde_json::json!({
            "path": validated_path.to_string_lossy(),
            "entries": entries
        }),
    )
}

/// Deep analyze using the full analyzer module (directory recursion, file types, etc.)
async fn handle_deep_analyze(id: String, payload: serde_json::Value) -> PluginResponse {
    let path = match payload.get("path").and_then(|p| p.as_str()) {
        Some(p) => p,
        None => return PluginResponse::error(id, "Missing 'path' in payload".to_string()),
    };

    // Validate path for security
    let validated_path = match path_validator::validate_path(path) {
        Ok(p) => p,
        Err(e) => {
            return PluginResponse::error(id, format!("Invalid path: {}", e));
        }
    };

    let config = Config::default();

    match analyzer::analyze(validated_path.to_str().unwrap_or(path), &config).await {
        Ok(results) => {
            PluginResponse::success(id, serde_json::to_value(results).unwrap_or_default())
        }
        Err(e) => PluginResponse::error(id, format!("Deep analysis failed: {}", e)),
    }
}

/// Current theme (stored for plugin mode)
static CURRENT_THEME: std::sync::atomic::AtomicU8 = std::sync::atomic::AtomicU8::new(0);

/// Theme constants
const THEME_DARK: u8 = 0;
const THEME_LIGHT: u8 = 1;

fn handle_set_theme(id: String, payload: serde_json::Value) -> PluginResponse {
    let theme = payload
        .get("theme")
        .and_then(|t| t.as_str())
        .unwrap_or("dark");

    let theme_id = match theme {
        "light" => THEME_LIGHT,
        _ => THEME_DARK,
    };

    CURRENT_THEME.store(theme_id, std::sync::atomic::Ordering::SeqCst);

    PluginResponse::success(
        id,
        serde_json::json!({
            "theme": theme,
            "applied": true
        }),
    )
}

/// Get current theme name
#[allow(dead_code)]
pub fn get_current_theme() -> &'static str {
    match CURRENT_THEME.load(std::sync::atomic::Ordering::SeqCst) {
        THEME_LIGHT => "light",
        _ => "dark",
    }
}

fn handle_capabilities(id: String) -> PluginResponse {
    PluginResponse::success(
        id,
        serde_json::json!({
            "actions": [
                "ping", "analyze", "deep_analyze", "report", "browse", 
                "set_theme", "set_allowed_directories", "add_allowed_directory", 
                "clear_allowed_directories", "shutdown"
            ],
            "version": env!("CARGO_PKG_VERSION"),
            "features": {
                "tui": cfg!(feature = "tui"),
                "gui": cfg!(feature = "gui"),
                "path_validation": true
            }
        }),
    )
}

fn handle_shutdown(id: String) -> PluginResponse {
    // In real impl, would set a flag to exit gracefully
    PluginResponse::success(id, serde_json::json!({ "shutdown": "acknowledged" }))
}

/// Handle setting allowed directories (replaces existing list)
fn handle_set_allowed_directories(id: String, payload: serde_json::Value) -> PluginResponse {
    let directories: Vec<String> = match payload.get("directories") {
        Some(dirs) => match serde_json::from_value(dirs.clone()) {
            Ok(d) => d,
            Err(e) => {
                return PluginResponse::error(id, format!("Invalid directories format: {}", e));
            }
        },
        None => {
            return PluginResponse::error(id, "Missing 'directories' in payload".to_string());
        }
    };

    // Clear existing directories
    if let Err(e) = path_validator::clear_allowed_directories() {
        return PluginResponse::error(id, format!("Failed to clear directories: {}", e));
    }

    // Add new directories
    let mut added = Vec::new();
    let mut failed = Vec::new();

    for dir in directories {
        match path_validator::add_allowed_directory(&dir) {
            Ok(_) => added.push(dir),
            Err(e) => failed.push(serde_json::json!({
                "path": dir,
                "error": e.to_string()
            })),
        }
    }

    PluginResponse::success(
        id,
        serde_json::json!({
            "added": added,
            "failed": failed,
            "total": added.len()
        }),
    )
}

/// Handle adding a single allowed directory
fn handle_add_allowed_directory(id: String, payload: serde_json::Value) -> PluginResponse {
    let directory = match payload.get("directory").and_then(|d| d.as_str()) {
        Some(d) => d,
        None => {
            return PluginResponse::error(id, "Missing 'directory' in payload".to_string());
        }
    };

    match path_validator::add_allowed_directory(directory) {
        Ok(_) => PluginResponse::success(
            id,
            serde_json::json!({
                "directory": directory,
                "added": true
            }),
        ),
        Err(e) => PluginResponse::error(id, format!("Failed to add directory: {}", e)),
    }
}

/// Handle clearing all allowed directories
fn handle_clear_allowed_directories(id: String) -> PluginResponse {
    match path_validator::clear_allowed_directories() {
        Ok(_) => PluginResponse::success(
            id,
            serde_json::json!({
                "cleared": true
            }),
        ),
        Err(e) => PluginResponse::error(id, format!("Failed to clear directories: {}", e)),
    }
}

/// Simple timestamp without chrono dependency
fn chrono_lite_now() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let duration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    format!("{}", duration.as_secs())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_plugin_response_success() {
        let resp = PluginResponse::success(
            "test-1".to_string(),
            serde_json::json!({"foo": "bar"}),
        );
        assert!(resp.success);
        assert!(resp.error.is_none());
        assert!(resp.data.is_some());
    }

    #[test]
    fn test_plugin_response_error() {
        let resp = PluginResponse::error("test-2".to_string(), "oops".to_string());
        assert!(!resp.success);
        assert!(resp.error.is_some());
        assert!(resp.data.is_none());
    }

    #[test]
    fn test_message_deserialize() {
        let json = r#"{"id":"msg-1","action":"ping","payload":{}}"#;
        let msg: PluginMessage = serde_json::from_str(json).unwrap();
        assert_eq!(msg.id, "msg-1");
        assert_eq!(msg.action, "ping");
    }

    #[test]
    fn test_handle_ping() {
        let resp = handle_ping("ping-test".to_string());
        assert!(resp.success);
    }

    #[test]
    fn test_handle_capabilities() {
        let resp = handle_capabilities("cap-test".to_string());
        assert!(resp.success);
        let data = resp.data.unwrap();
        assert!(data.get("actions").is_some());
    }
}
