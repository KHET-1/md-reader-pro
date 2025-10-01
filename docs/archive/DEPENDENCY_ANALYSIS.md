# Dependency Analysis - MD Reader Pro

## Production Dependencies (3 total)

| Package | Current | Latest | Status | Why Used | Still Needed? |
|---------|---------|--------|--------|----------|---------------|
| **marked** | 5.1.2 | 14.1.4 | ⚠️ **9 major versions behind** | Converts markdown → HTML | ✅ YES - Core feature |
| **prismjs** | 1.30.0 | 1.29.0 | ✅ Up to date | Syntax highlighting for code blocks | ✅ YES - Better UX |
| **dompurify** | 3.0.9 | 3.2.2 | ⚠️ Minor update | XSS protection (sanitize HTML) | ⚠️ NOT USED! Should use |

---

## Dev Dependencies (16 total)

### Build Tools
| Package | Current | Latest | Status | Why Used |
|---------|---------|--------|--------|----------|
| **webpack** | 5.88.0 | 5.97.1 | ⚠️ **Security updates** | Bundles JS/CSS for production |
| **webpack-cli** | 6.0.1 | 6.0.1 | ✅ Current | CLI for webpack commands |
| **webpack-dev-server** | 5.2.2 | 5.2.2 | ✅ Current | Dev server with hot reload |
| **webpack-bundle-analyzer** | 4.9.0 | 4.10.2 | ⚠️ Minor | Visualize bundle size |

### Transpilers & Loaders
| Package | Current | Latest | Status | Why Used |
|---------|---------|--------|--------|----------|
| **@babel/core** | 7.22.0 | 7.26.0 | ⚠️ **Major behind** | Transpile modern JS → older JS |
| **@babel/preset-env** | 7.22.0 | 7.26.0 | ⚠️ **Major behind** | Auto browser compatibility |
| **babel-loader** | 9.2.1 | 9.2.1 | ✅ Current | Webpack ↔ Babel integration |
| **css-loader** | 6.8.0 | 7.1.2 | ⚠️ **Major behind** | Import CSS in JS |
| **style-loader** | 3.3.0 | 4.0.0 | ⚠️ **Major behind** | Inject CSS into DOM |
| **mini-css-extract-plugin** | 2.7.0 | 2.9.2 | ⚠️ Minor | Extract CSS to files |

### Testing
| Package | Current | Latest | Status | Why Used |
|---------|---------|--------|--------|----------|
| **jest** | 29.5.0 | 29.7.0 | ⚠️ Minor | Unit test framework |
| **jest-environment-jsdom** | 29.7.0 | 29.7.0 | ✅ Current | Simulate browser in tests |
| **@playwright/test** | 1.55.0 | 1.49.1 | ✅ Ahead! | E2E browser testing |

### Code Quality
| Package | Current | Latest | Status | Why Used |
|---------|---------|--------|--------|----------|
| **eslint** | 8.44.0 | 9.17.0 | 🔴 **MAJOR behind (v8 → v9)** | Code linting/style |

### Other
| Package | Current | Latest | Status | Why Used |
|---------|---------|--------|--------|----------|
| **copy-webpack-plugin** | 11.0.0 | 12.0.2 | ⚠️ **Major behind** | Copy static files |
| **html-webpack-plugin** | 5.6.4 | 5.6.3 | ✅ Ahead | Generate HTML files |
| **http-server** | 14.1.1 | 14.1.1 | ✅ Current | Simple HTTP server |
| **express** | 5.1.0 | 5.0.1 | ✅ Ahead | Custom test server |
| **semantic-release** | 22.0.0 | 24.2.0 | ⚠️ **Major behind** | Auto versioning/releases |
| **@semantic-release/changelog** | 6.0.0 | 6.0.3 | ⚠️ Minor | Generate CHANGELOG |

---

## 🚨 Critical Issues

### 1. **DOMPurify NOT Being Used** 
```javascript
// Current code (src/index.js)
marked.setOptions({
    sanitize: false  // ⚠️ deprecated & disabled!
});

// You have DOMPurify installed but never import it!
// This means NO XSS PROTECTION
```

### 2. **marked v5 → v14 (HUGE gap)**
- 9 major versions behind
- `sanitize` option removed (must use DOMPurify)
- `mangle` option removed
- New extension system

### 3. **ESLint v8 → v9 Breaking Changes**
- Flat config required (no more `.eslintrc.json`)
- Many plugins incompatible
- New API

---

## 📊 Priority Matrix

### 🔴 **CRITICAL - Do Now**
1. **Add DOMPurify usage** (you already have it!)
2. **Update marked to v14**
3. **Update webpack** (security patches)

### 🟡 **HIGH - This Week**
4. Update Babel (7.22 → 7.26)
5. Update Jest (29.5 → 29.7)
6. Update semantic-release (22 → 24)

### 🟢 **MEDIUM - This Month**
7. Update ESLint v8 → v9 (breaking changes!)
8. Update CSS loaders
9. Update webpack plugins

### ⚪ **LOW - When Convenient**
10. Minor version bumps

---

## 🎯 Recommended Action Plan

### Phase 1: Security & XSS Protection (30 min)

```bash
# Update marked
npm install marked@latest

# DOMPurify is already installed, just use it!
```

**Changes needed in `src/index.js`:**
```javascript
import DOMPurify from 'dompurify';

marked.setOptions({
    breaks: true,
    gfm: true,
    headerIds: false,
    // Remove: sanitize, mangle (deprecated)
    highlight: function(code, lang) {
        if (lang && Prism.languages[lang]) {
            return Prism.highlight(code, Prism.languages[lang], lang);
        }
        return code;
    }
});

updatePreview() {
    // ... validation code ...
    
    try {
        const rawHtml = marked.parse(markdownText);
        
        // 🔐 Add XSS protection!
        const cleanHtml = DOMPurify.sanitize(rawHtml, {
            ALLOWED_TAGS: ['h1','h2','h3','h4','h5','h6','p','a','ul',
                          'ol','li','blockquote','code','pre','strong',
                          'em','img','table','thead','tbody','tr','th',
                          'td','br','hr','del','input'],
            ALLOWED_ATTR: ['href','src','alt','title','class','type',
                          'checked','disabled']
        });
        
        this.preview.innerHTML = cleanHtml;
    } catch (error) {
        // ... error handling ...
    }
}
```

### Phase 2: Build Tool Updates (1 hour)

```bash
# Update webpack ecosystem
npm install -D webpack@latest \
              @babel/core@latest \
              @babel/preset-env@latest \
              jest@latest

# Run tests
npm test
```

### Phase 3: ESLint v9 Migration (2 hours)

```bash
# Update ESLint
npm install -D eslint@latest

# Create new flat config
# Rename .eslintrc.json → eslint.config.mjs
```

---

## 🔍 What Can Be Removed?

### Nothing! All dependencies are used:

- ✅ **marked** - Core markdown parsing
- ✅ **prismjs** - Code syntax highlighting  
- ✅ **dompurify** - Should be used for XSS protection
- ✅ **webpack** - Bundler
- ✅ **babel** - Browser compatibility
- ✅ **jest** - Testing
- ✅ **playwright** - E2E testing
- ✅ **eslint** - Code quality

---

## 📈 Version Jump Summary

```
Package               Current   →   Latest      Gap
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
marked                5.1.2     →   14.1.4      🔴 9 major
eslint                8.44.0    →   9.17.0      🔴 1 major
webpack               5.88.0    →   5.97.1      🟡 9 patch
@babel/core           7.22.0    →   7.26.0      🟡 4 minor
semantic-release      22.0.0    →   24.2.0      🟡 2 major
css-loader            6.8.0     →   7.1.2       🟡 1 major
style-loader          3.3.0     →   4.0.0       🟡 1 major
copy-webpack-plugin   11.0.0    →   12.0.2      🟡 1 major
jest                  29.5.0    →   29.7.0      🟢 2 patch
```

---

## ⏱️ Time Estimates

- **Phase 1 (Critical):** 30 minutes
- **Phase 2 (High):** 1 hour  
- **Phase 3 (Medium):** 2 hours
- **Total:** ~3.5 hours

---

## 🧪 Testing Strategy

After each update:
```bash
npm test              # Unit tests
npm run build         # Build check
npm run test:e2e      # E2E tests
npm run lint          # Code quality
```

---

## 📝 Notes

- **DOMPurify is already installed but not used** ← Fix this first!
- **marked v14 is NOT backwards compatible** ← Read migration guide
- **ESLint v9 requires flat config** ← Breaking change
- All other updates are relatively safe
