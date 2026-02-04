//! File Analyzer Module

use std::path::Path;
use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use anyhow::Result;
use walkdir::WalkDir;
use tracing::{info, debug};

use crate::config::Config;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisResults {
    pub source_path: String,
    pub total_files: usize,
    pub total_size: u64,
    pub file_types: HashMap<String, usize>,
    pub files: Vec<FileInfo>,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileInfo {
    pub path: String,
    pub size: u64,
    pub file_type: String,
    pub modified: Option<String>,
    pub checksum: Option<String>,
}

/// Analyze a source path
pub async fn analyze(source: &str, config: &Config) -> Result<AnalysisResults> {
    let source_path = Path::new(source);
    let mut results = AnalysisResults {
        source_path: source.to_string(),
        total_files: 0,
        total_size: 0,
        file_types: HashMap::new(),
        files: Vec::new(),
        timestamp: chrono_lite_now(),
    };

    let walker = WalkDir::new(source_path)
        .follow_links(config.analysis.follow_symlinks)
        .into_iter()
        .filter_map(|e| e.ok());

    for entry in walker {
        let path = entry.path();

        if path.is_file() {
            if let Ok(metadata) = path.metadata() {
                let size = metadata.len();

                // Skip files larger than max
                if size > config.analysis.max_file_size as u64 {
                    debug!("Skipping large file: {}", path.display());
                    continue;
                }

                let ext = path.extension()
                    .map(|e| e.to_string_lossy().to_lowercase())
                    .unwrap_or_else(|| "unknown".to_string());

                *results.file_types.entry(ext.clone()).or_insert(0) += 1;
                results.total_files += 1;
                results.total_size += size;

                let modified = metadata.modified().ok().map(|t| {
                    format!("{:?}", t)
                });

                results.files.push(FileInfo {
                    path: path.display().to_string(),
                    size,
                    file_type: ext,
                    modified,
                    checksum: None, // Could add SHA256 here
                });
            }
        }
    }

    info!("📊 Analysis complete: {} files, {} bytes",
          results.total_files, results.total_size);

    Ok(results)
}

/// Export analysis results
pub async fn export(results: &AnalysisResults, dest: &str) -> Result<()> {
    let content = serde_json::to_string_pretty(results)?;
    tokio::fs::write(dest, content).await?;
    info!("📤 Exported to: {}", dest);
    Ok(())
}

/// Simple timestamp without heavy chrono dependency
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
    use tempfile::tempdir;
    use std::fs;

    #[tokio::test]
    async fn test_analyze_directory() {
        let temp = tempdir().unwrap();
        fs::write(temp.path().join("file1.txt"), "content1").unwrap();
        fs::write(temp.path().join("file2.md"), "content2").unwrap();

        let config = Config::default();
        let results = analyze(temp.path().to_str().unwrap(), &config).await.unwrap();

        assert_eq!(results.total_files, 2);
        assert!(results.file_types.contains_key("txt"));
        assert!(results.file_types.contains_key("md"));
    }

    #[tokio::test]
    async fn test_export_results() {
        let temp = tempdir().unwrap();
        let dest = temp.path().join("output.json");

        let results = AnalysisResults {
            source_path: "/test".to_string(),
            total_files: 1,
            total_size: 100,
            file_types: HashMap::new(),
            files: vec![],
            timestamp: "12345".to_string(),
        };

        export(&results, dest.to_str().unwrap()).await.unwrap();
        assert!(dest.exists());
    }
}
