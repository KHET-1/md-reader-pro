//! E2E Golden Path Tests
//!
//! Tests the complete workflow: upload → analyze → export → verify

use assert_cmd::Command;
use predicates::prelude::*;
use std::fs;
use tempfile::tempdir;

/// Golden path test: CLI mode complete workflow
#[test]
fn test_golden_path_cli() {
    let temp = tempdir().unwrap();

    // Create test source files
    let source_dir = temp.path().join("source");
    fs::create_dir(&source_dir).unwrap();
    fs::write(source_dir.join("file1.txt"), "content 1").unwrap();
    fs::write(source_dir.join("file2.md"), "# Markdown").unwrap();
    fs::write(source_dir.join("file3.json"), r#"{"key": "value"}"#).unwrap();

    // Create dest path
    let dest_file = temp.path().join("output.json");

    // Run diamond CLI
    let mut cmd = Command::cargo_bin("diamond").unwrap();
    cmd.args([
        "--source", source_dir.to_str().unwrap(),
        "--dest", dest_file.to_str().unwrap(),
        "--ro-lock",  // Defaults to true
        "-v",
    ])
    .env("ENVIRONMENT", "development")
    .env_remove("DISABLE_AUTH");

    cmd.assert()
        .success()
        .stdout(predicate::str::contains("Complete"));

    // Verify output exists
    assert!(dest_file.exists(), "Output file should exist");

    // Verify output content
    let output = fs::read_to_string(&dest_file).unwrap();
    assert!(output.contains("total_files"), "Should contain total_files");
    assert!(output.contains("3"), "Should have 3 files");
}

/// Test auth fail-safe in production
#[test]
fn test_auth_failsafe_production() {
    let temp = tempdir().unwrap();
    let source = temp.path().join("test.txt");
    fs::write(&source, "test").unwrap();
    let dest = temp.path().join("out.json");

    let mut cmd = Command::cargo_bin("diamond").unwrap();
    cmd.args([
        "--source", source.to_str().unwrap(),
        "--dest", dest.to_str().unwrap(),
    ])
    .env("ENVIRONMENT", "production")
    .env("DISABLE_AUTH", "true");

    // Should panic/fail due to auth disabled in production
    cmd.assert()
        .failure()
        .stderr(predicate::str::contains("SECURITY VIOLATION"));
}

/// Test auth works in development with auth disabled
#[test]
fn test_auth_development_disabled() {
    let temp = tempdir().unwrap();
    let source = temp.path().join("test.txt");
    fs::write(&source, "test").unwrap();
    let dest = temp.path().join("out.json");

    let mut cmd = Command::cargo_bin("diamond").unwrap();
    cmd.args([
        "--source", source.to_str().unwrap(),
        "--dest", dest.to_str().unwrap(),
    ])
    .env("ENVIRONMENT", "development")
    .env("DISABLE_AUTH", "true");

    // Should succeed in development
    cmd.assert()
        .success();
}

/// Test read-only lock prevents modification
#[test]
fn test_ro_lock_enforcement() {
    let temp = tempdir().unwrap();
    let source = temp.path().join("protected.txt");
    fs::write(&source, "protected content").unwrap();
    let dest = temp.path().join("out.json");

    let mut cmd = Command::cargo_bin("diamond").unwrap();
    cmd.args([
        "--source", source.to_str().unwrap(),
        "--dest", dest.to_str().unwrap(),
        "--ro-lock",  // Defaults to true
    ])
    .env("ENVIRONMENT", "development");

    cmd.assert()
        .success();

    // Verify source file unchanged
    let content = fs::read_to_string(&source).unwrap();
    assert_eq!(content, "protected content");
}

/// Test export format validation
#[test]
fn test_export_json_format() {
    let temp = tempdir().unwrap();
    let source = temp.path().join("test.txt");
    fs::write(&source, "test content").unwrap();
    let dest = temp.path().join("out.json");

    let mut cmd = Command::cargo_bin("diamond").unwrap();
    cmd.args([
        "--source", source.to_str().unwrap(),
        "--dest", dest.to_str().unwrap(),
    ])
    .env("ENVIRONMENT", "development");

    cmd.assert().success();

    // Verify valid JSON
    let output = fs::read_to_string(&dest).unwrap();
    let parsed: serde_json::Value = serde_json::from_str(&output)
        .expect("Output should be valid JSON");

    assert!(parsed.get("source_path").is_some());
    assert!(parsed.get("total_files").is_some());
    assert!(parsed.get("files").is_some());
}

/// Test multiple file types analysis
#[test]
fn test_multi_file_type_analysis() {
    let temp = tempdir().unwrap();
    let source = temp.path().join("multi");
    fs::create_dir(&source).unwrap();

    // Create various file types
    fs::write(source.join("code.rs"), "fn main() {}").unwrap();
    fs::write(source.join("doc.md"), "# Doc").unwrap();
    fs::write(source.join("data.json"), "{}").unwrap();
    fs::write(source.join("style.css"), "body {}").unwrap();
    fs::write(source.join("script.js"), "console.log()").unwrap();

    let dest = temp.path().join("out.json");

    let mut cmd = Command::cargo_bin("diamond").unwrap();
    cmd.args([
        "--source", source.to_str().unwrap(),
        "--dest", dest.to_str().unwrap(),
    ])
    .env("ENVIRONMENT", "development");

    cmd.assert().success();

    let output = fs::read_to_string(&dest).unwrap();
    let parsed: serde_json::Value = serde_json::from_str(&output).unwrap();

    let file_types = parsed.get("file_types").unwrap().as_object().unwrap();
    assert!(file_types.contains_key("rs"));
    assert!(file_types.contains_key("md"));
    assert!(file_types.contains_key("json"));
    assert!(file_types.contains_key("css"));
    assert!(file_types.contains_key("js"));
}

/// Test verbose output
#[test]
fn test_verbose_output() {
    let temp = tempdir().unwrap();
    let source = temp.path().join("test.txt");
    fs::write(&source, "test").unwrap();
    let dest = temp.path().join("out.json");

    let mut cmd = Command::cargo_bin("diamond").unwrap();
    cmd.args([
        "--source", source.to_str().unwrap(),
        "--dest", dest.to_str().unwrap(),
        "-vvv",  // Max verbosity
    ])
    .env("ENVIRONMENT", "development");

    cmd.assert()
        .success()
        .stdout(predicate::str::contains("Diamond Drill"));
}

/// Test plugin mode requires authentication token
#[test]
fn test_plugin_mode_requires_token() {
    // Test plugin mode without token should fail
    let mut cmd = Command::cargo_bin("diamond").unwrap();
    cmd.arg("--plugin-mode")
        .env_remove("DIAMOND_PLUGIN_TOKEN")
        .timeout(std::time::Duration::from_secs(5));

    cmd.assert()
        .failure()
        .stderr(predicate::str::contains("Plugin mode requires authentication token"));
}

/// Test plugin mode with invalid token (too short) should fail
#[test]
fn test_plugin_mode_invalid_token_too_short() {
    let mut cmd = Command::cargo_bin("diamond").unwrap();
    cmd.arg("--plugin-mode")
        .arg("--plugin-token")
        .arg("short") // Too short, needs 32+ chars
        .timeout(std::time::Duration::from_secs(5));

    cmd.assert()
        .failure()
        .stderr(predicate::str::contains("at least 32 characters"));
}

/// Test plugin mode with valid token via CLI
#[test]
fn test_plugin_mode_valid_token_cli() {
    let valid_token = "a".repeat(32); // Minimum valid token
    
    let mut cmd = Command::cargo_bin("diamond").unwrap();
    cmd.arg("--plugin-mode")
        .arg("--plugin-token")
        .arg(&valid_token)
        .timeout(std::time::Duration::from_secs(2));

    // Should start successfully (will timeout waiting for IPC, which is expected)
    // The important part is it doesn't fail with auth error
    let result = cmd.output().unwrap();
    
    // Should not have authentication-related errors
    let stderr = String::from_utf8_lossy(&result.stderr);
    assert!(!stderr.contains("Plugin mode requires authentication token"));
    assert!(!stderr.contains("at least 32 characters"));
}

/// Test plugin mode with valid token via environment variable
#[test]
fn test_plugin_mode_valid_token_env() {
    let valid_token = "abcdefghijklmnopqrstuvwxyz123456"; // 32 chars
    
    let mut cmd = Command::cargo_bin("diamond").unwrap();
    cmd.arg("--plugin-mode")
        .env("DIAMOND_PLUGIN_TOKEN", &valid_token)
        .timeout(std::time::Duration::from_secs(2));

    // Should start successfully (will timeout waiting for IPC, which is expected)
    let result = cmd.output().unwrap();
    
    // Should not have authentication-related errors
    let stderr = String::from_utf8_lossy(&result.stderr);
    assert!(!stderr.contains("Plugin mode requires authentication token"));
    assert!(!stderr.contains("at least 32 characters"));
}

/// Test nonexistent source fails gracefully
#[test]
fn test_nonexistent_source() {
    let temp = tempdir().unwrap();
    let dest = temp.path().join("out.json");

    let mut cmd = Command::cargo_bin("diamond").unwrap();
    cmd.args([
        "--source", "/nonexistent/path/xyz",
        "--dest", dest.to_str().unwrap(),
    ])
    .env("ENVIRONMENT", "development");

    cmd.assert()
        .failure()
        .stderr(predicate::str::contains("not exist").or(predicate::str::contains("NotFound")));
}

/// Test config file loading
#[test]
fn test_config_loading() {
    let temp = tempdir().unwrap();

    // Create config file
    let config_path = temp.path().join("diamond.toml");
    fs::write(&config_path, r#"
[analysis]
max_file_size = 1000000

[export]
format = "json"
pretty_print = true
"#).unwrap();

    let source = temp.path().join("test.txt");
    fs::write(&source, "test").unwrap();
    let dest = temp.path().join("out.json");

    let mut cmd = Command::cargo_bin("diamond").unwrap();
    cmd.args([
        "--source", source.to_str().unwrap(),
        "--dest", dest.to_str().unwrap(),
        "--config", config_path.to_str().unwrap(),
    ])
    .env("ENVIRONMENT", "development");

    cmd.assert().success();
}
