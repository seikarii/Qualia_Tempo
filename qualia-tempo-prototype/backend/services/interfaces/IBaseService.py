"""
QUALIA.CODE v1.1 - Base Service Interface
Service lifecycle management contract.

All services requiring lifecycle management (event subscriptions, resource
initialization, graceful shutdown) MUST implement this interface.

ApplicationInitializerService automatically manages services implementing
IBaseService, calling initialize() on startup and cleanup() on shutdown.
"""

from typing import Protocol, Dict, Any


class IBaseService(Protocol):
    """
    Base interface for all services requiring lifecycle management.
    
    Services implementing this interface are automatically managed by
    ApplicationInitializerService during application startup/shutdown.
    
    Lifecycle Flow:
        1. Service instantiated by IoC container
        2. ApplicationInitializerService.start() calls initialize() on all IBaseService implementations
        3. Service operates normally
        4. ApplicationInitializerService.stop() calls cleanup() on all IBaseService implementations (reverse order)
    
    Common Use Cases:
        - Services using @OnEvent decorator (automatic event subscription)
        - Services with external connections (database, network, file handles)
        - Services with background tasks or timers
        - Services requiring initialization steps after construction
    """
    
    async def initialize(self) -> None:
        """
        Initialize service and set up resources.
        
        Called by ApplicationInitializerService during application startup.
        Order is deterministic based on service registration order.
        
        Typical Actions:
            - Set up EventBus subscriptions (for @OnEvent decorated methods)
            - Initialize external connections (database, network)
            - Start background tasks
            - Load cached data
            - Perform validation checks
        
        Raises:
            Exception: Any exception prevents application startup
        
        Example:
            async def initialize(self) -> None:
                # Auto-register @OnEvent decorated methods
                for method_name in dir(self):
                    method = getattr(self, method_name)
                    if hasattr(method, '_is_event_handler'):
                        event_name = method._event_name
                        self._event_bus.subscribe(event_name, method)
                        self._event_subscriptions.append(event_name)
                
                self._logger.info("Service initialized")
        """
        ...
    
    async def cleanup(self) -> None:
        """
        Cleanup service resources and unsubscribe from events.
        
        Called by ApplicationInitializerService during graceful shutdown.
        Order is reverse of initialization order (LIFO).
        
        Typical Actions:
            - Unsubscribe from all EventBus events
            - Close external connections
            - Stop background tasks
            - Flush buffers
            - Release resources
        
        Note:
            MUST NOT raise exceptions. Log errors and continue cleanup.
        
        Example:
            async def cleanup(self) -> None:
                # Unsubscribe from events
                for event_name in self._event_subscriptions:
                    try:
                        self._event_bus.unsubscribe(event_name, self)
                    except Exception as e:
                        self._logger.error(f"Failed to unsubscribe from {event_name}: {e}")
                
                self._event_subscriptions.clear()
                self._logger.info("Service cleaned up")
        """
        ...
    
    def get_health_status(self) -> Dict[str, Any]:
        """
        Report current health status of service.
        
        Used for health checks and monitoring. Should return quickly (<100ms).
        
        Returns:
            Dict containing:
                - status: "healthy" | "degraded" | "unhealthy"
                - details: Service-specific health information
                - timestamp: Current timestamp
                - metrics: Optional performance metrics
        
        Example:
            def get_health_status(self) -> Dict[str, Any]:
                return {
                    "status": "healthy" if self._is_initialized else "unhealthy",
                    "details": {
                        "event_subscriptions": len(self._event_subscriptions),
                        "queue_size": self._queue.qsize(),
                        "last_activity": self._last_activity_time
                    },
                    "timestamp": time.time(),
                    "metrics": {
                        "processed_events": self._processed_count,
                        "error_count": self._error_count
                    }
                }
        """
        ...
