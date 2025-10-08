# QUALIA.CODE v1.1 - Backend EventBus
# Event-driven communication system for backend services

import asyncio
from typing import Any, Callable, Dict, List, Optional, Union
from dataclasses import dataclass
from abc import ABC, abstractmethod
import time
from .interfaces.ILogger import ILogger
from .contracts.IEventBus_contracts import EventBusConfig


@dataclass
class Event:
    """Base event class for all system events."""

    type: str
    data: Any
    timestamp: float
    source: str
    correlation_id: Optional[str] = None


@dataclass
class RenderingPipelineFailedEvent(Event):
    """Event triggered when the rendering pipeline fails critically."""

    def __init__(
        self, error_message: str, error_code: str, context: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            type="RENDERING_PIPELINE_FAILED",
            data={
                "error_message": error_message,
                "error_code": error_code,
                "context": context or {},
            },
            timestamp=time.time(),
            source="RenderingService",
        )


@dataclass
class SystemResourcesReadyEvent(Event):
    """Event triggered when all core system resources (GPU buffers, etc.) are initialized and ready."""

    def __init__(self, context: Optional[Dict[str, Any]] = None):
        super().__init__(
            type="System.ResourcesReady",
            data={
                "message": "All core system resources have been initialized and are ready for use",
                "context": context or {},
            },
            timestamp=time.time(),
            source="RenderingService",
        )


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
    
    QUALIA.CODE v1.1: Now uses injected ILogger and EventBusConfig.
    """

    def __init__(self, config: EventBusConfig, logger: ILogger) -> None:
        """
        Initialize EventBus with configuration and logger injection.
        
        Args:
            config: EventBus configuration
            logger: Injected logger service
        """
        self._config = config
        self._logger = logger
        self._handlers: Dict[str, List[EventHandler]] = {}
        self._stats = {"events_published": 0, "events_handled": 0, "errors": 0}
        
        if self._config.enable_statistics:
            self._logger.info("EventBus initialized with statistics enabled")

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

    def publish(self, event_obj: Any) -> None:
        """
        Publish an event to all subscribers (synchronous wrapper for async publish).
        Accepts event objects from services.contracts.events.
        
        Args:
            event_obj: Event object with type, timestamp, source attributes
        """
        # Create event loop if not in async context
        try:
            loop = asyncio.get_running_loop()
            # We're in async context, schedule the coroutine
            asyncio.create_task(self._publish_async(event_obj))
        except RuntimeError:
            # Not in async context, run in new loop
            asyncio.run(self._publish_async(event_obj))

    async def publish_async(
        self,
        event_name: str,
        data: Any,
        source: str = "unknown",
        correlation_id: Optional[str] = None,
    ) -> None:
        """
        Publish an event to all subscribers (legacy API with separate arguments).

        Args:
            event_name: Name of the event
            data: Event data
            source: Source of the event
            correlation_id: Optional correlation ID for tracing
        """
        event = Event(
            type=event_name,
            data=data,
            timestamp=time.time(),
            source=source,
            correlation_id=correlation_id,
        )

        await self._publish_async(event)

    async def _publish_async(self, event_obj: Any) -> None:
        """
        Internal async method to publish events.
        
        Args:
            event_obj: Event object (either Event or custom event from contracts)
        """
        # Convert custom event objects to standard Event if needed
        if isinstance(event_obj, Event):
            event = event_obj
        else:
            # Event object from services.contracts.events
            event = Event(
                type=event_obj.type,
                data=event_obj.__dict__,
                timestamp=event_obj.timestamp,
                source=event_obj.source,
                correlation_id=getattr(event_obj, 'correlation_id', None)
            )
        
        self._stats["events_published"] += 1
        self._logger.info(f"📢 Publishing event: {event.type} from {event.source}")

        if event.type in self._handlers:
            # Create tasks for all handlers to run concurrently
            tasks = []
            for handler in self._handlers[event.type]:
                task = asyncio.create_task(self._handle_event_safely(handler, event))
                tasks.append(task)

            # Wait for all handlers to complete
            if tasks:
                await asyncio.gather(*tasks, return_exceptions=True)
        else:
            self._logger.debug(f"⚠️  No handlers registered for event: {event.type}")

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
                f"✅ Event {event.type} handled successfully by {handler.__class__.__name__}"
            )
        except Exception as e:
            self._stats["errors"] += 1
            self._logger.error(
                f"🚨 Error handling event {event.type} with {handler.__class__.__name__}: {str(e)}"
            )

    def get_stats(self) -> Dict[str, int]:
        """Get event bus statistics."""
        return self._stats.copy()

    def get_subscriptions(self) -> Dict[str, int]:
        """Get subscription counts by event name."""
        return {
            event_name: len(handlers) for event_name, handlers in self._handlers.items()
        }
    
    def clear_handlers(self, event_name: str) -> None:
        """
        Clear all handlers for a specific event.
        
        Args:
            event_name: Event name to clear handlers for
        """
        if event_name in self._handlers:
            count = len(self._handlers[event_name])
            self._handlers[event_name].clear()
            self._logger.info(f"Cleared {count} handlers for event: {event_name}")


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

    def __init__(self, name: str, logger: ILogger):
        self.name = name
        self._logger = logger

    async def handle(self, event: Event) -> None:
        """Handle QualiaState update events."""
        if event.type == "QualiaStateUpdated":
            self._logger.info(f"🎵 {self.name} processing QualiaState update")
            await self._process_qualia_state(event.data)
        else:
            self._logger.debug(f"⚠️  {self.name} ignoring event: {event.type}")

    async def _process_qualia_state(self, qualia_state: Dict[str, Any]) -> None:
        """
        Process QualiaState updates.
        Override in subclasses for specific behavior.
        """
        self._logger.debug(f"🔄 Default QualiaState processing: {qualia_state}")


# Global event bus instance (for backward compatibility during migration)
_event_bus_instance: Optional[EventBus] = None


def get_event_bus() -> EventBus:
    """
    Get the global event bus instance (singleton pattern).
    
    DEPRECATED: This function is provided for backward compatibility during migration.
    New code should use the ServiceContainer to resolve IEventBus.
    """
    global _event_bus_instance
    if _event_bus_instance is None:
        # Create with default config for backward compatibility
        from .QualiaLogger import QualiaLogger
        from .contracts.ILogger_contracts import LoggerConfig
        
        default_logger_config = LoggerConfig()
        default_logger = QualiaLogger(default_logger_config)
        
        default_config = EventBusConfig()
        _event_bus_instance = EventBus(default_config, default_logger)
    return _event_bus_instance


def reset_event_bus() -> None:
    """Reset the global event bus (mainly for testing)."""
    global _event_bus_instance
    _event_bus_instance = None
