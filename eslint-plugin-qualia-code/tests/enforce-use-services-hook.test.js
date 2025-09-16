/**
 * @fileoverview Tests for enforce-use-services-hook rule
 */

'use strict';

const { RuleTester } = require('eslint');
const rule = require('../lib/rules/enforce-use-services-hook');

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  }
});

ruleTester.run('enforce-use-services-hook', rule, {
  valid: [
    // Allowed in CompositionRoot
    {
      code: 'import { QualiaService } from "../services/QualiaService";',
      filename: 'CompositionRoot.tsx'
    },
    // Allowed in hooks
    {
      code: 'import { EventBus } from "../services/EventBus";',
      filename: 'hooks.ts'
    },
    // Allowed EventBus imports
    {
      code: 'import { EventBus, EventType } from "../services/EventBus";',
      filename: 'MyComponent.tsx'
    },
    // Non-service imports
    {
      code: 'import { GameState } from "../types/GameState";',
      filename: 'Component.tsx'
    },
    // Non-tsx files
    {
      code: 'import { QualiaService } from "../services/QualiaService";',
      filename: 'utils.ts'
    }
  ],

  invalid: [
    {
      code: 'import { QualiaService } from "../services/QualiaService";',
      filename: 'MyComponent.tsx',
      errors: [{
        messageId: 'useServicesHook'
      }]
    },
    {
      code: 'import { BackendSyncService } from "../services/BackendSyncService";',
      filename: 'GameComponent.tsx',
      errors: [{
        messageId: 'useServicesHook'
      }]
    },
    {
      code: 'import QualiaCalculator from "../services/QualiaStateCalculatorService";',
      filename: 'src/components/HUD.tsx',
      errors: [{
        messageId: 'useServicesHook'
      }]
    }
  ]
});
