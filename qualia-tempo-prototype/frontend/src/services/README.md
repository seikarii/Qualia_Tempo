# Frontend Services - QUALIA.CODE v1.0

This directory contains all frontend services that implement the QUALIA.CODE architecture for the Qualia Tempo prototype.

## Architecture Overview

The frontend follows a service-based architecture with:

- **EventBus**: Central communication hub for decoupled component interaction
- **ConfigurationService**: External configuration management from YAML files
- **CompositionRoot**: IoC container managing service lifecycle and dependencies
- **Passive State Management**: Zustand store updated by services, not directly by components

## Service Directory

### Core Services

#### EventBus (`EventBus.ts`)

Central communication hub for decoupled component interaction.

- Type-safe event emission and subscription
- Async/sync event handling with error boundaries
- Automatic cleanup and memory management

#### GameStateStoreService (`GameStateStoreService.ts`) ⭐ **NEW**

Bridge service between EventBus and Zustand store for passive state management.

- Listens to GameStateChanged and QualiaStateUpdated events
- Updates Zustand store with event data in a passive manner
- Maintains unidirectional data flow: EventBus → Service → Store → UI
- Provides clean separation between event-driven logic and UI state

### Business Logic Services

#### QualiaStateCalculatorService (`QualiaStateCalculatorService.ts`)

Real-time calculation of player performance metrics.

- Processes PlayerAction events (Dash, HitNote, MissNote, etc.)
- Calculates QualiaState based on player performance
- Emits QualiaStateUpdated events with new state

#### GameControllerService (`GameControllerService.ts`)

Game state management and control logic.

- Handles game control events (StartGame, PauseGame, ResetGame)
- Maintains internal game state (isPlaying, score, health, etc.)
- Emits GameStateChanged events

#### BackendSyncService (`BackendSyncService.ts`)

Synchronized communication with backend API.

- Listens to QualiaStateUpdated events
- Throttles and batches state updates
- Handles API communication with retry logic

### Infrastructure Services

#### ConfigurationService (`ConfigurationService.ts`) ⭐ **NEW**

External configuration management and loading.

- Loads configuration from YAML files at runtime
- Provides type-safe configuration access to all services
- Validates configuration structure and values
- Supports configuration updates without code changes

#### ErrorReportingService (`ErrorReportingService.ts`)

Centralized error handling and reporting.

- Listens to Error events from EventBus
- Batches and throttles error reports
- External service integration for error reporting

#### DebugService (`DebugService.ts`)

Development-time debugging and monitoring.

- Logs service lifecycle events
- Monitors EventBus activity
- Provides debugging hooks for development

### Composition Root

#### CompositionRoot (`CompositionRoot.ts`)

Central IoC container and service lifecycle management.

- Instantiates and configures all services
- Manages service dependencies and initialization order
- Provides service access through React Context
- Handles service health monitoring and restart

#### Service Hooks (`hooks.ts`)

React hooks for type-safe service access.

- `useServices()`: Access all services
- `useEventBus()`: Access EventBus service
- `useQualiaCalculator()`: Access QualiaStateCalculatorService
- `useBackendSync()`: Access BackendSyncService
- `useGameController()`: Access GameControllerService
- `useConfiguration()`: Access ConfigurationService

## Service Lifecycle

1. **Configuration Loading**: ConfigurationService loads external YAML configuration
2. **Initialization**: Services are created by CompositionRoot in dependency order
3. **Startup**: Services subscribe to events and initialize resources
4. **Runtime**: Services process events and update state
5. **Shutdown**: Services unsubscribe from events and cleanup resources

## Data Flow

```
Configuration YAML → ConfigurationService → CompositionRoot → Services → EventBus → GameStateStoreService → Zustand Store → React Components
                                                                 ↑
Player Actions → EventBus → Services → EventBus → GameStateStoreService
```

## Development Guidelines

- **Configuration First**: All configuration must be externalized to YAML files via ConfigurationService
- **Single Responsibility**: Each service has one clear purpose
- **Event-Driven**: Services communicate via EventBus, not direct calls
- **Dependency Injection**: Services receive dependencies via constructor
- **Passive State**: UI state is updated by services, not directly by components
- **Type Safety**: All services use generated TypeScript interfaces

## Testing

Each service includes comprehensive unit tests covering:

- Initialization and cleanup
- Event handling and emission
- Error conditions and edge cases
- Integration with other services

Run tests with: `npm test`
