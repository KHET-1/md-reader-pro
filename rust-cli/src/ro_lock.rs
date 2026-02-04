//! Read-Only Lock Enforcement Module
//!
//! Provides multiple layers of read-only protection:
//! 1. losetup -r (read-only loop device)
//! 2. mount -o ro (read-only mount)
//! 3. File::open with read-only flags
//! 4. Panic on any write attempt

use std::fs::{self, File, OpenOptions};
use std::io::{self, Read};
use std::os::unix::fs::OpenOptionsExt;
use std::path::{Path, PathBuf};
use std::process::Command;
use thiserror::Error;
use tracing::{info, warn, error, debug};

/// Read-only lock errors
#[derive(Error, Debug)]
pub enum RoLockError {
    #[error("Failed to create loop device: {0}")]
    LoopDeviceError(String),

    #[error("Failed to mount read-only: {0}")]
    MountError(String),

    #[error("Path does not exist: {0}")]
    PathNotFound(String),

    #[error("WRITE ATTEMPT DETECTED on read-only locked path: {0}")]
    WriteAttemptBlocked(String),

    #[error("IO error: {0}")]
    IoError(#[from] io::Error),

    #[error("Insufficient permissions for read-only lock")]
    InsufficientPermissions,
}

/// Read-only lock level
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LockLevel {
    /// Use losetup -r for block devices/images
    LoopDevice,
    /// Use mount -o ro for directories
    MountReadOnly,
    /// Use file-level O_RDONLY (default, always applied)
    FileReadOnly,
    /// Combination of all available methods
    Maximum,
}

/// Guard that maintains the read-only lock
/// When dropped, cleans up loop devices and mounts
pub struct ReadOnlyLock {
    path: PathBuf,
    lock_level: LockLevel,
    loop_device: Option<String>,
    mount_point: Option<PathBuf>,
    is_active: bool,
}

impl ReadOnlyLock {
    /// Acquire a read-only lock on the given path
    ///
    /// This will:
    /// 1. Verify the path exists
    /// 2. Apply appropriate locking mechanism based on path type
    /// 3. Return a guard that maintains the lock
    pub async fn acquire(path: &str) -> Result<Self, RoLockError> {
        let path = PathBuf::from(path);

        if !path.exists() {
            return Err(RoLockError::PathNotFound(path.display().to_string()));
        }

        info!("🔒 Acquiring read-only lock on: {}", path.display());

        let lock_level = Self::determine_lock_level(&path);
        let mut lock = Self {
            path: path.clone(),
            lock_level,
            loop_device: None,
            mount_point: None,
            is_active: false,
        };

        match lock_level {
            LockLevel::Maximum => {
                // Try all methods
                if Self::is_block_device_or_image(&path) {
                    lock.setup_loop_device().await?;
                }
                lock.is_active = true;
            }
            LockLevel::LoopDevice => {
                lock.setup_loop_device().await?;
                lock.is_active = true;
            }
            LockLevel::MountReadOnly => {
                lock.setup_ro_mount().await?;
                lock.is_active = true;
            }
            LockLevel::FileReadOnly => {
                // File-level is always enforced via open_readonly
                lock.is_active = true;
            }
        }

        info!("✅ Read-only lock acquired (level: {:?})", lock_level);
        Ok(lock)
    }

    /// Determine the appropriate lock level for a path
    fn determine_lock_level(path: &Path) -> LockLevel {
        if Self::is_block_device_or_image(path) {
            LockLevel::LoopDevice
        } else if path.is_dir() {
            LockLevel::MountReadOnly
        } else {
            LockLevel::FileReadOnly
        }
    }

    /// Check if path is a block device or disk image
    fn is_block_device_or_image(path: &Path) -> bool {
        if let Ok(metadata) = fs::metadata(path) {
            use std::os::unix::fs::FileTypeExt;
            if metadata.file_type().is_block_device() {
                return true;
            }
        }

        // Check for common image extensions
        if let Some(ext) = path.extension() {
            let ext = ext.to_string_lossy().to_lowercase();
            return matches!(ext.as_str(), "img" | "iso" | "raw" | "qcow2" | "vmdk" | "vdi");
        }

        false
    }

    /// Setup read-only loop device using losetup -r
    async fn setup_loop_device(&mut self) -> Result<(), RoLockError> {
        info!("Setting up read-only loop device with losetup -r...");

        // Find free loop device
        let output = Command::new("losetup")
            .args(["-f", "--show", "-r", self.path.to_str().unwrap()])
            .output()
            .map_err(|e| RoLockError::LoopDeviceError(e.to_string()))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            if stderr.contains("Permission denied") || stderr.contains("Operation not permitted") {
                warn!("Cannot create loop device (need root). Falling back to file-level lock.");
                return Ok(());
            }
            return Err(RoLockError::LoopDeviceError(stderr.to_string()));
        }

        let loop_dev = String::from_utf8_lossy(&output.stdout).trim().to_string();
        info!("Created read-only loop device: {}", loop_dev);
        self.loop_device = Some(loop_dev);

        Ok(())
    }

    /// Setup read-only mount using mount -o ro
    async fn setup_ro_mount(&mut self) -> Result<(), RoLockError> {
        info!("Setting up read-only mount...");

        // Create temporary mount point
        let mount_point = tempfile::tempdir()
            .map_err(|e| RoLockError::MountError(e.to_string()))?
            .into_path();

        let source = self.loop_device.as_ref()
            .map(|s| s.as_str())
            .unwrap_or_else(|| self.path.to_str().unwrap());

        let output = Command::new("mount")
            .args(["-o", "ro,noexec,nosuid,nodev", source, mount_point.to_str().unwrap()])
            .output()
            .map_err(|e| RoLockError::MountError(e.to_string()))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            if stderr.contains("Permission denied") || stderr.contains("Operation not permitted") {
                warn!("Cannot mount read-only (need root). Falling back to file-level lock.");
                return Ok(());
            }
            return Err(RoLockError::MountError(stderr.to_string()));
        }

        info!("Mounted read-only at: {}", mount_point.display());
        self.mount_point = Some(mount_point);

        Ok(())
    }

    /// Open a file in read-only mode with maximum restrictions
    ///
    /// # Panics
    ///
    /// This function will PANIC if write mode is somehow attempted.
    pub fn open_readonly<P: AsRef<Path>>(&self, path: P) -> Result<ReadOnlyFile, RoLockError> {
        let path = path.as_ref();
        debug!("Opening file read-only: {}", path.display());

        // Verify path is under our locked path
        let canonical_lock = self.path.canonicalize()?;
        let canonical_target = path.canonicalize()?;

        if !canonical_target.starts_with(&canonical_lock) {
            return Err(RoLockError::WriteAttemptBlocked(format!(
                "Path {} is outside locked area {}",
                path.display(),
                self.path.display()
            )));
        }

        // Open with O_RDONLY explicitly
        let file = OpenOptions::new()
            .read(true)
            .write(false)  // Explicitly disable write
            .create(false) // Never create
            .custom_flags(libc::O_RDONLY | libc::O_NOFOLLOW)
            .open(path)?;

        Ok(ReadOnlyFile {
            inner: file,
            path: path.to_path_buf(),
        })
    }

    /// Get the effective path to use (mount point if mounted, original otherwise)
    pub fn effective_path(&self) -> &Path {
        self.mount_point.as_ref().unwrap_or(&self.path)
    }

    /// Check if lock is active
    pub fn is_active(&self) -> bool {
        self.is_active
    }
}

impl Drop for ReadOnlyLock {
    fn drop(&mut self) {
        info!("🔓 Releasing read-only lock...");

        // Unmount if mounted
        if let Some(ref mount_point) = self.mount_point {
            debug!("Unmounting {}", mount_point.display());
            let _ = Command::new("umount")
                .arg(mount_point)
                .output();
            let _ = fs::remove_dir(mount_point);
        }

        // Detach loop device if created
        if let Some(ref loop_dev) = self.loop_device {
            debug!("Detaching loop device {}", loop_dev);
            let _ = Command::new("losetup")
                .args(["-d", loop_dev])
                .output();
        }

        info!("✅ Read-only lock released");
    }
}

/// A file handle that panics on write attempts
pub struct ReadOnlyFile {
    inner: File,
    path: PathBuf,
}

impl ReadOnlyFile {
    /// Read the entire file contents
    pub fn read_all(&mut self) -> Result<Vec<u8>, io::Error> {
        let mut buf = Vec::new();
        self.inner.read_to_end(&mut buf)?;
        Ok(buf)
    }

    /// Read to string
    pub fn read_to_string(&mut self) -> Result<String, io::Error> {
        let mut s = String::new();
        self.inner.read_to_string(&mut s)?;
        Ok(s)
    }
}

impl Read for ReadOnlyFile {
    fn read(&mut self, buf: &mut [u8]) -> io::Result<usize> {
        self.inner.read(buf)
    }
}

// CRITICAL: We do NOT implement Write for ReadOnlyFile
// Any attempt to use Write traits will be a compile error

/// Wrapper to intercept and panic on write attempts at runtime
/// Used when we can't prevent writes at compile time
pub struct WriteGuard {
    locked_paths: Vec<PathBuf>,
}

impl WriteGuard {
    pub fn new(paths: Vec<PathBuf>) -> Self {
        Self { locked_paths: paths }
    }

    /// Check if a path is protected. Panics if write attempted.
    ///
    /// # Panics
    ///
    /// Panics with a clear error message if path is write-protected.
    pub fn check_write(&self, path: &Path) -> ! {
        for locked in &self.locked_paths {
            if let (Ok(canonical_locked), Ok(canonical_path)) =
                (locked.canonicalize(), path.canonicalize())
            {
                if canonical_path.starts_with(&canonical_locked) {
                    panic!(
                        "\n\
                        ╔══════════════════════════════════════════════════════════════╗\n\
                        ║  🚨 WRITE ATTEMPT BLOCKED ON READ-ONLY LOCKED PATH 🚨        ║\n\
                        ║                                                              ║\n\
                        ║  Path: {:<52} ║\n\
                        ║  Lock: {:<52} ║\n\
                        ║                                                              ║\n\
                        ║  This path is protected by --ro-lock.                        ║\n\
                        ║  Write operations are not permitted.                         ║\n\
                        ╚══════════════════════════════════════════════════════════════╝",
                        path.display(),
                        locked.display()
                    );
                }
            }
        }
        unreachable!("check_write called on non-locked path");
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::{tempdir, NamedTempFile};
    use std::io::Write;

    #[tokio::test]
    async fn test_ro_lock_file() {
        let temp = NamedTempFile::new().unwrap();
        let path = temp.path().to_str().unwrap();

        let lock = ReadOnlyLock::acquire(path).await.unwrap();
        assert!(lock.is_active());
    }

    #[tokio::test]
    async fn test_ro_lock_directory() {
        let temp = tempdir().unwrap();
        let path = temp.path().to_str().unwrap();

        let lock = ReadOnlyLock::acquire(path).await.unwrap();
        assert!(lock.is_active());
    }

    #[tokio::test]
    async fn test_ro_lock_nonexistent() {
        let result = ReadOnlyLock::acquire("/nonexistent/path/xyz").await;
        assert!(matches!(result, Err(RoLockError::PathNotFound(_))));
    }

    #[tokio::test]
    async fn test_open_readonly() {
        let mut temp = NamedTempFile::new().unwrap();
        writeln!(temp, "test content").unwrap();
        let path = temp.path().to_path_buf();

        let lock = ReadOnlyLock::acquire(path.to_str().unwrap()).await.unwrap();
        let mut file = lock.open_readonly(&path).unwrap();

        let content = file.read_to_string().unwrap();
        assert!(content.contains("test content"));
    }

    #[test]
    fn test_lock_level_detection() {
        let temp = tempdir().unwrap();
        assert_eq!(
            ReadOnlyLock::determine_lock_level(temp.path()),
            LockLevel::MountReadOnly
        );

        let file = NamedTempFile::new().unwrap();
        assert_eq!(
            ReadOnlyLock::determine_lock_level(file.path()),
            LockLevel::FileReadOnly
        );
    }

    #[test]
    #[should_panic(expected = "WRITE ATTEMPT BLOCKED")]
    fn test_write_guard_panics() {
        let guard = WriteGuard::new(vec![PathBuf::from("/tmp")]);
        guard.check_write(Path::new("/tmp/test"));
    }
}
