/**
 * @fileoverview Tests for enforce-isolated-test-container rule
 * 
 * This test suite validates the enforcement of the Isolated Container Pattern
 * as mandated by QUALIA.CODE Section 10.3.
 */

'use strict';

const { RuleTester } = require('eslint');
const rule = require('../lib/rules/enforce-isolated-test-container');

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  }
});

ruleTester.run('enforce-isolated-test-container', rule, {
  valid: [
    // VALID: Proper use of createTestContainer in test files
    {
      code: `
        import { createTestContainer } from '../testing/test-container-factory';
        import { TYPES } from '../services/inversify.types';
        
        describe('MyService', () => {
          let container;
          let service;
          
          beforeEach(() => {
            container = createTestContainer();
            service = container.get(TYPES.IMyService);
          });
        });
      `,
      filename: 'MyService.test.ts'
    },
    
    // VALID: Non-service instantiation in test files
    {
      code: 'const date = new Date(); const array = new Array();',
      filename: 'Component.test.ts'
    },
    
    {
      code: 'const error = new Error("test error");',
      filename: 'ErrorHandler.spec.ts'
    },
    
    // VALID: Test files using mock objects (not services)
    {
      code: `
        const mockLogger = {
          info: jest.fn(),
          error: jest.fn()
        };
      `,
      filename: '__tests__/Logger.test.ts'
    },
    
    // VALID: Non-test files can instantiate services (handled by other rules)
    {
      code: 'const service = new MyService();',
      filename: 'MyComponent.tsx'
    },
    
    {
      code: 'const calculator = new QualiaStateCalculatorService();',
      filename: 'src/services/CompositionRoot.ts'
    },
    
    // VALID: Non-test files can import main container (handled by other rules)
    {
      code: `
        import { container } from './inversify.config';
        const service = container.get(TYPES.IMyService);
      `,
      filename: 'ApplicationCompositionRoot.ts'
    },
    
    // VALID: Test files with proper patterns
    {
      code: `
        import { createTestContainer } from '../../testing/test-container-factory';
        
        it('should work', () => {
          const testContainer = createTestContainer();
          const service = testContainer.get(TYPES.INotificationService);
          expect(service).toBeDefined();
        });
      `,
      filename: 'tests/services/NotificationService.spec.ts'
    }
  ],

  invalid: [
    // INVALID: Direct service instantiation in test file
    {
      code: `
        import { MyService } from '../services/MyService';
        const service = new MyService();
      `,
      filename: 'MyService.test.ts',
      errors: [{ 
        messageId: 'noNewService'
       }]
    },
    
    // INVALID: Direct instantiation in describe block
    {
      code: `
        describe('QualiaStateCalculatorService', () => {
          const calculator = new QualiaStateCalculatorService();
        });
      `,
      filename: 'QualiaCalculator.spec.ts',
      errors: [{ 
        messageId: 'noNewService'
       }]
    },
    
    // INVALID: Multiple service instantiations
    {
      code: `
        const logger = new LoggerService();
        const eventBus = new EventBusService();
      `,
      filename: '__tests__/Integration.test.ts',
      errors: [
        {
          messageId: 'noNewService'
        }
      ]
    },
    
    // INVALID: Import and use main container
    {
      code: `
        import { container } from '../services/inversify.config';
        const service = container.get(TYPES.IMyService);
      `,
      filename: 'MyService.test.ts',
      errors: [
        { messageId: 'noMainContainerImport' },
        { messageId: 'noMainContainer' }
      ]
    },
    
    // INVALID: Import container with alias
    {
      code: `
        import { container as mainContainer } from '../services/inversify.config';
        const service = mainContainer.get(TYPES.IMyService);
      `,
      filename: 'Service.spec.ts',
      errors: [
        { messageId: 'noMainContainerImport' },
        { messageId: 'noMainContainer' }
      ]
    },
    
    // INVALID: Member expression service instantiation
    {
      code: `
        import * as Services from '../services';
        const myService = new Services.MyService();
      `,
      filename: 'Component.test.tsx',
      errors: [{ 
        messageId: 'noNewService'
       }]
    },
    
    // INVALID: In beforeEach hook
    {
      code: `
        describe('AudioService', () => {
          let service;
          
          beforeEach(() => {
            service = new AudioService();
          });
        });
      `,
      filename: 'tests/AudioService.test.ts',
      errors: [{ 
        messageId: 'noNewService'
       }]
    },
    
    // INVALID: Mixed violations
    {
      code: `
        import { container } from '../services/inversify.config';
        
        describe('BackendSync', () => {
          it('should sync', () => {
            const sync = new BackendSyncService();
            const logger = container.get(TYPES.ILogger);
          });
        });
      `,
      filename: 'BackendSync.spec.ts',
      errors: [
        { messageId: 'noMainContainerImport' },
        { messageId: 'noNewService', data: { serviceName: 'BackendSyncService' } },
        { messageId: 'noMainContainer' }
      ]
    },
    
    // INVALID: In different test file patterns
    {
      code: 'const service = new TimerService();',
      filename: 'src/services/__tests__/Timer.test.ts',
      errors: [{  messageId: 'noNewService'  }]
    },
    
    {
      code: 'const http = new HttpService();',
      filename: 'integration.spec.tsx',
      errors: [{  messageId: 'noNewService'  }]
    }
  ]
});

console.log('✅ All tests for enforce-isolated-test-container passed!');
