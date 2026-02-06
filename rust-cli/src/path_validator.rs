//! Path validation module for secure file operations
//!
//! Provides security-focused path validation to prevent:
//! - Path traversal attacks (../)
//! - Access to restricted system directories
//! - Symlink-based access outside allowed directories
//! - Other file system security vulnerabilities

use anyhow::{bail, Context, Result};
use std::path::{Path, PathBuf};

/// List of restricted system directories that should never be accessible
const RESTRICTED_PATHS: &[&str] = &[
    "/etc/shadow",
    "/etc/passwd",
    "/etc/sudoers",
    "/root",
    "/proc",
    "/sys",
    "/dev",
    "/boot",
    "/var/log",
];

/// Path validator for secure file operations
pub struct PathValidator {
    /// Optional list of allowed base directories
    /// If None, all paths except restricted ones are allowed
    allowed_bases: Option<Vec<PathBuf>>,
}

impl PathValidator {
    /// Create a new path validator with no base directory restrictions
    pub fn new() -> Self {
        Self {
            allowed_bases: None,
        }
    }

    /// Create a path validator with specific allowed base directories
    pub fn with_allowed_bases(bases: Vec<PathBuf>) -> Result<Self> {
        // Canonicalize all base paths
        let canonical_bases: Result<Vec<PathBuf>> = bases
            .into_iter()
            .map(|p| {
                p.canonicalize()
                    .with_context(|| format!("Failed to canonicalize base path: {}", p.display()))
            })
            .collect();

        Ok(Self {
            allowed_bases: Some(canonical_bases?),
        })
    }

    /// Validate a path for read access
    ///
    /// This function:
    /// 1. Checks for path traversal sequences
    /// 2. Canonicalizes the path to resolve symlinks
    /// 3. Validates the path is not in restricted directories
    /// 4. If allowed bases are set, validates the path is within one of them
    pub fn validate_read_path(&self, path: &str) -> Result<PathBuf> {
        // Check for obvious path traversal attempts
        if path.contains("..") {
            bail!("Path traversal detected: path contains '..'");
        }

        // Convert to PathBuf for processing
        let path_buf = PathBuf::from(path);

        // Check if path exists before canonicalizing
        if !path_buf.exists() {
            bail!("Path does not exist: {}", path);
        }

        // Canonicalize to resolve symlinks and get absolute path
        let canonical_path = path_buf
            .canonicalize()
            .with_context(|| format!("Failed to canonicalize path: {}", path))?;

        // Check against restricted system paths
        self.check_restricted_path(&canonical_path)?;

        // If allowed bases are configured, validate path is within one of them
        if let Some(ref bases) = self.allowed_bases {
            self.check_within_allowed_bases(&canonical_path, bases)?;
        }

        Ok(canonical_path)
    }

    /// Validate a directory path for browsing
    pub fn validate_browse_path(&self, path: &str) -> Result<PathBuf> {
        // Use same validation as read, but also ensure it's a directory
        let canonical_path = self.validate_read_path(path)?;

        if !canonical_path.is_dir() {
            bail!("Path is not a directory: {}", path);
        }

        Ok(canonical_path)
    }

    /// Check if a path is within restricted system directories
    fn check_restricted_path(&self, canonical_path: &Path) -> Result<()> {
        let path_str = canonical_path.to_string_lossy();

        for restricted in RESTRICTED_PATHS {
            if path_str.starts_with(restricted) {
                bail!(
                    "Access denied: path '{}' is in restricted directory '{}'",
                    path_str,
                    restricted
                );
            }
        }

        Ok(())
    }

    /// Check if a path is within one of the allowed base directories
    fn check_within_allowed_bases(&self, canonical_path: &Path, bases: &[PathBuf]) -> Result<()> {
        for base in bases {
            if canonical_path.starts_with(base) {
                return Ok(());
            }
        }

        bail!(
            "Access denied: path '{}' is not within any allowed base directory",
            canonical_path.display()
        );
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
    use tempfile::tempdir;

    #[test]
    fn test_path_traversal_detection() {
        let validator = PathValidator::new();
        let result = validator.validate_read_path("../etc/passwd");
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("traversal"));
    }

    #[test]
    fn test_valid_temp_file() {
        let temp_file = tempfile::NamedTempFile::new().unwrap();
        let validator = PathValidator::new();
        let result = validator.validate_read_path(temp_file.path().to_str().unwrap());
        assert!(result.is_ok());
    }

    #[test]
    fn test_nonexistent_path() {
        let validator = PathValidator::new();
        let result = validator.validate_read_path("/nonexistent/path/xyz123");
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("does not exist"));
    }

    #[test]
    fn test_restricted_path_etc_shadow() {
        let validator = PathValidator::new();
        // Only test if the file exists (won't exist on all systems)
        if Path::new("/etc/shadow").exists() {
            let result = validator.validate_read_path("/etc/shadow");
            assert!(result.is_err());
            assert!(result.unwrap_err().to_string().contains("restricted"));
        }
    }

    #[test]
    fn test_allowed_bases_within() {
        let temp_dir = tempdir().unwrap();
        let temp_file = temp_dir.path().join("test.txt");
        fs::write(&temp_file, "test").unwrap();

        let validator = PathValidator::with_allowed_bases(vec![temp_dir.path().to_path_buf()])
            .unwrap();

        let result = validator.validate_read_path(temp_file.to_str().unwrap());
        assert!(result.is_ok());
    }

    #[test]
    fn test_allowed_bases_outside() {
        let temp_dir1 = tempdir().unwrap();
        let temp_dir2 = tempdir().unwrap();
        let temp_file = temp_dir2.path().join("test.txt");
        fs::write(&temp_file, "test").unwrap();

        let validator = PathValidator::with_allowed_bases(vec![temp_dir1.path().to_path_buf()])
            .unwrap();

        let result = validator.validate_read_path(temp_file.to_str().unwrap());
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("not within any allowed"));
    }

    #[test]
    fn test_validate_browse_path_directory() {
        let temp_dir = tempdir().unwrap();
        let validator = PathValidator::new();
        let result = validator.validate_browse_path(temp_dir.path().to_str().unwrap());
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_browse_path_file() {
        let temp_file = tempfile::NamedTempFile::new().unwrap();
        let validator = PathValidator::new();
        let result = validator.validate_browse_path(temp_file.path().to_str().unwrap());
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("not a directory"));
    }

    #[test]
    fn test_symlink_resolution() {
        let temp_dir = tempdir().unwrap();
        let real_file = temp_dir.path().join("real.txt");
        fs::write(&real_file, "test").unwrap();

        #[cfg(unix)]
        {
            use std::os::unix::fs::symlink;
            let link_file = temp_dir.path().join("link.txt");
            symlink(&real_file, &link_file).unwrap();

            let validator = PathValidator::new();
            let result = validator.validate_read_path(link_file.to_str().unwrap());
            assert!(result.is_ok());
            // Should resolve to the real file
            assert_eq!(result.unwrap(), real_file.canonicalize().unwrap());
        }
    }

    #[test]
    fn test_symlink_outside_allowed_base() {
        let temp_dir1 = tempdir().unwrap();
        let temp_dir2 = tempdir().unwrap();
        let real_file = temp_dir2.path().join("real.txt");
        fs::write(&real_file, "test").unwrap();

        #[cfg(unix)]
        {
            use std::os::unix::fs::symlink;
            let link_file = temp_dir1.path().join("link.txt");
            symlink(&real_file, &link_file).unwrap();

            // Only allow temp_dir1
            let validator =
                PathValidator::with_allowed_bases(vec![temp_dir1.path().to_path_buf()]).unwrap();

            // Should fail because symlink resolves to temp_dir2
            let result = validator.validate_read_path(link_file.to_str().unwrap());
            assert!(result.is_err());
            assert!(result
                .unwrap_err()
                .to_string()
                .contains("not within any allowed"));
        }
    }
}
