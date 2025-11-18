# GitHub Actions Workflows

This directory contains automated workflows for the MD Reader Pro project.

## Workflows

### CI/CD Pipeline (`ci-cd.yml`)
Runs on every push and pull request to main branch:
- Linting with ESLint
- Test suite execution
- Production build
- Deployment to GitHub Pages (main branch only)

### ESLint Security Scanning (`eslint.yml`)
Runs on push, pull request, and daily schedule:
- Static code analysis with ESLint
- Security vulnerability detection
- SARIF report generation

### CodeQL Security Analysis (`codeql.yml`)
Runs on push and pull request:
- Advanced security scanning
- Vulnerability detection
- Code quality analysis

### Performance Testing (`performance.yml`)
Runs on pull requests and daily schedule:
- Performance benchmarks
- Regression detection
- Memory usage monitoring

### Jekyll GitHub Pages (`jekyll-gh-pages.yml`)
Automated GitHub Pages deployment with Jekyll.

### Close Stale Pull Requests (`close-stale-prs.yml`)
Automated PR management to keep the repository clean:

#### Schedule
- Runs daily at 00:00 UTC
- Can be manually triggered via GitHub Actions UI

#### Behavior
- Marks PRs as stale after 3 days of inactivity
- Automatically closes stale PRs immediately (0 additional days)
- Posts notification messages when marking as stale and closing
- Skips issues (only processes pull requests)

#### Exemptions
PRs with the following labels are exempt from auto-closure:
- `keep-open` - Explicitly keep the PR open
- `wip` - Work in progress
- `work-in-progress` - Alternative WIP label
- `do-not-close` - Prevent automatic closure

#### Configuration
- **Stale threshold**: 3 days
- **Close delay**: 0 days (immediate after marking as stale)
- **Operations per run**: 100 PRs
- **Stale label**: `stale`

#### Manual Override
To prevent a PR from being automatically closed:
1. Add one of the exempt labels listed above
2. Ensure regular activity (comments, commits, reviews)
3. Manually remove the `stale` label if it was added

#### Notifications
When a PR is marked as stale:
> "This pull request has been open for 3 days without activity. It will be automatically closed soon."

When a PR is closed:
> "This pull request has been automatically closed because it has been open for more than 3 days without being merged."

## Maintenance

### Adding a New Workflow
1. Create a new `.yml` file in this directory
2. Follow GitHub Actions syntax
3. Use appropriate triggers (`on:`)
4. Set minimal required permissions
5. Add documentation here

### Modifying Existing Workflows
1. Test changes in a fork or feature branch first
2. Validate YAML syntax: `python3 -c "import yaml; yaml.safe_load(open('workflow.yml'))"`
3. Check for security implications
4. Update this documentation if behavior changes

### Best Practices
- Use specific action versions (e.g., `@v9` instead of `@main`)
- Set minimal required permissions
- Use secrets for sensitive data
- Add descriptive comments
- Enable manual triggers where appropriate (`workflow_dispatch`)
- Cache dependencies when possible
- Set reasonable timeouts

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [actions/stale Documentation](https://github.com/actions/stale)
- [Workflow Syntax](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions)
