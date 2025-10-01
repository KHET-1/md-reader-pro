# Phase 1: Critical Updates - RUN NOW

## Step 1: Update marked (CRITICAL - XSS Protection)

```bash
npm install marked@latest
```

**What this does:** Updates from v5.1.2 → v14.1.4  
**Why:** We removed deprecated options and added DOMPurify for XSS protection  
**Breaking changes:** Already handled ✅

## Step 2: Test Everything

```bash
npm test
npm run build
```

**If tests fail:** Check the error and refer to marked v14 migration guide

## Step 3: Update Webpack (Security Patches)

```bash
npm install -D webpack@latest
```

**What this does:** Updates from v5.88.0 → v5.97.1  
**Why:** Security patches and bug fixes  
**Breaking changes:** None (same major version)

## Step 4: Test Again

```bash
npm test
npm run build
npm run test:e2e
```

---

# Phase 2: Build Tools - DO THIS WEEK

## Update Babel

```bash
npm install -D @babel/core@latest @babel/preset-env@latest
```

**What this does:** 7.22.0 → 7.26.0  
**Why:** Better browser support, bug fixes  
**Breaking changes:** Minimal

## Update Jest

```bash
npm install -D jest@latest
```

**What this does:** 29.5.0 → 29.7.0  
**Why:** Bug fixes, better error messages  
**Breaking changes:** None (same major version)

## Update Other Build Tools

```bash
npm install -D webpack-bundle-analyzer@latest \
              css-loader@latest \
              copy-webpack-plugin@latest \
              mini-css-extract-plugin@latest
```

## Test Everything

```bash
npm test
npm run build
```

---

# Phase 3: Optional Updates - DO THIS MONTH

## Update DOMPurify

```bash
npm install dompurify@latest
```

**What this does:** 3.0.9 → 3.2.2  
**Why:** Better sanitization, bug fixes

## Update Semantic Release

```bash
npm install -D semantic-release@latest @semantic-release/changelog@latest
```

**What this does:** Auto-versioning improvements

---

# ⚠️ SKIP FOR NOW: ESLint v9

ESLint v9 requires flat config migration (breaking change).  
Keep ESLint v8 for now, update later when you have time.

---

# Quick Command - Run All Phase 1 Updates

```bash
# Copy and paste this entire command
npm install marked@latest && \
npm install -D webpack@latest && \
npm test && \
npm run build && \
echo "✅ Phase 1 Complete! Check for any errors above."
```

---

# Verify Everything Works

After Phase 1 updates:

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Test in browser:**
   - Open http://localhost:8080
   - Type some markdown
   - Try XSS attack: `<script>alert('XSS')</script>`
   - Should be sanitized ✅

3. **Run full test suite:**
   ```bash
   npm run test:all
   ```

4. **Build production:**
   ```bash
   npm run build
   ```

5. **Check for vulnerabilities:**
   ```bash
   npm audit
   ```

---

# What Changed?

## In Code
- ✅ Added DOMPurify import
- ✅ Removed deprecated marked options
- ✅ Added HTML sanitization

## In Dependencies
- ✅ marked: 5.1.2 → 14.1.4 (XSS protection)
- ✅ webpack: 5.88.0 → 5.97.1 (security)

---

# Rollback If Needed

```bash
# If something breaks, rollback:
git checkout package.json package-lock.json
npm install
```

---

# Questions?

See `DEPENDENCY_ANALYSIS.md` for full breakdown.
