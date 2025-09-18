/**
 * @fileoverview Tests for enforce-inversify-conventions rule
 * @author Qualia Tempo Team
 */

'use strict';

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const rule = require('../lib/rules/enforce-inversify-conventions');
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
      jsx: true
    }
  }
});

ruleTester.run('enforce-inversify-conventions', rule, {
  valid: [
    // Valid service class with @injectable and @inject
    {
      code: `
        import { injectable, inject } from 'inversify';
        import { TYPES } from './types';

        @injectable()
        export class UserService {
          constructor(
            @inject(TYPES.Logger) private logger: ILogger,
            @inject(TYPES.Database) private database: IDatabase
          ) {}
        }
      `,
      filename: 'UserService.ts'
    },

    // Valid controller class
    {
      code: `
        import { injectable, inject } from 'inversify';

        @injectable()
        export class AuthController {
          constructor(@inject(TYPES.AuthService) private authService: IAuthService) {}
        }
      `,
      filename: 'AuthController.ts'
    },

    // Valid repository class
    {
      code: `
        import { injectable, inject } from 'inversify';

        @injectable()
        export class UserRepository {
          constructor(@inject(TYPES.Database) private database: IDatabase) {}
        }
      `,
      filename: 'UserRepository.ts'
    },

    // Non-service class should be ignored
    {
      code: `
        export class RegularClass {
          constructor(private param: string) {}
        }
      `,
      filename: 'RegularClass.ts'
    },

    // Entry file with reflect-metadata import
    {
      code: `
        import 'reflect-metadata';
        import React from 'react';
        import { createRoot } from 'react-dom/client';
      `,
      filename: 'index.tsx'
    }
  ],

  invalid: [
    // Service class without @injectable
    {
      code: `
        export class UserService {
          constructor(private logger: ILogger) {}
        }
      `,
      filename: 'UserService.ts',
      errors: [
        {
          messageId: 'missingInjectable',
          data: { className: 'UserService' }
        }
      ]
    },

    // Injectable class with constructor param without @inject
    {
      code: `
        import { injectable } from 'inversify';

        @injectable()
        export class UserService {
          constructor(private logger: ILogger) {}
        }
      `,
      filename: 'UserService.ts',
      errors: [
        {
          messageId: 'missingInject',
          data: { paramName: 'logger', className: 'UserService' }
        }
      ]
    },

    // Multiple parameters without @inject
    {
      code: `
        import { injectable } from 'inversify';

        @injectable()
        export class UserService {
          constructor(
            private logger: ILogger,
            private database: IDatabase,
            private cache: ICache
          ) {}
        }
      `,
      filename: 'UserService.ts',
      errors: [
        {
          messageId: 'missingInject',
          data: { paramName: 'logger', className: 'UserService' }
        },
        {
          messageId: 'missingInject',
          data: { paramName: 'database', className: 'UserService' }
        },
        {
          messageId: 'missingInject',
          data: { paramName: 'cache', className: 'UserService' }
        }
      ]
    },

    // Entry file without reflect-metadata import
    {
      code: `
        import { Container } from 'inversify';
        import React from 'react';
        import { createRoot } from 'react-dom/client';
      `,
      filename: 'index.tsx',
      errors: [
        {
          messageId: 'missingReflectMetadata'
        }
      ]
    },

    // reflect-metadata import not at the top
    {
      code: `
        import { Container } from 'inversify';
        import React from 'react';
        import 'reflect-metadata';
        import { createRoot } from 'react-dom/client';
      `,
      filename: 'index.tsx',
      errors: [
        {
          messageId: 'missingReflectMetadata'
        }
      ]
    }
  ]
});