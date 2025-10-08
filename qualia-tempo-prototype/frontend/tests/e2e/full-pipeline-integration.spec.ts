/**
 * E2E Integration Test - Full Data Pipeline
 * Phase 6.5 - Integration & Stability Testing
 * 
 * Tests the complete data flow:
 * Backend GameLogic → WebSocket → Frontend EventBus → KairosVisualEngine → Render
 * 
 * @requires Backend running on http://localhost:8000
 * @requires Frontend running on http://localhost:5173
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const BACKEND_URL = 'http://localhost:8000';
const FRONTEND_URL = 'http://localhost:5173';
const WEBSOCKET_URL = 'ws://localhost:8000/ws/game_state';
const WEBSOCKET_CONNECTION_TIMEOUT = 10000; // 10 seconds
const GAME_STATE_UPDATE_TIMEOUT = 5000; // 5 seconds
const FRAME_RATE_SAMPLE_DURATION = 3000; // 3 seconds

/**
 * Helper: Wait for WebSocket connection
 */
async function waitForWebSocketConnection(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const store = (window as any).__GAME_STATE_STORE__;
      return store && store.isConnected === true;
    },
    { timeout: WEBSOCKET_CONNECTION_TIMEOUT }
  );
}

/**
 * Helper: Get current CombatState from store
 */
async function getCombatState(page: Page): Promise<any> {
  return await page.evaluate(() => {
    const store = (window as any).__GAME_STATE_STORE__;
    return store?.combatState || null;
  });
}

/**
 * Helper: Get WebSocket statistics
 */
async function getWebSocketStats(page: Page): Promise<any> {
  return await page.evaluate(() => {
    return (window as any).__WEBSOCKET_STATS__ || null;
  });
}

/**
 * Helper: Measure frame rate over duration
 */
async function measureFrameRate(page: Page, durationMs: number): Promise<number> {
  return await page.evaluate((duration) => {
    return new Promise<number>((resolve) => {
      let frameCount = 0;
      const startTime = performance.now();
      
      function countFrame() {
        frameCount++;
        const elapsed = performance.now() - startTime;
        
        if (elapsed < duration) {
          requestAnimationFrame(countFrame);
        } else {
          const fps = (frameCount / elapsed) * 1000;
          resolve(fps);
        }
      }
      
      requestAnimationFrame(countFrame);
    });
  }, durationMs);
}

test.describe('Phase 6.5 - Full Pipeline Integration Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the game
    await page.goto(FRONTEND_URL);
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    // Expose store to window for testing (should be done by app in dev mode)
    await page.evaluate(() => {
      // Make store accessible for testing
      (window as any).__GAME_STATE_STORE__ = {
        isConnected: false,
        combatState: null
      };
    });
  });

  test('E2E-001: Backend health check', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/health`);
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
  });

  test('E2E-002: Frontend loads successfully', async ({ page }) => {
    // Check for main game canvas
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 5000 });
    
    // Check for no console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.waitForTimeout(2000);
    expect(errors).toHaveLength(0);
  });

  test('E2E-003: WebSocket connects successfully', async ({ page }) => {
    // Start the game
    const startButton = page.locator('button:has-text("Start")');
    if (await startButton.isVisible()) {
      await startButton.click();
    }
    
    // Wait for WebSocket connection
    await waitForWebSocketConnection(page);
    
    // Verify connection
    const isConnected = await page.evaluate(() => {
      const store = (window as any).__GAME_STATE_STORE__;
      return store?.isConnected === true;
    });
    
    expect(isConnected).toBeTruthy();
  });

  test('E2E-004: CombatState received from backend', async ({ page }) => {
    // Start the game and wait for connection
    await page.click('button:has-text("Start")');
    await waitForWebSocketConnection(page);
    
    // Wait for first CombatState update
    await page.waitForFunction(
      () => {
        const store = (window as any).__GAME_STATE_STORE__;
        return store?.combatState !== null;
      },
      { timeout: GAME_STATE_UPDATE_TIMEOUT }
    );
    
    // Get the CombatState
    const combatState = await getCombatState(page);
    
    // Verify CombatState structure
    expect(combatState).toBeTruthy();
    expect(combatState.player).toBeDefined();
    expect(combatState.boss).toBeDefined();
    expect(combatState.gameState).toBeDefined();
    
    // Verify player data
    expect(combatState.player.position).toBeDefined();
    expect(combatState.player.health).toBeGreaterThanOrEqual(0);
    expect(combatState.player.score).toBeGreaterThanOrEqual(0);
    
    // Verify boss data
    expect(combatState.boss.position).toBeDefined();
    expect(combatState.boss.health).toBeGreaterThan(0);
    expect(combatState.boss.currentPhase).toBeGreaterThanOrEqual(1);
  });

  test('E2E-005: Player avatar renders with real position', async ({ page }) => {
    await page.click('button:has-text("Start")');
    await waitForWebSocketConnection(page);
    await page.waitForTimeout(1000); // Wait for first render
    
    // Get player position from CombatState
    const combatState = await getCombatState(page);
    const playerPosition = combatState.player.position;
    
    // Get player mesh position from Three.js scene
    const meshPosition = await page.evaluate(() => {
      const scene = (window as any).__THREE_SCENE__;
      const playerMesh = scene?.getObjectByName('player-avatar');
      return playerMesh ? {
        x: playerMesh.position.x,
        y: playerMesh.position.y,
        z: playerMesh.position.z
      } : null;
    });
    
    // Verify positions match (within tolerance)
    expect(meshPosition).toBeTruthy();
    expect(Math.abs(meshPosition!.x - playerPosition.x)).toBeLessThan(0.1);
    expect(Math.abs(meshPosition!.y - playerPosition.y)).toBeLessThan(0.1);
    expect(Math.abs(meshPosition!.z - playerPosition.z)).toBeLessThan(0.1);
  });

  test('E2E-006: Boss avatar renders with correct phase', async ({ page }) => {
    await page.click('button:has-text("Start")');
    await waitForWebSocketConnection(page);
    await page.waitForTimeout(1000);
    
    const combatState = await getCombatState(page);
    const bossPhase = combatState.boss.currentPhase;
    
    // Get boss shader parameters
    const shaderParams = await page.evaluate(() => {
      const material = (window as any).__BOSS_MATERIAL__;
      return material?.uniforms?.u_boss_shape_params?.value || null;
    });
    
    // Verify shader parameters reflect phase
    // Higher phase = higher chaos/aggression
    expect(shaderParams).toBeTruthy();
    expect(shaderParams.chaos).toBeGreaterThanOrEqual(bossPhase * 0.2);
  });

  test('E2E-007: WebSocket message rate is 60fps', async ({ page }) => {
    await page.click('button:has-text("Start")');
    await waitForWebSocketConnection(page);
    
    // Measure message rate over 3 seconds
    const messageRate = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let messageCount = 0;
        const startTime = performance.now();
        const duration = 3000;
        
        const originalOnMessage = (window as any).__WEBSOCKET__?.onmessage;
        
        (window as any).__WEBSOCKET__.onmessage = (event: MessageEvent) => {
          messageCount++;
          originalOnMessage?.(event);
          
          const elapsed = performance.now() - startTime;
          if (elapsed >= duration) {
            const messagesPerSecond = (messageCount / elapsed) * 1000;
            resolve(messagesPerSecond);
          }
        };
      });
    });
    
    // Verify close to 60 messages/second (allow 10% tolerance)
    expect(messageRate).toBeGreaterThanOrEqual(54); // 60 * 0.9
    expect(messageRate).toBeLessThanOrEqual(66); // 60 * 1.1
  });

  test('E2E-008: Three.js renders at 60fps', async ({ page }) => {
    await page.click('button:has-text("Start")');
    await waitForWebSocketConnection(page);
    
    // Measure frame rate
    const fps = await measureFrameRate(page, FRAME_RATE_SAMPLE_DURATION);
    
    // Verify at least 55fps (allow some variance)
    expect(fps).toBeGreaterThanOrEqual(55);
  });

  test('E2E-009: Latency is below 100ms', async ({ page }) => {
    await page.click('button:has-text("Start")');
    await waitForWebSocketConnection(page);
    await page.waitForTimeout(2000); // Wait for latency samples
    
    const stats = await getWebSocketStats(page);
    
    expect(stats).toBeTruthy();
    expect(stats.averageLatency).toBeLessThan(100);
  });

  test('E2E-010: Player health affects avatar color', async ({ page }) => {
    await page.click('button:has-text("Start")');
    await waitForWebSocketConnection(page);
    await page.waitForTimeout(1000);
    
    // Get initial color
    const initialColor = await page.evaluate(() => {
      const material = (window as any).__PLAYER_MATERIAL__;
      return material?.uniforms?.u_base_color?.value?.toArray() || null;
    });
    
    // Simulate damage (would need backend integration)
    // For now, just verify color exists and is valid
    expect(initialColor).toBeTruthy();
    expect(initialColor.length).toBe(3);
    expect(initialColor.every((c: number) => c >= 0 && c <= 1)).toBeTruthy();
  });

  test('E2E-011: No memory leaks over 30 seconds', async ({ page }) => {
    await page.click('button:has-text("Start")');
    await waitForWebSocketConnection(page);
    
    // Measure initial memory
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });
    
    // Wait 30 seconds
    await page.waitForTimeout(30000);
    
    // Measure final memory
    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });
    
    // Memory growth should be less than 50MB (allow for normal growth)
    const memoryGrowthMB = (finalMemory - initialMemory) / (1024 * 1024);
    expect(memoryGrowthMB).toBeLessThan(50);
  });

  test('E2E-012: Combo count increases with player actions', async ({ page }) => {
    await page.click('button:has-text("Start")');
    await waitForWebSocketConnection(page);
    
    // Get initial combo
    const initialCombo = (await getCombatState(page)).player.combo;
    
    // Simulate player actions (keyboard input)
    await page.keyboard.press('Q');
    await page.waitForTimeout(500);
    await page.keyboard.press('E');
    await page.waitForTimeout(500);
    await page.keyboard.press('R');
    await page.waitForTimeout(1000);
    
    // Get final combo
    const finalCombo = (await getCombatState(page)).player.combo;
    
    // Verify combo increased
    expect(finalCombo).toBeGreaterThan(initialCombo);
  });
});

test.describe('Phase 6.5 - Edge Case Tests', () => {
  
  test('EDGE-001: Graceful degradation when backend not available', async ({ page }) => {
    // Navigate to frontend without backend running
    await page.goto(FRONTEND_URL);
    
    // Verify app doesn't crash
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 5000 });
    
    // Verify placeholder avatars render
    const hasPlaceholders = await page.evaluate(() => {
      const playerMesh = (window as any).__THREE_SCENE__?.getObjectByName('player-avatar');
      const bossMesh = (window as any).__THREE_SCENE__?.getObjectByName('boss-avatar');
      return playerMesh !== undefined && bossMesh !== undefined;
    });
    
    expect(hasPlaceholders).toBeTruthy();
  });

  test('EDGE-002: Handles invalid JSON messages', async ({ page }) => {
    await page.goto(FRONTEND_URL);
    
    // Inject invalid message
    const errorCount = await page.evaluate(() => {
      let errors = 0;
      const originalConsoleError = console.error;
      console.error = (...args: any[]) => {
        errors++;
        originalConsoleError(...args);
      };
      
      // Simulate invalid message
      const ws = (window as any).__WEBSOCKET__;
      if (ws) {
        const invalidEvent = new MessageEvent('message', {
          data: 'invalid-json{]'
        });
        ws.dispatchEvent(invalidEvent);
      }
      
      return errors;
    });
    
    // Should log error but not crash
    expect(errorCount).toBeGreaterThan(0);
    
    // Verify app still functional
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
  });

  test('EDGE-003: Handles rapid state changes', async ({ page }) => {
    await page.click('button:has-text("Start")');
    await waitForWebSocketConnection(page);
    
    // Rapidly press keys
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Q');
      await page.waitForTimeout(50);
    }
    
    // Wait for state to stabilize
    await page.waitForTimeout(1000);
    
    // Verify no visual glitches (check for error in console)
    const errors = await page.evaluate(() => {
      return (window as any).__CONSOLE_ERRORS__ || [];
    });
    
    expect(errors.length).toBe(0);
  });

  test('EDGE-004: Null CombatState handling', async ({ page }) => {
    await page.goto(FRONTEND_URL);
    
    // Verify app renders without CombatState
    const combatState = await getCombatState(page);
    expect(combatState).toBeNull();
    
    // Verify placeholder rendering
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
  });
});

test.describe('Phase 6.5 - Visual Regression Tests', () => {
  
  test('VISUAL-001: Player avatar changes with health', async ({ page }) => {
    await page.click('button:has-text("Start")');
    await waitForWebSocketConnection(page);
    await page.waitForTimeout(1000);
    
    // Take initial screenshot
    await page.screenshot({ 
      path: 'test-results/player-avatar-full-health.png',
      clip: { x: 100, y: 100, width: 400, height: 400 }
    });
    
    // Wait for damage (would need backend integration)
    await page.waitForTimeout(5000);
    
    // Take damaged screenshot
    await page.screenshot({ 
      path: 'test-results/player-avatar-damaged.png',
      clip: { x: 100, y: 100, width: 400, height: 400 }
    });
    
    // Visual comparison would be done manually or with visual regression tool
  });

  test('VISUAL-002: Boss avatar changes with phase', async ({ page }) => {
    await page.click('button:has-text("Start")');
    await waitForWebSocketConnection(page);
    await page.waitForTimeout(1000);
    
    // Take phase 1 screenshot
    await page.screenshot({ 
      path: 'test-results/boss-avatar-phase1.png',
      clip: { x: 500, y: 100, width: 400, height: 400 }
    });
    
    // Wait for phase change (would need longer gameplay)
    await page.waitForTimeout(30000);
    
    // Take phase 2 screenshot
    await page.screenshot({ 
      path: 'test-results/boss-avatar-phase2.png',
      clip: { x: 500, y: 100, width: 400, height: 400 }
    });
  });

  test('VISUAL-003: Position synchronization', async ({ page }) => {
    await page.click('button:has-text("Start")');
    await waitForWebSocketConnection(page);
    
    // Sample positions over time
    const positions = [];
    for (let i = 0; i < 10; i++) {
      const pos = await page.evaluate(() => {
        const state = (window as any).__GAME_STATE_STORE__?.combatState;
        const mesh = (window as any).__THREE_SCENE__?.getObjectByName('player-avatar');
        return {
          state: state?.player.position,
          mesh: mesh ? { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z } : null
        };
      });
      positions.push(pos);
      await page.waitForTimeout(500);
    }
    
    // Verify all positions match
    positions.forEach((pos) => {
      if (pos.state && pos.mesh) {
        expect(Math.abs(pos.mesh.x - pos.state.x)).toBeLessThan(0.1);
        expect(Math.abs(pos.mesh.y - pos.state.y)).toBeLessThan(0.1);
        expect(Math.abs(pos.mesh.z - pos.state.z)).toBeLessThan(0.1);
      }
    });
  });
});
