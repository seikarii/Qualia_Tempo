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

    // ❌ INVALID: Private method performing I/O still needs @retry (enforced on all methods)
    {
      code: `
        class DataService {
          @retry
          private async _fetchData(): Promise<void> {
            await this.httpService.get('/api/data');
          }
        }
      `,
      filename: 'src/services/DataService.ts'
    },

    // ❌ INVALID: Lifecycle methods also need @retry (resilience is critical)
    {
      code: `
        class InitializerService {
          @retry({ maxRetries: 5 })
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
    },

    // ✅ VALID: Map.get() - Not I/O (false positive prevention)
    {
      code: `
        class CacheService {
          private cache: Map<string, any> = new Map();
          
          public getData(key: string): any {
            return this.cache.get(key);
          }
        }
      `,
      filename: 'src/services/CacheService.ts'
    },

    // ✅ VALID: Map.delete() - Not I/O (false positive prevention)
    {
      code: `
        class TimerService {
          private timers: Map<number, NodeJS.Timeout> = new Map();
          
          public clearTimeout(id: number): void {
            const timer = this.timers.get(id);
            if (timer) {
              clearTimeout(timer);
              this.timers.delete(id);
            }
          }
        }
      `,
      filename: 'src/services/TimerService.ts'
    },

    // ✅ VALID: AudioNode.connect() - Not network I/O (false positive prevention)
    {
      code: `
        class AudioService {
          public createSoundSource(): void {
            const gainNode = this.audioContext.createGain();
            const pannerNode = this.audioContext.createPanner();
            gainNode.connect(pannerNode);
            pannerNode.connect(this.audioContext.destination);
          }
        }
      `,
      filename: 'src/services/AudioService.ts'
    },

    // ✅ VALID: this.someMap.get() - Data structure, not HTTP (false positive prevention)
    {
      code: `
        class RenderTargetPoolService {
          private pool: Map<string, WebGLRenderTarget> = new Map();
          
          public acquire(key: string): WebGLRenderTarget | undefined {
            return this.pool.get(key);
          }
        }
      `,
      filename: 'src/services/RenderTargetPoolService.ts'
    },

    // ✅ VALID: getReadyState() - Status getter, not I/O operation
    {
      code: `
        class WebSocketService {
          private websocket: WebSocket | null = null;
          
          public getReadyState(): number {
            return this.websocket ? this.websocket.readyState : WebSocket.CLOSED;
          }
        }
      `,
      filename: 'src/services/WebSocketService.ts'
    },

    // ✅ VALID: isConnected() - Status getter, not I/O operation
    {
      code: `
        class WebSocketService {
          private websocket: WebSocket | null = null;
          
          public isConnected(): boolean {
            return this.websocket?.readyState === WebSocket.OPEN;
          }
        }
      `,
      filename: 'src/services/WebSocketService.ts'
    },

    // ✅ VALID: Set.delete() in Timer Service - Data structure operation
    {
      code: `
        class TimerService {
          private activeTimeouts: Set<number> = new Set();
          
          public clearTimeout(id: number): void {
            this.timerProvider.clearTimeout(id);
            this.activeTimeouts.delete(id);
          }
        }
      `,
      filename: 'src/services/TimerService.ts'
    },

    // ✅ VALID: source.gainNode.disconnect() - Audio API, not network
    {
      code: `
        class Audio8DService {
          public removeSoundSource(id: string): void {
            const source = this.soundSources.get(id);
            if (source) {
              source.gainNode.disconnect();
              source.pannerNode.disconnect();
              this.soundSources.delete(id);
            }
          }
        }
      `,
      filename: 'src/services/Audio8DService.ts'
    },

    // ✅ VALID: getStatus(), getConnectionStatus() - Status getters
    {
      code: `
        class ConnectionService {
          public getConnectionStatus(): string {
            return this.isActive ? 'connected' : 'disconnected';
          }
          
          public getStatus(): { active: boolean, latency: number } {
            return { active: this.isActive, latency: this.latency };
          }
        }
      `,
      filename: 'src/services/ConnectionService.ts'
    },

    // ✅ VALID: Set<string>.delete() for key tracking - Not HTTP DELETE
    {
      code: `
        class InputStateService {
          private pressedKeys: Set<string> = new Set();
          private justPressedKeys: Set<string> = new Set();
          
          public releaseKey(key: string): void {
            this.pressedKeys.delete(key.toLowerCase());
            this.justPressedKeys.delete(key.toLowerCase());
          }
        }
      `,
      filename: 'src/services/InputStateService.ts'
    },

    // ✅ VALID: Map<string, Notification>.delete() - Not HTTP DELETE
    {
      code: `
        class NotificationService {
          private activeNotifications: Map<string, Notification> = new Map();
          
          public dismissNotification(id: string): void {
            const notification = this.activeNotifications.get(id);
            if (notification) {
              this.activeNotifications.delete(id);
              this.logger.debug('Notification dismissed', { id });
            }
          }
        }
      `,
      filename: 'src/services/NotificationService.ts'
    },

    // ✅ VALID: Pool.delete() for resource management - Not HTTP DELETE
    {
      code: `
        class RenderTargetPoolService {
          private pool: Map<string, RenderTarget> = new Map();
          
          public release(key: string): void {
            const target = this.pool.get(key);
            if (target) {
              target.dispose();
              this.pool.delete(key);
            }
          }
        }
      `,
      filename: 'src/services/RenderTargetPoolService.ts'
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
          messageId: 'missingRetry'
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
          messageId: 'missingRetry'
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
          messageId: 'missingRetry'
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
          messageId: 'missingRetry'
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
          messageId: 'missingRetry'
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
          messageId: 'missingRetry'
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
          messageId: 'missingRetry'
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
          messageId: 'missingRetry'
        }
      ]
    }
  ]
});

console.log('✅ All enforce-retry-on-io-operations tests passed!');
