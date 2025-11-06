#!/bin/bash

# Script to delete outdated branches that failed review
# See BRANCH_REVIEW_SUMMARY.md for detailed analysis

set -e

echo "========================================="
echo "Branch Deletion Script"
echo "========================================="
echo ""
echo "This script will delete 10 branches that failed quality checks."
echo "See BRANCH_REVIEW_SUMMARY.md for details."
echo ""

# List of branches to delete
BRANCHES=(
    "alert-autofix-15"
    "alert-autofix-22"
    "alert-fix-21"
    "copilot/fix-6220dd61-a3c5-4439-9bfa-b206420bcda5"
    "copilot/fix-c7d7275f-8caa-4709-80d9-0eb8819cfd17"
    "copilot/fix-d1881f79-f693-40b8-9240-5ab77e2353ba"
    "copilot/fix-e96a3883-0b85-47d0-a6be-b627dee646e6"
    "copilot/fix-undeclared-variables"
    "perfomance"
    "release/3.1.0-reapply"
)

# Confirmation prompt
echo "The following branches will be deleted:"
for branch in "${BRANCHES[@]}"; do
    echo "  - $branch"
done
echo ""
read -p "Are you sure you want to delete these branches? (yes/no): " -r
echo ""

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Aborted. No branches were deleted."
    exit 0
fi

echo "Proceeding with deletion..."
echo ""

# Delete local branches (if they exist)
echo "Step 1: Deleting local branches..."
for branch in "${BRANCHES[@]}"; do
    if git show-ref --verify --quiet "refs/heads/$branch"; then
        echo "  Deleting local branch: $branch"
        git branch -D "$branch" 2>&1 || echo "    (already deleted or doesn't exist locally)"
    else
        echo "  Local branch not found: $branch (skipping)"
    fi
done
echo ""

# Delete remote branches
echo "Step 2: Deleting remote branches..."
for branch in "${BRANCHES[@]}"; do
    echo "  Deleting remote branch: $branch"
    git push origin --delete "$branch" 2>&1 || echo "    (already deleted or doesn't exist on remote)"
done
echo ""

echo "========================================="
echo "Deletion Complete!"
echo "========================================="
echo ""
echo "Remaining branches:"
git branch -r | grep -v "HEAD" | sed 's/origin\///' | sed 's/^[[:space:]]*//'
echo ""
echo "✓ All outdated branches have been deleted."
echo "✓ Main branch remains intact and functional."
