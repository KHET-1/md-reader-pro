# Security Audit Notes

## Date: November 24, 2025

### NPM Audit Findings

#### Current Status
4 high severity vulnerabilities detected in transitive dependencies.

#### Vulnerability Details

**1. glob (v11.0.0 - 11.0.3)**
- CVE: GHSA-5j98-mcp5-4vw2
- Severity: High (CVSS 7.5)
- Description: Command injection via -c/--cmd executes matches with shell:true
- Affected: npm → glob dependency chain
- Impact: **LOW RISK** - Only affects CLI usage of glob, not library usage

**2. npm, @semantic-release/npm, semantic-release**
- All vulnerabilities stem from the glob dependency
- Suggested fix: Downgrade semantic-release from v25.0.2 to v24.2.9 (breaking change)

#### Risk Assessment

**Overall Risk: LOW**

Reasoning:
1. **semantic-release is a dev dependency only** - Not used in production code
2. **Not currently used in CI/CD** - No GitHub Actions workflows use semantic-release
3. **CLI-specific vulnerability** - The glob vulnerability only affects CLI usage with specific flags (-c/--cmd), not library/programmatic usage
4. **No direct exposure** - The vulnerability is deep in the transitive dependency chain and not exposed through our codebase

#### Current Action: ACCEPTED RISK

We are accepting this risk because:
- semantic-release v25 requires Node.js v22.14+ or v24.10+, but the project runs on Node.js v20.19.5
- Downgrading to v24.2.9 would be a breaking change requiring Node.js version upgrade across all environments
- The vulnerability does not affect the production build or runtime
- semantic-release is not currently utilized in any automated workflows

#### Recommended Future Actions

1. **When upgrading Node.js to v22.14+ or v24.10+:**
   - Monitor for semantic-release updates that fix the glob dependency vulnerability
   - Consider removing semantic-release if not actively used for releases

2. **Alternative:**
   - Remove semantic-release and @semantic-release/changelog from devDependencies if not needed
   - This would eliminate all 4 vulnerabilities

3. **If semantic-release is needed:**
   - Upgrade Node.js to meet the engine requirements
   - Wait for a patch release of semantic-release that addresses the glob vulnerability

#### References
- GitHub Advisory: https://github.com/advisories/GHSA-5j98-mcp5-4vw2
- CWE-78: OS Command Injection
