# Branch Deletion Instructions

This document provides instructions for deleting the reviewed branches that failed quality checks.

## Summary

**10 branches** have been reviewed and **all should be deleted** as they:
- Fail quality checks (lint, build, and/or tests)
- Remove important files present in main
- Are outdated and superseded by main branch

## Method 1: Delete via GitHub Web UI (Recommended)

1. Go to https://github.com/KHET-1/md-reader-pro/branches
2. For each branch listed below, click the trash icon (🗑️) to delete:
   - `alert-autofix-15`
   - `alert-autofix-22`
   - `alert-fix-21`
   - `copilot/fix-6220dd61-a3c5-4439-9bfa-b206420bcda5`
   - `copilot/fix-c7d7275f-8caa-4709-80d9-0eb8819cfd17`
   - `copilot/fix-d1881f79-f693-40b8-9240-5ab77e2353ba`
   - `copilot/fix-e96a3883-0b85-47d0-a6be-b627dee646e6`
   - `copilot/fix-undeclared-variables`
   - `perfomance`
   - `release/3.1.0-reapply`

## Method 2: Delete via Git Command Line

If you have appropriate permissions and want to delete all branches at once:

```bash
# Delete branches locally
git branch -D alert-autofix-15
git branch -D alert-autofix-22
git branch -D alert-fix-21
git branch -D "copilot/fix-6220dd61-a3c5-4439-9bfa-b206420bcda5"
git branch -D "copilot/fix-c7d7275f-8caa-4709-80d9-0eb8819cfd17"
git branch -D "copilot/fix-d1881f79-f693-40b8-9240-5ab77e2353ba"
git branch -D "copilot/fix-e96a3883-0b85-47d0-a6be-b627dee646e6"
git branch -D "copilot/fix-undeclared-variables"
git branch -D perfomance
git branch -D "release/3.1.0-reapply"

# Delete branches from remote
git push origin --delete alert-autofix-15
git push origin --delete alert-autofix-22
git push origin --delete alert-fix-21
git push origin --delete "copilot/fix-6220dd61-a3c5-4439-9bfa-b206420bcda5"
git push origin --delete "copilot/fix-c7d7275f-8caa-4709-80d9-0eb8819cfd17"
git push origin --delete "copilot/fix-d1881f79-f693-40b8-9240-5ab77e2353ba"
git push origin --delete "copilot/fix-e96a3883-0b85-47d0-a6be-b627dee646e6"
git push origin --delete "copilot/fix-undeclared-variables"
git push origin --delete perfomance
git push origin --delete "release/3.1.0-reapply"
```

## Method 3: Automated Script

A helper script is provided in `scripts/delete-branches.sh` that can delete all branches automatically.

```bash
# Make the script executable
chmod +x scripts/delete-branches.sh

# Run the script
./scripts/delete-branches.sh
```

## Verification

After deletion, verify that only the following branches remain:
- `main` (protected, primary branch)
- `gh-pages` (GitHub Pages deployment)
- `copilot/review-fix-validity-and-merge` (this PR branch)

You can verify by running:
```bash
git branch -r
```

Or by visiting: https://github.com/KHET-1/md-reader-pro/branches

## Important Notes

- ⚠️ **Backup**: If you're unsure, consider archiving these branches first
- ✅ **Safe**: All reviewed branches are outdated and fail quality checks
- 📋 **Documentation**: See `BRANCH_REVIEW_SUMMARY.md` for detailed analysis
- 🔒 **Protected**: Main and gh-pages branches are safe and will not be deleted
