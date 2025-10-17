# QUALIA TEMPO RUST REWRITE - COMPLETE IMPLEMENTATION PLAN
# VERSION: 1.0
# TARGET: Production-Grade Rust Implementation
# COMPLIANCE: QUALIA.CODE.RUST v1.1 + ARCHITECTURE.RUST v2.0 + BLUEPRINT.RUST v2.0

---

## CRITICAL MANDATES

**ABSOLUTE PROHIBITIONS:**
- ❌ NO placeholders, stubs, or TODO comments without TODO.md entries
- ❌ NO partial implementations
- ❌ NO technical debt introduction
- ❌ NO skipping tests or documentation
- ❌ NO direct service instantiation (new()) outside Composition Root
- ❌ NO manual EventBus with RwLock (use tokio::sync::broadcast)
- ❌ NO unwrap() in production code
- ❌ NO println!/eprintln! (use tracing macros)

**ABSOLUTE REQUIREMENTS:**
- ✅ Every public type MUST have `/// # Responsibility` docstring
- ✅ Every service MUST be tested with high-fidelity mockall mocks
- ✅ Every phase MUST pass: tests + linter + CHANGELOG.md update
- ✅ Every turn MUST be COMPLETE and PRODUCTION-READY
- ✅ Architecture MUST be validated against LINTER.RUST.md rules

---

## MIGRATION STATISTICS (FROM BLUEPRINT.RUST.md)

**Prototype Services**: 74 total (24 backend + 50 frontend)
**Rust Services**: 72 total (68 enhanced + 4 new - 6 obsolete)
**UI Components**: 50+ components to migrate
**Shaders**: 25+ GLSL shaders to port to WGSL
**Data Contracts**: 40+ structs from DATA.RUST.md

---

## ~~PHASE 0: FOUNDATION - PROCEDURAL MACROS AND TOOLING~~ ✅ COMPLETE
**DURATION**: 1 Complete Engineer Turn
**STATUS**: ✅ COMPLETE (2025-10-17)
**RATIONALE**: The entire project depends on procedural macros (decorator replacements). These MUST be implemented first and be production-ready before any service code can use them.

### Deliverables - ALL COMPLETE ✅

#### 0.1. Workspace Initialization ✅
**Files Created:**
- ✅ `/qualia-tempo-rust/Cargo.toml` (workspace root)
- ✅ `/qualia-tempo-rust/.cargo/config.toml` (cargo configuration)
- ✅ `/qualia-tempo-rust/.gitignore`
- ✅ `/qualia-tempo-rust/README.md`
- ✅ `/qualia-tempo-rust/CHANGELOG.md` (initialized)

**Actions Completed:**
- ✅ Git-ready workspace with proper .gitignore for Rust
- ✅ Workspace configured with 4 members: shared_core, backend, frontend, qualia_macros
- ✅ All workspace dependencies configured (tokio, serde, tracing, mockall, shaku, etc.)
- ✅ Workspace lints from LINTER.RUST.md configured (pedantic="deny", unwrap_used="deny", etc.)
- ✅ Release profile optimized (opt-level=3, lto=true, codegen-units=1)

#### 0.2. qualia_macros Crate ✅ (CRITICAL - ALL 8 MACROS IMPLEMENTED)
**Location**: `/qualia-tempo-rust/qualia_macros/`

**Macros Implemented** (All 8 complete with production-ready code):

1. ✅ **#[handle_event(Event)]** - Event subscription boilerplate (PRIORITY 1)
2. ✅ **#[cached]** - Memoization with TTL support (PRIORITY 2)
3. ✅ **#[validate]** - Runtime validation (PRIORITY 3)
4. ✅ **#[retry(max_attempts, delay_ms)]** - Exponential backoff retry (PRIORITY 4)
5. ✅ **#[with_timeout(ms)]** - Async timeout wrapper (PRIORITY 5)
6. ✅ **#[rate_limit(calls_per_sec)]** - Token bucket rate limiting (PRIORITY 6)
7. ✅ **#[circuit_breaker]** - Circuit breaker pattern (PRIORITY 7)
8. ✅ **#[authorize(role)]** - Authorization checking (PRIORITY 8)

**Testing Completed:**
- ✅ All macros compile without warnings
- ✅ cargo build: SUCCESS
- ✅ cargo test: SUCCESS (0 failures)
- ✅ Full documentation with `# Responsibility` headers
- ✅ Zero technical debt introduced

**Acceptance Criteria - ALL MET:**
- ✅ All 8 macros compile without warnings
- ✅ Documentation generated with complete examples
- ✅ CHANGELOG.md updated with Phase 0 completion
- ✅ Production-ready code (no unwrap(), no println!, proper error handling)

**Phase 0 Impact:**
- 🎯 **FOUNDATION COMPLETE**: All subsequent phases unblocked
- 🎯 Event-driven architecture enabled via #[handle_event]
- 🎯 Performance patterns ready (caching, rate limiting)
- 🎯 Resilience patterns ready (retry, circuit breaker, timeout)
- 🎯 Security infrastructure ready (authorization)

---

## PHASE 1: SHARED CORE - CONTRACTS, TRAITS, AND EVENTS
**DURATION**: 1 Complete Engineer Turn
**DEPENDENCIES**: Phase 0 (macros)
**STATUS**: NOT STARTED

### Deliverables

#### 1.1. shared_core Crate Structure
**Location**: `/qualia-tempo-rust/shared_core/`

**Files to Create:**
- `Cargo.toml` (with serde, schemars, validator, glam dependencies)
- `src/lib.rs` (re-exports all modules)
- `src/contracts/mod.rs` (module organization)
- `src/contracts/game_state.rs` (QualiaState, PlayerState, BossState, CombatState)
- `src/contracts/combat_data.rs` (CombatData, PatternData, LyricData, MusicalComboData)
- `src/contracts/audio.rs` (AudioEvent, AudioLayer, SongData, HarmonyMap, InstrumentPatch)
- `src/contracts/particles.rs` (ParticleSystemConfig, OptimizedParticle)
- `src/contracts/input.rs` (PlayerAction, MusicalInputAnalysis)
- `src/contracts/effects.rs` (ActiveEffect, EnvironmentEffect)
- `src/contracts/settings.rs` (GameSettings, AccessibilitySettings)
- `src/contracts/leaderboard.rs` (LeaderboardEntry)
- `src/contracts/scenes.rs` (SceneData, CinematicData, CinematicEvent)
- `src/events/mod.rs` (event module organization)
- `src/events/game_events.rs` (GameEvent enum with ALL variants from BLUEPRINT.RUST.md)
- `src/events/audio_events.rs` (PlayGenerativeNote, audio-specific events)
- `src/events/combat_events.rs` (combat-specific events)
- `src/events/system_events.rs` (lifecycle/system events)
- `src/traits/mod.rs` (trait organization)
- `src/traits/logger.rs` (ILogger trait)
- `src/traits/event_bus.rs` (IEventBus trait)
- `src/traits/service.rs` (IBaseService trait)
- `src/traits/config.rs` (configuration traits)
- `src/utils/mod.rs` (utility functions)
- `src/utils/math.rs` (Vector2, Vector3, clamp, lerp, math utilities)
- `src/utils/validation.rs` (validator utilities)

**Implementation Requirements:**
- ALL structs from DATA.RUST.md (40+ structs) fully implemented
- Every struct derives: Debug, Clone, Serialize, Deserialize, JsonSchema
- JavaScript interop: #[serde(rename_all = "camelCase")]
- Tagged enums: #[serde(tag = "type")]
- Runtime validation with validator crate where needed
- Default implementations where appropriate
- `# Responsibility` docstrings on ALL public types

**Testing Requirements:**
- Unit tests for validation logic
- Serialization/deserialization round-trip tests
- JSON schema generation tests
- Default value tests

**Acceptance Criteria:**
- ✅ All 40+ contracts compile without warnings
- ✅ All tests pass
- ✅ JSON schemas generate successfully (`scripts/generate_schemas.rs`)
- ✅ No clippy warnings
- ✅ All public types have `# Responsibility` docstrings
- ✅ CHANGELOG.md updated

---

## PHASE 2: BACKEND FOUNDATION - CORE INFRASTRUCTURE
**DURATION**: 1 Complete Engineer Turn
**DEPENDENCIES**: Phase 1 (shared_core)
**STATUS**: NOT STARTED

### Deliverables

#### 2.1. Backend Workspace Structure
**Location**: `/qualia-tempo-rust/backend/`

**Files to Create:**
- `Cargo.toml` (with tokio, axum, shaku, tracing, mockall dependencies)
- `src/main.rs` (entry point + Composition Root)
- `src/lib.rs` (library exports for testing)
- `src/config/mod.rs`
- `src/config/server.rs` (ServerConfig)
- `src/config/game_logic.rs` (GameLogicConfig)
- `src/config/boss_ai.rs` (BossAIConfig)
- `src/config/particle_engine.rs` (ParticleEngineConfig)
- `src/config/harmony_analysis.rs` (HarmonyAnalysisConfig)
- `src/config/pattern_system.rs` (PatternSystemConfig)
- `src/config/loader.rs` (YAML config loader)

#### 2.2. Core Services (Blocking for All Other Services)

**Service 1: EventBusService** (CRITICAL)
**Location**: `src/services/core/event_bus.rs`
- Implementation: tokio::sync::broadcast (MANDATE from QUALIA.CODE.RUST)
- Interface: IEventBus trait from shared_core
- Capacity: 1000 events default
- Methods: emit(), subscribe()
- Error handling: Graceful handling of no subscribers
- Testing: Mock-free (concrete implementation in tests)
- Integration test: Multiple subscribers receiving same event

**Service 2: QualiaLogger**
**Location**: `src/services/core/logger.rs`
- Implementation: tracing crate wrapper
- Interface: ILogger trait from shared_core
- Methods: info(), warn(), error(), debug()
- Format: Structured JSON in production, pretty in dev
- Testing: Verify tracing subscriber receives messages
- Mock: MockLogger in tests/mocks/logger.rs

**Service 3: TimerService**
**Location**: `src/services/core/timer.rs`
- Implementation: tokio::time wrapper
- Interface: ITimerService trait
- Methods: delay(), interval(), timeout()
- Testing: Mock time for deterministic tests

**Service 4: ErrorReportingService**
**Location**: `src/services/core/error_reporter.rs`
- Implementation: Centralized error handling
- Interface: IErrorReporter trait
- Integration: Reports errors via EventBus
- Testing: Verify error events emitted

#### 2.3. Dependency Injection Setup

**Files to Create:**
- `src/services/mod.rs` (Shaku module definition)
- `src/services/interfaces/mod.rs` (all trait re-exports)
- `src/services/interfaces/i_logger.rs`
- `src/services/interfaces/i_event_bus.rs`
- `src/services/interfaces/i_timer.rs`
- `src/services/interfaces/i_error_reporter.rs`
- `src/services/tests/mod.rs`
- `src/services/tests/test_container_factory.rs` (CRITICAL - creates isolated test modules)
- `src/services/tests/mocks/mod.rs`
- `src/services/tests/mocks/logger.rs` (MockLogger with mockall)
- `src/services/tests/mocks/timer.rs` (MockTimerService)

**Shaku Module Configuration:**
- GameModule with all core services registered
- Composition Root in main.rs
- Service resolution with proper lifetimes
- Configuration injection (not ConfigurationService)

**Testing Requirements:**
- Test container factory creates isolated modules
- Each service has high-fidelity mocks
- Integration tests use real EventBus (not mocked)
- All mocks use mockall::mock! macro

**Acceptance Criteria:**
- ✅ All 4 core services compile and pass tests
- ✅ EventBus uses tokio::sync::broadcast (VERIFIED)
- ✅ No direct service instantiation outside Composition Root
- ✅ All services injectable via Shaku
- ✅ Test isolation verified (no state leakage between tests)
- ✅ All mocks are high-fidelity (type-safe return values)
- ✅ Clippy passes with no warnings
- ✅ CHANGELOG.md updated

---

## PHASE 3: BACKEND GAMEPLAY SERVICES
**DURATION**: 1 Complete Engineer Turn
**DEPENDENCIES**: Phase 2 (core infrastructure)
**STATUS**: NOT STARTED

### Deliverables

#### 3.1. Lifecycle Services
**Files to Create:**
- `src/services/lifecycle/mod.rs`
- `src/services/lifecycle/initializer.rs` (ApplicationInitializerService)

**ApplicationInitializerService:**
- Orchestrates startup sequence for all services
- Calls start() on each service in dependency order
- Graceful shutdown handling
- Health check integration
- Testing: Verify startup order, shutdown cleanup

#### 3.2. Gameplay Core Services (5 Services)

**Service 1: GameLogicService**
**Location**: `src/services/gameplay/game_logic.rs`
- Core game rules (health, damage, combo, victory/failure)
- Integrates: QualiaProcessor, PatternSystem, BossAI
- Consumes: PlayerAction events
- Produces: CombatState updates
- Testing: Full game loop simulation with mocks

**Service 2: QualiaProcessorService**
**Location**: `src/services/gameplay/qualia_processor.rs`
- Calculates QualiaState from PlayerAction
- Accuracy scoring logic
- Combo multipliers
- Chaos/harmony/intensity/kairos calculation
- Testing: Property tests for value bounds [0.0, 1.0]

**Service 3: BossAIService**
**Location**: `src/services/gameplay/boss_ai.rs`
- Boss behavior and decision-making
- React to QualiaState changes
- Pattern selection based on intensity/chaos
- Adaptive difficulty
- Testing: Verify pattern selection logic

**Service 4: PatternSystemService**
**Location**: `src/services/gameplay/pattern_system.rs`
- Boss attack pattern execution
- Load patterns from CombatData JSON
- Telegraph generation
- Timing calculations
- Testing: Pattern loading and execution

**Service 5: CombatOrchestratorService** (NEW in Rust)
**Location**: `src/services/gameplay/combat_orchestrator.rs`
- Coordinates all combat systems
- State aggregation
- Event routing
- Testing: Full combat scenario integration test

#### 3.3. Interfaces
**Files to Create:**
- `src/services/interfaces/i_game_logic.rs`
- `src/services/interfaces/i_qualia_processor.rs`
- `src/services/interfaces/i_boss_ai.rs`
- `src/services/interfaces/i_pattern_system.rs`
- `src/services/interfaces/i_combat_orchestrator.rs`

#### 3.4. Mocks
**Files to Create:**
- `src/services/tests/mocks/game_logic.rs`
- `src/services/tests/mocks/qualia_processor.rs`
- `src/services/tests/mocks/boss_ai.rs`
- `src/services/tests/mocks/pattern_system.rs`

**Testing Requirements:**
- Each service: unit tests with mocks
- Integration test: Full combat loop (player action → state update)
- Property tests: QualiaState bounds, combo calculations
- Load tests: Pattern data from JSON files

**Acceptance Criteria:**
- ✅ All 5 gameplay services implemented and tested
- ✅ Full game loop integration test passes
- ✅ All property tests pass (1000+ iterations)
- ✅ Clippy passes
- ✅ CHANGELOG.md updated

---

## PHASE 4: BACKEND AUDIO AND RENDERING SERVICES
**DURATION**: 1 Complete Engineer Turn
**DEPENDENCIES**: Phase 3 (gameplay services)
**STATUS**: NOT STARTED

### Deliverables

#### 4.1. Audio Services

**Service 1: HarmonyAnalysisService**
**Location**: `src/services/audio/harmony_analyzer.rs`
- Audio-to-MIDI transcription (using `aubio` or similar)
- HarmonyMap generation from SongData
- Chord/scale detection
- Real-time harmony analysis (optional)
- Testing: Known song → verify generated HarmonyMap

#### 4.2. Rendering Services (Backend Computation)

**Service 1: ParticleEnginePoolManager**
**Location**: `src/services/rendering/particle_pool.rs`
- Tokio task pool for particle simulation
- NOT process pool (use tokio::task::spawn_blocking)
- Work queue with mpsc channels
- Worker count = num_cpus
- Testing: Verify task distribution, no blocking

**Service 2: ShaderIntrospectionService**
**Location**: `src/services/rendering/shader_introspector.rs`
- Provides shader metadata to frontend
- WGSL shader parsing (using `naga`)
- Uniform buffer layouts
- Testing: Parse sample shaders, verify metadata

#### 4.3. Particle Engine

**Files to Create:**
- `src/engine/mod.rs`
- `src/engine/particle_engine.rs` (QualiaParticleEngine)
- `src/engine/particle_calculator.rs` (ParticleStateCalculator)

**ParticleEngine:**
- CPU-intensive particle physics
- Offloaded to spawn_blocking tasks
- Batch processing for efficiency
- Testing: Benchmark performance, verify calculations

**Acceptance Criteria:**
- ✅ HarmonyAnalysisService generates valid HarmonyMap
- ✅ Particle engine uses spawn_blocking (not rayon directly)
- ✅ No blocking in async contexts
- ✅ Performance benchmarks meet targets (10,000+ particles at 60 FPS)
- ✅ Clippy passes
- ✅ CHANGELOG.md updated

---

## PHASE 5: BACKEND NETWORKING AND PERSISTENCE
**DURATION**: 1 Complete Engineer Turn
**DEPENDENCIES**: Phase 4 (audio/rendering services)
**STATUS**: NOT STARTED

### Deliverables

#### 5.1. WebSocket Server (Axum)

**Files to Create:**
- `src/handlers/mod.rs`
- `src/handlers/websocket.rs` (WebSocket handler)
- `src/handlers/health.rs` (health check endpoint)
- `src/handlers/engine.rs` (particle engine API - optional)

**WebSocket Implementation:**
- Axum WebSocket handler with bidirectional channels
- Split socket for independent send/receive tasks
- Binary serialization with bincode (not JSON for performance)
- Graceful disconnection handling
- Client authentication (optional for Phase 5)
- Testing: Integration tests with test WebSocket client

**AppState Structure:**
- Contains Arc<dyn IEventBus>
- Contains Arc<dyn IGameLogicService>
- Shared across all connections

#### 5.2. State Streaming Service

**Service: GameStateStreamingService**
**Location**: `src/services/networking/state_streaming.rs`
- Broadcasts CombatState to all connected clients
- Throttling/rate limiting (60 updates/sec max)
- Compression for large payloads (optional)
- Testing: Verify broadcast to multiple clients

#### 5.3. Persistence Services

**Service 1: LeaderboardService**
**Location**: `src/services/persistence/leaderboard.rs`
- SQLite for local persistence OR PostgreSQL for production
- CRUD operations for LeaderboardEntry
- Replay data storage (optional)
- Testing: Database migrations, CRUD tests

#### 5.4. Security Services

**Service 1: AuthService**
**Location**: `src/services/security/auth.rs`
- Player authentication (JWT or session-based)
- Session management
- Testing: Token generation/validation

**Service 2: ValidationService**
**Location**: `src/services/security/validation.rs`
- Input validation and sanitization
- Anti-cheat measures
- Rate limiting enforcement
- Testing: Malformed input rejection

#### 5.5. Monitoring Services

**Service 1: HealthCheckService**
**Location**: `src/services/monitoring/health_check.rs`
- System health monitoring
- CPU/memory usage
- Active connections count
- Testing: Health endpoint returns 200

**Service 2: MetricsService**
**Location**: `src/services/monitoring/metrics.rs`
- Prometheus-compatible metrics
- Request counters, latency histograms
- Testing: Metrics export format

**Service 3: PerformanceService**
**Location**: `src/services/monitoring/performance.rs`
- Performance tracking and profiling
- Frame time tracking
- Slow query detection
- Testing: Performance data collection

**Acceptance Criteria:**
- ✅ WebSocket server accepts connections
- ✅ Bidirectional communication works
- ✅ Multiple clients receive broadcast events
- ✅ Database persistence works
- ✅ Health check endpoint returns valid JSON
- ✅ Metrics export in Prometheus format
- ✅ Clippy passes
- ✅ CHANGELOG.md updated

---

## PHASE 6: BACKEND INFRASTRUCTURE AND COMPLETION
**DURATION**: 1 Complete Engineer Turn
**DEPENDENCIES**: Phase 5 (networking/persistence)
**STATUS**: NOT STARTED

### Deliverables

#### 6.1. Infrastructure Services

**Service 1: FileSystemService**
**Location**: `src/services/infrastructure/file_system.rs`
- Async file I/O with tokio::fs
- Combat data loading (JSON/RON)
- Configuration file management
- Testing: File read/write operations

**Service 2: SystemEnvironmentService**
**Location**: `src/services/infrastructure/environment.rs`
- Environment variable access
- Platform detection
- System capabilities
- Testing: Environment variable parsing

#### 6.2. Complete Shaku Module Registration

**Update**: `src/services/mod.rs`
- Register ALL backend services (24 total)
- Verify dependency order
- No circular dependencies
- Testing: Module builds successfully

**All Services to Register:**
1. Core: EventBusService, QualiaLogger, TimerService, ErrorReportingService
2. Lifecycle: ApplicationInitializerService
3. Gameplay: GameLogicService, BossAIService, PatternSystemService, QualiaProcessorService, CombatOrchestratorService
4. Audio: HarmonyAnalysisService
5. Rendering: ParticlePoolService, ShaderIntrospectionService
6. Networking: WebSocketService, StateStreamingService
7. Persistence: LeaderboardService
8. Security: AuthService, ValidationService
9. Monitoring: HealthCheckService, MetricsService, PerformanceService
10. Infrastructure: FileSystemService, EnvironmentService

#### 6.3. Main Entry Point Finalization

**Update**: `src/main.rs`
- Complete Composition Root
- Service initialization sequence
- Axum server startup
- Graceful shutdown handling
- Signal handling (SIGTERM, SIGINT)
- Testing: End-to-end server startup test

#### 6.4. Backend Integration Tests

**Files to Create:**
- `tests/full_game_loop.rs` (complete game session simulation)
- `tests/websocket_integration.rs` (client-server communication)
- `tests/persistence_integration.rs` (database operations)
- `tests/performance_benchmarks.rs` (particle engine, state updates)

**Test Scenarios:**
1. Full game loop: Connect → Send Actions → Receive States → Disconnect
2. Multiple clients: 10+ simultaneous connections
3. Particle engine load: 10,000+ particles at 60 FPS
4. Database stress: 1000+ leaderboard entries

**Acceptance Criteria:**
- ✅ ALL 24 backend services implemented
- ✅ Shaku module resolves all dependencies
- ✅ Server starts without errors
- ✅ All integration tests pass
- ✅ Performance benchmarks meet targets
- ✅ No clippy warnings
- ✅ Code coverage > 80%
- ✅ CHANGELOG.md updated

---

## PHASE 7: FRONTEND FOUNDATION - WASM AND CORE INFRASTRUCTURE
**DURATION**: 1 Complete Engineer Turn
**DEPENDENCIES**: Phase 2 (backend core) for EventBus pattern knowledge
**STATUS**: NOT STARTED

### Deliverables

#### 7.1. Frontend Workspace Structure

**Location**: `/qualia-tempo-rust/frontend/`

**Files to Create:**
- `Cargo.toml` (with leptos, wgpu, wasm-bindgen, tokio-tungstenite dependencies)
- `Trunk.toml` (Trunk bundler configuration)
- `index.html` (entry point)
- `src/lib.rs` (WASM entry point with #[wasm_bindgen(start)])
- `src/app.rs` (root Leptos component)

#### 7.2. Core Services (Frontend EventBus + Logger)

**Service 1: EventBusService** (Frontend)
**Location**: `src/services/core/event_bus.rs`
- Same implementation as backend (tokio::sync::broadcast)
- WASM-compatible
- Testing: Browser environment simulation

**Service 2: Logger** (Frontend)
**Location**: `src/services/core/logger.rs`
- tracing-wasm for browser console
- JSON formatting for production
- Testing: Verify console.log output

**Service 3: TimerService** (Frontend)
**Location**: `src/services/core/timer.rs`
- gloo-timers wrapper (WASM-compatible)
- Testing: Mock time in tests

**Service 4: ErrorReporterService** (Frontend)
**Location**: `src/services/core/error_reporter.rs`
- Browser error reporting
- Integration with backend error service
- Testing: Error capture

#### 7.3. Frontend DI Setup

**Files to Create:**
- `src/services/mod.rs` (Shaku FrontendModule)
- `src/services/interfaces/mod.rs`
- `src/services/tests/mod.rs`
- `src/services/tests/test_container_factory.rs`
- `src/services/tests/mocks/mod.rs`

**Shaku FrontendModule:**
- Similar structure to backend
- WASM-compatible service resolution
- Leptos context integration

#### 7.4. State Management with Leptos Signals

**Files to Create:**
- `src/state/mod.rs`
- `src/state/game_store.rs` (GameStateStore with Leptos Signals)
- `src/state/ui_store.rs` (UI-specific state)

**GameStateStore:**
- RwSignal<CombatState>
- RwSignal<PlayerState>
- RwSignal<BossState>
- RwSignal<QualiaState>
- RwSignal<bool> for connection status
- Auto-reactive: UI updates when state changes

**Testing:**
- Signal reactivity tests
- State update propagation

**Acceptance Criteria:**
- ✅ WASM compiles successfully
- ✅ Frontend EventBus uses broadcast (WASM-compatible)
- ✅ Leptos Signals working
- ✅ DI container resolves services
- ✅ Browser console shows tracing output
- ✅ CHANGELOG.md updated

---

## PHASE 8: FRONTEND NETWORKING AND INPUT
**DURATION**: 1 Complete Engineer Turn
**DEPENDENCIES**: Phase 7 (frontend foundation)
**STATUS**: NOT STARTED

### Deliverables

#### 8.1. WebSocket Client (WASM)

**Service: WebSocketClientService**
**Location**: `src/services/networking/websocket_client.rs`
- tokio-tungstenite compiled to WASM
- Bidirectional communication with backend
- Automatic reconnection with exponential backoff
- Binary deserialization (bincode)
- Testing: Mock WebSocket server

**Service: StateStreamingService** (Frontend)
**Location**: `src/services/networking/state_streaming.rs`
- Receives CombatState from backend
- Updates GameStateStore signals
- Handles deserialization errors
- Testing: State update flow

**Service: JitterCompensatorService**
**Location**: `src/services/networking/jitter_compensator.rs`
- Network jitter compensation
- Latency tracking
- Predictive state interpolation
- Testing: Simulated network lag

#### 8.2. Input Services

**Service 1: InputControllerService**
**Location**: `src/services/input/input_controller.rs`
- Leptos event listeners for keyboard/mouse
- Musical keys (Q, E, R, T, F, G, C) mapping
- Dash (Spacebar) handling
- Testing: Event capture simulation

**Service 2: InputStateService**
**Location**: `src/services/input/input_state.rs`
- Tracks pressed keys
- Timing calculations
- Accuracy scoring
- Testing: Timing precision tests

**Service 3: RhythmicMovementController**
**Location**: `src/services/input/rhythmic_movement.rs`
- Dash synchronization with metronome
- Movement prediction
- Testing: Rhythm alignment

#### 8.3. Gameplay Services (Frontend)

**Service 1: ComboDetectorService**
**Location**: `src/services/gameplay/combo_detector.rs`
- Musical combo detection
- Harmonic vs chaotic pattern recognition
- Combo sequence validation
- Testing: Combo pattern matching

**Service 2: QualiaWorkerBridgeService**
**Location**: `src/services/gameplay/qualia_worker_bridge.rs`
- Communication with Web Worker
- postMessage/onmessage handling
- Testing: Worker communication

**Service 3: GameControllerService**
**Location**: `src/services/gameplay/game_controller.rs`
- Game loop coordination
- Scene transitions
- Pause/resume handling
- Testing: Game state transitions

**Service 4: GameplayMechanicsService**
**Location**: `src/services/gameplay/mechanics.rs`
- Client-side gameplay rules
- Predictive physics
- Testing: Mechanics validation

#### 8.4. Web Worker for Qualia Calculator

**Files to Create:**
- `src/workers/mod.rs`
- `src/workers/qualia_calculator.rs`

**QualiaCalculatorWorker:**
- Runs in separate thread
- Receives PlayerAction via postMessage
- Calculates predictive QualiaState
- Returns result to main thread
- Testing: Worker computation accuracy

**Acceptance Criteria:**
- ✅ WebSocket connects to backend
- ✅ Bidirectional communication works
- ✅ Input captures musical keys
- ✅ Combo detection works
- ✅ Web Worker calculates qualia
- ✅ No blocking on main thread
- ✅ CHANGELOG.md updated

---

## PHASE 9: FRONTEND AUDIO ENGINE (WEB AUDIO API)
**DURATION**: 1 Complete Engineer Turn
**DEPENDENCIES**: Phase 8 (networking/input)
**STATUS**: NOT STARTED

### Deliverables

#### 9.1. Web Audio API Integration

**Service 1: WebAudioAPIService**
**Location**: `src/services/audio/web_audio_api.rs`
- wasm-bindgen wrapper for AudioContext
- AudioNode creation
- Testing: Context creation

**Service 2: AudioService (Playback + Performance Engine)
**Location**: `src/services/audio/playback.rs`
- BGM playback (AudioBufferSourceNode)
- Performance Engine: QualiaSampler + QualiaSynth
- SampleBank loading
- Instrument patch management
- PlayGenerativeNote event handling
- Testing: Audio playback, sample triggering

**QualiaSampler:**
- Load sample banks (MIDI note → WAV file mapping)
- Trigger samples on PlayGenerativeNote events
- Polyphonic playback
- Testing: Sample loading and triggering

**QualiaSynth:**
- Simple subtractive synth (2 oscillators, filter, ADSR)
- Parameter modulation from QualiaState
- Testing: Sound generation

#### 9.2. Spatial Audio (8D)

**Service: SpatialAudioService** (Audio8DService)
**Location**: `src/services/audio/spatial_audio.rs`
- PannerNode for 3D positioning
- Position sounds based on game entities
- Distance attenuation
- Testing: Spatial positioning accuracy

#### 9.3. FFT Analysis

**Service: FFTAnalyzerService** (AudioAnalysisService)
**Location**: `src/services/audio/fft_analyzer.rs`
- AnalyserNode for FFT
- Bass/mids/treble extraction
- Real-time frequency data
- Testing: FFT data accuracy

**FFTData struct:**
- bass_level: f32
- mid_level: f32
- treble_level: f32
- bins: Vec<f32>

#### 9.4. Audio Bridge

**Service: AudioBridgeService** (AudioSystemBridge)
**Location**: `src/services/audio/audio_bridge.rs`
- Coordinates all audio services
- Routes PlayGenerativeNote to Performance Engine
- Syncs audio with visuals
- Testing: Event routing

**Acceptance Criteria:**
- ✅ Web Audio API initialized
- ✅ BGM playback works
- ✅ Performance Engine generates notes
- ✅ Spatial audio positions correctly
- ✅ FFT analysis extracts frequency data
- ✅ Audio syncs with game state
- ✅ CHANGELOG.md updated

---

## PHASE 10: FRONTEND RENDERING - WGPU FOUNDATION
**DURATION**: 1 Complete Engineer Turn
**DEPENDENCIES**: Phase 9 (audio services) for FFT data
**STATUS**: NOT STARTED

### Deliverables

#### 10.1. wgpu Setup

**Service: KairosVisualEngine** (Orchestrator)
**Location**: `src/rendering/kairos_engine.rs`
- wgpu Device + Queue + Surface initialization
- Window creation (winit)
- Render loop (60 FPS target)
- Subscribes to GameStateStore signals
- Testing: Initialization without crashes

**KairosVisualEngine structure:**
- device: wgpu::Device
- queue: wgpu::Queue
- surface: wgpu::Surface
- g_buffer_pass: GBufferPass
- lighting_pass: LightingPass
- post_processing_chain: PostProcessingChain
- particle_compute: ParticleCompute
- reaction_diffusion_compute: ReactionDiffusionCompute
- sdf_renderer: SDFRenderer

#### 10.2. Deferred Rendering Pipeline - G-Buffer Pass

**Service: GBufferPassService**
**Location**: `src/rendering/passes/g_buffer_pass.rs`
- Multi-target render pass
- Outputs: g_albedo, g_normal, g_depth, g_material, g_velocity
- Render geometry (particles, SDFs) to G-Buffer
- Testing: G-Buffer textures created

**WGSL Shaders to Create:**
- `src/rendering/shaders/passes/g_buffer_pass.wgsl`
- Vertex shader: fullscreen quad
- Fragment shader: write to multiple targets

#### 10.3. Shader Infrastructure

**Service: ShaderLoaderService**
**Location**: `src/rendering/shader_loader.rs`
- Load WGSL shaders
- Shader compilation with naga
- Error reporting
- Testing: Load sample shaders

**Service: RenderTargetPoolService**
**Location**: `src/rendering/render_target_pool.rs`
- Texture pooling for ping-pong
- Memory management
- Testing: Texture allocation/deallocation

**Service: ShaderIntrospectionService** (Frontend)
**Location**: `src/rendering/shader_introspector.rs`
- Parse WGSL with naga
- Extract uniform layouts
- Testing: Shader metadata extraction

**Acceptance Criteria:**
- ✅ wgpu initializes successfully
- ✅ Window renders (blank screen is OK)
- ✅ G-Buffer textures created
- ✅ Shaders compile
- ✅ Render loop runs at 60 FPS
- ✅ CHANGELOG.md updated

---

## PHASE 11: FRONTEND RENDERING - LIGHTING AND POST-PROCESSING
**DURATION**: 1 Complete Engineer Turn
**DEPENDENCIES**: Phase 10 (wgpu foundation)
**STATUS**: NOT STARTED

### Deliverables

#### 11.1. Lighting Pass

**Service: LightingPassService**
**Location**: `src/rendering/passes/lighting_pass.rs`
- Fullscreen quad shader
- Reads from G-Buffer
- Computes lighting (directional, point)
- HBAO (Horizon-Based Ambient Occlusion)
- SSR (Screen Space Reflections) - optional
- Testing: Lighting output texture

**WGSL Shaders:**
- `src/rendering/shaders/passes/lighting_pass.wgsl`
- `src/rendering/shaders/passes/hbao_pass.wgsl`
- `src/rendering/shaders/passes/ssr_pass.wgsl` (optional)

#### 11.2. Post-Processing Chain (Kairos Phase 1: Atmosphere)

**Service: BloomPassService**
**Location**: `src/rendering/post_fx/bloom_pass.rs`
- Bright pass extraction
- Downsampling
- Gaussian blur (separable)
- Upsampling (additive)
- QualiaState parameters: intensity → threshold, transcendence → strength
- Testing: Bloom effect visible

**WGSL Shaders:**
- `src/rendering/shaders/post_fx/bloom_extract.wgsl`
- `src/rendering/shaders/post_fx/bloom_downsample.wgsl`
- `src/rendering/shaders/post_fx/blur.wgsl`
- `src/rendering/shaders/post_fx/bloom_upsample.wgsl`

**Service: GodRaysPassService**
**Location**: `src/rendering/post_fx/god_rays_pass.rs`
- Volumetric lighting
- Radial blur from light source
- QualiaState parameters: precision → ray sharpness, aggression → color tint
- Testing: God rays visible

**WGSL Shaders:**
- `src/rendering/shaders/post_fx/god_rays.wgsl`

**Service: DoFPassService** (Depth of Field)
**Location**: `src/rendering/post_fx/dof_pass.rs`
- Bokeh blur based on depth
- Circle of confusion calculation
- Testing: Blur gradient

**WGSL Shaders:**
- `src/rendering/shaders/post_fx/dof.wgsl`

**Service: MotionBlurPassService**
**Location**: `src/rendering/post_fx/motion_blur_pass.rs`
- Velocity buffer-based blur
- Testing: Blur on moving objects

**WGSL Shaders:**
- `src/rendering/shaders/post_fx/motion_blur.wgsl`

#### 11.3. Composite and TAA

**Service: CompositePassService**
**Location**: `src/rendering/passes/composite_pass.rs`
- Combine lighting + bloom + effects
- ACES Filmic Tonemapping
- Color grading (LUT 3D)
- Testing: Final image output

**WGSL Shaders:**
- `src/rendering/shaders/passes/composite_pass.wgsl`

**Service: TAAPassService** (Temporal Anti-Aliasing)
**Location**: `src/rendering/passes/taa_pass.rs`
- Uses previous frame + velocity buffer
- Jitter camera for sub-pixel sampling
- Testing: Edge smoothing

**WGSL Shaders:**
- `src/rendering/shaders/passes/taa_pass.wgsl`

**Acceptance Criteria:**
- ✅ Lighting pass renders illuminated scene
- ✅ Bloom effect works (parameterized by QualiaState)
- ✅ God rays work (parameterized by QualiaState)
- ✅ DoF and motion blur work
- ✅ TAA smooths edges
- ✅ Composite pass outputs final image
- ✅ 60 FPS maintained
- ✅ CHANGELOG.md updated

---

## PHASE 12: FRONTEND RENDERING - PARTICLES AND COMPUTE (Kairos Phase 2)
**DURATION**: 1 Complete Engineer Turn
**DEPENDENCIES**: Phase 11 (lighting/post-processing)
**STATUS**: NOT STARTED

### Deliverables

#### 12.1. Particle Compute Shader (Synesthesia)

**Service: ParticleComputeService**
**Location**: `src/rendering/compute/particle_compute.rs`
- Compute shader updates particle positions/velocities
- FFT modulation: bass → size, mids → velocity, treble → brightness
- QualiaState integration: intensity → emission rate
- Testing: Particle update accuracy

**WGSL Shaders:**
- `src/rendering/shaders/compute/particle_sim.wgsl`

**ParticleUniforms struct:**
- bass_level: f32
- mid_level: f32
- treble_level: f32
- fft_aggression_mod: f32
- delta_time: f32

#### 12.2. Particle Rendering

**Service: ParticleSystemService**
**Location**: `src/rendering/particle_system.rs`
- Instanced rendering of particles
- Particle buffer management
- Sorting for transparency
- Testing: 10,000+ particles at 60 FPS

**WGSL Shaders:**
- `src/rendering/shaders/particles/particle_render.wgsl`

#### 12.3. Physics Service

**Service: PhysicsService**
**Location**: `src/rendering/physics.rs`
- Client-side physics simulation
- Collision detection (optional for Phase 12)
- Testing: Physics accuracy

**Acceptance Criteria:**
- ✅ Particle compute shader updates 10,000+ particles
- ✅ FFT data modulates particles (verified visually)
- ✅ Particles rendered with transparency
- ✅ 60 FPS maintained with full particle system
- ✅ CHANGELOG.md updated

---

## PHASE 13: FRONTEND RENDERING - REACTION-DIFFUSION AND SDF (Kairos Phases 3-4)
**DURATION**: 1 Complete Engineer Turn
**DEPENDENCIES**: Phase 12 (particles)
**STATUS**: NOT STARTED

### Deliverables

#### 13.1. Reaction-Diffusion Compute (Kairos Phase 3)

**Service: ReactionDiffusionComputeService**
**Location**: `src/rendering/compute/reaction_diffusion_compute.rs`
- Compute shader simulates Gray-Scott model
- QualiaState parameters: chaos → diffusion rate, flow → feed rate
- Updates texture every frame
- Testing: Pattern formation

**WGSL Shaders:**
- `src/rendering/shaders/compute/reaction_diffusion.wgsl`

**ReactionDiffusionUniforms:**
- diffusion_rate: f32
- feed_rate: f32
- kill_rate: f32
- delta_time: f32

#### 13.2. SDF Avatar Rendering (Kairos Phase 4)

**Service: SDFRenderer** (Player + Boss)
**Location**: `src/rendering/sdf/player_avatar.rs` + `boss_avatar.rs`
- Raymarching in fragment shader
- SDF shapes: Sphere, Box, Torus, Mandelbulb
- Morphing based on QualiaState.transcendence
- Testing: SDF rendering accuracy

**WGSL Shaders:**
- `src/rendering/shaders/sdf/player_avatar.wgsl`
- `src/rendering/shaders/sdf/boss_avatar.wgsl`
- `src/rendering/shaders/sdf/fractals.wgsl` (Mandelbulb)

**SDFType enum:**
- Sphere { radius: f32 }
- Box { dimensions: Vec3 }
- Torus { major_radius: f32, minor_radius: f32 }
- Mandelbulb { iterations: u32 }

**Acceptance Criteria:**
- ✅ Reaction-diffusion patterns animate on arena floor
- ✅ QualiaState modulates RD parameters (verified visually)
- ✅ SDF player/boss avatars render
- ✅ Transcendence morphs player to Mandelbulb
- ✅ 60 FPS maintained
- ✅ CHANGELOG.md updated

---

## PHASE 14: FRONTEND UI COMPONENTS (LEPTOS)
**DURATION**: 1 Complete Engineer Turn
**DEPENDENCIES**: Phase 13 (all rendering complete)
**STATUS**: NOT STARTED

### Deliverables

#### 14.1. UI Services

**Service 1: NotificationService**
**Location**: `src/services/ui/notifications.rs`
- Toast notifications
- Event-driven notifications
- Testing: Notification display

**Service 2: SubtitleService**
**Location**: `src/services/ui/subtitles.rs`
- Lyric display synced with music
- Timing from SongData
- Testing: Subtitle timing accuracy

#### 14.2. UI Components (50+ Components from BLUEPRINT.RUST.md)

**Main Game Components:**
**Location**: `src/components/game/`
- `qualia_tempo_game.rs` (main game orchestrator)
- `qualia_tempo_hud.rs` (HUD overlay container)
- `boss_renderer.rs` (boss avatar display)
- `player_renderer.rs` (player avatar display)
- `qualia_field_renderer.rs` (qualia field background)
- `musical_notes_renderer.rs` (musical notes display)
- `grid_renderer.rs` (grid background)

**HUD Components:**
**Location**: `src/components/game/hud/`
- `qualia_orb.rs` (qualia orb display)
- `score_display.rs` (score counter)
- `combo_streak.rs` (combo multiplier)
- `health_visualization.rs` (health/shield bars)
- `chaos_indicator.rs` (chaos meter)
- `precision_flow_indicators.rs` (precision/flow meters)
- `neural_activity_bars.rs` (neural activity visualization)
- `neural_canvas.rs` (neural network visualization)
- `bpm_synchronizer.rs` (BPM display)
- `qualia_ambience.rs` (ambient effects)

**Other Components:**
**Location**: `src/components/`
- `layout/main_layout.rs` (main layout wrapper)
- `menu.rs` (main menu screen)
- `subtitles.rs` (subtitle display)
- `atmosphere.rs` (atmospheric effects)
- `debug/service_diagnostics_panel.rs` (debug panel)

**All components:**
- Use Leptos reactive signals
- Subscribe to GameStateStore
- Type-safe props
- Testing: Component rendering tests

**Acceptance Criteria:**
- ✅ All 50+ UI components implemented
- ✅ Components render without errors
- ✅ State updates trigger re-renders
- ✅ HUD displays game state correctly
- ✅ Debug panel shows service health
- ✅ CHANGELOG.md updated

---

## PHASE 15: FRONTEND SCENE SYSTEM AND INTEGRATION
**DURATION**: 1 Complete Engineer Turn
**DEPENDENCIES**: Phase 14 (UI components)
**STATUS**: NOT STARTED

### Deliverables

#### 15.1. Scene System

**Service: SceneManagerService**
**Location**: `src/services/scenes/manager.rs`
- IScene trait implementation
- Scene loading/unloading
- Transition orchestration
- Testing: Scene transitions

**Scene Implementations:**
**Location**: `src/components/scenes/`
- `combat_scene.rs` (Qualia Tempo combat loop - implements IScene)
- `cinematic_scene.rs` (narrative/cutscene player - implements IScene)
- `menu_scene.rs` (main menu - implements IScene)

**IScene trait:**
```
Methods:
- on_enter(resources)
- update(dt)
- render(engine)
- on_exit()
```

#### 15.2. Utility Services

**Service 1: ColorService**
**Location**: `src/services/utils/color.rs`
- Color manipulation
- RGB/HSV conversions
- Testing: Color conversion accuracy

**Service 2: CoordinateSystemService**
**Location**: `src/services/utils/coordinates.rs`
- Screen ↔ World coordinate transforms
- Testing: Transform accuracy

#### 15.3. Frontend Integration Tests

**Files to Create:**
- `tests/full_render_loop.rs` (complete render cycle)
- `tests/websocket_integration.rs` (client-server communication)
- `tests/audio_visual_sync.rs` (audio-visual synchronization)
- `tests/input_to_state.rs` (input → state → render)

**Test Scenarios:**
1. Input key → Send to backend → Receive state → Update UI
2. Audio beat → FFT → Particle update → Render
3. Scene transition: Menu → Combat → GameOver
4. Performance: 60 FPS with all systems active

**Acceptance Criteria:**
- ✅ Scene system works (transitions between scenes)
- ✅ All utility services implemented
- ✅ All frontend integration tests pass
- ✅ End-to-end flow: input → network → render works
- ✅ 60 FPS maintained with all systems
- ✅ CHANGELOG.md updated

---

## PHASE 16: BACKEND-FRONTEND INTEGRATION AND TESTING
**DURATION**: 1 Complete Engineer Turn
**DEPENDENCIES**: Phase 15 (frontend complete) + Phase 6 (backend complete)
**STATUS**: NOT STARTED

### Deliverables

#### 16.1. Full Stack Integration Tests

**Files to Create:**
- `integration_tests/full_game_session.rs`
- `integration_tests/multiplayer_lobby.rs` (optional)
- `integration_tests/persistence_flow.rs`
- `integration_tests/combat_loop_stress.rs`

**Test Scenarios:**
1. **Full Game Session:**
   - Start backend server
   - Connect frontend WebSocket client
   - Send PlayerAction (key press)
   - Backend processes action
   - Backend emits QualiaStateUpdated
   - Frontend receives update
   - Frontend renders new state
   - Verify: State matches expectations

2. **Combat Loop Stress:**
   - 60+ actions per second
   - Verify: No lag, no dropped events
   - Verify: Backend keeps up
   - Verify: Frontend renders smoothly

3. **Persistence Flow:**
   - Play game session
   - Save score to leaderboard
   - Retrieve leaderboard
   - Verify: Score stored correctly

4. **Audio-Visual Sync:**
   - Audio beat event
   - FFT analysis
   - Particle update
   - Visual render
   - Verify: Timing synchronized

#### 16.2. Performance Benchmarks

**Benchmarks to Run:**
- Backend: 10,000 particle updates/sec
- Frontend: 60 FPS with 10,000 particles
- WebSocket: 1000 messages/sec
- Latency: <50ms round-trip time

**Tools:**
- `criterion` for Rust benchmarks
- `cargo flamegraph` for profiling
- Browser DevTools for frontend profiling

#### 16.3. Load Testing

**Scenarios:**
- 10+ simultaneous WebSocket clients
- 1000+ leaderboard entries
- 100,000+ particles (stress test)

#### 16.4. Bug Fixes and Refinement

**Process:**
- Run all integration tests
- Identify failures
- Fix issues
- Re-run tests
- Iterate until all pass

**Acceptance Criteria:**
- ✅ All integration tests pass
- ✅ Performance benchmarks meet targets
- ✅ Load tests complete successfully
- ✅ No memory leaks detected
- ✅ No race conditions found
- ✅ Latency <50ms verified
- ✅ CHANGELOG.md updated

---

## PHASE 17: OPTIMIZATION AND POLISH
**DURATION**: 1 Complete Engineer Turn
**DEPENDENCIES**: Phase 16 (full integration)
**STATUS**: NOT STARTED

### Deliverables

#### 17.1. Profile-Guided Optimization (PGO)

**Steps:**
1. Build instrumented binary: `cargo pgo build`
2. Run profiling workload (typical gameplay)
3. Rebuild with profile: `cargo pgo optimize`
4. Benchmark improvement (expect 10-20% gain)

#### 17.2. Code Optimization

**Hot Path Optimization:**
- Inline critical functions (#[inline(always)])
- Arena allocation for particles
- Zero-copy deserialization where possible
- Batch processing for particle updates

**Profiling:**
- Use `cargo flamegraph` to identify bottlenecks
- Optimize top 10 slowest functions
- Verify improvements with benchmarks

#### 17.3. Memory Optimization

**Techniques:**
- Pool render targets (avoid allocations)
- Reuse particle buffers
- Optimize struct layouts (field ordering)
- Measure memory usage (heaptrack)

#### 17.4. Network Optimization

**Techniques:**
- Binary serialization (bincode already used)
- Message batching (combine multiple events)
- Compression for large payloads (optional)
- Measure bandwidth usage

#### 17.5. Shader Optimization

**Techniques:**
- Reduce ALU instructions
- Use texture compression
- Optimize particle shaders (instancing)
- Measure GPU usage

#### 17.6. Final Testing

**Tests to Run:**
- All unit tests
- All integration tests
- All performance benchmarks
- All load tests
- Memory leak tests (valgrind/heaptrack)
- Race condition tests (TSan if available)

**Acceptance Criteria:**
- ✅ PGO provides 10-20% performance boost
- ✅ All hot paths optimized
- ✅ Memory usage optimized
- ✅ Network bandwidth minimized
- ✅ Shaders optimized
- ✅ All tests still pass after optimization
- ✅ CHANGELOG.md updated

---

## PHASE 18: DOCUMENTATION AND DEPLOYMENT
**DURATION**: 1 Complete Engineer Turn
**DEPENDENCIES**: Phase 17 (optimization)
**STATUS**: NOT STARTED

### Deliverables

#### 18.1. API Documentation

**Generate:**
- `cargo doc --no-deps --document-private-items`
- Host documentation (GitHub Pages or docs.rs)

**Review:**
- All public APIs documented
- All `# Responsibility` headers present
- Examples for complex APIs

#### 18.2. Architecture Documentation

**Update Documents:**
- README.md with build instructions
- ARCHITECTURE.md with final architecture
- DEPLOYMENT.md with deployment guide

**Generate Diagrams:**
- Dependency graph (`cargo depgraph`)
- Service interaction diagram
- Data flow diagram

#### 18.3. Build Scripts

**Scripts to Create:**
- `scripts/build_release.sh` (PGO build)
- `scripts/run_tests.sh` (all tests)
- `scripts/lint_architecture.sh` (clippy + qualia-lints)
- `scripts/generate_schemas.rs` (JSON schemas)

#### 18.4. CI/CD Setup

**GitHub Actions Workflows:**
- `.github/workflows/rust.yml` (CI)
  - Run tests on every push
  - Run clippy on every PR
  - Run benchmarks on main branch
- `.github/workflows/deploy.yml` (CD)
  - Build release binaries
  - Deploy to staging/production

**Docker:**
- `Dockerfile` for backend
- `docker-compose.yml` for local development
- Docker image optimization (multi-stage builds)

#### 18.5. Deployment Preparation

**Backend Deployment:**
- Environment configuration (dotenv)
- Database migrations (sqlx or diesel)
- Logging configuration (JSON logs for production)
- Health check endpoint verification

**Frontend Deployment:**
- WASM bundle optimization
- Asset compression (gzip/brotli)
- CDN configuration (optional)
- Service worker (optional)

#### 18.6. Final Audit

**Checklist:**
- ✅ All 72 services implemented
- ✅ All 50+ UI components implemented
- ✅ All 25+ shaders ported to WGSL
- ✅ All 40+ data contracts implemented
- ✅ All tests pass (unit + integration + e2e)
- ✅ Clippy passes with no warnings
- ✅ Code coverage >80%
- ✅ Performance benchmarks meet targets
- ✅ Documentation complete
- ✅ CI/CD configured
- ✅ Deployment ready
- ✅ CHANGELOG.md final update

**Acceptance Criteria:**
- ✅ API documentation published
- ✅ Architecture documentation updated
- ✅ Build scripts working
- ✅ CI/CD pipeline functional
- ✅ Docker images built
- ✅ Deployment successful (staging)
- ✅ Final audit checklist complete
- ✅ CHANGELOG.md finalized

---

## SUCCESS CRITERIA FOR ENTIRE PROJECT

**Functional Requirements:**
- ✅ Backend handles 100+ concurrent WebSocket connections
- ✅ Frontend renders at 60 FPS with 10,000+ particles
- ✅ Full game loop works: Menu → Combat → GameOver → Leaderboard
- ✅ Musical input system works (Q-E-R-T-F-G-C keys)
- ✅ Combo detection works (harmonic vs chaotic)
- ✅ Boss AI adapts to QualiaState
- ✅ Audio generation works (Performance Engine)
- ✅ Spatial audio (8D) works
- ✅ All visual effects work (Bloom, God Rays, RD, SDF)
- ✅ Persistence saves leaderboard

**Non-Functional Requirements:**
- ✅ Latency <50ms (round-trip)
- ✅ Memory usage <500MB (backend)
- ✅ Memory usage <200MB (frontend)
- ✅ CPU usage <50% (single core, backend)
- ✅ GPU usage <80% (frontend)
- ✅ No memory leaks
- ✅ No race conditions
- ✅ No panics in production code

**Architectural Requirements:**
- ✅ Zero violations of QUALIA.CODE.RUST
- ✅ Zero violations of ARCHITECTURE.RUST
- ✅ Zero clippy warnings
- ✅ All services use DI (Shaku)
- ✅ EventBus uses tokio::sync::broadcast
- ✅ All services have `# Responsibility` docstrings
- ✅ All services have tests with high-fidelity mocks
- ✅ Test isolation verified
- ✅ Code coverage >80%

**Documentation Requirements:**
- ✅ All public APIs documented
- ✅ Architecture diagrams generated
- ✅ Deployment guide complete
- ✅ CHANGELOG.md complete

---

## NOTES FOR AI ENGINEER

### Workflow for Each Phase

1. **Read Phase Requirements** (this document)
2. **Review Relevant Documentation:**
   - QUALIA.CODE.RUST.md (architectural laws)
   - BLUEPRINT.RUST.md (service mappings)
   - DATA.RUST.md (contract definitions)
   - LINTER.RUST.md (linting rules)
3. **Implement Services:**
   - Create interface traits
   - Implement structs with #[derive(Component)]
   - Inject dependencies with #[shaku(inject)]
   - Add `# Responsibility` docstrings
4. **Write Tests:**
   - Create high-fidelity mocks with mockall
   - Write unit tests with isolated containers
   - Write integration tests
5. **Validate:**
   - Run tests: `cargo test`
   - Run clippy: `cargo clippy -- -D warnings`
   - Verify no unwrap/expect in production code
6. **Update CHANGELOG.md**
7. **Git Diff Review**: `git diff HEAD`

### Priority Order Rationale

**Why Macros First (Phase 0)?**
- The entire codebase depends on procedural macros (#[handle_event], #[cached], etc.)
- Cannot write service code without these macros
- Macros are compile-time, must be stable before service code

**Why Shared Core Second (Phase 1)?**
- Both backend and frontend depend on shared contracts
- Event definitions needed for EventBus usage
- Traits needed for service interfaces

**Why Backend Before Frontend?**
- Backend is the authority (source of truth)
- Frontend consumes backend state
- Easier to test backend in isolation
- Frontend depends on WebSocket protocol from backend

**Why Rendering Last in Frontend?**
- Rendering is the most complex subsystem
- Depends on audio (FFT data)
- Depends on state management (GameStateStore)
- Requires all visual effects to be implemented together

### Common Pitfalls to Avoid

1. **Don't Skip Tests:** Every phase MUST have tests
2. **Don't Use Placeholders:** Implement EVERYTHING in the phase
3. **Don't Ignore Clippy:** Fix ALL warnings
4. **Don't Forget Docstrings:** `# Responsibility` on ALL public types
5. **Don't Mock EventBus:** Use real broadcast in tests
6. **Don't Use unwrap():** Use ? with Result<T, E>
7. **Don't Block Async:** Use tokio::fs, not std::fs
8. **Don't Forget CHANGELOG.md:** Update after EVERY phase

---

**END OF IMPLEMENTATION PLAN v1.0**

*"18 phases. 72 services. 50 components. 25 shaders. Zero compromises. From macros to deployment. Every line production-ready."*
