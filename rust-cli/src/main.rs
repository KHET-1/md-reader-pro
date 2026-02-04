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

    // Plugin mode skips auth guard (host handles auth)
    if cli.plugin_mode {
        init_logging(0); // Quiet mode for IPC
        return ipc::run_plugin_server().await;
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
