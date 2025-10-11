/**
 * @fileoverview Tests for enforce-onevent-base-service rule
 * @author Qualia Tempo Team
 */

'use strict';

const { RuleTester } = require('eslint');
const rule = require('../lib/rules/enforce-onevent-base-service');

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

ruleTester.run('enforce-onevent-base-service', rule, {
  valid: [
    // Correct implementation with IBaseService
    {
      code: `
        import { OnEvent } from '../decorators';
        import { IBaseService } from '../interfaces/IBaseService';

        @injectable()
        export class GameControllerService implements IGameControllerService, IBaseService {
          private _eventListeners: string[] = [];

          @OnEvent('PlayerAction')
          private handlePlayerAction(event: PlayerActionEvent): void {
            // Handle event
          }

          public initialize(): void {
            // Setup subscriptions
          }

          public cleanup(): void {
            // Cleanup subscriptions
          }
        }
      `,
      filename: 'src/services/GameControllerService.ts'
    },

    // Service without @OnEvent (no IBaseService required)
    {
      code: `
        @injectable()
        export class ConfigurationService implements IConfigurationService {
          public getConfig(key: string): any {
            return this.config[key];
          }
        }
      `,
      filename: 'src/services/ConfigurationService.ts'
    },

    // Multiple @OnEvent decorators with proper implementation
    {
      code: `
        import { OnEvent } from '../decorators';
        import { IBaseService } from '../interfaces/IBaseService';

        @injectable()
        export class QualiaStateCalculatorService implements IQualiaStateCalculatorService, IBaseService {
          @OnEvent('PlayerAction')
          private onPlayerAction(event: PlayerActionEvent): void {}

          @OnEvent('GameStateChanged')
          private onGameStateChanged(event: GameStateChangedEvent): void {}

          public initialize(): void {}
          public cleanup(): void {}
        }
      `,
      filename: 'src/services/QualiaStateCalculatorService.ts'
    },

    // Non-service file (exempt)
    {
      code: `
        class MyComponent {
          @OnEvent('SomeEvent')
          handleEvent() {}
        }
      `,
      filename: 'src/components/MyComponent.tsx'
    }
  ],

  invalid: [
    // Service with @OnEvent but no IBaseService
    {
      code: `
        @injectable()
        export class GameControllerService implements IGameControllerService {
          @OnEvent('PlayerAction')
          private handlePlayerAction(event: PlayerActionEvent): void {
            // Handle event
          }
        }
      `,
      filename: 'src/services/GameControllerService.ts',
      errors: [{ 
        messageId: 'missingIBaseService'
       }]
    },

    // Service with IBaseService but missing initialize()
    {
      code: `
        import { IBaseService } from '../interfaces/IBaseService';

        @injectable()
        export class GameControllerService implements IGameControllerService, IBaseService {
          @OnEvent('PlayerAction')
          private handlePlayerAction(event: PlayerActionEvent): void {}

          public cleanup(): void {}
        }
      `,
      filename: 'src/services/GameControllerService.ts',
      errors: [{ 
        messageId: 'missingInitialize'
       }]
    },

    // Service with IBaseService but missing cleanup()
    {
      code: `
        import { IBaseService } from '../interfaces/IBaseService';

        @injectable()
        export class GameControllerService implements IGameControllerService, IBaseService {
          @OnEvent('PlayerAction')
          private handlePlayerAction(event: PlayerActionEvent): void {}

          public initialize(): void {}
        }
      `,
      filename: 'src/services/GameControllerService.ts',
      errors: [{ 
        messageId: 'missingCleanup'
       }]
    },

    // Multiple violations
    {
      code: `
        import { IBaseService } from '../interfaces/IBaseService';

        @injectable()
        export class QualiaStateCalculatorService implements IQualiaStateCalculatorService, IBaseService {
          @OnEvent('PlayerAction')
          private onPlayerAction(event: PlayerActionEvent): void {}

          @OnEvent('GameStateChanged')
          private onGameStateChanged(event: GameStateChangedEvent): void {}
        }
      `,
      filename: 'src/services/QualiaStateCalculatorService.ts',
      errors: [
        {
          messageId: 'missingInitialize'
        }
      ]
    }
  ]
});

console.log('✅ All enforce-onevent-base-service tests passed!');
