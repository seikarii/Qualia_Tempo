const { RuleTester } = require('eslint');
const rule = require('../lib/rules/enforce-validation-on-public-methods');

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  }
});

ruleTester.run('enforce-validation-on-public-methods', rule, {
  valid: [
    // ✅ Correct: Public method with complex parameter has @validate
    {
      code: `
        class DataService {
          @validate('UserSchema')
          public processUser(user: UserData): void {
            console.log(user);
          }
        }
      `
    },
    
    // ✅ Correct: Public method with primitive parameters (no @validate needed)
    {
      code: `
        class CalculationService {
          public calculate(x: number, y: number): number {
            return x + y;
          }
        }
      `
    },
    
    // ✅ Correct: Private method with complex parameter (exempt from rule)
    {
      code: `
        class PrivateService {
          private _processData(data: ComplexData): void {
            console.log(data);
          }
        }
      `
    },
    
    // ✅ Correct: Method with exemption comment
    {
      code: `
        class ExemptService {
          // @validate-exempt: Internal method, data already validated upstream
          public processInternal(data: ComplexData): void {
            console.log(data);
          }
        }
      `
    },
    
    // ✅ Correct: Constructor with complex parameter (constructors are exempt)
    {
      code: `
        class MyService {
          constructor(config: ServiceConfig) {
            this.config = config;
          }
        }
      `
    },
    
    // ✅ Correct: Getter (getters are exempt)
    {
      code: `
        class StateManager {
          get currentState(): GameState {
            return this.state;
          }
        }
      `
    },
    
    // ✅ Correct: Setter (setters are exempt)
    {
      code: `
        class StateManager {
          set currentState(state: GameState) {
            this.state = state;
          }
        }
      `
    },
    
    // ✅ Correct: Protected method (not public)
    {
      code: `
        class BaseService {
          protected handleData(data: ComplexData): void {
            console.log(data);
          }
        }
      `
    },
    
    // ✅ Correct: Method with array of primitives (no validation needed)
    {
      code: `
        class ArrayService {
          public processNumbers(numbers: number[]): void {
            console.log(numbers);
          }
        }
      `
    },
    
    // ✅ Correct: Method with union of primitives
    {
      code: `
        class UnionService {
          public process(value: string | number | boolean): void {
            console.log(value);
          }
        }
      `
    }
  ],

  invalid: [
    // ❌ Public method with complex object lacks @validate
    {
      code: `
        class UserService {
          public createUser(userData: UserData): void {
            console.log(userData);
          }
        }
      `,
      errors: [{ 
        messageId: 'missingValidation'
       }]
    },
    
    // ❌ Public method with interface parameter lacks @validate
    {
      code: `
        class ConfigService {
          public updateConfig(config: IConfiguration): Promise<void> {
            return Promise.resolve();
          }
        }
      `,
      errors: [{ 
        messageId: 'missingValidation'
       }]
    },
    
    // ❌ Public method with custom type lacks @validate
    {
      code: `
        class EventService {
          public handleEvent(event: CustomEvent): void {
            console.log(event);
          }
        }
      `,
      errors: [{ 
        messageId: 'missingValidation'
       }]
    },
    
    // ❌ Public method with array of complex objects lacks @validate
    {
      code: `
        class BatchService {
          public processBatch(items: UserData[]): void {
            items.forEach(item => console.log(item));
          }
        }
      `,
      errors: [{ 
        messageId: 'missingValidation'
       }]
    },
    
    // ❌ Multiple parameters with complex types (reports both)
    {
      code: `
        class MultiParamService {
          public merge(source: DataSource, target: DataTarget): void {
            console.log(source, target);
          }
        }
      `,
      errors: [
        {
          messageId: 'missingValidation'
        }
      ]
    },
    
    // ❌ Async method with complex parameter
    {
      code: `
        class AsyncService {
          public async saveData(data: DatabaseEntry): Promise<void> {
            await this.db.save(data);
          }
        }
      `,
      errors: [{ 
        messageId: 'missingValidation'
       }]
    },
    
    // ❌ Public method with object literal type
    {
      code: `
        class LiteralService {
          public process(options: { timeout: number; retries: number }): void {
            console.log(options);
          }
        }
      `,
      errors: [
        {
          messageId: 'missingValidation'
        }
      ]
    },
    
    // ❌ Public method without accessibility modifier (defaults to public)
    {
      code: `
        class ImplicitPublicService {
          handleRequest(request: HttpRequest): void {
            console.log(request);
          }
        }
      `,
      errors: [{ 
        messageId: 'missingValidation'
       }]
    }
  ]
});

console.log('✅ All enforce-validation-on-public-methods tests passed!');
