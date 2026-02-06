//! Path Validation Module
//!
//! Security-focused path validation to prevent:
//! 1. Path traversal attacks (../ sequences)
//! 2. Access to files outside user-selected directories
//! 3. Symlink attacks to restricted areas
//!
//! Enforces the security principle: "File access restricted to user-selected files"

use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::sync::RwLock;
use thiserror::Error;
use tracing::{debug, warn};

/// Path validation errors
#[derive(Error, Debug)]
pub enum PathValidationError {
    #[error("Path traversal attempt detected in: {0}")]
    PathTraversal(String),

    #[error("Path not in allowed directory list: {0}")]
    NotInAllowedDirectory(String),

    #[error("Invalid path format: {0}")]
    InvalidPath(String),

    #[error("IO error during path validation: {0}")]
    IoError(#[from] std::io::Error),

    #[error("No allowed directories configured")]
    NoAllowedDirectories,
}

/// Path validator with allowlist of user-selected directories
pub struct PathValidator {
    /// Set of canonicalized allowed directories
    allowed_dirs: RwLock<HashSet<PathBuf>>,
    /// Whether to enforce allowlist (can be disabled for testing)
    enforce_allowlist: bool,
}

impl PathValidator {
    /// Create a new path validator with no allowed directories
    pub fn new() -> Self {
        Self {
            allowed_dirs: RwLock::new(HashSet::new()),
            enforce_allowlist: true,
        }
    }

    /// Create a path validator with enforcement disabled (for testing)
    pub fn new_permissive() -> Self {
        Self {
            allowed_dirs: RwLock::new(HashSet::new()),
            enforce_allowlist: false,
        }
    }

    /// Add an allowed directory to the allowlist
    ///
    /// This should be called when the user explicitly selects a directory
    /// or file, granting the plugin permission to access it.
    pub fn add_allowed_directory<P: AsRef<Path>>(&self, path: P) -> Result<(), PathValidationError> {
        let path = path.as_ref();
        
        // Canonicalize to get absolute path and resolve symlinks
        let canonical = path.canonicalize()
            .map_err(|e| PathValidationError::IoError(e))?;
        
        let mut dirs = self.allowed_dirs.write().unwrap();
        dirs.insert(canonical.clone());
        
        debug!("Added allowed directory: {}", canonical.display());
        Ok(())
    }

    /// Clear all allowed directories
    pub fn clear_allowed_directories(&self) {
        let mut dirs = self.allowed_dirs.write().unwrap();
        dirs.clear();
        debug!("Cleared all allowed directories");
    }

    /// Get the count of allowed directories
    pub fn allowed_directory_count(&self) -> usize {
        self.allowed_dirs.read().unwrap().len()
    }

    /// Validate a path for security concerns
    ///
    /// This performs comprehensive validation:
    /// 1. Checks for path traversal attempts
    /// 2. Ensures path is within allowed directories
    /// 3. Validates symlinks don't point to restricted areas
    pub fn validate_path<P: AsRef<Path>>(&self, path: P) -> Result<PathBuf, PathValidationError> {
        let path = path.as_ref();
        let path_str = path.to_string_lossy();

        // 1. Check for path traversal patterns
        self.check_path_traversal(path)?;

        // 2. Canonicalize the path (resolves symlinks and makes absolute)
        let canonical = match path.canonicalize() {
            Ok(p) => p,
            Err(e) => {
                // If file doesn't exist, try to canonicalize parent
                if let Some(parent) = path.parent() {
                    if let Ok(parent_canonical) = parent.canonicalize() {
                        // Reconstruct path with canonical parent
                        if let Some(filename) = path.file_name() {
                            parent_canonical.join(filename)
                        } else {
                            return Err(PathValidationError::InvalidPath(path_str.to_string()));
                        }
                    } else {
                        return Err(PathValidationError::IoError(e));
                    }
                } else {
                    return Err(PathValidationError::IoError(e));
                }
            }
        };

        // 3. Validate symlinks
        self.validate_symlink(path, &canonical)?;

        // 4. Check if path is within allowed directories
        if self.enforce_allowlist {
            self.check_allowed_directory(&canonical)?;
        }

        debug!("Path validation successful: {} -> {}", path_str, canonical.display());
        Ok(canonical)
    }

    /// Check for path traversal patterns
    fn check_path_traversal(&self, path: &Path) -> Result<(), PathValidationError> {
        let path_str = path.to_string_lossy();

        // Check for .. components
        for component in path.components() {
            if let std::path::Component::ParentDir = component {
                warn!("Path traversal detected: {}", path_str);
                return Err(PathValidationError::PathTraversal(path_str.to_string()));
            }
        }

        // Additional string-based checks for encoded traversal attempts
        if path_str.contains("..") {
            // Allow legitimate cases like "foo..bar" in filenames
            // But block patterns like "../" or "\.."
            let suspicious_patterns = ["../", "..\\", "/..", "\\..", "%2e%2e", "..%2f", "..%5c"];
            for pattern in &suspicious_patterns {
                if path_str.to_lowercase().contains(pattern) {
                    warn!("Encoded path traversal detected: {}", path_str);
                    return Err(PathValidationError::PathTraversal(path_str.to_string()));
                }
            }
        }

        Ok(())
    }

    /// Validate that symlinks don't point to restricted areas
    fn validate_symlink(&self, original: &Path, _canonical: &Path) -> Result<(), PathValidationError> {
        // Check if the original path is a symlink
        if let Ok(metadata) = std::fs::symlink_metadata(original) {
            if metadata.file_type().is_symlink() {
                // Read the symlink target
                match std::fs::read_link(original) {
                    Ok(target) => {
                        debug!("Symlink {} -> {}", original.display(), target.display());
                        
                        // The canonical path already resolves symlinks, so we just need
                        // to ensure it will be checked against allowlist
                        // We don't need to do additional checks here as the allowlist
                        // check will catch symlinks pointing outside allowed dirs
                    }
                    Err(e) => {
                        warn!("Failed to read symlink {}: {}", original.display(), e);
                        return Err(PathValidationError::IoError(e));
                    }
                }
            }
        }

        Ok(())
    }

    /// Check if path is within any allowed directory
    fn check_allowed_directory(&self, canonical_path: &Path) -> Result<(), PathValidationError> {
        let dirs = self.allowed_dirs.read().unwrap();
        
        if dirs.is_empty() {
            return Err(PathValidationError::NoAllowedDirectories);
        }

        // Check if path is within any allowed directory
        for allowed_dir in dirs.iter() {
            if canonical_path.starts_with(allowed_dir) || canonical_path == allowed_dir {
                return Ok(());
            }
            
            // Also check if the allowed dir is a file and we're trying to access that file
            if allowed_dir.is_file() && canonical_path == allowed_dir {
                return Ok(());
            }
        }

        warn!("Path not in allowed directories: {}", canonical_path.display());
        Err(PathValidationError::NotInAllowedDirectory(
            canonical_path.display().to_string()
        ))
    }
}

impl Default for PathValidator {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::{tempdir, NamedTempFile};

    #[test]
    fn test_path_traversal_detection() {
        let validator = PathValidator::new_permissive();

        // These should fail
        assert!(validator.check_path_traversal(Path::new("../etc/passwd")).is_err());
        assert!(validator.check_path_traversal(Path::new("foo/../../etc/passwd")).is_err());
        assert!(validator.check_path_traversal(Path::new("..\\windows\\system32")).is_err());

        // These should pass
        assert!(validator.check_path_traversal(Path::new("/etc/passwd")).is_ok());
        assert!(validator.check_path_traversal(Path::new("foo/bar.txt")).is_ok());
        assert!(validator.check_path_traversal(Path::new("file..name.txt")).is_ok());
    }

    #[test]
    fn test_allowed_directory() {
        let temp_dir = tempdir().unwrap();
        let temp_path = temp_dir.path();
        
        let validator = PathValidator::new();
        validator.add_allowed_directory(temp_path).unwrap();

        assert_eq!(validator.allowed_directory_count(), 1);

        // Create a file in the temp directory
        let test_file = temp_path.join("test.txt");
        fs::write(&test_file, "test").unwrap();

        // Should succeed for file in allowed directory
        assert!(validator.validate_path(&test_file).is_ok());

        // Should fail for file outside allowed directory
        let outside_file = "/tmp/outside.txt";
        let result = validator.validate_path(outside_file);
        assert!(result.is_err());
    }

    #[test]
    fn test_symlink_validation() {
        let temp_dir = tempdir().unwrap();
        let temp_path = temp_dir.path();
        
        // Create a file
        let real_file = temp_path.join("real.txt");
        fs::write(&real_file, "content").unwrap();
        
        // Create a symlink
        let symlink = temp_path.join("link.txt");
        #[cfg(unix)]
        std::os::unix::fs::symlink(&real_file, &symlink).unwrap();
        
        let validator = PathValidator::new();
        validator.add_allowed_directory(temp_path).unwrap();

        #[cfg(unix)]
        {
            // Symlink within allowed directory should work
            let result = validator.validate_path(&symlink);
            assert!(result.is_ok());
        }
    }

    #[test]
    fn test_clear_allowed_directories() {
        let temp_dir = tempdir().unwrap();
        let validator = PathValidator::new();
        
        validator.add_allowed_directory(temp_dir.path()).unwrap();
        assert_eq!(validator.allowed_directory_count(), 1);
        
        validator.clear_allowed_directories();
        assert_eq!(validator.allowed_directory_count(), 0);
    }

    #[test]
    fn test_permissive_mode() {
        let validator = PathValidator::new_permissive();
        
        // In permissive mode, validation should pass even without allowed directories
        let temp = NamedTempFile::new().unwrap();
        let result = validator.validate_path(temp.path());
        // Should not fail with NoAllowedDirectories
        assert!(result.is_ok());
    }

    #[test]
    fn test_encoded_traversal() {
        let validator = PathValidator::new_permissive();

        // Test various encoded traversal attempts
        assert!(validator.check_path_traversal(Path::new("foo/../bar")).is_err());
        assert!(validator.check_path_traversal(Path::new("foo/..\\bar")).is_err());
        
        // Regular paths should work
        assert!(validator.check_path_traversal(Path::new("foo/bar")).is_ok());
    }

    #[test]
    fn test_no_allowed_directories_error() {
        let validator = PathValidator::new();
        let temp = NamedTempFile::new().unwrap();
        
        let result = validator.validate_path(temp.path());
        assert!(matches!(result, Err(PathValidationError::NoAllowedDirectories)));
    }

    #[test]
    fn test_file_as_allowed_path() {
        let temp = NamedTempFile::new().unwrap();
        let temp_path = temp.path();
        
        let validator = PathValidator::new();
        validator.add_allowed_directory(temp_path).unwrap();
        
        // Should allow access to the exact file
        assert!(validator.validate_path(temp_path).is_ok());
        
        // Should not allow access to sibling files
        if let Some(parent) = temp_path.parent() {
            let sibling = parent.join("other.txt");
            let result = validator.validate_path(&sibling);
            assert!(result.is_err());
        }
    }
}
