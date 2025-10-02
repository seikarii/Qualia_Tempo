# Application Hooks

This directory contains **business logic hooks** for the Qualia Tempo application.

## Purpose

These hooks represent a higher level of abstraction than the basic service hooks in `/services/hooks.ts`. They compose multiple services, manage local state, and implement application-specific logic patterns.

## Distinction from Service Hooks

### `/services/hooks.ts` (Infrastructure Layer)
- **Purpose**: Direct IoC container resolution
- **Pattern**: `useService<T>(TYPES.ServiceIdentifier)`
- **Responsibility**: Provide type-safe access to singleton service instances
- **Example**: `useEventBus()`, `useLogger()`, `useDebugOrchestratorService()`
- **Characteristics**: No state, no logic, pure delegation to IoC container

### `/hooks/` (Application Layer)
- **Purpose**: Business logic composition
- **Pattern**: Compose multiple service hooks + local state + application logic
- **Responsibility**: Implement reusable application patterns
- **Example**: `useServiceHealth()` (polls service for real-time updates)
- **Characteristics**: State management, timer logic, event handling

## Available Hooks

### `useServiceHealth(refreshInterval?: number): ServiceStatus[]`

Real-time service health monitoring hook.

**Purpose**: Provides near-real-time service status updates by polling the event-driven cache in `DebugOrchestratorService`.

**Architecture**:
- Uses `useDebugOrchestratorService()` to access the orchestrator
- Polls `getHealthReport()` every `refreshInterval` ms (default: 500ms)
- `getHealthReport()` is synchronous and reads from event-populated cache
- Returns array of service statuses with automatic React re-rendering

**Usage**:
```tsx
import { useServiceHealth } from '../../hooks';

const MyDiagnosticComponent: React.FC = () => {
  const serviceStatuses = useServiceHealth(500); // Poll every 500ms

  return (
    <div>
      {serviceStatuses.map(service => (
        <ServiceCard key={service.name} service={service} />
      ))}
    </div>
  );
};
```

**Event-Driven Architecture**:
1. Services emit `ServiceStatusUpdateEvent` to EventBus
2. `DebugOrchestratorService` listens and populates internal Map (push pattern)
3. `useServiceHealth()` polls `getHealthReport()` which reads from Map
4. React component re-renders with fresh data every 500ms

**Benefits**:
- ✅ Near-real-time updates (10x faster than previous 5-second interval)
- ✅ Zero async operations in the read path (synchronous cache access)
- ✅ Reusable across multiple components
- ✅ Fully type-safe with TypeScript
- ✅ Testable in isolation

## Creating New Application Hooks

When creating new application hooks, follow these guidelines:

1. **Naming Convention**: `use[Feature]` (e.g., `useServiceHealth`, `useGameState`)
2. **Location**: Create in this directory (`/hooks/`)
3. **Export**: Add to `index.ts` for barrel export
4. **Documentation**: Include JSDoc with purpose, architecture, and usage example
5. **Testing**: Write unit tests in `__tests__/` subdirectory
6. **Dependencies**: Use service hooks from `/services/hooks.ts`
7. **Compliance**: Follow QUALIA.CODE principles (IoC, decoupling, event-driven)

## QUALIA.CODE Compliance

This directory implements the **separation of concerns** principle:
- Infrastructure concerns (IoC resolution) → `/services/hooks.ts`
- Application concerns (business logic) → `/hooks/` (this directory)

This ensures that:
- Service hooks remain pure and focused
- Business logic is reusable across components
- Testing is simplified by clear separation
- Architecture is maintainable and scalable
