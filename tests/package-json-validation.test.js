// MD Reader Pro - Package.json Validation Tests
import { describe, test, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('package.json Validation', () => {
  let packageJson;

  beforeAll(() => {
    const pkgPath = path.join(__dirname, '..', 'package.json');
    packageJson = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  });

  describe('Basic Structure', () => {
    test('should have valid JSON structure', () => {
      expect(packageJson).toBeDefined();
      expect(typeof packageJson).toBe('object');
    });

    test('should have required fields', () => {
      expect(packageJson.name).toBe('md-reader-pro');
      expect(packageJson.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(packageJson.type).toBe('module');
    });

    test('should have repository info', () => {
      expect(packageJson.repository.type).toBe('git');
      expect(packageJson.repository.url).toContain('github.com');
    });
  });

  describe('express-rate-limit Dependency', () => {
    test('should include express-rate-limit', () => {
      expect(packageJson.dependencies['express-rate-limit']).toBeDefined();
    });

    test('should have correct version', () => {
      expect(packageJson.dependencies['express-rate-limit']).toBe('^8.1.0');
    });

    test('should be in dependencies, not devDependencies', () => {
      expect(packageJson.dependencies['express-rate-limit']).toBeDefined();
      expect(packageJson.devDependencies['express-rate-limit']).toBeUndefined();
    });

    test('should have compatible Express version', () => {
      const expressVer = packageJson.devDependencies['express'];
      expect(expressVer).toMatch(/[45]\./);
    });
  });

  describe('All Dependencies', () => {
    test('should have core dependencies', () => {
      expect(packageJson.dependencies['marked']).toBeDefined();
      expect(packageJson.dependencies['dompurify']).toBeDefined();
      expect(packageJson.dependencies['prismjs']).toBeDefined();
    });

    test('should use semantic versioning', () => {
      Object.values(packageJson.dependencies).forEach(ver => {
        expect(ver).toMatch(/^[\^~]?\d+\.\d+\.\d+$/);
      });
    });
  });

  describe('Scripts', () => {
    test('should have test:server script', () => {
      expect(packageJson.scripts['test:server']).toBeDefined();
      expect(packageJson.scripts['test:server']).toContain('test-server.cjs');
    });

    test('should have test scripts', () => {
      expect(packageJson.scripts['test']).toBeDefined();
      expect(packageJson.scripts['test:coverage']).toBeDefined();
    });
  });

  describe('Security', () => {
    test('should have rate limiting for DoS protection', () => {
      expect(packageJson.dependencies['express-rate-limit']).toBeDefined();
    });

    test('should have DOMPurify for XSS protection', () => {
      expect(packageJson.dependencies['dompurify']).toBeDefined();
    });
  });
});