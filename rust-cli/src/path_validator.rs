//! Path validation module for security
//!
//! Provides path validation utilities to prevent:
//! - Path traversal attacks (../)
//! - Access to files outside user-selected directories
//! - Symlink attacks to restricted areas

use anyhow::{anyhow, Result};
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::sync::{Arc, RwLock};

lazy_static::lazy_static! {
    /// Global allowlist of user-selected directories
    /// Paths can only be accessed if they're within one of these directories
    static ref ALLOWED_DIRECTORIES: Arc<RwLock<HashSet<PathBuf>>> = Arc::new(RwLock::new(HashSet::new()));
}

/// Add a directory to the allowlist of user-selected directories
pub fn add_allowed_directory<P: AsRef<Path>>(path: P) -> Result<()> {
    let canonical = std::fs::canonicalize(path.as_ref())?;
    let mut dirs = ALLOWED_DIRECTORIES
        .write()
        .map_err(|e| anyhow!("Failed to acquire lock: {}", e))?;
    dirs.insert(canonical);
    Ok(())
}

/// Clear all allowed directories
pub fn clear_allowed_directories() -> Result<()> {
    let mut dirs = ALLOWED_DIRECTORIES
        .write()
        .map_err(|e| anyhow!("Failed to acquire lock: {}", e))?;
    dirs.clear();
    Ok(())
}

/// Get all allowed directories (for testing/debugging)
#[allow(dead_code)]
pub fn get_allowed_directories() -> Result<Vec<PathBuf>> {
    let dirs = ALLOWED_DIRECTORIES
        .read()
        .map_err(|e| anyhow!("Failed to acquire lock: {}", e))?;
    Ok(dirs.iter().cloned().collect())
}

/// Validate a path for security concerns
///
/// This function performs several security checks:
/// 1. Rejects paths containing ".." (path traversal)
/// 2. Canonicalizes the path to resolve symlinks
/// 3. Ensures the path is within user-selected directories (if any are set)
///
/// # Arguments
/// * `path` - The path to validate
///
/// # Returns
/// * `Ok(PathBuf)` - The canonicalized, validated path
/// * `Err(anyhow::Error)` - If the path fails validation
pub fn validate_path<P: AsRef<Path>>(path: P) -> Result<PathBuf> {
    let path_ref = path.as_ref();
    
    // Check for path traversal sequences
    if contains_traversal(path_ref) {
        return Err(anyhow!(
            "Path contains traversal sequence (..): {}",
            path_ref.display()
        ));
    }

    // Canonicalize to resolve symlinks and get absolute path
    let canonical = match std::fs::canonicalize(path_ref) {
        Ok(p) => p,
        Err(e) => {
            return Err(anyhow!(
                "Failed to canonicalize path '{}': {}",
                path_ref.display(),
                e
            ));
        }
    };

    // If allowlist is set, ensure the path is within an allowed directory
    let dirs = ALLOWED_DIRECTORIES
        .read()
        .map_err(|e| anyhow!("Failed to acquire lock: {}", e))?;
    
    if !dirs.is_empty() {
        let is_allowed = dirs.iter().any(|allowed_dir| {
            canonical.starts_with(allowed_dir)
        });

        if !is_allowed {
            return Err(anyhow!(
                "Path '{}' is not within any user-selected directory",
                canonical.display()
            ));
        }
    }

    Ok(canonical)
}

/// Check if a path contains traversal sequences (..)
fn contains_traversal<P: AsRef<Path>>(path: P) -> bool {
    path.as_ref()
        .components()
        .any(|component| matches!(component, std::path::Component::ParentDir))
}

/// Validate multiple paths at once
pub fn validate_paths<P: AsRef<Path>>(paths: &[P]) -> Result<Vec<PathBuf>> {
    paths
        .iter()
        .map(|p| validate_path(p))
        .collect::<Result<Vec<_>>>()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn test_contains_traversal() {
        assert!(contains_traversal("../etc/passwd"));
        assert!(contains_traversal("foo/../bar"));
        assert!(contains_traversal("./foo/../../bar"));
        assert!(!contains_traversal("./foo/bar"));
        assert!(!contains_traversal("/absolute/path"));
    }

    #[test]
    fn test_validate_path_rejects_traversal() {
        // Create a temporary directory
        let temp = TempDir::new().unwrap();
        let test_file = temp.path().join("test.txt");
        fs::write(&test_file, "test").unwrap();

        // Try to access it via traversal
        let traversal_path = temp.path().join("..").join(temp.path().file_name().unwrap()).join("test.txt");
        
        let result = validate_path(&traversal_path);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("traversal"));
    }

    #[test]
    fn test_validate_path_with_allowlist() {
        // Clear any previous state
        clear_allowed_directories().unwrap();
        
        let temp = TempDir::new().unwrap();
        let test_file = temp.path().join("test.txt");
        fs::write(&test_file, "test").unwrap();

        // Set allowlist
        add_allowed_directory(temp.path()).unwrap();

        // Valid path within allowed directory
        let result = validate_path(&test_file);
        assert!(result.is_ok(), "Should accept file in allowed directory");

        // Create a subdirectory that's allowed (since parent is allowed)
        let subdir = temp.path().join("subdir");
        fs::create_dir(&subdir).unwrap();
        let sub_file = subdir.join("sub.txt");
        fs::write(&sub_file, "test").unwrap();
        
        let result = validate_path(&sub_file);
        assert!(result.is_ok(), "Should accept file in subdirectory of allowed directory");

        // Test with a path that's definitely outside - use /etc or C:\ depending on OS
        #[cfg(unix)]
        {
            // Try to access /etc/passwd which should be outside any temp directory
            let etc_passwd = std::path::Path::new("/etc/passwd");
            if etc_passwd.exists() {
                let result = validate_path(etc_passwd);
                if result.is_ok() {
                    // Check if /etc is actually under temp (very unlikely)
                    let canonical_temp = std::fs::canonicalize(temp.path()).unwrap();
                    let canonical_etc = std::fs::canonicalize(etc_passwd).unwrap();
                    
                    if !canonical_etc.starts_with(&canonical_temp) {
                        panic!("Expected validation to fail for /etc/passwd");
                    }
                } else {
                    assert!(result.unwrap_err().to_string().contains("not within any user-selected directory"));
                }
            }
        }

        // Cleanup
        clear_allowed_directories().unwrap();
    }

    #[test]
    fn test_validate_path_without_allowlist() {
        let temp = TempDir::new().unwrap();
        let test_file = temp.path().join("test.txt");
        fs::write(&test_file, "test").unwrap();

        // Clear allowlist
        clear_allowed_directories().unwrap();

        // Should succeed when no allowlist is set (backward compatibility)
        let result = validate_path(&test_file);
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_paths_batch() {
        let temp = TempDir::new().unwrap();
        let file1 = temp.path().join("file1.txt");
        let file2 = temp.path().join("file2.txt");
        fs::write(&file1, "test1").unwrap();
        fs::write(&file2, "test2").unwrap();

        clear_allowed_directories().unwrap();

        let paths = vec![&file1, &file2];
        let result = validate_paths(&paths);
        assert!(result.is_ok());
        assert_eq!(result.unwrap().len(), 2);
    }

    #[test]
    fn test_symlink_resolution() {
        #[cfg(unix)]
        {
            use std::os::unix::fs::symlink;
            
            // Clear any previous state
            clear_allowed_directories().unwrap();
            
            let temp = TempDir::new().unwrap();
            let real_file = temp.path().join("real.txt");
            let symlink_path = temp.path().join("link.txt");
            
            fs::write(&real_file, "test").unwrap();
            symlink(&real_file, &symlink_path).unwrap();

            add_allowed_directory(temp.path()).unwrap();

            // Symlink should resolve to real path
            let result = validate_path(&symlink_path);
            assert!(result.is_ok(), "Symlink within allowed directory should be valid");
            
            let canonical = result.unwrap();
            assert_eq!(canonical, std::fs::canonicalize(&real_file).unwrap());

            clear_allowed_directories().unwrap();
        }
    }

    #[test]
    fn test_symlink_outside_allowlist() {
        #[cfg(unix)]
        {
            use std::os::unix::fs::symlink;
            
            // Clear any previous state
            clear_allowed_directories().unwrap();
            
            let allowed_temp = TempDir::new().unwrap();
            let forbidden_temp = TempDir::new().unwrap();
            
            let real_file = forbidden_temp.path().join("secret.txt");
            let symlink_path = allowed_temp.path().join("innocent_link.txt");
            
            fs::write(&real_file, "secret data").unwrap();
            symlink(&real_file, &symlink_path).unwrap();

            add_allowed_directory(allowed_temp.path()).unwrap();

            // Symlink pointing outside allowed directory should be rejected
            let result = validate_path(&symlink_path);
            
            if result.is_ok() {
                // The paths might share a parent on some systems
                // Check if forbidden_temp is actually a subdirectory of allowed_temp
                let canonical_allowed = std::fs::canonicalize(allowed_temp.path()).unwrap();
                let canonical_real = std::fs::canonicalize(&real_file).unwrap();
                
                if !canonical_real.starts_with(&canonical_allowed) {
                    // If they don't share a parent, this is a real error
                    panic!("Expected validation to fail for symlink pointing outside allowlist");
                }
            } else {
                assert!(result.unwrap_err().to_string().contains("not within any user-selected directory"));
            }

            clear_allowed_directories().unwrap();
        }
    }
}
