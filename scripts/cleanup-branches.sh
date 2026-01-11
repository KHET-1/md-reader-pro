#!/bin/bash
# Branch Cleanup Script for md-reader-pro
# Generated: 2026-01-11
#
# Analysis Summary:
# - Main branch (v4.0.0) contains all valuable changes
# - All other branches are either merged, diverged, or obsolete
# - Only main and gh-pages should be retained

set -e

echo "=== MD Reader Pro Branch Cleanup ==="
echo ""
echo "This script will delete the following stale branches:"
echo "  - alert-autofix-15 (tests already in main)"
echo "  - alert-autofix-22 (diverged/obsolete)"
echo "  - alert-fix-21 (diverged/obsolete)"
echo "  - copilot/fix-6220dd61-a3c5-4439-9bfa-b206420bcda5 (diverged)"
echo "  - copilot/fix-c7d7275f-8caa-4709-80d9-0eb8819cfd17 (merged)"
echo "  - copilot/fix-ci-test-failures (stale v3.4.0)"
echo "  - copilot/fix-d1881f79-f693-40b8-9240-5ab77e2353ba (merged)"
echo "  - copilot/fix-dependency-lock-file-issues (would regress)"
echo "  - copilot/fix-e96a3883-0b85-47d0-a6be-b627dee646e6 (merged)"
echo "  - perfomance (typo, diverged)"
echo "  - release/3.1.0-reapply (old release)"
echo ""
echo "Branches to KEEP:"
echo "  - main (primary)"
echo "  - gh-pages (deployment)"
echo ""

read -p "Continue with deletion? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "Deleting branches..."

# Delete branches one by one with error handling
BRANCHES=(
    "alert-autofix-15"
    "alert-autofix-22"
    "alert-fix-21"
    "copilot/fix-6220dd61-a3c5-4439-9bfa-b206420bcda5"
    "copilot/fix-c7d7275f-8caa-4709-80d9-0eb8819cfd17"
    "copilot/fix-ci-test-failures"
    "copilot/fix-d1881f79-f693-40b8-9240-5ab77e2353ba"
    "copilot/fix-dependency-lock-file-issues"
    "copilot/fix-e96a3883-0b85-47d0-a6be-b627dee646e6"
    "perfomance"
    "release/3.1.0-reapply"
)

for branch in "${BRANCHES[@]}"; do
    echo -n "Deleting $branch... "
    if git push origin --delete "$branch" 2>/dev/null; then
        echo "OK"
    else
        echo "FAILED (may already be deleted)"
    fi
done

echo ""
echo "=== Cleanup Complete ==="
echo ""
echo "Remaining branches:"
git fetch --prune
git branch -r
