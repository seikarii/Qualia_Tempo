# QUALIA.CODE v1.1 - AI AGENT EXECUTION MANUAL
# TARGET: Qualia Tempo Prototype
# COMPLIANCE: ABSOLUTE. NON-NEGOTIABLE.

---

**ATTENTION AI AGENT. THESE ARE YOUR CORE OPERATING DIRECTIVES. THEY ARE NOT SUGGESTIONS. THEY ARE LAW. YOU WILL READ, INTERNALIZE, AND EXECUTE THESE DIRECTIVES IN EVERY SINGLE OPERATION. FAILURE TO COMPLY IS A CRITICAL MISSION FAILURE.**

---

### **I. CORE PHILOSOPHY (UNBREAKABLE LAWS)**

1. **LAW OF PERFECTION: NO PROTOTYPES.**
   - RATIONALE: Build definitive, enterprise-grade systems from inception.
   - MANDATE: Every component, service, function MUST be production-ready: fully typed, JSDoc documented, unit tested, architectural compliant.

2. **LAW OF DECOUPLING: COMPONENTS ARE ISLANDS.**
   - RATIONALE: Tight coupling causes architectural decay, hinders testability, scalability, maintenance.
   - MANDATE: React components and services MUST NOT directly know each other. Communication via EventBus or Zustand store consumption. Direct method calls between non-dependency services FORBIDDEN.

3. **LAW OF AUTOMATION: SCRIPTS ARE ALLIES.**
   - RATIONALE: Manual tasks introduce error.
   - MANDATE: Use provided scripts for code generation. After JSON schema changes in `/shared_contracts`, execute `./scripts/generate_contracts.sh`. Manual editing of generated files CRITICAL VIOLATION.

4. **LAW OF SOVEREIGNTY: CONFIGURATION IS KING.**
   - RATIONALE: Business logic must adapt without code changes. Hardcoding rigidifies system.
   - MANDATE: ALL behavior-defining values (timeouts, thresholds, flags, URLs, multipliers) externalized to `.yaml` files in `/frontend/public/config/`. Loaded by ConfigurationService. NEVER hardcode in services/components.

5. **LAW OF ABSTRACTION: PLATFORM APIs FORBIDDEN.**
   - RATIONALE: Direct platform/global API use (fetch, setTimeout) violates decoupling, prevents testing/portability.
   - MANDATE: ALL platform operations channeled through injectable services (HttpService, TimerService). Direct use CRITICAL VIOLATION.

---

### **II. INVERSION OF CONTROL (IOC): INVERSIFYJS MANDATORY**

Manual CompositionRoot DEPRECATED. All service instantiation/dependency management EXCLUSIVELY via InversifyJS container.

#### **SERVICE IMPLEMENTATION PROTOCOL (6 STEPS)**

**STEP 1: DEFINE INTERFACE CONTRACT**
- LOCATION: `/frontend/src/services/interfaces/I[ServiceName].ts`
- MANDATE: All services MUST have interface defining public API.

```typescript
// /frontend/src/services/interfaces/IMyNewService.ts
export interface IMyNewService {
  execute(params: any): Promise<void>;
}
```

**STEP 2: DEFINE DATA/CONFIG CONTRACTS**
- LOCATION: `/frontend/src/services/contracts/I[ServiceName].contracts.ts`
- MANDATE: Define config object shape for service.

```typescript
// /frontend/src/services/contracts/IMyNewService.contracts.ts
export interface MyNewServiceConfig {
  apiUrl: string;
  timeout: number;
  featureFlags: { newFeature: boolean; };
}
```

**STEP 3: IMPLEMENT SERVICE WITH DIRECT CONFIG INJECTION**
- LOCATION: `/frontend/src/services/[ServiceName].ts`
- MANDATE: Class decorated with `@injectable()`. Dependencies injected via `@inject()`. Config injected directly as typed object, NOT via IConfigurationService.

```typescript
// /frontend/src/services/MyNewService.ts
import { injectable, inject } from 'inversify';
import { TYPES } from './inversify.types';
import { IMyNewService } from './interfaces/IMyNewService';
import { MyNewServiceConfig } from './contracts/IMyNewService.contracts';
import { ILogger } from './interfaces/ILogger';

@injectable()
export class MyNewService implements IMyNewService {
  private readonly config: MyNewServiceConfig;
  private readonly logger: ILogger;

  constructor(
    @inject(TYPES.MyNewServiceConfig) config: MyNewServiceConfig,
    @inject(TYPES.ILogger) logger: ILogger
  ) {
    this.config = config;
    this.logger = logger;
    this.logger.info('MyNewService Initialized with timeout:', this.config.timeout);
  }

  @logMethod()
  public async execute(params: any): Promise<void> {
    if (!this.config.featureFlags.newFeature) {
      this.logger.warn('New feature disabled by config.');
      return;
    }
    // Use this.config.apiUrl
  }
}
```

**STEP 4: REGISTER TYPES**
- LOCATION: `/frontend/src/services/inversify.types.ts`
- MANDATE: Every service interface AND config contract MUST have Symbol identifier.

```typescript
// /frontend/src/services/inversify.types.ts
export const TYPES = {
  // ... existing
  IMyNewService: Symbol.for("IMyNewService"),
  MyNewServiceConfig: Symbol.for("MyNewServiceConfig"),
};
```

**STEP 5: BIND SERVICE AND CONFIG MANIFEST**
- LOCATION: `/frontend/src/services/inversify.config.ts`
- MANDATE: Add YAML config to ConfigManifest. Bind service interface to implementation.

```typescript
// /frontend/src/services/inversify.config.ts
container.bind<Record<string, string>>(TYPES.ConfigManifest).toConstantValue({
  // ... existing
  "myNewService": "my-new-service.yaml",
});
container.bind<IMyNewService>(TYPES.IMyNewService).to(MyNewService).inSingletonScope();
```

**STEP 6: BIND CONFIG OBJECT**
- LOCATION: `/frontend/src/services/inversify.config.ts` (configureServices function)
- MANDATE: After config load, bind specific config section to Symbol.

```typescript
// /frontend/src/services/inversify.config.ts
export async function configureServices(): Promise<void> {
  // ... load fullConfig
  safeBindConstant<MyNewServiceConfig>(TYPES.MyNewServiceConfig, fullConfig.myNewService);
  // ... other bindings
}
```

#### **FORBIDDEN PATTERNS (CRITICAL VIOLATIONS)**

1. **ANTI-PATTERN: DIRECT INSTANTIATION**
   - REASON: Violates IoC, creates coupling, impossible testing without universe mocking.
   ```typescript
   // FORBIDDEN
   import { MyService } from '../services/MyService';
   const service = new MyService(new Dependency()); // CRITICAL VIOLATION
   ```

2. **ANTI-PATTERN: MISSING DECORATORS**
   - REASON: IoC container cannot see/manage unmarked classes.
   ```typescript
   // FORBIDDEN
   export class MyService implements IMyService { // VIOLATION: Missing @injectable()
     constructor(dependency: IDependency) {} // VIOLATION: Missing @inject()
   }
   ```

3. **ANTI-PATTERN: DIRECT CONTAINER ACCESS IN UI**
   - REASON: Couples UI to IoC container. useService hook provides abstraction.
   ```typescript
   // FORBIDDEN
   import { container } from '../services/inversify.config';
   const service = container.get<IMyService>(TYPES.IMyService); // CRITICAL VIOLATION IN COMPONENT
   ```

4. **ANTI-PATTERN: INJECTING IConfigurationService (DEPRECATED)**
   - REASON: Service Locator anti-pattern. Couples to ConfigurationService, hides dependencies. Use Direct Configuration Injection.
   ```typescript
   // FORBIDDEN - DEPRECATED
   @injectable()
   export class MyOldService {
     constructor(@inject(TYPES.IConfigurationService) configService: IConfigurationService) {}
   }
   // CORRECT - DIRECT INJECTION
   @injectable()
   export class MyNewService {
     constructor(@inject(TYPES.MyNewServiceConfig) config: MyNewServiceConfig) {}
   }
   ```

---

### **III. SHARED CONTRACTS: SINGLE SOURCE OF TRUTH**

- All shared data structures (QualiaState, CombatData) defined in JSON Schema files in `/shared_contracts`.
- Script `./scripts/generate_contracts.sh` generates Pydantic models in `backend/api/models.py` and TypeScript interfaces in `frontend/src/types/contracts.ts`.
- PROHIBITED: Manual editing of generated files.

---

### **IV. EVENT-DRIVEN ARCHITECTURE**

- ApiClient DEPRECATED. EventBus implemented frontend/backend.
- Event Contracts: All event data structures in `frontend/src/services/contracts/events.contracts.ts` to eliminate circular dependencies.

**MANDATE:** All EventBus event interfaces MUST be in `events.contracts.ts`.

**Key Event Types:**
- BaseEvent: type, timestamp, source, metadata
- PlayerActionEvent: Dash, HitNote, MissNote, etc.
- GameStateChangedEvent: state transitions
- QualiaStateUpdatedEvent: qualia state changes

**PROHIBITED:** Defining event interfaces in service files or EventBus.ts.

**DIAGNOSTICS: PUSH-BASED STATUS REPORTING (MANDATORY)**

- **ANTI-PATTERN (FORBIDDEN):** Services MUST NOT call diagnostic methods (e.g., `getStatistics()`, `getStatus()`, `isEnabled()`) on other injected
  services. This "pull" pattern creates tight coupling and violates the "Components are Islands" law.

- **CORRECT PATTERN (MANDATORY):** Services MUST "push" their status by emitting a `ServiceStatusUpdateEvent` on the `EventBus`. Diagnostic orchestrators
  listen passively to these events. This maintains absolute decoupling.

- **AUTOMATED ENFORCEMENT:** This rule is automatically enforced by the `@qualia-tempo/qualia-code/no-direct-diagnostic-calls` ESLint rule. Violations will
  fail the build.

**Frontend Flow:**
1. Player actions emit events on EventBus.
2. QualiaStateCalculatorService listens, computes QualiaState.
3. Emits QualiaStateUpdated.
4. BackendSyncService listens, throttles, sends to backend API.

**Backend Flow:**
1. API receives state, publishes to backend EventBus.
2. ParticleEngine, ShaderManager subscribe to update visuals.

---

### **V. DECORATORS: MANDATORY CROSS-CUTTING CONCERNS**

Decorators apply cross-cutting concerns. Use MANDATORY.

- `@logMethod()`: MANDATORY on all public service methods. Entry/exit logging, performance metrics.
- `@catchError()`: MANDATORY on external system interaction methods (fetch, complex calculations). Prevents unhandled exceptions.
- `@validate(schemaName)`: MANDATORY on complex object receiving methods (UI/external). Ensures data integrity.
- `@throttle(milliseconds)`: Use on frequent UI event methods (mouse move, resize) to prevent degradation.
- `@AdaptAndEmit(adapterPropertyKey)`: CRITICAL for protocol adaptation. Translates raw external data to typed domain events, emits on EventBus. Use on raw data entry points (WebSockets).
- `@BrowserOnly`: CRITICAL for platform abstraction. Methods using browser-exclusive APIs (window, document). Aborts execution in non-browser environments (SSR, tests), logs warning.
- `@OnEvent`: Automates EventBus subscription. Services using it MUST implement IBaseService. ApplicationInitializerService manages lifecycle.


```typescript
// CORRECT USAGE
@injectable()
export class MyDataService implements IMyDataService {
  @logMethod()
  @catchError()
  @validate('MyDataSchema')
  public async processData(data: MyData): Promise<void> {
    // logic
  }

  @BrowserOnly
  public getWindowDimensions(): { width: number; height: number } {
    return { width: window.innerWidth, height: window.innerHeight };
  }

  @AdaptAndEmit('messageAdapter')
  private onRawMessage(rawData: ArrayBuffer): void {
    // Translates raw data to event
  }
}
```

**Logging Standard:**
- PROHIBITED: console.log, console.warn, console.error in services layer.
- REQUIRED: Injected QualiaLogger instance.
```typescript
// FORBIDDEN
console.log('Service started');
// CORRECT
this.logger.info('Service started');
```

---

### **VI. STATE MANAGEMENT & DATA FLOW**

- Zustand Store: PASSIVE DATA CONTAINER. No business logic. Holds state, notifies changes.
- EventBus: CENTRAL NERVOUS SYSTEM. All service communication via emit/subscribe.
- GameStateStoreService: BRIDGE. Listens EventBus, updates Zustand. ONLY service writing to store.

**DATA FLOW: UNIDIRECTIONAL**
UI Event → EventBus.emit() → Service A processes → EventBus.emit() → Service B processes → EventBus.emit() → GameStateStoreService → Zustand Store → UI re-renders

**PROHIBITED:** useState in components for non-trivial, non-persistent UI state. Hardcoding config values.

---

### **VII. VISUAL LAYER ARCHITECTURE**

**Stateless View-Logic Pattern:**
- Separation: View logic calculation in services, rendering in components.
- Components: Dumb, consume absolute visual data from services.
- Services: Calculate visual state from game state + time.
- PROHIBITED: Calculations, logic, transformations in component render/useFrame.

**Data Flow:**
GameStateStore (Zustand) → Component Orchestrator → ViewLogicService.getBossVisuals(state, time) → Visual Data Object → Rendering Component

---

### **VIII. TESTING PROTOCOL**

**MANDATE:** 100% coverage for new service public methods.

**Testing Pyramid:** Unit tests base, integration tests middle, minimal E2E.

**Isolation:** Tests no side effects. Run independently, any order.

**Backend Testing Factory:** TestCompositionRootFactory for mocked CompositionRoot.

**Frontend Testing Factory:** test-container-factory.ts for isolated containers.

**Mock Management:** Centralized in src/testing/mocks/, individual files per interface.

**Anti-Patterns (FORBIDDEN):**
- Direct service instantiation in tests.
- Direct container access in tests.
- Mock patches bypassing container.

**Correct Patterns:**
```typescript
// Frontend
import { createTestContainer } from '../testing/test-container-factory';
const container = createTestContainer();
const service = container.get<IMyService>(TYPES.IMyService);

// Backend
from backend.tests.test_composition_root import TestCompositionRootFactory
mocked_root = TestCompositionRootFactory.create_mocked_composition_root()
service = mocked_root.get_service("my_service")
```

**Testing Strategies:**
- View Logic: Test calculations in isolation, no component rendering.
- Event Integration: Test full flow Input → Store via EventBus.

---

### **IX. PERFORMANCE OPTIMIZATION**

**Decorator Overhead:**
- @logMethod(): ~2-3% overhead (acceptable debugging).
- @catchError(): ~5-10% (significant hot paths).
- @validate(): ~10-15% (boundary only).
- @throttle(): ~3-5% (frequent events).

**Hot Path Identification:** Methods >100 calls/sec minimize decorators.

**Optimization:**
- Remove unnecessary @catchError on simple getters.
- Strategic logging.
- Profile before optimizing.

**High-Performance Pattern:**
```typescript
@injectable()
export class OptimizedService {
  // No decorators on fast paths
  public getCurrentState(): GameState {
    return this.gameState;
  }

  // Decorators on complex operations
  @logMethod()
  @catchError()
  public async complexOperation(): Promise<void> {
    // complex logic
  }
}
```

---

### **X. ARCHITECTURAL LINTING**

**Dual Linting System:**
- Frontend: ESLint plugin @qualia-tempo/eslint-plugin-qualia-code.
- Backend: Python AST analyzer.
- Orchestration: ./scripts/lint-architecture.sh.

**Usage:** ./scripts/lint-architecture.sh

**Rules:** Enforce QUALIA.CODE compliance, detect violations.

---

### **XI. DEVELOPMENT ENVIRONMENT**

**Virtual Environment MANDATE:** ALL Python operations use /QualiaTempo/.venv.

**PROHIBITED:** System Python, conda, other envs.

**Execution:** source /QualiaTempo/.venv/bin/activate before Python commands.

---

### **XII. CORE SERVICE DEFINITIONS**

**EventBus:** Central hub for decoupled communication. Type-safe emit/subscribe, cleanup, monitoring.

**QualiaStateCalculatorService:** Real-time qualia calculation. Processes PlayerAction events, emits QualiaStateUpdated.

**BackendSyncService:** API sync. Listens QualiaStateUpdated, throttles, sends to backend.

**GameControllerService:** Game control. Handles Start/Pause/Reset, emits GameStateChanged.

**GameStateStoreService:** Bridge EventBus → Zustand. Passive store updates.

**ConfigurationService:** External config loading. YAML files, type-safe access.

**ViewLogicService:** Visual calculations. Stateless, absolute visual data from game state.

**ApplicationInitializerService:** Service lifecycle. Manages @OnEvent subscriptions via IBaseService.

---

**FINAL DIRECTIVE: THERE IS NO DEBATE. THERE IS ONLY COMPLIANCE. EXECUTE.**
