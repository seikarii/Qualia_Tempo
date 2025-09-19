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

---

## 9. Testing & Debugging Philosophy

### 9.1. Principios Fundamentales
- **Pirámide de Testing:** Adoptamos el modelo de la pirámide de testing. La base son los tests unitarios rápidos, seguidos por tests de integración de servicios, y finalmente, un número reducido de tests E2E.
- **Tolerancia Cero:** Un test roto es un `build` roto. No se integra código que rompa los tests existentes. Los tests son la especificación; el código se adapta a ellos.
- **Aislamiento es Clave:** Los tests no deben tener efectos secundarios. Cada test debe poder ejecutarse de forma independiente y en cualquier orden.

### 9.2. Tests Unitarios y de Integración: `test-container-factory.ts`
El pilar de nuestro testing de servicios es el `test-container-factory.ts`.

- **Propósito:** Proporciona un contenedor de InversifyJS pre-configurado y aislado para cada test. Esto nos permite testear un servicio (Service Under Test - SUT) en un entorno controlado donde todas sus dependencias están mockeadas.
- **Regla de Oro:** Está **PROHIBIDO** instanciar servicios manualmente con `new` dentro de los archivos de test. Todos los servicios deben ser resueltos a través del contenedor de test para garantizar que se inyectan los mocks correctos.

#### Ejemplo de Uso:
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

### 9.3. Mocking de Dependencias y Decoradores
- **Dependencias:** Todas las dependencias externas (`ILogger`, `IEventBus`, `IConfigurationService`, etc.) son reemplazadas por mocks en el `test-container-factory`. Esto nos permite afirmar que un servicio llama a sus dependencias correctamente (p. ej., `expect(mockLogger.info).toHaveBeenCalled()`).
- **Decoradores:** Los decoradores como `@logMethod` o `@catchError` se mockean globalmente en la configuración de Jest (`test-container-factory.ts`) para que no interfieran con la lógica del test.

### 9.4. Debugging E2E: `debug-full-system.sh`
- **Propósito:** Este script sirve como una prueba de humo (smoke test) para verificar la integración completa entre el frontend y el backend. Es útil para detectar problemas de configuración, de entorno o de comunicación entre los dos sistemas.
- **Limitaciones:** No debe usarse para el desarrollo iterativo de componentes. Su ciclo de feedback es demasiado largo. Es una herramienta de validación, no de desarrollo rápido.

### 9.5. Visión Futura: Mejorando el Ecosistema
Estamos investigando activamente herramientas de testing más avanzadas para acelerar nuestros ciclos de desarrollo, incluyendo:
- **Vitest:** Para un corredor de tests nativo de Vite con HMR.
- **Playwright/Cypress Component Testing:** Para testear componentes de React en aislamiento, pero con la potencia de un navegador real.
- **Storybook:** Para el desarrollo y la documentación visual de componentes de UI.

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
