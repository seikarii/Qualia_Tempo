/**
 * @fileoverview Tests for enforce-deprecated-on-comment rule
 */

'use strict';

const { RuleTester } = require('eslint');
const rule = require('../lib/rules/enforce-deprecated-on-comment');

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      experimentalDecorators: true
    }
  }
});

ruleTester.run('enforce-deprecated-on-comment', rule, {
  valid: [
    // Method with @deprecated decorator
    {
      code: `
        class ApiService {
          // DEPRECATED: Use newMethod instead
          @deprecated('Use newMethod instead', 'v2.0.0')
          oldMethod() {}
        }
      `,
      filename: 'src/services/ApiService.ts'
    },
    // Method without deprecation comment
    {
      code: `
        class DataService {
          getData() {}
        }
      `,
      filename: 'src/services/DataService.ts'
    },
    // Non-service file
    {
      code: `
        class Component {
          // DEPRECATED
          oldRender() {}
        }
      `,
      filename: 'Component.tsx'
    }
  ],

  invalid: [
    {
      code: `
        class ApiService {
          // DEPRECATED: Use newMethod instead
          oldMethod() {}
        }
      `,
      filename: 'src/services/ApiService.ts',
      errors: [{ 
        messageId: 'useDeprecatedDecorator'
       }]
    },
    {
      code: `
        class DataService {
          // TO BE REMOVED in v2.0
          legacyFetch() {}
        }
      `,
      filename: 'src/services/DataService.ts',
      errors: [{ 
        messageId: 'useDeprecatedDecorator'
       }]
    },
    {
      code: `
        class CacheService {
          // OBSOLETE: Not used anymore
          clearOldCache() {}
        }
      `,
      filename: 'src/services/CacheService.ts',
      errors: [{ 
        messageId: 'useDeprecatedDecorator'
       }]
    },
    {
      code: `
        class LegacyService {
          // DO NOT USE: Will be removed soon
          dangerousOperation() {}
        }
      `,
      filename: 'src/services/LegacyService.ts',
      errors: [{ 
        messageId: 'useDeprecatedDecorator'
       }]
    },
    {
      code: `
        class OldService {
          /**
           * @deprecated This method is legacy code
           */
          processLegacy() {}
        }
      `,
      filename: 'src/services/OldService.ts',
      errors: [{ 
        messageId: 'useDeprecatedDecorator'
       }]
    },
    {
      code: `
        class MigrationService {
          // Will be removed in next major version
          migrateOld() {}
        }
      `,
      filename: 'src/services/MigrationService.ts',
      errors: [{ 
        messageId: 'useDeprecatedDecorator'
       }]
    }
  ]
});
