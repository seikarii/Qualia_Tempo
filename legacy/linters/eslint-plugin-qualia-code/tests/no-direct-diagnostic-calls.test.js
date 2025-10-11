/**
 * @fileoverview Tests for no-direct-diagnostic-calls rule
 * @author Qualia Tempo Team
 * 
 * QUALIA.CODE v1.1 - Event-Driven Diagnostics Enforcement Tests
 */

'use strict';

const { RuleTester } = require('eslint');
const rule = require('../lib/rules/no-direct-diagnostic-calls');

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  }
});

ruleTester.run('no-direct-diagnostic-calls', rule, {
  valid: [
    // ✅ VALID: Not in services directory
    {
      code: `
        class MyComponent {
          constructor(private service: IMyService) {}
          getData() {
            return this.service.getStatistics();
          }
        }
      `,
      filename: 'src/components/MyComponent.tsx'
    },

    // ✅ VALID: Test file (allowed to call methods directly)
    {
      code: `
        @injectable()
        class MyService {
          constructor(@inject(TYPES.INotificationService) private notificationService: INotificationService) {}
          test() {
            return this.notificationService.getStatistics();
          }
        }
      `,
      filename: 'src/services/__tests__/MyService.test.ts'
    },

    // ✅ VALID: CompositionRoot (allowed)
    {
      code: `
        class CompositionRoot {
          setupServices() {
            const status = this.notificationService.getStatus();
          }
        }
      `,
      filename: 'src/services/CompositionRoot.ts'
    },

    // ✅ VALID: Calling non-diagnostic methods
    {
      code: `
        @injectable()
        class MyService {
          constructor(@inject(TYPES.INotificationService) private notificationService: INotificationService) {}
          execute() {
            this.notificationService.show('Hello');
            this.notificationService.hide();
            this.notificationService.clear();
          }
        }
      `,
      filename: 'src/services/MyService.ts'
    },

    // ✅ VALID: Calling methods on non-injected properties
    {
      code: `
        @injectable()
        class MyService {
          private localObject = { getStatus: () => 'ok' };
          execute() {
            return this.localObject.getStatus();
          }
        }
      `,
      filename: 'src/services/MyService.ts'
    },

    // ✅ VALID: Emitting ServiceStatusUpdateEvent (correct pattern)
    {
      code: `
        @injectable()
        class MyService {
          constructor(@inject(TYPES.IEventBus) private eventBus: IEventBus) {}
          emitStatus() {
            this.eventBus.emit({
              type: 'ServiceStatusUpdate',
              serviceName: 'MyService',
              status: { isRunning: true }
            });
          }
        }
      `,
      filename: 'src/services/MyService.ts'
    },

    // ✅ VALID: Class without @injectable decorator
    {
      code: `
        class MyClass {
          constructor(private service: IMyService) {}
          getData() {
            return this.service.getStatistics();
          }
        }
      `,
      filename: 'src/services/MyClass.ts'
    },

    // ✅ VALID: inversify.config.ts (allowed)
    {
      code: `
        @injectable()
        class MyService {
          constructor(@inject(TYPES.INotificationService) private notificationService: INotificationService) {}
          test() {
            return this.notificationService.getStatistics();
          }
        }
      `,
      filename: 'src/services/inversify.config.ts'
    }
  ],

  invalid: [
    // ❌ INVALID: Calling getStatistics on injected service
    {
      code: `
        @injectable()
        class MyService {
          constructor(@inject(TYPES.INotificationService) private notificationService: INotificationService) {}
          collectStats() {
            return this.notificationService.getStatistics();
          }
        }
      `,
      filename: 'src/services/MyService.ts',
      errors: [{ 
        messageId: 'directDiagnosticCall'
       }]
    },

    // ❌ INVALID: Calling getStatus on injected service
    {
      code: `
        @injectable()
        class DebugService {
          constructor(@inject(TYPES.IErrorReportingService) private errorReporting: IErrorReportingService) {}
          checkStatus() {
            const status = this.errorReporting.getStatus();
            return status;
          }
        }
      `,
      filename: 'src/services/DebugService.ts',
      errors: [{ 
        messageId: 'directDiagnosticCall'
       }]
    },

    // ❌ INVALID: Calling isEnabled on injected service
    {
      code: `
        @injectable()
        class GameController {
          constructor(@inject(TYPES.INotificationService) private notifications: INotificationService) {}
          init() {
            if (this.notifications.isEnabled()) {
              console.log('Enabled');
            }
          }
        }
      `,
      filename: 'src/services/GameController.ts',
      errors: [{ 
        messageId: 'directDiagnosticCall'
       }]
    },

    // ❌ INVALID: Multiple violations in same service
    {
      code: `
        @injectable()
        class ComplexService {
          constructor(
            @inject(TYPES.INotificationService) private notifications: INotificationService,
            @inject(TYPES.IErrorReportingService) private errorReporting: IErrorReportingService
          ) {}
          
          gatherDiagnostics() {
            const notifStats = this.notifications.getStatistics();
            const errorStatus = this.errorReporting.getStatus();
            return { notifStats, errorStatus };
          }
        }
      `,
      filename: 'src/services/ComplexService.ts',
      errors: [
        {
          messageId: 'directDiagnosticCall'
        }
      ]
    },

    // ❌ INVALID: Calling getConfig (forbidden method)
    {
      code: `
        @injectable()
        class MyService {
          constructor(@inject(TYPES.IConfigurationService) private config: IConfigurationService) {}
          inspect() {
            return this.config.getConfig();
          }
        }
      `,
      filename: 'src/services/MyService.ts',
      errors: [{ 
        messageId: 'directDiagnosticCall'
       }]
    },

    // ❌ INVALID: Real-world violation example (DebugOrchestratorService anti-pattern)
    {
      code: `
        @injectable()
        export class DebugOrchestratorService implements IDebugOrchestratorService {
          constructor(
            @inject(TYPES.INotificationService) private notificationService: INotificationService,
            @inject(TYPES.IErrorReportingService) private errorReportingService: IErrorReportingService
          ) {}

          public async getServiceDiagnostics(): Promise<ServiceDiagnosticData> {
            const notifStats = this.notificationService.getStatistics();
            const errorStats = this.errorReportingService.getStatistics();
            const errorStatus = this.errorReportingService.getStatus();
            
            return {
              services: [
                {
                  name: 'NotificationService',
                  isRunning: true,
                  stats: notifStats
                },
                {
                  name: 'ErrorReportingService',
                  isRunning: errorStatus.isEnabled,
                  stats: errorStats
                }
              ]
            };
          }
        }
      `,
      filename: 'src/services/DebugOrchestratorService.ts',
      errors: [
        {
          messageId: 'directDiagnosticCall'
        }
      ]
    }
  ]
});

console.log('✅ All tests for no-direct-diagnostic-calls rule passed!');
