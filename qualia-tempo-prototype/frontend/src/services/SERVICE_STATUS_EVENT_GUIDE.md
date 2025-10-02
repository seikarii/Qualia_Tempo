# ServiceStatusUpdateEvent Implementation Guide
**QUALIA.CODE v1.1 - Event-Driven Service Diagnostics**

---

## Overview

The `DebugOrchestratorService` has been refactored to use a **pure event-driven architecture** for collecting service diagnostics. Instead of calling service methods directly (pull pattern), it now passively aggregates status information from `ServiceStatusUpdateEvent` events (push pattern).

**CRITICAL**: All services that want their status displayed in diagnostics MUST emit `ServiceStatusUpdateEvent` periodically or when their state changes.

---

## Architecture Pattern: Passive Aggregation

### Before (Pull Pattern - DEPRECATED)
```typescript
// ❌ ANTI-PATTERN: Direct service coupling
const stats = notificationService.getStatistics();
const status = notificationService.getStatus();
```

### After (Push Pattern - CURRENT)
```typescript
// ✅ CORRECT: Event-driven status broadcasting
this.eventBus.emit({
  type: 'ServiceStatusUpdate',
  timestamp: new Date(),
  source: 'NotificationService',
  serviceName: 'NotificationService',
  status: {
    isRunning: this.isRunning,
    stats: {
      totalNotifications: this.stats.total,
      displayedNotifications: this.stats.displayed
    }
  }
});
```

---

## Implementation Steps

### Step 1: Inject EventBus (if not already injected)

```typescript
@injectable()
export class MyService implements IMyService, IBaseService {
  constructor(
    @inject(TYPES.IEventBus) private eventBus: IEventBus,
    // ... other dependencies
  ) {}
}
```

### Step 2: Create Status Emission Method

```typescript
/**
 * Emit service status update event for diagnostic aggregation
 * 
 * QUALIA.CODE v1.1: Event-Driven Diagnostics Pattern
 * This method broadcasts service status to the EventBus, allowing
 * DebugOrchestratorService to passively aggregate diagnostics.
 */
@logMethod
private emitStatusUpdate(): void {
  const statusEvent: ServiceStatusUpdateEvent = {
    type: 'ServiceStatusUpdate',
    timestamp: new Date(),
    source: this.constructor.name,
    serviceName: this.constructor.name,
    status: {
      isRunning: this.isRunning,
      stats: {
        // Include relevant statistics
        totalOperations: this.operationCount,
        errorRate: this.calculateErrorRate(),
        queueSize: this.queue.length,
        // ... other relevant metrics
      },
      error: this.lastError?.message // Optional: include last error
    }
  };

  this.eventBus.emit(statusEvent);
}
```

### Step 3: Call Emission Method Periodically

#### Option A: Timer-Based Emission (Recommended for Background Services)

```typescript
@injectable()
export class MyService implements IMyService, IBaseService {
  private statusEmissionInterval: number | null = null;

  public initialize(): void {
    // Emit status every 5 seconds
    this.statusEmissionInterval = this.timerService.setInterval(
      () => this.emitStatusUpdate(),
      5000
    );
  }

  public cleanup(): void {
    if (this.statusEmissionInterval !== null) {
      this.timerService.clearInterval(this.statusEmissionInterval);
      this.statusEmissionInterval = null;
    }
  }
}
```

#### Option B: State Change Emission (Recommended for Event-Driven Services)

```typescript
public async start(): Promise<void> {
  this.isRunning = true;
  this.emitStatusUpdate(); // Emit when state changes
  // ... rest of start logic
}

public async stop(): Promise<void> {
  this.isRunning = false;
  this.emitStatusUpdate(); // Emit when state changes
  // ... rest of stop logic
}

private handleError(error: Error): void {
  this.lastError = error;
  this.emitStatusUpdate(); // Emit when error occurs
  // ... rest of error handling
}
```

#### Option C: Hybrid Approach (Best Practice)

```typescript
// Emit on state changes + periodic updates for continuous services
public async start(): Promise<void> {
  this.isRunning = true;
  this.emitStatusUpdate(); // Immediate update
  
  // Start periodic updates
  this.statusEmissionInterval = this.timerService.setInterval(
    () => this.emitStatusUpdate(),
    this.config.statusEmissionInterval
  );
}
```

---

## Event Contract Reference

```typescript
export interface ServiceStatusUpdateEvent extends BaseEvent {
  type: "ServiceStatusUpdate";
  serviceName: string;
  status: {
    isRunning: boolean;
    stats?: Record<string, unknown>;
    error?: string;
  };
}
```

### Field Descriptions

- **`serviceName`**: Unique identifier for the service (usually `this.constructor.name`)
- **`status.isRunning`**: Boolean indicating if the service is active
- **`status.stats`**: Optional object with service-specific metrics
- **`status.error`**: Optional error message from last failure

---

## Example Implementations

### NotificationService Example

```typescript
@injectable()
export class NotificationService implements INotificationService, IBaseService {
  private statusEmissionInterval: number | null = null;
  
  public initialize(): void {
    // Emit status every 10 seconds
    this.statusEmissionInterval = this.timerService.setInterval(
      () => this.emitStatusUpdate(),
      10000
    );
    
    // Emit initial status
    this.emitStatusUpdate();
  }

  public cleanup(): void {
    if (this.statusEmissionInterval !== null) {
      this.timerService.clearInterval(this.statusEmissionInterval);
    }
    
    // Final status emission
    this.emitStatusUpdate();
  }

  @logMethod
  private emitStatusUpdate(): void {
    const statusEvent: ServiceStatusUpdateEvent = {
      type: 'ServiceStatusUpdate',
      timestamp: new Date(),
      source: 'NotificationService',
      serviceName: 'NotificationService',
      status: {
        isRunning: this.isRunning,
        stats: {
          totalNotifications: this.stats.totalNotifications,
          displayedNotifications: this.stats.displayedNotifications,
          throttledNotifications: this.stats.throttledNotifications,
          queueSize: this.notificationQueue.length
        }
      }
    };

    this.eventBus.emit(statusEvent);
  }
}
```

### ErrorReportingService Example

```typescript
@injectable()
export class ErrorReportingService implements IErrorReportingService, IBaseService {
  public async start(): Promise<void> {
    this.isEnabled = true;
    this.emitStatusUpdate(); // Emit on state change
    // ... rest of start logic
  }

  public async stop(): Promise<void> {
    this.isEnabled = false;
    this.emitStatusUpdate(); // Emit on state change
    // ... rest of stop logic
  }

  private async reportError(error: Error): Promise<void> {
    try {
      // ... error reporting logic
      this.stats.totalErrors++;
      this.emitStatusUpdate(); // Emit after significant operation
    } catch (err) {
      this.lastError = err as Error;
      this.emitStatusUpdate(); // Emit on error
    }
  }

  @logMethod
  private emitStatusUpdate(): void {
    const statusEvent: ServiceStatusUpdateEvent = {
      type: 'ServiceStatusUpdate',
      timestamp: new Date(),
      source: 'ErrorReportingService',
      serviceName: 'ErrorReportingService',
      status: {
        isRunning: this.isEnabled,
        stats: {
          totalErrors: this.stats.totalErrors,
          reportedErrors: this.stats.reportedErrors,
          successRate: this.calculateSuccessRate()
        },
        error: this.lastError?.message
      }
    };

    this.eventBus.emit(statusEvent);
  }
}
```

---

## Best Practices

### 1. Emission Frequency
- **High-Activity Services**: Emit on every significant state change
- **Background Services**: Emit every 5-10 seconds
- **Low-Activity Services**: Emit on state changes + every 30-60 seconds

### 2. Statistics Selection
- Include metrics that provide diagnostic value
- Avoid computationally expensive calculations
- Use cached values when possible

### 3. Error Reporting
- Include last error message in status
- Clear error after successful operation
- Don't spam errors - throttle if necessary

### 4. Service Name Consistency
- Use `this.constructor.name` for automatic naming
- Ensure name matches what UI expects

### 5. Lifecycle Integration
- Emit in `initialize()` for initial status
- Emit in `cleanup()` for final status
- Emit when significant state changes occur

---

## Configuration Example

Add status emission configuration to your service's YAML file:

```yaml
# notification-service.yaml
statusEmission:
  enabled: true
  interval: 10000  # Emit every 10 seconds
  emitOnStateChange: true
  emitOnError: true
```

Then use in your service:

```typescript
if (this.config.statusEmission.enabled) {
  this.statusEmissionInterval = this.timerService.setInterval(
    () => this.emitStatusUpdate(),
    this.config.statusEmission.interval
  );
}
```

---

## Debugging

To verify your service is emitting status updates correctly:

1. Enable debug logging for EventBus:
   ```typescript
   // In eventbus.yaml
   logLevel: 'debug'
   ```

2. Watch for status events in console:
   ```typescript
   // Temporarily in your service
   this.logger.debug('Emitting status update', { serviceName: this.constructor.name });
   ```

3. Check DebugOrchestratorService logs:
   ```
   [DEBUG] Service status updated via event { serviceName: 'NotificationService', ... }
   ```

---

## Migration Checklist

For each service that needs diagnostics support:

- [ ] Inject EventBus if not already injected
- [ ] Create `emitStatusUpdate()` private method
- [ ] Import `ServiceStatusUpdateEvent` from events.contracts
- [ ] Implement emission logic (timer/state-change/hybrid)
- [ ] Add emission calls in `initialize()` and `cleanup()`
- [ ] Add emission calls on significant state changes
- [ ] Test that status appears in ServiceDiagnosticsPanel
- [ ] Add configuration for emission interval
- [ ] Update service README with diagnostics info

---

## Architecture Benefits

✅ **Zero Coupling**: Services don't know about DebugOrchestratorService  
✅ **Scalability**: Services emit on their own schedule  
✅ **Flexibility**: Easy to add/remove diagnostic sources  
✅ **Event-Driven**: Pure push pattern, no polling  
✅ **Performance**: No synchronous method calls across services  
✅ **Observability**: All status changes broadcast system-wide  

---

**For questions or assistance, refer to QUALIA.CODE.md Section 2: Components are Islands**
