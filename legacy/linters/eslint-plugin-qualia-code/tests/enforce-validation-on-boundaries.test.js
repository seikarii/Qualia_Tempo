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
    },
    // CONTEXTUAL INTELLIGENCE TEST: Internal EventBus event (TypeScript typed, no validation needed)
    {
      code: `
        class GameStateStoreService {
          @OnEvent('QualiaStateUpdated')
          private handleQualiaUpdate(event: QualiaStateUpdatedEvent): void {
            const state = event.qualiaState;
            this.store.setState({ qualiaState: state });
          }
        }
      `,
      filename: 'src/services/GameStateStoreService.ts'
    },
    // CONTEXTUAL INTELLIGENCE TEST: Internal EventBus event with multiple property access
    {
      code: `
        class NotificationService {
          @OnEvent('GameStateChanged')
          private handleStateChange(event: GameStateChangedEvent): void {
            const { newState, oldState, timestamp } = event;
            this.notify('State changed from ' + oldState + ' to ' + newState);
          }
        }
      `,
      filename: 'src/services/NotificationService.ts'
    },
    // CONTEXTUAL INTELLIGENCE TEST: Constructor with config validation (exempt)
    {
      code: `
        import { AudioServiceConfig } from './contracts/IAudioService.contracts';
        
        class AudioService {
          constructor(
            @inject(TYPES.AudioServiceConfig) config: AudioServiceConfig
          ) {
            this.config = config;
          }
        }
      `,
      filename: 'src/services/AudioService.ts'
    },
    // CONTEXTUAL INTELLIGENCE TEST: Method with validation exemption comment
    {
      code: `
        class QualiaCalculatorService {
          /**
           * @validation-exempt - State is pre-validated by GameStateStore
           */
          @logMethod()
          public calculateMetrics(state: QualiaState): void {
            return state.value * 2;
          }
        }
      `,
      filename: 'src/services/QualiaCalculatorService.ts'
    },
    // CONTEXTUAL INTELLIGENCE TEST: Internal event with property destructuring (no validation needed)
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
      filename: 'src/services/EventService.ts'
    },
    // CONTEXTUAL INTELLIGENCE TEST: Internal event with nested property access (no validation needed)
    {
      code: `
        class StateService {
          @OnEvent('StateChanged')
          private handleStateChange(event: StateChangedEvent): void {
            console.log(event.data.state.value);
          }
        }
      `,
      filename: 'src/services/StateService.ts'
    },
    // CONTEXTUAL INTELLIGENCE TEST: Internal event with bracket notation (no validation needed)
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
      filename: 'src/services/EventService.ts'
    }
  ],

  invalid: [
    // CONTEXTUAL INTELLIGENCE TEST: External event source (WebSocket) requires validation
    {
      code: `
        class WebSocketService {
          @OnEvent('message')
          private handleMessage(event: MessageEvent): void {
            const ws = new WebSocket('ws://localhost:8080');
            ws.on('message', (data) => {
              const message = event.data;
              this.processMessage(message);
            });
          }
        }
      `,
      filename: 'src/services/WebSocketService.ts',
      errors: [{ 
        messageId: 'missingEventValidation'
       }]
    },
    // CONTEXTUAL INTELLIGENCE TEST: API response requires validation
    {
      code: `
        class ApiClientService {
          @OnEvent('apiResponse')
          private handleResponse(event: ApiResponseEvent): void {
            fetch('/api/data').then(response => {
              const data = event.data;
              this.process(data);
            });
          }
        }
      `,
      filename: 'src/services/ApiClientService.ts',
      errors: [{ 
        messageId: 'missingEventValidation'
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
        messageId: 'missingDtoValidation'
       }]
    },
    // DTO without validation (CombatStarted is internal event, no validation needed)
    {
      code: `
        import { CombatData } from '../types/contracts';
        
        class CombatService {
          @logMethod()
          public updateCombat(combat: CombatData): void {
            this.state = combat;
          }
        }
      `,
      filename: 'src/services/CombatService.ts',
      errors: [{ 
          messageId: 'missingDtoValidation'
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
        messageId: 'missingDtoValidation'
       }]
    }
  ]
});
