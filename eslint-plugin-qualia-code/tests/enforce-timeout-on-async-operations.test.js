/**
 * Tests for enforce-timeout-on-async-operations rule
 */

const { RuleTester } = require('eslint');
const rule = require('../lib/rules/enforce-timeout-on-async-operations');

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

ruleTester.run('enforce-timeout-on-async-operations', rule, {
  valid: [
    // 1. Method with @timeout decorator
    {
      code: `
        class MyService {
          @timeout(5000)
          public async fetchData(): Promise<void> {
            await this.httpService.get('/api/data');
          }
        }
      `,
      filename: 'src/services/MyService.ts'
    },

    // 2. Method with explicit AbortController timeout
    {
      code: `
        class MyService {
          public async fetchData(): Promise<void> {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            await fetch('/api/data', { signal: controller.signal });
          }
        }
      `,
      filename: 'src/services/MyService.ts'
    },

    // 3. Method with Promise.race timeout
    {
      code: `
        class MyService {
          public async fetchData(): Promise<void> {
            const timeout = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), 5000)
            );
            await Promise.race([this.httpService.get('/api/data'), timeout]);
          }
        }
      `,
      filename: 'src/services/MyService.ts'
    },

    // 4. Event loop method (intentionally long-lived)
    {
      code: `
        class MyService {
          public async startEventLoop(): Promise<void> {
            while (true) {
              await this.processEvents();
              await this.sleep(100);
            }
          }
        }
      `,
      filename: 'src/services/MyService.ts'
    },

    // 5. Method with @no-timeout exemption comment
    {
      code: `
        class MyService {
          // @no-timeout: This is an event listener that runs indefinitely
          public async listenToWebSocket(): Promise<void> {
            await this.webSocketService.connect();
            while (true) {
              await this.webSocketService.receive();
            }
          }
        }
      `,
      filename: 'src/services/MyService.ts'
    },

    // 6. Private async method (not checked)
    {
      code: `
        class MyService {
          private async _internalFetch(): Promise<void> {
            await this.httpService.get('/api/data');
          }
        }
      `,
      filename: 'src/services/MyService.ts'
    },

    // 7. Async method without I/O operations
    {
      code: `
        class MyService {
          public async calculateResult(): Promise<number> {
            const data = await this.getData();
            return data.reduce((sum, val) => sum + val, 0);
          }
        }
      `,
      filename: 'src/services/MyService.ts'
    },

    // 8. Non-service file (not checked)
    {
      code: `
        class MyComponent {
          public async fetchData(): Promise<void> {
            await fetch('/api/data');
          }
        }
      `,
      filename: 'src/components/MyComponent.tsx'
    },

    // 9. Synchronous method (not checked)
    {
      code: `
        class MyService {
          public fetchData(): void {
            this.httpService.get('/api/data');
          }
        }
      `,
      filename: 'src/services/MyService.ts'
    },

    // 10. Method with explicit timeout in AbortSignal
    {
      code: `
        class MyService {
          public async fetchData(): Promise<void> {
            const signal = AbortSignal.timeout(5000);
            await fetch('/api/data', { signal });
          }
        }
      `,
      filename: 'src/services/MyService.ts'
    }
  ],

  invalid: [
    // 1. Async method with fetch but no timeout
    {
      code: `
        class MyService {
          public async fetchData(): Promise<void> {
            await fetch('/api/data');
          }
        }
      `,
      filename: 'src/services/MyService.ts',
      errors: [{
        messageId: 'missingTimeout',
        data: {
          methodName: 'fetchData',
          operations: 'HTTP request'
        }
      }]
    },

    // 2. Async method with HttpService call but no timeout
    {
      code: `
        class MyService {
          public async getData(): Promise<void> {
            await this.httpService.get('/api/data');
          }
        }
      `,
      filename: 'src/services/MyService.ts',
      errors: [{
        messageId: 'missingTimeout',
        data: {
          methodName: 'getData',
          operations: 'Service I/O call'
        }
      }]
    },

    // 3. Async method with WebSocket operation but no timeout
    {
      code: `
        class MyService {
          public async connectToSocket(): Promise<void> {
            await this.webSocketService.connect('ws://example.com');
          }
        }
      `,
      filename: 'src/services/MyService.ts',
      errors: [{
        messageId: 'missingTimeout',
        data: {
          methodName: 'connectToSocket',
          operations: 'Service I/O call, WebSocket operation, Awaited I/O operation'
        }
      }]
    },

    // 4. Async method with storage operation but no timeout
    {
      code: `
        class MyService {
          public async saveData(): Promise<void> {
            await localStorage.setItem('key', 'value');
          }
        }
      `,
      filename: 'src/services/MyService.ts',
      errors: [{
        messageId: 'missingTimeout',
        data: {
          methodName: 'saveData',
          operations: 'Storage/File operation'
        }
      }]
    },

    // 5. Async method with external API call but no timeout (axios detection issue - needs more specific pattern)
    {
      code: `
        class MyService {
          public async callExternalApi(): Promise<void> {
            const result = await this.apiClient.get('/endpoint');
          }
        }
      `,
      filename: 'src/services/MyService.ts',
      errors: [{
        messageId: 'missingTimeout',
        data: {
          methodName: 'callExternalApi',
          operations: 'External API call'
        }
      }]
    },

    // 6. Async method with BackendSyncService call but no timeout
    {
      code: `
        class MyService {
          public async syncToBackend(): Promise<void> {
            await this.backendSyncService.sync(data);
          }
        }
      `,
      filename: 'src/services/MyService.ts',
      errors: [{
        messageId: 'missingTimeout',
        data: {
          methodName: 'syncToBackend',
          operations: 'Service I/O call, Awaited I/O operation'
        }
      }]
    },

    // 7. Async method with ConfigurationService load but no timeout
    {
      code: `
        class MyService {
          public async loadConfig(): Promise<void> {
            await this.configurationService.loadConfig();
          }
        }
      `,
      filename: 'src/services/MyService.ts',
      errors: [{
        messageId: 'missingTimeout',
        data: {
          methodName: 'loadConfig',
          operations: 'Service I/O call, Awaited I/O operation'
        }
      }]
    },

    // 8. Async method with axios call but no timeout (axios needs explicit await to be detected)
    {
      code: `
        class MyService {
          public async fetchDataWithAxios(): Promise<void> {
            const result = await axios.get('/api/data');
          }
        }
      `,
      filename: 'src/services/MyService.ts',
      errors: [{
        messageId: 'missingTimeout',
        data: {
          methodName: 'fetchDataWithAxios',
          operations: 'HTTP request'
        }
      }]
    },

    // 9. Async method with multiple I/O operations but no timeout
    {
      code: `
        class MyService {
          public async complexOperation(): Promise<void> {
            await this.httpService.get('/api/data');
            await this.webSocketService.send('message');
            await fetch('/another-endpoint');
          }
        }
      `,
      filename: 'src/services/MyService.ts',
      errors: [{
        messageId: 'missingTimeout',
        data: {
          methodName: 'complexOperation',
          operations: 'HTTP request, Service I/O call, WebSocket operation'
        }
      }]
    },

    // 10. Async method with awaited fetch but no timeout
    {
      code: `
        class MyService {
          public async fetchAndProcess(): Promise<void> {
            const response = await this.httpService.fetch('/api/data');
            return response.json();
          }
        }
      `,
      filename: 'src/services/MyService.ts',
      errors: [{
        messageId: 'missingTimeout',
        data: {
          methodName: 'fetchAndProcess',
          operations: 'HTTP request, Service I/O call, Awaited I/O operation'
        }
      }]
    }
  ]
});

console.log('All enforce-timeout-on-async-operations tests passed!');
