# Frontend Test Coverage Report

## Test Results Summary

- **Test Files**: 13 failed | 11 passed (24 total)
- **Tests**: 46 failed | 141 passed (187 total)
- **Success Rate**: 75.4% (141/187 tests passing)

## Failing Tests Analysis

### 1. QualiaMainMenu.test.tsx (1 failed)
**File**: `qualia-tempo-prototype/frontend/src/__tests__/QualiaMainMenu.test.tsx`

**Failing Test**:
- ❌ `integrates with EventBus for game state management` - Test timed out in 1000ms

**Root Cause**: The test is still timing out despite adding `async`/`await` and `waitFor`. This suggests the EventBus emission is not happening or there's a deeper issue with the component's async behavior.

### 2. OntologicalAudioEngine.test.ts (11 failed)
**File**: `qualia-tempo-prototype/frontend/src/__tests__/OntologicalAudioEngine.test.tsx`

**Failing Tests**:
- ❌ `should create entity voice with qualia-mapped parameters` - Tone.PolySynth not called
- ❌ `should not create duplicate voices for the same entity` - Tone.PolySynth not called
- ❌ `should update entity sound parameters when qualia state changes` - Cannot read properties of undefined
- ❌ `should not trigger sound for low aggression states` - Cannot read properties of undefined
- ❌ `should remove entity voice and dispose resources` - Cannot read properties of undefined
- ❌ `should process clustering behavior` - Tone.PolySynth not called
- ❌ `should process synchronization behavior` - Tone.PolySynth not called
- ❌ `should process state propagator behavior` - Tone.PolySynth not called
- ❌ `should process narrative event behavior` - Tone.PolySynth not called
- ❌ `should map different intensity levels to appropriate parameters` - Tone.PolySynth not called
- ❌ `should handle complete audio workflow` - Tone.PolySynth not called

**Root Cause**: Issues with Tone.js mocking - the mock setup is not working correctly, causing undefined references and missing function calls.

### 3. main.test.ts (10 failed)
**File**: `qualia-tempo-prototype/frontend/src/__tests__/main.test.ts`

**Failing Tests**:
- ❌ `should register app event listeners` - App event listeners not registered
- ❌ `should create BrowserWindow with correct configuration` - BrowserWindow not created
- ❌ `should load production file when not in dev mode` - LoadFile not called
- ❌ `should register window event handlers` - Window event handlers not registered
- ❌ `should register fullscreen toggle handler` - IPC handler not registered
- ❌ `should register window minimize handler` - IPC handler not registered
- ❌ `should register window close handler` - IPC handler not registered
- ❌ `should handle window-all-closed event` - Cannot assign to read-only property 'platform'
- ❌ `should handle web-contents-created for security` - setWindowOpenHandler not a function
- ❌ `should prevent navigation to external URLs` - setWindowOpenHandler not a function

**Root Cause**: Electron mocking issues - the mocks for Electron APIs are not set up correctly.

### 4. BackendCanvas.test.tsx (15 failed)
**File**: `qualia-tempo-prototype/frontend/src/components/__tests__/BackendCanvas.test.tsx`

**Failing Tests**: All 15 tests failing
- ❌ Component Initialization tests
- ❌ Canvas Rendering tests
- ❌ Connection Status Display tests
- ❌ Performance Monitoring tests
- ❌ Error Handling tests
- ❌ Canvas Sizing tests

**Root Cause**: DOM appendChild errors - "Failed to execute 'appendChild' on 'Node': parameter 1 is not of type 'Node'". This suggests issues with React component rendering in the test environment.

### 5. StreamingVideoService.test.ts (7 failed)
**File**: `qualia-tempo-prototype/frontend/src/services/__tests__/StreamingVideoService.test.ts`

**Failing Tests**:
- ❌ `should return initial connection status` - Expected 'disconnected' but got undefined
- ❌ `should handle disconnection` - Expected 'disconnected' but got undefined
- ❌ `should establish connection and update status correctly` - Cannot read properties of undefined (_simulateOpen)
- ❌ `should handle connection errors gracefully` - Cannot read properties of undefined (_simulateError)
- ❌ `should receive and process video frames correctly` - Cannot read properties of undefined (_simulateOpen)
- ❌ `should handle multiple frame subscribers correctly` - Cannot read properties of undefined (_simulateOpen)
- ❌ `should handle malformed frame data gracefully` - Cannot read properties of undefined (_simulateOpen)

**Root Cause**: WebSocket mocking issues - the mock WebSocket instances don't have the expected simulation methods.

### 6. AudioService.test.ts (1 failed)
**File**: `qualia-tempo-prototype/frontend/src/services/__tests__/AudioService.test.ts`

**Failing Test**:
- ❌ `should not remove entity voice when not initialized` - Logger warning not called

**Root Cause**: Logger mock expectation mismatch.

### 7. index.test.tsx (1 failed)
**File**: `qualia-tempo-prototype/frontend/src/__tests__/index.test.tsx`

**Failing Test**:
- ❌ `should run the full initialization script on import` - Window event listener not registered

**Root Cause**: Window event listener mocking issues.

### 8. hooks.test.tsx (1 failed)
**File**: `qualia-tempo-prototype/frontend/src/__tests__/hooks.test.tsx`

**Failing Test**:
- ❌ `should throw a descriptive error for an unregistered service` - Service resolution error

**Root Cause**: Service container mocking issues.

### 9. Service Integration Tests (5 failed)
**Files**:
- `src/services/__tests__/DebugService.test.ts`
- `src/services/__tests__/ErrorReportingService.test.ts`
- `src/services/__tests__/GameStateStoreService.test.ts`
- `src/services/__tests__/NotificationService.test.ts`
- `src/services/__tests__/RhythmicMovementController.test.ts`

**Root Cause**: Missing decorator mocks - "No 'measureTime' export" and "No 'validateEventProperty' export" defined on the decorators mock.

### 10. QualiaTempoGame.test.tsx (1 failed)
**File**: `qualia-tempo-prototype/frontend/src/components/game/__tests__/QualiaTempoGame.test.tsx`

**Root Cause**: Missing dependency - "Failed to resolve import '@testing-library/vi-dom'". This package is not installed.

## Frontend Files Coverage Analysis

### Files with Tests

| File | Test Coverage | Status |
|------|---------------|---------|
| `src/__tests__/providers.test.ts` | ✅ 90ms (4 tests) | **PASSING** |
| `src/__tests__/main.test.ts` | ❌ 329ms (16 tests, 10 failed) | **FAILING** |
| `src/__tests__/hooks.test.tsx` | ⚠️ 89ms (3 tests, 1 failed) | **MOSTLY PASSING** |
| `src/components/__tests__/Subtitles.test.tsx` | ✅ 93ms (6 tests) | **PASSING** |
| `src/utils/__tests__/env.test.ts` | ✅ 90ms (3 tests) | **PASSING** |
| `src/state/__tests__/useGameStore.test.ts` | ✅ 86ms (6 tests) | **PASSING** |
| `src/__tests__/EventBus.test.ts` | ✅ ~200ms (3 tests) | **PASSING** |
| `src/__tests__/BackendSyncService.test.ts` | ✅ 44ms (11 tests) | **PASSING** |
| `src/__tests__/QualiaStateCalculatorService.test.ts` | ✅ 64ms (20 tests) | **PASSING** |
| `src/__tests__/index.test.tsx` | ❌ 776ms (1 test, 1 failed) | **FAILING** |
| `src/services/__tests__/StreamingVideoService.test.ts` | ❌ 75ms (11 tests, 7 failed) | **MOSTLY FAILING** |
| `src/__tests__/GameControllerService.test.ts` | ✅ 72ms (11 tests) | **PASSING** |
| `src/__tests__/OntologicalAudioEngine.test.ts` | ❌ 90ms (17 tests, 11 failed) | **MOSTLY FAILING** |
| `src/services/__tests__/AudioService.test.ts` | ⚠️ 119ms (22 tests, 1 failed) | **MOSTLY PASSING** |
| `src/services/__tests__/hooks.test.tsx` | ✅ 131ms (6 tests) | **PASSING** |
| `src/__tests__/ConfigurationService.test.ts` | ✅ 105ms (21 tests) | **PASSING** |
| `src/__tests__/QualiaMainMenu.test.tsx` | ⚠️ 1208ms (3 tests, 1 failed) | **MOSTLY PASSING** |

### Files without Tests

| File | Estimated Coverage | Notes |
|------|-------------------|--------|
| `src/App.tsx` | 0% | Main App component - needs testing |
| `src/index.css` | N/A | CSS file - no test coverage needed |
| `src/main.ts` | 0% | Application entry point - needs testing |
| `src/providers.ts` | 0% | Provider setup - needs testing |
| `src/audio/IOntologicalAudioEngine.ts` | N/A | Interface - no test coverage needed |
| `src/audio/OntologicalAudioEngine.ts` | 0% | Audio engine implementation - needs testing |
| `src/schemas/index.ts` | 0% | Schema definitions - needs testing |
| `src/utils/decorators.ts` | 0% | Decorator utilities - needs testing |
| `src/utils/env.ts` | 0% | Environment utilities - needs testing |
| `src/components/QualiaMainMenu.tsx` | ~33% | Has some tests but incomplete coverage |
| `src/components/BackendCanvas.tsx` | 0% | All tests failing - needs fixing |
| `src/components/Subtitles.tsx` | ~100% | Fully tested |
| `src/components/game/QualiaTempoGame.tsx` | 0% | No tests - needs testing |
| `src/services/EventBus.ts` | ~100% | Fully tested |
| `src/services/BackendSyncService.ts` | ~100% | Fully tested |
| `src/services/QualiaStateCalculatorService.ts` | ~100% | Fully tested |
| `src/services/GameControllerService.ts` | ~100% | Fully tested |
| `src/services/ConfigurationService.ts` | ~100% | Fully tested |
| `src/services/StreamingVideoService.ts` | ~36% | Some tests but mostly failing |
| `src/services/AudioService.ts` | ~95% | Almost fully tested |
| `src/services/DebugService.ts` | 0% | All tests failing |
| `src/services/ErrorReportingService.ts` | 0% | All tests failing |
| `src/services/GameStateStoreService.ts` | 0% | All tests failing |
| `src/services/NotificationService.ts` | 0% | All tests failing |
| `src/services/RhythmicMovementController.ts` | 0% | All tests failing |
| `src/services/hooks.ts` | ~100% | Fully tested |
| `src/state/useGameStore.ts` | ~100% | Fully tested |

## Recommendations

### High Priority Fixes
1. **Fix decorator mocking** - Add missing `measureTime` and `validateEventProperty` exports to decorators mock
2. **Fix BackendCanvas DOM issues** - Resolve appendChild errors in test environment
3. **Fix WebSocket mocking** - Add missing simulation methods to WebSocket mocks
4. **Install missing dependencies** - Add `@testing-library/vi-dom` package

### Medium Priority Fixes
1. **Fix Electron mocking** - Improve Electron API mocks in main.test.ts
2. **Fix Tone.js mocking** - Resolve PolySynth and audio engine mocking issues
3. **Fix QualiaMainMenu timeout** - Investigate why EventBus emission is still timing out

### Test Coverage Improvements
1. **Add tests for App.tsx** - Main application component needs test coverage
2. **Add tests for main.ts** - Entry point needs testing
3. **Add tests for game components** - QualiaTempoGame needs comprehensive testing
4. **Add tests for utility functions** - Decorators, env, and other utilities need testing

### Overall Assessment
- **Current Coverage**: ~75% of tests passing
- **Critical Issues**: 5 test files completely failing (BackendCanvas, DebugService, ErrorReportingService, GameStateStoreService, NotificationService, RhythmicMovementController)
- **Mocking Issues**: Widespread problems with service and external library mocking
- **Recommendation**: Fix critical mocking issues first, then focus on adding missing test coverage for untested components