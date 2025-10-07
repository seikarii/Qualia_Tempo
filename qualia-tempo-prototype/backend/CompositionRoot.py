# QUALIA.CODE v1.0 - Backend CompositionRoot
# IoC Container for backend service instantiation and dependency injection

import logging
from typing import Dict, Any, Optional
from .services.EventBus import EventBus, get_event_bus
from .services.ShaderIntrospectionService import ShaderIntrospectionService
from .utils.decorators import log_execution, handle_errors
import asyncio


class CompositionRoot:
    """
    Central IoC container for all backend services.
    Responsible for instantiating and managing service dependencies.

    QUALIA.CODE MANDATE: This is the ONLY place where services are instantiated.
    All other code must receive services via dependency injection.
    """

    def __init__(self) -> None:
        self._services: Dict[str, Any] = {}
        self._logger = logging.getLogger(__name__)
        self._event_bus = get_event_bus()
        self._initialized = False

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
        # ARCHITECTURE.GOLD.CODE: StreamingWebService removed - backend does not render
        # Video streaming functionality deprecated in favor of state-only streaming
        await self._initialize_state_streaming_service()

        # Register event handlers
        await self._register_event_handlers()

        self._initialized = True
        self._logger.info("✅ CompositionRoot initialization complete")

    # ARCHITECTURE.GOLD.CODE v2: _initialize_shared_context REMOVED
    # Backend no longer uses GPU/OpenGL. All rendering happens in frontend.
    # This method was deprecated as part of Phase 1 Task 1.2 migration.

    async def _initialize_event_bus(self) -> None:
        """Initialize the EventBus service."""
        self._services["event_bus"] = self._event_bus
        self._logger.debug("📡 EventBus service registered")

    async def _initialize_filesystem_service(self) -> None:
        """Initialize FileSystemService for platform abstraction (QUALIA.CODE §4)."""
        try:
            from .services.FileSystemService import FileSystemService

            filesystem_service = FileSystemService()
            self._services["filesystem_service"] = filesystem_service
            self._logger.debug("📁 FileSystemService registered")

        except Exception as e:
            self._logger.error(f"🚨 Failed to initialize FileSystemService: {e}")
            raise

    async def _initialize_system_environment_service(self) -> None:
        """Initialize SystemEnvironmentService for platform abstraction (QUALIA.CODE §4)."""
        try:
            from .services.SystemEnvironmentService import SystemEnvironmentService

            env_service = SystemEnvironmentService()
            self._services["system_environment_service"] = env_service
            self._logger.debug("🌍 SystemEnvironmentService registered")

        except Exception as e:
            self._logger.error(f"🚨 Failed to initialize SystemEnvironmentService: {e}")
            raise

    async def _initialize_security_service(self) -> None:
        """Initialize SecurityService with configuration and injected dependencies."""
        try:
            from .services.SecurityService import SecurityService
            import yaml

            # QUALIA.CODE: Use injected FileSystemService instead of direct open()
            filesystem_service = self._services.get("filesystem_service")
            if filesystem_service is None:
                raise RuntimeError("FileSystemService not available for SecurityService")

            # Load configuration using abstracted service
            config_path = filesystem_service.join_path(
                filesystem_service.get_absolute_path(__file__).rsplit('/', 1)[0],
                "config",
                "server.yaml"
            )
            config_content = filesystem_service.read_file(config_path)
            config = yaml.safe_load(config_content)

            # Inject SystemEnvironmentService into SecurityService
            env_service = self._services.get("system_environment_service")
            if env_service is None:
                raise RuntimeError("SystemEnvironmentService not available for SecurityService")
            
            security_service = SecurityService(config, env_service)
            self._services["security_service"] = security_service
            self._logger.debug("🔒 SecurityService registered with injected dependencies")

        except Exception as e:
            self._logger.error(f"🚨 Failed to initialize SecurityService: {e}")
            raise

    async def _initialize_shader_introspection_service(self) -> None:
        """Initialize the ShaderIntrospectionService."""
        shader_introspection_service = ShaderIntrospectionService()
        self._services["shader_introspection_service"] = shader_introspection_service
        self._logger.debug("🔍 ShaderIntrospectionService registered")

    async def _initialize_particle_system(self) -> None:
        """
        Initialize the ParticleEnginePoolManager service (v2 - process pool).
        
        ARCHITECTURE.GOLD.CODE v2 - Phase 1.4 Integration:
        - Replaced synchronous QualiaParticleEngine with async ParticleEnginePoolManager
        - Particle calculations now happen in separate worker processes
        - Decouples heavy computation from FastAPI event loop
        - Enables horizontal scaling and true parallelism
        """
        try:
            from .services.ParticleEnginePoolManager import ParticleEnginePoolManager

            # Create and start the process pool
            pool_manager = ParticleEnginePoolManager()
            
            # Start the pool (this creates worker processes)
            pool_started = await pool_manager.start()
            
            if not pool_started:
                raise RuntimeError("Failed to start ParticleEnginePoolManager")
            
            # Register pool manager as "particle_system" for backward compatibility
            self._services["particle_system"] = pool_manager

            self._logger.info(
                f"✅ ParticleEnginePoolManager initialized with {pool_manager.config.num_workers} worker processes"
            )
            
        except Exception as e:
            self._logger.error(f"🚨 Failed to initialize ParticleEnginePoolManager: {e}")
            raise

    async def _initialize_qualia_processor(self) -> None:
        """Initialize QualiaProcessor service with EventBus dependency."""
        from .services.QualiaProcessor import QualiaProcessor

        processor = QualiaProcessor(event_bus=self._event_bus)
        self._services["qualia_processor"] = processor
        self._logger.debug("✅ QualiaProcessor initialized")

    async def _initialize_game_logic_service(self) -> None:
        """
        Initialize GameLogicService for core game mechanics (PHASE 2 TASK 2.1).
        
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
            from .services.GameLogicService import GameLogicService

            game_logic_service = GameLogicService(event_bus=self._event_bus)
            self._services["game_logic_service"] = game_logic_service
            
            self._logger.info("✅ GameLogicService initialized - Core GDD mechanics ready")
            
        except Exception as e:
            self._logger.error(f"🚨 Failed to initialize GameLogicService: {e}")
            raise

    async def _initialize_harmony_analysis_service(self) -> None:
        """
        Initialize HarmonyAnalysisService for musical harmony analysis (PHASE 2 TASK 2.2).
        
        RESPONSIBILITIES (per GDD.md):
        - Musical interval analysis (consonance/dissonance)
        - Chord pattern detection (major/minor triads, etc.)
        - Player input vs song harmony scoring
        - Player input vs qualia harmony scoring
        - Harmony trend tracking over time
        - Harmonic vs chaotic pattern classification
        """
        try:
            from .services.HarmonyAnalysisService import HarmonyAnalysisService

            harmony_service = HarmonyAnalysisService(event_bus=self._event_bus)
            self._services["harmony_analysis_service"] = harmony_service
            
            self._logger.info("✅ HarmonyAnalysisService initialized - Musical harmony analysis ready")
            
        except Exception as e:
            self._logger.error(f"🚨 Failed to initialize HarmonyAnalysisService: {e}")
            raise

    async def _initialize_boss_ai_service(self) -> None:
        """
        Initialize BossAIService for boss behavior orchestration (PHASE 2 TASK 2.3).
        
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
            from .services.BossAIService import BossAIService

            boss_ai_service = BossAIService(event_bus=self._event_bus)
            self._services["boss_ai_service"] = boss_ai_service
            
            self._logger.info("✅ BossAIService initialized - Boss AI orchestration ready")
            
        except Exception as e:
            self._logger.error(f"🚨 Failed to initialize BossAIService: {e}")
            raise

    async def _initialize_pattern_system_service(self) -> None:
        """
        Initialize PatternSystemService for attack pattern management (PHASE 2 TASK 2.3).
        
        RESPONSIBILITIES:
        - Pattern library management
        - Pattern validation (type, phase requirements, aggression requirements)
        - Pattern querying by type, phase, aggression tier
        - Loading patterns from CombatData JSON files
        """
        try:
            from .services.PatternSystemService import PatternSystemService

            pattern_service = PatternSystemService()
            self._services["pattern_system_service"] = pattern_service
            
            self._logger.info("✅ PatternSystemService initialized - Pattern library ready")
            
        except Exception as e:
            self._logger.error(f"🚨 Failed to initialize PatternSystemService: {e}")
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

    def get_event_bus(self) -> EventBus:
        """Get the EventBus service."""
        from backend.services.EventBus import EventBus as EventBusClass
        return self.get_service("event_bus")  # type: ignore[no-any-return]

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

    # ARCHITECTURE.GOLD.CODE: get_rendering_service and get_streaming_web_service REMOVED
    # Backend no longer provides rendering or video streaming services
    
    def get_state_streaming_service(self) -> Any:
        """Get StateStreamingService instance."""
        return self.get_service("state_streaming_service")

    def get_security_service(self) -> Any:
        """Get SecurityService instance."""
        return self.get_service("security_service")

    @log_execution(level="INFO")
    @handle_errors(fallback_return_value=None)
    async def shutdown(self) -> None:
        """
        Gracefully shut down all background services using proper async introspection.
        
        ARCHITECTURE.GOLD.CODE v2 - Phase 1.4:
        - Added special handling for ParticleEnginePoolManager (stop method)
        - Ensures worker processes are terminated gracefully
        """
        if not self._initialized:
            self._logger.warning(
                "⚠️  CompositionRoot not initialized, nothing to shut down."
            )
            return

        self._logger.info("🔌 Gracefully shutting down QUALIA.CODE services...")

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
