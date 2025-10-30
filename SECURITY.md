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
- **Frogbot (Optional)**: When JFrog credentials are configured, we use [Frogbot](https://docs.jfrog-applications.jfrog.io/jfrog-applications/frogbot) for advanced vulnerability scanning via JFrog Xray. This is an optional enhancement and requires:
  - `JF_URL` secret: Your JFrog platform URL
  - `JF_ACCESS_TOKEN` secret: JFrog access token with Xray read permissions
  - The workflow will skip automatically if these credentials are not configured
- Security updates are prioritized and released as soon as possible.

---

Thank you for helping keep this project and its users safe!
