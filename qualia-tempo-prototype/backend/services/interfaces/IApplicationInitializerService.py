"""
QUALIA.CODE v1.1 - Application Initializer Service Interface
Service lifecycle orchestration contract.

Manages initialization and cleanup of all IBaseService implementations.
Scans for @OnEvent decorated methods and auto-registers event handlers.
"""

from typing import Protocol, List
from .IBaseService import IBaseService


class IApplicationInitializerService(Protocol):
    """
    Service lifecycle orchestrator interface.
    
    Responsibilities:
        - Initialize all IBaseService implementations on startup
        - Scan for @OnEvent decorated methods
        - Auto-register event handlers with EventBus
        - Cleanup all services on graceful shutdown (reverse order)
        - Report initialization/cleanup status
    
    Usage:
        # In CompositionRoot or main application entry point
        initializer = composition_root.get_service("application_initializer")
        await initializer.start()  # Initialize all services
        
        # On shutdown
        await initializer.stop()  # Cleanup all services
    """
    
    async def start(self) -> None:
        """
        Initialize all managed services.
        
        Process:
            1. Iterate through all IBaseService implementations
            2. Call initialize() on each service (in registration order)
            3. Scan each service for @OnEvent decorated methods
            4. Auto-register event handlers with EventBus
            5. Log initialization status
        
        Raises:
            Exception: Any service initialization failure stops application startup
        
        Example:
            async def start(self) -> None:
                for service in self._managed_services:
                    service_name = service.__class__.__name__
                    await service.initialize()
                    self._register_event_handlers(service)
                    self._logger.info(f"✅ {service_name} initialized")
        """
        ...
    
    async def stop(self) -> None:
        """
        Cleanup all managed services.
        
        Process:
            1. Iterate through services in REVERSE order (LIFO)
            2. Call cleanup() on each service
            3. Log cleanup status
            4. Continue on errors (log but don't re-raise)
        
        Example:
            async def stop(self) -> None:
                for service in reversed(self._managed_services):
                    service_name = service.__class__.__name__
                    try:
                        await service.cleanup()
                        self._logger.info(f"🛑 {service_name} cleaned up")
                    except Exception as e:
                        self._logger.error(f"Error cleaning up {service_name}: {e}")
        """
        ...
    
    def get_managed_services(self) -> List[IBaseService]:
        """
        Get list of all managed services.
        
        Returns:
            List of IBaseService implementations being managed
        
        Use Cases:
            - Health check endpoints
            - Monitoring dashboards
            - Debugging service dependencies
        """
        ...
    
    def get_initialization_status(self) -> dict:
        """
        Get current initialization status.
        
        Returns:
            Dict containing:
                - is_started: bool
                - initialized_services: List[str]
                - failed_services: List[str]
                - total_services: int
        """
        ...
