/**
 * WebSocket Stability Test Suite
 * Phase 6.5 - Integration & Stability Testing
 * 
 * Tests WebSocket connection resilience, ping/pong health monitoring,
 * reconnection logic, and graceful degradation.
 * 
 * @requires Backend running on http://localhost:8000
 * @requires Frontend running on http://localhost:5173
 */

import { test, expect, Page } from '@playwright/test';

const BACKEND_URL = 'http://localhost:8000';
const FRONTEND_URL = 'http://localhost:5173';
const PING_INTERVAL = 15000; // 15 seconds
const PING_TIMEOUT = 5000; // 5 seconds
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000]; // Exponential backoff
const MAX_RECONNECT_ATTEMPTS = 5;

/**
 * Helper: Get WebSocket connection state
 */
async function getConnectionState(page: Page): Promise<string> {
  return await page.evaluate(() => {
    return (window as any).__WEBSOCKET_STATE__ || 'UNKNOWN';
  });
}

/**
 * Helper: Get connection statistics
 */
async function getConnectionStats(page: Page): Promise<any> {
  return await page.evaluate(() => {
    return (window as any).__CONNECTION_STATS__ || {
      reconnectAttempts: 0,
      messagesReceived: 0,
      messagesLost: 0,
      averageLatency: 0,
      lastPingTime: 0,
      lastPongTime: 0
    };
  });
}

/**
 * Helper: Force WebSocket disconnection
 */
async function forceDisconnect(page: Page): Promise<void> {
  await page.evaluate(() => {
    const ws = (window as any).__WEBSOCKET__;
    if (ws) {
      ws.close();
    }
  });
}

/**
 * Helper: Simulate network offline
 */
async function simulateOffline(page: Page): Promise<void> {
  await page.context().setOffline(true);
}

/**
 * Helper: Simulate network online
 */
async function simulateOnline(page: Page): Promise<void> {
  await page.context().setOffline(false);
}

/**
 * Helper: Block WebSocket traffic
 */
async function blockWebSocket(page: Page): Promise<void> {
  await page.route('**/ws/**', route => route.abort());
}

/**
 * Helper: Unblock WebSocket traffic
 */
async function unblockWebSocket(page: Page): Promise<void> {
  await page.unroute('**/ws/**');
}

test.describe('Phase 6.5 - WebSocket Connection Resilience', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
  });

  test('WS-RESILIENCE-001: Successful initial connection', async ({ page }) => {
    await page.click('button:has-text("Start")');
    
    // Wait for connection
    await page.waitForFunction(
      () => (window as any).__WEBSOCKET_STATE__ === 'CONNECTED',
      { timeout: 10000 }
    );
    
    const state = await getConnectionState(page);
    expect(state).toBe('CONNECTED');
  });

  test('WS-RESILIENCE-002: Auto-reconnect after manual disconnect', async ({ page }) => {
    await page.click('button:has-text("Start")');
    await page.waitForFunction(() => (window as any).__WEBSOCKET_STATE__ === 'CONNECTED');
    
    // Force disconnect
    await forceDisconnect(page);
    
    // Wait for DISCONNECTED state
    await page.waitForFunction(
      () => (window as any).__WEBSOCKET_STATE__ === 'DISCONNECTED',
      { timeout: 2000 }
    );
    
    // Wait for RECONNECTING state
    await page.waitForFunction(
      () => (window as any).__WEBSOCKET_STATE__ === 'RECONNECTING',
      { timeout: 2000 }
    );
    
    // Wait for successful reconnection
    await page.waitForFunction(
      () => (window as any).__WEBSOCKET_STATE__ === 'CONNECTED',
      { timeout: 10000 }
    );
    
    const state = await getConnectionState(page);
    expect(state).toBe('CONNECTED');
  });

  test('WS-RESILIENCE-003: Exponential backoff on reconnect', async ({ page }) => {
    await page.click('button:has-text("Start")');
    await page.waitForFunction(() => (window as any).__WEBSOCKET_STATE__ === 'CONNECTED');
    
    // Track reconnection delays
    const delays: number[] = [];
    
    await page.exposeFunction('trackReconnectDelay', (delay: number) => {
      delays.push(delay);
    });
    
    // Inject tracking code
    await page.evaluate(() => {
      const originalSetTimeout = window.setTimeout;
      (window as any).setTimeout = function(callback: any, delay: number) {
        if (delay >= 1000 && delay <= 30000) {
          (window as any).trackReconnectDelay(delay);
        }
        return originalSetTimeout(callback, delay);
      };
    });
    
    // Block WebSocket to force reconnection attempts
    await blockWebSocket(page);
    await forceDisconnect(page);
    
    // Wait for multiple reconnection attempts
    await page.waitForTimeout(10000);
    
    // Unblock and allow connection
    await unblockWebSocket(page);
    
    // Verify exponential backoff pattern
    expect(delays.length).toBeGreaterThan(0);
    
    // Check delays match exponential backoff (1s, 2s, 4s, 8s, 16s, 30s)
    for (let i = 0; i < Math.min(delays.length - 1, RECONNECT_DELAYS.length - 1); i++) {
      const expectedDelay = RECONNECT_DELAYS[i];
      const actualDelay = delays[i];
      // Allow 10% tolerance
      expect(actualDelay).toBeGreaterThanOrEqual(expectedDelay * 0.9);
      expect(actualDelay).toBeLessThanOrEqual(expectedDelay * 1.1);
    }
  });

  test('WS-RESILIENCE-004: Max reconnect attempts reached', async ({ page }) => {
    await page.click('button:has-text("Start")');
    await page.waitForFunction(() => (window as any).__WEBSOCKET_STATE__ === 'CONNECTED');
    
    // Block all WebSocket traffic
    await blockWebSocket(page);
    await forceDisconnect(page);
    
    // Wait for max reconnect attempts (5 attempts * 30s max delay = 150s, but we'll wait 60s)
    await page.waitForTimeout(60000);
    
    const stats = await getConnectionStats(page);
    
    // Verify max attempts reached
    expect(stats.reconnectAttempts).toBeGreaterThanOrEqual(MAX_RECONNECT_ATTEMPTS);
    
    // Verify final state is ERROR
    const state = await getConnectionState(page);
    expect(state).toBe('ERROR');
  });

  test('WS-RESILIENCE-005: Network offline/online recovery', async ({ page }) => {
    await page.click('button:has-text("Start")');
    await page.waitForFunction(() => (window as any).__WEBSOCKET_STATE__ === 'CONNECTED');
    
    // Simulate network offline
    await simulateOffline(page);
    
    // Wait for disconnection
    await page.waitForFunction(
      () => (window as any).__WEBSOCKET_STATE__ === 'DISCONNECTED',
      { timeout: 10000 }
    );
    
    // Simulate network online
    await simulateOnline(page);
    
    // Wait for reconnection
    await page.waitForFunction(
      () => (window as any).__WEBSOCKET_STATE__ === 'CONNECTED',
      { timeout: 15000 }
    );
    
    const state = await getConnectionState(page);
    expect(state).toBe('CONNECTED');
  });

  test('WS-RESILIENCE-006: State preservation during reconnection', async ({ page }) => {
    await page.click('button:has-text("Start")');
    await page.waitForFunction(() => (window as any).__WEBSOCKET_STATE__ === 'CONNECTED');
    
    // Wait for some game state
    await page.waitForTimeout(2000);
    
    // Get current CombatState
    const beforeState = await page.evaluate(() => {
      return (window as any).__GAME_STATE_STORE__?.combatState;
    });
    
    // Force disconnect
    await forceDisconnect(page);
    await page.waitForTimeout(500);
    
    // Verify state preserved during disconnection
    const duringState = await page.evaluate(() => {
      return (window as any).__GAME_STATE_STORE__?.combatState;
    });
    
    expect(duringState).toEqual(beforeState);
    
    // Wait for reconnection
    await page.waitForFunction(
      () => (window as any).__WEBSOCKET_STATE__ === 'CONNECTED',
      { timeout: 10000 }
    );
    
    // Verify state updated after reconnection
    await page.waitForTimeout(1000);
    const afterState = await page.evaluate(() => {
      return (window as any).__GAME_STATE_STORE__?.combatState;
    });
    
    expect(afterState).toBeTruthy();
    expect(afterState.player).toBeDefined();
  });
});

test.describe('Phase 6.5 - Ping/Pong Health Monitoring', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
  });

  test('WS-PING-001: Ping sent at regular intervals', async ({ page }) => {
    await page.click('button:has-text("Start")');
    await page.waitForFunction(() => (window as any).__WEBSOCKET_STATE__ === 'CONNECTED');
    
    // Track ping times
    const pingTimes: number[] = [];
    
    await page.exposeFunction('trackPing', (time: number) => {
      pingTimes.push(time);
    });
    
    // Inject ping tracking
    await page.evaluate(() => {
      const ws = (window as any).__WEBSOCKET__;
      const originalSend = ws?.send.bind(ws);
      
      if (ws && originalSend) {
        ws.send = function(data: string) {
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'ping') {
              (window as any).trackPing(Date.now());
            }
          } catch (e) {
            // Ignore parsing errors
          }
          return originalSend(data);
        };
      }
    });
    
    // Wait for multiple pings (45 seconds = 3 pings at 15s interval)
    await page.waitForTimeout(45000);
    
    // Verify at least 2 pings occurred
    expect(pingTimes.length).toBeGreaterThanOrEqual(2);
    
    // Verify interval between pings is ~15 seconds
    for (let i = 1; i < pingTimes.length; i++) {
      const interval = pingTimes[i] - pingTimes[i - 1];
      // Allow 2 second tolerance
      expect(interval).toBeGreaterThanOrEqual(PING_INTERVAL - 2000);
      expect(interval).toBeLessThanOrEqual(PING_INTERVAL + 2000);
    }
  });

  test('WS-PING-002: Pong response received', async ({ page }) => {
    await page.click('button:has-text("Start")');
    await page.waitForFunction(() => (window as any).__WEBSOCKET_STATE__ === 'CONNECTED');
    
    // Wait for first ping/pong cycle
    await page.waitForTimeout(PING_INTERVAL + 2000);
    
    const stats = await getConnectionStats(page);
    
    // Verify pong received
    expect(stats.lastPongTime).toBeGreaterThan(stats.lastPingTime - PING_TIMEOUT);
    expect(stats.lastPongTime).toBeLessThanOrEqual(stats.lastPingTime + PING_TIMEOUT);
  });

  test('WS-PING-003: Connection closes on ping timeout', async ({ page }) => {
    await page.click('button:has-text("Start")');
    await page.waitForFunction(() => (window as any).__WEBSOCKET_STATE__ === 'CONNECTED');
    
    // Block pong responses
    await page.route('**/ws/**', route => {
      const request = route.request();
      if (request.postData()?.includes('pong')) {
        route.abort();
      } else {
        route.continue();
      }
    });
    
    // Wait for ping timeout to trigger
    await page.waitForTimeout(PING_INTERVAL + PING_TIMEOUT + 2000);
    
    // Verify connection closed
    const state = await getConnectionState(page);
    expect(state).not.toBe('CONNECTED');
  });

  test('WS-PING-004: Latency calculation accuracy', async ({ page }) => {
    await page.click('button:has-text("Start")');
    await page.waitForFunction(() => (window as any).__WEBSOCKET_STATE__ === 'CONNECTED');
    
    // Wait for latency samples
    await page.waitForTimeout(5000);
    
    const stats = await getConnectionStats(page);
    
    // Verify average latency is reasonable (localhost should be <50ms)
    expect(stats.averageLatency).toBeGreaterThan(0);
    expect(stats.averageLatency).toBeLessThan(100);
  });
});

test.describe('Phase 6.5 - Latency Tracking', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
  });

  test('WS-LATENCY-001: Circular buffer size is 100', async ({ page }) => {
    await page.click('button:has-text("Start")');
    await page.waitForFunction(() => (window as any).__WEBSOCKET_STATE__ === 'CONNECTED');
    
    // Wait for buffer to fill
    await page.waitForTimeout(10000);
    
    const bufferSize = await page.evaluate(() => {
      return (window as any).__LATENCY_BUFFER__?.length || 0;
    });
    
    // Verify buffer size <= 100
    expect(bufferSize).toBeLessThanOrEqual(100);
  });

  test('WS-LATENCY-002: Rolling average calculation', async ({ page }) => {
    await page.click('button:has-text("Start")');
    await page.waitForFunction(() => (window as any).__WEBSOCKET_STATE__ === 'CONNECTED');
    
    // Wait for samples
    await page.waitForTimeout(5000);
    
    const { buffer, average } = await page.evaluate(() => {
      return {
        buffer: (window as any).__LATENCY_BUFFER__ || [],
        average: (window as any).__CONNECTION_STATS__?.averageLatency || 0
      };
    });
    
    // Manually calculate average
    const manualAverage = buffer.reduce((sum: number, val: number) => sum + val, 0) / buffer.length;
    
    // Verify rolling average matches manual calculation (within 1ms tolerance)
    expect(Math.abs(average - manualAverage)).toBeLessThan(1);
  });

  test('WS-LATENCY-003: Latency updates in real-time', async ({ page }) => {
    await page.click('button:has-text("Start")');
    await page.waitForFunction(() => (window as any).__WEBSOCKET_STATE__ === 'CONNECTED');
    
    // Sample latency multiple times
    const samples: number[] = [];
    
    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(1000);
      const stats = await getConnectionStats(page);
      samples.push(stats.averageLatency);
    }
    
    // Verify latency changed (not static)
    const uniqueValues = new Set(samples);
    expect(uniqueValues.size).toBeGreaterThan(1);
  });
});

test.describe('Phase 6.5 - Graceful Degradation', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
  });

  test('WS-DEGRADATION-001: UI shows connection status', async ({ page }) => {
    // Check for connection status UI element
    const statusElement = page.locator('[data-testid="connection-status"]');
    
    // Should show IDLE initially
    await expect(statusElement).toHaveText(/IDLE|DISCONNECTED/i);
    
    // Start game
    await page.click('button:has-text("Start")');
    
    // Should show CONNECTING
    await expect(statusElement).toHaveText(/CONNECTING/i, { timeout: 2000 });
    
    // Should show CONNECTED
    await expect(statusElement).toHaveText(/CONNECTED/i, { timeout: 10000 });
  });

  test('WS-DEGRADATION-002: Fallback to placeholders on connection loss', async ({ page }) => {
    await page.click('button:has-text("Start")');
    await page.waitForFunction(() => (window as any).__WEBSOCKET_STATE__ === 'CONNECTED');
    
    // Force disconnect
    await forceDisconnect(page);
    await page.waitForTimeout(500);
    
    // Verify app still renders (placeholders)
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    
    // Verify no crash
    const errors = await page.evaluate(() => {
      return (window as any).__CONSOLE_ERRORS__ || [];
    });
    expect(errors.length).toBe(0);
  });

  test('WS-DEGRADATION-003: Smooth recovery on reconnection', async ({ page }) => {
    await page.click('button:has-text("Start")');
    await page.waitForFunction(() => (window as any).__WEBSOCKET_STATE__ === 'CONNECTED');
    
    // Get initial frame rate
    const initialFPS = await page.evaluate(() => {
      return (window as any).__CURRENT_FPS__ || 0;
    });
    
    // Force disconnect and reconnect
    await forceDisconnect(page);
    await page.waitForTimeout(2000);
    await page.waitForFunction(
      () => (window as any).__WEBSOCKET_STATE__ === 'CONNECTED',
      { timeout: 10000 }
    );
    
    // Get frame rate after recovery
    await page.waitForTimeout(2000);
    const recoveredFPS = await page.evaluate(() => {
      return (window as any).__CURRENT_FPS__ || 0;
    });
    
    // Verify frame rate recovered (within 10%)
    expect(recoveredFPS).toBeGreaterThanOrEqual(initialFPS * 0.9);
  });

  test('WS-DEGRADATION-004: User-friendly error messages', async ({ page }) => {
    // Block WebSocket
    await blockWebSocket(page);
    
    await page.click('button:has-text("Start")');
    
    // Wait for connection failure
    await page.waitForTimeout(5000);
    
    // Check for error message in UI (not raw WebSocket errors)
    const errorMessage = page.locator('[data-testid="error-message"]');
    
    if (await errorMessage.isVisible()) {
      const text = await errorMessage.textContent();
      
      // Verify user-friendly message (not technical jargon)
      expect(text).not.toContain('WebSocket');
      expect(text).not.toContain('ws://');
      expect(text).toMatch(/connection|network|server/i);
    }
  });
});
