# 💎 Diamond Drill

> Blazing-fast, security-first file analyzer with read-only enforcement

## Features

- **🔐 Production Auth Fail-Safe**: Panics if `DISABLE_AUTH=true` in production
- **🔒 Read-Only Lock**: Multi-layer enforcement (losetup, mount, File::open)
- **📂 Source/Dest Picker**: Interactive CLI, TUI (ratatui), and GUI (iced)
- **📊 File Analysis**: Fast parallel scanning with checksum support
- **📤 JSON Export**: Structured output for downstream processing

## Quick Start

```bash
# Install
cargo install --path .

# Basic usage
diamond --source ./my_files --dest ./output.json

# With TUI
diamond --tui

# With GUI
diamond --gui

# With read-only lock (default)
diamond --source ./sensitive --dest ./report.json --ro-lock true
```

## Security

### Production Auth Fail-Safe

If you accidentally deploy with `DISABLE_AUTH=true` in production, the app **panics immediately**:

```
╔══════════════════════════════════════════════════════════╗
║  🚨 SECURITY VIOLATION: AUTH DISABLED IN PRODUCTION 🚨   ║
║                                                          ║
║  DISABLE_AUTH=true is set in a production environment.   ║
║  This is a critical security violation.                  ║
║                                                          ║
║  The application will now terminate to prevent           ║
║  unauthorized access.                                    ║
╚══════════════════════════════════════════════════════════╝
```

Environment detection checks:
- `ENVIRONMENT`, `ENV`, `RUST_ENV`, `APP_ENV`
- Cloud indicators: `KUBERNETES_SERVICE_HOST`, `AWS_EXECUTION_ENV`, etc.

### Read-Only Lock (`--ro-lock`)

Three layers of protection:

1. **losetup -r**: Creates read-only loop device for disk images
2. **mount -o ro,noexec,nosuid,nodev**: Read-only mount for directories
3. **O_RDONLY**: File-level read-only flags with `O_NOFOLLOW`

Any write attempt triggers a **panic**:

```
╔══════════════════════════════════════════════════════════════╗
║  🚨 WRITE ATTEMPT BLOCKED ON READ-ONLY LOCKED PATH 🚨        ║
║                                                              ║
║  Path: /protected/file.txt                                   ║
║  Lock: /protected                                            ║
║                                                              ║
║  This path is protected by --ro-lock.                        ║
║  Write operations are not permitted.                         ║
╚══════════════════════════════════════════════════════════════╝
```

## Configuration

Create `diamond.toml`:

```toml
[analysis]
max_file_size = 104857600  # 100MB
include_patterns = ["*"]
exclude_patterns = ["*.tmp", "node_modules"]
follow_symlinks = true

[export]
format = "json"
include_metadata = true
pretty_print = true

[security]
enforce_ro_lock = true
require_auth = true
allowed_paths = ["/home/user", "/data"]
```

## CLI Options

```
diamond [OPTIONS]

Options:
  -s, --source <PATH>       Source path to analyze
  -d, --dest <PATH>         Destination path for export
      --ro-lock             Enforce read-only lock [default: true]
      --tui                 Run in TUI mode
      --gui                 Run in GUI mode
      --plugin-mode         Run in plugin mode (IPC via stdin/stdout)
      --plugin-token <TOKEN> Plugin authentication token (required for plugin mode)
                            Can also be set via DIAMOND_PLUGIN_TOKEN env var
  -c, --config <FILE>       Config file [default: diamond.toml]
  -v, --verbose             Verbose output (repeat for more)
  -h, --help                Print help
  -V, --version             Print version
```

## Plugin Mode

Diamond Drill can run as a plugin for MD Reader Pro using IPC (Inter-Process Communication) via stdin/stdout.

### Plugin Mode Authentication

**Security:** Plugin mode requires token-based authentication to prevent unauthorized access.

```bash
# Via command-line argument
diamond --plugin-mode --plugin-token "your-secure-token-here"

# Via environment variable
export DIAMOND_PLUGIN_TOKEN="your-secure-token-here"
diamond --plugin-mode
```

**Token Requirements:**
- Minimum 32 characters (256 bits of entropy recommended)
- Maximum 1024 characters
- Allowed characters: alphanumeric, hyphens, underscores, dots, equals, and plus signs
- Use a cryptographically secure random token generator

**Example token generation:**
```bash
# Generate a secure token (Linux/macOS)
openssl rand -base64 32

# Or use Python
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

**Security Design:**
- Token is validated before IPC server starts
- Any spawn attempt without a valid token fails immediately
- Prevents unauthorized processes from communicating with the plugin
- Host application (MD Reader Pro) generates and passes the token when spawning the plugin

### Plugin IPC Protocol

Messages are exchanged via JSON over stdin/stdout:

```json
// Request from host
{"id": "req-1", "action": "analyze", "payload": {"files": ["/path/to/file.md"]}}

// Response from plugin
{"id": "req-1", "success": true, "data": {"files_analyzed": 1, "analyses": [...]}}
```

Supported actions:
- `ping` - Health check
- `analyze` - Analyze files
- `deep_analyze` - Deep analysis with content inspection
- `report` - Generate analysis report
- `browse` - Browse file system (read-only)
- `set_theme` - Update plugin theme
- `get_capabilities` - Query plugin capabilities
- `shutdown` - Graceful shutdown

## E2E Golden Path

The CI pipeline tests the complete workflow:

```
upload → analyze → export → verify
```

```bash
# Run E2E tests
cargo test --test e2e_golden_path
```

## Building

```bash
# Default (TUI only)
cargo build --release

# With GUI
cargo build --release --features gui

# Full (TUI + GUI)
cargo build --release --features full
```

## License

MIT
