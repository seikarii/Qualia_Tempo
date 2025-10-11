/**
 * @fileoverview Tests for enforce-authorize-on-secure-methods rule
 */

'use strict';

const { RuleTester } = require('eslint');
const rule = require('../lib/rules/enforce-authorize-on-secure-methods');

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

ruleTester.run('enforce-authorize-on-secure-methods', rule, {
  valid: [
    // Correctly decorated security method
    {
      code: `
        class UserService {
          @authorize(['admin'])
          deleteUser(userId: string) {}
        }
      `,
      filename: 'src/services/UserService.ts'
    },
    {
      code: `
        class PermissionService {
          @authorize(['admin', 'superuser'])
          @logMethod()
          updatePermissions(userId: string, perms: string[]) {}
        }
      `,
      filename: 'src/services/PermissionService.ts'
    },
    {
      code: `
        class AccessService {
          @authorize(['admin'])
          grantAccess(userId: string) {}
        }
      `,
      filename: 'src/services/AccessService.ts'
    },
    // Non-security methods don't need @authorize
    {
      code: `
        class DataService {
          getData() {}
          saveData() {}
        }
      `,
      filename: 'src/services/DataService.ts'
    },
    // Private methods don't trigger
    {
      code: `
        class UserService {
          private deleteUser() {}
        }
      `,
      filename: 'src/services/UserService.ts'
    },
    // Non-service files
    {
      code: `
        class Component {
          deleteUser() {}
        }
      `,
      filename: 'Component.tsx'
    }
  ],

  invalid: [
    {
      code: `
        class UserService {
          deleteUser(userId: string) {}
        }
      `,
      filename: 'src/services/UserService.ts',
      errors: [{ 
        messageId: 'missingAuthorize'
       }]
    },
    {
      code: `
        class PermissionService {
          updatePermissions(userId: string, perms: string[]) {}
        }
      `,
      filename: 'src/services/PermissionService.ts',
      errors: [{ 
        messageId: 'missingAuthorize'
       }]
    },
    {
      code: `
        class AccessService {
          grantAccess(userId: string) {}
        }
      `,
      filename: 'src/services/AccessService.ts',
      errors: [{ 
        messageId: 'missingAuthorize'
       }]
    },
    {
      code: `
        class RoleService {
          assignRole(userId: string, role: string) {}
        }
      `,
      filename: 'src/services/RoleService.ts',
      errors: [{ 
        messageId: 'missingAuthorize'
       }]
    },
    {
      code: `
        class AdminService {
          createAdmin(userData: any) {}
        }
      `,
      filename: 'src/services/AdminService.ts',
      errors: [{ 
        messageId: 'missingAuthorize'
       }]
    },
    {
      code: `
        class SecurityService {
          elevatePrivilege(userId: string) {}
        }
      `,
      filename: 'src/services/SecurityService.ts',
      errors: [{ 
        messageId: 'missingAuthorize'
       }]
    },
    {
      code: `
        class AccountService {
          removeAccount(accountId: string) {}
        }
      `,
      filename: 'src/services/AccountService.ts',
      errors: [{ 
        messageId: 'missingAuthorize'
       }]
    }
  ]
});
