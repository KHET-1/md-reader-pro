//! Diamond Drill - Secure File Analyzer
//!
//! A blazing-fast, security-first file analyzer with read-only enforcement.
//! Can run standalone (CLI/TUI/GUI) or as a plugin for MD Reader Pro.

mod auth;
mod config;
mod ro_lock;
mod picker;
mod analyzer;

#[cfg(feature = "tui")]
mod tui;

#[cfg(feature = "gui")]
mod gui;

mod ipc;

use clap::Parser;
use tracing::info;
use anyhow::Result;

use crate::auth::AuthGuard;
use crate::config::Config;
use crate::ro_lock::ReadOnlyLock;

#[derive(Parser, Debug)]
#[command(name = "diamond")]
#[command(author = "Diamond Forgemaster")]
#[command(version = "0.1.0")]
#[command(about = "Secure file analyzer with read-only enforcement", long_about = None)]
struct Cli {
    /// Source path to analyze
    #[arg(short, long)]
    source: Option<String>,

    /// Destination path for export
    #[arg(short, long)]
    dest: Option<String>,

    /// Enforce read-only lock on source
    #[arg(long, default_value = "true")]
    ro_lock: bool,

    /// Run in TUI mode
    #[cfg(feature = "tui")]
    #[arg(long)]
    tui: bool,

    /// Run in GUI mode
    #[cfg(feature = "gui")]
    #[arg(long)]
    gui: bool,

    /// Run in plugin mode (IPC via stdin/stdout)
    #[arg(long)]
    plugin_mode: bool,

    /// Plugin authentication token (required for plugin mode)
    /// Can also be set via DIAMOND_PLUGIN_TOKEN environment variable
    #[arg(long, env = "DIAMOND_PLUGIN_TOKEN")]
    plugin_token: Option<String>,

    /// Config file path
    #[arg(short, long, default_value = "diamond.toml")]
    config: String,

    /// Verbose output
    #[arg(short, long, action = clap::ArgAction::Count)]
    verbose: u8,
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();

    // Plugin mode requires token verification to prevent unauthorized access
    if cli.plugin_mode {
        init_logging(0); // Quiet mode for IPC
        
        // Verify plugin token is provided
        let token = cli.plugin_token.ok_or_else(|| {
            anyhow::anyhow!(
                "Plugin mode requires authentication token. \
                 Provide via --plugin-token argument or DIAMOND_PLUGIN_TOKEN environment variable."
            )
        })?;
        
        // Validate token meets security requirements
        validate_plugin_token(&token)?;
        
        return ipc::run_plugin_server(token).await;
    }

    // CRITICAL: Auth guard MUST be first - panics in prod if auth disabled
    let _auth_guard = AuthGuard::init()?;

    // Initialize logging
    init_logging(cli.verbose);

    info!("💎 Diamond Drill v{} starting...", env!("CARGO_PKG_VERSION"));

    // Load config
    let config = Config::load(&cli.config).await?;

    // Determine mode and run
    #[cfg(feature = "gui")]
    if cli.gui {
        info!("Starting GUI mode...");
        return gui::run(config).await;
    }

    #[cfg(feature = "tui")]
    if cli.tui {
        info!("Starting TUI mode...");
        return tui::run(config).await;
    }

    // CLI mode
    run_cli(cli, config).await
}

async fn run_cli(cli: Cli, config: Config) -> Result<()> {
    let source = match cli.source {
        Some(s) => s,
        None => {
            // Interactive picker
            picker::select_source().await?
        }
    };

    let dest = match cli.dest {
        Some(d) => d,
        None => {
            picker::select_dest().await?
        }
    };

    // Acquire read-only lock if enabled
    let _ro_guard = if cli.ro_lock {
        info!("🔒 Acquiring read-only lock on source...");
        Some(ReadOnlyLock::acquire(&source).await?)
    } else {
        None
    };

    // Run analysis
    info!("📊 Analyzing {}...", source);
    let results = analyzer::analyze(&source, &config).await?;

    // Export results
    info!("📤 Exporting to {}...", dest);
    analyzer::export(&results, &dest).await?;

    info!("✅ Complete! Results exported to {}", dest);
    Ok(())
}

fn init_logging(verbosity: u8) {
    let filter = match verbosity {
        0 => "warn",
        1 => "info",
        2 => "debug",
        _ => "trace",
    };

    tracing_subscriber::fmt()
        .with_env_filter(filter)
        .with_target(false)
        .init();
}

/// Validate plugin authentication token
///
/// Ensures the token meets minimum security requirements:
/// - Minimum 32 characters (256 bits if hex-encoded)
/// - Only contains valid characters (alphanumeric + safe symbols)
///
/// # Security
///
/// This prevents weak tokens and ensures only authorized host processes
/// can spawn the plugin in IPC mode.
fn validate_plugin_token(token: &str) -> Result<()> {
    // Minimum length requirement (32 bytes = 256 bits of entropy)
    if token.len() < 32 {
        anyhow::bail!(
            "Plugin token must be at least 32 characters long. \
             Got {} characters. Use a cryptographically secure random token.",
            token.len()
        );
    }

    // Maximum reasonable length to prevent abuse
    if token.len() > 1024 {
        anyhow::bail!(
            "Plugin token is too long (max 1024 characters). \
             Got {} characters.",
            token.len()
        );
    }

    // Validate characters (alphanumeric + common safe symbols)
    if !token.chars().all(|c| {
        c.is_ascii_alphanumeric() 
        || c == '-' 
        || c == '_' 
        || c == '.' 
        || c == '=' 
        || c == '+'
    }) {
        anyhow::bail!(
            "Plugin token contains invalid characters. \
             Use only alphanumeric characters, hyphens, underscores, dots, equals, and plus signs."
        );
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_plugin_token_valid() {
        // Valid token with minimum length
        let token = "a".repeat(32);
        assert!(validate_plugin_token(&token).is_ok());

        // Valid token with alphanumeric and symbols
        let token = "abc123-def456_ghi789.jkl012=mno+345";
        assert!(validate_plugin_token(&token).is_ok());

        // Valid long token
        let token = "a".repeat(256);
        assert!(validate_plugin_token(&token).is_ok());
    }

    #[test]
    fn test_validate_plugin_token_too_short() {
        let token = "a".repeat(31); // Just below minimum
        let result = validate_plugin_token(&token);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("at least 32 characters"));
    }

    #[test]
    fn test_validate_plugin_token_too_long() {
        let token = "a".repeat(1025); // Above maximum
        let result = validate_plugin_token(&token);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("too long"));
    }

    #[test]
    fn test_validate_plugin_token_invalid_characters() {
        // Token with spaces
        let token = "abc def 123456789012345678901234567890";
        let result = validate_plugin_token(&token);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("invalid characters"));

        // Token with special chars
        let token = "abc@def!123456789012345678901234567890";
        let result = validate_plugin_token(&token);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("invalid characters"));
    }

    #[test]
    fn test_validate_plugin_token_allowed_symbols() {
        // Test each allowed symbol
        let symbols = ['-', '_', '.', '=', '+'];
        for symbol in symbols {
            let token = format!("abc123{}def456789012345678901234567890", symbol);
            assert!(
                validate_plugin_token(&token).is_ok(),
                "Symbol '{}' should be allowed",
                symbol
            );
        }
    }
}
