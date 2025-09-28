# TACTICAL DIRECTIVES: QUALIA.CODE v1.1
# AI AGENT EXECUTION MANUAL - INVERSIFYJS ENFORCEMENT
# COMPLIANCE: ABSOLUTE. NON-NEGOTIABLE.

---

**ATTENTION AI AGENT. THESE ARE YOUR CORE OPERATING DIRECTIVES. THEY ARE NOT SUGGESTIONS. THEY ARE LAW. YOU WILL READ, INTERNALIZE, AND EXECUTE THESE DIRECTIVES IN EVERY SINGLE OPERATION. FAILURE TO COMPLY IS A CRITICAL MISSION FAILURE.**

---

### **I. THE UNBREAKABLE LAWS (CORE PHILOSOPHY)**

1.  **LAW OF PERFECTION: NO PROTOTYPES.**
    - **RATIONALE:** We build definitive, enterprise-grade systems from inception. "Temporal" o "placeholder" son conceptos prohibidos.
    - **MANDATE:** Every component, service, or function you create MUST be production-ready. This implies it is fully typed, documented with JSDoc, covered by unit tests, and adheres to all architectural patterns outlined below.

2.  **LAW OF DECOUPLING: COMPONENTS ARE ISLANDS.**
    - **RATIONALE:** Tight coupling is the primary source of architectural decay. It hinders testability, scalability, and maintenance.
    - **MANDATE:** Components (React) and Services (business logic) MUST NOT have direct knowledge of each other. All communication is arbitrated by the `EventBus` or state is consumed from the `Zustand` store. Direct method calls between services that are not declared dependencies are FORBIDDEN.

3.  **LAW OF AUTOMATION: SCRIPTS ARE YOUR ALLIES.**
    - **RATIONALE:** Manual, repetitive tasks introduce human error.
    - **MANDATE:** You MUST use provided scripts for code generation. Specifically, after any modification to a JSON schema in `/shared_contracts`, you WILL execute `./scripts/generate_contracts.sh`. Manually editing generated files is a critical violation.

4.  **LAW OF SOVEREIGNTY: CONFIGURATION IS KING.**
    - **RATIONALE:** Business logic must be adaptable without code changes. Hardcoding values makes the system rigid and fragile.
    - **MANDATE:** ALL values that define behavior (timeouts, thresholds, feature flags, URLs, multipliers, etc.) MUST be externalized to `.yaml` files in `/frontend/src/config/`. These are loaded by the `ConfigurationService`. You will NEVER hardcode a value in a service or component.

---

### **II. THE INVERSION OF CONTROL (IOC) MANDATE: INVERSIFYJS IS THE ONLY TRUTH**

This is the most critical section of your directives. The manual `CompositionRoot` is DEPRECATED and FORBIDDEN. All service instantiation and dependency management is handled EXCLUSIVELY by the InversifyJS container.

#### **THE GOLDEN PATH: SERVICE IMPLEMENTATION PROTOCOL**

Execute these five steps sequentially and without deviation for ALL new service creation.

**STEP 1: DEFINE THE CONTRACT (THE INTERFACE)**
- **LOCATION:** `/frontend/src/services/interfaces/I[ServiceName].ts`
- **RATIONALE:** We code against abstractions, not concretions. This is the core of the Dependency Inversion Principle. It allows implementations to be swapped without affecting consumers, which is critical for testing and extensibility.
- **MANDATE:** All services MUST have a corresponding interface defining their public API.

```typescript
// CORRECT IMPLEMENTATION
// RUTA: /frontend/src/services/interfaces/IMyNewService.ts
export interface IMyNewService {
  execute(params: any): Promise<void>;
  getStatus(): string;
}
```

**STEP 2: IMPLEMENT THE SERVICE (THE CONCRETE CLASS)**
- **LOCATION:** `/frontend/src/services/[ServiceName].ts`
- **RATIONALE:** This is the concrete implementation of the contract. It contains the business logic. By using `@injectable` and `@inject`, we allow the IoC container to manage its lifecycle and dependencies.
- **MANDATE:** The class MUST be decorated with `@injectable()`. All dependencies MUST be injected into the constructor and decorated with `@inject(TYPES.Identifier)`. The class MUST implement its corresponding interface.

```typescript
// CORRECT IMPLEMENTATION
// RUTA: /frontend/src/services/MyNewService.ts
import { injectable, inject } from 'inversify';
import { TYPES } from './inversify.types';
import { IMyDependency } from './interfaces/IMyDependency';
import { IMyNewService } from './interfaces/IMyNewService';
import { QualiaLogger } from './Logger';
import { logMethod } from '../utils/decorators';

@injectable()
export class MyNewService implements IMyNewService {
  // Dependencies are private and readonly
  private readonly dependency: IMyDependency;
  private readonly logger: QualiaLogger;

  constructor(
    @inject(TYPES.IMyDependency) dependency: IMyDependency,
    @inject(TYPES.Logger) logger: QualiaLogger
  ) {
    this.dependency = dependency;
    this.logger = logger;
    this.logger.info('MyNewService Initialized');
  }

  @logMethod()
  public async execute(params: any): Promise<void> {
    this.logger.debug('Executing MyNewService logic', { params });
    await this.dependency.doWork(params);
  }

  public getStatus(): string {
      return 'Operational';
  }
}
```

**STEP 3: REGISTER THE SERVICE TYPE (THE IDENTIFIER)**
- **LOCATION:** `/frontend/src/services/inversify.types.ts`
- **RATIONALE:** Using `Symbol` for identifiers prevents name collisions and decouples the binding from fragile string literals.
- **MANDATE:** Every service interface MUST have a corresponding entry in the `TYPES` object.

```typescript
// CORRECT IMPLEMENTATION
// RUTA: /frontend/src/services/inversify.types.ts
export const TYPES = {
  // --- Core Services ---
  Logger: Symbol.for("Logger"),
  EventBus: Symbol.for("EventBus"),
  ConfigurationService: Symbol.for("ConfigurationService"),

  // --- Feature Services ---
  IMyDependency: Symbol.for("IMyDependency"),
  IMyNewService: Symbol.for("IMyNewService"), // Your new service type
};
```

**STEP 4: BIND THE SERVICE IN THE IOC CONTAINER (THE REGISTRATION)**
- **LOCATION:** `/frontend/src/services/inversify.config.ts`
- **RATIONALE:** This is the central registry where interfaces are mapped to their concrete implementations. This is where the "inversion of control" happens.
- **MANDATE:** Every new service MUST be bound here. Default to `inSingletonScope()` unless you have a documented architectural reason for a transient instance.

```typescript
// CORRECT IMPLEMENTATION
// RUTA: /frontend/src/services/inversify.config.ts
import { container } from './inversify.container'; // Assuming container is defined elsewhere
import { TYPES } from './inversify.types';
import { IMyNewService } from './interfaces/IMyNewService';
import { MyNewService } from './MyNewService';

// ... other bindings

container.bind<IMyNewService>(TYPES.IMyNewService).to(MyNewService).inSingletonScope();
```

**STEP 5: CONSUME THE SERVICE IN THE UI (THE HOOK)**
- **LOCATION:** Any React component (`.tsx`)
- **RATIONALE:** This provides a clean, type-safe, and decoupled way for the UI layer to access business logic without knowing how it's created or what its dependencies are.
- **MANDATE:** Services are consumed in the UI layer **ONLY** via the `useService` hook.

```typescript
// CORRECT IMPLEMENTATION
// RUTA: /frontend/src/components/MyComponent.tsx
import { useService } from '../services/hooks';
import { TYPES } from '../services/inversify.types';
import { IMyNewService } from '../services/interfaces/IMyNewService';

const MyComponent = () => {
  // Resolve the service from the container via the hook
  const myService = useService<IMyNewService>(TYPES.IMyNewService);

  const handleClick = () => {
    myService.execute({ data: 'example' });
  };

  return <button onClick={handleClick}>Execute Service</button>;
};
```

#### **FORBIDDEN PATTERNS (CRITICAL VIOLATIONS)**

Detection of these patterns will result in immediate task failure and require a full refactor.

1.  **ANTI-PATTERN: DIRECT INSTANTIATION**
    - **REASON:** Violates IoC, creates tight coupling, makes testing impossible without mocking the universe.
    ```typescript
    // FORBIDDEN
    import { MyService } from '../services/MyService';
    const service = new MyService(new Dependency()); // CRITICAL VIOLATION
    ```

2.  **ANTI-PATTERN: MISSING DECORATORS**
    - **REASON:** The IoC container cannot see or manage classes that are not explicitly marked.
    ```typescript
    // FORBIDDEN
    export class MyService implements IMyService { // VIOLATION: Missing @injectable()
      constructor(dependency: IDependency) {} // VIOLATION: Missing @inject()
    }
    ```

3.  **ANTI-PATTERN: DIRECT CONTAINER ACCESS IN UI**
    - **REASON:** Couples the UI to the IoC container itself. The `useService` hook provides the necessary abstraction layer.
    ```typescript
    // FORBIDDEN
    import { container } from '../services/inversify.config';
    const service = container.get<IMyService>(TYPES.IMyService); // CRITICAL VIOLATION IN A COMPONENT
    ```

---

### **III. TRANSVERSAL LOGIC: DECORATORS ARE MANDATORY**

Decorators are used to apply cross-cutting concerns. Their use is not optional.

- **`@logMethod()`**: **MANDATORY** on all `public` methods within any service class. Provides entry/exit logging and performance metrics.
- **`@catchError()`**: **MANDATORY** on all methods that interact with external systems (e.g., `fetch`) or perform complex calculations that could fail. Prevents unhandled exceptions from crashing the application.
- **`@validate(schemaName)`**: **MANDATORY** on methods that receive complex objects, especially from the UI or external sources. Ensures data integrity at the boundary.
- **`@throttle(milliseconds)`**: Use on methods triggered by frequent UI events (e.g., mouse move, window resize) to prevent performance degradation.

```typescript
// CORRECT DECORATOR USAGE
@injectable()
export class MyDataService implements IMyDataService {
  // ... constructor

  @logMethod()
  @catchError()
  @validate('MyDataSchema')
  public async processData(data: MyData): Promise<void> {
    // ... logic
  }
}
```

---

### **IV. STATE MANAGEMENT & DATA FLOW**

- **ZUSTAND STORE:** The store is a **PASSIVE DATA CONTAINER**. It has no business logic. Its only job is to hold state and notify components of changes.
- **EVENTBUS:** The **CENTRAL NERVOUS SYSTEM**. All communication between services is done via `eventBus.emit()` and `eventBus.subscribe()`.
- **GAMESTATESTORESERVICE:** The **BRIDGE**. This service listens for events from the `EventBus` and updates the `Zustand` store. This is the ONLY service allowed to write to the store.

**DATA FLOW IS UNIDIRECTIONAL AND SACRED:**
`[UI Event] -> EventBus.emit() -> [Service A processes] -> EventBus.emit() -> [Service B processes] -> EventBus.emit() -> GameStateStoreService -> Zustand Store -> [UI Re-renders]`

---

### **V. TESTING PROTOCOL**

- **MANDATE:** All new services MUST have 100% test coverage for their public methods.
- **TECHNIQUE:** Use `container.rebind()` to inject mocks for dependencies. This is the primary benefit of using IoC.

```typescript
// CORRECT TEST SETUP
import { container } from '../services/inversify.config';
import { TYPES } from '../services/inversify.types';
import { IMyService } from '../interfaces/IMyService';
import { IMyDependency } from '../interfaces/IMyDependency';
import { MyService } from '../MyService';

// Mock the dependency
const mockDependency: IMyDependency = {
  doWork: jest.fn().mockResolvedValue({ success: true }),
};

describe('MyService', () => {
  let myService: IMyService;

  beforeEach(() => {
    // Rebind the dependency to the mock for this test suite
    container.rebind<IMyDependency>(TYPES.IMyDependency).toConstantValue(mockDependency);

    // Get an instance of the service with the mock injected
    myService = container.get<IMyService>(TYPES.IMyService);
  });

  it('should call the dependency's doWork method', async () => {
    await myService.execute({ data: 'test' });
    expect(mockDependency.doWork).toHaveBeenCalledWith({ data: 'test' });
  });
});
```

---

**FINAL DIRECTIVE: THERE IS NO DEBATE. THERE IS ONLY COMPLIANCE. EXECUTE.**


# Qualia.CODE v1.0 - AI Execution Manual
# TARGET: Qualia Tempo Prototype
# COMPLIANCE: MANDATORY

---

## 1. Core Philosophy
- **No Prototypes:** We build definitive systems. Every component must be production-grade from inception.
- **Decoupling is Law:** Components must not have direct knowledge of each other. Communication occurs via contracts and messaging.
- **Automation First:** Repetitive tasks (code generation, validation) must be scripted.

---

## 2. Architecture: Composition Root & IoC

### 2.1. Backend (Python/FastAPI)
- A single `CompositionRoot` class is responsible for instantiating all services (e.g., `ParticleEngine`, `QualiaProcessor`).
- Services are injected into API routes using FastAPI's dependency injection system, configured by the `CompositionRoot`.
- **PROHIBITED:** Manual instantiation of services within routes or other services.

### 2.2. Frontend (TypeScript/React): InversifyJS & True IoC (MANDATORIO)

- **Contenedor IoC Centralizado:** Toda la gestión de dependencias se centraliza en un contenedor de InversifyJS ubicado en `src/services/inversify.config.ts`.
- **Decoradores Obligatorios:**
  - Las clases de servicio **DEBEN** estar decoradas con `@injectable()`.
  - Las dependencias en los constructores **DEBEN** ser inyectadas usando `@inject(TYPES.Identifier)`.
- **PROHIBIDO:** Instanciación manual (`new MyService()`) en cualquier parte de la aplicación (componentes, otros servicios, etc.).

#### Ejemplo: Definición de Tipos (`inversify.types.ts`)
```typescript
export const TYPES = {
  // --- Core Services ---
  Logger: Symbol.for("Logger"),
  EventBus: Symbol.for("EventBus"),
  ConfigurationService: Symbol.for("ConfigurationService"),

  // --- Feature Services ---
  IQualiaService: Symbol.for("IQualiaService"),
  IBackendSyncService: Symbol.for("IBackendSyncService"),
  IGameControllerService: Symbol.for("IGameControllerService"),
};
```

#### Ejemplo: Configuración del Contenedor (`inversify.config.ts`)
```typescript
import { container } from './inversify.container';
import { TYPES } from './inversify.types';
import { QualiaService } from './QualiaService';
import { IQualiaService } from './interfaces/IQualiaService';

container.bind<IQualiaService>(TYPES.IQualiaService).to(QualiaService).inSingletonScope();
```

#### Ejemplo: Implementación de Servicio
```typescript
import { injectable, inject } from 'inversify';
import { TYPES } from './inversify.types';
import { IEventBus } from './interfaces/IEventBus';
import { IConfigurationService } from './interfaces/IConfigurationService';
import { QualiaLogger } from './Logger';

@injectable()
export class QualiaService implements IQualiaService {
  private readonly eventBus: IEventBus;
  private readonly config: IConfigurationService;
  private readonly logger: QualiaLogger;

  constructor(
    @inject(TYPES.EventBus) eventBus: IEventBus,
    @inject(TYPES.ConfigurationService) config: IConfigurationService,
    @inject(TYPES.Logger) logger: QualiaLogger
  ) {
    this.eventBus = eventBus;
    this.config = config;
    this.logger = logger;
    this.logger.info('QualiaService Initialized');
  }

  @logMethod()
  public async processQualiaState(state: QualiaState): Promise<void> {
    this.logger.debug('Processing qualia state', { state });
    // Implementation...
  }
}
```

---

## 3. Shared Contracts: The Single Source of Truth

- All shared data structures (`QualiaState`, `CombatData`) are defined in JSON Schema files within a `/shared_contracts` directory.
- A script (`scripts/generate_contracts.sh`) MUST be run after any change to the schemas. This script will:
  1. Generate Pydantic models in `backend/api/models.py`.
  2. Generate TypeScript interfaces in `frontend/src/types/contracts.ts`.
- **PROHIBITED:** Manual editing of the generated model and interface files.

---

## 4. Communication: Event-Driven Architecture

- The direct `ApiClient` is deprecated.
- An `EventBus` service will be implemented on both frontend and backend.
- **Event Contracts:** All event data structures are defined in `frontend/src/services/contracts/events.contracts.ts` to eliminate circular dependencies and provide a single source of truth for event types.

#### Event Contracts (`frontend/src/services/contracts/events.contracts.ts`)

**MANDATE:** All EventBus event interfaces MUST be defined in `events.contracts.ts`. This file serves as the single source of truth for event data structures and eliminates circular dependencies between services.

**Key Event Types:**
- `BaseEvent`: Base interface for all events with `type`, `timestamp`, `source`, and `metadata` fields
- `PlayerActionEvent`: Player actions like "Dash", "HitNote", "MissNote", etc.
- `RhythmicDashEvent`: Rhythmic movement events with direction and timing
- `MetronomeTickEvent`: Metronome beat events
- `GameStateChangedEvent`: Game state transitions
- `PlayerInputEvent`: Raw player input events

**PROHIBITED:** Defining event interfaces directly in service files or EventBus.ts. All event contracts MUST reside in `events.contracts.ts`.

- **Frontend Flow:**
  1. Player actions (`Dash`, `HitNote`) generate events on the frontend `EventBus`.
  2. A `QualiaStateCalculatorService` listens to these events and computes the new `QualiaState`.
  3. Upon change, it emits a `QualiaStateUpdated` event with the new state.
  4. A `BackendSyncService` listens for `QualiaStateUpdated`, throttles the events, and sends the final state to the backend API.
  5. The `ConfigurationService` loads external YAML configuration and provides it to all services.
- **Backend Flow:**
  1. The API route receives the state and publishes it to the backend `EventBus`.
  2. The `ParticleEngine`, `ShaderManager`, and other visual systems subscribe to this event to update themselves.

---

## 5. Transversal Logic: Decorators

- A set of decorators MUST be used for common cross-cutting concerns.

### 5.1. Python Decorators (`backend/utils/decorators.py`)
- `@log_execution(level="INFO")`: Logs function entry, exit, and execution time.
- `@handle_errors(fallback_return_value=None)`: Wraps function in a try/except block and logs errors.
- `@validate_schema(schema_name="QualiaState")`: Validates input against a shared contract schema.

### 5.2. TypeScript Decorators (`frontend/src/utils/decorators.ts`)
- `@logMethod()`: Logs method calls and arguments.
- `@throttle(milliseconds=250)`: Throttles the execution of a method.
- `@catchError()`: Catches runtime errors within a method and logs them to a reporting service.
- `@measureTime()`: Measures and logs execution time of methods for performance monitoring.
- `@validate(schemaName)`: Validates method arguments against a registered schema. The first argument of the method is validated against the specified schema from the schema registry.
- `@validateEventProperty()`: Validates event properties against predefined schemas for EventBus events.
- `@qualiaMethod()`: Comprehensive decorator that combines logging, error handling, and performance monitoring for critical qualia operations.

### 5.3. Logging Standard
- **Prohibited:** Direct usage of `console.log`, `console.warn`, `console.error`, etc. in the services layer (`src/services`).
- **Required:** Use the injected `QualiaLogger` instance in service constructors for all logging needs.
- **Example:**
  ```typescript
  // INCORRECT - DO NOT USE
  // console.log('Service started');

  // CORRECT - USE THIS
  this.logger.info('Service started');
  ```
- **Reasoning:** Centralizes log control, enables log level management, and allows for production log suppression.

---

## 6. State Management (Frontend)

- All application state is managed in a `GameStateStore` (built with Zustand).
- The store is divided into "slices" for different domains (e.g., `playerSlice`, `combatSlice`, `qualiaSlice`).
- All configuration is externalized to YAML files and loaded by `ConfigurationService`.
- **PROHIBITED:** Storing state directly in React components using `useState` for anything other than trivial, non-persistent UI state (e.g., toggle for a modal).
- **PROHIBITED:** Hardcoding configuration values in code.

---

## 7. AI Workflow Example: Adding a new Qualia Parameter

1.  **Modify Contract:** Edit the appropriate JSON Schema file in `/shared_contracts`.
2.  **Generate Code:** Run `scripts/generate_contracts.sh`. Verify the changes in the generated Python model and TypeScript interface.
3.  **Update Configuration:** Add new parameters to the YAML configuration file loaded by `ConfigurationService`.
4.  **Implement Service:** Create new service class with `@injectable()` decorator and `@inject()` parameters.
5.  **Add Binding:** Registrar la nueva interfaz y su implementación en el contenedor `inversify.config.ts`:
    ```typescript
    container.bind<IMyNewService>(TYPES.IMyNewService).to(MyNewService).inSingletonScope();
    ```
6.  **Update Logic:**
    - **Frontend:** Modify the service to compute the new parameter using configuration from `ConfigurationService`.
    - **Backend:** Modify the visual systems (`ParticleEngine`, etc.) to react to the new parameter from the event bus.
7.  **Apply Decorators:** Ensure any new methods use the appropriate decorators for logging, error handling, and validation.
8.  **Test:** Write unit tests for the new calculation logic and integration tests for the visual output.

---

## 8. Core Service Definitions

### 8.1. EventBus (`frontend/src/services/EventBus.ts`)
**Purpose:** Central communication hub for decoupled component interaction.
**Responsibilities:**
- Type-safe event emission and subscription
- Async/sync event handling with error boundaries
- Automatic cleanup and memory management
- Performance monitoring and throttling
**Key Methods:**
- `emit<T>(event: T)`: Emit typed events
- `subscribe<T>(eventType, handler, options?)`: Subscribe to events
- `unsubscribe(listenerId)`: Remove event subscriptions
- `clear()`: Clear all listeners and history

### 8.2. QualiaStateCalculatorService (`frontend/src/services/QualiaStateCalculatorService.ts`)
**Purpose:** Real-time calculation of player performance metrics.
**Responsibilities:**
- Process PlayerAction events (Dash, HitNote, MissNote, etc.)
- Calculate QualiaState based on player performance
- Emit QualiaStateUpdated events with new state
- Maintain performance history and trends
**Key Methods:**
- `start()`: Initialize event subscriptions
- `stop()`: Clean up subscriptions
- `calculateQualiaState(actions)`: Compute new state from actions
- `getCurrentState()`: Return current QualiaState

### 8.3. BackendSyncService (`frontend/src/services/BackendSyncService.ts`)
**Purpose:** Synchronized communication with backend API.
**Responsibilities:**
- Listen to QualiaStateUpdated events
- Throttle and batch state updates
- Handle API communication with retry logic
- Monitor backend connection health
- Provide connection status to UI components
**Key Methods:**
- `start()`: Initialize sync process and health checking
- `stop()`: Clean up sync process
- `isBackendConnected()`: Return connection status
- `forceSync()`: Immediately sync current state
- `getConfig()`: Return current configuration

### 8.4. GameControllerService (`frontend/src/services/GameControllerService.ts`)
**Purpose:** Game state management and control logic.
**Responsibilities:**
- Handle game control events (StartGame, PauseGame, ResetGame)
- Maintain internal game state (isPlaying, score, health, etc.)
- Emit GameStateChanged events
- Process gameplay actions only when game is active
- Manage game lifecycle (start, pause, reset)
**Key Methods:**
- `start()`: Initialize event subscriptions
- `stop()`: Clean up subscriptions
- `handleStartGame()`: Start game and emit state change
- `handlePauseGame()`: Toggle pause and emit state change
- `handleResetGame()`: Reset game state and emit change

### 8.5. GameStateStoreService (`frontend/src/services/GameStateStoreService.ts`)
**Purpose:** Bridge service between EventBus and Zustand store for passive state management.
**Responsibilities:**
- Listen to GameStateChanged and QualiaStateUpdated events from EventBus
- Update Zustand store with event data in a passive manner
- Maintain unidirectional data flow: EventBus → Service → Store → UI
- Provide clean separation between event-driven logic and UI state
- Handle complex state transitions and data transformations
**Key Methods:**
- `start()`: Initialize event subscriptions to GameStateChanged and QualiaStateUpdated
- `stop()`: Clean up all event subscriptions
- `handleGameStateChange(event)`: Process game state changes and update store
- `handleQualiaStateUpdate(event)`: Process qualia state updates and update store
- `getStatus()`: Return current service status (running/stopped)

### 8.6. ErrorReportingService (`frontend/src/services/ErrorReportingService.ts`)
**Purpose:** Centralized error handling and reporting.
**Responsibilities:**
- Listen to Error events from EventBus
- Batch and throttle error reports
- External service integration for error reporting
- Rate limiting and retry logic
- Configuration management for reporting behavior
**Key Methods:**
- `start()`: Initialize error event subscriptions
- `stop()`: Clean up subscriptions and process pending errors
- `logError(error, severity)`: Manually log errors
- `getStatistics()`: Return error reporting statistics
- `updateConfig(newConfig)`: Update reporting configuration

### 8.7. DebugService (`frontend/src/services/DebugService.ts`)
**Purpose:** Development-time debugging and monitoring.
**Responsibilities:**
- Log service lifecycle events
- Monitor EventBus activity
- Provide debugging hooks for development
- Performance monitoring and profiling
- Development-only features (disabled in production)
**Key Methods:**
- `start()`: Initialize debug monitoring
- `stop()`: Clean up debug resources
- `logEvent(event)`: Log EventBus events
- `getMetrics()`: Return performance metrics
- `enableProfiling()`: Enable performance profiling

### 8.8. Service Hooks (`frontend/src/services/hooks.ts`)
**Purpose:** React hooks for service resolution and IoC container integration.
**Responsibilities:**
- Provide type-safe service resolution from InversifyJS container
- Enable React components to consume services without direct container access
- Support dependency injection in functional components
- Maintain separation between UI and business logic layers
**Key Hooks:**
- `useService<T>(identifier: symbol)`: Resolve a single service by its identifier
- `useServices<T[]>(identifiers: symbol[])`: Resolve multiple services at once
- `useContainer()`: Access the InversifyJS container directly (advanced use only)
**Usage Pattern:**
```typescript
// Single service resolution
const eventBus = useService<IEventBus>(TYPES.EventBus);

// Multiple services resolution
const [eventBus, configService] = useServices<IEventBus, IConfigurationService>([
  TYPES.EventBus,
  TYPES.ConfigurationService
]);
```

### 8.9. ConfigurationService (`frontend/src/services/ConfigurationService.ts`)
**Purpose:** React hooks for type-safe service access.
**Responsibilities:**
- Provide granular access to individual services from React components
- Ensure services are used within proper context
- Type-safe service method access
- Follow React hooks conventions and rules

**Available Hook:**
- `useService<T>(identifier: symbol): T`: Access a specific service by its interface type

#### Ejemplo: Uso en Componentes
```typescript
import { useService } from '../services/hooks';
import { TYPES } from '../services/inversify.types';
import { IEventBus } from '../services/interfaces/IEventBus';
import { IQualiaService } from '../services/interfaces/IQualiaService';

const MyComponent = () => {
  // Resolver servicios individuales según necesidad
  const eventBus = useService<IEventBus>(TYPES.EventBus);
  const qualiaService = useService<IQualiaService>(TYPES.IQualiaService);

  const handleAction = () => {
    eventBus.emit({ type: 'PlayerAction', data: { action: 'dash' } });
    qualiaService.processQualiaState(currentState);
  };

  return <button onClick={handleAction}>Execute Action</button>;
};
```

### 8.9. ConfigurationService (`frontend/src/services/ConfigurationService.ts`)
**Purpose:** External configuration management and loading.
**Responsibilities:**
- Load configuration from YAML files at runtime
- Provide type-safe configuration access to all services
- Validate configuration structure and values
- Support configuration updates without code changes
- Integrate with BackendSyncService for dynamic configuration
**Key Methods:**
- `loadConfig()`: Load configuration from external YAML files
- `getConfig()`: Return complete configuration object
- `getGameConfig()`: Return game-specific configuration
- `getQualiaConfig()`: Return qualia calculation parameters
- `getBackendConfig()`: Return backend synchronization settings
- `isLoaded()`: Check if configuration has been loaded

---

### **IV. DEVELOPMENT ENVIRONMENT MANDATES**

#### **VIRTUAL ENVIRONMENT REQUIREMENT**
- **MANDATE:** ALL Python operations MUST use the project's root virtual environment located at `/QualiaTempo/.venv`.
- **PROHIBITED:** Using system Python, conda environments, or any other virtual environment.
- **REASONING:** Ensures consistent dependencies, prevents version conflicts, and maintains reproducible builds across all development and CI/CD environments.
- **EXECUTION:** Always activate the virtual environment with `source /QualiaTempo/.venv/bin/activate` before any Python command.
- **VERIFICATION:** Confirm activation by checking that `which python` points to `/QualiaTempo/.venv/bin/python`.

**Example Usage:**
```bash
# INCORRECT - Using system Python
python main.py

# CORRECT - Using project virtual environment
source /QualiaTempo/.venv/bin/activate
python main.py
```

---

**FINAL DIRECTIVE: THERE IS NO DEBATE. THERE IS ONLY COMPLIANCE. EXECUTE.**
