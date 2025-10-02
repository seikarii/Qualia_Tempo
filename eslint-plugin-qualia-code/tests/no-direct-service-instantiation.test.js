/**
 * @fileoverview Tests for no-direct-service-instantiation rule
 */

'use strict';

const { RuleTester } = require('eslint');
const rule = require('../lib/rules/no-direct-service-instantiation');

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  }
});

ruleTester.run('no-direct-service-instantiation', rule, {
  valid: [
    // Allowed in CompositionRoot
    {
      code: 'const service = new QualiaService();',
      filename: 'CompositionRoot.ts'
    },
    {
      code: 'const service = new BackendSyncService();',
      filename: '/path/to/CompositionRoot.tsx'
    },
    // Non-service instantiation
    {
      code: 'const date = new Date();',
      filename: 'Component.tsx'
    },
    {
      code: 'const array = new Array();',
      filename: 'MyComponent.tsx'
    },
    // Non-TypeScript files
    {
      code: 'const service = new MyService();',
      filename: 'script.js'
    },
    // CRITICAL: Test files are allowed to instantiate services
    {
      code: 'const service = new QualiaService();',
      filename: 'MyService.test.ts'
    },
    {
      code: 'const service = new BackendSyncService();',
      filename: 'integration.spec.ts'
    },
    {
      code: 'const service = new GameControllerService();',
      filename: '__tests__/GameController.test.tsx'
    },
    {
      code: 'const service = new ViewLogicService();',
      filename: 'src/__tests__/ViewLogic.spec.ts'
    },
    {
      code: 'const service = new AudioService();',
      filename: 'tests/AudioService.test.ts'
    },
    {
      code: 'const service = new TimerService();',
      filename: 'src/testing/mocks/MockTimerService.ts'
    },
    // ApplicationCompositionRoot exemption
    {
      code: 'const service = new QualiaService();',
      filename: 'ApplicationCompositionRoot.ts'
    },
    {
      code: 'const service = new EventBus();',
      filename: 'src/services/ApplicationCompositionRoot.ts'
    },
    // Test container factory exemption
    {
      code: 'const service = new MockEventBus();',
      filename: 'test-container-factory.ts'
    }
  ],

  invalid: [
    {
      code: 'const service = new QualiaService();',
      filename: 'MyComponent.tsx',
      errors: [{
        messageId: 'noDirectInstantiation'
      }]
    },
    {
      code: 'const syncService = new BackendSyncService();',
      filename: 'GameComponent.ts',
      errors: [{
        messageId: 'noDirectInstantiation'
      }]
    },
    {
      code: 'const calculator = new QualiaStateCalculatorService();',
      filename: 'src/components/Game.tsx',
      errors: [{
        messageId: 'noDirectInstantiation'
      }]
    },
    {
      code: 'const service = new MyModule.GameService();',
      filename: 'Component.tsx',
      errors: [{
        messageId: 'noDirectInstantiation'
      }]
    },
    {
      code: 'const eventBus = new EventBusService();',
      filename: 'src/services/GameControllerService.ts',
      errors: [{
        messageId: 'noDirectInstantiation'
      }]
    },
    {
      code: 'const logger = new LoggerService();',
      filename: 'App.tsx',
      errors: [{
        messageId: 'noDirectInstantiation'
      }]
    }
  ]
});

console.log('✅ All no-direct-service-instantiation tests passed!');

