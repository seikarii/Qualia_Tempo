/**
 * Tests for enforce-event-interfaces-location rule
 * @author Qualia Tempo Team
 */

'use strict';

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const rule = require('../lib/rules/enforce-event-interfaces-location');
const RuleTester = require('eslint').RuleTester;

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

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

ruleTester.run('enforce-event-interfaces-location', rule, {
  valid: [
    // Valid: Event interface in events.contracts.ts
    {
      code: `
        export interface PlayerActionEvent extends BaseEvent {
          type: 'PLAYER_ACTION';
          action: PlayerAction;
        }
      `,
      filename: 'src/services/contracts/events.contracts.ts'
    },
    // Valid: Non-event interface anywhere
    {
      code: `
        export interface IServiceConfig {
          apiUrl: string;
          timeout: number;
        }
      `,
      filename: 'src/services/contracts/IService.contracts.ts'
    }
  ],

  invalid: [
    // Invalid: Event interface in service file
    {
      code: `
        export interface PlayerActionEvent extends BaseEvent {
          type: 'PLAYER_ACTION';
          action: PlayerAction;
        }
      `,
      filename: 'src/services/PlayerService.ts',
      errors: [{
        message: 'QUALIA.CODE Violation: Event interfaces MUST be defined in events.contracts.ts only. Move interface PlayerActionEvent to events.contracts.ts to maintain single source of truth.',
        type: 'Identifier'
      }]
    },
    // Invalid: Event interface in component file
    {
      code: `
        export interface QualiaStateUpdatedEvent extends BaseEvent {
          type: 'QUALIA_STATE_UPDATED';
          qualiaState: QualiaState;
        }
      `,
      filename: 'src/components/GameView.tsx',
      errors: [{
        message: 'QUALIA.CODE Violation: Event interfaces MUST be defined in events.contracts.ts only. Move interface QualiaStateUpdatedEvent to events.contracts.ts to maintain single source of truth.',
        type: 'Identifier'
      }]
    }
  ]
});

console.log('✅ All enforce-event-interfaces-location tests passed!');
