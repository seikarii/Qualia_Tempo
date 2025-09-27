/**
 * @qualia-tempo/eslint-plugin-qualia-code
 * Tests for no-direct-service-import-in-components rule
 */

const rule = require('../lib/rules/no-direct-service-import-in-components');
const RuleTester = require('eslint').RuleTester;

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  }
});

ruleTester.run('no-direct-service-import-in-components', rule, {
  valid: [
    // Non-component files can import services
    {
      code: 'import { MyService } from "../services/MyService";',
      filename: '/src/utils/helper.ts'
    },
    // Components can import interfaces and hooks
    {
      code: 'import { IMyService } from "../services/interfaces/IMyService";',
      filename: '/src/components/MyComponent.tsx'
    },
    {
      code: 'import { useService } from "../services/hooks";',
      filename: '/src/components/MyComponent.tsx'
    },
    // Components using proper hook pattern
    {
      code: 'import { useService } from "../services/hooks"; import { TYPES } from "../services/inversify.types";',
      filename: '/src/components/MyComponent.tsx'
    }
  ],

  invalid: [
    // Components importing concrete services - should error
    {
      code: 'import { MyService } from "../services/MyService";',
      filename: '/src/components/MyComponent.tsx',
      errors: [{
        message: 'QUALIA.CODE Violation: Direct service imports prohibited in components. Use useService() hook instead. (Section 2.2)',
        type: 'ImportDeclaration'
      }]
    },
    {
      code: 'import { ConfigurationService } from "../services/ConfigurationService";',
      filename: '/src/components/GameHUD.tsx',
      errors: [{
        message: 'QUALIA.CODE Violation: Direct service imports prohibited in components. Use useService() hook instead. (Section 2.2)',
        type: 'ImportDeclaration'
      }]
    },
    {
      code: 'import { EventBus } from "../services/EventBus";',
      filename: '/src/components/DebugPanel.tsx',
      errors: [{
        message: 'QUALIA.CODE Violation: Direct service imports prohibited in components. Use useService() hook instead. (Section 2.2)',
        type: 'ImportDeclaration'
      }]
    }
  ]
});