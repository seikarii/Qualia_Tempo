"""
High-Fidelity Mock for IEventBus Interface
QUALIA.CODE v1.1 Compliance - Testing Infrastructure

This mock records all event bus operations for test assertions.
"""
from typing import Any, Callable, Dict, List, Optional, Union
from backend.services.interfaces.IEventBus import IEventBus
from backend.services.EventBus import EventHandler


class MockEventBus(IEventBus):
    """
    High-fidelity mock for IEventBus interface.
    Records all subscriptions, unsubscriptions, and publish operations.
    
    COMPLIANCE: QUALIA.MANUAL.md Section 10.3.1 (High-Fidelity Mocking)
    - Implements full IEventBus Protocol interface
    - Records all operations for test assertions
    - Returns type-correct values
    - Supports call history inspection
    """
    
    def __init__(self):
        """Initialize empty history."""
        self.reset()
    
    def reset(self) -> None:
        """Reset all call history and state."""
        self.subscriptions: Dict[str, List[Union[EventHandler, Callable]]] = {}
        self.subscribe_calls: List[Dict[str, Any]] = []
        self.unsubscribe_calls: List[Dict[str, Any]] = []
        self.publish_calls: List[Any] = []
        self.publish_async_calls: List[Dict[str, Any]] = []
        self.publish_sync_calls: List[Dict[str, Any]] = []
    
    # IEventBus Protocol Implementation
    
    def subscribe(self, event_name: str, handler: Union[EventHandler, Callable]) -> None:
        """Record subscription and add handler."""
        if event_name not in self.subscriptions:
            self.subscriptions[event_name] = []
        
        self.subscriptions[event_name].append(handler)
        self.subscribe_calls.append({
            "event_name": event_name,
            "handler": handler
        })
    
    def unsubscribe(self, event_name: str, handler: Union[EventHandler, Callable]) -> None:
        """Record unsubscription and remove handler."""
        if event_name in self.subscriptions:
            if handler in self.subscriptions[event_name]:
                self.subscriptions[event_name].remove(handler)
        
        self.unsubscribe_calls.append({
            "event_name": event_name,
            "handler": handler
        })
    
    def publish(self, event_obj: Any) -> None:
        """Record synchronous publish (wrapper for async)."""
        self.publish_calls.append(event_obj)
    
    async def publish_async(self, event_name: str, data: Any, source: str) -> None:
        """Record asynchronous publish."""
        self.publish_async_calls.append({
            "event_name": event_name,
            "data": data,
            "source": source
        })
        
        # Optionally call subscribed handlers for integration tests
        if event_name in self.subscriptions:
            for handler in self.subscriptions[event_name]:
                try:
                    if hasattr(handler, '__call__'):
                        handler(data)
                except Exception:
                    pass  # Swallow errors in test mock
    
    def publish_sync(self, event_name: str, data: Any, source: str) -> None:
        """Record synchronous publish."""
        self.publish_sync_calls.append({
            "event_name": event_name,
            "data": data,
            "source": source
        })
        
        # Optionally call subscribed handlers for integration tests
        if event_name in self.subscriptions:
            for handler in self.subscriptions[event_name]:
                try:
                    if hasattr(handler, '__call__'):
                        handler(data)
                except Exception:
                    pass  # Swallow errors in test mock
    
    def get_stats(self) -> Dict[str, int]:
        """Return mock statistics."""
        return {
            "total_events": len(self.publish_calls) + len(self.publish_async_calls) + len(self.publish_sync_calls),
            "total_subscriptions": sum(len(handlers) for handlers in self.subscriptions.values()),
            "unique_event_types": len(self.subscriptions)
        }
    
    def clear_handlers(self, event_name: str) -> None:
        """Clear all handlers for event."""
        if event_name in self.subscriptions:
            self.subscriptions[event_name].clear()
    
    def get_subscriptions(self) -> Dict[str, int]:
        """Return subscription counts per event."""
        return {
            event_name: len(handlers)
            for event_name, handlers in self.subscriptions.items()
        }
    
    # Assertion Helper Methods
    
    def was_subscribed_to(self, event_name: str) -> bool:
        """Check if any handler subscribed to event."""
        return event_name in self.subscriptions and len(self.subscriptions[event_name]) > 0
    
    def get_subscription_count(self, event_name: str) -> int:
        """Get number of handlers for event."""
        return len(self.subscriptions.get(event_name, []))
    
    def was_published(self, event_name: str) -> bool:
        """Check if event was published (sync or async)."""
        return any(
            call.get("event_name") == event_name
            for call in self.publish_async_calls + self.publish_sync_calls
        )
    
    def get_published_data(self, event_name: str) -> List[Any]:
        """Get all data published for event."""
        return [
            call["data"]
            for call in self.publish_async_calls + self.publish_sync_calls
            if call.get("event_name") == event_name
        ]
    
    def get_publish_count(self, event_name: Optional[str] = None) -> int:
        """Get publish count for specific event or all events."""
        if event_name is None:
            return len(self.publish_calls) + len(self.publish_async_calls) + len(self.publish_sync_calls)
        
        return len([
            call for call in self.publish_async_calls + self.publish_sync_calls
            if call.get("event_name") == event_name
        ])
