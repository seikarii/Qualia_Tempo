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

            # ✅ FIXED: Use factory function with standalone context
            particle_engine = create_qualia_particle_engine(
                max_particles=10000,
                enable_metrics=True,
                standalone=True,  # Creates OpenGL context for headless operation
            )
            self._services["particle_system"] = particle_engine
            self._logger.debug("🎆 QualiaParticleEngine service registered")
        except Exception as e:
            self._logger.error(f"🚨 Failed to initialize QualiaParticleEngine: {e}")
            raise

    async def _initialize_qualia_processor(self) -> None:
        """Initialize the QualiaProcessor service."""
        # Import here to avoid circular dependencies
        from .services.QualiaProcessor import QualiaProcessor

        try:
            qualia_processor = QualiaProcessor(self._event_bus)
            self._services["qualia_processor"] = qualia_processor
            self._logger.debug("🧠 QualiaProcessor service registered")
        except Exception as e:
            self._logger.error(f"🚨 Failed to initialize QualiaProcessor: {e}")
            # Create a minimal fallback processor
            from .services.QualiaProcessor import MinimalQualiaProcessor

            self._services["qualia_processor"] = MinimalQualiaProcessor(self._event_bus)
            self._logger.warning("⚠️  Using minimal QualiaProcessor fallback")

    async def _register_event_handlers(self) -> None:
        """Register event handlers for cross-service communication."""
        # Particle system listens for QualiaState updates
        if "particle_system" in self._services:
            from .services.EventBus import QualiaEventHandler

            class ParticleEventHandler(QualiaEventHandler):
                def __init__(self, particle_engine):
                    super().__init__("QualiaParticleEngine")
                    self.particle_engine = particle_engine

                async def _process_qualia_state(self, qualia_state):
                    """Update particle engine based on QualiaState."""
                    # Convert QualiaState to dict format if needed
                    if hasattr(qualia_state, "dict"):
                        qualia_dict = qualia_state.dict()
                    elif hasattr(qualia_state, "__dict__"):
                        qualia_dict = qualia_state.__dict__
                    else:
                        qualia_dict = qualia_state

                    # Update uniform buffer with QualiaState
                    self.particle_engine.update_uniform_buffer(qualia_dict)

                    # Trigger compute step
                    self.particle_engine.compute_step()

            handler = ParticleEventHandler(self._services["particle_system"])
            self._event_bus.subscribe("QualiaStateUpdated", handler)
            self._logger.debug("🎆 Registered QualiaParticleEngine event handler")

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

    async def shutdown(self) -> None:
        """Gracefully shutdown all services."""
        self._logger.info("🛑 Shutting down CompositionRoot...")

        # Shutdown services in reverse order
        for service_name in reversed(list(self._services.keys())):
            service = self._services[service_name]
            if hasattr(service, "shutdown"):
                try:
                    if asyncio.iscoroutinefunction(service.shutdown):
                        await service.shutdown()
                    else:
                        service.shutdown()
                    self._logger.debug(f"✅ {service_name} shutdown complete")
                except Exception as e:
                    self._logger.error(f"🚨 Error shutting down {service_name}: {e}")

        self._services.clear()
        self._initialized = False
        self._logger.info("✅ CompositionRoot shutdown complete")


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
