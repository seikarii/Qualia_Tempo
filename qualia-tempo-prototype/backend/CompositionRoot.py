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

        # GOLD.CODE: Initialize shared OpenGL context FIRST
        await self._initialize_shared_context()

        # Initialize core services
        await self._initialize_event_bus()
        await self._initialize_security_service()
        await self._initialize_shader_introspection_service()
        await self._initialize_particle_system()
        await self._initialize_qualia_processor()
        await self._initialize_streaming_web_service()
        await self._initialize_state_streaming_service()

        # Register event handlers
        await self._register_event_handlers()

        self._initialized = True
        self._logger.info("✅ CompositionRoot initialization complete")

    async def _initialize_shared_context(self) -> None:
        """Initialize shared OpenGL context - GOLD.CODE: Single source of truth."""
        try:
            import moderngl

            # GOLD.CODE: Try EGL first, fallback to software if not available
            context_backends = [
                {"backend": "egl", "name": "EGL"},
                {"backend": "glx", "name": "GLX"},
                {"name": "Default"},  # Empty dict = default
            ]

            shared_ctx = None
            for backend_config in context_backends:
                try:
                    # Try creating context with OpenGL 3.30 requirement
                    shared_ctx = moderngl.create_standalone_context(require=330)

                    backend_name = backend_config.get("name", "Default")
                    self._logger.info(
                        f"✅ Created shared {backend_name} OpenGL context"
                    )
                    break

                except Exception as e:
                    backend_name = backend_config.get("name", "Default")
                    self._logger.warning(
                        f"⚠️ Failed to create {backend_name} context: {e}"
                    )
                    continue

            if shared_ctx is None:
                raise RuntimeError(
                    "GOLD.CODE VIOLATION: Failed to create any OpenGL context"
                )

            self._services["shared_opengl_context"] = shared_ctx
            self._logger.debug("🔗 Shared OpenGL context initialized and registered")

        except Exception as e:
            self._logger.error(f"🚨 Failed to initialize shared OpenGL context: {e}")
            raise

    async def _initialize_event_bus(self) -> None:
        """Initialize the EventBus service."""
        self._services["event_bus"] = self._event_bus
        self._logger.debug("📡 EventBus service registered")

    async def _initialize_security_service(self) -> None:
        """Initialize SecurityService with configuration."""
        try:
            from .services.SecurityService import SecurityService
            import yaml
            from pathlib import Path

            # Load configuration
            config_path = Path(__file__).parent / "config" / "server.yaml"
            with open(config_path, "r") as file:
                config = yaml.safe_load(file)

            security_service = SecurityService(config)
            self._services["security_service"] = security_service
            self._logger.debug("🔒 SecurityService registered with configuration")

        except Exception as e:
            self._logger.error(f"🚨 Failed to initialize SecurityService: {e}")
            raise

    async def _initialize_shader_introspection_service(self) -> None:
        """Initialize the ShaderIntrospectionService."""
        shader_introspection_service = ShaderIntrospectionService()
        self._services["shader_introspection_service"] = shader_introspection_service
        self._logger.debug("🔍 ShaderIntrospectionService registered")

    async def _initialize_particle_system(self) -> None:
        """Initialize the QualiaParticleEngine service with shared context."""
        try:
            from .engine.qualia_particle_engine import create_qualia_particle_engine

            # GOLD.CODE: Get shared context and pass to particle engine
            shared_ctx = self._services.get("shared_opengl_context")
            if shared_ctx is None:
                raise RuntimeError(
                    "GOLD.CODE VIOLATION: Shared context not available for particle engine"
                )

            # ✅ QUALIA.CODE: Pass shared context instead of standalone=True
            particle_engine = create_qualia_particle_engine(
                max_particles=10000,
                enable_metrics=True,
                standalone=False,  # GOLD.CODE: Use shared context
                ctx=shared_ctx,  # GOLD.CODE: Inject shared OpenGL context
                event_bus=self._event_bus,  # QUALIA.CODE: Inject EventBus dependency
                shader_inspector=self._services.get(
                    "shader_introspection_service"
                ),  # QUALIA.CODE: Inject ShaderIntrospectionService
            )
            self._services["particle_system"] = particle_engine

            # QUALIA.CODE: Start the engine to subscribe to events
            particle_engine.start()

            self._logger.debug(
                "🎆 QualiaParticleEngine service registered with shared context"
            )
        except Exception as e:
            self._logger.error(f"🚨 Failed to initialize QualiaParticleEngine: {e}")
            raise

    async def _initialize_qualia_processor(self) -> None:
        """Initialize QualiaProcessor service with EventBus dependency."""
        from .services.QualiaProcessor import QualiaProcessor

        processor = QualiaProcessor(event_bus=self._event_bus)
        self._services["qualia_processor"] = processor
        self._logger.debug("✅ QualiaProcessor initialized")

    async def _initialize_streaming_web_service(self) -> None:
        """Initialize StreamingWebService for video streaming via WebSocket."""
        from .services.StreamingWebService import StreamingWebService
        from .services.RenderingService import RenderingService

        particle_engine = self._services.get("particle_system")
        
        # Create the actual rendering service
        rendering_service = RenderingService(
            ctx=self._services.get("shared_opengl_context"),
            particle_engine=particle_engine,
            event_bus=self._event_bus
        )

        streaming_web_service = StreamingWebService(
            event_bus=self._event_bus,
            rendering_service=rendering_service,
            particle_engine=particle_engine,
        )
        self._services["streaming_web_service"] = streaming_web_service
        self._services["rendering_service"] = rendering_service
        self._logger.debug("✅ StreamingWebService and RenderingService initialized")

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
