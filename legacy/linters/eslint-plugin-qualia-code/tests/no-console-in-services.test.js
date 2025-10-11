/**
 * @qualia-tempo/eslint-plugin-qualia-code
 * Tests for no-console-in-services rule
 */

const rule = require('../lib/rules/no-console-in-services');
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

ruleTester.run('no-console-in-services', rule, {
  valid: [
    // Non-service files should allow console
    {
      code: 'console.log("Debug message");',
      filename: '/src/components/MyComponent.tsx'
    },
    {
      code: 'console.error("Error message");',
      filename: '/src/utils/helper.ts'
    },
    // Service files using proper logger
    {
      code: 'this.logger.info("Service started");',
      filename: '/src/services/MyService.ts'
    }
  ],

  invalid: [
    // Service files using console - should error
    {
      code: 'console.log("Service debug");',
      filename: '/src/services/MyService.ts',
      errors: [{
        message: 'QUALIA.CODE Violation: console.* usage prohibited in services. Use injected QualiaLogger instead. (Section 5.3)',
        type: 'MemberExpression'
      }]
    },
    {
      code: 'console.error("Service error");',
      filename: '/src/services/ConfigurationService.ts',
      errors: [{
        message: 'QUALIA.CODE Violation: console.* usage prohibited in services. Use injected QualiaLogger instead. (Section 5.3)',
        type: 'MemberExpression'
      }]
    },
    {
      code: 'console.warn("Service warning");',
      filename: '/src/services/EventBus.ts',
      errors: [{
        message: 'QUALIA.CODE Violation: console.* usage prohibited in services. Use injected QualiaLogger instead. (Section 5.3)',
        type: 'MemberExpression'
      }]
    }
  ]
});