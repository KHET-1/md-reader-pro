# Pull Request Action Plan

**Quick Reference Guide for Handling Open PRs**

---

## ❌ PRs to Close (8 total)

Close these PRs as duplicates/iterations. Use this comment template:

```
Closing this PR as it's a duplicate iteration attempt created during rapid development. 
The security features from this work are better represented in PRs #147 and #148.

Thank you for the contribution!
```

### List of PRs to Close:
1. ❌ **PR #149** - Close (duplicate)
2. ❌ **PR #150** - Close (duplicate)  
3. ❌ **PR #151** - Close (duplicate)
4. ❌ **PR #152** - Close (duplicate)
5. ❌ **PR #153** - Close (duplicate)
6. ❌ **PR #154** - Close (duplicate)
7. ❌ **PR #155** - Close (duplicate)
8. ❌ **PR #156** - Close (duplicate)

---

## ✅ PRs to Review for Merge (2 total)

These PRs contain valuable security enhancements:

### PR #147: Token-based Authentication
- **Security Impact:** High
- **Test Coverage:** 11 unit tests + 4 E2E tests
- **Changes:** +301 lines, -4 lines
- **Action:** Review and merge if tests pass

### PR #148: Path Validation
- **Security Impact:** Critical  
- **Test Coverage:** 8 path validator tests + 5 IPC tests
- **Changes:** +865 lines, -7 lines
- **Action:** Review and merge if tests pass

---

## ⏳ PR to Keep Open

- **PR #157** - This PR (keep open until task complete)

---

## Quick Commands

### To close a PR via GitHub CLI:
```bash
gh pr close 149 -c "Closing as duplicate iteration. See PR_MANAGEMENT_ANALYSIS.md"
gh pr close 150 -c "Closing as duplicate iteration. See PR_MANAGEMENT_ANALYSIS.md"
gh pr close 151 -c "Closing as duplicate iteration. See PR_MANAGEMENT_ANALYSIS.md"
gh pr close 152 -c "Closing as duplicate iteration. See PR_MANAGEMENT_ANALYSIS.md"
gh pr close 153 -c "Closing as duplicate iteration. See PR_MANAGEMENT_ANALYSIS.md"
gh pr close 154 -c "Closing as duplicate iteration. See PR_MANAGEMENT_ANALYSIS.md"
gh pr close 155 -c "Closing as duplicate iteration. See PR_MANAGEMENT_ANALYSIS.md"
gh pr close 156 -c "Closing as duplicate iteration. See PR_MANAGEMENT_ANALYSIS.md"
```

### To review PRs:
```bash
gh pr view 147
gh pr view 148
```

### To merge PRs (after review):
```bash
gh pr merge 147 --squash
gh pr merge 148 --squash
```

---

## Cleanup After Actions

After closing the duplicate PRs, clean up their branches:

```bash
git push origin --delete copilot/sub-pr-146-another-one
git push origin --delete copilot/sub-pr-146-yet-again
git push origin --delete copilot/sub-pr-146-one-more-time
git push origin --delete copilot/sub-pr-146-please-work
git push origin --delete copilot/sub-pr-146-f31f2f94-dc8d-44f5-9ca4-3090ab8fcd9c
git push origin --delete copilot/sub-pr-146-9d586dd7-802c-476d-b0f0-01492cca8946
git push origin --delete copilot/sub-pr-146-4b4ebd22-bc25-41be-833d-55b48a763920
git push origin --delete copilot/sub-pr-146-b5ac133a-0593-42dc-8c34-4561b9fdd8af
```

---

## Expected Outcome

After completing these actions:
- **Open PRs:** 11 → 3 (or 1 if security PRs are merged)
- **Draft PRs:** Will be reduced significantly
- **Security:** Improved with authentication and path validation
- **Repository Cleanliness:** Much improved

---

**Note:** These actions require repository maintainer permissions. If you don't have the necessary permissions, share this document with a repository administrator.
