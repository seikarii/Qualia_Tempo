# QUALIA.CODE v1.1 - IEventBus Interface
# Interface for EventBus service

from typing import Protocol, Callable, Any, Dict, List, Union
from ..EventBus import Event, EventHandler


class IEventBus(Protocol):
    """Interface for EventBus service."""

    def subscribe(self, event_name: str, handler: Union[EventHandler, Callable]) -> None:
        """Subscribe a handler to an event."""
        ...

    def unsubscribe(self, event_name: str, handler: Union[EventHandler, Callable]) -> None:
        """Unsubscribe a handler from an event."""
        ...

    def publish(self, event_obj: Any) -> None:
        """Publish an event to all subscribers (synchronous wrapper for async publish)."""
        ...

    async def publish_async(self, event_name: str, data: Any, source: str) -> None:
        """Publish an event asynchronously."""
        ...

    def publish_sync(self, event_name: str, data: Any, source: str) -> None:
        """Publish an event synchronously."""
        ...

    def get_stats(self) -> Dict[str, int]:
        """Get EventBus statistics."""
        ...

    def clear_handlers(self, event_name: str) -> None:
        """Clear all handlers for a specific event."""
        ...
