/**
 * @fileoverview Tests for enforce-ioc-binding-order rule
 * @author Qualia Tempo Team
 */

'use strict';

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const rule = require('../../../lib/rules/enforce-ioc-binding-order');
const { RuleTester } = require('eslint');

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module'
  }
});

ruleTester.run('enforce-ioc-binding-order', rule, {
  valid: [
    {
      // Valid: Params bound before retrieval
      filename: 'inversify.config.ts',
      code: `
        safeBindConstant(TYPES.AudioServiceParams, { config: 'value' });
        safeBindConstant(TYPES.GameControllerServiceParams, {
          audioService: container.get(TYPES.IAudioService)
        });
      `
    },
    {
      // Valid: Infrastructure service (no Params needed)
      filename: 'inversify.config.ts',
      code: `
        safeBindConstant(TYPES.GameControllerServiceParams, {
          logger: container.get(TYPES.ILogger)
        });
      `
    },
    {
      // Valid: Not in inversify.config.ts (rule should not run)
      filename: 'SomeOtherFile.ts',
      code: `
        const service = container.get(TYPES.IAudioService);
      `
    }
  ],

  invalid: [
    {
      // Invalid: Params bound after retrieval
      filename: 'inversify.config.ts',
      code: `
        safeBindConstant(TYPES.GameControllerServiceParams, {
          audioService: container.get(TYPES.IAudioService)
        });
        safeBindConstant(TYPES.AudioServiceParams, { config: 'value' });
      `,
      errors: [
        {
          messageId: 'bindingOrderViolation',
          data: {
            dependency: 'TYPES.IAudioService',
            dependencyParams: 'TYPES.AudioServiceParams',
            getLine: 3,
            bindLine: 5
          }
        }
      ]
    },
    {
      // Invalid: Params never bound
      filename: 'inversify.config.ts',
      code: `
        safeBindConstant(TYPES.GameControllerServiceParams, {
          audioService: container.get(TYPES.IAudioService)
        });
      `,
      errors: [
        {
          messageId: 'missingBinding',
          data: {
            dependency: 'TYPES.IAudioService',
            dependencyParams: 'TYPES.AudioServiceParams'
          }
        }
      ]
    }
  ]
});

console.log('✅ All tests passed for enforce-ioc-binding-order rule');
