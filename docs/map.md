# 📂 Qualia Tempo Prototype Directory Structure
# Generated on: dom 12 oct 2025 14:51:38 CEST
# Target: qualia-tempo-prototype/

---

## 📊 Directory Tree

📁 **qualia-tempo-prototype/**
├── 📁 **backend/**
│   ├── 📁 **api/**
│   │   ├── 📄 __init__.py
│   │   ├── 📄 models.py
│   │   ├── 📄 README.md
│   │   └── 📄 routes.py
│   ├── 📄 CompositionRoot.py
│   ├── 📁 **config/**
│   │   ├── 📄 application-initializer.yaml
│   │   ├── 📄 boss-ai.yaml
│   │   ├── 📄 configuration-service.yaml
│   │   ├── 📄 error-reporting.yaml
│   │   ├── 📄 event-bus.yaml
│   │   ├── 📄 file-system.yaml
│   │   ├── 📄 game-logic.yaml
│   │   ├── 📄 game-state-streaming.yaml
│   │   ├── 📄 harmony-analysis.yaml
│   │   ├── 📄 health-check.yaml
│   │   ├── 📄 logger.yaml
│   │   ├── 📄 metrics.yaml
│   │   ├── 📄 pattern-system.yaml
│   │   ├── 📄 performance.yaml
│   │   ├── 📄 persistence.yaml
│   │   ├── 📄 process-pool.yaml
│   │   ├── 📄 qualia-processor.yaml
│   │   ├── 📄 security.yaml
│   │   ├── 📄 server.yaml
│   │   ├── 📄 shader-introspection.yaml
│   │   ├── 📄 state-streaming.yaml
│   │   ├── 📄 system-environment.yaml
│   │   └── 📄 timer.yaml
│   ├── 📄 .coverage
│   ├── 📁 **engine/**
│   │   ├── 📄 __init__.py
│   │   ├── 📄 ParticleStateCalculator.py
│   │   ├── 📄 qualia_particle_engine.py
│   │   └── 📄 README.md
│   ├── 📁 **handlers/**
│   │   ├── 📄 engine_handlers.py
│   │   ├── 📄 __init__.py
│   ├── 📄 __init__.py
│   ├── 📄 main.py
│   ├── 📄 pytest.ini
│   ├── 📄 README.md
│   ├── 📄 requirements.txt
│   ├── 📁 **services/**
│   │   ├── 📄 ApplicationInitializerService.py
│   │   ├── 📄 BossAIService.py
│   │   ├── 📄 ConfigurationService.py
│   │   ├── 📄 container_config.py
│   │   ├── 📄 container.py
│   │   ├── 📁 **contracts/**
│   │   │   ├── 📄 events.py
│   │   │   ├── 📄 IApplicationInitializerService_contracts.py
│   │   │   ├── 📄 IBossAIService_contracts.py
│   │   │   ├── 📄 IConfigurationService_contracts.py
│   │   │   ├── 📄 IErrorReportingService_contracts.py
│   │   │   ├── 📄 IEventBus_contracts.py
│   │   │   ├── 📄 IFileSystemService_contracts.py
│   │   │   ├── 📄 IGameLogicService_contracts.py
│   │   │   ├── 📄 IGameStateStreamingService_contracts.py
│   │   │   ├── 📄 IHarmonyAnalysisService_contracts.py
│   │   │   ├── 📄 IHealthCheckService_contracts.py
│   │   │   ├── 📄 ILogger_contracts.py
│   │   │   ├── 📄 IMetricsService_contracts.py
│   │   │   ├── 📄 __init__.py
│   │   │   ├── 📄 IParticleEnginePoolManager_contracts.py
│   │   │   ├── 📄 IPatternSystemService_contracts.py
│   │   │   ├── 📄 IPerformanceService_contracts.py
│   │   │   ├── 📄 IPersistenceService_contracts.py
│   │   │   ├── 📄 IQualiaProcessor_contracts.py
│   │   │   ├── 📄 ISecurityService_contracts.py
│   │   │   ├── 📄 IShaderIntrospectionService_contracts.py
│   │   │   ├── 📄 IStateStreamingService_contracts.py
│   │   │   ├── 📄 ISystemEnvironmentService_contracts.py
│   │   │   ├── 📄 ITimerService_contracts.py
│   │   ├── 📄 ErrorReportingService.py
│   │   ├── 📄 EventBus.py
│   │   ├── 📄 exceptions.py
│   │   ├── 📄 FileSystemService.py
│   │   ├── 📄 GameLogicService.py
│   │   ├── 📄 GameStateStreamingService.py
│   │   ├── 📄 HarmonyAnalysisService.py
│   │   ├── 📄 HealthCheckService.py
│   │   ├── 📄 __init__.py
│   │   ├── 📁 **interfaces/**
│   │   │   ├── 📄 IApplicationInitializerService.py
│   │   │   ├── 📄 IBaseService.py
│   │   │   ├── 📄 IBossAIService.py
│   │   │   ├── 📄 IConfigurationService.py
│   │   │   ├── 📄 IErrorReportingService.py
│   │   │   ├── 📄 IEventBus.py
│   │   │   ├── 📄 IFileSystemService.py
│   │   │   ├── 📄 IGameLogicService.py
│   │   │   ├── 📄 IGameStateStreamingService.py
│   │   │   ├── 📄 IHarmonyAnalysisService.py
│   │   │   ├── 📄 IHealthCheckService.py
│   │   │   ├── 📄 ILogger.py
│   │   │   ├── 📄 IMetricsService.py
│   │   │   ├── 📄 IParticleEnginePoolManager.py
│   │   │   ├── 📄 IPatternSystemService.py
│   │   │   ├── 📄 IPerformanceService.py
│   │   │   ├── 📄 IPersistenceService.py
│   │   │   ├── 📄 IQualiaProcessor.py
│   │   │   ├── 📄 IRenderingService.py
│   │   │   ├── 📄 ISecurityService.py
│   │   │   ├── 📄 IShaderIntrospectionService.py
│   │   │   ├── 📄 IStateStreamingService.py
│   │   │   ├── 📄 ISystemEnvironmentService.py
│   │   │   ├── 📄 ITimerService.py
│   │   ├── 📄 MetricsService.py
│   │   ├── 📄 ParticleEnginePoolManager.py
│   │   ├── 📄 PatternSystemService.py
│   │   ├── 📄 PerformanceService.py
│   │   ├── 📄 PersistenceService.py
│   │   ├── 📄 QualiaLogger.py
│   │   ├── 📄 QualiaProcessor.py
│   │   ├── 📄 SecurityService.py
│   │   ├── 📄 ShaderIntrospectionService.py
│   │   ├── 📄 StateStreamingService.py
│   │   ├── 📄 SystemEnvironmentService.py
│   │   └── 📄 TimerService.py
│   ├── 📁 **tests/**
│   │   ├── 📄 __init__.py
│   │   ├── 📁 **mocks/**
│   │   │   ├── 📄 application_initializer_mock.py
│   │   │   ├── 📄 boss_ai_service_mock.py
│   │   │   ├── 📄 configuration_service_mock.py
│   │   │   ├── 📄 event_bus_mock.py
│   │   │   ├── 📄 file_system_mock.py
│   │   │   ├── 📄 game_logic_service_mock.py
│   │   │   ├── 📄 harmony_analysis_mock.py
│   │   │   ├── 📄 __init__.py
│   │   │   ├── 📄 logger_mock.py
│   │   │   ├── 📄 MockErrorReportingService.py
│   │   │   ├── 📄 MockHealthCheckService.py
│   │   │   ├── 📄 MockMetricsService.py
│   │   │   ├── 📄 MockPerformanceService.py
│   │   │   ├── 📄 MockTimerService.py
│   │   │   ├── 📄 particle_pool_manager_mock.py
│   │   │   ├── 📄 pattern_system_mock.py
│   │   │   ├── 📄 qualia_processor_mock.py
│   │   │   ├── 📄 security_service_mock.py
│   │   │   ├── 📄 shader_introspection_mock.py
│   │   │   ├── 📄 state_streaming_mock.py
│   │   │   └── 📄 system_environment_mock.py
│   │   ├── 📁 **services/**
│   │   │   └── 📄 test_configuration_service.py
│   │   ├── 📄 test_application_initializer_integration.py
│   │   ├── 📄 test_authorize.py
│   │   ├── 📄 test_boss_ai_integration.py
│   │   ├── 📄 test_boss_ai_service.py
│   │   ├── 📄 test_circuit_breaker.py
│   │   ├── 📄 test_composition_root.py
│   │   ├── 📄 test_decorators.py
│   │   ├── 📄 test_deprecated.py
│   │   ├── 📄 test_eventbus.py
│   │   ├── 📄 test_game_logic_service.py
│   │   ├── 📄 test_harmony_analysis_service.py
│   │   ├── 📄 test_main_complete.py
│   │   ├── 📄 test_main.py
│   │   ├── 📄 test_models.py
│   │   ├── 📄 test_mutex.py
│   │   ├── 📄 test_particle_engine_pool_manager.py
│   │   ├── 📄 test_particle_state_calculator.py
│   │   ├── 📄 test_particle_system.py
│   │   ├── 📄 test_persistence_service.py
│   │   ├── 📄 test_phase1_4_integration.py
│   │   ├── 📄 test_qualia_particle_engine_binary_protocol.py
│   │   ├── 📄 test_qualia_particle_engine_v2.py
│   │   ├── 📄 test_qualia_processor.py
│   │   ├── 📄 test_rate_limit.py
│   │   ├── 📄 test_retry.py
│   │   ├── 📄 test_routes_extended.py
│   │   ├── 📄 test_routes.py
│   │   ├── 📄 test_security_service.py
│   │   ├── 📄 test_shader_introspection_service.py
│   │   ├── 📄 test_timeout.py
│   │   └── 📄 test_transaction.py
│   ├── 📁 **utils/**
│   │   ├── 📁 **decorators/**
│   │   │   ├── 📄 authorize.py
│   │   │   ├── 📄 cache.py
│   │   │   ├── 📄 catch_error.py
│   │   │   ├── 📄 circuit_breaker.py
│   │   │   ├── 📄 deprecated.py
│   │   │   ├── 📄 __init__.py
│   │   │   ├── 📄 log_method.py
│   │   │   ├── 📄 mutex.py
│   │   │   ├── 📄 on_event.py
│   │   │   ├── 📄 rate_limit.py
│   │   │   ├── 📄 retry.py
│   │   │   ├── 📄 time_measure.py
│   │   │   ├── 📄 timeout.py
│   │   │   ├── 📄 transaction.py
│   │   │   └── 📄 validate.py
│   │   ├── 📄 decorators.py
│   │   ├── 📄 __init__.py
│   └── 📁 **workers/**
│       ├── 📄 __init__.py
│       ├── 📄 ParticleEngineWorker.py
├── 📁 **combat_data/**
│   └── 📄 the_first_duel.json
├── 📁 **frontend/**
│   ├── 📄 e2e-test.js
│   ├── 📄 .eslintrc.cjs
│   ├── 📄 index.html
│   ├── 📄 jest.config.js
│   ├── 📄 package.json
│   ├── 📄 package-lock.json
│   ├── 📄 playwright.config.ts
│   ├── 📄 pnpm-lock.yaml
│   ├── 📄 pnpm-workspace.yaml
│   ├── 📄 postcss.config.js
│   ├── 📁 **preload/**
│   │   ├── 📄 index.js
│   │   └── 📄 index.ts
│   ├── 📁 **public/**
│   │   ├── 📄 ASSETS_TODO.md
│   │   ├── 📁 **config/**
│   │   │   ├── 📄 application-initializer.yaml
│   │   │   ├── 📄 audio-8d.yaml
│   │   │   ├── 📄 audio-analysis-service.yaml
│   │   │   ├── 📄 audio-service.yaml
│   │   │   ├── 📄 audio-session.yaml
│   │   │   ├── 📄 avatar-rendering.yaml
│   │   │   ├── 📄 backend-sync.yaml
│   │   │   ├── 📄 bloom-pass.yaml
│   │   │   ├── 📄 blur-pass.yaml
│   │   │   ├── 📄 bright-pass.yaml
│   │   │   ├── 📄 composition-root.yaml
│   │   │   ├── 📄 debug-orchestrator.yaml
│   │   │   ├── 📄 debug-service.yaml
│   │   │   ├── 📄 dof-pass.yaml
│   │   │   ├── 📄 error-reporting.yaml
│   │   │   ├── 📄 eventbus.yaml
│   │   │   ├── 📄 frontend-rendering.yaml
│   │   │   ├── 📄 game-config.yaml
│   │   │   ├── 📄 game-controller.yaml
│   │   │   ├── 📄 game-input-controller.yaml
│   │   │   ├── 📄 gameplay-mechanics.yaml
│   │   │   ├── 📄 gameplay.yaml
│   │   │   ├── 📄 game-state-store.yaml
│   │   │   ├── 📄 game-state-streaming.yaml
│   │   │   ├── 📄 http-service.yaml
│   │   │   ├── 📄 jitter-service.yaml
│   │   │   ├── 📄 kairos-visual.yaml
│   │   │   ├── 📄 logger.yaml
│   │   │   ├── 📄 main-menu.yaml
│   │   │   ├── 📄 motion-blur-pass.yaml
│   │   │   ├── 📄 musical-combo-detector.yaml
│   │   │   ├── 📄 notification-service.yaml
│   │   │   ├── 📄 particle-system.yaml
│   │   │   ├── 📄 physics-service.yaml
│   │   │   ├── 📄 post-processing.yaml
│   │   │   ├── 📄 protocol-adapter.yaml
│   │   │   ├── 📄 qualia-calculator-worker.yaml
│   │   │   ├── 📄 qualia-calculator.yaml
│   │   │   ├── 📄 reaction-diffusion.yaml
│   │   │   ├── 📄 rhythmic-movement.yaml
│   │   │   ├── 📄 subtitle.yaml
│   │   │   ├── 📄 taa-pass.yaml
│   │   │   ├── 📄 timer-service.yaml
│   │   │   ├── 📄 view-logic.yaml
│   │   │   └── 📄 visual-effects.yaml
│   │   ├── 📁 **fonts/**
│   │   │   ├── 📁 **inter/**
│   │   │   │   ├── 📄 inter-v12-latin-500.ttf
│   │   │   │   ├── 📄 inter-v12-latin-500.woff
│   │   │   │   ├── 📄 inter-v12-latin-500.woff2
│   │   │   │   ├── 📄 inter-v12-latin-600.ttf
│   │   │   │   ├── 📄 inter-v12-latin-600.woff
│   │   │   │   ├── 📄 inter-v12-latin-600.woff2
│   │   │   │   ├── 📄 inter-v12-latin-700.ttf
│   │   │   │   ├── 📄 inter-v12-latin-700.woff
│   │   │   │   ├── 📄 inter-v12-latin-700.woff2
│   │   │   │   ├── 📄 inter-v12-latin-regular.ttf
│   │   │   │   ├── 📄 inter-v12-latin-regular.woff
│   │   │   │   └── 📄 inter-v12-latin-regular.woff2
│   │   │   └── 📁 **orbitron/**
│   │   │       ├── 📄 orbitron-v25-latin-700.ttf
│   │   │       ├── 📄 orbitron-v25-latin-700.woff
│   │   │       ├── 📄 orbitron-v25-latin-700.woff2
│   │   │       ├── 📄 orbitron-v25-latin-900.ttf
│   │   │       ├── 📄 orbitron-v25-latin-900.woff
│   │   │       ├── 📄 orbitron-v25-latin-900.woff2
│   │   │       ├── 📄 orbitron-v25-latin-regular.ttf
│   │   │       ├── 📄 orbitron-v25-latin-regular.woff
│   │   │       └── 📄 orbitron-v25-latin-regular.woff2
│   │   ├── 📄 index.html
│   │   ├── 📄 manifest.json
│   │   ├── 📄 METADATA_VALIDATION.md
│   │   ├── 📄 robots.txt
│   │   ├── 📁 **shaders/**
│   │   │   ├── 📄 bloom_composite.glsl
│   │   │   ├── 📄 bloom_downsample.glsl
│   │   │   ├── 📄 bloom_upsample.glsl
│   │   │   ├── 📄 blur.glsl
│   │   │   ├── 📄 bright_pass.glsl
│   │   │   ├── 📄 chromatic_aberration.glsl
│   │   │   ├── 📄 color_grading_lut.glsl
│   │   │   ├── 📄 composite_pass.glsl
│   │   │   ├── 📄 dof.glsl
│   │   │   ├── 📄 fullscreen_quad.vert
│   │   │   ├── 📄 gbuffer.glsl
│   │   │   ├── 📄 gbuffer_particles.glsl
│   │   │   ├── 📄 god_rays.glsl
│   │   │   ├── 📄 hbao.glsl
│   │   │   ├── 📄 mandelbulb_fractal.glsl
│   │   │   ├── 📄 motion_blur.glsl
│   │   │   ├── 📄 qualia_particles.glsl
│   │   │   ├── 📄 reaction_diffusion_compute.glsl
│   │   │   ├── 📄 reaction_diffusion_display.glsl
│   │   │   ├── 📄 sdf_raymarching_boss.glsl
│   │   │   ├── 📄 sdf_raymarching_player.glsl
│   │   │   ├── 📄 sharpening.glsl
│   │   │   ├── 📄 ssr_v2.glsl
│   │   │   ├── 📄 taa.glsl
│   │   │   └── 📄 velocity.glsl
│   │   └── 📄 sitemap.xml
│   ├── 📄 README.md
│   ├── 📁 **src/**
│   │   ├── 📄 App.tsx
│   │   ├── 📁 **assets/**
│   │   │   └── 📁 **audio/**
│   │   │       └── 📄 ecosdeamor.mp3
│   │   ├── 📁 **audio/**
│   │   │   ├── 📁 **interfaces/**
│   │   │   │   └── 📄 IToneFactoryService.ts
│   │   │   ├── 📄 IOntologicalAudioEngine.ts
│   │   │   ├── 📄 OntologicalAudioEngine.ts
│   │   │   └── 📄 ToneFactoryService.ts
│   │   ├── 📁 **components/**
│   │   │   ├── 📄 Atmosphere.tsx
│   │   │   ├── 📁 **debug/**
│   │   │   │   ├── 📁 **diagnostics/**
│   │   │   │   │   ├── 📄 ArchitectureValidation.tsx
│   │   │   │   │   ├── 📄 DiagnosticHeader.tsx
│   │   │   │   │   └── 📄 DiagnosticServiceCard.tsx
│   │   │   │   └── 📄 ServiceDiagnosticsPanel.tsx
│   │   │   ├── 📄 FrontendRenderer.tsx
│   │   │   ├── 📁 **game/**
│   │   │   │   ├── 📄 BossAvatar.tsx
│   │   │   │   ├── 📄 BossRenderer.tsx
│   │   │   │   ├── 📁 **field-layers/**
│   │   │   │   │   ├── 📄 AmbientSpheresLayer.tsx
│   │   │   │   │   ├── 📄 FieldParticlesLayer.tsx
│   │   │   │   │   └── 📄 WavePlaneLayer.tsx
│   │   │   │   ├── 📄 GridRenderer.tsx
│   │   │   │   ├── 📁 **hooks/**
│   │   │   │   │   ├── 📄 useQualiaOrbManagement.ts
│   │   │   │   │   └── 📄 useScoreChangeAnimation.ts
│   │   │   │   ├── 📁 **hud/**
│   │   │   │   │   ├── 📄 BPMSynchronizer.tsx
│   │   │   │   │   ├── 📄 ChaosIndicator.tsx
│   │   │   │   │   ├── 📄 ComboStreak.tsx
│   │   │   │   │   ├── 📄 HealthVisualization.tsx
│   │   │   │   │   ├── 📄 NeuralActivityBars.tsx
│   │   │   │   │   ├── 📄 NeuralCanvas.tsx
│   │   │   │   │   ├── 📄 PrecisionFlowIndicators.tsx
│   │   │   │   │   ├── 📄 QualiaAmbience.tsx
│   │   │   │   │   ├── 📄 QualiaOrb.tsx
│   │   │   │   │   └── 📄 ScoreDisplay.tsx
│   │   │   │   ├── 📄 index.ts
│   │   │   │   ├── 📄 MusicalNotesRenderer.tsx
│   │   │   │   ├── 📄 PlayerAvatar.tsx
│   │   │   │   ├── 📄 PlayerRenderer.tsx
│   │   │   │   ├── 📄 QualiaFieldRenderer.tsx
│   │   │   │   ├── 📄 QualiaTempoGame.tsx
│   │   │   │   └── 📄 QualiaTempoHUD.tsx
│   │   │   ├── 📁 **layout/**
│   │   │   │   └── 📄 MainLayout.tsx
│   │   │   ├── 📄 QualiaMainMenu.tsx
│   │   │   └── 📄 Subtitles.tsx
│   │   ├── 📁 **hooks/**
│   │   │   ├── 📄 index.ts
│   │   │   ├── 📄 README.md
│   │   │   ├── 📄 useCombatNotes.ts
│   │   │   └── 📄 useServiceHealth.ts
│   │   ├── 📄 index.css
│   │   ├── 📄 index.tsx
│   │   ├── 📄 main.ts
│   │   ├── 📄 providers.ts
│   │   ├── 📁 **schemas/**
│   │   │   └── 📄 index.ts
│   │   ├── 📁 **services/**
│   │   │   ├── 📄 ApplicationCompositionRoot.ts
│   │   │   ├── 📄 ApplicationInitializerService.ts
│   │   │   ├── 📄 Audio8DService.ts
│   │   │   ├── 📄 AudioAnalysisService.ts
│   │   │   ├── 📄 AudioService.ts
│   │   │   ├── 📄 AudioSystemBridge.ts
│   │   │   ├── 📄 BackendSyncService.ts
│   │   │   ├── 📄 BrowserAudioContextFactory.ts
│   │   │   ├── 📄 BrowserEventsService.ts
│   │   │   ├── 📄 BrowserWebSocketFactory.ts
│   │   │   ├── 📄 ColorService.ts
│   │   │   ├── 📄 CompositionRoot.provider.ts
│   │   │   ├── 📄 ConfigurationService.ts
│   │   │   ├── 📁 **config-validators/**
│   │   │   │   ├── 📄 index.ts
│   │   │   │   ├── 📄 validateAudioService.validator.ts
│   │   │   │   ├── 📄 validateBackendSync.validator.ts
│   │   │   │   ├── 📄 validateCompositionRoot.validator.ts
│   │   │   │   ├── 📄 validateDebugService.validator.ts
│   │   │   │   ├── 📄 validateErrorReporting.validator.ts
│   │   │   │   ├── 📄 validateEventBus.validator.ts
│   │   │   │   ├── 📄 validateGameController.validator.ts
│   │   │   │   ├── 📄 validateGameStateStreaming.validator.ts
│   │   │   │   ├── 📄 validateNotificationService.validator.ts
│   │   │   │   ├── 📄 validateQualiaCalculator.validator.ts
│   │   │   │   └── 📄 validateRhythmicMovement.validator.ts
│   │   │   ├── 📁 **contracts/**
│   │   │   │   ├── 📄 constants.ts
│   │   │   │   ├── 📄 events.contracts.ts
│   │   │   │   ├── 📄 IApplicationCompositionRoot.contracts.ts
│   │   │   │   ├── 📄 IApplicationInitializerService.contracts.ts
│   │   │   │   ├── 📄 IAudio8DService.contracts.ts
│   │   │   │   ├── 📄 IAudioAnalysisService.contracts.ts
│   │   │   │   ├── 📄 IAudioService.contracts.ts
│   │   │   │   ├── 📄 IAudioSystemBridge.contracts.ts
│   │   │   │   ├── 📄 IAvatarRendering.contracts.ts
│   │   │   │   ├── 📄 IBackendSyncService.contracts.ts
│   │   │   │   ├── 📄 IBloomDownsamplePass.contracts.ts
│   │   │   │   ├── 📄 IBloomPass.contracts.ts
│   │   │   │   ├── 📄 IBloomUpsamplePass.contracts.ts
│   │   │   │   ├── 📄 IBlurPass.contracts.ts
│   │   │   │   ├── 📄 IBrightPass.contracts.ts
│   │   │   │   ├── 📄 IChromaticAberrationPass.contracts.ts
│   │   │   │   ├── 📄 ICoordinateSystemService.contracts.ts
│   │   │   │   ├── 📄 IDebugOrchestratorService.contracts.ts
│   │   │   │   ├── 📄 IDebugService.contracts.ts
│   │   │   │   ├── 📄 IDoFPass.contracts.ts
│   │   │   │   ├── 📄 IErrorReportingService.contracts.ts
│   │   │   │   ├── 📄 IEventBus.contracts.ts
│   │   │   │   ├── 📄 IFrontendRenderingService.contracts.ts
│   │   │   │   ├── 📄 IGameControllerService.contracts.ts
│   │   │   │   ├── 📄 IGameInputControllerService.contracts.ts
│   │   │   │   ├── 📄 IGameplayMechanicsService.contracts.ts
│   │   │   │   ├── 📄 IGameStateStoreService.contracts.ts
│   │   │   │   ├── 📄 IGameStateStreamingService.contracts.ts
│   │   │   │   ├── 📄 IGBufferPass.contracts.ts
│   │   │   │   ├── 📄 IHttpService.contracts.ts
│   │   │   │   ├── 📄 IJitterService.contracts.ts
│   │   │   │   ├── 📄 IKairosVisualEngine.contracts.ts
│   │   │   │   ├── 📄 ILogger.contracts.ts
│   │   │   │   ├── 📄 ILUTPass.contracts.ts
│   │   │   │   ├── 📄 IMotionBlurPass.contracts.ts
│   │   │   │   ├── 📄 IMusicalComboDetectorService.contracts.ts
│   │   │   │   ├── 📄 INotificationService.contracts.ts
│   │   │   │   ├── 📄 IParticleSystemService.contracts.ts
│   │   │   │   ├── 📄 IPhysicsService.contracts.ts
│   │   │   │   ├── 📄 IPostProcessingService.contracts.ts
│   │   │   │   ├── 📄 IProtocolAdapter.contracts.ts
│   │   │   │   ├── 📄 IQualiaCalculatorWorkerService.contracts.ts
│   │   │   │   ├── 📄 IQualiaStateCalculatorService.contracts.ts
│   │   │   │   ├── 📄 IReactionDiffusionService.contracts.ts
│   │   │   │   ├── 📄 IRenderTargetPoolService.contracts.ts
│   │   │   │   ├── 📄 IRhythmicMovementController.contracts.ts
│   │   │   │   ├── 📄 ISharpeningPass.contracts.ts
│   │   │   │   ├── 📄 IStateStreamingService.contracts.ts
│   │   │   │   ├── 📄 ISubtitleService.contracts.ts
│   │   │   │   ├── 📄 ITAAPass.contracts.ts
│   │   │   │   ├── 📄 ITimerService.contracts.ts
│   │   │   │   ├── 📄 IVelocityPass.contracts.ts
│   │   │   │   ├── 📄 IViewLogicService.contracts.ts
│   │   │   │   └── 📄 IWebSocketService.contracts.ts
│   │   │   ├── 📄 CoordinateSystemService.ts
│   │   │   ├── 📄 DebugOrchestratorService.ts
│   │   │   ├── 📄 DebugService.ts
│   │   │   ├── 📄 ErrorReportingService.ts
│   │   │   ├── 📄 EventBus.ts
│   │   │   ├── 📄 FrontendRenderingService.ts
│   │   │   ├── 📄 GameControllerService.ts
│   │   │   ├── 📄 GameInputControllerService.ts
│   │   │   ├── 📄 GameplayMechanicsService.ts
│   │   │   ├── 📄 GameStateStoreService.ts
│   │   │   ├── 📄 GameStateStore.ts
│   │   │   ├── 📄 GameStateStreamingService.ts
│   │   │   ├── 📄 hooks.ts
│   │   │   ├── 📄 HttpService.ts
│   │   │   ├── 📄 index.ts
│   │   │   ├── 📄 InputStateService.ts
│   │   │   ├── 📁 **interfaces/**
│   │   │   │   ├── 📄 IApplicationInitializerService.ts
│   │   │   │   ├── 📄 IAudio8DService.ts
│   │   │   │   ├── 📄 IAudioAnalysisService.ts
│   │   │   │   ├── 📄 IAudioContextFactory.ts
│   │   │   │   ├── 📄 IAudioService.ts
│   │   │   │   ├── 📄 IAudioSystemBridge.ts
│   │   │   │   ├── 📄 IBackendSyncService.ts
│   │   │   │   ├── 📄 IBaseService.ts
│   │   │   │   ├── 📄 IBrowserEventsService.ts
│   │   │   │   ├── 📄 IColorService.ts
│   │   │   │   ├── 📄 IConfigurationService.ts
│   │   │   │   ├── 📄 ICoordinateSystemService.ts
│   │   │   │   ├── 📄 IDebugOrchestratorService.ts
│   │   │   │   ├── 📄 IDebugService.ts
│   │   │   │   ├── 📄 IErrorReportingService.ts
│   │   │   │   ├── 📄 IEventBus.ts
│   │   │   │   ├── 📄 IFFTAnalyzerService.ts
│   │   │   │   ├── 📄 IFrontendRenderingService.ts
│   │   │   │   ├── 📄 IGameControllerService.ts
│   │   │   │   ├── 📄 IGameInputControllerService.ts
│   │   │   │   ├── 📄 IGameplayMechanicsService.ts
│   │   │   │   ├── 📄 IGameStateStoreService.ts
│   │   │   │   ├── 📄 IGameStateStore.ts
│   │   │   │   ├── 📄 IGameStateStreamingService.ts
│   │   │   │   ├── 📄 IGlslParser.ts
│   │   │   │   ├── 📄 IHttpService.ts
│   │   │   │   ├── 📄 IInputStateService.ts
│   │   │   │   ├── 📄 IJitterService.ts
│   │   │   │   ├── 📄 IKairosVisualEngine.ts
│   │   │   │   ├── 📄 ILogger.ts
│   │   │   │   ├── 📄 IMusicalComboDetectorService.ts
│   │   │   │   ├── 📄 INotificationService.ts
│   │   │   │   ├── 📄 IParticleSystemService.ts
│   │   │   │   ├── 📄 IPerformanceProvider.ts
│   │   │   │   ├── 📄 IPerformanceService.ts
│   │   │   │   ├── 📄 IPhysicsService.ts
│   │   │   │   ├── 📄 IPostProcessingService.ts
│   │   │   │   ├── 📄 IQualiaCalculatorWorkerService.ts
│   │   │   │   ├── 📄 IQualiaStateCalculatorService.ts
│   │   │   │   ├── 📄 IReactionDiffusionService.ts
│   │   │   │   ├── 📄 IRenderTargetPoolService.ts
│   │   │   │   ├── 📄 IRhythmicMovementController.ts
│   │   │   │   ├── 📄 IShaderIntrospectionService.ts
│   │   │   │   ├── 📄 IShaderLoaderService.ts
│   │   │   │   ├── 📄 IStateMergerService.ts
│   │   │   │   ├── 📄 IStateStreamingService.ts
│   │   │   │   ├── 📄 IStreamingVideoService.ts
│   │   │   │   ├── 📄 ISubtitleService.ts
│   │   │   │   ├── 📄 ITimerProvider.ts
│   │   │   │   ├── 📄 ITimerService.ts
│   │   │   │   ├── 📄 IViewLogicService.ts
│   │   │   │   ├── 📄 IWebAudioAPIService.ts
│   │   │   │   ├── 📄 IWebSocketFactory.ts
│   │   │   │   └── 📄 IWebSocketService.ts
│   │   │   ├── 📄 inversify.config.ts
│   │   │   ├── 📄 inversify.container.ts
│   │   │   ├── 📄 inversify.types.ts
│   │   │   ├── 📄 JitterService.ts
│   │   │   ├── 📄 JsGlslParserService.ts
│   │   │   ├── 📄 KairosVisualEngine.ts
│   │   │   ├── 📄 Logger.ts
│   │   │   ├── 📄 MusicalComboDetectorService.ts
│   │   │   ├── 📄 NotificationService.ts
│   │   │   ├── 📄 ParticleSystemService.ts
│   │   │   ├── 📄 PerformanceService.ts
│   │   │   ├── 📄 PhysicsService.ts
│   │   │   ├── 📁 **postprocessing/**
│   │   │   │   ├── 📄 BloomDownsamplePass.ts
│   │   │   │   ├── 📄 BloomPass.ts
│   │   │   │   ├── 📄 BloomUpsamplePass.ts
│   │   │   │   ├── 📄 BlurPass.ts
│   │   │   │   ├── 📄 BrightPass.ts
│   │   │   │   ├── 📄 ChromaticAberrationPass.ts
│   │   │   │   ├── 📄 DoFPass.ts
│   │   │   │   ├── 📄 GBufferPass.ts
│   │   │   │   ├── 📄 HBAOPass.ts
│   │   │   │   ├── 📁 **interfaces/**
│   │   │   │   │   ├── 📄 IBloomPass.ts
│   │   │   │   │   ├── 📄 IBlurPass.ts
│   │   │   │   │   ├── 📄 IBrightPass.ts
│   │   │   │   │   ├── 📄 IDoFPass.ts
│   │   │   │   │   ├── 📄 IMotionBlurPass.ts
│   │   │   │   │   ├── 📄 ITAAPass.ts
│   │   │   │   │   └── 📄 IVelocityPass.ts
│   │   │   │   ├── 📄 LUTPass.ts
│   │   │   │   ├── 📄 MotionBlurPass.ts
│   │   │   │   ├── 📄 SharpeningPass.ts
│   │   │   │   ├── 📄 SSRPass.ts
│   │   │   │   ├── 📄 TAAPass.ts
│   │   │   │   ├── 📁 **__tests__/**
│   │   │   │   │   ├── 📄 BloomDownsamplePass.test.ts
│   │   │   │   │   ├── 📄 BloomPass.test.ts
│   │   │   │   │   ├── 📄 BloomUpsamplePass.test.ts
│   │   │   │   │   ├── 📄 BlurPass.test.ts
│   │   │   │   │   ├── 📄 BrightPass.test.ts
│   │   │   │   │   ├── 📄 ChromaticAberrationPass.test.ts
│   │   │   │   │   ├── 📄 DoFPass.test.ts
│   │   │   │   │   ├── 📄 LUTPass.test.ts
│   │   │   │   │   ├── 📄 MotionBlurPass.test.ts
│   │   │   │   │   ├── 📄 SharpeningPass.test.ts
│   │   │   │   │   ├── 📄 TAAPass.test.ts
│   │   │   │   │   └── 📄 VelocityPass.test.ts
│   │   │   │   └── 📄 VelocityPass.ts
│   │   │   ├── 📄 PostProcessingService.ts
│   │   │   ├── 📁 **protocol/**
│   │   │   │   ├── 📁 **adapters/**
│   │   │   │   │   ├── 📄 CombatNoteAdapter.ts
│   │   │   │   │   ├── 📄 KeyToDirectionAdapter.ts
│   │   │   │   │   ├── 📄 RawToParticleEventAdapter.ts
│   │   │   │   │   └── 📁 **__tests__/**
│   │   │   │   │       └── 📄 RawToParticleEventAdapter.test.ts
│   │   │   │   ├── 📄 IEventTransformer.ts
│   │   │   │   └── 📄 IMessageAdapter.ts
│   │   │   ├── 📁 **providers/**
│   │   │   │   ├── 📄 BrowserTimerProvider.ts
│   │   │   │   └── 📄 PerformanceProvider.ts
│   │   │   ├── 📄 QualiaCalculatorWorkerService.ts
│   │   │   ├── 📄 QualiaStateCalculatorService.ts
│   │   │   ├── 📄 ReactionDiffusionService.ts
│   │   │   ├── 📄 README.md
│   │   │   ├── 📄 RenderTargetPoolService.ts
│   │   │   ├── 📄 RhythmicMovementController.ts
│   │   │   ├── 📄 ServiceContext.tsx
│   │   │   ├── 📄 SERVICE_STATUS_EVENT_GUIDE.md
│   │   │   ├── 📄 ShaderIntrospectionService.ts
│   │   │   ├── 📄 ShaderLoaderService.ts
│   │   │   ├── 📄 StateMergerService.ts
│   │   │   ├── 📄 StateStreamingService.ts
│   │   │   ├── 📄 SubtitleService.ts
│   │   │   ├── 📁 **__tests__/**
│   │   │   │   ├── 📄 ApplicationInitializerService.test.ts
│   │   │   │   ├── 📄 AudioAnalysisService.test.ts
│   │   │   │   ├── 📄 BackendSyncService.test.ts
│   │   │   │   ├── 📄 BrowserAudioContextFactory.test.ts
│   │   │   │   ├── 📄 ColorService.test.ts
│   │   │   │   ├── 📄 ConfigurationService.test.ts
│   │   │   │   ├── 📄 DebugOrchestratorService.test.ts
│   │   │   │   ├── 📄 DebugService.test.ts
│   │   │   │   ├── 📄 EventBus.test.ts
│   │   │   │   ├── 📄 GameControllerService.test.ts
│   │   │   │   ├── 📄 GameStateStoreService.test.ts
│   │   │   │   ├── 📄 InputStateService.test.ts
│   │   │   │   ├── 📄 JitterService.test.ts
│   │   │   │   ├── 📄 Logger.test.ts
│   │   │   │   ├── 📄 PerformanceService.test.ts
│   │   │   │   ├── 📄 PhysicsService.test.ts
│   │   │   │   ├── 📄 QualiaCalculatorWorkerService.test.ts
│   │   │   │   ├── 📄 QualiaStateCalculatorService.test.ts
│   │   │   │   ├── 📄 RenderTargetPoolService.test.ts
│   │   │   │   ├── 📄 RhythmicMovementController.test.ts
│   │   │   │   ├── 📄 ShaderIntrospectionService.test.ts
│   │   │   │   ├── 📄 StateMergerService.test.ts
│   │   │   │   └── 📄 TimerService.test.ts
│   │   │   ├── 📄 TimerService.ts
│   │   │   ├── 📁 **utils/**
│   │   │   │   ├── 📄 NotificationQueue.ts
│   │   │   │   └── 📄 ThrottlingManager.ts
│   │   │   ├── 📄 ViewLogicService.ts
│   │   │   ├── 📄 WebAudioAPIService.ts
│   │   │   └── 📄 WebSocketService.ts
│   │   ├── 📁 **state/**
│   │   │   ├── 📁 **__tests__/**
│   │   │   │   └── 📄 useGameStore.test.ts
│   │   │   └── 📄 useGameStore.ts
│   │   ├── 📁 **testing/**
│   │   │   ├── 📁 **fixtures/**
│   │   │   │   └── 📁 **contracts/**
│   │   │   │       ├── 📄 AudioEvent.fixture.ts
│   │   │   │       ├── 📄 AudioLayer.fixture.ts
│   │   │   │       ├── 📄 BossState.fixture.ts
│   │   │   │       ├── 📄 CombatState.fixture.ts
│   │   │   │       ├── 📄 IActiveEffect.fixture.ts
│   │   │   │       ├── 📄 IEnvironmentEffect.fixture.ts
│   │   │   │       ├── 📄 IGameSettings.fixture.ts
│   │   │   │       ├── 📄 ILeaderboardEntry.fixture.ts
│   │   │   │       ├── 📄 IMusicalInputAnalysis.fixture.ts
│   │   │   │       ├── 📄 index.ts
│   │   │   │       ├── 📄 ISongData.fixture.ts
│   │   │   │       ├── 📄 MusicalComboData.fixture.ts
│   │   │   │       ├── 📄 PatternData.fixture.ts
│   │   │   │       ├── 📄 PlayerState.fixture.ts
│   │   │   │       └── 📄 QualiaState.fixture.ts
│   │   │   ├── 📁 **mocks/**
│   │   │   │   ├── 📄 application-initializer-service.mock.ts
│   │   │   │   ├── 📄 audio-8d-service.mock.ts
│   │   │   │   ├── 📄 audio-analysis-service.mock.ts
│   │   │   │   ├── 📄 audio-context-factory.mock.ts
│   │   │   │   ├── 📄 audio-service.mock.ts
│   │   │   │   ├── 📄 audio-system-bridge.mock.ts
│   │   │   │   ├── 📄 backend-sync-service.mock.ts
│   │   │   │   ├── 📄 browser-events-service.mock.ts
│   │   │   │   ├── 📄 configuration-service.mock.ts
│   │   │   │   ├── 📄 coordinate-system-service.mock.ts
│   │   │   │   ├── 📄 debug-orchestrator-service.mock.ts
│   │   │   │   ├── 📄 debug-service.mock.ts
│   │   │   │   ├── 📄 error-reporting-service.mock.ts
│   │   │   │   ├── 📄 event-bus.mock.ts
│   │   │   │   ├── 📄 fft-analyzer-service.mock.ts
│   │   │   │   ├── 📄 frontend-rendering-service.mock.ts
│   │   │   │   ├── 📄 game-controller-service.mock.ts
│   │   │   │   ├── 📄 game-input-controller-service.mock.ts
│   │   │   │   ├── 📄 gameplay-mechanics-service.mock.ts
│   │   │   │   ├── 📄 game-state-store.mock.ts
│   │   │   │   ├── 📄 game-state-store-service.mock.ts
│   │   │   │   ├── 📄 game-state-streaming-service.mock.ts
│   │   │   │   ├── 📄 glsl-parser.mock.ts
│   │   │   │   ├── 📄 http-service.mock.ts
│   │   │   │   ├── 📄 input-state-service.mock.ts
│   │   │   │   ├── 📄 kairos-visual-engine.mock.ts
│   │   │   │   ├── 📄 key-adapter.mock.ts
│   │   │   │   ├── 📄 logger.mock.ts
│   │   │   │   ├── 📄 MockAudioContextFactory.ts
│   │   │   │   ├── 📄 MockParticleSystemService.ts
│   │   │   │   ├── 📄 musical-combo-detector-service.mock.ts
│   │   │   │   ├── 📄 notification-service.mock.ts
│   │   │   │   ├── 📄 ontological-audio-engine.mock.ts
│   │   │   │   ├── 📄 performance-provider.mock.ts
│   │   │   │   ├── 📄 performance-service.mock.ts
│   │   │   │   ├── 📄 physics-service.mock.ts
│   │   │   │   ├── 📄 post-processing-service.mock.ts
│   │   │   │   ├── 📄 qualia-state-calculator-service.mock.ts
│   │   │   │   ├── 📄 rhythmic-movement-controller.mock.ts
│   │   │   │   ├── 📄 shader-introspection-service.mock.ts
│   │   │   │   ├── 📄 shader-loader-service.mock.ts
│   │   │   │   ├── 📄 state-streaming-service.mock.ts
│   │   │   │   ├── 📄 streaming-video-service.mock.ts
│   │   │   │   ├── 📄 subtitle-service.mock.ts
│   │   │   │   ├── 📄 timer-provider.mock.ts
│   │   │   │   ├── 📄 timer-service.mock.ts
│   │   │   │   ├── 📄 view-logic-service.mock.ts
│   │   │   │   ├── 📄 web-audio-a-p-i-service.mock.ts
│   │   │   │   ├── 📄 web-audio-api-service.mock.ts
│   │   │   │   ├── 📄 web-socket-factory.mock.ts
│   │   │   │   └── 📄 web-socket-service.mock.ts
│   │   │   ├── 📄 performance-profiler.ts
│   │   │   ├── 📄 README.md
│   │   │   ├── 📄 setup.ts
│   │   │   └── 📄 test-container-factory.ts
│   │   ├── 📁 **__tests__/**
│   │   │   └── 📁 **integration/**
│   │   │       ├── 📄 e2e-combat-flow.test.ts
│   │   │       ├── 📄 performance-benchmarks.test.ts
│   │   │       ├── 📄 visual-regression.test.ts
│   │   │       └── 📄 websocket-stability.test.ts
│   │   ├── 📁 **types/**
│   │   │   ├── 📄 AudioEvent.d.ts
│   │   │   ├── 📄 AudioLayer.d.ts
│   │   │   ├── 📄 BossState.d.ts
│   │   │   ├── 📄 CombatData.d.ts
│   │   │   ├── 📄 CombatState.d.ts
│   │   │   ├── 📄 config.ts
│   │   │   ├── 📄 contracts.ts
│   │   │   ├── 📄 electron.d.ts
│   │   │   ├── 📄 glsl-parser.d.ts
│   │   │   ├── 📄 glsl-tokenizer.d.ts
│   │   │   ├── 📄 IActiveEffect.d.ts
│   │   │   ├── 📄 IEnvironmentEffect.d.ts
│   │   │   ├── 📄 IGameSettings.d.ts
│   │   │   ├── 📄 ILeaderboardEntry.d.ts
│   │   │   ├── 📄 IMusicalInputAnalysis.d.ts
│   │   │   ├── 📄 ISongData.d.ts
│   │   │   ├── 📄 MusicalComboData.d.ts
│   │   │   ├── 📄 OptimizedParticle.d.ts
│   │   │   ├── 📄 PatternData.d.ts
│   │   │   ├── 📄 PlayerState.d.ts
│   │   │   ├── 📄 QualiaState.d.ts
│   │   │   └── 📄 vitest.d.ts
│   │   ├── 📁 **utils/**
│   │   │   ├── 📁 **decorators/**
│   │   │   │   ├── 📄 adapt-and-emit.decorator.ts
│   │   │   │   ├── 📄 async.decorator.ts
│   │   │   │   ├── 📄 authorize.decorator.ts
│   │   │   │   ├── 📄 browser-only.decorator.ts
│   │   │   │   ├── 📄 cache.decorator.ts
│   │   │   │   ├── 📄 catch-error.decorator.ts
│   │   │   │   ├── 📄 debounce.decorator.ts
│   │   │   │   ├── 📄 deprecated.decorator.ts
│   │   │   │   ├── 📄 log-method.decorator.ts
│   │   │   │   ├── 📄 measure-time.decorator.ts
│   │   │   │   ├── 📄 mutex.decorator.ts
│   │   │   │   ├── 📄 on-event.decorator.ts
│   │   │   │   ├── 📄 profile.decorator.ts
│   │   │   │   ├── 📄 rate-limit.decorator.ts
│   │   │   │   ├── 📄 readonly.decorator.ts
│   │   │   │   ├── 📄 retry.decorator.ts
│   │   │   │   ├── 📄 shared-types.ts
│   │   │   │   ├── 📁 **__tests__/**
│   │   │   │   │   ├── 📄 adapt-and-emit.decorator.test.ts
│   │   │   │   │   ├── 📄 authorize.decorator.test.ts
│   │   │   │   │   ├── 📄 browser-only.decorator.test.ts
│   │   │   │   │   ├── 📄 catch-error.decorator.test.ts
│   │   │   │   │   ├── 📄 log-method.decorator.test.ts
│   │   │   │   │   ├── 📄 measure-time.decorator.test.ts
│   │   │   │   │   ├── 📄 on-event.decorator.test.ts
│   │   │   │   │   ├── 📄 profile.decorator.test.ts
│   │   │   │   │   ├── 📄 throttle.decorator.test.ts
│   │   │   │   │   ├── 📄 validate.decorator.test.ts
│   │   │   │   │   └── 📄 validate-event-property.decorator.test.ts
│   │   │   │   ├── 📄 throttle.decorator.ts
│   │   │   │   ├── 📄 timeout.decorator.ts
│   │   │   │   ├── 📄 validate.decorator.ts
│   │   │   │   └── 📄 validate-event-property.decorator.ts
│   │   │   ├── 📄 decorators.ts
│   │   │   ├── 📄 EmergencyLogger.ts
│   │   │   ├── 📄 env.ts
│   │   │   └── 📄 performance-profiler.ts
│   │   └── 📁 **workers/**
│   │       ├── 📄 QualiaCalculatorCore.ts
│   │       ├── 📄 QualiaCalculatorWorker.ts
│   │       ├── 📁 **__tests__/**
│   │       │   └── 📄 QualiaCalculatorCore.test.ts
│   │       └── 📁 **types/**
│   │           └── 📄 worker-messages.ts
│   ├── 📄 tailwind.config.js
│   ├── 📄 tsconfig.json
│   ├── 📄 vite.config.ts
│   └── 📄 vite.log
├── 📄 .gitignore
└── 📄 README.md

---

## 📈 Statistics

```bash
# Directory count:
79

# File count:
903

# Total items:
982
```

*Generated by generate_qualia_map.sh*
