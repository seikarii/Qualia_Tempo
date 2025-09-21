# QUALIA.CODE v1.0 - Backend CompositionRoot
# IoC Container for backend service instantiation and dependency injection

import logging
from typing import Dict, Any, Optional
from .services.EventBus import EventBus, get_event_bus
from .utils.decorators import log_execution, handle_errors
import asyncio


class CompositionRoot:
    """
    Central IoC container for all backend services.
    Responsible for instantiating and managing service dependencies.

    QUALIA.CODE MANDATE: This is the ONLY place where services are instantiated.
    All other code must receive services via dependency injection.
    """

    def __init__(self):
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

        # Initialize core services
        await self._initialize_event_bus()
        await self._initialize_particle_system()
        await self._initialize_qualia_processor()
        await self._initialize_rendering_service()
        await self._initialize_streaming_web_service()

        # Register event handlers
        await self._register_event_handlers()

        self._initialized = True
        self._logger.info("✅ CompositionRoot initialization complete")

    async def _initialize_event_bus(self) -> None:
        """Initialize the EventBus service."""
        self._services["event_bus"] = self._event_bus
        self._logger.debug("📡 EventBus service registered")

    async def _initialize_particle_system(self) -> None:
        """Initialize the QualiaParticleEngine service."""
        try:
            from .engine.qualia_particle_engine import create_qualia_particle_engine

            # ✅ QUALIA.CODE: Pass EventBus for EDA compliance
            particle_engine = create_qualia_particle_engine(
                max_particles=10000,
                enable_metrics=True,
                standalone=True,  # Creates OpenGL context for headless operation
                event_bus=self._event_bus,  # QUALIA.CODE: Inject EventBus dependency
            )
            self._services["particle_system"] = particle_engine

            # QUALIA.CODE: Start the engine to subscribe to events
            particle_engine.start()

            self._logger.debug("🎆 QualiaParticleEngine service registered and started")
        except Exception as e:
            self._logger.error(f"🚨 Failed to initialize QualiaParticleEngine: {e}")
            raise

    async def _initialize_qualia_processor(self) -> None:
        """Initialize QualiaProcessor service with EventBus dependency."""
        from .services.QualiaProcessor import QualiaProcessor

        processor = QualiaProcessor(event_bus=self._event_bus)
        self._services["qualia_processor"] = processor
        self._logger.debug("✅ QualiaProcessor initialized")

    async def _initialize_rendering_service(self) -> None:
        """Initialize RenderingService for GPU-based frame rendering."""
        from .services.RenderingService import RenderingService

        # QUALIA.CODE: Get particle engine from services and inject it
        particle_engine = self._services["particle_system"]

        rendering_service = RenderingService(
            event_bus=self._event_bus,
            particle_engine=particle_engine,  # QUALIA.CODE: Inject particle engine dependency
            width=1920,
            height=1080,
        )
        self._services["rendering_service"] = rendering_service
        self._logger.debug("✅ RenderingService initialized")

    async def _initialize_streaming_web_service(self) -> None:
        """Initialize StreamingWebService for WebSocket video streaming."""
        from .services.StreamingWebService import StreamingWebService

        rendering_service = self._services["rendering_service"]
        streaming_service = StreamingWebService(
            event_bus=self._event_bus, rendering_service=rendering_service
        )
        self._services["streaming_web_service"] = streaming_service
        self._logger.debug("✅ StreamingWebService initialized")

    async def _register_event_handlers(self) -> None:
        """Register event handlers for cross-service communication."""
        # QUALIA.CODE: QualiaParticleEngine now handles its own events autonomously
        # No need for external ParticleEventHandler - engine subscribes directly to EventBus
        if "particle_system" in self._services:
            self._logger.debug(
                "🎆 QualiaParticleEngine registered for autonomous event handling"
            )

            # Add handler for EngineReset event
            from .services.EventBus import QualiaEventHandler

            class EngineResetHandler(QualiaEventHandler):
                def __init__(self, particle_engine):
                    super().__init__("EngineResetHandler")
                    self.particle_engine = particle_engine

                async def handle_event(self, event_name, data, source):
                    """Handle EngineReset event by resetting particle engine."""
                    if event_name == "EngineReset":
                        await self.particle_engine.reset()
                        self._logger.info(
                            "🔄 QualiaParticleEngine reset via EngineReset event"
                        )

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
        return self.get_service("event_bus")

    def get_particle_system(self) -> Any:
        """Get the ParticleSystem service."""
        return self.get_service("particle_system")

    def get_qualia_processor(self) -> Any:
        """Get the QualiaProcessor service."""
        return self.get_service("qualia_processor")

    def get_rendering_service(self) -> Any:
        """Get RenderingService instance."""
        return self.get_service("rendering_service")

    def get_streaming_web_service(self) -> Any:
        """Get StreamingWebService instance."""
        return self.get_service("streaming_web_service")

    @log_execution(level="INFO")
    @handle_errors(fallback_return_value=None)
    async def shutdown(self) -> None:
        """
        Gracefully shut down all background services using proper async introspection.
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
