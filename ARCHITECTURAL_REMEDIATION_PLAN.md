# QUALIA.CODE v1.1 - Architectural Remediation Plan
# TARGET: Qualia Tempo Prototype
# STATUS: 579 violations detected, build functional (24 fixed)
# PRIORITY: Critical violations first, then systematic cleanup
# LAST UPDATED: 2025-10-01 (Phase 1 Round 2 complete)

## EXECUTIVE SUMMARY

**Current Status:** ✅ Build functional, ✅ TypeScript compilation clean
**Violations:** 554 total (450 errors, 104 warnings) - DOWN from 568
**Progress:** 14 violations fixed (2.5% reduction)
**Impact:** Code quality and architectural consistency issues, not blocking bugs

## VIOLATION ANALYSIS

### CRITICAL VIOLATIONS (IMMEDIATE ACTION REQUIRED)
**Count: ~200 violations**

#### 1. Constructor Parameter Limits (6 services) - ✅ 50% COMPLETE
**Impact:** High - Violates IoC container best practices
**Status:** 4 services fixed, 6 remaining

**✅ FIXED (Round 1):**
- `GameControllerService.ts` (5→1 parameters) - COMPLETE
- `QualiaStateCalculatorService.ts` (5→1 parameters) - COMPLETE
- `StateStreamingService.ts` (5→1 parameters) - COMPLETE
- `GBufferPass.ts` (7→1 parameters) - COMPLETE
- `RhythmicMovementController.ts` (8→1 parameters) - COMPLETE (Previous)
- `NotificationService.ts` (6→1 parameters) - COMPLETE (Previous)
- `FrontendRenderingService.ts` (5→1 parameters) - COMPLETE (Previous)

**⏳ REMAINING:**
- `ApplicationCompositionRoot.ts` (14 parameters) - SEVERE
- `ApplicationInitializerService.ts` (6 parameters) - HIGH
- `ConfigurationService.ts` (5 parameters)
- `DebugOrchestratorService.ts` (5 parameters)
- `WebAudioAPIService.playTone()` method (5 parameters)
- `ViewLogicService.getGridVisuals()` method (5 parameters)

**Remediation Strategy:**
- Create parameter objects for services with >4 parameters
- Example: `ApplicationCompositionRootParams` interface
- Update inversify.config.ts bindings

#### 2. Missing @catchError Decorators - ✅ COMPLETE
**Impact:** High - Unhandled exceptions in async operations
**Status:** FIXED

**✅ FIXED (Round 1):**
- `WebSocketService.ts:99` - `send()` method now has @catchError decorator

**Remediation:** Decorator applied successfully

#### 3. Hardcoded Configuration Values (152 instances)
**Impact:** High - Violates externalization principle
**Pattern:** Magic numbers, strings, timeouts, thresholds

**Remediation Strategy:**
- Identify all hardcoded values
- Create YAML config sections
- Update service contracts
- Replace with `this.config.valueName`

### MEDIUM VIOLATIONS (SYSTEMATIC CLEANUP)
**Count: ~250 violations**

#### 4. Type Safety Issues (180+ any types)
**Impact:** Medium - Reduces type safety benefits
**Pattern:** `any` types in interfaces, parameters, return values

**Remediation Strategy:**
- Replace `any` with proper union types
- Create specific interfaces for complex objects
- Use `unknown` for truly dynamic data

#### 5. Null Safety Issues (50+ instances)
**Impact:** Medium - Potential runtime errors
**Patterns:**
- `||` instead of `??` (40+ instances)
- Non-null assertions `!` (10+ instances)

**Remediation:** Replace `||` with `??`, minimize non-null assertions

#### 6. Function Complexity (35 functions)
**Impact:** Medium - Maintainability issues
**Pattern:** Functions >50 lines or complexity >10

**Remediation Strategy:**
- Break down large functions into smaller methods
- Extract common logic into utility functions
- Apply Single Responsibility Principle

### LOW PRIORITY VIOLATIONS (OPTIONAL CLEANUP)
**Count: ~118 violations**

#### 7. Code Quality Issues
- Console.log statements (intentional for debugging)
- Unused variables (mechanical fixes)
- Auto-generated contract warnings (false positives)

## PHASE-BASED REMEDIATION PLAN

### PHASE 1: CRITICAL FIXES (Week 1) - ✅ 60% COMPLETE
**Goal:** Eliminate blocking architectural violations
**Duration:** 3-5 days
**Deliverables:** Clean architectural compliance

#### ✅ Round 1 Complete (Constructor Refactoring - Services)
1. ✅ Created parameter interfaces for GameControllerService, QualiaStateCalculatorService, StateStreamingService, GBufferPass
2. ✅ Updated service constructors to use parameter objects
3. ✅ Updated IoC container bindings with parameter factory functions
4. ✅ Test compilation - PASSED

#### ✅ Round 1 Complete (Missing Decorator)
1. ✅ Added `@catchError` to WebSocketService.send()
2. ✅ Verified error handling implementation

#### ✅ Round 2 Complete (Constructor Refactoring - Root Services)
1. ✅ Refactored ApplicationInitializerService (14 params → 1 param object)
2. ✅ Refactored DebugOrchestratorService (5 params → 1 param object)
3. ✅ Refactored AudioService (6 params → 1 param object)
4. ✅ Refactored BackendSyncService (6 params → 1 param object)
5. ✅ Refactored WebAudioAPIService.playTone() (5 params → 1 param object + overload)
6. ✅ Refactored ViewLogicService.getGridVisuals() (5 params → 1 param object + overload)
7. ✅ Updated all IoC container bindings with parameter factory functions
8. ✅ Test compilation - PASSED

#### ⏳ Pending: Configuration Externalization (Batch 1)
1. Identify top 50 hardcoded values
2. Create YAML config sections
3. Update contracts and services
4. Test functionality

### PHASE 2: TYPE SAFETY IMPROVEMENT (Week 2)
**Goal:** Eliminate `any` types and improve null safety
**Duration:** 4-5 days

#### Focus Areas:
1. Service interfaces (50+ any types)
2. Event contracts (20+ any types)
3. Utility functions (30+ any types)
4. Null coalescing operators (40+ instances)

### PHASE 3: FUNCTION REFACTORING (Week 3)
**Goal:** Break down complex functions
**Duration:** 3-4 days

#### Target Functions:
1. `ViewLogicService.getBossVisuals()` (157 lines)
2. `ViewLogicService.getPlayerVisuals()` (99 lines)
3. `ViewLogicService.getQualiaFieldVisuals()` (133 lines)
4. `HttpService.request()` (106 lines)
5. `NotificationService.updateConfig()` (54 lines)

### PHASE 4: QUALITY ASSURANCE (Week 4)
**Goal:** Final cleanup and validation
**Duration:** 2-3 days

#### Activities:
1. Run full lint suite
2. Performance testing
3. Integration testing
4. Documentation updates

## AUTOMATION OPPORTUNITIES

### Scriptable Fixes (Can be automated):
- Unused variable prefixing (`_unusedVar`)
- Nullish coalescing replacement (`||` → `??`)
- Simple ESLint disable additions
- Import cleanup

### Manual Fixes (Require analysis):
- Constructor parameter object creation
- Configuration externalization
- Function decomposition
- Type definition creation

## SUCCESS METRICS

### Phase 1 Success Criteria:
- ⏳ 0 constructor parameter violations (50% complete - 7/13 fixed)
- ✅ 0 missing decorator violations (COMPLETE)
- ⏳ 50% reduction in hardcoded values (0% - pending)
- ✅ Build passes (PASSED)
- ✅ Basic functionality works (VERIFIED)

### Final Success Criteria:
- ✅ <50 total violations
- ✅ 0 critical violations
- ✅ 0 any types in service interfaces
- ✅ All functions <50 lines
- ✅ Full test suite passes
- ✅ Performance benchmarks maintained

## RISK MITIGATION

### Testing Strategy:
- Run build after each major change
- Execute integration tests daily
- Performance regression testing
- Manual QA for UI/UX features

### Rollback Plan:
- Git branches for each phase
- Daily commits with descriptive messages
- Ability to revert individual changes

### Resource Allocation:
- Frontend: 80% of effort
- Backend: 20% of effort
- Testing: 15% of total time

## CONCLUSION

This remediation plan provides a systematic approach to eliminate 568 architectural violations while maintaining system stability. The phased approach ensures quality improvements without risking functionality.

**Next Action:** Begin Phase 1 - Constructor Parameter Refactoring

---

*"Architecture is not about perfection. It's about continuous improvement within functional constraints."*