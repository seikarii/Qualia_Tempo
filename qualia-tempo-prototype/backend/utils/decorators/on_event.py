# QUALIA.CODE v1.1 - Event Handler Decorator
# Phase 3.5: Decorator Modularization

import functools
from typing import Any, Callable


def OnEvent(event_name: str) -> Callable[[Callable], Callable]:
    """
    Decorator for automatic event subscription management.
    
    QUALIA.CODE v1.1 - Event-Driven Architecture Enhancement
    
    Marks a method as an event handler for the specified event type.
    Services using this decorator MUST implement IBaseService interface.
    ApplicationInitializerService manages automatic subscription/cleanup.
    
    Args:
        event_name: The event type to subscribe to (e.g., "QualiaStateUpdated")
    
    Usage:
        @OnEvent("PlayerAction")
        def on_player_action(self, event_data: Dict[str, Any]) -> None:
            # Handle event
            pass
    
    Benefits:
        - Eliminates manual subscribe/unsubscribe boilerplate
        - Automatic lifecycle management via ApplicationInitializerService
        - Declarative event handling (clear intent)
        - Prevents memory leaks (automatic cleanup)
    
    Example:
        class MyService(IBaseService):
            def __init__(self, event_bus: IEventBus, logger: ILogger):
                self._event_bus = event_bus
                self._logger = logger
                self._event_subscriptions: List[str] = []
            
            @OnEvent("QualiaStateUpdated")
            def _handle_qualia_update(self, event_data: Dict[str, Any]) -> None:
                self._logger.info("Qualia state updated", context=event_data)
            
            async def initialize(self) -> None:
                # ApplicationInitializerService scans for @OnEvent decorators
                # and auto-registers handlers
                pass
            
            async def cleanup(self) -> None:
                # ApplicationInitializerService auto-unsubscribes all handlers
                pass
    
    Contract Requirements:
        - Service MUST implement IBaseService (initialize, cleanup, get_health_status)
        - Service MUST have _event_bus attribute of type IEventBus
        - Service MUST have _event_subscriptions attribute of type List[str]
        - Handler method MUST accept (self, event_data: Dict[str, Any]) signature
        - ApplicationInitializerService MUST manage service lifecycle
    """
    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        # Mark method as event handler with metadata
        func._is_event_handler = True  # type: ignore
        func._event_name = event_name  # type: ignore
        
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            # Wrapper preserves original function behavior
            # Actual subscription happens in ApplicationInitializerService
            return func(*args, **kwargs)
        
        # Preserve metadata on wrapper
        wrapper._is_event_handler = True  # type: ignore
        wrapper._event_name = event_name  # type: ignore
        
        return wrapper
    
    return decorator
