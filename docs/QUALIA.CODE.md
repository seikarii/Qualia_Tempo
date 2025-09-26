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

#### Ejemplo: Definición de Tipos (`inversify.types.ts`)
```typescript
export const TYPES = {
  // --- Core Services ---
  Logger: Symbol.for("Logger"),
  EventBus: Symbol.for("EventBus"),
  ConfigurationService: Symbol.for("ConfigurationService"),
  IHttpService: Symbol.for("IHttpService"),
  ITimerService: Symbol.for("ITimerService"),

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

## 4. Architectural Linting: QUALIA.CODE Enforcement System

QUALIA.CODE implements a comprehensive dual-linting system to automatically enforce architectural compliance across the entire codebase. The system operates on both frontend (TypeScript/React) and backend (Python/FastAPI) simultaneously, ensuring no architectural violations are introduced during development.

### 4.1. System Overview

The linting system consists of three integrated components:

1. **Frontend ESLint Plugin** (`@qualia-tempo/eslint-plugin-qualia-code`): Custom ESLint rules that validate TypeScript/React code against QUALIA.CODE principles
2. **Backend Python AST Analyzer**: Custom Python script that parses abstract syntax trees to detect architectural violations in Python code
3. **Unified Orchestration Script** (`scripts/lint-architecture.sh`): Single command that runs both linting systems and provides consolidated reporting

### 4.2. Usage

#### Running the Complete Architectural Linter

```bash
# From project root
./scripts/lint-architecture.sh
```

This command will:
- ✅ Check frontend TypeScript/React code with custom ESLint rules
- ✅ Analyze backend Python code for architectural violations
- ✅ Provide colored output with violation details
- ✅ Exit with code 0 if compliant, 1 if violations found
- ✅ Show quick fix suggestions for common violations

#### Integration with Development Workflow

The linter should be run:
- **Pre-commit**: Via git hooks to prevent architectural violations from entering the repository
- **CI/CD**: As part of automated pipelines to ensure continuous compliance
- **Manual**: During development to catch violations early

```bash
# Example: Add to package.json scripts
{
  "scripts": {
    "lint:architecture": "./scripts/lint-architecture.sh",
    "precommit": "npm run lint:architecture"
  }
}
```

### 4.3. Frontend ESLint Rules

The custom ESLint plugin enforces the following QUALIA.CODE principles:

#### `no-direct-service-instantiation`
- **Prohibits:** `new ServiceName()` in React components
- **Requires:** Services accessed via `useServices()` hook
- **Rationale:** Enforces IoC/DI patterns and prevents tight coupling

#### `enforce-use-services-hook`
- **Prohibits:** Direct service imports in React components
- **Requires:** `useServices()` hook usage
- **Rationale:** Maintains separation between UI and business logic

#### `no-complex-use-state`
- **Prohibits:** Complex objects/arrays in `useState`
- **Requires:** Simple primitives only; complex state in Zustand store
- **Rationale:** Consistent state management architecture

#### `no-hardcoded-config`
- **Prohibits:** Hardcoded values in service files
- **Requires:** All configuration from external YAML files
- **Rationale:** Externalized, runtime-configurable behavior

#### `no-manual-contract-edit`
- **Prohibits:** Manual editing of generated contract files
- **Requires:** `@generated DO NOT EDIT` comments in auto-generated files
- **Rationale:** Single source of truth for data contracts

#### `deprecate-api-client`
- **Prohibits:** Direct `ApiClient` usage
- **Requires:** Event-driven communication via EventBus
- **Rationale:** Decoupled, testable communication patterns

#### `enforce-method-decorators`
- **Prohibits:** Service methods without required decorators
- **Requires:** `@logMethod()`, `@catchError()`, `@validate()` decorators
- **Rationale:** Consistent transversal logic application

#### `enforce-inversify-conventions`
- **Prohibits:** Missing `@injectable()` or `@inject()` decorators
- **Requires:** Proper InversifyJS IoC container setup
- **Rationale:** Dependency injection architectural integrity

### 4.4. Backend Python Rules

The Python AST analyzer validates:

#### Direct Service Instantiation Detection
- **Prohibits:** `Service()` constructor calls outside CompositionRoot
- **Requires:** All services resolved via CompositionRoot dependency injection
- **Detection:** AST parsing identifies `Service()` calls in inappropriate contexts

#### Decorator Compliance
- **Prohibits:** Public methods without `@log_execution` decorator
- **Requires:** All service methods decorated for logging and error handling
- **Detection:** AST analysis of function definitions and decorator lists

#### Directory Filtering
- **Ignores:** Virtual environments (`.venv`), cache directories (`__pycache__`), build artifacts
- **Focus:** User code only, excluding dependencies and generated files
- **Performance:** Prevents analysis of thousands of dependency files

### 4.5. Output and Error Handling

#### Success State
```bash
🏗️  QUALIA.CODE Architectural Enforcement
=========================================
📋 Phase 1: Frontend ESLint Rules
   Running ESLint with QUALIA.CODE rules...
   ✅ Frontend architectural compliance: PASSED

📋 Phase 2: Backend Python Rules
   Running QUALIA.CODE Python linter...
   ✅ Backend architectural compliance: PASSED

📋 Phase 3: Summary
   Frontend Compliance: PASSED
   Backend Compliance: PASSED

🎉 ARCHITECTURAL ENFORCEMENT: ALL SYSTEMS COMPLIANT
   QUALIA.CODE principles successfully enforced
```

#### Violation State
```bash
🏗️  QUALIA.CODE Architectural Enforcement
=========================================
📋 Phase 1: Frontend ESLint Rules
   Running ESLint with QUALIA.CODE rules...
   ❌ Frontend architectural violations detected

📋 Phase 2: Backend Python Rules
   Running QUALIA.CODE Python linter...
   ❌ Backend architectural violations detected
   MyService.py:15: Method process_data missing @log_execution decorator
   MyComponent.tsx:10: Direct service instantiation detected

📋 Phase 3: Summary
   Frontend Compliance: FAILED
   Backend Compliance: FAILED

🚫 ARCHITECTURAL ENFORCEMENT: VIOLATIONS DETECTED
   2 system(s) have architectural violations

💡 Quick Fixes:
   • Frontend: Use useService() hooks instead of direct imports
   • Backend: Add @log_execution decorators to service methods
   • Backend: Inject services via CompositionRoot, never 'new Service()'
```

### 4.6. Configuration and Customization

#### ESLint Plugin Configuration
Located in `eslint-plugin-qualia-code/`, the plugin can be configured per project needs:

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

Example GitHub Actions workflow:

```yaml
name: QUALIA.CODE Compliance
on: [push, pull_request]

jobs:
  lint-architecture:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          npm install
          python -m venv .venv
          source .venv/bin/activate
          pip install -r requirements.txt
      - name: Run Architectural Linter
        run: ./scripts/lint-architecture.sh
```

---

## 5. Communication: Event-Driven Architecture

- The direct `ApiClient` is deprecated.
- An `EventBus` service will be implemented on both frontend and backend.
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
- `@validate(schemaName)`: Validates method arguments against a registered schema. The first argument of the method is validated against the specified schema from the schema registry.

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

## 8. AI Workflow Example: Adding a new Qualia Parameter

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

---

## 10. Testing & Debugging Philosophy

### 7.1. Principios Fundamentales
- **Pirámide de Testing:** Adoptamos el modelo de la pirámide de testing. La base son los tests unitarios rápidos, seguidos por tests de integración de servicios, y finalmente, un número reducido de tests E2E.
- **Tolerancia Cero:** Un test roto es un `build` roto. No se integra código que rompa los tests existentes. Los tests son la especificación; el código se adapta a ellos.
- **Aislamiento es Clave:** Los tests no deben tener efectos secundarios. Cada test debe poder ejecutarse de forma independiente y en cualquier orden.

### 7.2. Backend Testing Factory: `TestCompositionRootFactory`
El pilar de nuestro testing de servicios backend es el `TestCompositionRootFactory`.

- **Propósito:** Proporciona un CompositionRoot pre-configurado y aislado para cada test. Esto nos permite testear un servicio (Service Under Test - SUT) en un entorno controlado donde todas sus dependencias están mockeadas.
- **Regla de Oro:** Está **PROHIBIDO** instanciar servicios manualmente con `new` o llamadas directas al constructor dentro de los archivos de test. Todos los servicios deben ser resueltos a través del CompositionRoot de test para garantizar que se inyectan los mocks correctos.

#### Ejemplo de Uso (Backend):
```python
import pytest
from backend.tests.test_composition_root import TestCompositionRootFactory

class TestMyService:
    @pytest.fixture
    def mocked_composition_root(self):
        return TestCompositionRootFactory.create_mocked_composition_root()
    
    def test_my_service_functionality(self, mocked_composition_root):
        # Arrange: Extract dependency mocks
        mocks = TestCompositionRootFactory.get_service_mocks(mocked_composition_root)
        event_bus_mock = mocks["event_bus"]
        
        # Act: Resolve Service Under Test from container
        my_service = mocked_composition_root.get_service("my_service")
        
        # Configure mock behavior
        event_bus_mock.publish.return_value = asyncio.create_task(asyncio.sleep(0))
        
        # Exercise the service
        result = my_service.do_something()
        
        # Assert
        assert result is not None
        event_bus_mock.publish.assert_called_once()
```

### 7.3. Frontend Testing Factory: `test-container-factory.ts`
El pilar de nuestro testing de servicios frontend es el `test-container-factory.ts`.

- **Propósito:** Proporciona un contenedor de InversifyJS pre-configurado y aislado para cada test. Esto nos permite testear un servicio (Service Under Test - SUT) en un entorno controlado donde todas sus dependencias están mockeadas.
- **Regla de Oro:** Está **PROHIBIDO** instanciar servicios manualmente con `new` dentro de los archivos de test. Todos los servicios deben ser resueltos a través del contenedor de test para garantizar que se inyectan los mocks correctos.

#### Ejemplo de Uso (Frontend):
```typescript
import { createTestContainer, getMocksFromContainer } from '../testing/test-container-factory';
import { INotificationService } from '../services/interfaces/INotificationService';
import { ILogger } from '../services/interfaces/ILogger';
import { TYPES } from '../services/inversify.types';

describe('NotificationService', () => {
  let container: Container;
  let notificationService: INotificationService;
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(() => {
    container = createTestContainer();
    notificationService = container.get<INotificationService>(TYPES.INotificationService);
    const mocks = getMocksFromContainer(container);
    mockLogger = mocks.mockLogger as jest.Mocked<ILogger>;
  });

  it('should do something correctly', () => {
    // Arrange
    const message = 'Test';

    // Act
    notificationService.show(message);

    // Assert
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining(message));
  });
});
```

### 7.4. Mocking de Dependencias y Decoradores
- **Dependencias:** Todas las dependencias externas (`ILogger`, `IEventBus`, `IConfigurationService`, etc.) son reemplazadas por mocks en las factories de test. Esto nos permite afirmar que un servicio llama a sus dependencias correctamente (p. ej., `expect(mockLogger.info).toHaveBeenCalled()`).
- **Decoradores:** Los decoradores como `@logMethod` o `@catchError` se mockean globalmente en la configuración de Jest/Vitest para que no interfieran con la lógica del test.

### 7.5. Testing Strategy Execution Protocol

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

### 7.6. Debugging E2E: `debug-full-system.sh`
- **Propósito:** Este script sirve como una prueba de humo (smoke test) para verificar la integración completa entre el frontend y el backend. Es útil para detectar problemas de configuración, de entorno o de comunicación entre los dos sistemas.
- **Limitaciones:** No debe usarse para el desarrollo iterativo de componentes. Su ciclo de feedback es demasiado largo. Es una herramienta de validación, no de desarrollo rápido.

### 7.7. Visión Futura: Mejorando el Ecosistema
Estamos investigando activamente herramientas de testing más avanzadas para acelerar nuestros ciclos de desarrollo, incluyendo:
- **Vitest:** Para un corredor de tests nativo de Vite con HMR.
- **Playwright/Cypress Component Testing:** Para testear componentes de React en aislamiento, pero con la potencia de un navegador real.
- **Storybook:** Para el desarrollo y la documentación visual de componentes de UI.

### 7.8. Testing Anti-Patterns (FORBIDDEN)

#### Backend Anti-Patterns:
```python
# FORBIDDEN: Direct service instantiation
from backend.services.MyService import MyService
service = MyService(dependency)  # CRITICAL VIOLATION

# FORBIDDEN: Mock patches that bypass the container
@patch('backend.services.MyService.dependency')
def test_with_patch(mock_dep):
    service = MyService()  # STILL VIOLATES IoC

# CORRECT: Use the factory
def test_with_factory(mocked_composition_root):
    service = mocked_composition_root.get_service("my_service")
```

#### Frontend Anti-Patterns:
```typescript
// FORBIDDEN: Direct service instantiation
import { MyService } from '../services/MyService';
const service = new MyService(mockDep);  // CRITICAL VIOLATION

// FORBIDDEN: Direct container access in tests
import { container } from '../services/inversify.config';
const service = container.get<IMyService>(TYPES.IMyService);  // VIOLATION

// CORRECT: Use the test factory
import { createTestContainer } from '../testing/test-container-factory';
const testContainer = createTestContainer();
const service = testContainer.get<IMyService>(TYPES.IMyService);
```

## 11. Forbidden Practices: Global API Usage

To maintain architectural integrity, testability, and control, the direct use of the following global APIs within the services layer (`src/services`) is **STRICTLY FORBIDDEN**.

### 9.1. Network Requests
- **FORBIDDEN:** `fetch()`
- **REQUIRED:** Use the injected `IHttpService`.
- **Example:**
  ```typescript
  // INCORRECT - VIOLATION
  const response = await fetch('/api/data');

  // CORRECT - USE THIS
  const data = await this.httpService.get('/api/data');
  ```

### 9.2. Timer Operations
- **FORBIDDEN:** `setTimeout()`, `setInterval()`, `clearTimeout()`, `clearInterval()`
- **REQUIRED:** Use the injected `ITimerService`.
- **Example:**
  ```typescript
  // INCORRECT - VIOLATION
  const timerId = setTimeout(() => { /* ... */ }, 1000);
  clearTimeout(timerId);

  // CORRECT - USE THIS
  const timerId = this.timerService.setTimeout(() => { /* ... */ }, 1000);
  this.timerService.clearTimeout(timerId);
  ```
