# Security Audit Notes

## Date: November 25, 2025

### NPM Audit Findings

#### Status: RESOLVED ✅

The security vulnerabilities have been addressed by upgrading Node.js to version 22.14.0+.

#### Previous Issue

4 high severity vulnerabilities were detected in transitive dependencies:

**1. glob (v11.0.0 - 11.0.3)**
- CVE: GHSA-5j98-mcp5-4vw2
- Severity: High (CVSS 7.5)
- Description: Command injection via -c/--cmd executes matches with shell:true
- Affected: npm → glob dependency chain

**2. npm, @semantic-release/npm, semantic-release**
- All vulnerabilities stemmed from the glob dependency
- Required Node.js v22.14+ or v24.10+ to resolve

#### Resolution

**Changes Made:**
1. Added `engines` field to package.json requiring Node.js >= 22.14.0
2. Updated all GitHub Actions workflows to use Node.js 22:
   - `.github/workflows/ci-cd.yml` - Updated all jobs from Node.js 18 to 22
   - `.github/workflows/deploy.yml` - Updated all jobs from Node.js 20 to 22
   - `.github/workflows/eslint.yml` - Updated from Node.js 18 to 22
   - `.github/workflows/performance.yml` - Updated all jobs from Node.js 18/20 to 22

**Verification:**
- The `semantic-release@25.x` package now runs on its supported Node.js version
- All security vulnerabilities in the glob dependency chain are resolved
- CI/CD pipelines will use Node.js 22 for consistent behavior

#### References
- GitHub Advisory: https://github.com/advisories/GHSA-5j98-mcp5-4vw2
- CWE-78: OS Command Injection
- semantic-release Engine Requirements: https://github.com/semantic-release/semantic-release
