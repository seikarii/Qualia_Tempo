/**
 * @fileoverview Tests for enforce-validate-event-property-on-emit rule
 */

'use strict';

const { RuleTester } = require('eslint');
const rule = require('../lib/rules/enforce-validate-event-property-on-emit');

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

ruleTester.run('enforce-validate-event-property-on-emit', rule, {
  valid: [
    // Correctly decorated method with complex event
    {
      code: `
        class GameService {
          @validateEventProperty()
          notifyStateChange(state: GameState) {
            this.eventBus.emit('StateChanged', {
              type: 'StateChanged',
              timestamp: Date.now(),
              state: state,
              metadata: {}
            });
          }
        }
      `,
      filename: 'src/services/GameService.ts'
    },
    // Simple event (2 properties or less) doesn't need validation
    {
      code: `
        class EventService {
          emitSimple() {
            this.eventBus.emit('Simple', {
              type: 'Simple',
              timestamp: Date.now()
            });
          }
        }
      `,
      filename: 'src/services/EventService.ts'
    },
    // No event emission
    {
      code: `
        class CalculatorService {
          calculate() {
            return 42;
          }
        }
      `,
      filename: 'src/services/CalculatorService.ts'
    },
    // Private method
    {
      code: `
        class GameService {
          private notifyStateChange() {
            this.eventBus.emit('StateChanged', { type: 'test', data: {}, meta: {} });
          }
        }
      `,
      filename: 'src/services/GameService.ts'
    },
    // Non-service file
    {
      code: `
        class Component {
          notifyChange() {
            eventBus.emit('Change', { type: 'test', data: {}, meta: {} });
          }
        }
      `,
      filename: 'Component.tsx'
    }
  ],

  invalid: [
    {
      code: `
        class GameService {
          notifyStateChange(state: GameState) {
            this.eventBus.emit('StateChanged', {
              type: 'StateChanged',
              timestamp: Date.now(),
              state: state,
              metadata: {}
            });
          }
        }
      `,
      filename: 'src/services/GameService.ts',
      errors: [{ 
        messageId: 'missingValidateEventProperty'
       }]
    },
    {
      code: `
        class QualiaService {
          publishUpdate() {
            eventBus.emit('QualiaUpdated', {
              type: 'QualiaUpdated',
              qualia: this.state,
              timestamp: Date.now(),
              source: 'QualiaService'
            });
          }
        }
      `,
      filename: 'src/services/QualiaService.ts',
      errors: [{ 
        messageId: 'missingValidateEventProperty'
       }]
    },
    {
      code: `
        class EventBroadcaster {
          broadcast() {
            this.eventBus.emit('Broadcast', {
              type: 'Broadcast',
              data: {},
              meta: {},
              extras: []
            });
          }
        }
      `,
      filename: 'src/services/EventBroadcaster.ts',
      errors: [{ 
        messageId: 'missingValidateEventProperty'
       }]
    }
  ]
});
