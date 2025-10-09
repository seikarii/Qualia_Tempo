# QUALIA.CODE v1.1 - Backend CompositionRoot
# IoC Container for backend service instantiation and dependency injection

from typing import Dict, Any, Optional
from .services.container import ServiceContainer
from .services.container_config import get_configured_container
from .services.interfaces.ILogger import ILogger
from .services.interfaces.IEventBus import IEventBus
from .services.interfaces.IFileSystemService import IFileSystemService
from .services.interfaces.ISystemEnvironmentService import ISystemEnvironmentService
from .services.interfaces.ISecurityService import ISecurityService
from .services.interfaces.IShaderIntrospectionService import IShaderIntrospectionService
from .services.interfaces.IQualiaProcessor import IQualiaProcessor
from .services.interfaces.IConfigurationService import IConfigurationService
from .services.interfaces.IParticleEnginePoolManager import IParticleEnginePoolManager
from .services.interfaces.IApplicationInitializerService import IApplicationInitializerService
from .services.interfaces.IBaseService import IBaseService
from .utils.decorators import log_execution, handle_errors
import asyncio


class CompositionRoot:
    """
    Central IoC container for all backend services.
    Responsible for instantiating and managing service dependencies.

    QUALIA.CODE v1.1 MIGRATION (Phase 1 - Hybrid Approach):
    - Uses ServiceContainer for migrated services (EventBus, QualiaProcessor, etc.)
    - Maintains manual initialization for pending services (ParticleEngine, GameLogic, etc.)
    - Phase 2 will complete full migration to ServiceContainer
    
    MANDATE: This is the ONLY place where services are instantiated.
    All other code must receive services via dependency injection.
    """

    def __init__(self) -> None:
        # Phase 1: Initialize ServiceContainer for migrated services
        self.container: ServiceContainer = get_configured_container()
        self._logger: ILogger = self.container.resolve(ILogger)
        
        # Phase 3: ApplicationInitializerService for lifecycle management
        self._app_initializer: Optional[IApplicationInitializerService] = None
        
        # Legacy service dictionary for services not yet migrated
        self._services: Dict[str, Any] = {}
        self._initialized = False
        
        self._logger.info("CompositionRoot initialized with ServiceContainer (Phase 3: ApplicationInitializer ready)")

    @log_execution(level="INFO")
    @handle_errors(fallback_return_value=None)
    async def initialize(self) -> None:
        """
        Initialize all services and their dependencies.
        Must be called before using any services.
        """
        if self._initialized:
            self._logger.warning("⚠️  CompositionRoot already initialized")
            return

        self._logger.info("🚀 Initializing QUALIA.CODE CompositionRoot...")

        # ARCHITECTURE.GOLD.CODE v2: No OpenGL context needed (backend no longer renders)
        # All rendering handled by frontend KairosVisualEngine

        # Initialize platform abstraction services (QUALIA.CODE §4 - Platform Abstraction)
        await self._initialize_filesystem_service()
        await self._initialize_configuration_service()  # Phase 1 completion - YAML config loading
        await self._initialize_system_environment_service()

        # Initialize core services
        await self._initialize_event_bus()
        await self._initialize_security_service()
        await self._initialize_shader_introspection_service()
        await self._initialize_particle_system()
        await self._initialize_qualia_processor()
        # PHASE 2 TASK 2.1: Initialize GameLogicService for GDD mechanics
        await self._initialize_game_logic_service()
        # PHASE 2 TASK 2.2: Initialize HarmonyAnalysisService for musical harmony
        await self._initialize_harmony_analysis_service()
        # PHASE 2 TASK 2.3: Initialize BossAI and PatternSystem services
        await self._initialize_boss_ai_service()
        await self._initialize_pattern_system_service()
        # PHASE 2 TASK 2.4: Initialize PersistenceService for leaderboards
        await self._initialize_persistence_service()
        # ARCHITECTURE.GOLD.CODE: StreamingWebService removed - backend does not render
        # Video streaming functionality deprecated in favor of state-only streaming
        await self._initialize_state_streaming_service()
        # PHASE 6 TASK 6.1: Initialize GameStateStreamingService for CombatState streaming
        await self._initialize_game_state_streaming_service()

        # Register event handlers
        await self._register_event_handlers()
        
        # PHASE 3.1: Initialize ApplicationInitializerService for lifecycle management
        await self._initialize_application_initializer()

        self._initialized = True
        self._logger.info("✅ CompositionRoot initialization complete")

    # ARCHITECTURE.GOLD.CODE v2: _initialize_shared_context REMOVED
    # Backend no longer uses GPU/OpenGL. All rendering happens in frontend.
    # This method was deprecated as part of Phase 1 Task 1.2 migration.

    async def _initialize_event_bus(self) -> None:
        """Initialize the EventBus service from container."""
        event_bus = self.container.resolve(IEventBus)
        self._services["event_bus"] = event_bus
        self._logger.debug("📡 EventBus service registered from container")

    async def _initialize_filesystem_service(self) -> None:
        """Initialize FileSystemService from container (QUALIA.CODE v1.1)."""
        try:
            filesystem_service = self.container.resolve(IFileSystemService)
            self._services["filesystem_service"] = filesystem_service
            self._logger.debug("📁 FileSystemService registered from container")

        except Exception as e:
            self._logger.error(f"🚨 Failed to initialize FileSystemService: {e}")
            raise

    async def _initialize_configuration_service(self) -> None:
        """
        Initialize ConfigurationService from container (QUALIA.CODE v1.1).
        
        Phase 1 Completion: This service replaces hardcoded configs with YAML loading.
        All configuration values now externalized per QUALIA.CODE mandate.
        """
        try:
            config_service = self.container.resolve(IConfigurationService)
            self._services["configuration_service"] = config_service
            self._logger.info("⚙️  ConfigurationService registered from container")
            self._logger.info("🎯 Phase 1 ConfigurationService: All configs now loaded from YAML files")

        except Exception as e:
            self._logger.error(f"🚨 Failed to initialize ConfigurationService: {e}")
            raise

    async def _initialize_system_environment_service(self) -> None:
        """Initialize SystemEnvironmentService from container (QUALIA.CODE v1.1)."""
        try:
            env_service = self.container.resolve(ISystemEnvironmentService)
            self._services["system_environment_service"] = env_service
            self._logger.debug("🌍 SystemEnvironmentService registered from container")

        except Exception as e:
            self._logger.error(f"🚨 Failed to initialize SystemEnvironmentService: {e}")
            raise

    async def _initialize_security_service(self) -> None:
        """Initialize SecurityService from container (QUALIA.CODE v1.1)."""
        try:
            security_service = self.container.resolve(ISecurityService)
            self._services["security_service"] = security_service
            self._logger.debug("🔒 SecurityService registered from container")

        except Exception as e:
            self._logger.error(f"🚨 Failed to initialize SecurityService: {e}")
            raise

    async def _initialize_shader_introspection_service(self) -> None:
        """Initialize ShaderIntrospectionService from container (QUALIA.CODE v1.1)."""
        shader_introspection_service = self.container.resolve(IShaderIntrospectionService)
        self._services["shader_introspection_service"] = shader_introspection_service
        self._logger.debug("🔍 ShaderIntrospectionService registered from container")

    async def _initialize_particle_system(self) -> None:
        """
        Initialize the ParticleEnginePoolManager service from container (Phase 2.1).
        
        ARCHITECTURE.GOLD.CODE v2 - Phase 2.1 Migration:
        - Migrated to IoC container with proper dependency injection
        - Uses ILogger for structured logging (QUALIA.CODE §5.3)
        - Configuration loaded from process-pool.yaml
        - Particle calculations happen in separate worker processes
        - Decouples heavy computation from FastAPI event loop
        - Enables horizontal scaling and true parallelism
        """
        try:
            from .services.interfaces.IParticleEnginePoolManager import IParticleEnginePoolManager
            
            # Resolve from container (dependencies auto-injected)
            pool_manager = self.container.resolve(IParticleEnginePoolManager)
            
            # Start the pool (this creates worker processes)
            pool_started = await pool_manager.start()
            
            if not pool_started:
                raise RuntimeError("Failed to start ParticleEnginePoolManager")
            
            # Register pool manager as "particle_system" for backward compatibility
            self._services["particle_system"] = pool_manager

            self._logger.info(
                "✅ ParticleEnginePoolManager initialized from container and started"
            )
            
        except Exception as e:
            self._logger.error(f"🚨 Failed to initialize ParticleEnginePoolManager: {e}")
            raise

    async def _initialize_qualia_processor(self) -> None:
        """Initialize QualiaProcessor from container (QUALIA.CODE v1.1)."""
        processor = self.container.resolve(IQualiaProcessor)
        self._services["qualia_processor"] = processor
        self._logger.debug("✅ QualiaProcessor initialized from container")

    async def _initialize_game_logic_service(self) -> None:
        """
        Initialize GameLogicService for core game mechanics (PHASE 2 TASK 2.1).
        
        QUALIA.CODE v1.1 IoC Compliance:
        - Service resolved from container (Phase 2.2 migration)
        - All dependencies (config, logger, event_bus) injected by container
        - No manual instantiation or config loading
        
        RESPONSIBILITIES (per GDD.md):
        - Qualia generation (dash, ability, metronome)
        - Emergent combo system (harmonic/chaotic)
        - Score calculation with multipliers
        - Health management (player/boss)
        - Ultimate ability (x40 combo)
        - Difficulty scaling (volume-based)
        - Tempo-aware cooldowns
        """
        try:
            from .services.interfaces.IGameLogicService import IGameLogicService
            
            # Resolve from container (Phase 2.2 - IoC pattern)
            game_logic_service = self.container.resolve(IGameLogicService)
            self._services["game_logic_service"] = game_logic_service
            
            self._logger.info("✅ GameLogicService initialized - Core GDD mechanics ready (Phase 2.2 IoC)")
            
        except Exception as e:
            self._logger.error(f"🚨 Failed to initialize GameLogicService: {e}")
            raise

    async def _initialize_harmony_analysis_service(self) -> None:
        """
        Initialize HarmonyAnalysisService for musical harmony analysis (PHASE 2.3 - IoC MIGRATION).
        
        RESPONSIBILITIES (per GDD.md):
        - Musical interval analysis (consonance/dissonance)
        - Chord pattern detection (major/minor triads, etc.)
        - Player input vs song harmony scoring
        - Player input vs qualia harmony scoring
        - Harmony trend tracking over time
        - Harmonic vs chaotic pattern classification
        
        QUALIA.CODE COMPLIANCE:
        - Service obtained via container.resolve() (IoC pattern)
        - Configuration injected from YAML (harmony-analysis.yaml)
        - Logger injection (no logging.getLogger())
        """
        try:
            from .services.interfaces.IHarmonyAnalysisService import IHarmonyAnalysisService
            
            # Resolve service from IoC container (QUALIA.CODE §2.1 IoC mandate)
            harmony_service = self.container.resolve(IHarmonyAnalysisService)
            self._services["harmony_analysis_service"] = harmony_service
            
            self._logger.info("✅ HarmonyAnalysisService initialized via IoC container - Musical harmony analysis ready")
            
        except Exception as e:
            self._logger.error(f"🚨 Failed to initialize HarmonyAnalysisService: {e}")
            raise

    async def _initialize_boss_ai_service(self) -> None:
        """
        Initialize BossAIService for boss behavior orchestration (PHASE 2.4 MIGRATED).
        
        ARCHITECTURE COMPLIANCE:
        - IoC container resolution (QUALIA.CODE §II)
        - Direct Configuration Injection (QUALIA.CODE §II Step 3)
        - Logger injection (QUALIA.CODE §V)
        - EventBus interface injection (QUALIA.CODE §IV)
        
        RESPONSIBILITIES (per GDD.md):
        - Boss phase management (Opening, Escalation, Climax, Finale)
        - Multi-factor aggression calculation (volume, tempo, harmony, combo)
        - Context-aware attack pattern selection AI
        - Pattern execution with telegraph timing and vulnerability windows
        - Enrage mechanics when song time remaining < 30s
        - Qualia generation on successful attacks
        - Harmonic combo pattern neutralization
        """
        try:
            from .services.interfaces.IBossAIService import IBossAIService
            
            # Container resolution replaces manual instantiation
            boss_ai_service = self.container.resolve(IBossAIService)
            self._services["boss_ai_service"] = boss_ai_service
            
            self._logger.info("✅ BossAIService initialized via IoC container - Boss AI orchestration ready")
            
        except Exception as e:
            self._logger.error(f"🚨 Failed to initialize BossAIService: {e}")
            raise

    async def _initialize_pattern_system_service(self) -> None:
        """
        Initialize PatternSystemService for attack pattern management (PHASE 2.5 MIGRATED).
        
        ARCHITECTURE COMPLIANCE:
        - IoC container resolution (QUALIA.CODE §II)
        - Direct Configuration Injection (QUALIA.CODE §II Step 3)
        - Logger injection (QUALIA.CODE §V)
        
        RESPONSIBILITIES:
        - Pattern library management
        - Pattern validation (type, phase requirements, aggression requirements)
        - Pattern querying by type, phase, aggression tier
        - Loading patterns from CombatData JSON files
        """
        try:
            from .services.interfaces.IBossAIService import IPatternSystemService
            
            # Container resolution replaces manual instantiation
            pattern_service = self.container.resolve(IPatternSystemService)
            self._services["pattern_system_service"] = pattern_service
            
            self._logger.info("✅ PatternSystemService initialized via IoC container - Pattern library ready")
            
        except Exception as e:
            self._logger.error(f"🚨 Failed to initialize PatternSystemService: {e}")
            raise

    async def _initialize_persistence_service(self) -> None:
        """
        Initialize PersistenceService for leaderboard and score management (PHASE 2 TASK 2.4).
        
        RESPONSIBILITIES (per ARCHITECTURE.GOLD.CODE):
        - Save and load leaderboard entries
        - Score validation (anti-cheat detection)
        - Player statistics tracking
        - Thread-safe file operations
        """
        try:
            from .services.PersistenceService import PersistenceService
            
            # QUALIA.CODE §4: Inject FileSystemService for platform abstraction
            filesystem_service = self._services.get("filesystem_service")
            if not filesystem_service:
                raise RuntimeError("FileSystemService not available for PersistenceService")

            persistence_service = PersistenceService(file_system_service=filesystem_service)
            
            # Initialize the service (loads existing data, creates directories)
            persistence_service.initialize()
            
            self._services["persistence_service"] = persistence_service
            
            self._logger.info("✅ PersistenceService initialized - Leaderboard management ready")
            
        except Exception as e:
            self._logger.error(f"🚨 Failed to initialize PersistenceService: {e}")
            raise

    # ARCHITECTURE.GOLD.CODE v2: ParticleEngine uses multiprocessing pool (Phase 1 Task 1.3)
    # No GPU/OpenGL context needed - pure state calculation
            
        except Exception as e:
            self._logger.error(f"🚨 Failed to initialize GameLogicService: {e}")
            raise

    # ARCHITECTURE.GOLD.CODE: _initialize_streaming_web_service REMOVED
    # Backend no longer performs rendering. Video streaming deprecated.
    # All visual rendering now handled exclusively by frontend (KairosVisualEngine)

    async def _initialize_state_streaming_service(self) -> None:
        """Initialize StateStreamingService for WebSocket state streaming."""
        try:
            from .services.StateStreamingService import StateStreamingService
            import yaml
            from pathlib import Path

            # Load configuration - QUALIA.CODE §7: Externalized configuration
            config_path = Path(__file__).parent / "config" / "server.yaml"
            with open(config_path, "r") as file:
                config = yaml.safe_load(file)

            particle_engine = self._services["particle_system"]
            streaming_service = StateStreamingService(
                event_bus=self._event_bus,
                particle_engine=particle_engine,
                config=config
            )
            self._services["state_streaming_service"] = streaming_service
            self._logger.debug("✅ StateStreamingService initialized with externalized config")

        except Exception as e:
            self._logger.error(f"🚨 Failed to initialize StateStreamingService: {e}")
            raise

    async def _initialize_game_state_streaming_service(self) -> None:
        """
        Initialize GameStateStreamingService for WebSocket CombatState streaming.
        
        PHASE 6 TASK 6.1: Full System Integration
        Streams complete game state (player, boss, gameState) from backend to frontend
        at 60fps for smooth gameplay synchronization.
        """
        try:
            from .services.GameStateStreamingService import GameStateStreamingService
            import yaml
            from pathlib import Path

            # Load configuration - QUALIA.CODE §7: Externalized configuration
            config_path = Path(__file__).parent / "config" / "server.yaml"
            with open(config_path, "r") as file:
                config = yaml.safe_load(file)

            game_state_streaming_service = GameStateStreamingService(
                event_bus=self._event_bus,
                config=config
            )
            self._services["game_state_streaming_service"] = game_state_streaming_service
            self._logger.debug("✅ GameStateStreamingService initialized for Phase 6.1 integration")

        except Exception as e:
            self._logger.error(f"🚨 Failed to initialize GameStateStreamingService: {e}")
            raise

    async def _initialize_application_initializer(self) -> None:
        """
        Initialize ApplicationInitializerService for lifecycle management.
        
        PHASE 3.1: Automatic @OnEvent registration and service lifecycle orchestration.
        Collects all services implementing IBaseService and manages their initialization/cleanup.
        """
        try:
            # Collect all services that implement IBaseService
            managed_services: list[IBaseService] = []
            
            for service_name, service in self._services.items():
                if isinstance(service, IBaseService):
                    managed_services.append(service)
                    self._logger.debug(f"📋 Registered {service_name} for lifecycle management")
            
            # Get logger and event_bus for ApplicationInitializerService
            logger = self.container.resolve(ILogger)
            event_bus = self.container.resolve(IEventBus)
            
            # Create ApplicationInitializerService with managed services
            from .services.ApplicationInitializerService import ApplicationInitializerService
            from .services.contracts.IApplicationInitializerService_contracts import ApplicationInitializerServiceConfig
            
            config = self.container.resolve(ApplicationInitializerServiceConfig)
            self._app_initializer = ApplicationInitializerService(logger, event_bus, managed_services, config)
            
            # Start the application initializer (this will scan @OnEvent decorators and register handlers)
            await self._app_initializer.start()
            
            self._logger.info(
                f"✅ ApplicationInitializerService initialized with {len(managed_services)} managed services"
            )
            
        except Exception as e:
            self._logger.error(f"🚨 Failed to initialize ApplicationInitializerService: {e}")
            raise

    async def _register_event_handlers(self) -> None:
        """Register event handlers for cross-service communication."""
        # QUALIA.CODE: QualiaParticleEngine now handles its own events autonomously
        # No need for external ParticleEventHandler - engine subscribes directly to EventBus
        if "particle_system" in self._services:
            self._logger.debug(
                "🎆 QualiaParticleEngine registered for autonomous event handling"
            )

            # QUALIA.CODE v1.1: Import handler from proper module location
            from .handlers.engine_handlers import EngineResetHandler

            reset_handler = EngineResetHandler(self._services["particle_system"])
            self._event_bus.subscribe("EngineReset", reset_handler)
            self._logger.debug(
                "🔄 Registered QualiaParticleEngine EngineReset event handler"
            )

    def get_service(self, service_name: str) -> Any:
        """
        Get a service by name.

        Args:
            service_name: Name of the service to retrieve

        Returns:
            Service instance

        Raises:
            ValueError: If service not found or CompositionRoot not initialized
        """
        if not self._initialized:
            raise ValueError(
                "CompositionRoot not initialized. Call initialize() first."
            )

        if service_name not in self._services:
            available_services = list(self._services.keys())
            raise ValueError(
                f"Service '{service_name}' not found. Available: {available_services}"
            )

        return self._services[service_name]

    def get_event_bus(self) -> Any:
        """Get the EventBus service from container (QUALIA.CODE v1.1)."""
        return self.get_service("event_bus")

    def get_particle_system(self) -> Any:
        """Get the ParticleSystem service."""
        return self.get_service("particle_system")

    def get_qualia_processor(self) -> Any:
        """Get the QualiaProcessor service."""
        return self.get_service("qualia_processor")

    def get_game_logic_service(self) -> Any:
        """Get the GameLogicService instance."""
        return self.get_service("game_logic_service")

    def get_harmony_analysis_service(self) -> Any:
        """Get the HarmonyAnalysisService instance."""
        return self.get_service("harmony_analysis_service")

    def get_boss_ai_service(self) -> Any:
        """Get the BossAIService instance."""
        return self.get_service("boss_ai_service")

    def get_pattern_system_service(self) -> Any:
        """Get the PatternSystemService instance."""
        return self.get_service("pattern_system_service")

    def get_persistence_service(self) -> Any:
        """Get the PersistenceService instance."""
        return self.get_service("persistence_service")

    # ARCHITECTURE.GOLD.CODE: get_rendering_service and get_streaming_web_service REMOVED
    # Backend no longer provides rendering or video streaming services
    
    def get_state_streaming_service(self) -> Any:
        """Get StateStreamingService instance (particle streaming)."""
        return self.get_service("state_streaming_service")

    def get_game_state_streaming_service(self) -> Any:
        """
        Get GameStateStreamingService instance (CombatState streaming).
        
        PHASE 6 TASK 6.1: Full System Integration
        Returns service for streaming complete game state to frontend.
        """
        return self.get_service("game_state_streaming_service")

    def get_security_service(self) -> Any:
        """Get SecurityService instance."""
        return self.get_service("security_service")

    def get_application_initializer(self) -> Optional[IApplicationInitializerService]:
        """
        Get ApplicationInitializerService instance.
        
        PHASE 3.4: Health Endpoint Support
        Returns service for querying managed service health status.
        """
        return self._app_initializer

    @log_execution(level="INFO")
    @handle_errors(fallback_return_value=None)
    async def shutdown(self) -> None:
        """
        Gracefully shut down all background services using proper async introspection.
        
        ARCHITECTURE.GOLD.CODE v2 - Phase 1.4:
        - Added special handling for ParticleEnginePoolManager (stop method)
        - Ensures worker processes are terminated gracefully
        
        PHASE 3.1:
        - ApplicationInitializerService handles automatic lifecycle cleanup (LIFO order)
        """
        if not self._initialized:
            self._logger.warning(
                "⚠️  CompositionRoot not initialized, nothing to shut down."
            )
            return

        self._logger.info("🔌 Gracefully shutting down QUALIA.CODE services...")
        
        # PHASE 3.1: Stop ApplicationInitializerService first (handles all IBaseService cleanup)
        if self._app_initializer is not None:
            try:
                self._logger.info("🛑 Stopping ApplicationInitializerService (lifecycle cleanup)...")
                await self._app_initializer.stop()
                self._logger.critical("✅ ApplicationInitializerService TERMINATED.")
            except Exception as e:
                self._logger.error(
                    f"🚨 Error during ApplicationInitializerService shutdown: {e}", exc_info=True
                )

        # Shutdown services in reverse order to respect dependencies.
        for service_name in reversed(list(self._services.keys())):
            service = self._services.get(service_name)

            # Special handling for ParticleEnginePoolManager (uses "stop" instead of "shutdown")
            if service_name == "particle_system" and service is not None and hasattr(service, "stop"):
                try:
                    self._logger.info(f"🛑 Stopping {service_name} (process pool)...")
                    await service.stop()
                    self._logger.critical(f"✅ {service_name} TERMINATED.")
                except Exception as e:
                    self._logger.error(
                        f"🚨 Error during shutdown of {service_name}: {e}", exc_info=True
                    )
                continue

            if not (
                service and hasattr(service, "shutdown") and callable(service.shutdown)
            ):
                continue

            try:
                self._logger.info(f"🛑 Shutting down {service_name}...")

                # CORRECT WAY: Call shutdown and check if result is a coroutine
                result = service.shutdown()
                if asyncio.iscoroutine(result):
                    await result
                elif asyncio.iscoroutinefunction(service.shutdown):
                    await service.shutdown()
                else:
                    # Synchronous shutdown, result is already the return value
                    pass

                self._logger.critical(f"✅ {service_name} TERMINATED.")
            except Exception as e:
                self._logger.error(
                    f"🚨 Error during shutdown of {service_name}: {e}", exc_info=True
                )

        self._services.clear()
        self._initialized = False
        self._logger.critical(
            "💀 ALL SERVICES TERMINATED. CompositionRoot shutdown is complete."
        )


# Global CompositionRoot instance
_composition_root_instance: Optional[CompositionRoot] = None


def get_composition_root() -> CompositionRoot:
    """Get the global CompositionRoot instance (singleton pattern)."""
    global _composition_root_instance
    if _composition_root_instance is None:
        _composition_root_instance = CompositionRoot()
    return _composition_root_instance


def reset_composition_root() -> None:
    """Reset the global CompositionRoot (mainly for testing)."""
    global _composition_root_instance
    _composition_root_instance = None
