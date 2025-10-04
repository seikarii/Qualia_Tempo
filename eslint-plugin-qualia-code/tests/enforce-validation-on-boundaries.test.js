/**
 * @fileoverview Tests for enforce-validation-on-boundaries rule
 */

'use strict';

const { RuleTester } = require('eslint');
const rule = require('../lib/rules/enforce-validation-on-boundaries');

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

ruleTester.run('enforce-validation-on-boundaries', rule, {
  valid: [
    // @OnEvent handler with validation when accessing event properties
    {
      code: `
        import { QualiaState } from '../types/contracts';
        
        class GameControllerService {
          @OnEvent('PlayerAction')
          @validateEventProperty()
          private handlePlayerAction(event: PlayerActionEvent): void {
            const action = event.action;
            const payload = event.payload;
          }
        }
      `,
      filename: 'src/services/GameControllerService.ts'
    },
    // @OnEvent handler that doesn't access event properties (no validation needed)
    {
      code: `
        class GameControllerService {
          @OnEvent('GameStarted')
          private handleGameStarted(event: GameStartedEvent): void {
            this.startGame();
          }
        }
      `,
      filename: 'src/services/GameControllerService.ts'
    },
    // Public method with DTO parameter and @validate decorator
    {
      code: `
        import { QualiaState } from '../types/contracts';
        
        class QualiaCalculatorService {
          @logMethod()
          @validate('QualiaState')
          public calculateMetrics(state: QualiaState): void {
            // calculation logic
          }
        }
      `,
      filename: 'src/services/QualiaCalculatorService.ts'
    },
    // Public method with non-DTO parameter (no validation required)
    {
      code: `
        class UtilityService {
          @logMethod()
          public formatString(input: string): string {
            return input.toUpperCase();
          }
        }
      `,
      filename: 'src/services/UtilityService.ts'
    },
    // Private method (exempt from validation requirement)
    {
      code: `
        import { QualiaState } from '../types/contracts';
        
        class QualiaCalculatorService {
          private _processState(state: QualiaState): void {
            // internal logic
          }
        }
      `,
      filename: 'src/services/QualiaCalculatorService.ts'
    },
    // Non-service file (exempt from rule)
    {
      code: `
        class MyComponent {
          handleClick(event: ClickEvent): void {
            const data = event.data;
          }
        }
      `,
      filename: 'src/components/MyComponent.tsx'
    },
    // Method with DTO-like name but not from shared_contracts
    {
      code: `
        interface LocalState {
          value: number;
        }
        
        class LocalService {
          @logMethod()
          public processLocal(state: LocalState): void {
            // logic
          }
        }
      `,
      filename: 'src/services/LocalService.ts'
    },
    // Event handler with destructuring and validation
    {
      code: `
        class EventHandlerService {
          @OnEvent('DataReceived')
          @validateEventProperty()
          private handleData(event: DataReceivedEvent): void {
            const { payload, timestamp } = event;
            this.process(payload);
          }
        }
      `,
      filename: 'src/services/EventHandlerService.ts'
    }
  ],

  invalid: [
    // @OnEvent handler accessing event properties without validation
    {
      code: `
        class GameControllerService {
          @OnEvent('PlayerAction')
          private handlePlayerAction(event: PlayerActionEvent): void {
            const action = event.action;
            this.processAction(action);
          }
        }
      `,
      filename: 'src/services/GameControllerService.ts',
      errors: [{
        messageId: 'missingEventValidation',
        data: { eventName: 'PlayerAction' }
      }]
    },
    // @OnEvent handler with event property destructuring without validation
    {
      code: `
        class EventService {
          @OnEvent('DataUpdate')
          private handleUpdate(event: DataUpdateEvent): void {
            const { payload, metadata } = event;
            this.update(payload);
          }
        }
      `,
      filename: 'src/services/EventService.ts',
      errors: [{
        messageId: 'missingEventValidation',
        data: { eventName: 'DataUpdate' }
      }]
    },
    // Public method with shared_contracts DTO without @validate
    {
      code: `
        import { QualiaState } from '../types/contracts';
        
        class QualiaCalculatorService {
          @logMethod()
          public calculateMetrics(state: QualiaState): void {
            return state.value * 2;
          }
        }
      `,
      filename: 'src/services/QualiaCalculatorService.ts',
      errors: [{
        messageId: 'missingDtoValidation',
        data: { 
          methodName: 'calculateMetrics',
          argumentType: 'QualiaState'
        }
      }]
    },
    // Multiple issues: event access and DTO without validation
    {
      code: `
        import { CombatData } from '../types/contracts';
        
        class CombatService {
          @OnEvent('CombatStarted')
          private handleCombat(event: CombatEvent): void {
            const data = event.data;
            this.processCombat(data);
          }
          
          @logMethod()
          public updateCombat(combat: CombatData): void {
            this.state = combat;
          }
        }
      `,
      filename: 'src/services/CombatService.ts',
      errors: [
        {
          messageId: 'missingEventValidation',
          data: { eventName: 'CombatStarted' }
        },
        {
          messageId: 'missingDtoValidation',
          data: { 
            methodName: 'updateCombat',
            argumentType: 'CombatData'
          }
        }
      ]
    },
    // Event handler accessing nested event properties
    {
      code: `
        class StateService {
          @OnEvent('StateChanged')
          private handleStateChange(event: StateChangedEvent): void {
            console.log(event.data.state.value);
          }
        }
      `,
      filename: 'src/services/StateService.ts',
      errors: [{
        messageId: 'missingEventValidation',
        data: { eventName: 'StateChanged' }
      }]
    },
    // Public method with Response type from contracts
    {
      code: `
        import { ApiResponse } from 'shared_contracts';
        
        class ApiService {
          @logMethod()
          public handleResponse(response: ApiResponse): void {
            this.processData(response);
          }
        }
      `,
      filename: 'src/services/ApiService.ts',
      errors: [{
        messageId: 'missingDtoValidation',
        data: { 
          methodName: 'handleResponse',
          argumentType: 'ApiResponse'
        }
      }]
    },
    // Event handler using bracket notation for event access
    {
      code: `
        class EventService {
          @OnEvent('CustomEvent')
          private handleCustom(event: CustomEvent): void {
            const value = event['customProperty'];
            this.process(value);
          }
        }
      `,
      filename: 'src/services/EventService.ts',
      errors: [{
        messageId: 'missingEventValidation',
        data: { eventName: 'CustomEvent' }
      }]
    }
  ]
});
