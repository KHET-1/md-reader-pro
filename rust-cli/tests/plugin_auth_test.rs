//! Plugin mode authentication tests
//!
//! Tests that plugin mode properly validates auth tokens

use assert_cmd::Command;

#[test]
fn test_plugin_mode_requires_auth_token() {
    // Run in plugin mode without auth token - should fail
    let mut cmd = Command::cargo_bin("diamond").unwrap();
    cmd.arg("--plugin-mode");
    
    // Should exit with error (no token)
    let output = cmd.output().expect("Failed to execute command");
    assert!(!output.status.success());
    
    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(
        stderr.contains("PLUGIN_AUTH_TOKEN") || stderr.contains("not set"),
        "Expected error about missing auth token, got: {}",
        stderr
    );
}

#[test]
fn test_plugin_mode_rejects_short_token() {
    // Run with a token that's too short
    let mut cmd = Command::cargo_bin("diamond").unwrap();
    cmd.arg("--plugin-mode")
       .env("PLUGIN_AUTH_TOKEN", "abc123");
    
    let output = cmd.output().expect("Failed to execute command");
    assert!(!output.status.success());
    
    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(
        stderr.contains("too short") || stderr.contains("PLUGIN_AUTH_TOKEN"),
        "Expected error about short token, got: {}",
        stderr
    );
}

#[test]
fn test_plugin_mode_rejects_non_hex_token() {
    // Run with a token that's not hexadecimal
    let token = "z".repeat(64);
    let mut cmd = Command::cargo_bin("diamond").unwrap();
    cmd.arg("--plugin-mode")
       .env("PLUGIN_AUTH_TOKEN", token);
    
    let output = cmd.output().expect("Failed to execute command");
    assert!(!output.status.success());
    
    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(
        stderr.contains("hexadecimal") || stderr.contains("PLUGIN_AUTH_TOKEN"),
        "Expected error about non-hex token, got: {}",
        stderr
    );
}

#[test]
fn test_plugin_mode_accepts_valid_token() {
    // Generate a valid token (64 hex chars)
    let token = "a".repeat(64);
    let mut cmd = Command::cargo_bin("diamond").unwrap();
    cmd.arg("--plugin-mode")
       .env("PLUGIN_AUTH_TOKEN", token);
    
    // Write a shutdown command to stdin
    let shutdown_msg = r#"{"id":"shutdown","action":"shutdown","payload":{}}"#;
    
    let output = cmd
        .write_stdin(shutdown_msg)
        .timeout(std::time::Duration::from_secs(2))
        .output()
        .expect("Failed to execute command");
    
    // Should start successfully and send ready message
    let stdout = String::from_utf8_lossy(&output.stdout);
    assert!(
        stdout.contains("ready") || stdout.contains("init"),
        "Expected ready message in stdout, got: {}",
        stdout
    );
}
