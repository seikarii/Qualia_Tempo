# DEPENDENCY GRAPH ANALYSIS - IoC Binding Order
**Date:** October 5, 2025
**Purpose:** Complete dependency analysis for two-phase binding implementation

---

## LEAF PARAMS (Phase 1 - No container.get() calls)

These Params objects contain ONLY:
- Config objects
- Primitive values
- NO service instances

**COUNT: 0**

⚠️ **CRITICAL FINDING:** ALL current Params objects call container.get() for services!
This means we need a different strategy.

---

## COMPOSITE PARAMS (Phase 2 - Requires service instances)

### Category A: Infrastructure Services (Always Available)
These services are bound early and never need Params:
- `IEventBus` - Bound statically
- `ILogger` - Bound statically  
- `ITimerService` - Bound with bootstrap config
- `IHttpService` - Bound with bootstrap config
- `IPerformanceService` - Bound statically

### Category B: Simple Services (Config Only)
These services need only config, no other services:
- `GameplayMechanicsService` → `GameplayMechanicsConfig` (direct)
- `ViewLogicService` → `ViewLogicConfig` (direct)
- `SubtitleService` → `SubtitleConfig` (direct)
- `GameStateStoreService` → `GameStateStoreConfig` (direct)
- `PostProcessingService` → `PostProcessingConfig` (direct via Params)
- `ProtocolAdapterService` → `ProtocolAdapterConfig` (direct)

### Category C: Complex Services (Needs Other Services)
These require Params with service injections:
- `AudioService` → needs OntologicalAudioEngine, WebAudioAPIService
- `QualiaStateCalculatorService` → needs PerformanceService
- `RhythmicMovementController` → needs InputStateService, GameplayMechanicsService
- `GameControllerService` → needs many services including AudioService
- `FrontendRenderingService` → needs PerformanceService, PostProcessingService
- `BackendSyncService` → needs HttpService, TimerService, PerformanceService
- `StateStreamingService` → needs WebSocketService
- `WebSocketService` → needs WebSocketFactory
- `NotificationService` → needs GameStateStore, ThrottlingManager
- `DebugService` → needs PerformanceService
- `DebugOrchestratorService` → needs PerformanceService
- `ErrorReportingService` → needs HttpService
- `ApplicationInitializerService` → needs ALL services

---

## DEPENDENCY LEVELS (Topological Sort)

### Level 0: Bootstrap Services (No Dependencies Beyond Config)
- EventBus
- Logger
- TimerService (bootstrap config)
- HttpService (bootstrap config)
- PerformanceService

### Level 1: Simple Config-Only Services
- GameplayMechanicsService
- ViewLogicService
- SubtitleService
- GameStateStoreService
- ProtocolAdapterService
- InputStateService
- BrowserEventsService
- ThrottlingManager
- WebSocketFactory

### Level 2: Services with Level 0/1 Dependencies
- OntologicalAudioEngine
- WebAudioAPIService
- ShaderLoaderService
- ShaderIntrospectionService
- WebSocketService (needs WebSocketFactory)
- QualiaStateCalculatorService (needs PerformanceService)

### Level 3: Services with Level 2 Dependencies
- AudioService (needs OntologicalAudioEngine, WebAudioAPIService)
- PostProcessingService (needs ShaderLoader, ShaderIntrospection)
- RhythmicMovementController (needs InputStateService, GameplayMechanicsService)
- AudioAnalysisService (needs WebAudioAPIService)
- PhysicsService (needs InputStateService)

### Level 4: Services with Level 3 Dependencies
- GameControllerService (needs AudioService, GameStateStoreService, PerformanceService, AudioSystemBridge)
- FrontendRenderingService (needs PostProcessingService, PerformanceService)
- BackendSyncService (needs HttpService, TimerService, PerformanceService)
- StateStreamingService (needs WebSocketService)
- NotificationService (needs GameStateStore, ThrottlingManager)
- DebugService (needs PerformanceService)
- DebugOrchestratorService (needs PerformanceService)
- ErrorReportingService (needs HttpService)

### Level 5: Orchestrator Services
- ApplicationInitializerService (needs ALL services from levels 0-4)

---

## TWO-PHASE BINDING STRATEGY

### Phase 1: Direct Config Binding
Bind all simple configs that services can use directly:
```typescript
// Already done in bindDirectConfigs()
TYPES.GameplayMechanicsConfig
TYPES.ViewLogicConfig
TYPES.SubtitleConfig
TYPES.GameStateStoreConfig
TYPES.PostProcessingConfig
TYPES.ProtocolAdapterConfig
```

### Phase 2: Service Params Binding (By Dependency Level)
**CRITICAL:** Bind Params in order of service dependency levels.

```typescript
// Level 2 Services
AudioServiceParams
QualiaStateCalculatorServiceParams
PostProcessingServiceParams

// Level 3 Services  
RhythmicMovementControllerParams
AudioAnalysisServiceParams
PhysicsServiceParams

// Level 4 Services
GameControllerServiceParams
FrontendRenderingServiceParams
BackendSyncServiceParams
StateStreamingServiceParams
WebSocketServiceParams
NotificationServiceParams
DebugServiceParams
DebugOrchestratorServiceParams
ErrorReportingServiceParams

// Level 5 Orchestrator
ApplicationInitializerServiceParams
```

**KEY INSIGHT:** The problem is that we're binding Params for services that depend on OTHER services whose Params haven't been bound yet. We need to bind in dependency order!

---

## IMPLEMENTATION PLAN

1. **Reorganize bindServiceParameterObjects():**
   - Keep bindDirectConfigs() first
   - Create bindLevel2ServiceParams()
   - Create bindLevel3ServiceParams()
   - Create bindLevel4ServiceParams()
   - Create bindLevel5ServiceParams()

2. **Each level function binds Params in correct order**

3. **Add validation:** Script to detect if a service Params is bound before its dependencies

