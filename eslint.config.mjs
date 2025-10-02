export default [
  {
    files: ['src/**/*.js', 'tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        window: 'readonly', 
        document: 'readonly',
        navigator: 'readonly',
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
    }
  }
];