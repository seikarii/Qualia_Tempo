"""
QUALIA.CODE v1.1 - Application Initializer Service
Service lifecycle orchestration implementation.

Manages initialization and cleanup of all IBaseService implementations.
Automatically registers @OnEvent decorated methods with EventBus.
"""

from typing import List, Dict, Any
import time
from .interfaces.IApplicationInitializerService import IApplicationInitializerService
from .interfaces.IBaseService import IBaseService
from .interfaces.ILogger import ILogger
from .interfaces.IEventBus import IEventBus
from .contracts.IApplicationInitializerService_contracts import ApplicationInitializerServiceConfig


class ApplicationInitializerService(IApplicationInitializerService):
    """
    QUALIA.CODE v1.1 - Service Lifecycle Orchestrator
    
    Manages initialization and cleanup of all IBaseService implementations.
    Scans for @OnEvent decorated methods and auto-registers event handlers.
    
    Architecture Pattern:
        - Services are initialized in registration order (deterministic)
        - Services are cleaned up in reverse order (LIFO)
        - @OnEvent decorated methods are auto-registered during initialization
        - Failures during initialization stop application startup
        - Failures during cleanup are logged but don't stop shutdown
    
    Usage:
        # In CompositionRoot
        managed_services = [
            qualia_processor,
            game_logic_service,
            harmony_analysis_service
        ]
        
        initializer = ApplicationInitializerService(
            logger=logger,
            event_bus=event_bus,
            managed_services=managed_services
        )
        
        await initializer.start()  # Initialize all services
        # Application runs...
        await initializer.stop()   # Cleanup all services
    """
    
    def __init__(
        self,
        logger: ILogger,
        event_bus: IEventBus,
        managed_services: List[IBaseService],
        config: ApplicationInitializerServiceConfig
    ):
        """
        Initialize ApplicationInitializerService.
        
        Args:
            logger: Logger service for initialization/cleanup logging
            event_bus: EventBus service for auto-registering @OnEvent handlers
            managed_services: List of IBaseService implementations to manage
            config: Configuration for lifecycle management
        """
        self._logger = logger
        self._event_bus = event_bus
        self._managed_services = managed_services
        self._config = config
        self._is_started = False
        self._initialized_services: List[str] = []
        self._failed_services: List[str] = []
        self._event_registrations: Dict[str, List[tuple]] = {}  # service_name -> [(event_name, handler), ...]
        
        if config.enable_lifecycle_logging:
            self._logger.info(
                f"ApplicationInitializerService created with {len(managed_services)} managed services"
            )
    
    async def start(self) -> None:
        """
        Initialize all managed services.
        
        Process:
            1. Check if already started
            2. Iterate through services in registration order
            3. Call initialize() on each service
            4. Scan for @OnEvent decorated methods
            5. Auto-register event handlers
            6. Track initialization status
        
        Raises:
            Exception: Any service initialization failure stops startup
        """
        if self._is_started:
            self._logger.warning("ApplicationInitializerService already started")
            return
        
        start_time = time.time()
        self._logger.info(
            f"🚀 Starting ApplicationInitializerService",
            context={
                "managed_services_count": len(self._managed_services)
            }
        )
        
        for service in self._managed_services:
            service_name = service.__class__.__name__
            
            try:
                # Initialize service
                self._logger.info(f"Initializing {service_name}...")
                await service.initialize()
                
                # Scan for @OnEvent decorated methods
                event_handlers = self._scan_event_handlers(service)
                
                # Auto-register event handlers
                if event_handlers:
                    self._register_event_handlers(service, event_handlers)
                    self._logger.info(
                        f"Registered {len(event_handlers)} event handlers for {service_name}",
                        context={"handlers": [f"{eh[0]}" for eh in event_handlers]}
                    )
                
                self._initialized_services.append(service_name)
                self._logger.info(f"✅ {service_name} initialized successfully")
                
            except Exception as e:
                self._failed_services.append(service_name)
                self._logger.error(
                    f"❌ Failed to initialize {service_name}: {e}",
                    context={"error": str(e), "service": service_name}
                )
                raise RuntimeError(f"Service initialization failed: {service_name}") from e
        
        self._is_started = True
        elapsed_time = time.time() - start_time
        
        self._logger.info(
            f"✅ All services initialized successfully",
            context={
                "initialized_count": len(self._initialized_services),
                "elapsed_time_seconds": round(elapsed_time, 3),
                "services": self._initialized_services
            }
        )
    
    async def stop(self) -> None:
        """
        Cleanup all managed services.
        
        Process:
            1. Iterate through services in REVERSE order (LIFO)
            2. Unsubscribe event handlers
            3. Call cleanup() on each service
            4. Log status
            5. Continue on errors (don't re-raise)
        """
        if not self._is_started:
            self._logger.warning("ApplicationInitializerService not started, nothing to stop")
            return
        
        start_time = time.time()
        self._logger.info("🛑 Shutting down ApplicationInitializerService...")
        
        # Cleanup in reverse order (LIFO)
        for service in reversed(self._managed_services):
            service_name = service.__class__.__name__
            
            try:
                # Unsubscribe event handlers first
                if service_name in self._event_registrations:
                    self._unregister_event_handlers(service_name)
                
                # Cleanup service
                self._logger.info(f"Cleaning up {service_name}...")
                await service.cleanup()
                self._logger.info(f"🛑 {service_name} cleaned up")
                
            except Exception as e:
                # Log error but continue cleanup
                self._logger.error(
                    f"⚠️  Error cleaning up {service_name}: {e}",
                    context={"error": str(e), "service": service_name}
                )
        
        self._is_started = False
        elapsed_time = time.time() - start_time
        
        self._logger.info(
            f"✅ ApplicationInitializerService shutdown complete",
            context={
                "elapsed_time_seconds": round(elapsed_time, 3)
            }
        )
    
    def get_managed_services(self) -> List[IBaseService]:
        """Get list of all managed services."""
        return self._managed_services.copy()
    
    def get_initialization_status(self) -> Dict[str, Any]:
        """Get current initialization status."""
        return {
            "is_started": self._is_started,
            "initialized_services": self._initialized_services.copy(),
            "failed_services": self._failed_services.copy(),
            "total_services": len(self._managed_services),
            "event_registrations_count": sum(
                len(handlers) for handlers in self._event_registrations.values()
            )
        }
    
    def _scan_event_handlers(self, service: IBaseService) -> List[tuple]:
        """
        Scan service for @OnEvent decorated methods.
        
        Args:
            service: Service to scan
        
        Returns:
            List of tuples: [(event_name, method), ...]
        """
        event_handlers = []
        
        # Iterate through all methods of the service
        for attr_name in dir(service):
            # Skip private/magic methods (but allow _handle_* pattern)
            if attr_name.startswith('__'):
                continue
            
            try:
                method = getattr(service, attr_name)
                
                # Check if method has @OnEvent metadata
                if hasattr(method, '_is_event_handler') and hasattr(method, '_event_name'):
                    event_name = method._event_name
                    event_handlers.append((event_name, method))
                    
                    self._logger.debug(
                        f"Found @OnEvent decorated method: {service.__class__.__name__}.{attr_name} -> {event_name}"
                    )
            
            except AttributeError:
                # Skip if attribute doesn't exist or is not accessible
                continue
        
        return event_handlers
    
    def _register_event_handlers(self, service: IBaseService, event_handlers: List[tuple]) -> None:
        """
        Register event handlers with EventBus.
        
        Args:
            service: Service owning the handlers
            event_handlers: List of (event_name, method) tuples
        """
        service_name = service.__class__.__name__
        
        if service_name not in self._event_registrations:
            self._event_registrations[service_name] = []
        
        for event_name, method in event_handlers:
            try:
                # Subscribe to event
                self._event_bus.subscribe(event_name, method)
                self._event_registrations[service_name].append((event_name, method))
                
                self._logger.debug(
                    f"Registered event handler: {service_name}.{method.__name__} -> {event_name}"
                )
            
            except Exception as e:
                self._logger.error(
                    f"Failed to register event handler {service_name}.{method.__name__}: {e}"
                )
                raise
    
    def _unregister_event_handlers(self, service_name: str) -> None:
        """
        Unregister all event handlers for a service.
        
        Args:
            service_name: Name of service to unregister
        """
        if service_name not in self._event_registrations:
            return
        
        handlers = self._event_registrations[service_name]
        
        for event_name, method in handlers:
            try:
                self._event_bus.unsubscribe(event_name, method)
                self._logger.debug(
                    f"Unregistered event handler: {service_name}.{method.__name__} -> {event_name}"
                )
            except Exception as e:
                self._logger.error(
                    f"Failed to unregister event handler {service_name}.{method.__name__}: {e}"
                )
        
        # Clear registrations for this service
        del self._event_registrations[service_name]
