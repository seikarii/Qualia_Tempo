'use strict';

const { RuleTester } = require('eslint');
const rule = require('../lib/rules/enforce-mutex-on-state-mutations');

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

ruleTester.run('enforce-mutex-on-state-mutations', rule, {
  valid: [
    {
      code: `
        class GameStateStoreService {
          @mutex
          public handleGameStateChange(event: any): void {
            const store = useGameStateStore.getState();
            store.setState(event.newState);
          }
        }
      `,
      filename: 'src/services/GameStateStoreService.ts'
    },
    {
      code: `
        class GameStateStoreService {
          @lock
          public handlePlayerAction(event: any): void {
            const store = useGameStateStore.getState();
            store.setState({ score: event.score });
          }
        }
      `,
      filename: 'src/services/GameStateStoreService.ts'
    },
    {
      code: `
        class GameStateStoreService {
          public getCurrentState(): any {
            const store = useGameStateStore.getState();
            return store.getState();
          }
        }
      `,
      filename: 'src/services/GameStateStoreService.ts'
    },
    {
      code: `
        class GameStateStoreService {
          // Thread-safe: Zustand handles internal locking
          public simpleUpdate(): void {
            const store = useGameStateStore.getState();
            store.setState({ tick: Date.now() });
          }
        }
      `,
      filename: 'src/services/GameStateStoreService.ts'
    },
    {
      code: `
        class GameStateStoreService {
          private _internalMutation(): void {
            const store = useGameStateStore.getState();
            store.setState({ internal: true });
          }
        }
      `,
      filename: 'src/services/GameStateStoreService.ts'
    },
    {
      code: `
        class MyComponent {
          public updateState(): void {
            const store = useGameStateStore.getState();
            store.setState({ value: 42 });
          }
        }
      `,
      filename: 'src/components/MyComponent.tsx'
    },
    {
      code: `
        class GameStateStoreService {
          @mutex
          public updateScore(newScore: number): void {
            useGameStateStore.getState().setScore(newScore);
          }
        }
      `,
      filename: 'src/services/GameStateStoreService.ts'
    },
  ],

  invalid: [
    {
      code: `
        class GameStateStoreService {
          public handleGameStateChange(event: any): void {
            const store = useGameStateStore.getState();
            store.setState(event.newState);
          }
        }
      `,
      filename: 'src/services/GameStateStoreService.ts',
      errors: [{ 
        messageId: 'storeUpdateWithoutMutex'
       }]
    },
    {
      code: `
        class GameStateStoreService {
          public updateScore(newScore: number): void {
            useGameStateStore.getState().setScore(newScore);
          }
        }
      `,
      filename: 'src/services/GameStateStoreService.ts',
      errors: [{ 
        messageId: 'storeUpdateWithoutMutex'
       }]
    },
    {
      code: `
        class GameStateStoreService {
          public syncState(newState: any): void {
            const store = useGameStateStore.getState();
            store.setState(newState);
            store.setLastUpdate(Date.now());
          }
        }
      `,
      filename: 'src/services/GameStateStoreService.ts',
      errors: [{ 
        messageId: 'storeUpdateWithoutMutex'
       }]
    },
    {
      code: `
        class GameStateStoreService {
          public async processAndUpdate(data: any): Promise<void> {
            const processed = await this.process(data);
            useGameStateStore.getState().setState(processed);
          }
        }
      `,
      filename: 'src/services/GameStateStoreService.ts',
      errors: [{ 
        messageId: 'storeUpdateWithoutMutex'
       }]
    },
  ]
});
