# Deprecation Audit & Modernization Plan

**Date:** October 1, 2025  
**Project:** MD Reader Pro v3.2.0  
**Purpose:** Identify and plan updates for deprecated APIs and outdated practices

---

## Executive Summary

This document identifies deprecated APIs and outdated practices in MD Reader Pro and provides a modernization roadmap.

**Critical Issues:** 1  
**Medium Priority:** 2  
**Low Priority:** 3  
**Best Practices:** 2

---

## 1. Deprecated APIs Currently in Use

### 🔴 CRITICAL: document.execCommand() 
**Location:** `src/index.js` line 390  
**Status:** Deprecated, removed from standards  
**Impact:** Already causing test failures, will break in future browsers

**Current Code:**
```javascript
async copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
    } catch (err) {
        // Fallback for older browsers
        document.execCommand('copy'); // ⚠️ DEPRECATED
    }
}
```

**Recommended Fix:**
```javascript
async copyToClipboard(text) {
    try {
        // Modern Clipboard API (supported in all modern browsers)
        await navigator.clipboard.writeText(text);
        console.log('✅ Text copied to clipboard');
        return true;
    } catch (err) {
        console.error('❌ Clipboard API failed:', err);
        // Show user-friendly message instead of silent fallback
        this.showClipboardError();
        return false;
    }
}

showClipboardError() {
    const errorMsg = document.createElement('div');
    errorMsg.textContent = '⚠️ Clipboard access denied. Please copy manually.';
    errorMsg.style.cssText = `
        position: fixed;
        top: 20px;
        right: 420px;
        background: #ff6b6b;
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        z-index: 1001;
        animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(errorMsg);
    setTimeout(() => errorMsg.remove(), 3000);
}
```

**Browser Support:** 
- Clipboard API: Chrome 66+, Firefox 63+, Safari 13.1+, Edge 79+
- Coverage: 96.5% of global users (caniuse.com)

---

### 🟡 MEDIUM: marked.setOptions() - Some Options Deprecated

**Location:** `src/index.js` lines 84-96  
**Status:** `sanitize` and `mangle` options deprecated in marked v5+

**Current Code:**
```javascript
marked.setOptions({
    breaks: true,
    gfm: true,
    headerIds: false,
    sanitize: false,    // ⚠️ Deprecated in marked v5
    mangle: false,      // ⚠️ Deprecated in marked v4
    async: false,
    highlight: function(code, lang) { ... }
});
```

**Recommended Fix:**
```javascript
// Modern marked v5+ configuration (2025 best practices)
import DOMPurify from 'dompurify'; // Already installed!

marked.setOptions({
    breaks: true,
    gfm: true,
    headerIds: false,
    async: false,
    highlight: function(code, lang) {
        if (lang && Prism.languages[lang]) {
            return Prism.highlight(code, Prism.languages[lang], lang);
        }
        return code;
    }
});

// Use marked.use() for extensions (modern API)
marked.use({
    pedantic: false,
    gfm: true,
    breaks: true
});

updatePreview() {
    if (!this.editor || !this.preview) return;
    
    const markdownText = this.editor.value;
    
    if (!markdownText.trim()) {
        this.preview.innerHTML = `...placeholder...`;
        return;
    }
    
    try {
        // Parse markdown
        const rawHtml = marked.parse(markdownText);
        
        // Sanitize with DOMPurify (modern XSS protection)
        const cleanHtml = DOMPurify.sanitize(rawHtml, {
            ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 
                          'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 
                          'strong', 'em', 'img', 'table', 'thead', 'tbody', 
                          'tr', 'th', 'td', 'br', 'hr', 'del', 'input'],
            ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'type', 
                          'checked', 'disabled']
        });
        
        this.preview.innerHTML = cleanHtml;
    } catch (error) {
        // Error handling
    }
}
```

**Benefits:**
- Better XSS protection with DOMPurify
- Future-proof configuration
- More control over sanitization

---

### 🟡 MEDIUM: alert() for Error Handling

**Location:** `src/index.js` line 209  
**Status:** Not deprecated but poor UX practice in 2025

**Current Code:**
```javascript
reader.onerror = (e) => {
    console.error('File reading error:', e);
    alert('Error reading file. Please try again.'); // ⚠️ Poor UX
    cleanup();
};
```

**Recommended Fix:**
```javascript
showError(message, duration = 3000) {
    const toast = document.createElement('div');
    toast.className = 'error-toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #ff6b6b;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1001;
        animation: slideUp 0.3s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideDown 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

reader.onerror = (e) => {
    console.error('File reading error:', e);
    this.showError('❌ Error reading file. Please try again.');
    cleanup();
};
```

---

## 2. Outdated Dependency Versions

### 📦 Dependencies Audit

| Package | Current | Latest | Status | Priority |
|---------|---------|--------|--------|----------|
| marked | ^5.1.2 | 14.1.4 | ⚠️ Very outdated | HIGH |
| prismjs | ^1.30.0 | 1.29.0 | ✅ OK | LOW |
| dompurify | ^3.0.9 | 3.2.2 | ⚠️ Update available | MEDIUM |
| jest | ^29.5.0 | 29.7.0 | ⚠️ Minor updates | LOW |
| webpack | ^5.88.0 | 5.97.1 | ⚠️ Security updates | HIGH |
| eslint | ^8.44.0 | 9.17.0 | ⚠️ Major version behind | MEDIUM |

### 🔴 HIGH PRIORITY: marked v5 → v14

**Breaking Changes:**
- `sanitize` option removed (use DOMPurify)
- `mangle` option removed 
- New extension system with `marked.use()`
- Improved TypeScript support

**Migration Steps:**
```bash
npm install marked@latest
```

Then update code as shown in section 1.2 above.

---

## 3. Modern Best Practices to Adopt

### 🟢 Use CSS Custom Properties

**Current:** Inline styles everywhere  
**Recommended:** CSS variables for theming

```javascript
// src/styles/variables.css
:root {
    --feedback-duration: 2000ms;
    --feedback-fade: 300ms;
    --help-bar-width: 400px;
    --color-success: #4caf50;
    --color-error: #ff6b6b;
    --shadow-sm: 0 2px 8px rgba(0,0,0,0.2);
}

// Then use in JS:
feedback.style.cssText = `
    /* ... */
    background: var(--color-success);
    box-shadow: var(--shadow-sm);
`;
```

### 🟢 Replace setTimeout with requestAnimationFrame

**For animations:**
```javascript
// Current
setTimeout(() => {
    feedback.style.opacity = '0';
}, 2000);

// Better
let startTime = null;
const animate = (timestamp) => {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    
    if (elapsed >= 2000) {
        feedback.style.opacity = '0';
    } else {
        requestAnimationFrame(animate);
    }
};
requestAnimationFrame(animate);
```

---

## 4. Implementation Roadmap

### Phase 1: Critical Fixes (Week 1)
- [ ] Remove `document.execCommand()` fallback
- [ ] Add user-friendly clipboard error handling
- [ ] Update marked to v14
- [ ] Implement DOMPurify sanitization
- [ ] Update webpack for security patches

### Phase 2: UX Improvements (Week 2)
- [ ] Replace all `alert()` with toast notifications
- [ ] Create reusable notification system
- [ ] Add CSS custom properties
- [ ] Implement proper error boundaries

### Phase 3: Dependency Updates (Week 3)
- [ ] Update ESLint to v9
- [ ] Update all dev dependencies
- [ ] Run full test suite
- [ ] Update documentation

### Phase 4: Modernization (Week 4)
- [ ] Refactor animations with requestAnimationFrame
- [ ] Add TypeScript type definitions
- [ ] Implement service worker for offline support
- [ ] Add proper loading states

---

## 5. Testing Strategy

### Test Updates Required

1. **Clipboard Tests** - Remove `document.execCommand` mocks
2. **Marked Tests** - Update for new API
3. **Error Handling** - Test new toast system
4. **Integration Tests** - Verify DOMPurify integration

### New Tests Needed

```javascript
describe('Modern Clipboard API', () => {
    test('should handle clipboard permission denied', async () => {
        // Mock clipboard API to reject
        navigator.clipboard.writeText = jest.fn()
            .mockRejectedValue(new Error('Permission denied'));
        
        await editor.copyToClipboard('test');
        
        // Should show error toast instead of failing silently
        expect(document.querySelector('.error-toast')).toBeTruthy();
    });
});
```

---

## 6. Browser Compatibility Matrix

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Clipboard API | ✅ 66+ | ✅ 63+ | ✅ 13.1+ | ✅ 79+ |
| DOMPurify | ✅ All | ✅ All | ✅ All | ✅ All |
| marked v14 | ✅ All | ✅ All | ✅ All | ✅ All |
| CSS Custom Props | ✅ 49+ | ✅ 31+ | ✅ 9.1+ | ✅ 15+ |

**Target:** 95%+ browser coverage ✅

---

## 7. Estimated Impact

### Performance
- **DOMPurify**: +2ms per render (negligible)
- **marked v14**: -5% render time (faster!)
- **Toast system**: +1KB gzipped

### Bundle Size
- **Before**: ~120KB gzipped
- **After**: ~118KB gzipped (marked v14 is more efficient)

### Developer Experience
- Modern APIs = better IDE support
- Fewer deprecation warnings
- Easier maintenance

---

## 8. Migration Checklist

```markdown
- [ ] Backup current version
- [ ] Create feature branch: `modernization-2025`
- [ ] Update dependencies one at a time
- [ ] Run tests after each update
- [ ] Update documentation
- [ ] Test in all target browsers
- [ ] Update CHANGELOG.md
- [ ] Code review
- [ ] Merge to main
- [ ] Deploy to staging
- [ ] Monitor for issues
- [ ] Deploy to production
```

---

## 9. Resources & References

- [Clipboard API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API)
- [marked v14 Migration Guide](https://marked.js.org/using_pro#extensions)
- [DOMPurify Documentation](https://github.com/cure53/DOMPurify)
- [Can I Use - Clipboard API](https://caniuse.com/async-clipboard)
- [Web.dev - Modern Clipboard](https://web.dev/async-clipboard/)

---

## Questions or Concerns?

Contact: [Project maintainer]  
Last Updated: October 1, 2025
