/**
 * @qualia-tempo/eslint-plugin-qualia-code
 * Tests for: enforce-retry-on-io-operations
 * 
 * Validates that the rule correctly enforces @retry decorator on I/O operations
 * and allows exemptions when documented.
 */

const { RuleTester } = require('eslint');
const rule = require('../lib/rules/enforce-retry-on-io-operations');

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      decorators: true
    }
  }
});

ruleTester.run('enforce-retry-on-io-operations', rule, {
  valid: [
    // ✅ VALID: Method with @retry decorator on HTTP operation
    {
      code: `
        class HttpService {
          @retry({ maxAttempts: 3 })
          public async get(url: string): Promise<any> {
            return this.httpService.get(url);
          }
        }
      `,
      filename: 'src/services/HttpService.ts'
    },

    // ✅ VALID: Method with @retry decorator on WebSocket operation
    {
      code: `
        class WebSocketService {
          @retry
          public async connect(url: string): Promise<void> {
            await this.websocket.connect(url);
          }
        }
      `,
      filename: 'src/services/WebSocketService.ts'
    },

    // ✅ VALID: Method with @retry-exempt comment (documented exemption)
    {
      code: `
        class BackendSyncService {
          /** @retry-exempt: Manual retry logic with custom backoff */
          public async sync(): Promise<void> {
            await this.httpService.post('/api/sync');
          }
        }
      `,
      filename: 'src/services/BackendSyncService.ts'
    },

    // ✅ VALID: Non-I/O method without @retry (no I/O operations)
    {
      code: `
        class CalculationService {
          public calculate(a: number, b: number): number {
            return a + b;
          }
        }
      `,
      filename: 'src/services/CalculationService.ts'
    },

    // ✅ VALID: Private method performing I/O (not enforced on private)
    {
      code: `
        class DataService {
          private async _fetchData(): Promise<void> {
            await this.httpService.get('/api/data');
          }
        }
      `,
      filename: 'src/services/DataService.ts'
    },

    // ✅ VALID: Lifecycle method without @retry (exempt by design)
    {
      code: `
        class InitializerService {
          public async initialize(): Promise<void> {
            await this.httpService.get('/api/config');
          }
        }
      `,
      filename: 'src/services/InitializerService.ts'
    },

    // ✅ VALID: Method with localStorage and @retry
    {
      code: `
        class StorageService {
          @retry
          public saveToStorage(key: string, value: any): void {
            localStorage.setItem(key, JSON.stringify(value));
          }
        }
      `,
      filename: 'src/services/StorageService.ts'
    },

    // ✅ VALID: Non-service file (rule doesn't apply)
    {
      code: `
        class DataProcessor {
          public async process(): Promise<void> {
            await fetch('/api/data');
          }
        }
      `,
      filename: 'src/utils/DataProcessor.ts' // Not in /services/
    },

    // ✅ VALID: Component file (rule doesn't apply)
    {
      code: `
        const MyComponent = () => {
          const handleClick = async () => {
            await fetch('/api/data');
          };
        };
      `,
      filename: 'src/components/MyComponent.tsx'
    },

    // ✅ VALID: Method with BackendSyncService and @retry
    {
      code: `
        class SyncService {
          @retry({ maxAttempts: 5, delayMs: 2000 })
          public async performSync(): Promise<void> {
            await this.backendSyncService.sync();
          }
        }
      `,
      filename: 'src/services/SyncService.ts'
    }
  ],

  invalid: [
    // ❌ INVALID: HTTP GET without @retry
    {
      code: `
        class ApiService {
          public async fetchData(): Promise<any> {
            return await this.httpService.get('/api/data');
          }
        }
      `,
      filename: 'src/services/ApiService.ts',
      errors: [
        {
          messageId: 'missingRetry',
          data: {
            methodName: 'fetchData',
            operations: 'HTTP GET, HttpService'
          }
        }
      ]
    },

    // ❌ INVALID: HTTP POST without @retry
    {
      code: `
        class DataService {
          public async saveData(data: any): Promise<void> {
            await this.httpService.post('/api/save', data);
          }
        }
      `,
      filename: 'src/services/DataService.ts',
      errors: [
        {
          messageId: 'missingRetry',
          data: {
            methodName: 'saveData',
            operations: 'HTTP POST, HttpService'
          }
        }
      ]
    },

    // ❌ INVALID: WebSocket connect without @retry
    {
      code: `
        class WebSocketService {
          public async connect(url: string): Promise<void> {
            await this.websocket.connect(url);
          }
        }
      `,
      filename: 'src/services/WebSocketService.ts',
      errors: [
        {
          messageId: 'missingRetry',
          data: {
            methodName: 'connect',
            operations: 'connect(), WebSocket'
          }
        }
      ]
    },

    // ❌ INVALID: fetch() call without @retry
    {
      code: `
        class HttpService {
          public async request(url: string): Promise<Response> {
            return await fetch(url);
          }
        }
      `,
      filename: 'src/services/HttpService.ts',
      errors: [
        {
          messageId: 'missingRetry',
          data: {
            methodName: 'request',
            operations: 'fetch()'
          }
        }
      ]
    },

    // ❌ INVALID: localStorage without @retry
    {
      code: `
        class StorageService {
          public savePreferences(prefs: any): void {
            localStorage.setItem('preferences', JSON.stringify(prefs));
          }
        }
      `,
      filename: 'src/services/StorageService.ts',
      errors: [
        {
          messageId: 'missingRetry',
          data: {
            methodName: 'savePreferences',
            operations: 'localStorage'
          }
        }
      ]
    },

    // ❌ INVALID: Multiple I/O operations without @retry
    {
      code: `
        class SyncService {
          public async syncAll(): Promise<void> {
            await this.httpService.get('/api/data');
            await this.websocket.send('sync');
            localStorage.setItem('lastSync', Date.now().toString());
          }
        }
      `,
      filename: 'src/services/SyncService.ts',
      errors: [
        {
          messageId: 'missingRetry',
          data: {
            methodName: 'syncAll',
            operations: 'HTTP GET, HttpService, localStorage, send(), WebSocket'
          }
        }
      ]
    },

    // ❌ INVALID: BackendSyncService usage without @retry
    {
      code: `
        class GameService {
          public async syncGameState(): Promise<void> {
            await this.backendSyncService.sync();
          }
        }
      `,
      filename: 'src/services/GameService.ts',
      errors: [
        {
          messageId: 'missingRetry',
          data: {
            methodName: 'syncGameState',
            operations: 'BackendSyncService, sync()'
          }
        }
      ]
    },

    // ❌ INVALID: axios usage without @retry
    {
      code: `
        class ApiService {
          public async callApi(): Promise<any> {
            return await axios.get('/api/endpoint');
          }
        }
      `,
      filename: 'src/services/ApiService.ts',
      errors: [
        {
          messageId: 'missingRetry',
          data: {
            methodName: 'callApi',
            operations: 'HTTP GET, axios'
          }
        }
      ]
    }
  ]
});

console.log('✅ All enforce-retry-on-io-operations tests passed!');
