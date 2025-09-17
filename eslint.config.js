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
        setTimeout: 'readonly'
      }
    },
    rules: {
      'no-console': 'off', // Demo code - console logs are intentional
      'prefer-const': 'error',
      'no-undef': 'error'
    },
    files: ['src/**/*.js', 'tests/**/*.js']
  }
];