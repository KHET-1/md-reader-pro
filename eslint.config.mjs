export default [
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        window: 'readonly',
        document: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        require: 'readonly',
        global: 'readonly',
        performance: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        localStorage: 'readonly',
        confirm: 'readonly',
        FileReader: 'readonly',
        File: 'readonly',
        Blob: 'readonly',
        URL: 'readonly',
        alert: 'readonly',
        Event: 'readonly',
        navigator: 'readonly'
      }
    },
    rules: {
      'no-console': 'off', // Demo code - console logs are intentional
      'prefer-const': 'error',
      'no-undef': 'error'
    },
    files: ['src/**/*.js']
  },
  {
    // Test files configuration with Jest globals
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Browser globals
        console: 'readonly',
        window: 'readonly',
        document: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        require: 'readonly',
        global: 'readonly',
        performance: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        FileReader: 'readonly',
        File: 'readonly',
        Blob: 'readonly',
        URL: 'readonly',
        Event: 'readonly',
        CustomEvent: 'readonly',
        KeyboardEvent: 'readonly',
        HTMLTextAreaElement: 'readonly',
        HTMLDivElement: 'readonly',
        navigator: 'readonly',
        location: 'readonly',
        // Node.js globals (for test setup files)
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        // Jest globals
        jest: 'readonly',
        describe: 'readonly',
        test: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly'
      }
    },
    rules: {
      'no-console': 'off',
      'prefer-const': 'error',
      'no-undef': 'error'
    },
    files: ['tests/**/*.js'],
    ignores: ['tests/e2e/**/*.js']
  },
  {
    // E2E test files configuration with Playwright, Node.js, and browser globals
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Node.js globals (for test runner environment)
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        require: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        // Browser globals (for page.evaluate() contexts)
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        performance: 'readonly',
        Event: 'readonly',
        CustomEvent: 'readonly',
        FileReader: 'readonly',
        File: 'readonly',
        Blob: 'readonly',
        URL: 'readonly'
      }
    },
    rules: {
      'no-console': 'off',
      'prefer-const': 'error',
      'no-undef': 'error'
    },
    files: ['tests/e2e/**/*.js']
  }
];