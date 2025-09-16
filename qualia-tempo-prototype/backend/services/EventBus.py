# QUALIA.CODE v1.0 - Backend EventBus
# Event-driven communication system for backend services

import asyncio
import logging
from typing import Any, Callable, Dict, List, Optional, Union
from dataclasses import dataclass
from abc import ABC, abstractmethod
import time


@dataclass
class Event:
    """Base event class for all system events."""

    name: str
    data: Any
    timestamp: float
    source: str
    correlation_id: Optional[str] = None


class EventHandler(ABC):
    """Abstract base class for event handlers."""

    @abstractmethod
    async def handle(self, event: Event) -> None:
        """Handle an event."""
        pass


class EventBus:
    """
    Central event bus for backend service communication.
    Implements pub/sub pattern with async event handling.
    """

    def __init__(self):
        self._handlers: Dict[str, List[EventHandler]] = {}
        self._logger = logging.getLogger(__name__)
        self._stats = {"events_published": 0, "events_handled": 0, "errors": 0}

    def subscribe(
        self, event_name: str, handler: Union[EventHandler, Callable]
    ) -> None:
        """
        Subscribe a handler to an event.

        Args:
            event_name: Name of the event to subscribe to
            handler: EventHandler instance or callable function
        """
        if event_name not in self._handlers:
            self._handlers[event_name] = []

        # Wrap callable functions in a handler adapter
        if not isinstance(handler, EventHandler):
            handler = CallableEventHandler(handler)

        self._handlers[event_name].append(handler)
        self._logger.debug(f"📡 Subscribed handler for event: {event_name}")

    def unsubscribe(
        self, event_name: str, handler: Union[EventHandler, Callable]
    ) -> None:
        """
        Unsubscribe a handler from an event.

        Args:
            event_name: Name of the event to unsubscribe from
            handler: Handler to remove
        """
        if event_name in self._handlers:
            if isinstance(handler, EventHandler):
                self._handlers[event_name] = [
                    h for h in self._handlers[event_name] if h != handler
                ]
            else:
                # Remove callable handlers by comparing the wrapped function
                self._handlers[event_name] = [
                    h
                    for h in self._handlers[event_name]
                    if not (isinstance(h, CallableEventHandler) and h._func == handler)
                ]
            self._logger.debug(f"📡 Unsubscribed handler from event: {event_name}")

    async def publish(
        self,
        event_name: str,
        data: Any,
        source: str = "unknown",
        correlation_id: Optional[str] = None,
    ) -> None:
        """
        Publish an event to all subscribers.

        Args:
            event_name: Name of the event
            data: Event data
            source: Source of the event
            correlation_id: Optional correlation ID for tracing
        """
        event = Event(
            name=event_name,
            data=data,
            timestamp=time.time(),
            source=source,
            correlation_id=correlation_id,
        )

        self._stats["events_published"] += 1
        self._logger.info(f"📢 Publishing event: {event_name} from {source}")

        if event_name in self._handlers:
            # Create tasks for all handlers to run concurrently
            tasks = []
            for handler in self._handlers[event_name]:
                task = asyncio.create_task(self._handle_event_safely(handler, event))
                tasks.append(task)

            # Wait for all handlers to complete
            if tasks:
                await asyncio.gather(*tasks, return_exceptions=True)
        else:
            self._logger.debug(f"⚠️  No handlers registered for event: {event_name}")

    async def _handle_event_safely(self, handler: EventHandler, event: Event) -> None:
        """
        Handle an event with error protection.

        Args:
            handler: Handler to execute
            event: Event to handle
        """
        try:
            await handler.handle(event)
            self._stats["events_handled"] += 1
            self._logger.debug(
                f"✅ Event {event.name} handled successfully by {handler.__class__.__name__}"
            )
        except Exception as e:
            self._stats["errors"] += 1
            self._logger.error(
                f"🚨 Error handling event {event.name} with {handler.__class__.__name__}: {str(e)}"
            )

    def get_stats(self) -> Dict[str, int]:
        """Get event bus statistics."""
        return self._stats.copy()

    def get_subscriptions(self) -> Dict[str, int]:
        """Get subscription counts by event name."""
        return {
            event_name: len(handlers) for event_name, handlers in self._handlers.items()
        }


class CallableEventHandler(EventHandler):
    """Adapter to wrap callable functions as EventHandler instances."""

    def __init__(self, func: Callable):
        self._func = func

    async def handle(self, event: Event) -> None:
        """Handle event by calling the wrapped function."""
        if asyncio.iscoroutinefunction(self._func):
            await self._func(event)
        else:
            self._func(event)


class QualiaEventHandler(EventHandler):
    """Specialized handler for QualiaState events."""

    def __init__(self, name: str):
        self.name = name
        self._logger = logging.getLogger(__name__)

    async def handle(self, event: Event) -> None:
        """Handle QualiaState update events."""
        if event.name == "QualiaStateUpdated":
            self._logger.info(f"🎵 {self.name} processing QualiaState update")
            await self._process_qualia_state(event.data)
        else:
            self._logger.debug(f"⚠️  {self.name} ignoring event: {event.name}")

    async def _process_qualia_state(self, qualia_state: Dict[str, Any]) -> None:
        """
        Process QualiaState updates.
        Override in subclasses for specific behavior.
        """
        self._logger.debug(f"🔄 Default QualiaState processing: {qualia_state}")


# Global event bus instance
_event_bus_instance: Optional[EventBus] = None


def get_event_bus() -> EventBus:
    """Get the global event bus instance (singleton pattern)."""
    global _event_bus_instance
    if _event_bus_instance is None:
        _event_bus_instance = EventBus()
    return _event_bus_instance


def reset_event_bus() -> None:
    """Reset the global event bus (mainly for testing)."""
    global _event_bus_instance
    _event_bus_instance = None
