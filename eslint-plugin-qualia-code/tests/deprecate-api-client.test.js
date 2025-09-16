/**
 * @fileoverview Tests for deprecate-api-client rule
 */

'use strict';

const { RuleTester } = require('eslint');
const rule = require('../lib/rules/deprecate-api-client');

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  }
});

ruleTester.run('deprecate-api-client', rule, {
  valid: [
    // Non-API client imports
    {
      code: 'import { EventBus } from "../services/EventBus";'
    },
    {
      code: 'import { QualiaService } from "../services/QualiaService";'
    },
    // Non-API client instantiation
    {
      code: 'const service = new QualiaService();'
    },
    // Method calls on other objects
    {
      code: 'eventBus.emit("test");'
    }
  ],

  invalid: [
    {
      code: 'import { ApiClient } from "../services/ApiClient";',
      errors: [{
        messageId: 'deprecatedApiClient'
      }]
    },
    {
      code: 'import ApiClient from "../services/api-client";',
      errors: [{
        messageId: 'deprecatedApiClient'
      }]
    },
    {
      code: 'import { RestClient } from "../services/ApiClient.ts";',
      errors: [{
        messageId: 'deprecatedApiClient'
      }]
    },
    {
      code: 'const client = new ApiClient();',
      errors: [{
        messageId: 'deprecatedApiClient'
      }]
    },
    {
      code: 'const client = new HttpApiClient();',
      errors: [{
        messageId: 'deprecatedApiClient'
      }]
    },
    {
      code: 'apiClient.get("/data");',
      errors: [{
        messageId: 'deprecatedApiClient'
      }]
    },
    {
      code: 'someObject.apiClient.post("/update");',
      errors: [{
        messageId: 'deprecatedApiClient'
      }]
    }
  ]
});
