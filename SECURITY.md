# Security Policy

## Supported Versions

We actively maintain and provide security updates for the following versions:

| Version        | Supported          |
| -------------- | ------------------ |
| 5.x            | :white_check_mark: |
| 4.x            | :white_check_mark: |
| < 4.0          | :x:                |

Older versions are not supported and will not receive security updates.

---

## Reporting a Vulnerability

Your security reports are important to us!

If you discover a security vulnerability, **please do not open a public issue**. Instead, report it confidentially via [GitHub Security Advisories](https://github.com/KHET-1/md-reader-pro/security/advisories/new) or email us at **[rc@ryans.games]**.

**What to expect:**
- We aim to acknowledge your report within 2 business days.
- We will keep you updated on progress and next steps.
- After the issue is resolved, we will coordinate public disclosure (if appropriate).

---

## Automated Security

- We use [Dependabot](https://docs.github.com/en/code-security/supply-chain-security/keeping-your-dependencies-updated-automatically) to monitor for dependency vulnerabilities.
- Security updates are prioritized and released as soon as possible.

---

## Security Features

### Path Validation (Diamond Drill Plugin)

The Diamond Drill plugin implements comprehensive path validation to prevent common security vulnerabilities:

- **Directory Traversal Prevention**: Rejects paths containing `../`, `..\\`, or URL-encoded traversal sequences
- **Allowed Directory Enforcement**: Restricts file access to user-configured allowed directories
- **Symlink Validation**: Ensures symbolic links resolve to permitted locations
- **Path Canonicalization**: Resolves all paths to their canonical form to prevent bypass attempts

This protection is applied to all file operations including:
- File analysis (`analyze_file`)
- Directory browsing (`handle_browse`)
- Deep analysis (`handle_deep_analyze`)

### XSS Prevention

- All user-generated content is sanitized with DOMPurify before rendering
- Strict Content Security Policy (CSP) headers are enforced
- HTML output is escaped by default

### Input Validation

- File uploads are validated for size limits (10MB maximum)
- Supported file extensions are whitelisted
- All IPC messages are validated and sanitized

---

Thank you for helping keep this project and its users safe!
