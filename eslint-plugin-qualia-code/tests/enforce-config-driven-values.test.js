/**
 * @qualia-tempo/eslint-plugin-qualia-code
 * Tests for enforce-config-driven-values rule
 */

const rule = require('../lib/rules/enforce-config-driven-values');
const RuleTester = require('eslint').RuleTester;

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: false
    }
  }
});

ruleTester.run('enforce-config-driven-values', rule, {
  valid: [
    // Non-service files should not trigger warnings
    {
      code: 'const timeout = 5000;',
      filename: '/src/components/MyComponent.tsx'
    },
    // Small numbers are acceptable
    {
      code: 'const index = 1;',
      filename: '/src/services/MyService.ts'
    },
    // Configuration-driven values are good
    {
      code: 'const timeout = this.config.getTimeout();',
      filename: '/src/services/MyService.ts'
    }
  ],

  invalid: [
    // Magic numbers in services should warn
    {
      code: 'const timeout = 5000;',
      filename: '/src/services/MyService.ts',
      errors: [{
        message: 'QUALIA.CODE Suggestion: Consider externalizing this value to ConfigurationService for runtime configurability. (Section 1)',
        type: 'Literal'
      }]
    },
    // URLs should be externalized
    {
      code: 'const url = "api/v1/data";',
      filename: '/src/services/BackendService.ts',
      errors: [{
        message: 'QUALIA.CODE Suggestion: Consider externalizing this value to ConfigurationService for runtime configurability. (Section 1)',
        type: 'Literal'
      }]
    },
    // HTTP URLs should be externalized
    {
      code: 'const endpoint = "https://api.example.com";',
      filename: '/src/services/HttpService.ts',
      errors: [{
        message: 'QUALIA.CODE Suggestion: Consider externalizing this value to ConfigurationService for runtime configurability. (Section 1)',
        type: 'Literal'
      }]
    },
    // Large numbers should be configurable
    {
      code: 'const maxRetries = 1000;',
      filename: '/src/services/RetryService.ts',
      errors: [{
        message: 'QUALIA.CODE Suggestion: Consider externalizing this value to ConfigurationService for runtime configurability. (Section 1)',
        type: 'Literal'
      }]
    }
  ]
});