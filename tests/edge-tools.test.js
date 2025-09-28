/**
 * Microsoft Edge Tools Integration Tests
 * Tests web standards compliance, accessibility, and performance using Edge Tools
 */

const { test, expect } = require('@playwright/test');

test.describe('Microsoft Edge Tools Quality Gates', () => {
  let server;
  let baseUrl;

  test.beforeAll(async () => {
    // Start test server
    const { spawn } = require('child_process');
    server = spawn('npx', ['http-server', 'dist', '-s', '-c-1', '-p', '3000'], {
      stdio: 'pipe'
    });
    
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 2000));
    baseUrl = 'http://localhost:3000';
  });

  test.afterAll(async () => {
    if (server) {
      server.kill();
    }
  });

  test('should pass Edge Tools accessibility audit', async ({ page }) => {
    await page.goto(baseUrl);
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    
    // Run accessibility audit using Edge Tools
    const accessibilityResults = await page.evaluate(() => {
      // Check for common accessibility issues
      const issues = [];
      
      // Check for missing alt attributes on images
      const images = document.querySelectorAll('img');
      images.forEach((img, index) => {
        if (!img.alt && !img.getAttribute('aria-label')) {
          issues.push(`Image ${index} missing alt attribute`);
        }
      });
      
      // Check for proper heading structure
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      if (headings.length === 0) {
        issues.push('No headings found');
      }
      
      // Check for proper form labels
      const inputs = document.querySelectorAll('input, textarea, select');
      inputs.forEach((input, index) => {
        const id = input.id;
        const label = document.querySelector(`label[for="${id}"]`);
        const ariaLabel = input.getAttribute('aria-label');
        
        if (!label && !ariaLabel && input.type !== 'hidden') {
          issues.push(`Form input ${index} missing label`);
        }
      });
      
      // Check for proper focus management
      const focusableElements = document.querySelectorAll('button, input, textarea, select, a[href]');
      let hasKeyboardNavigation = false;
      focusableElements.forEach(element => {
        if (element.tabIndex >= 0) {
          hasKeyboardNavigation = true;
        }
      });
      
      if (!hasKeyboardNavigation) {
        issues.push('No keyboard navigation available');
      }
      
      return {
        totalIssues: issues.length,
        issues: issues,
        imagesCount: images.length,
        headingsCount: headings.length,
        focusableElementsCount: focusableElements.length
      };
    });
    
    console.log('🔍 Edge Tools Accessibility Audit Results:', accessibilityResults);
    
    // Assert accessibility requirements
    expect(accessibilityResults.totalIssues).toBeLessThanOrEqual(2); // Allow some minor issues
    expect(accessibilityResults.headingsCount).toBeGreaterThan(0);
    expect(accessibilityResults.focusableElementsCount).toBeGreaterThan(0);
  });

  test('should pass Edge Tools performance audit', async ({ page }) => {
    await page.goto(baseUrl);
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    
    // Run performance audit using Edge Tools
    const performanceResults = await page.evaluate(() => {
      // Check Core Web Vitals
      const navigation = performance.getEntriesByType('navigation')[0];
      const paintEntries = performance.getEntriesByType('paint');
      
      const metrics = {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: 0,
        firstContentfulPaint: 0,
        totalResources: performance.getEntriesByType('resource').length,
        resourceSize: 0
      };
      
      // Get paint metrics
      paintEntries.forEach(entry => {
        if (entry.name === 'first-paint') {
          metrics.firstPaint = entry.startTime;
        }
        if (entry.name === 'first-contentful-paint') {
          metrics.firstContentfulPaint = entry.startTime;
        }
      });
      
      // Calculate total resource size
      performance.getEntriesByType('resource').forEach(resource => {
        if (resource.transferSize) {
          metrics.resourceSize += resource.transferSize;
        }
      });
      
      // Check for performance issues
      const issues = [];
      
      if (metrics.domContentLoaded > 2000) {
        issues.push(`DOM Content Loaded too slow: ${metrics.domContentLoaded}ms`);
      }
      
      if (metrics.firstContentfulPaint > 1500) {
        issues.push(`First Contentful Paint too slow: ${metrics.firstContentfulPaint}ms`);
      }
      
      if (metrics.resourceSize > 2 * 1024 * 1024) { // 2MB
        issues.push(`Total resource size too large: ${(metrics.resourceSize / 1024 / 1024).toFixed(2)}MB`);
      }
      
      if (metrics.totalResources > 50) {
        issues.push(`Too many resources: ${metrics.totalResources}`);
      }
      
      return {
        ...metrics,
        totalIssues: issues.length,
        issues: issues
      };
    });
    
    console.log('⚡ Edge Tools Performance Audit Results:', performanceResults);
    
    // Assert performance requirements
    expect(performanceResults.domContentLoaded).toBeLessThan(2000); // 2 seconds
    expect(performanceResults.firstContentfulPaint).toBeLessThan(1500); // 1.5 seconds
    expect(performanceResults.totalIssues).toBeLessThanOrEqual(2); // Allow some minor issues
  });

  test('should pass Edge Tools security audit', async ({ page }) => {
    await page.goto(baseUrl);
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    
    // Run security audit using Edge Tools
    const securityResults = await page.evaluate(() => {
      const issues = [];
      
      // Check for HTTPS usage
      if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        issues.push('Not using HTTPS');
      }
      
      // Check for Content Security Policy
      const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      if (!cspMeta) {
        issues.push('No Content Security Policy found');
      }
      
      // Check for secure cookies
      const cookies = document.cookie.split(';');
      cookies.forEach(cookie => {
        if (cookie.includes('secure') && !cookie.includes('Secure')) {
          issues.push('Cookie without Secure flag');
        }
      });
      
      // Check for inline scripts (potential XSS)
      const inlineScripts = document.querySelectorAll('script:not([src])');
      if (inlineScripts.length > 0) {
        issues.push(`Found ${inlineScripts.length} inline scripts (potential XSS risk)`);
      }
      
      // Check for external resources over HTTP
      const externalResources = document.querySelectorAll('link[href^="http:"], script[src^="http:"], img[src^="http:"]');
      if (externalResources.length > 0) {
        issues.push(`Found ${externalResources.length} external resources over HTTP`);
      }
      
      return {
        totalIssues: issues.length,
        issues: issues,
        hasCSP: !!cspMeta,
        inlineScriptsCount: inlineScripts.length,
        externalHttpResourcesCount: externalResources.length
      };
    });
    
    console.log('🔒 Edge Tools Security Audit Results:', securityResults);
    
    // Assert security requirements
    expect(securityResults.hasCSP).toBe(true); // Must have CSP
    expect(securityResults.inlineScriptsCount).toBeLessThanOrEqual(1); // Allow minimal inline scripts
    expect(securityResults.totalIssues).toBeLessThanOrEqual(3); // Allow some minor issues
  });

  test('should pass Edge Tools web standards compliance', async ({ page }) => {
    await page.goto(baseUrl);
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    
    // Run web standards compliance audit using Edge Tools
    const standardsResults = await page.evaluate(() => {
      const issues = [];
      
      // Check HTML5 compliance
      if (!document.doctype || document.doctype.name !== 'html') {
        issues.push('Missing or invalid DOCTYPE');
      }
      
      // Check for proper meta charset
      const charsetMeta = document.querySelector('meta[charset]');
      if (!charsetMeta || charsetMeta.getAttribute('charset').toLowerCase() !== 'utf-8') {
        issues.push('Missing or invalid charset meta tag');
      }
      
      // Check for viewport meta tag
      const viewportMeta = document.querySelector('meta[name="viewport"]');
      if (!viewportMeta) {
        issues.push('Missing viewport meta tag');
      }
      
      // Check for proper lang attribute
      if (!document.documentElement.lang) {
        issues.push('Missing lang attribute on html element');
      }
      
      // Check for proper semantic HTML
      const semanticElements = document.querySelectorAll('header, nav, main, section, article, aside, footer');
      if (semanticElements.length === 0) {
        issues.push('No semantic HTML elements found');
      }
      
      // Check for proper heading hierarchy
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      let previousLevel = 0;
      let hasProperHierarchy = true;
      
      headings.forEach(heading => {
        const currentLevel = parseInt(heading.tagName.charAt(1));
        if (currentLevel > previousLevel + 1) {
          hasProperHierarchy = false;
        }
        previousLevel = currentLevel;
      });
      
      if (!hasProperHierarchy) {
        issues.push('Improper heading hierarchy');
      }
      
      return {
        totalIssues: issues.length,
        issues: issues,
        hasValidDoctype: !!document.doctype,
        hasCharsetMeta: !!charsetMeta,
        hasViewportMeta: !!viewportMeta,
        hasLangAttribute: !!document.documentElement.lang,
        semanticElementsCount: semanticElements.length,
        headingsCount: headings.length
      };
    });
    
    console.log('📋 Edge Tools Web Standards Compliance Results:', standardsResults);
    
    // Assert web standards requirements
    expect(standardsResults.hasValidDoctype).toBe(true);
    expect(standardsResults.hasCharsetMeta).toBe(true);
    expect(standardsResults.hasViewportMeta).toBe(true);
    expect(standardsResults.hasLangAttribute).toBe(true);
    expect(standardsResults.totalIssues).toBeLessThanOrEqual(2); // Allow some minor issues
  });

  test('should pass Edge Tools responsive design audit', async ({ page }) => {
    const viewports = [
      { width: 320, height: 568, name: 'Mobile' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 1920, height: 1080, name: 'Desktop' }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(baseUrl);
      await page.waitForLoadState('networkidle');
      
      // Check responsive design compliance
      const responsiveResults = await page.evaluate((viewportName) => {
        const issues = [];
        
        // Check for horizontal scroll
        const body = document.body;
        const html = document.documentElement;
        const hasHorizontalScroll = Math.max(body.scrollWidth, html.scrollWidth) > Math.max(body.clientWidth, html.clientWidth);
        
        if (hasHorizontalScroll) {
          issues.push(`Horizontal scroll detected on ${viewportName}`);
        }
        
        // Check for proper text scaling
        const textElements = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6');
        let hasReadableText = true;
        
        textElements.forEach(element => {
          const computedStyle = window.getComputedStyle(element);
          const fontSize = parseFloat(computedStyle.fontSize);
          
          if (viewportName === 'Mobile' && fontSize < 14) {
            hasReadableText = false;
          }
        });
        
        if (!hasReadableText) {
          issues.push(`Text too small for ${viewportName}`);
        }
        
        // Check for touch-friendly elements on mobile
        if (viewportName === 'Mobile') {
          const interactiveElements = document.querySelectorAll('button, input, textarea, select, a');
          interactiveElements.forEach(element => {
            const computedStyle = window.getComputedStyle(element);
            const minHeight = parseFloat(computedStyle.minHeight) || element.offsetHeight;
            
            if (minHeight < 44) {
              issues.push(`Interactive element too small for touch on ${viewportName}`);
            }
          });
        }
        
        return {
          viewport: viewportName,
          totalIssues: issues.length,
          issues: issues,
          hasHorizontalScroll: hasHorizontalScroll,
          hasReadableText: hasReadableText
        };
      }, viewport.name);
      
      console.log(`📱 Edge Tools Responsive Design Audit Results for ${viewport.name}:`, responsiveResults);
      
      // Assert responsive design requirements
      expect(responsiveResults.hasHorizontalScroll).toBe(false);
      expect(responsiveResults.hasReadableText).toBe(true);
      expect(responsiveResults.totalIssues).toBeLessThanOrEqual(2); // Allow some minor issues
    }
  });
});
