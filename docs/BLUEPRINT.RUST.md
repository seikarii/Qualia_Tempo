# BLUEPRINT.RUST.md - Complete Rust Rewrite Migration Map
# VERSION: 1.0
# TARGET: Qualia Tempo Rust Edition
# COMPLIANCE: QUALIA.CODE.RUST v1.1 + GOLD.CODE

---

## 🎯 PURPOSE

This document serves as the **definitive migration blueprint** from the TypeScript/Python prototype to the Rust production implementation. It catalogs **every service** from the mature prototype and maps them to their Rust equivalents.

**CRITICAL**: This is NOT a greenfield project. We are rewriting a mature, battle-tested system. Every service listed here represents production-validated functionality that MUST be preserved.

---

## 📊 MIGRATION STATISTICS

- **Prototype Backend Services**: 24
- **Prototype Frontend Services**: 50
- **Total Services**: 74
- **Services Removed (Outdated)**: 6 (8%)
- **Services Replaced (Rust-Native)**: 12 (16%)
- **Services Preserved (Core Logic)**: 56 (76%)

---

## 🗂️ COMPLETE FOLDER STRUCTURE

```
qualia-tempo-rust/
├── Cargo.toml                          # Workspace manifest
├── .cargo/
│   └── config.toml                     # Cargo configuration (PGO, release opts)
│
├── shared_core/                        # 🔷 SHARED CONTRACTS & TRAITS
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs                      # Re-exports all modules
│       │
│       ├── contracts/                  # All shared data structures
│       │   ├── mod.rs
│       │   ├── game_state.rs          # QualiaState, PlayerState, BossState
│       │   ├── combat_data.rs         # CombatData, PatternData, LyricData
│       │   ├── audio.rs               # AudioEvent, AudioLayer, SongData
│       │   ├── particles.rs           # ParticleSystemConfig, OptimizedParticle
│       │   ├── input.rs               # PlayerAction, MusicalInputAnalysis
│       │   └── effects.rs             # ActiveEffect, EnvironmentEffect
│       │
│       ├── events/                    # Event definitions
│       │   ├── mod.rs
│       │   ├── game_events.rs         # GameEvent enum (all event types)
│       │   ├── audio_events.rs        # Audio-specific events
│       │   └── combat_events.rs       # Combat-specific events
│       │
│       ├── traits/                    # Shared trait interfaces
│       │   ├── mod.rs
│       │   ├── logger.rs              # ILogger trait
│       │   ├── event_bus.rs           # IEventBus trait
│       │   └── config.rs              # Configuration traits
│       │
│       └── utils/                     # Shared utilities
│           ├── mod.rs
│           ├── math.rs                # Vector2, Vector3, clamp, lerp
│           └── validation.rs          # Validator utilities
│
├── backend/                            # 🔴 BACKEND (Server Binary)
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs                     # Entry point + Composition Root
│       ├── lib.rs                      # Library exports for testing
│       │
│       ├── config/                     # Configuration loading
│       │   ├── mod.rs
│       │   ├── server.rs              # ServerConfig
│       │   ├── game_logic.rs          # GameLogicConfig
│       │   ├── boss_ai.rs             # BossAIConfig
│       │   ├── particle_engine.rs     # ParticleEngineConfig
│       │   └── loader.rs              # YAML config loader
│       │
│       ├── services/                   # All service implementations
│       │   ├── mod.rs
│       │   │
│       │   ├── core/                  # Core infrastructure services
│       │   │   ├── mod.rs
│       │   │   ├── event_bus.rs       # ✅ EventBusService (tokio::sync::broadcast)
│       │   │   ├── logger.rs          # ✅ QualiaLogger (tracing wrapper)
│       │   │   ├── timer.rs           # ✅ TimerService (tokio::time)
│       │   │   └── error_reporter.rs  # ✅ ErrorReportingService
│       │   │
│       │   ├── lifecycle/             # Application lifecycle
│       │   │   ├── mod.rs
│       │   │   └── initializer.rs     # ✅ ApplicationInitializerService
│       │   │
│       │   ├── gameplay/              # Core game logic
│       │   │   ├── mod.rs
│       │   │   ├── game_logic.rs      # ✅ GameLogicService
│       │   │   ├── boss_ai.rs         # ✅ BossAIService
│       │   │   ├── pattern_system.rs  # ✅ PatternSystemService
│       │   │   ├── qualia_processor.rs # ✅ QualiaProcessor
│       │   │   └── combat_orchestrator.rs # NEW: Combat flow orchestration
│       │   │
│       │   ├── audio/                 # Audio analysis
│       │   │   ├── mod.rs
│       │   │   └── harmony_analyzer.rs # ✅ HarmonyAnalysisService
│       │   │
│       │   ├── rendering/             # Rendering services
│       │   │   ├── mod.rs
│       │   │   ├── particle_pool.rs   # ✅ ParticleEnginePoolManager (Tokio tasks)
│       │   │   └── shader_introspector.rs # ✅ ShaderIntrospectionService
│       │   │
│       │   ├── networking/            # Network services
│       │   │   ├── mod.rs
│       │   │   ├── websocket.rs       # ✅ WebSocketService (Axum + tokio-tungstenite)
│       │   │   └── state_streaming.rs # ✅ GameStateStreamingService
│       │   │
│       │   ├── persistence/           # Data persistence
│       │   │   ├── mod.rs
│       │   │   └── leaderboard.rs     # ✅ PersistenceService (SQLite/PostgreSQL)
│       │   │
│       │   ├── security/              # Authentication & authorization
│       │   │   ├── mod.rs
│       │   │   └── auth.rs            # ✅ SecurityService
│       │   │
│       │   ├── monitoring/            # Observability
│       │   │   ├── mod.rs
│       │   │   ├── health_check.rs    # ✅ HealthCheckService
│       │   │   ├── metrics.rs         # ✅ MetricsService
│       │   │   └── performance.rs     # ✅ PerformanceService
│       │   │
│       │   ├── infrastructure/        # Infrastructure services
│       │   │   ├── mod.rs
│       │   │   ├── file_system.rs     # ✅ FileSystemService
│       │   │   └── environment.rs     # ✅ SystemEnvironmentService
│       │   │
│       │   ├── interfaces/            # Service trait definitions
│       │   │   ├── mod.rs
│       │   │   ├── i_logger.rs        # ILogger trait
│       │   │   ├── i_event_bus.rs     # IEventBus trait
│       │   │   ├── i_game_logic.rs    # IGameLogicService trait
│       │   │   ├── i_boss_ai.rs       # IBossAIService trait
│       │   │   └── ... (all other service interfaces)
│       │   │
│       │   └── tests/                 # Service unit tests
│       │       ├── mod.rs
│       │       ├── mocks/             # High-fidelity mocks (mockall)
│       │       │   ├── mod.rs
│       │       │   ├── mock_logger.rs
│       │       │   ├── mock_event_bus.rs
│       │       │   └── ... (all service mocks)
│       │       └── test_container_factory.rs # Test DI container builder
│       │
│       ├── engine/                    # Particle engine (compute-heavy)
│       │   ├── mod.rs
│       │   ├── particle_engine.rs     # ✅ QualiaParticleEngine
│       │   └── particle_calculator.rs # ✅ ParticleStateCalculator
│       │
│       ├── handlers/                  # HTTP/WebSocket route handlers
│       │   ├── mod.rs
│       │   ├── websocket.rs           # WebSocket connection handler
│       │   ├── health.rs              # Health check endpoint
│       │   └── engine.rs              # Particle engine API
│       │
│       └── utils/                     # Backend utilities
│           ├── mod.rs
│           └── validation.rs          # Input validation
│
├── frontend/                           # 🔵 FRONTEND (WASM Client)
│   ├── Cargo.toml
│   ├── index.html                     # HTML entry point
│   ├── Trunk.toml                     # Trunk bundler config
│   └── src/
│       ├── lib.rs                      # WASM entry point
│       ├── app.rs                      # Root Leptos component
│       │
│       ├── components/                 # Leptos UI components
│       │   ├── mod.rs
│       │   ├── game_ui.rs             # Main game UI container
│       │   ├── qualia_display.rs      # Qualia state visualization
│       │   ├── boss_renderer.rs       # Boss UI overlay
│       │   ├── combo_display.rs       # Combo counter
│       │   ├── health_bar.rs          # Health/shield bars
│       │   └── subtitle_display.rs    # Lyric subtitles
│       │
│       ├── state/                      # Leptos Signals state management
│       │   ├── mod.rs
│       │   ├── game_store.rs          # ✅ GameStateStore (Leptos RwSignal)
│       │   └── ui_store.rs            # UI-specific state
│       │
│       ├── services/                   # Frontend service layer
│       │   ├── mod.rs
│       │   │
│       │   ├── core/                  # Core infrastructure
│       │   │   ├── mod.rs
│       │   │   ├── event_bus.rs       # ✅ EventBus (tokio::sync::broadcast)
│       │   │   ├── logger.rs          # ✅ Logger (tracing to console)
│       │   │   ├── timer.rs           # ✅ TimerService (gloo-timers)
│       │   │   └── error_reporter.rs  # ✅ ErrorReportingService
│       │   │
│       │   ├── lifecycle/             # Lifecycle management
│       │   │   ├── mod.rs
│       │   │   └── initializer.rs     # ✅ ApplicationInitializerService
│       │   │
│       │   ├── audio/                 # Audio services (Web Audio API)
│       │   │   ├── mod.rs
│       │   │   ├── playback.rs        # ✅ AudioService
│       │   │   ├── spatial_audio.rs   # ✅ Audio8DService
│       │   │   ├── fft_analyzer.rs    # ✅ AudioAnalysisService
│       │   │   ├── audio_bridge.rs    # ✅ AudioSystemBridge (wasm-bindgen)
│       │   │   └── web_audio_api.rs   # ✅ WebAudioAPIService (wasm-bindgen)
│       │   │
│       │   ├── input/                 # Input handling
│       │   │   ├── mod.rs
│       │   │   ├── input_controller.rs # ✅ GameInputControllerService
│       │   │   ├── input_state.rs     # ✅ InputStateService
│       │   │   └── rhythmic_movement.rs # ✅ RhythmicMovementController
│       │   │
│       │   ├── gameplay/              # Gameplay logic
│       │   │   ├── mod.rs
│       │   │   ├── game_controller.rs # ✅ GameControllerService
│       │   │   ├── mechanics.rs       # ✅ GameplayMechanicsService
│       │   │   ├── combo_detector.rs  # ✅ MusicalComboDetectorService
│       │   │   └── qualia_worker_bridge.rs # ✅ QualiaCalculatorWorkerService
│       │   │
│       │   ├── state/                 # State management services
│       │   │   ├── mod.rs
│       │   │   ├── state_merger.rs    # ✅ StateMergerService
│       │   │   └── view_logic.rs      # ✅ ViewLogicService
│       │   │
│       │   ├── networking/            # Network services
│       │   │   ├── mod.rs
│       │   │   ├── sync.rs            # ✅ BackendSyncService
│       │   │   ├── state_streaming.rs # ✅ GameStateStreamingService
│       │   │   ├── websocket_client.rs # ✅ WebSocketService (tokio-tungstenite WASM)
│       │   │   └── jitter_compensator.rs # ✅ JitterService
│       │   │
│       │   ├── ui/                    # UI services
│       │   │   ├── mod.rs
│       │   │   ├── notifications.rs   # ✅ NotificationService
│       │   │   └── subtitles.rs       # ✅ SubtitleService
│       │   │
│       │   ├── utils/                 # Utility services
│       │   │   ├── mod.rs
│       │   │   ├── color.rs           # ✅ ColorService
│       │   │   └── coordinates.rs     # ✅ CoordinateSystemService
│       │   │
│       │   ├── monitoring/            # Performance monitoring
│       │   │   ├── mod.rs
│       │   │   └── performance.rs     # ✅ PerformanceService
│       │   │
│       │   ├── debug/                 # Debug utilities
│       │   │   ├── mod.rs
│       │   │   ├── orchestrator.rs    # ✅ DebugOrchestratorService
│       │   │   └── debug.rs           # ✅ DebugService
│       │   │
│       │   ├── interfaces/            # Service trait definitions
│       │   │   ├── mod.rs
│       │   │   └── ... (all frontend service interfaces)
│       │   │
│       │   └── tests/                 # Service unit tests
│       │       ├── mod.rs
│       │       └── mocks/             # High-fidelity mocks
│       │
│       ├── rendering/                  # wgpu rendering engine
│       │   ├── mod.rs
│       │   ├── renderer.rs            # ✅ FrontendRenderingService
│       │   ├── kairos_engine.rs       # ✅ KairosVisualEngine (main visual orchestrator)
│       │   ├── particle_system.rs     # ✅ ParticleSystemService
│       │   ├── physics.rs             # ✅ PhysicsService
│       │   ├── post_processing.rs     # ✅ PostProcessingService
│       │   ├── render_target_pool.rs  # ✅ RenderTargetPoolService
│       │   ├── shader_loader.rs       # ✅ ShaderLoaderService (naga)
│       │   ├── shader_introspector.rs # ✅ ShaderIntrospectionService
│       │   │
│       │   └── shaders/               # Shader implementations
│       │       ├── mod.rs
│       │       ├── reaction_diffusion.rs # ✅ ReactionDiffusionService
│       │       ├── bloom.rs           # Bloom post-processing
│       │       ├── god_rays.rs        # Volumetric lighting
│       │       ├── sdf_renderer.rs    # Signed Distance Fields
│       │       └── particle.wgsl      # Particle shader (WGSL)
│       │
│       ├── workers/                    # Web Workers (compute offload)
│       │   ├── mod.rs
│       │   └── qualia_calculator.rs   # ✅ QualiaStateCalculatorService (Web Worker)
│       │
│       ├── hooks/                      # Leptos hooks
│       │   ├── mod.rs
│       │   ├── use_game_state.rs      # Access GameStateStore
│       │   └── use_audio_context.rs   # Access Web Audio API
│       │
│       └── utils/                      # Frontend utilities
│           ├── mod.rs
│           └── wasm_bindgen_helpers.rs # wasm-bindgen utilities
│
├── qualia_macros/                      # 🔶 PROCEDURAL MACROS
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs
│       ├── derive_event.rs            # #[derive(QualiaEvent)]
│       ├── derive_config.rs           # #[derive(QualiaConfig)]
│       └── service_macro.rs           # #[qualia_service] attribute macro
│
├── scripts/                            # 🔧 BUILD & DEV SCRIPTS
│   ├── generate_schemas.rs            # Generate JSON schemas from Rust structs
│   ├── lint_architecture.sh           # Run architectural linter
│   ├── run_tests.sh                   # Run all tests with coverage
│   └── build_release.sh               # Build with PGO
│
├── config/                             # 📋 CONFIGURATION FILES (YAML)
│   ├── backend/
│   │   ├── server.yaml                # Server configuration
│   │   ├── game_logic.yaml            # Game logic parameters
│   │   ├── boss_ai.yaml               # Boss AI tuning
│   │   └── particle_engine.yaml       # Particle engine config
│   │
│   └── frontend/
│       ├── rendering.yaml             # Rendering settings
│       └── audio.yaml                 # Audio settings
│
└── combat_data/                        # 🎮 GAME CONTENT DATA
    └── the_first_duel.json            # Combat data (boss, patterns, song)
```

---

## 📋 SERVICE MIGRATION CHECKLIST

### Backend Services (24 Total)

| # | Prototype Service | Rust Implementation | Status | Notes |
|---|-------------------|---------------------|--------|-------|
| 1 | ApplicationInitializerService | `backend/src/services/lifecycle/initializer.rs` | ✅ Migrate | Lifecycle orchestration |
| 2 | BossAIService | `backend/src/services/gameplay/boss_ai.rs` | ✅ Migrate | Boss behavior patterns |
| 3 | ConfigurationService | ❌ REMOVED | 🔄 Replace | Direct config injection with Serde |
| 4 | ErrorReportingService | `backend/src/services/core/error_reporter.rs` | ✅ Migrate | Error handling + tracing |
| 5 | EventBus | `backend/src/services/core/event_bus.rs` | 🔄 Replace | tokio::sync::broadcast (lock-free) |
| 6 | FileSystemService | `backend/src/services/infrastructure/file_system.rs` | ✅ Migrate | File I/O with tokio::fs |
| 7 | GameLogicService | `backend/src/services/gameplay/game_logic.rs` | ✅ Migrate | Core game rules |
| 8 | GameStateStreamingService | `backend/src/services/networking/state_streaming.rs` | ✅ Migrate | State broadcasting |
| 9 | HarmonyAnalysisService | `backend/src/services/audio/harmony_analyzer.rs` | ✅ Migrate | Musical harmony detection |
| 10 | HealthCheckService | `backend/src/services/monitoring/health_check.rs` | ✅ Migrate | System health checks |
| 11 | MetricsService | `backend/src/services/monitoring/metrics.rs` | ✅ Migrate | Performance metrics |
| 12 | ParticleEnginePoolManager | `backend/src/services/rendering/particle_pool.rs` | 🔄 Replace | Tokio task pool (not process pool) |
| 13 | PatternSystemService | `backend/src/services/gameplay/pattern_system.rs` | ✅ Migrate | Boss attack patterns |
| 14 | PerformanceService | `backend/src/services/monitoring/performance.rs` | ✅ Migrate | Performance tracking |
| 15 | PersistenceService | `backend/src/services/persistence/leaderboard.rs` | ✅ Migrate | Database persistence |
| 16 | QualiaLogger | `backend/src/services/core/logger.rs` | 🔄 Replace | tracing crate wrapper |
| 17 | QualiaProcessor | `backend/src/services/gameplay/qualia_processor.rs` | ✅ Migrate | Qualia state calculation |
| 18 | SecurityService | `backend/src/services/security/auth.rs` | ✅ Migrate | Auth + validation |
| 19 | ShaderIntrospectionService | `backend/src/services/rendering/shader_introspector.rs` | ✅ Migrate | Shader metadata |
| 20 | StateStreamingService | `backend/src/services/networking/websocket.rs` | �� Replace | Axum + tokio-tungstenite |
| 21 | SystemEnvironmentService | `backend/src/services/infrastructure/environment.rs` | ✅ Migrate | Environment detection |
| 22 | TimerService | `backend/src/services/core/timer.rs` | 🔄 Replace | tokio::time |
| 23 | ParticleStateCalculator | `backend/src/engine/particle_calculator.rs` | ✅ Migrate | Particle physics |
| 24 | QualiaParticleEngine | `backend/src/engine/particle_engine.rs` | ✅ Migrate | Particle simulation |

**Legend:**
- ✅ **Migrate**: Core logic preserved, rewritten in Rust
- 🔄 **Replace**: Functionality replaced with Rust-native solution
- ❌ **REMOVED**: Anti-pattern, removed entirely

---

### Frontend Services (50 Total)

| # | Prototype Service | Rust Implementation | Status | Notes |
|---|-------------------|---------------------|--------|-------|
| 1 | ApplicationCompositionRoot | `frontend/src/main.rs` (Shaku setup) | 🔄 Replace | Shaku DI container |
| 2 | ApplicationInitializerService | `frontend/src/services/lifecycle/initializer.rs` | ✅ Migrate | Lifecycle orchestration |
| 3 | Audio8DService | `frontend/src/services/audio/spatial_audio.rs` | ✅ Migrate | 8D spatial audio |
| 4 | AudioAnalysisService | `frontend/src/services/audio/fft_analyzer.rs` | ✅ Migrate | FFT analysis |
| 5 | AudioService | `frontend/src/services/audio/playback.rs` | ✅ Migrate | Audio playback |
| 6 | AudioSystemBridge | `frontend/src/services/audio/audio_bridge.rs` | ✅ Migrate | Audio abstraction |
| 7 | BackendSyncService | `frontend/src/services/networking/sync.rs` | ✅ Migrate | Backend synchronization |
| 8 | BrowserAudioContextFactory | ❌ REMOVED | 🔄 Replace | Direct wasm-bindgen |
| 9 | BrowserEventsService | ❌ REMOVED | 🔄 Replace | Leptos event handlers |
| 10 | BrowserWebSocketFactory | ❌ REMOVED | 🔄 Replace | Direct tokio-tungstenite |
| 11 | ColorService | `frontend/src/services/utils/color.rs` | ✅ Migrate | Color manipulation |
| 12 | ConfigurationService | ❌ REMOVED | 🔄 Replace | Direct config injection |
| 13 | CoordinateSystemService | `frontend/src/services/utils/coordinates.rs` | ✅ Migrate | Coordinate transforms |
| 14 | DebugOrchestratorService | `frontend/src/services/debug/orchestrator.rs` | ✅ Migrate | Debug coordination |
| 15 | DebugService | `frontend/src/services/debug/debug.rs` | ✅ Migrate | Debug utilities |
| 16 | ErrorReportingService | `frontend/src/services/core/error_reporter.rs` | ✅ Migrate | Error handling |
| 17 | EventBus | `frontend/src/services/core/event_bus.rs` | 🔄 Replace | tokio::sync::broadcast |
| 18 | FrontendRenderingService | `frontend/src/rendering/renderer.rs` | 🔄 Replace | wgpu renderer |
| 19 | GameControllerService | `frontend/src/services/gameplay/game_controller.rs` | ✅ Migrate | Game loop control |
| 20 | GameInputControllerService | `frontend/src/services/input/input_controller.rs` | ✅ Migrate | Input handling |
| 21 | GameStateStore | `frontend/src/state/game_store.rs` | 🔄 Replace | Leptos Signals |
| 22 | GameStateStoreService | ❌ REMOVED | 🔄 Replace | Direct signal access |
| 23 | GameStateStreamingService | `frontend/src/services/networking/state_streaming.rs` | ✅ Migrate | State streaming |
| 24 | GameplayMechanicsService | `frontend/src/services/gameplay/mechanics.rs` | ✅ Migrate | Gameplay rules |
| 25 | HttpService | ❌ REMOVED | 🔄 Replace | Direct reqwest usage |
| 26 | InputStateService | `frontend/src/services/input/input_state.rs` | ✅ Migrate | Input state management |
| 27 | JitterService | `frontend/src/services/networking/jitter_compensator.rs` | ✅ Migrate | Network jitter compensation |
| 28 | JsGlslParserService | ❌ REMOVED | 🔄 Replace | naga (WGSL/GLSL parser) |
| 29 | KairosVisualEngine | `frontend/src/rendering/kairos_engine.rs` | ✅ Migrate | Main visual engine |
| 30 | Logger | `frontend/src/services/core/logger.rs` | 🔄 Replace | tracing to console |
| 31 | MusicalComboDetectorService | `frontend/src/services/gameplay/combo_detector.rs` | ✅ Migrate | Combo detection |
| 32 | NotificationService | `frontend/src/services/ui/notifications.rs` | ✅ Migrate | User notifications |
| 33 | ParticleSystemService | `frontend/src/rendering/particle_system.rs` | 🔄 Replace | wgpu particle system |
| 34 | PerformanceService | `frontend/src/services/monitoring/performance.rs` | ✅ Migrate | Performance monitoring |
| 35 | PhysicsService | `frontend/src/rendering/physics.rs` | ✅ Migrate | Physics simulation |
| 36 | PostProcessingService | `frontend/src/rendering/post_processing.rs` | 🔄 Replace | wgpu post-processing |
| 37 | QualiaCalculatorWorkerService | `frontend/src/services/gameplay/qualia_worker_bridge.rs` | ✅ Migrate | Worker communication |
| 38 | QualiaStateCalculatorService | `frontend/src/workers/qualia_calculator.rs` | ✅ Migrate | Qualia calculation (Web Worker) |
| 39 | ReactionDiffusionService | `frontend/src/rendering/shaders/reaction_diffusion.rs` | 🔄 Replace | WGSL shader |
| 40 | RenderTargetPoolService | `frontend/src/rendering/render_target_pool.rs` | ✅ Migrate | Render target pooling |
| 41 | RhythmicMovementController | `frontend/src/services/input/rhythmic_movement.rs` | ✅ Migrate | Rhythmic movement |
| 42 | ShaderIntrospectionService | `frontend/src/rendering/shader_introspector.rs` | ✅ Migrate | Shader metadata |
| 43 | ShaderLoaderService | `frontend/src/rendering/shader_loader.rs` | 🔄 Replace | naga + wgpu |
| 44 | StateMergerService | `frontend/src/services/state/state_merger.rs` | ✅ Migrate | State merging |
| 45 | StateStreamingService | `frontend/src/services/networking/websocket_client.rs` | 🔄 Replace | tokio-tungstenite WASM |
| 46 | SubtitleService | `frontend/src/services/ui/subtitles.rs` | ✅ Migrate | Lyric display |
| 47 | TimerService | `frontend/src/services/core/timer.rs` | 🔄 Replace | gloo-timers |
| 48 | ViewLogicService | `frontend/src/services/state/view_logic.rs` | ✅ Migrate | View state logic |
| 49 | WebAudioAPIService | `frontend/src/services/audio/web_audio_api.rs` | ✅ Migrate | Web Audio API wrapper |
| 50 | WebSocketService | `frontend/src/services/networking/websocket_client.rs` | 🔄 Replace | tokio-tungstenite WASM |

---

## 🎨 RENDERING PIPELINE (VISUALS.GOLD.CODE)

### Phase 1: Atmosphere (Bloom + God Rays)
- **Implementation**: `frontend/src/rendering/shaders/bloom.rs` + `god_rays.rs`
- **QualiaState Mapping**:
  - `intensity` → Bloom threshold
  - `transcendence` → Bloom strength
  - `precision` → God ray sharpness
  - `aggression` → Color tint

### Phase 2: Synesthesia (FFT → Shaders)
- **Implementation**: `frontend/src/services/audio/fft_analyzer.rs` → `kairos_engine.rs`
- **FFT Mapping**:
  - Bass (0-4) → Particle size + emission rate
  - Mids (5-20) → Particle velocity + turbulence
  - Treble (21-31) → Particle brightness

### Phase 3: Living World (Reaction-Diffusion Floor)
- **Implementation**: `frontend/src/rendering/shaders/reaction_diffusion.rs`
- **Compute shader**: Updates texture every frame based on Qualia state

### Phase 4: Avatar Transformation (SDF Rendering)
- **Implementation**: `frontend/src/rendering/shaders/sdf_renderer.rs`
- **Player/Boss**: Rendered as SDFs, morph based on `transcendence`

---

## 🎮 GAMEPLAY SYSTEMS (qualiaupgrade.txt Integration)

### Qualia Generation Sources
1. **Player Dash** → Generates Qualia at dash origin
2. **Ability Cast** (Q, E, R, T, F, G, C) → Generates Qualia at cast location
3. **Metronome Tick** → Generates Qualia on beat
4. **Boss Attacks** → Generates purple/black Qualia

### Musical Input System
- **Keys**: Q, E, R, T, F, G, C (musical scale: Do, Re, Mi, Fa, Sol, La, Si)
- **Dash**: Spacebar (restores on metronome tick)
- **Ultimate**: Ctrl (requires x40 combo)
  - Doubles Qualia generation
  - Activates 8D audio + orchestral effect

### Combo System
- **Harmony-Based**: Combo increases with harmonic note sequences
- **Dissonance**: Chaotic sequences create repulsors/walls
- **3-5 Note Combos**: Trigger emergent effects (vortex, attractor, healer)

### Difficulty Scaling
- **Volume = Difficulty**: 0% = ultra-easy, 80-100% = hard
- **Combo Effect**: Higher combo → faster music → more attacks → less telegraph time

---

## 🔧 RUST-SPECIFIC OPTIMIZATIONS

### Zero-Copy Patterns
- **Arc<[u8]>**: Share audio buffers between services
- **Cow<'_, T>**: Copy-on-write for configs
- **&[ParticleState]**: Slice references for particle iteration

### Lock-Free Concurrency
- **tokio::sync::broadcast**: EventBus (no RwLock!)
- **atomic operations**: For counters and flags
- **message passing**: Over shared memory

### Profile-Guided Optimization (PGO)
1. Build instrumented binary: `cargo pgo build`
2. Run profiling workload (typical gameplay)
3. Rebuild with profile: `cargo pgo optimize`
4. Expected gain: **10-20% performance boost**

---

## 🧪 TESTING STRATEGY

### Unit Tests
- **Every service**: Test with mocked dependencies (mockall)
- **Test Coverage**: Minimum 80% for core services
- **Useful Tests Only**: Edge cases, error paths, boundary conditions

### Integration Tests
- **Full event flows**: Input → Backend → State → Rendering
- **Real DI container**: Use `create_test_module()` factory
- **Network tests**: Mock WebSocket server

### Performance Benchmarks
- **Criterion.rs**: Benchmark hot paths (particle updates, Qualia calculation)
- **Target**: 60 FPS with 10,000+ particles

---

## 📦 DEPENDENCY GRAPH

```
┌─────────────────┐
│  shared_core    │ (No dependencies on backend/frontend)
└─────────────────┘
         ▲
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼──────┐
│backend│ │frontend │
└───┬───┘ └──┬──────┘
    │        │
    │        ├─> wgpu (rendering)
    │        ├─> Leptos (UI)
    │        └─> wasm-bindgen (browser APIs)
    │
    ├─> Axum (HTTP/WebSocket)
    ├─> Tokio (async runtime)
    └─> Shaku (DI)
```

---

## 🚀 MIGRATION PHASES

### Phase 1: Foundation (Weeks 1-2)
- [ ] Setup Cargo workspace
- [ ] Implement shared_core contracts
- [ ] Backend: EventBus, Logger, Timer (core services)
- [ ] Frontend: EventBus, Logger, basic Leptos setup

### Phase 2: Networking (Week 3)
- [ ] Backend: WebSocket server (Axum + tokio-tungstenite)
- [ ] Frontend: WebSocket client (WASM)
- [ ] GameStateStreaming bidirectional flow

### Phase 3: Core Gameplay (Weeks 4-5)
- [ ] Backend: GameLogicService, QualiaProcessor, BossAI
- [ ] Frontend: QualiaCalculator (Web Worker), ComboDetector
- [ ] Input system (musical keys)

### Phase 4: Audio (Week 6)
- [ ] Frontend: Web Audio API bindings (wasm-bindgen)
- [ ] Audio8DService, FFTAnalyzer
- [ ] Backend: HarmonyAnalysisService

### Phase 5: Rendering (Weeks 7-9)
- [ ] Frontend: wgpu setup, KairosVisualEngine
- [ ] Phase 1: Bloom + God Rays
- [ ] Phase 2: FFT → Shaders
- [ ] Phase 3: Reaction-diffusion floor
- [ ] Phase 4: SDF avatars

### Phase 6: Polish (Weeks 10-12)
- [ ] Backend: Persistence, Metrics, HealthCheck
- [ ] Frontend: UI components (health bars, combo display, subtitles)
- [ ] Performance optimization (PGO)
- [ ] End-to-end testing

---

*"From 74 services to a unified Rust architecture. Zero compromise. Maximum performance."*

**END OF BLUEPRINT v1.0**
