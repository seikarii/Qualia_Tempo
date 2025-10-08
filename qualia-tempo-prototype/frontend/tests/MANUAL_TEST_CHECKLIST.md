# Phase 6.5 - Manual Test Checklist
**Date:** October 8, 2025  
**Purpose:** Visual validation and interactive testing of complete data pipeline

## Prerequisites

- [ ] Backend running on http://localhost:8000
- [ ] Frontend running on http://localhost:5173
- [ ] Browser DevTools open (Console + Network tabs)
- [ ] Three.js Inspector extension installed (optional but recommended)

---

## Test Category 1: Initial Connection & Data Flow

### 1.1. Application Startup

- [ ] Navigate to http://localhost:5173
- [ ] Verify no console errors on page load
- [ ] Verify canvas element is visible
- [ ] Verify main menu/start button is visible

**Expected Result:** Clean startup with no errors, UI elements visible

### 1.2. WebSocket Connection

- [ ] Click "Start Game" button
- [ ] Check console for WebSocket connection message:
  ```
  [GameStateStreamingService] WebSocket connected to ws://localhost:8000/ws/game_state
  ```
- [ ] Check Network tab → WS → verify connection status is "101 Switching Protocols"
- [ ] Verify no WebSocket errors in console

**Expected Result:** WebSocket connects successfully within 2 seconds

### 1.3. CombatState Reception

- [ ] Wait 2 seconds after game start
- [ ] Open console and type:
  ```javascript
  window.__GAME_STATE_STORE__?.combatState
  ```
- [ ] Verify CombatState object is not null
- [ ] Verify `player` object has position, health, score, combo
- [ ] Verify `boss` object has position, health, currentPhase

**Expected Result:** CombatState object populated with valid data

### 1.4. Message Rate Validation

- [ ] In Network tab → WS → click on connection
- [ ] Click "Messages" subtab
- [ ] Count messages received over 5 seconds
- [ ] Calculate messages/second (should be ~60)

**Expected Result:** 58-62 messages per second (60fps ±2)

---

## Test Category 2: Avatar Visual Integration

### 2.1. Player Avatar Position

- [ ] Observe player avatar in scene (should be visible)
- [ ] Get CombatState player position:
  ```javascript
  const state = window.__GAME_STATE_STORE__?.combatState;
  console.log('Player Position:', state.player.position);
  ```
- [ ] Get Three.js mesh position:
  ```javascript
  const scene = window.__THREE_SCENE__;
  const playerMesh = scene.getObjectByName('player-avatar');
  console.log('Mesh Position:', playerMesh.position);
  ```
- [ ] Verify positions match (within 0.1 units)

**Expected Result:** Player mesh position matches CombatState position

### 2.2. Player Avatar Health Effects

- [ ] Note initial player health:
  ```javascript
  console.log('Health:', window.__GAME_STATE_STORE__?.combatState.player.health);
  ```
- [ ] Observe avatar color/size
- [ ] Wait for player to take damage
- [ ] Observe color change (should become more red/smaller)
- [ ] Verify health decreased in CombatState

**Expected Result:** Visual changes correlate with health changes

### 2.3. Boss Avatar Phase

- [ ] Get boss phase:
  ```javascript
  console.log('Boss Phase:', window.__GAME_STATE_STORE__?.combatState.boss.currentPhase);
  ```
- [ ] Observe boss avatar complexity
- [ ] Get shader parameters:
  ```javascript
  const material = window.__BOSS_MATERIAL__;
  console.log('Chaos:', material.uniforms.u_boss_shape_params.value.x);
  console.log('Aggression:', material.uniforms.u_boss_shape_params.value.y);
  ```
- [ ] Verify higher phase = higher chaos/aggression values

**Expected Result:** Boss visual complexity increases with phase

### 2.4. Combo Visual Effects

- [ ] Press Q, E, R keys rapidly
- [ ] Watch for combo count increase:
  ```javascript
  console.log('Combo:', window.__GAME_STATE_STORE__?.combatState.player.combo);
  ```
- [ ] Observe particle effects or visual intensity changes
- [ ] Verify visual feedback correlates with combo count

**Expected Result:** Visual intensity increases with combo

---

## Test Category 3: Performance Validation

### 3.1. Frame Rate Measurement

- [ ] Press F12 → Performance tab
- [ ] Click "Record" button
- [ ] Play game for 10 seconds
- [ ] Stop recording
- [ ] Check FPS chart (should be stable around 60fps)
- [ ] Check for frame drops (red bars)

**Expected Result:** Stable 60fps with minimal drops

### 3.2. Latency Check

- [ ] Open console and type:
  ```javascript
  const stats = window.__WEBSOCKET_STATS__;
  console.log('Average Latency:', stats.averageLatency, 'ms');
  ```
- [ ] Verify latency < 100ms (localhost should be < 50ms)
- [ ] Sample latency multiple times to verify it's updating

**Expected Result:** Latency < 50ms on localhost

### 3.3. Memory Leak Check

- [ ] Press F12 → Memory tab
- [ ] Take heap snapshot (initial)
- [ ] Play game for 60 seconds
- [ ] Take heap snapshot (final)
- [ ] Compare snapshots → check delta
- [ ] Verify heap growth < 50MB

**Expected Result:** Minimal heap growth, no exponential increase

### 3.4. CPU Usage

- [ ] Press F12 → Performance tab → Settings (gear icon)
- [ ] Enable "Show CPU chart"
- [ ] Record 10 seconds of gameplay
- [ ] Check CPU usage in timeline
- [ ] Verify no sustained 100% CPU usage

**Expected Result:** CPU usage < 80% average

---

## Test Category 4: Edge Cases

### 4.1. Null CombatState Handling

- [ ] Refresh page (don't start game yet)
- [ ] Open console and type:
  ```javascript
  console.log('CombatState:', window.__GAME_STATE_STORE__?.combatState);
  ```
- [ ] Verify it's null
- [ ] Verify canvas still renders (placeholder avatars)
- [ ] Verify no console errors

**Expected Result:** Graceful degradation with placeholders

### 4.2. Connection Drop Recovery

- [ ] Start game and wait for connection
- [ ] Stop backend server: `Ctrl+C` in backend terminal
- [ ] Check console for disconnection message
- [ ] Check for reconnection attempts
- [ ] Restart backend server
- [ ] Verify auto-reconnection
- [ ] Verify CombatState updates resume

**Expected Result:** Automatic reconnection within 10 seconds

### 4.3. Rapid Input Handling

- [ ] Start game
- [ ] Rapidly press Q, E, R keys (20 times in 2 seconds)
- [ ] Check console for errors
- [ ] Verify game doesn't freeze or glitch
- [ ] Verify combo count updates correctly

**Expected Result:** Smooth handling, no crashes

### 4.4. Network Throttling

- [ ] Open DevTools → Network tab
- [ ] Set throttling to "Slow 3G"
- [ ] Start game
- [ ] Observe gameplay (will be laggy)
- [ ] Check for console errors
- [ ] Verify no crashes

**Expected Result:** Degraded but functional gameplay

---

## Test Category 5: Visual Regression

### 5.1. Screenshot Baseline

- [ ] Start game
- [ ] Wait 5 seconds for stable state
- [ ] Take screenshot of full screen
- [ ] Save as `baseline-full-health.png`
- [ ] Note player health, boss phase, combo count

**Baseline Reference:** Keep for future comparisons

### 5.2. Damaged State

- [ ] Wait for player to take damage
- [ ] Take screenshot when health < 50
- [ ] Save as `damaged-state.png`
- [ ] Compare with baseline visually

**Expected Result:** Visual differences (color, size, intensity)

### 5.3. Boss Phase Transition

- [ ] Play until boss phase changes
- [ ] Take screenshot of each phase
- [ ] Save as `boss-phase-1.png`, `boss-phase-2.png`, `boss-phase-3.png`
- [ ] Compare screenshots

**Expected Result:** Progressive visual complexity increase

### 5.4. Fractal Mode

- [ ] Build combo > 40 to activate transcendence
- [ ] Observe Mandelbulb fractal rendering
- [ ] Take screenshot
- [ ] Save as `fractal-mode.png`

**Expected Result:** Mandelbulb fractal renders at player position

---

## Test Category 6: Ping/Pong Health Monitoring

### 6.1. Ping Interval

- [ ] Start game and connect
- [ ] Open Network tab → WS → Messages
- [ ] Filter for "ping" messages
- [ ] Note timestamps of 3 consecutive pings
- [ ] Calculate intervals (should be ~15 seconds)

**Expected Result:** Ping every 15 seconds ±2s

### 6.2. Pong Response

- [ ] Monitor WS messages
- [ ] For each ping, verify pong response
- [ ] Measure response time (< 5 seconds)

**Expected Result:** Pong within 5 seconds of each ping

### 6.3. Ping Timeout

- [ ] Block pong responses (requires backend modification)
- [ ] Wait for ping timeout
- [ ] Verify connection closes
- [ ] Verify reconnection attempt

**Expected Result:** Connection closes after 5s timeout

---

## Test Category 7: Latency Tracking

### 7.1. Circular Buffer

- [ ] Start game
- [ ] Wait 10 seconds
- [ ] Check buffer size:
  ```javascript
  console.log('Buffer Size:', window.__LATENCY_BUFFER__?.length);
  ```
- [ ] Verify size ≤ 100

**Expected Result:** Buffer maintains 100 samples max

### 7.2. Rolling Average

- [ ] Get latency samples:
  ```javascript
  const buffer = window.__LATENCY_BUFFER__;
  const manualAvg = buffer.reduce((a,b) => a+b, 0) / buffer.length;
  const reportedAvg = window.__WEBSOCKET_STATS__?.averageLatency;
  console.log('Manual:', manualAvg, 'Reported:', reportedAvg);
  ```
- [ ] Verify values match (within 1ms)

**Expected Result:** Rolling average calculation is accurate

---

## Test Completion Checklist

After completing all tests, verify:

- [ ] All automated tests passed (E2E, WebSocket stability)
- [ ] All manual visual tests passed
- [ ] No critical bugs found
- [ ] Performance targets met (60fps, <50ms latency, <50MB memory growth)
- [ ] Edge cases handled gracefully
- [ ] Documentation updated (RUTA.md, TODO.md, CHANGELOG.md)
- [ ] Architectural linter passed
- [ ] Session report created

---

## Reporting Results

After testing, create summary in `test-results-phase65/manual-test-results.md`:

```markdown
# Manual Test Results - Phase 6.5

**Tester:** [Your Name]
**Date:** [Date]
**Duration:** [Duration]

## Summary
- Total Tests: [X]
- Passed: [X]
- Failed: [X]
- Skipped: [X]

## Failed Tests
1. [Test ID] - [Description]
   - Expected: [Expected Result]
   - Actual: [Actual Result]
   - Screenshot: [Path]

## Notes
[Any additional observations]

## Recommendations
[Suggested improvements or follow-up work]
```

---

**End of Manual Test Checklist**
