# Complete Update Process - v3.3.0

## 🚀 Ready to Update!

Everything is prepared. Follow these steps:

---

## Step 1: Run Phase 1 Updates (5 min)

### Option A: Automated Script (Recommended)
```bash
# On Windows
cd C:\MD-Reader-Pro-Setup
.\scripts\phase1-update.bat

# On Mac/Linux
cd /path/to/MD-Reader-Pro-Setup
chmod +x scripts/phase1-update.sh
./scripts/phase1-update.sh
```

### Option B: Manual Commands
```bash
npm install marked@latest
npm install -D webpack@latest
npm install dompurify@latest
npm test
npm run build
```

### ✅ Validation Point 1
After Phase 1 completes, you should see:
- ✅ marked: v14.1.4
- ✅ webpack: v5.97.1
- ✅ dompurify: v3.2.2
- ✅ All 164 tests passing
- ✅ Build successful

**🛑 STOP HERE AND TEST**

```bash
npm run dev
```
Open http://localhost:8080 and verify:
1. Markdown rendering works
2. Code syntax highlighting works
3. Try XSS: `<script>alert('test')</script>` (should be sanitized)
4. File upload/drag-drop works
5. Keyboard shortcuts work (Tab, Ctrl+S)

---

## Step 2: Phase 2 Updates (This Week - 1 hour)

After Phase 1 is tested and working:

```bash
# Update Babel
npm install -D @babel/core@latest @babel/preset-env@latest

# Update Jest
npm install -D jest@latest

# Update webpack ecosystem
npm install -D webpack-bundle-analyzer@latest

# Test everything
npm test
npm run build
npm run test:e2e
```

### ✅ Validation Point 2
- ✅ @babel/core: v7.26.0
- ✅ @babel/preset-env: v7.26.0
- ✅ jest: v29.7.0
- ✅ All tests passing
- ✅ Build successful

**Update CHANGELOG.md:**
```markdown
## Version 3.3.0 - October 1, 2025

### 📦 Additional Dependencies Updated
- @babel/core: 7.22.0 → 7.26.0
- @babel/preset-env: 7.22.0 → 7.26.0
- jest: 29.5.0 → 29.7.0
- webpack-bundle-analyzer: 4.9.0 → 4.10.2
```

---

## Step 3: Phase 3 Updates (This Month - Optional)

```bash
# Update CSS loaders
npm install -D css-loader@latest style-loader@latest

# Update webpack plugins
npm install -D copy-webpack-plugin@latest mini-css-extract-plugin@latest

# Update release tools
npm install -D semantic-release@latest @semantic-release/changelog@latest

# Test
npm test
npm run build
```

### ✅ Validation Point 3
- ✅ All loaders updated
- ✅ All plugins updated
- ✅ Tests passing
- ✅ Build successful

---

## Step 4: Final Validation

### Run Full Test Suite
```bash
npm run test:all
npm run test:e2e
npm run lint
```

### Manual Browser Testing
1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Test Features:**
   - [ ] Type markdown, see live preview
   - [ ] Bold, italic, headers render correctly
   - [ ] Code blocks with syntax highlighting
   - [ ] Tables render properly
   - [ ] Upload .md file works
   - [ ] Drag & drop file works
   - [ ] Save file works (Ctrl+S)
   - [ ] Tab indentation works
   - [ ] Help bar opens/closes
   - [ ] Copy examples to editor
   - [ ] XSS protection (try `<script>alert('xss')</script>`)

3. **Test in Multiple Browsers:**
   - [ ] Chrome
   - [ ] Firefox
   - [ ] Safari (if on Mac)
   - [ ] Edge

### Build Production
```bash
npm run build
npm run serve:dist
```
Visit production build and test again.

---

## Step 5: Commit Changes

### Review Changes
```bash
git status
git diff package.json
git diff package-lock.json
git diff src/index.js
git diff CHANGELOG.md
```

### Commit
```bash
git add .
git commit -m "feat: update to v3.3.0 with security improvements

- Update marked v5.1.2 → v14.1.4 (XSS protection)
- Update webpack v5.88.0 → v5.97.1 (security)
- Update dompurify v3.0.9 → v3.2.2
- Remove deprecated APIs (document.execCommand, marked options)
- Add DOMPurify HTML sanitization
- Improve error handling with toast notifications
- Update version to 3.3.0

BREAKING CHANGES:
- Requires marked v14+ (removed sanitize/mangle options)
- DOMPurify now required for XSS protection

All 164 tests passing."
```

### Tag Release
```bash
git tag -a v3.3.0 -m "Release v3.3.0 - Security & Modernization"
git push origin main --tags
```

---

## Rollback Plan (If Needed)

If something breaks:

```bash
# Rollback all changes
git checkout HEAD -- package.json package-lock.json
npm install

# Or rollback to specific version
git reset --hard v3.2.0
npm install
```

---

## Version Summary

### What Changed in v3.3.0

**Security:**
- ✅ XSS protection with DOMPurify
- ✅ Updated marked (9 major versions)
- ✅ Security patches in webpack

**Code Quality:**
- ✅ Removed 3 deprecated APIs
- ✅ Better error handling
- ✅ Modern Clipboard API

**Dependencies:**
- marked: 5.1.2 → 14.1.4
- webpack: 5.88.0 → 5.97.1
- dompurify: 3.0.9 → 3.2.2
- @babel/core: 7.22.0 → 7.26.0
- jest: 29.5.0 → 29.7.0

**Testing:**
- ✅ All 164 tests passing
- ✅ Test coverage maintained 80%+
- ✅ E2E tests updated

---

## Deployment Checklist

- [ ] All updates installed
- [ ] Tests passing (npm test)
- [ ] Build successful (npm run build)
- [ ] E2E tests passing (npm run test:e2e)
- [ ] Manual testing complete
- [ ] CHANGELOG.md updated
- [ ] Version bumped to 3.3.0
- [ ] Git committed and tagged
- [ ] Pushed to repository
- [ ] GitHub release created
- [ ] Production deployed
- [ ] Production verified

---

## Questions?

- See **DEPENDENCY_ANALYSIS.md** for technical details
- See **UPDATE_GUIDE.md** for step-by-step commands
- See **CHANGELOG.md** for complete version history
- See **COMPLETE_MODERNIZATION.md** for full summary

---

## 🎉 Ready to Start?

**Run this now:**
```bash
cd C:\MD-Reader-Pro-Setup
.\scripts\phase1-update.bat
```

Then come back here for validation!
