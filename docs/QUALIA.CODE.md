# Qualia.CODE v1.1 - AI Execution Manual
# TARGET: Qualia Tempo Prototype
# COMPLIANCE: MANDATORY

---

## 1. Core Philosophy
- **No Prototypes:** We build definitive systems. Every component must be production-grade from inception.
- **Decoupling is Law:** Components must not have direct knowledge of each other. Communication occurs via contracts and messaging.
- **Automation First:** Repetitive tasks (code generation, validation) must be scripted.
- **Platform Abstraction is Mandatory:** Direct use of platform-specific or global APIs (e.g., `fetch`, `setTimeout`) is strictly forbidden. All such operations MUST be channeled through a dedicated, injectable service (`HttpService`, `TimerService`).

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

// Principio de Inyección:
constructor(@inject(TYPES.IDependency) private dep: IDependency) {}

---

## 3. Shared Contracts: The Single Source of Truth

- All shared data structures (`QualiaState`, `CombatData`) are defined in JSON Schema files within a `/shared_contracts` directory.
- A script (`scripts/generate_contracts.sh`) MUST be run after any change to the schemas. This script will:
  1. Generate Pydantic models in `backend/api/models.py`.
  2. Generate TypeScript interfaces in `frontend/src/types/contracts.ts`.
- **PROHIBITED:** Manual editing of the generated model and interface files.

> **NOTA ARQUITECTÓNICA:**
> Es crucial diferenciar entre los dos tipos de "contratos" en el proyecto:
> 1.  **Shared Contracts (`/shared_contracts`):** Son esquemas JSON (la fuente única de verdad) que definen las estructuras de datos compartidas entre
> el **backend (Python)** y el **frontend (TypeScript)**. Su propósito es la interoperabilidad entre sistemas.
> 2.  **Service Contracts (`/frontend/src/services/contracts`):** Son interfaces TypeScript (`*.contracts.ts`) que definen las formas de los datos y
> eventos *dentro* del ecosistema de servicios del frontend. Su propósito es garantizar la seguridad de tipos y el desacoplamiento entre los servicios
> internos de la aplicación cliente.

---

## 4. Architectural Linting: QUALIA.CODE Enforcement System

QUALIA.CODE implements a comprehensive dual-linting system to automatically enforce architectural compliance across the entire codebase. The system operates on both frontend (TypeScript/React) and backend (Python/FastAPI) simultaneously, ensuring no architectural violations are introduced during development.

### 4.1. System Overview

The linting system consists of three integrated components:

1. **Frontend ESLint Plugin** (`@qualia-tempo/eslint-plugin-qualia-code`): Custom ESLint rules that validate TypeScript/React code against QUALIA.CODE principles
2. **Backend Python AST Analyzer**: Custom Python script that parses abstract syntax trees to detect architectural violations in Python code
3. **Unified Orchestration Script** (`scripts/lint-architecture.sh`): Single command that runs both linting systems and provides consolidated reporting

### 4.2. Usage

The linting system provides unified command-line interface for comprehensive architectural compliance checking across both frontend and backend codebases.

```bash
./scripts/lint-architecture.sh
```

### 4.3. Frontend ESLint Rules

The custom ESLint plugin enforces QUALIA.CODE principles through automated static analysis of TypeScript/React code.

### 4.4. Backend Python Rules

The Python AST analyzer validates architectural compliance in Python code through abstract syntax tree parsing.

### 4.5. Output and Error Handling

The linting system provides comprehensive reporting with clear success/failure states and actionable violation details.

# Ejemplo de violación detectada:
MyComponent.tsx:10: Direct service instantiation detected. Use useService() hook instead.

### 4.6. Configuration and Customization

The linting system supports project-specific configuration and CI/CD integration.

```javascript
// .eslintrc.js
module.exports = {
  plugins: ['@qualia-tempo/qualia-code'],
  rules: {
    '@qualia-tempo/qualia-code/no-direct-service-instantiation': 'error',
    '@qualia-tempo/qualia-code/enforce-use-services-hook': 'error',
    // Customize rule severity as needed
    '@qualia-tempo/qualia-code/no-hardcoded-config': 'warn'
  }
};
```

#### Python Analyzer Configuration
The Python rules are configured within `scripts/lint-architecture.sh` and can be extended by modifying the AST analysis logic.

### 4.7. Performance Considerations

- **Directory Filtering:** Prevents analysis of dependency directories (`.venv`, `node_modules`, etc.)
- **Incremental Analysis:** Only analyzes changed files in CI/CD contexts
- **Timeout Protection:** Script includes timeout mechanisms to prevent infinite loops
- **Parallel Execution:** Frontend and backend analysis run in parallel when possible

### 4.8. Integration with CI/CD

The linting system integrates with continuous integration pipelines to ensure ongoing architectural compliance.

---

## 5. Communication: Event-Driven Architecture

- The direct `ApiClient` is deprecated.
- An `EventBus` service will be implemented on both frontend and backend.
- **Event Contracts:** All event data structures are defined in `frontend/src/services/contracts/events.contracts.ts` to eliminate circular dependencies and provide a single source of truth for event types.

**MANDATE:** All EventBus event interfaces MUST be defined in `events.contracts.ts`. This file serves as the single source of truth for event data structures and eliminates circular dependencies between services.

**PROHIBITED:** Defining event interfaces directly in service files or EventBus.ts. All event contracts MUST reside in `events.contracts.ts`.

---

## 6. Transversal Logic: Decorators

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
- `@AdaptAndEmit(adapterPropertyKey: string)`: **CRÍTICO PARA LA ADAPTACIÓN DE PROTOCOLOS.** Este decorador es el núcleo del `ProtocolAdapterBundle`. DEBE usarse en métodos que sirven como puntos de entrada para datos crudos de fuentes externas (ej. WebSockets). Traduce automáticamente los datos crudos a un evento de dominio tipado y lo emite en el `EventBus`.

// Aplicación del decorador de adaptación:
@AdaptAndEmit('messageAdapter')
private onRawMessage(rawData: ArrayBuffer): void { /* ... */ }

### 6.2.1. Environment Adaptation Bundle

- `@BrowserOnly`: **CRÍTICO PARA LA ABSTRACCIÓN DE PLATAFORMA.** Este decorador se debe usar en métodos que dependen de APIs exclusivas del navegador (ej. `window`, `document`). Asegura que el método solo se ejecute si está en un entorno de navegador. Si se invoca en un entorno de servidor (SSR) o de test, el decorador abortará la ejecución del método y registrará una advertencia, previniendo caídas del sistema.

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

## 7. State Management (Frontend)

- All application state is managed in a `GameStateStore` (built with Zustand).
- The store is divided into "slices" for different domains (e.g., `playerSlice`, `combatSlice`, `qualiaSlice`).
- All configuration is externalized to YAML files and loaded by `ConfigurationService`.
- **PROHIBITED:** Storing state directly in React components using `useState` for anything other than trivial, non-persistent UI state (e.g., toggle for a modal).
- **PROHIBITED:** Hardcoding configuration values in code.

---

## 8. Performance Optimization Protocol

### 8.1. Decorator Performance Guidelines

**CRITICAL: Avoid Decorator Overuse**

Decorators add runtime overhead through proxy patterns and should be applied judiciously:

#### Performance Impact Analysis:
- `@logMethod()`: ~2-3% overhead (acceptable for debugging)
- `@catchError()`: ~5-10% overhead (significant on hot paths)
- `@validate()`: ~10-15% overhead (use only on data boundaries)
- `@throttle()`: ~3-5% overhead (use only on frequent events)

#### Hot Path Identification:
Methods called >100 times per second should minimize decorator usage:
- Configuration getters (getConfig, getAudioConfig, etc.)
- State accessors (getCurrentState, isRunning, etc.)
- Simple property returns
- Timer wrappers (setTimeout, clearInterval, etc.)

#### Optimization Strategy:
1. **Profile before optimizing**: Use browser DevTools to identify hot paths
2. **Remove unnecessary @catchError**: Keep only on system boundaries
3. **Minimize validation**: Use @validate only on external data entry points
4. **Strategic logging**: Use @logMethod selectively in production

### 8.2. Service Performance Patterns

**High-Performance Service Design:**
```typescript
@injectable()
export class OptimizedService {
  // ✅ Fast path - no decorators on simple getters
  public getState(): State {
    return this.state;
  }
  
  // ✅ System boundary - appropriate decorator usage
  @logMethod()
  @catchError()
  public async processExternalData(data: unknown): Promise<void> {
    // Complex operation that justifies overhead
  }
}
```

---

---

## 9. Core Service Definitions

### 9.1. EventBus (`frontend/src/services/EventBus.ts`)
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

### 9.2. QualiaStateCalculatorService (`frontend/src/services/QualiaStateCalculatorService.ts`)
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

### 9.3. BackendSyncService (`frontend/src/services/BackendSyncService.ts`)
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

### 9.4. GameControllerService (`frontend/src/services/GameControllerService.ts`)
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

### 9.5. GameStateStoreService (`frontend/src/services/GameStateStoreService.ts`)
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

### 9.6. ErrorReportingService (`frontend/src/services/ErrorReportingService.ts`)
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

### 9.7. DebugService (`frontend/src/services/DebugService.ts`)
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

### 9.8. Service Hooks (`frontend/src/services/hooks.ts`)
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

### 9.9. ConfigurationService (`frontend/src/services/ConfigurationService.ts`)
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

### 9.10. HttpService (`frontend/src/services/HttpService.ts`)
**Purpose:** Centralized and abstracted handler for all HTTP communications.
**Responsibilities:**
- Encapsulate the global `fetch` API, providing a single point of control.
- Provide consistent, structured error handling for network and HTTP errors.
- Centralize request/response logging for improved diagnostics.
- Manage request timeouts and cancellation via `AbortSignal`.
**Key Methods:**
- `get<T>(url, options?)`: Perform a GET request.
- `post<T>(url, options?)`: Perform a POST request.
- `put<T>(url, options?)`: Perform a PUT request.
- `delete<T>(url, options?)`: Perform a DELETE request.

### 9.11. TimerService (`frontend/src/services/TimerService.ts`)
**Purpose:** Centralized and abstracted handler for all asynchronous timer operations.
**Responsibilities:**
- Encapsulate global timer functions (`setTimeout`, `setInterval`, etc.).
- Provide a testable, mock-able interface for all time-based logic.
- Prevent memory leaks by tracking active timers and providing cleanup utilities.
- Offer higher-level time-based utilities like `debounce` and `throttle`.
**Key Methods:**
- `setTimeout(callback, ms)`: Execute a callback after a delay.
- `clearTimeout(id)`: Cancel a scheduled timeout.
- `setInterval(callback, ms)`: Execute a callback repeatedly.
- `clearInterval(id)`: Cancel a scheduled interval.

### 9.12. WebSocketService (`frontend/src/services/WebSocketService.ts`)
**Purpose:** Encapsulación de la API nativa de WebSockets para abstraer la comunicación de bajo nivel.
**Responsibilities:**
- Provide a high-level interface for WebSocket connections
- Handle connection lifecycle, reconnection logic, and error recovery
- Abstract raw WebSocket message handling
- Integrate with the EventBus for message processing
- Manage connection state and health monitoring

### 9.13. StateStreamingService (`frontend/src/services/StateStreamingService.ts`)
**Purpose:** Orquesta el flujo de datos de estado hacia y desde el backend, actuando como un gestor de alto nivel sobre WebSocketService.
**Responsibilities:**
- Coordinate state synchronization between frontend and backend
- Manage streaming protocols for real-time state updates
- Handle message serialization/deserialization
- Provide high-level state streaming APIs
- Integrate with WebSocketService for transport layer

### 9.14. Protocol Bundle (`frontend/src/services/protocol/`)
**Purpose:** Define el patrón para la traducción de datos crudos.
**Responsibilities:**
- Provide interfaces and implementations for message adaptation
- Transform raw data from external sources into domain events
- Support multiple protocol formats and adapters
- Enable pluggable protocol handling
- Integrate with EventBus for event emission
**Key Component - IMessageAdapter:**
- Interface for protocol adapters
- Defines contract for raw data transformation
- Used by @AdaptAndEmit decorator for automatic adaptation

### 9.15. Config-Validator Bundle (`frontend/src/services/config-validators/`)
**Purpose:** Validación de configuración post-carga, asegurando que los objetos de configuración inyectados son correctos en tiempo de ejecución.
**Responsibilities:**
- Validate configuration objects after loading
- Ensure configuration structure matches expected schemas
- Provide runtime configuration validation
- Support multiple validation strategies
- Integrate with dependency injection for automatic validation

### 9.16. BrowserEventsService (`frontend/src/services/BrowserEventsService.ts`)
**Purpose:** Servicio responsable de abstraer y centralizar los eventos del navegador (resize, focus, etc.) y emitirlos en el EventBus.
**Responsibilities:**
- Listen to browser events (resize, focus, blur, visibility change, etc.)
- Transform browser events into domain events
- Emit events on the EventBus for system-wide consumption
- Provide centralized browser event management
- Handle event cleanup and memory management

### 9.17. RhythmicMovementController (`frontend/src/services/RhythmicMovementController.ts`)
**Purpose:** Orquestador de la lógica de movimiento rítmico, consumiendo eventos de input y produciendo eventos de acción de juego.
**Responsibilities:**
- Process player input events for rhythmic movement
- Calculate movement timing and rhythm accuracy
- Generate game action events based on input
- Maintain rhythm state and timing calculations
- Integrate with EventBus for input/output event handling

---

## 10. Testing & Debugging Philosophy

### 10.1. Fundamental Principles
- **Testing Pyramid:** We adopt the testing pyramid model. The base consists of fast unit tests, followed by service integration tests, and finally a reduced number of E2E tests.
- **Zero Tolerance:** A broken test is a broken build. Code that breaks existing tests is not integrated. Tests are the specification; code adapts to them.
- **Isolation is Key:** Tests must not have side effects. Each test must be able to run independently and in any order.

### 10.2. Backend Testing Factory: `TestCompositionRootFactory`
The pillar of our backend service testing is the `TestCompositionRootFactory`.

- **Purpose:** Provides a pre-configured and isolated CompositionRoot for each test. This allows us to test a service (Service Under Test - SUT) in a controlled environment where all dependencies are mocked.
- **Golden Rule:** It is **PROHIBITED** to manually instantiate services with `new` or direct constructor calls within test files. All services must be resolved through the test CompositionRoot to ensure correct mock injection.

### 10.3. Frontend Mocking & Test Container Architecture

#### Isolated Container Pattern (GOLD.CODE STANDARD)
- **MANDATE:** The `test-container-factory.ts` implements the "Isolated Container Pattern" where each test receives a completely new `Container()` instance, ensuring total isolation and preventing cross-contamination.
- **Prohibition:** Parent/Child container patterns are FORBIDDEN for service testing. The isolated approach guarantees predictability and prevents state leakage between tests.

#### Centralized Mock Management
- **Mock Directory:** All service mocks are centralized in `src/testing/mocks/` directory with individual files following `<service-name>.mock.ts` naming convention.
- **Single Source of Truth:** Each mock interface (ILogger, IEventBus, etc.) has exactly one mock implementation file that serves as the authoritative source for all tests.
- **Maintainability:** Mock definitions are separated from factory logic, enabling independent evolution and testing of mock behaviors.

#### Global vs Service Mocks Distinction
- **Global Mocks (`src/testing/setup.ts`):** Handle environment-wide mocking (decorators, browser APIs, external libraries like Tone.js) that should never execute real logic in any test.
- **Service Mocks (`src/testing/mocks/`):** Provide controlled implementations of our interfaces (ILogger, IEventBus, etc.) for asserting service interactions and behaviors.

### 10.4. Frontend Testing Factory: `test-container-factory.ts`

### 10.5. Dependency Mocking and Decorators
- **Dependencies:** All external dependencies (`ILogger`, `IEventBus`, `IConfigurationService`, etc.) are replaced by mocks in the test factories. This allows us to assert that a service calls its dependencies correctly (e.g., `expect(mockLogger.info).toHaveBeenCalled()`).
- **Decorators:** Decorators like `@logMethod` or `@catchError` are globally mocked in Jest/Vitest configuration so they do not interfere with test logic.

### 10.6. Testing Strategy Execution Protocol

#### STEP 1: Identify Service Under Test (SUT)
- **MANDATE:** Choose ONE service to test in isolation
- **LOCATION:** The service being tested should be bound to its concrete implementation
- **DEPENDENCIES:** ALL dependencies of the SUT must be mocked

#### STEP 2: Create Test Container/CompositionRoot
- **Backend:** Use `TestCompositionRootFactory.create_mocked_composition_root()`
- **Frontend:** Use `createTestContainer()` from test-container-factory
- **CRITICAL:** Never instantiate the SUT directly with `new`

#### STEP 3: Configure Mock Behaviors
- **Extract mocks:** Get dependency mocks from the factory
- **Configure returns:** Set up mock return values for expected behavior
- **Setup spies:** Configure mocks to track method calls

#### STEP 4: Exercise the SUT
- **Resolve from container:** Get the SUT instance from the test container/root
- **Call methods:** Execute the functionality being tested
- **Use real parameters:** Pass realistic data to the SUT methods

#### STEP 5: Assert Results and Interactions
- **Verify outputs:** Assert that the SUT returns expected results
- **Check interactions:** Verify the SUT called its dependencies correctly
- **Validate state:** Ensure the SUT's internal state is as expected

### 10.7. E2E Debugging: `debug-full-system.sh`
- **Purpose:** This script serves as a smoke test to verify complete integration between frontend and backend. It is useful for detecting configuration, environment, or communication issues between the two systems.
- **Limitations:** Should not be used for iterative component development. Its feedback cycle is too long. It is a validation tool, not a rapid development tool.

### 10.8. Future Vision: Improving the Ecosystem
We are actively investigating more advanced testing tools to accelerate our development cycles, including:
- **Vitest:** For a native Vite test runner with HMR.
- **Playwright/Cypress Component Testing:** For testing React components in isolation, but with real browser power.
- **Storybook:** For visual development and documentation of UI components.

### 10.9. Testing Anti-Patterns (FORBIDDEN)

#### Backend Anti-Patterns:
Direct service instantiation and mock patches that bypass the container are forbidden.

#### Frontend Anti-Patterns:
Direct service instantiation and direct container access in tests are forbidden.

---

## 12. AI-First Development Protocol

### 12.1. AI-Native Codebase Philosophy
**MANDATE:** This entire codebase is developed exclusively with AI assistance. All code, from initial conception to final implementation, is written, reviewed, and optimized by AI agents following QUALIA.CODE standards.

**Key Principles:**
- **AI Expertise Utilization:** Leverage AI's comprehensive knowledge across all programming languages and frameworks
- **Optimal Language Selection:** Choose the most appropriate programming language for each specific task rather than defaulting to generic solutions
- **Continuous Optimization:** AI agents must continuously evaluate and optimize code for performance, maintainability, and architectural compliance

### 12.2. Language Optimization Requirements

**MANDATE:** AI agents MUST select the most optimal programming language for each component's specific requirements, without being constrained by traditional language preferences or team familiarity.

#### Language Selection Criteria:
- **Performance Requirements:** Use systems languages (Rust, C++, Go) for high-performance computing tasks
- **Concurrency Needs:** Select languages with superior concurrency models (Go, Erlang/Elixir, Rust) for parallel processing
- **Memory Safety:** Prioritize memory-safe languages (Rust, Swift) for critical system components
- **Ecosystem Fit:** Choose languages with the best libraries and frameworks for specific domains
- **Maintainability:** Consider long-term maintenance costs and team capabilities

#### Prohibited Practices:
- **Language Lock-in:** Do not default to TypeScript/JavaScript for all frontend tasks when other languages would be superior
- **Framework Dependency:** Avoid choosing languages solely based on framework availability
- **Historical Precedence:** Do not maintain legacy language choices that no longer serve the project's needs

### 12.3. Suboptimal Language Detection & Reporting

**CRITICAL REQUIREMENT:** AI agents MUST actively scan the codebase and report any files written in suboptimal languages for their intended function.

#### Detection Protocol:
1. **Continuous Analysis:** Regularly evaluate existing files against current best practices
2. **Performance Metrics:** Monitor execution performance, memory usage, and scalability
3. **Ecosystem Evolution:** Track new language features and framework improvements
4. **Architectural Fit:** Assess how well the language serves the component's role in the overall system

#### Reporting Requirements:
- **Immediate Notification:** Report suboptimal language usage to the development team
- **Migration Proposals:** Provide detailed migration plans with performance comparisons
- **Risk Assessment:** Document potential risks of maintaining suboptimal implementations
- **Timeline Recommendations:** Suggest migration priorities based on impact and complexity

### 12.4. AI Agent Responsibilities

**MANDATE:** All AI agents working on this codebase must:

1. **Language Expertise:** Maintain comprehensive knowledge of multiple programming languages and their optimal use cases
2. **Performance Optimization:** Continuously optimize code for the chosen language's strengths
3. **Migration Planning:** Propose language migrations when beneficial
4. **Documentation:** Clearly document language selection rationale in code comments
5. **Peer Review:** Evaluate other AI agents' language choices for optimality

### 12.5. Implementation Guidelines

---

*"Code is the architecture of thought. Choose the language that best expresses your computational intent."*
