# BLUEPRINT.RUST.md - Complete Rust Rewrite Migration Map
# VERSION: 2.0 (UPDATED)
# TARGET: Qualia Tempo Rust Edition
# COMPLIANCE: QUALIA.CODE.RUST v1.1 + GOLD.CODE + ARCHITECTURE.RUST v2.0

---

## 🎯 PURPOSE

This document serves as the **definitive migration blueprint** from the TypeScript/Python prototype to the Rust production implementation. It catalogs **every service** from the mature prototype and maps them to their Rust equivalents, ensuring 1:1 functional parity or superior implementation leveraging Rust's performance and safety advantages.

**CRITICAL**: This is NOT a greenfield project. We are rewriting a mature, battle-tested system with 74 services. Every service listed here represents production-validated functionality that MUST be preserved and enhanced.

---

## 📊 MIGRATION STATISTICS

- **Prototype Backend Services**: 24
- **Prototype Frontend Services**: 50
- **Total Services**: 74
- **Services Enhanced (Rust-Native)**: 68 (92%)
- **Services Removed (Obsolete)**: 6 (8%)
- **New Rust Services (Performance)**: 4 (5%)
- **Total Rust Services**: 72

---

## 🗂️ COMPLETE FOLDER STRUCTURE (UPDATED)

```
qualia-tempo-rust/
├── Cargo.toml                          # Workspace manifest
├── .cargo/
│   └── config.toml                     # Cargo configuration (PGO, release opts)
│
├── shared_core/                        # 📷 SHARED CONTRACTS & TRAITS
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs                      # Re-exports all modules
│       │
│       ├── contracts/                  # All shared data structures
│       │   ├── mod.rs
│       │   ├── game_state.rs          # QualiaState, PlayerState, BossState
│       │   ├── combat_data.rs         # CombatData, PatternData, LyricData
│       │   ├── audio.rs               # AudioEvent, AudioLayer, SongData, HarmonyMap, InstrumentPatch
│       │   ├── particles.rs           # ParticleSystemConfig, OptimizedParticle
│       │   ├── input.rs               # PlayerAction, MusicalInputAnalysis
│       │   ├── effects.rs             # ActiveEffect, EnvironmentEffect
│       │   ├── settings.rs            # GameSettings, AccessibilitySettings
│       │   └── leaderboard.rs         # LeaderboardEntry
│       │
│       ├── events/                    # Event definitions
│       │   ├── mod.rs
│       │   ├── game_events.rs         # GameEvent enum (all event types)
│       │   ├── audio_events.rs        # Audio-specific events, PlayGenerativeNote
│       │   ├── combat_events.rs       # Combat-specific events
│       │   └── system_events.rs       # System/lifecycle events
│       │
│       ├── traits/                    # Shared trait interfaces
│       │   ├── mod.rs
│       │   ├── logger.rs              # ILogger trait
│       │   ├── event_bus.rs           # IEventBus trait
│       │   ├── service.rs             # IBaseService trait
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
│       │   ├── harmony_analysis.rs    # HarmonyAnalysisConfig
│       │   ├── pattern_system.rs      # PatternSystemConfig
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
│       │   │   ├── combat_orchestrator.rs # ✅ CombatOrchestratorService (NEW)
│       │   │   └── mechanics.rs       # ✅ GameplayMechanicsService
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
│       │   │   ├── auth.rs            # ✅ AuthService
│       │   │   └── validation.rs      # ✅ ValidationService
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
│       │   ├── game/                  # Game UI components
│       │   │   ├── mod.rs
│       │   │   ├── qualia_tempo_game.rs # Main game container
│       │   │   ├── qualia_tempo_hud.rs  # HUD overlay
│       │   │   ├── boss_renderer.rs     # Boss avatar display
│       │   │   ├── player_renderer.rs   # Player avatar display
│       │   │   ├── qualia_field_renderer.rs # Qualia field background
│       │   │   ├── musical_notes_renderer.rs # Musical notes display
│       │   │   ├── grid_renderer.rs     # Grid background
│       │   │   └── hud/                # HUD sub-components
│       │   │       ├── mod.rs
│       │   │       ├── qualia_orb.rs
│       │   │       ├── score_display.rs
│       │   │       ├── combo_streak.rs
│       │   │       ├── health_visualization.rs
│       │   │       ├── chaos_indicator.rs
│       │   │       ├── precision_flow_indicators.rs
│       │   │       ├── neural_activity_bars.rs
│       │   │       ├── neural_canvas.rs
│       │   │       ├── bpm_synchronizer.rs
│       │   │       └── qualia_ambience.rs
│       │   │
│       │   ├── layout/                # Layout components
│       │   │   ├── mod.rs
│       │   │   └── main_layout.rs
│       │   │
│       │   ├── debug/                 # Debug components
│       │   │   ├── mod.rs
│       │   │   ├── service_diagnostics_panel.rs
│       │   │   └── diagnostics/
│       │   │       ├── mod.rs
│       │   │       ├── architecture_validation.rs
│       │   │       ├── diagnostic_header.rs
│       │   │       └── diagnostic_service_card.rs
│       │   │
│       │   ├── menu.rs                # Menu screens
│       │   ├── subtitles.rs           # Subtitle display
│       │   ├── atmosphere.rs          # Atmospheric effects
│       │   │
│       │   └── scenes/                  # Scene implementations
│       │       ├── mod.rs
│       │       ├── combat_scene.rs      # Qualia Tempo combat loop
│       │       ├── cinematic_scene.rs   # Narrative/cutscene player
│       │       └── menu_scene.rs        # Main menu
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
│       │   │   ├── fft_analyzer.rs    # ✅ AudioAnalysisService (FFTAnalyzerService)
│       │   │   ├── audio_bridge.rs    # ✅ AudioSystemBridge
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
│       ├── rendering/                  # wgpu Deferred Rendering pipeline
│       │   ├── mod.rs
│       │   ├── kairos_engine.rs       # ✅ KairosVisualEngine (orchestrator)
│       │   │
│       │   ├── passes/                # Render passes (Deferred pipeline)
│       │   │   ├── mod.rs
│       │   │   ├── g_buffer_pass.rs   # ✅ GBufferPassService
│       │   │   ├── lighting_pass.rs   # ✅ LightingPassService
│       │   │   ├── composite_pass.rs  # ✅ CompositePassService
│       │   │   └── taa_pass.rs        # ✅ TAAPassService
│       │   │
│       │   ├── post_fx/               # Post-processing effects chain
│       │   │   ├── mod.rs
│       │   │   ├── bloom_pass.rs      # ✅ BloomPassService
│       │   │   ├── god_rays_pass.rs   # ✅ GodRaysPassService
│       │   │   ├── dof_pass.rs        # ✅ DoFPassService
│       │   │   └── motion_blur_pass.rs # ✅ MotionBlurPassService
│       │   │
│       │   ├── compute/               # Compute shaders
│       │   │   ├── mod.rs
│       │   │   ├── particle_compute.rs # ✅ ParticleComputeService
│       │   │   └── reaction_diffusion_compute.rs # ✅ ReactionDiffusionComputeService
│       │   │
│       │   ├── sdf/                   # SDF renderers
│       │   │   ├── mod.rs
│       │   │   ├── player_avatar.rs   # Player SDF renderer
│       │   │   └── boss_avatar.rs     # Boss SDF renderer
│       │   │
│       │   ├── render_target_pool.rs  # ✅ RenderTargetPoolService
│       │   ├── shader_loader.rs       # ✅ ShaderLoaderService (naga)
│       │   └── shader_introspector.rs # ✅ ShaderIntrospectionService
│       │
│       ├── workers/                    # Web Workers (compute offload)
│       │   ├── mod.rs
│       │   └── qualia_calculator.rs   # ✅ QualiaStateCalculatorService (Web Worker)
│       │
│       ├── hooks/                      # Leptos hooks
│       │   ├── mod.rs
│       │   ├── use_game_state.rs      # Access GameStateStore
│       │   ├── use_audio_context.rs   # Access Web Audio API
│       │   └── use_service_health.rs  # Service health monitoring
│       │
│       └── utils/                      # Frontend utilities
│           ├── mod.rs
│           └── wasm_bindgen_helpers.rs # wasm-bindgen utilities
│
├── qualia_macros/                      # 🔶 PROCEDURAL MACROS
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs
│       ├── handle_event.rs            # #[handle_event] macro (replaces @OnEvent)
│       ├── instrument.rs              # #[instrument] macro (replaces @logMethod)
│       ├── cached.rs                  # #[cached] macro (replaces @cache)
│       ├── validate.rs                # #[validate] macro (replaces @validate)
│       ├── retry.rs                   # #[retry] macro (replaces @retry)
│       ├── timeout.rs                 # #[timeout] macro (replaces @timeout)
│       ├── rate_limit.rs              # #[rate_limit] macro (replaces @rate_limit)
│       ├── mutex.rs                   # #[mutex] macro (replaces @mutex)
│       ├── circuit_breaker.rs         # #[circuit_breaker] macro
│       ├── authorize.rs               # #[authorize] macro (replaces @authorize)
│       ├── transaction.rs             # #[transaction] macro (replaces @transaction)
│       └── deprecated.rs              # #[deprecated] macro (replaces @deprecated)
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
| 9 | HarmonyAnalysisService | `backend/src/services/audio/harmony_analyzer.rs` | ✅ Migrate | Performs Audio-to-MIDI transcription to generate the Harmony Map for generative music |
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
| 20 | StateStreamingService | `backend/src/services/networking/websocket.rs` | 🔄 Replace | Axum + tokio-tungstenite |
| 21 | SystemEnvironmentService | `backend/src/services/infrastructure/environment.rs` | ✅ Migrate | Environment detection |
| 22 | TimerService | `backend/src/services/core/timer.rs` | 🔄 Replace | tokio::time |
| 23 | ParticleStateCalculator | `backend/src/engine/particle_calculator.rs` | ✅ Migrate | Particle physics |
| 24 | QualiaParticleEngine | `backend/src/engine/particle_engine.rs` | ✅ Migrate | Particle simulation |

**Legend:**
- ✅ **Migrate**: Core logic preserved, rewritten in Rust
- 🔄 **Replace**: Functionality replaced with Rust-native solution
- ❌ **REMOVED**: Anti-pattern, removed entirely

---

### Frontend Services (58 Total)

| # | Prototype Service | Rust Implementation | Status | Notes |
|---|-------------------|---------------------|--------|-------|
| 1 | ApplicationCompositionRoot | `frontend/src/main.rs` (Shaku setup) | 🔄 Replace | Shaku DI container |
| 2 | ApplicationInitializerService | `frontend/src/services/lifecycle/initializer.rs` | ✅ Migrate | Lifecycle orchestration |
| 3 | Audio8DService | `frontend/src/services/audio/spatial_audio.rs` | ✅ Migrate | SpatialAudioService - handles 8D spatialization only |
| 4 | AudioAnalysisService | `frontend/src/services/audio/fft_analyzer.rs` | ✅ Migrate | FFT analysis |
| 5 | AudioService | `frontend/src/services/audio/playback.rs` | ✅ Migrate | Manages BGM playback and houses the Performance Engine (Sampler/Synth) for generative audio |
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
| 18 | GBufferPassService | `frontend/src/rendering/passes/g_buffer_pass.rs` | ✨ New | Deferred G-Buffer rendering |
| 19 | LightingPassService | `frontend/src/rendering/passes/lighting_pass.rs` | ✨ New | Deferred lighting computation |
| 20 | BloomPassService | `frontend/src/rendering/post_fx/bloom_pass.rs` | ✨ New | Bloom post-processing |
| 21 | GodRaysPassService | `frontend/src/rendering/post_fx/god_rays_pass.rs` | ✨ New | Volumetric lighting |
| 22 | DoFPassService | `frontend/src/rendering/post_fx/dof_pass.rs` | ✨ New | Depth of field |
| 23 | MotionBlurPassService | `frontend/src/rendering/post_fx/motion_blur_pass.rs` | ✨ New | Motion blur |
| 24 | TAAPassService | `frontend/src/rendering/passes/taa_pass.rs` | ✨ New | Temporal anti-aliasing |
| 25 | CompositePassService | `frontend/src/rendering/passes/composite_pass.rs` | ✨ New | Final composition + tonemapping |
| 26 | ParticleComputeService | `frontend/src/rendering/compute/particle_compute.rs` | ✨ New | Particle simulation compute |
| 27 | ReactionDiffusionComputeService | `frontend/src/rendering/compute/reaction_diffusion_compute.rs` | ✨ New | Reaction-diffusion compute |
| 28 | SDFRendererService | `frontend/src/rendering/sdf/player_avatar.rs` + `boss_avatar.rs` | ✨ New | SDF avatar rendering |
| 29 | GameControllerService | `frontend/src/services/gameplay/game_controller.rs` | ✅ Migrate | Game loop control |
| 30 | GameInputControllerService | `frontend/src/services/input/input_controller.rs` | ✅ Migrate | Input handling |
| 31 | GameStateStore | `frontend/src/state/game_store.rs` | 🔄 Replace | Leptos Signals |
| 32 | GameStateStoreService | ❌ REMOVED | 🔄 Replace | Direct signal access |
| 33 | GameStateStreamingService | `frontend/src/services/networking/state_streaming.rs` | ✅ Migrate | State streaming |
| 34 | GameplayMechanicsService | `frontend/src/services/gameplay/mechanics.rs` | ✅ Migrate | Gameplay rules |
| 35 | HttpService | ❌ REMOVED | 🔄 Replace | Direct reqwest usage |
| 36 | InputStateService | `frontend/src/services/input/input_state.rs` | ✅ Migrate | Input state management |
| 37 | JitterService | `frontend/src/services/networking/jitter_compensator.rs` | ✅ Migrate | Network jitter compensation |
| 38 | JsGlslParserService | ❌ REMOVED | 🔄 Replace | naga (WGSL/GLSL parser) |
| 39 | KairosVisualEngine | `frontend/src/rendering/kairos_engine.rs` | ✅ Migrate | Main visual engine |
| 40 | Logger | `frontend/src/services/core/logger.rs` | 🔄 Replace | tracing to console |
| 41 | MusicalComboDetectorService | `frontend/src/services/gameplay/combo_detector.rs` | ✅ Migrate | Combo detection |
| 42 | NotificationService | `frontend/src/services/ui/notifications.rs` | ✅ Migrate | User notifications |
| 43 | PerformanceService | `frontend/src/services/monitoring/performance.rs` | ✅ Migrate | Performance monitoring |
| 44 | PhysicsService | `frontend/src/rendering/physics.rs` | ✅ Migrate | Physics simulation |
| 45 | QualiaCalculatorWorkerService | `frontend/src/services/gameplay/qualia_worker_bridge.rs` | ✅ Migrate | Worker communication |
| 46 | QualiaStateCalculatorService | `frontend/src/workers/qualia_calculator.rs` | ✅ Migrate | Qualia calculation (Web Worker) |
| 47 | RenderTargetPoolService | `frontend/src/rendering/render_target_pool.rs` | ✅ Migrate | Render target pooling |
| 48 | RhythmicMovementController | `frontend/src/services/input/rhythmic_movement.rs` | ✅ Migrate | Rhythmic movement |
| 49 | ShaderIntrospectionService | `frontend/src/rendering/shader_introspector.rs` | ✅ Migrate | Shader metadata |
| 50 | ShaderLoaderService | `frontend/src/rendering/shader_loader.rs` | 🔄 Replace | naga + wgpu |
| 51 | SceneManagerService | `frontend/src/services/scenes/manager.rs` | ✨ New | Orchestrates scene transitions (Menu, Combat, Cinematic) |
| 52 | StateMergerService | `frontend/src/services/state/state_merger.rs` | ✅ Migrate | State merging |
| 53 | StateStreamingService | `frontend/src/services/networking/websocket_client.rs` | 🔄 Replace | tokio-tungstenite WASM |
| 54 | SubtitleService | `frontend/src/services/ui/subtitles.rs` | ✅ Migrate | Lyric display |
| 55 | TimerService | `frontend/src/services/core/timer.rs` | 🔄 Replace | gloo-timers |
| 56 | ViewLogicService | `frontend/src/services/state/view_logic.rs` | ✅ Migrate | View state logic |
| 57 | WebAudioAPIService | `frontend/src/services/audio/web_audio_api.rs` | ✅ Migrate | Web Audio API wrapper |
| 58 | WebSocketService | `frontend/src/services/networking/websocket_client.rs` | 🔄 Replace | tokio-tungstenite WASM |

---

## 🎨 UI COMPONENTS MIGRATION

### Game Components (From prototype `frontend/src/components/game/`)

| Component | Rust Implementation | Status | Notes |
|-----------|---------------------|--------|-------|
| QualiaTempoGame.tsx | `components/game/qualia_tempo_game.rs` | ✅ Migrate | Main game orchestrator |
| QualiaTempoHUD.tsx | `components/game/qualia_tempo_hud.rs` | ✅ Migrate | HUD overlay container |
| BossRenderer.tsx | `components/game/boss_renderer.rs` | ✅ Migrate | Boss avatar display |
| PlayerRenderer.tsx | `components/game/player_renderer.rs` | ✅ Migrate | Player avatar display |
| BossAvatar.tsx | `components/game/boss_avatar.rs` | ✅ Migrate | Boss visual representation |
| PlayerAvatar.tsx | `components/game/player_avatar.rs` | ✅ Migrate | Player visual representation |
| QualiaFieldRenderer.tsx | `components/game/qualia_field_renderer.rs` | ✅ Migrate | Qualia field background |
| MusicalNotesRenderer.tsx | `components/game/musical_notes_renderer.rs` | ✅ Migrate | Musical notes display |
| GridRenderer.tsx | `components/game/grid_renderer.rs` | ✅ Migrate | Grid background |

### HUD Components (From prototype `frontend/src/components/game/hud/`)

| Component | Rust Implementation | Status | Notes |
|-----------|---------------------|--------|-------|
| QualiaOrb.tsx | `components/game/hud/qualia_orb.rs` | ✅ Migrate | Qualia orb display |
| ScoreDisplay.tsx | `components/game/hud/score_display.rs` | ✅ Migrate | Score counter |
| ComboStreak.tsx | `components/game/hud/combo_streak.rs` | ✅ Migrate | Combo multiplier |
| HealthVisualization.tsx | `components/game/hud/health_visualization.rs` | ✅ Migrate | Health/shield bars |
| ChaosIndicator.tsx | `components/game/hud/chaos_indicator.rs` | ✅ Migrate | Chaos meter |
| PrecisionFlowIndicators.tsx | `components/game/hud/precision_flow_indicators.rs` | ✅ Migrate | Precision/flow meters |
| NeuralActivityBars.tsx | `components/game/hud/neural_activity_bars.rs` | ✅ Migrate | Neural activity visualization |
| NeuralCanvas.tsx | `components/game/hud/neural_canvas.rs` | ✅ Migrate | Neural network visualization |
| BPMSynchronizer.tsx | `components/game/hud/bpm_synchronizer.rs` | ✅ Migrate | BPM display |
| QualiaAmbience.tsx | `components/game/hud/qualia_ambience.rs` | ✅ Migrate | Ambient effects |

### Field Layers (From prototype `frontend/src/components/game/field-layers/`)

| Component | Rust Implementation | Status | Notes |
|-----------|---------------------|--------|-------|
| FieldParticlesLayer.tsx | `components/game/field_layers/field_particles_layer.rs` | ✅ Migrate | Particle field layer |
| AmbientSpheresLayer.tsx | `components/game/field_layers/ambient_spheres_layer.rs` | ✅ Migrate | Ambient sphere effects |
| WavePlaneLayer.tsx | `components/game/field_layers/wave_plane_layer.rs` | ✅ Migrate | Wave plane effects |

### Other Components

| Component | Rust Implementation | Status | Notes |
|-----------|---------------------|--------|-------|
| MainLayout.tsx | `components/layout/main_layout.rs` | ✅ Migrate | Main layout wrapper |
| QualiaMainMenu.tsx | `components/menu.rs` | ✅ Migrate | Main menu screen |
| Subtitles.tsx | `components/subtitles.rs` | ✅ Migrate | Subtitle display |
| Atmosphere.tsx | `components/atmosphere.rs` | ✅ Migrate | Atmospheric effects |
| FrontendRenderer.tsx | `components/frontend_renderer.rs` | ✅ Migrate | Rendering coordinator |
| ServiceDiagnosticsPanel.tsx | `components/debug/service_diagnostics_panel.rs` | ✅ Migrate | Debug panel |

---

## 🔶 PROCEDURAL MACROS (Decorator Replacements)

### TypeScript Decorators → Rust Macros

| TypeScript Decorator | Rust Macro | Location | Status |
|---------------------|------------|----------|--------|
| `@logMethod()` | `#[instrument]` | `qualia_macros/src/instrument.rs` | 🔄 Replace | Use tracing crate's built-in macro |
| `@OnEvent(event)` | `#[handle_event(Event)]` | `qualia_macros/src/handle_event.rs` | ✅ Implement | Custom macro for event subscription |
| `@throttle(ms)` | `#[throttle(ms)]` | Built-in via `async-throttle` crate | 🔄 Replace | Use crate instead of custom macro |
| `@catchError()` | `#[catch_error]` | Use `thiserror` + `anyhow` | 🔄 Replace | Rust error handling patterns |
| `@measureTime()` | `#[instrument]` | tracing crate | 🔄 Replace | tracing automatically measures time |
| `@validate(schema)` | `#[validate]` | `qualia_macros/src/validate.rs` | ✅ Implement | Custom validation macro |
| `@validateEventProperty()` | `#[validate_event]` | `qualia_macros/src/validate.rs` | ✅ Implement | Event validation macro |
| `@AdaptAndEmit(adapter)` | `#[adapt_emit(adapter)]` | `qualia_macros/src/adapt_emit.rs` | ✅ Implement | Protocol adapter macro |
| `@BrowserOnly` | `#[cfg(target_arch = "wasm32")]` | Built-in Rust | 🔄 Replace | Use Rust's conditional compilation |
| `@cached(ttl)` | `#[cached]` | `cached` crate | 🔄 Replace | Use production-ready crate |

### Python Decorators → Rust Macros

| Python Decorator | Rust Macro | Location | Status |
|-----------------|------------|----------|--------|
| `@log_execution` | `#[instrument]` | tracing crate | 🔄 Replace | Built-in tracing |
| `@handle_errors` | Result<T, E> pattern | Native Rust | 🔄 Replace | Use Result type |
| `@validate_schema` | `#[validate]` | validator crate | 🔄 Replace | Use production crate |
| `@time_execution` | `#[instrument]` | tracing crate | 🔄 Replace | Built-in timing |
| `@cache_result` | `#[cached]` | cached crate | 🔄 Replace | Use production crate |
| `@circuit_breaker` | `#[circuit_breaker]` | `qualia_macros/src/circuit_breaker.rs` | ✅ Implement | Custom resilience macro |
| `@retry` | `#[retry]` | `qualia_macros/src/retry.rs` | ✅ Implement | Custom retry macro |
| `@timeout` | `#[timeout]` | `qualia_macros/src/timeout.rs` | ✅ Implement | Custom timeout macro |
| `@rate_limit` | `#[rate_limit]` | `qualia_macros/src/rate_limit.rs` | ✅ Implement | Custom rate limiting macro |
| `@mutex` | `#[mutex]` | `qualia_macros/src/mutex.rs` | ✅ Implement | Custom mutex macro |
| `@authorize` | `#[authorize]` | `qualia_macros/src/authorize.rs` | ✅ Implement | Authorization macro |
| `@transaction` | `#[transaction]` | `qualia_macros/src/transaction.rs` | ✅ Implement | Transaction macro |
| `@deprecated` | `#[deprecated]` | Built-in Rust | 🔄 Replace | Use Rust's built-in attribute |

---

## 📦 DEPENDENCY RESOLUTION

### Backend Dependencies (`backend/Cargo.toml`)

```toml
[dependencies]
# Async runtime & web framework
tokio = { version = "1.41", features = ["full"] }
axum = { version = "0.7", features = ["ws", "macros"] }
tower = { version = "0.5", features = ["full"] }
tower-http = { version = "0.5", features = ["trace", "cors", "compression-full"] }
hyper = { version = "1.0", features = ["full"] }

# WebSocket
tokio-tungstenite = { version = "0.21", features = ["native-tls"] }
futures-util = "0.3"

# Serialization
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
bincode = "1.3"
msgpack = "1.0"

# Dependency Injection
shaku = { version = "0.6", features = ["thread_safe"] }
async-trait = "0.1"

# Logging & Tracing
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter", "json", "fmt"] }
tracing-appender = "0.2"

# Configuration
config = { version = "0.14", features = ["yaml"] }
serde_yaml = "0.9"

# Error handling
anyhow = "1.0"
thiserror = "1.0"

# Validation
validator = { version = "0.18", features = ["derive"] }

# Database (optional)
sqlx = { version = "0.8", features = ["runtime-tokio", "postgres", "sqlite"], optional = true }

# Caching
moka = { version = "0.12", features = ["future"] }

# Utilities
uuid = { version = "1.0", features = ["v4", "serde"] }
chrono = { version = "0.4", features = ["serde"] }

# Parallel computation
rayon = "1.10"
num_cpus = "1.16"

# Schema generation
schemars = { version = "0.8", features = ["chrono"] }

# Testing
mockall = "0.13"
proptest = "1.4"

# Shared core
shared_core = { path = "../shared_core" }
qualia_macros = { path = "../qualia_macros" }

[features]
default = []
database = ["sqlx"]
```

### Frontend Dependencies (`frontend/Cargo.toml`)

```toml
[dependencies]
# UI Framework
leptos = { version = "0.6", features = ["csr", "nightly"] }
leptos_meta = { version = "0.6", features = ["csr"] }
leptos_router = { version = "0.6", features = ["csr"] }

# Rendering
wgpu = { version = "22.0", features = ["webgl"] }
winit = { version = "0.29", features = ["wayland", "x11"] }

# WebSocket (WASM)
tokio = { version = "1.41", features = ["sync"] }
tokio-tungstenite = { version = "0.21", default-features = false, features = ["connect"] }
futures-util = "0.3"

# Serialization
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
bincode = "1.3"

# WASM bindings
wasm-bindgen = "0.2"
wasm-bindgen-futures = "0.4"
web-sys = { version = "0.3", features = [
    "Window",
    "Document",
    "Element",
    "HtmlCanvasElement",
    "WebGl2RenderingContext",
    "AudioContext",
    "AudioNode",
    "AudioBuffer",
    "AudioBufferSourceNode",
    "AnalyserNode",
    "GainNode",
    "PannerNode",
    "BiquadFilterNode",
    "DynamicsCompressorNode",
    "WebSocket",
    "MessageEvent",
    "CloseEvent",
    "ErrorEvent",
    "Performance",
    "PerformanceTiming",
] }
js-sys = "0.3"

# Logging (WASM-compatible)
tracing = "0.1"
tracing-wasm = "0.2"
console_error_panic_hook = "0.1"
console_log = "1.0"

# Utilities
uuid = { version = "1.0", features = ["v4", "js"] }
chrono = { version = "0.4", features = ["wasmbind"] }
gloo-timers = { version = "0.3", features = ["futures"] }

# Math & Physics
glam = { version = "0.25", features = ["serde"] }

# Shared core
shared_core = { path = "../shared_core", features = ["wasm"] }
qualia_macros = { path = "../qualia_macros" }

[dev-dependencies]
wasm-bindgen-test = "0.3"

[profile.release]
opt-level = "z"
lto = true
codegen-units = 1
```

### Shared Core Dependencies (`shared_core/Cargo.toml`)

```toml
[dependencies]
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
schemars = { version = "0.8", features = ["chrono"] }
uuid = { version = "1.0", features = ["serde", "v4"] }
chrono = { version = "0.4", features = ["serde"] }
validator = { version = "0.18", features = ["derive"] }
glam = { version = "0.25", features = ["serde"] }

[features]
default = []
wasm = ["uuid/js", "chrono/wasmbind"]
```

### Macro Crate Dependencies (`qualia_macros/Cargo.toml`)

```toml
[lib]
proc-macro = true

[dependencies]
syn = { version = "2.0", features = ["full", "extra-traits"] }
quote = "1.0"
proc-macro2 = "1.0"
```

---

## 🎮 RENDERING PIPELINE (VISUALS.GOLD.CODE)

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

## 🎮 GAMEPLAY SYSTEMS (GDD.md Integration)

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

## 🚀 MIGRATION PHASES

### Phase 1: Foundation (Weeks 1-2)
- [ ] Setup Cargo workspace
- [ ] Implement shared_core contracts (100% from DATA.RUST.md)
- [ ] Backend: EventBus, Logger, Timer (core services)
- [ ] Frontend: EventBus, Logger, basic Leptos setup
- [ ] Implement all procedural macros

### Phase 2: Networking (Week 3)
- [ ] Backend: WebSocket server (Axum + tokio-tungstenite)
- [ ] Frontend: WebSocket client (WASM)
- [ ] GameStateStreaming bidirectional flow
- [ ] Binary serialization (bincode)

### Phase 3: Core Gameplay (Weeks 4-5)
- [ ] Backend: GameLogicService, QualiaProcessor, BossAI
- [ ] Frontend: QualiaCalculator (Web Worker), ComboDetector
- [ ] Input system (musical keys Q-E-R-T-F-G-C)
- [ ] Dash system with metronome sync

### Phase 4: Audio (Week 6)
- [ ] Frontend: Web Audio API bindings (wasm-bindgen)
- [ ] Audio8DService, FFTAnalyzer
- [ ] Backend: HarmonyAnalysisService
- [ ] Musical combo detection

### Phase 5: Rendering (Weeks 7-9)
- [ ] Frontend: wgpu setup, KairosVisualEngine
- [ ] Phase 1: Bloom + God Rays
- [ ] Phase 2: FFT → Shaders
- [ ] Phase 3: Reaction-diffusion floor
- [ ] Phase 4: SDF avatars
- [ ] All UI components (50 components total)

### Phase 6: Polish (Weeks 10-12)
- [ ] Backend: Persistence, Metrics, HealthCheck
- [ ] Frontend: All HUD components (10 components)
- [ ] Performance optimization (PGO)
- [ ] End-to-end testing

---

*"From 74 services to a unified Rust architecture. Zero compromise. Maximum performance."*

**END OF BLUEPRINT v2.0**