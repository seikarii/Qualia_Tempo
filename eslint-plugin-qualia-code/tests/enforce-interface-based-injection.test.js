/**
 * @fileoverview Tests for enforce-interface-based-injection rule
 */

'use strict';

const { RuleTester } = require('eslint');
const rule = require('../lib/rules/enforce-interface-based-injection');
const path = require('path');

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: false
    },
    tsconfigRootDir: path.resolve(__dirname, '..'),
    project: './tsconfig.test.json'
  }
});

ruleTester.run('enforce-interface-based-injection', rule, {
  valid: [
    // Correct: Interface-based injection
    {
      code: `
        interface ILogger {
          info(message: string): void;
        }
        
        const TYPES = { ILogger: Symbol.for("ILogger") };
        const injectable = () => (target: any) => target;
        const inject = (token: any) => (target: any, propertyKey: string, parameterIndex: number) => {};
        
        @injectable()
        export class MyService {
          constructor(@inject(TYPES.ILogger) private logger: ILogger) {}
        }
      `,
      filename: 'test.ts'
    },
    // Correct: No @injectable decorator (rule doesn't apply)
    {
      code: `
        class ConcreteLogger {
          log(message: string) {}
        }
        
        export class MyService {
          constructor(private logger: ConcreteLogger) {}
        }
      `,
      filename: 'test.ts'
    },
    // Correct: No @inject decorator on parameter
    {
      code: `
        class ConcreteLogger {
          log(message: string) {}
        }
        
        const injectable = () => (target: any) => target;
        
        @injectable()
        export class MyService {
          constructor(private logger: ConcreteLogger) {}
        }
      `,
      filename: 'test.ts'
    }
  ],

  invalid: [
    // Violation: Concrete class injection
    {
      code: `
        class ConcreteLogger {
          log(message: string) {}
        }
        
        const TYPES = { ConcreteLogger: Symbol.for("ConcreteLogger") };
        const injectable = () => (target: any) => target;
        const inject = (token: any) => (target: any, propertyKey: string, parameterIndex: number) => {};
        
        @injectable()
        export class MyService {
          constructor(@inject(TYPES.ConcreteLogger) private logger: ConcreteLogger) {}
        }
      `,
      filename: 'test.ts',
      errors: [{
        messageId: 'concreteClassInjection'
      }]
    },
    // Violation: Multiple concrete class injections
    {
      code: `
        class ConcreteLogger {
          log(msg: string) {}
        }
        
        class ConcreteConfig {
          apiUrl: string = "";
        }
        
        const TYPES = {
          Logger: Symbol.for("Logger"),
          Config: Symbol.for("Config")
        };
        const injectable = () => (target: any) => target;
        const inject = (token: any) => (target: any, propertyKey: string, parameterIndex: number) => {};
        
        @injectable()
        export class MyService {
          constructor(
            @inject(TYPES.Logger) private logger: ConcreteLogger,
            @inject(TYPES.Config) private config: ConcreteConfig
          ) {}
        }
      `,
      filename: 'test.ts',
      errors: [
        { messageId: 'concreteClassInjection' },
        { messageId: 'concreteClassInjection' }
      ]
    }
  ]
});
