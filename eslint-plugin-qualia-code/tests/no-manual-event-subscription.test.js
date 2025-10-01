/**
 * @qualia-tempo/eslint-plugin-qualia-code
 * Tests for no-manual-event-subscription rule
 */

const rule = require('../lib/rules/no-manual-event-subscription');
const { RuleTester } = require('eslint');

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

ruleTester.run('no-manual-event-subscription', rule, {
  valid: [
    // Non-service files should allow eventBus.subscribe
    {
      code: 'eventBus.subscribe("event", handler);',
      filename: '/src/components/MyComponent.tsx'
    },
    {
      code: 'this.eventBus.subscribe("event", handler);',
      filename: '/src/utils/helper.ts'
    },
    // Service files not using subscribe
    {
      code: 'this.eventBus.emit("event", data);',
      filename: '/src/services/MyService.ts'
    },
    // Service files using @OnEvent decorator (valid usage)
    {
      code: `
        class MyService {
          @OnEvent("PlayerAction")
          public handlePlayerAction(event: PlayerActionEvent): void {
            // Handle event
          }
        }
      `,
      filename: '/src/services/MyService.ts'
    }
  ],

  invalid: [
    // Service files using eventBus.subscribe - should error
    {
      code: 'eventBus.subscribe("PlayerAction", this.handlePlayerAction);',
      filename: '/src/services/MyService.ts',
      errors: [{
        message: "El uso directo de 'eventBus.subscribe()' está prohibido. Utilice el decorador '@OnEvent' en un método y asegúrese de que el servicio implemente 'IBaseService' para una gestión de ciclo de vida automática y segura. (QUALIA.CODE 9.1)",
        type: 'CallExpression'
      }]
    },
    {
      code: 'this.eventBus.subscribe("QualiaStateUpdated", this.onQualiaStateUpdated);',
      filename: '/src/services/BackendSyncService.ts',
      errors: [{
        message: "El uso directo de 'eventBus.subscribe()' está prohibido. Utilice el decorador '@OnEvent' en un método y asegúrese de que el servicio implemente 'IBaseService' para una gestión de ciclo de vida automática y segura. (QUALIA.CODE 9.1)",
        type: 'CallExpression'
      }]
    },
    {
      code: `
        class GameControllerService {
          constructor() {
            this.eventBus.subscribe("GameStateChanged", this.handleGameState);
          }
        }
      `,
      filename: '/src/services/GameControllerService.ts',
      errors: [{
        message: "El uso directo de 'eventBus.subscribe()' está prohibido. Utilice el decorador '@OnEvent' en un método y asegúrese de que el servicio implemente 'IBaseService' para una gestión de ciclo de vida automática y segura. (QUALIA.CODE 9.1)",
        type: 'CallExpression'
      }]
    }
  ]
});