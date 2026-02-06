# 💎 Diamond Drill

> Blazing-fast, security-first file analyzer with read-only enforcement

## Features

- **🔐 Production Auth Fail-Safe**: Panics if `DISABLE_AUTH=true` in production
- **🔒 Read-Only Lock**: Multi-layer enforcement (losetup, mount, File::open)
- **🛡️ Path Validation**: Prevents traversal attacks and enforces user-selected directories
- **📂 Source/Dest Picker**: Interactive CLI, TUI (ratatui), and GUI (iced)
- **📊 File Analysis**: Fast parallel scanning with checksum support
- **📤 JSON Export**: Structured output for downstream processing
- **🔌 Plugin Mode**: IPC server for MD Reader Pro integration

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

### Path Validation & Security

When running as a plugin via IPC, Diamond Drill implements comprehensive path validation:

**Security Features:**
- ✅ Path traversal detection (`../` sequences)
- ✅ Allowlist enforcement (user-selected directories only)
- ✅ Symlink validation (prevents restricted area access)
- ✅ Canonical path resolution

**IPC Security Protocol:**

```javascript
// Host configures allowed directories
{
    "action": "set_allowed_dirs",
    "payload": {
        "directories": ["/home/user/documents"]
    }
}

// All file operations are validated
{
    "action": "analyze",
    "payload": {
        "files": ["/home/user/documents/file.md"]  // ✓ Allowed
        // files": ["../etc/passwd"]  // ✗ Blocked
    }
}
```

See [SECURITY.md](./SECURITY.md) for detailed security documentation.

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
  -s, --source <PATH>    Source path to analyze
  -d, --dest <PATH>      Destination path for export
      --ro-lock          Enforce read-only lock [default: true]
      --tui              Run in TUI mode
      --gui              Run in GUI mode
  -c, --config <FILE>    Config file [default: diamond.toml]
  -v, --verbose          Verbose output (repeat for more)
  -h, --help             Print help
  -V, --version          Print version
```

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
