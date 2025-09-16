# Qualia Tempo - AI Agent Instructions
# QUALIA.CODE v1.0 - AI Execution Manual
# TARGET: Qualia Tempo Prototype
# COMPLIANCE: MANDATORY

---

## 🎯 Project Overview
Qualia Tempo is a rhythm game where player performance generates real-time procedural visual effects through the **QualiaState** system. The architecture consists of a Python FastAPI backend for visual processing and a TypeScript React frontend for gameplay.

## 🏗️ Architecture: Composition Root & IoC

### Core Philosophy
- **No Prototypes:** We build definitive systems. Every component must be production-grade from inception.
- **Decoupling is Law:** Components must not have direct knowledge of each other. Communication occurs via contracts and messaging.
- **Automation First:** Repetitive tasks (code generation, validation) must be scripted.

### Backend (Python/FastAPI)
- A single `CompositionRoot` class is responsible for instantiating all services (e.g., `ParticleEngine`, `QualiaProcessor`).
- Services are injected into API routes using FastAPI's dependency injection system, configured by the `CompositionRoot`.
- **PROHIBITED:** Manual instantiation of services within routes or other services.

### Frontend (TypeScript/React)
- A single `CompositionRoot.ts` initializes all services (`QualiaService`, `EventBus`, `GameStateStore`) and provides them through a React Context.
- Components will access services via a `useServices()` hook.
- **PROHIBITED:** Manual instantiation of services inside components (`new MyService()`).

### Core Data Flow
- **QualiaState**: Central data structure representing player mastery (intensity, precision, flow, chaos, etc.)
- **Event-Driven Communication**: Frontend → Backend via EventBus and throttled messaging
- **Visual Engine**: Backend processes QualiaState to generate GLSL shader effects

### Key Files to Understand First
- `backend/api/models.py` - Pydantic models defining QualiaState structure (GENERATED)
- `frontend/src/types/contracts.ts` - TypeScript interfaces (GENERATED)
- `shared_contracts/` - JSON Schema definitions (SINGLE SOURCE OF TRUTH)
- `frontend/src/services/EventBus.ts` - Event-driven communication
- `frontend/src/services/QualiaStateCalculatorService.ts` - QualiaState computation
- `backend/src/services/EventBus.py` - Backend event handling

## 🔧 Development Workflows

### Backend Setup & Testing
```bash
cd qualia-tempo-prototype
source .venv/bin/activate
cd backend
black . && ruff check . --fix && mypy . --ignore-missing-imports
python -m pytest tests/ -v
```

### Frontend Setup & Testing
```bash
cd qualia-tempo-prototype/frontend
npm run lint && npx tsc --noEmit
npm test -- --watchAll=false
```

### Contract Generation (MANDATORY after schema changes)
```bash
# After modifying JSON schemas in /shared_contracts
./scripts/generate_contracts.sh
```

### Full Project Validation
```bash
# Backend quality checks
cd backend && black . && ruff check . --fix && mypy . --ignore-missing-imports && python -m pytest tests/ -v

# Frontend quality checks
cd ../frontend && npm run lint && npx tsc --noEmit && npm test -- --watchAll=false

# Contract generation
./scripts/generate_contracts.sh
```

## 📝 Code Conventions

### Shared Contracts: The Single Source of Truth
- All shared data structures (`QualiaState`, `CombatData`) are defined in JSON Schema files within a `/shared_contracts` directory.
- A script (`scripts/generate_contracts.sh`) MUST be run after any change to the schemas. This script will:
  1. Generate Pydantic models in `backend/api/models.py`.
  2. Generate TypeScript interfaces in `frontend/src/types/contracts.ts`.
- **PROHIBITED:** Manual editing of the generated model and interface files.

### Python Backend
- **Models**: Use Pydantic BaseModel for all data structures (GENERATED from JSON Schema)
- **Logging**: Use `@log_execution(level="INFO")` decorator for QualiaState updates
- **Imports**: Relative imports within backend packages (`from .models import ...`)
- **Error Handling**: Use `@handle_errors(fallback_return_value=None)` decorator
- **Validation**: Use `@validate_schema(schema_name="QualiaState")` decorator

### TypeScript Frontend
- **State Management**: Use Zustand store with slices for different domains (e.g., `playerSlice`, `combatSlice`, `qualiaSlice`)
- **Event Communication**: Use EventBus for all inter-component communication
- **Component Structure**: Functional components with hooks
- **Type Safety**: Strict TypeScript with no `any` types
- **Decorators**: Use `@logMethod()`, `@throttle(milliseconds=250)`, `@catchError()`

### Testing Patterns
- **Backend**: Use `TestClient` from FastAPI for API endpoint testing
- **Frontend**: Mock services using Jest mocks
- **Test Files**: Place in `__tests__/` directories or use `.test.` suffix
- **Event Testing**: Mock EventBus for component testing

## 🎮 QualiaState System

### Core Properties
```typescript
interface QualiaState {
  intensity: number;      // Overall energy level (0-1)
  precision: number;      // Accuracy streaks (0-1)
  aggression: number;     // Fast Forward usage (0-1)
  flow: number;          // Rhythmic consistency (0-1)
  chaos: number;         // Rhythm failures (0-1)
  recovery: number;      // Rewind usage (0-1)
  transcendence: number; // Ultimate mode (0-1)
}
```

### Event-Driven Update Pattern
- Player actions (`Dash`, `HitNote`) generate events on the frontend `EventBus`
- `QualiaStateCalculatorService` listens to these events and computes the new `QualiaState`
- Upon change, it emits a `QualiaStateUpdated` event with the new state
- `BackendSyncService` listens for `QualiaStateUpdated`, throttles the events, and sends the final state to the backend API
- Backend publishes to EventBus, visual systems subscribe to update themselves

## 🚀 Common Tasks

### Adding a new Qualia Parameter
1. **Modify Contract:** Edit the appropriate JSON Schema file in `/shared_contracts`
2. **Generate Code:** Run `scripts/generate_contracts.sh`. Verify the changes in the generated Python model and TypeScript interface
3. **Update Logic:**
   - **Frontend:** Modify the `QualiaStateCalculatorService` to compute the new parameter
   - **Backend:** Modify the visual systems (`ParticleEngine`, etc.) to react to the new parameter from the event bus
4. **Apply Decorators:** Ensure any new methods use the appropriate decorators for logging, error handling, and validation
5. **Test:** Write unit tests for the new calculation logic and integration tests for the visual output

### Backend API Changes
1. Add new endpoint in `api/routes.py` following FastAPI patterns with dependency injection
2. Update JSON Schema in `/shared_contracts` (if needed)
3. Run `scripts/generate_contracts.sh` to update models
4. Add comprehensive tests in `tests/test_*.py`
5. Verify with `python -m pytest tests/ -v`

### Frontend Component Changes
1. Use EventBus for communication instead of direct service calls
2. Access services via `useServices()` hook from React Context
3. Follow TypeScript strict mode with generated interfaces
4. Add tests with proper EventBus mocking
5. Verify with `npm test`

## ⚠️ Critical Patterns

### Communication: Event-Driven Architecture
- The direct `ApiClient` is deprecated
- An `EventBus` service will be implemented on both frontend and backend
- **PROHIBITED:** Direct service instantiation or API calls in components

### State Management
- All application state is managed in a `GameStateStore` (built with Zustand)
- The store is divided into "slices" for different domains
- **PROHIBITED:** Storing state directly in React components using `useState` for anything other than trivial, non-persistent UI state

### Transversal Logic: Decorators (MANDATORY)
#### Python Decorators (`backend/utils/decorators.py`)
- `@log_execution(level="INFO")`: Logs function entry, exit, and execution time
- `@handle_errors(fallback_return_value=None)`: Wraps function in a try/except block and logs errors
- `@validate_schema(schema_name="QualiaState")`: Validates input against a shared contract schema

#### TypeScript Decorators (`frontend/src/utils/decorators.ts`)
- `@logMethod()`: Logs method calls and arguments
- `@throttle(milliseconds=250)`: Throttles the execution of a method
- `@catchError()`: Catches runtime errors within a method and logs them to a reporting service

### Error Boundaries
- Backend: Use `@handle_errors` decorator with context logging
- Frontend: Use `@catchError()` decorator for runtime error handling
- Always check service availability before operations

## 🔍 Debugging Commands

```bash
# Check backend connectivity
curl http://localhost:8000/health

# Send test QualiaState
curl -X POST http://localhost:8000/update_qualia \
  -H "Content-Type: application/json" \
  -d '{"intensity":0.8,"precision":0.5,"aggression":0.7,"flow":0.9,"chaos":0.1,"recovery":0.0,"transcendence":0.0}'

# Generate contracts after schema changes
./scripts/generate_contracts.sh
```

## 📁 Project Structure
```
qualia-tempo-prototype/
├── shared_contracts/          # JSON Schema definitions (SINGLE SOURCE OF TRUTH)
├── scripts/
│   └── generate_contracts.sh  # Contract generation script
├── backend/                   # Python FastAPI server
│   ├── api/
│   │   ├── models.py          # GENERATED Pydantic models
│   │   └── routes.py          # API endpoints with DI
│   ├── engine/                # Visual processing engine
│   ├── services/              # Backend services (EventBus, etc.)
│   └── utils/decorators.py    # Python decorators
└── frontend/                  # TypeScript React client
    ├── src/
    │   ├── services/          # Frontend services (EventBus, QualiaService, etc.)
    │   ├── state/             # Zustand store slices
    │   ├── types/
    │   │   └── contracts.ts   # GENERATED TypeScript interfaces
    │   └── utils/decorators.ts # TypeScript decorators
    └── CompositionRoot.ts     # Service initialization
```


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

### 2.2. Frontend (TypeScript/React)
- A single `CompositionRoot.ts` initializes all services (`QualiaService`, `EventBus`, `GameStateStore`, `ConfigurationService`) and provides them through a React Context.
- Components will access services via a `useServices()` hook.
- **PROHIBITED:** Manual instantiation of services inside components (`new MyService()`).

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
4.  **Update Logic:**
    - **Frontend:** Modify the `QualiaStateCalculatorService` to compute the new parameter using configuration from `ConfigurationService`.
    - **Backend:** Modify the visual systems (`ParticleEngine`, etc.) to react to the new parameter from the event bus.
5.  **Apply Decorators:** Ensure any new methods use the appropriate decorators for logging, error handling, and validation.
6.  **Test:** Write unit tests for the new calculation logic and integration tests for the visual output.

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

### 8.8. CompositionRoot (`frontend/src/services/CompositionRoot.ts`)
**Purpose:** Central IoC container and service lifecycle management.
**Responsibilities:**
- Instantiate and configure all services
- Manage service dependencies and initialization order
- Provide service access through React Context
- Handle service health monitoring and restart
- Coordinate service shutdown and cleanup
**Key Methods:**
- `initialize()`: Initialize all services in proper order
- `shutdown()`: Gracefully shutdown all services
- `getServiceStatus()`: Return status of all services
- `restartService(serviceName)`: Restart a specific service
- `performHealthCheck()`: Check health of all services

### 8.9. Service Hooks (`frontend/src/services/hooks.ts`)
**Purpose:** React hooks for type-safe service access.
**Responsibilities:**
- Provide access to services from React components
- Ensure services are used within proper context
- Type-safe service method access
- Follow React hooks conventions and rules
**Available Hooks:**
- `useServices()`: Access all services
- `useEventBus()`: Access EventBus service
- `useQualiaCalculator()`: Access QualiaStateCalculatorService
- `useBackendSync()`: Access BackendSyncService
- `useGameController()`: Access GameControllerService
- `useConfiguration()`: Access ConfigurationService

### 8.10. ConfigurationService (`frontend/src/services/ConfigurationService.ts`)
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
