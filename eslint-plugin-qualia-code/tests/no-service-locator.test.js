/**
 * @fileoverview Tests for no-service-locator rule
 */

'use strict';

const { RuleTester } = require('eslint');
const rule = require('../lib/rules/no-service-locator');

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  }
});

ruleTester.run('no-service-locator', rule, {
  valid: [
    // Allowed in inversify.config.ts
    {
      code: 'const service = container.get<IMyService>(TYPES.IMyService);',
      filename: 'src/services/inversify.config.ts'
    },
    {
      code: 'container.get(TYPES.ILogger)',
      filename: '/path/to/inversify.config.ts'
    },
    // Allowed in ApplicationCompositionRoot.ts
    {
      code: 'const eventBus = container.get<IEventBus>(TYPES.IEventBus);',
      filename: 'ApplicationCompositionRoot.ts'
    },
    {
      code: 'return container.get(TYPES.IConfigService);',
      filename: 'src/services/ApplicationCompositionRoot.ts'
    },
    // Allowed in test files (.test.ts)
    {
      code: 'const service = container.get<IMyService>(TYPES.IMyService);',
      filename: 'MyService.test.ts'
    },
    {
      code: 'container.get(TYPES.ILogger)',
      filename: 'src/services/__tests__/GameController.test.ts'
    },
    // Allowed in test files (.spec.ts)
    {
      code: 'const mockService = container.get(TYPES.IMockService);',
      filename: 'integration.spec.ts'
    },
    // Allowed in __tests__ directory
    {
      code: 'container.get<IEventBus>(TYPES.IEventBus)',
      filename: 'src/__tests__/integration-test.ts'
    },
    // Allowed in /tests/ directory
    {
      code: 'const service = container.get(TYPES.IService);',
      filename: 'tests/unit/service-test.ts'
    },
    // Allowed in hooks.ts (specific exception)
    {
      code: 'return container.get<T>(identifier);',
      filename: 'src/services/hooks.ts'
    },
    {
      code: 'const service = container.get(TYPES.IMyService);',
      filename: '/path/to/hooks.ts'
    },
    // Constructor injection (correct pattern)
    {
      code: `
        @injectable()
        export class MyService {
          constructor(@inject(TYPES.ILogger) private logger: ILogger) {}
        }
      `,
      filename: 'MyService.ts'
    }
  ],

  invalid: [
    // Forbidden in regular service files
    {
      code: 'const logger = container.get<ILogger>(TYPES.ILogger);',
      filename: 'MyService.ts',
      errors: [{
        messageId: 'noServiceLocator'
      }]
    },
    {
      code: 'const eventBus = container.get(TYPES.IEventBus);',
      filename: 'src/services/GameControllerService.ts',
      errors: [{
        messageId: 'noServiceLocator'
      }]
    },
    // Forbidden in React components
    {
      code: 'const service = container.get<IMyService>(TYPES.IMyService);',
      filename: 'MyComponent.tsx',
      errors: [{
        messageId: 'noServiceLocator'
      }]
    },
    {
      code: 'container.get(TYPES.IQualiaService)',
      filename: 'src/components/Game.tsx',
      errors: [{
        messageId: 'noServiceLocator'
      }]
    },
    // Forbidden in utility files
    {
      code: 'const config = container.get(TYPES.IConfigService);',
      filename: 'src/utils/helpers.ts',
      errors: [{
        messageId: 'noServiceLocator'
      }]
    },
    // Multiple violations
    {
      code: `
        const logger = container.get(TYPES.ILogger);
        const eventBus = container.get(TYPES.IEventBus);
      `,
      filename: 'BadService.ts',
      errors: [
        { messageId: 'noServiceLocator' },
        { messageId: 'noServiceLocator' }
      ]
    }
  ]
});
