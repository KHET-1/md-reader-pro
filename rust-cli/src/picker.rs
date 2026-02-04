//! Source/Destination Picker Module
//!
//! Provides interactive file/directory selection for CLI mode.
//! TUI and GUI modes have their own implementations.

use std::io::{self, Write};
use std::path::{Path, PathBuf};
use std::fs;
use anyhow::Result;
// Logging available if needed

/// Select a source path interactively
pub async fn select_source() -> Result<String> {
    println!("\n📂 Source Selection");
    println!("{}", "─".repeat(40));

    let path = prompt_path("Enter source path (file or directory)")?;

    // Validate
    if !Path::new(&path).exists() {
        anyhow::bail!("Source path does not exist: {}", path);
    }

    println!("✅ Source: {}", path);
    Ok(path)
}

/// Select a destination path interactively
pub async fn select_dest() -> Result<String> {
    println!("\n📂 Destination Selection");
    println!("{}", "─".repeat(40));

    let path = prompt_path("Enter destination path")?;

    // Create parent directories if needed
    if let Some(parent) = Path::new(&path).parent() {
        if !parent.exists() {
            println!("📁 Creating directory: {}", parent.display());
            fs::create_dir_all(parent)?;
        }
    }

    println!("✅ Destination: {}", path);
    Ok(path)
}

/// Prompt for a path with optional tab completion hints
fn prompt_path(prompt: &str) -> Result<String> {
    print!("{}: ", prompt);
    io::stdout().flush()?;

    let mut input = String::new();
    io::stdin().read_line(&mut input)?;

    let path = input.trim().to_string();

    // Expand ~ to home directory
    let path = if path.starts_with('~') {
        let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
        path.replacen('~', &home, 1)
    } else {
        path
    };

    // Make absolute if relative
    let path = if !Path::new(&path).is_absolute() {
        std::env::current_dir()?.join(&path).to_string_lossy().to_string()
    } else {
        path
    };

    Ok(path)
}

/// Browse directory contents
pub fn browse_dir(path: &Path) -> Result<Vec<PathBuf>> {
    let mut entries = Vec::new();

    for entry in fs::read_dir(path)? {
        let entry = entry?;
        entries.push(entry.path());
    }

    entries.sort();
    Ok(entries)
}

/// Format path for display with type indicator
pub fn format_path(path: &Path) -> String {
    let name = path.file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| path.display().to_string());

    let icon = if path.is_dir() {
        "📁"
    } else if is_executable(path) {
        "⚙️"
    } else {
        "📄"
    };

    format!("{} {}", icon, name)
}

/// Check if path is executable
fn is_executable(path: &Path) -> bool {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if let Ok(metadata) = path.metadata() {
            return metadata.permissions().mode() & 0o111 != 0;
        }
    }
    false
}

/// Quick path validation
pub fn validate_source(path: &str) -> Result<PathBuf> {
    let path = PathBuf::from(path);

    if !path.exists() {
        anyhow::bail!("Path does not exist: {}", path.display());
    }

    Ok(path.canonicalize()?)
}

/// Validate destination path
pub fn validate_dest(path: &str) -> Result<PathBuf> {
    let path = PathBuf::from(path);

    // Destination doesn't need to exist, but parent should
    if let Some(parent) = path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)?;
        }
    }

    Ok(path)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_browse_dir() {
        let temp = tempdir().unwrap();
        fs::write(temp.path().join("file1.txt"), "content").unwrap();
        fs::write(temp.path().join("file2.txt"), "content").unwrap();

        let entries = browse_dir(temp.path()).unwrap();
        assert_eq!(entries.len(), 2);
    }

    #[test]
    fn test_format_path_file() {
        let temp = tempfile::NamedTempFile::new().unwrap();
        let formatted = format_path(temp.path());
        assert!(formatted.contains("📄"));
    }

    #[test]
    fn test_format_path_dir() {
        let temp = tempdir().unwrap();
        let formatted = format_path(temp.path());
        assert!(formatted.contains("📁"));
    }

    #[test]
    fn test_validate_source_exists() {
        let temp = tempfile::NamedTempFile::new().unwrap();
        let result = validate_source(temp.path().to_str().unwrap());
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_source_not_exists() {
        let result = validate_source("/nonexistent/path/xyz");
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_dest_creates_parent() {
        let temp = tempdir().unwrap();
        let dest = temp.path().join("new_dir").join("output.txt");

        let result = validate_dest(dest.to_str().unwrap());
        assert!(result.is_ok());
        assert!(dest.parent().unwrap().exists());
    }
}
