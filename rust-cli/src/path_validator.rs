//! Path validation module for security
//!
//! Provides utilities to validate file paths and prevent security issues like:
//! - Directory traversal attacks (../)
//! - Symlink attacks pointing outside allowed directories
//! - Access to restricted system directories

use anyhow::{bail, Result};
use std::path::{Path, PathBuf};
use tracing::warn;

use crate::config::Config;

/// Validates a path is safe to access
///
/// Checks:
/// 1. Path doesn't contain traversal sequences (..)
/// 2. Canonicalized path is within allowed directories (if configured)
/// 3. Symlinks resolve to allowed locations
pub fn validate_path(path: &str, config: &Config) -> Result<PathBuf> {
    let path_obj = Path::new(path);

    // Check for traversal sequences in the original path
    if has_traversal_sequence(path) {
        bail!("Path contains directory traversal sequence: {}", path);
    }

    // Canonicalize to resolve symlinks and get absolute path
    let canonical = match path_obj.canonicalize() {
        Ok(p) => p,
        Err(e) => {
            // If file doesn't exist yet, try to canonicalize parent
            if let Some(parent) = path_obj.parent() {
                if let Ok(parent_canonical) = parent.canonicalize() {
                    // Reconstruct path with canonical parent
                    if let Some(filename) = path_obj.file_name() {
                        parent_canonical.join(filename)
                    } else {
                        bail!("Invalid path: {}", path);
                    }
                } else {
                    bail!("Cannot validate path (parent doesn't exist): {}", path);
                }
            } else {
                bail!("Cannot validate path: {}", e);
            }
        }
    };

    // If allowed_paths is configured and not empty, enforce it
    if !config.security.allowed_paths.is_empty() {
        let mut is_allowed = false;

        for allowed in &config.security.allowed_paths {
            let allowed_path = Path::new(allowed);

            // Try to canonicalize allowed path
            let allowed_canonical = match allowed_path.canonicalize() {
                Ok(p) => p,
                Err(e) => {
                    warn!("Cannot canonicalize allowed path {}: {}", allowed, e);
                    continue;
                }
            };

            // Check if the path is within the allowed directory
            if canonical.starts_with(&allowed_canonical) {
                is_allowed = true;
                break;
            }
        }

        if !is_allowed {
            bail!(
                "Path '{}' is not within allowed directories. Allowed: {:?}",
                path,
                config.security.allowed_paths
            );
        }
    }

    Ok(canonical)
}

/// Check if path contains directory traversal sequences
fn has_traversal_sequence(path: &str) -> bool {
    // Check for various traversal patterns
    let path_lower = path.to_lowercase();
    
    // Check for ../ or ..\
    if path.contains("../") || path.contains("..\\") {
        return true;
    }

    // Check for encoded traversal sequences
    if path_lower.contains("%2e%2e") || path_lower.contains("%252e") {
        return true;
    }

    // Check path components
    let path_obj = Path::new(path);
    for component in path_obj.components() {
        if let Some(s) = component.as_os_str().to_str() {
            if s == ".." {
                return true;
            }
        }
    }

    false
}

/// Validate symlink target
///
/// For symlinks, ensures the target resolves to an allowed location
pub fn validate_symlink(path: &Path, config: &Config) -> Result<()> {
    if !path.is_symlink() {
        return Ok(());
    }

    // Read the symlink target
    let target = std::fs::read_link(path)?;

    // Validate the target path
    let target_str = target
        .to_str()
        .ok_or_else(|| anyhow::anyhow!("Invalid UTF-8 in symlink target"))?;

    validate_path(target_str, config)?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::Config;
    use std::fs;
    use tempfile::TempDir;

    fn create_test_config(allowed_paths: Vec<String>) -> Config {
        let mut config = Config::default();
        config.security.allowed_paths = allowed_paths;
        config
    }

    #[test]
    fn test_has_traversal_sequence() {
        assert!(has_traversal_sequence("../etc/passwd"));
        assert!(has_traversal_sequence("foo/../bar"));
        assert!(has_traversal_sequence("foo\\..\\bar"));
        assert!(has_traversal_sequence("/path/to/../../../etc"));
        assert!(!has_traversal_sequence("/path/to/file.txt"));
        assert!(!has_traversal_sequence("./file.txt"));
        assert!(!has_traversal_sequence("file.txt"));
    }

    #[test]
    fn test_has_traversal_sequence_encoded() {
        assert!(has_traversal_sequence("foo%2e%2e/bar"));
        assert!(has_traversal_sequence("foo%252e%252e/bar"));
    }

    #[test]
    fn test_validate_path_no_allowed_paths() {
        // When no allowed paths configured, should accept any valid path
        let config = create_test_config(vec![]);
        let temp_dir = TempDir::new().unwrap();
        let test_file = temp_dir.path().join("test.txt");
        fs::write(&test_file, "test").unwrap();

        let result = validate_path(test_file.to_str().unwrap(), &config);
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_path_with_traversal() {
        let config = create_test_config(vec![]);
        let result = validate_path("../etc/passwd", &config);
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("directory traversal"));
    }

    #[test]
    fn test_validate_path_with_allowed_paths() {
        let temp_dir = TempDir::new().unwrap();
        let test_file = temp_dir.path().join("test.txt");
        fs::write(&test_file, "test").unwrap();

        let config = create_test_config(vec![temp_dir.path().to_str().unwrap().to_string()]);

        // Should succeed for file in allowed directory
        let result = validate_path(test_file.to_str().unwrap(), &config);
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_path_outside_allowed() {
        let allowed_dir = TempDir::new().unwrap();
        let other_dir = TempDir::new().unwrap();
        let test_file = other_dir.path().join("test.txt");
        fs::write(&test_file, "test").unwrap();

        let config = create_test_config(vec![allowed_dir.path().to_str().unwrap().to_string()]);

        // Should fail for file outside allowed directory
        let result = validate_path(test_file.to_str().unwrap(), &config);
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("not within allowed directories"));
    }

    #[cfg(unix)]
    #[test]
    fn test_validate_symlink() {
        use std::os::unix::fs as unix_fs;

        let temp_dir = TempDir::new().unwrap();
        let target_file = temp_dir.path().join("target.txt");
        let symlink_file = temp_dir.path().join("link.txt");

        fs::write(&target_file, "test").unwrap();
        unix_fs::symlink(&target_file, &symlink_file).unwrap();

        let config = create_test_config(vec![temp_dir.path().to_str().unwrap().to_string()]);

        // Should validate successfully
        let result = validate_symlink(&symlink_file, &config);
        assert!(result.is_ok());
    }

    #[cfg(unix)]
    #[test]
    fn test_validate_symlink_outside_allowed() {
        use std::os::unix::fs as unix_fs;

        let allowed_dir = TempDir::new().unwrap();
        let other_dir = TempDir::new().unwrap();

        let target_file = other_dir.path().join("target.txt");
        let symlink_file = allowed_dir.path().join("link.txt");

        fs::write(&target_file, "test").unwrap();
        unix_fs::symlink(&target_file, &symlink_file).unwrap();

        let config = create_test_config(vec![allowed_dir.path().to_str().unwrap().to_string()]);

        // Should fail because symlink points outside allowed directory
        let result = validate_symlink(&symlink_file, &config);
        assert!(result.is_err());
    }
}
