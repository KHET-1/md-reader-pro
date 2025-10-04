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
        FileReader: 'readonly',
        File: 'readonly',
        Blob: 'readonly',
        URL: 'readonly',
        alert: 'readonly',
        Event: 'readonly'
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
    files: ['tests/**/*.js']
  }
];