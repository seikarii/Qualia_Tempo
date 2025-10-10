/**
 * @fileoverview Tests for enforce-rate-limit-on-api-calls rule
 */

'use strict';

const { RuleTester } = require('eslint');
const rule = require('../lib/rules/enforce-rate-limit-on-api-calls');

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

ruleTester.run('enforce-rate-limit-on-api-calls', rule, {
  valid: [
    // Correctly decorated method with loop + HTTP
    {
      code: `
        class DataService {
          @rateLimit(10, 1000)
          async fetchMultiple(ids: string[]) {
            for (const id of ids) {
              await this.httpService.get('/api/' + id);
            }
          }
        }
      `,
      filename: 'src/services/DataService.ts'
    },
    {
      code: `
        class BatchService {
          @rateLimit(5, 500)
          async processItems(items: any[]) {
            items.forEach(item => {
              this.httpService.post('/api/process', item);
            });
          }
        }
      `,
      filename: 'src/services/BatchService.ts'
    },
    // Single HTTP call without loop (no rate limit needed)
    {
      code: `
        class ApiService {
          async fetchData() {
            return this.httpService.get('/api/data');
          }
        }
      `,
      filename: 'src/services/ApiService.ts'
    },
    // Loop without HTTP call (no rate limit needed)
    {
      code: `
        class CalculationService {
          processData(items: any[]) {
            for (const item of items) {
              console.log(item);
            }
          }
        }
      `,
      filename: 'src/services/CalculationService.ts'
    },
    // Private method
    {
      code: `
        class DataService {
          private fetchMultiple(ids: string[]) {
            for (const id of ids) {
              this.httpService.get('/api/' + id);
            }
          }
        }
      `,
      filename: 'src/services/DataService.ts'
    },
    // Non-service file
    {
      code: `
        class Component {
          fetchMultiple(ids: string[]) {
            for (const id of ids) {
              fetch('/api/' + id);
            }
          }
        }
      `,
      filename: 'Component.tsx'
    }
  ],

  invalid: [
    {
      code: `
        class DataService {
          async fetchMultiple(ids: string[]) {
            for (const id of ids) {
              await this.httpService.get('/api/' + id);
            }
          }
        }
      `,
      filename: 'src/services/DataService.ts',
      errors: [{
        messageId: 'missingRateLimit',
        data: { methodName: 'fetchMultiple' }
      }]
    },
    {
      code: `
        class BatchService {
          async processItems(items: any[]) {
            items.forEach(item => {
              this.httpService.post('/api/process', item);
            });
          }
        }
      `,
      filename: 'src/services/BatchService.ts',
      errors: [{
        messageId: 'missingRateLimit',
        data: { methodName: 'processItems' }
      }]
    },
    {
      code: `
        class SyncService {
          async syncAll(data: any[]) {
            data.map(item => this.httpService.put('/api/sync', item));
          }
        }
      `,
      filename: 'src/services/SyncService.ts',
      errors: [{
        messageId: 'missingRateLimit',
        data: { methodName: 'syncAll' }
      }]
    },
    {
      code: `
        class ApiService {
          async bulkDelete(ids: string[]) {
            while (ids.length > 0) {
              const id = ids.pop();
              await fetch('/api/delete/' + id);
            }
          }
        }
      `,
      filename: 'src/services/ApiService.ts',
      errors: [{
        messageId: 'missingRateLimit',
        data: { methodName: 'bulkDelete' }
      }]
    }
  ]
});
