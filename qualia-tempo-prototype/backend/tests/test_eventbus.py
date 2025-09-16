# QUALIA.CODE v1.0 - EventBus Tests
# Comprehensive testing for event-driven communication system

import pytest
import asyncio
import logging
import sys
import os

# Add project root to path for imports
sys.path.insert(
    0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)

from backend.services.EventBus import (
    EventBus,
    Event,
    EventHandler,
    QualiaEventHandler,
    get_event_bus,
    reset_event_bus,
)


class MockEventHandler(EventHandler):
    """Mock event handler for testing."""

    def __init__(self):
        self.handled_events = []
        self.should_raise = False

    async def handle(self, event: Event) -> None:
        if self.should_raise:
            raise Exception("Test error")
        self.handled_events.append(event)


class TestEvent:
    """Test suite for Event data class."""

    def test_event_creation(self):
        """Test Event object creation."""
        event = Event(
            name="TestEvent",
            data={"test": "data"},
            timestamp=1234567890.0,
            source="TestSource",
            correlation_id="test-123",
        )

        assert event.name == "TestEvent"
        assert event.data == {"test": "data"}
        assert event.timestamp == 1234567890.0
        assert event.source == "TestSource"
        assert event.correlation_id == "test-123"

    def test_event_creation_minimal(self):
        """Test Event creation with minimal parameters."""
        event = Event(
            name="MinimalEvent",
            data="simple data",
            timestamp=1234567890.0,
            source="MinimalSource",
        )

        assert event.name == "MinimalEvent"
        assert event.data == "simple data"
        assert event.correlation_id is None


class TestEventBus:
    """Test suite for EventBus implementation."""

    @pytest.fixture
    def event_bus(self):
        """Create a fresh EventBus for each test."""
        return EventBus()

    def test_subscription(self, event_bus):
        """Test event subscription."""
        handler = MockEventHandler()

        event_bus.subscribe("TestEvent", handler)

        assert "TestEvent" in event_bus._handlers
        assert handler in event_bus._handlers["TestEvent"]

    def test_subscription_callable(self, event_bus):
        """Test subscription with callable function."""
        handled_events = []

        def test_handler(event):
            handled_events.append(event)

        event_bus.subscribe("TestEvent", test_handler)

        assert "TestEvent" in event_bus._handlers
        assert len(event_bus._handlers["TestEvent"]) == 1

    def test_unsubscription(self, event_bus):
        """Test event unsubscription."""
        handler = MockEventHandler()

        event_bus.subscribe("TestEvent", handler)
        event_bus.unsubscribe("TestEvent", handler)

        assert len(event_bus._handlers.get("TestEvent", [])) == 0

    def test_unsubscription_callable(self, event_bus):
        """Test unsubscription with callable function."""

        def test_handler(event):
            pass

        event_bus.subscribe("TestEvent", test_handler)
        event_bus.unsubscribe("TestEvent", test_handler)

        assert len(event_bus._handlers.get("TestEvent", [])) == 0

    @pytest.mark.asyncio
    async def test_publish_with_handlers(self, event_bus):
        """Test event publishing with registered handlers."""
        handler1 = MockEventHandler()
        handler2 = MockEventHandler()

        event_bus.subscribe("TestEvent", handler1)
        event_bus.subscribe("TestEvent", handler2)

        await event_bus.publish("TestEvent", {"test": "data"}, source="TestSource")

        # Give async operations time to complete
        await asyncio.sleep(0.1)

        assert len(handler1.handled_events) == 1
        assert len(handler2.handled_events) == 1
        assert handler1.handled_events[0].name == "TestEvent"
        assert handler1.handled_events[0].data == {"test": "data"}

    @pytest.mark.asyncio
    async def test_publish_no_handlers(self, event_bus, caplog):
        """Test event publishing with no registered handlers."""
        with caplog.at_level(logging.DEBUG):
            await event_bus.publish(
                "UnhandledEvent", {"test": "data"}, source="TestSource"
            )

            assert "No handlers registered for event: UnhandledEvent" in caplog.text

    @pytest.mark.asyncio
    async def test_publish_with_error_handler(self, event_bus, caplog):
        """Test event publishing with handler that raises exception."""
        error_handler = MockEventHandler()
        error_handler.should_raise = True
        normal_handler = MockEventHandler()

        event_bus.subscribe("TestEvent", error_handler)
        event_bus.subscribe("TestEvent", normal_handler)

        await event_bus.publish("TestEvent", {"test": "data"}, source="TestSource")

        # Give async operations time to complete
        await asyncio.sleep(0.1)

        # Normal handler should still work despite error handler failing
        assert len(normal_handler.handled_events) == 1
        assert "Error handling event TestEvent" in caplog.text

    @pytest.mark.asyncio
    async def test_publish_async_callable(self, event_bus):
        """Test publishing with async callable handler."""
        handled_events = []

        async def async_handler(event):
            handled_events.append(event)

        event_bus.subscribe("TestEvent", async_handler)

        await event_bus.publish("TestEvent", {"async": "data"}, source="AsyncTest")

        # Give async operations time to complete
        await asyncio.sleep(0.1)

        assert len(handled_events) == 1
        assert handled_events[0].data == {"async": "data"}

    def test_get_stats(self, event_bus):
        """Test statistics retrieval."""
        stats = event_bus.get_stats()

        assert "events_published" in stats
        assert "events_handled" in stats
        assert "errors" in stats
        assert stats["events_published"] == 0

    @pytest.mark.asyncio
    async def test_stats_tracking(self, event_bus):
        """Test that statistics are tracked correctly."""
        handler = MockEventHandler()
        event_bus.subscribe("TestEvent", handler)

        await event_bus.publish("TestEvent", {"test": "data"}, source="StatsTest")
        await asyncio.sleep(0.1)

        stats = event_bus.get_stats()
        assert stats["events_published"] == 1
        assert stats["events_handled"] == 1
        assert stats["errors"] == 0

    def test_get_subscriptions(self, event_bus):
        """Test subscription count retrieval."""
        handler1 = MockEventHandler()
        handler2 = MockEventHandler()

        event_bus.subscribe("Event1", handler1)
        event_bus.subscribe("Event1", handler2)
        event_bus.subscribe("Event2", handler1)

        subscriptions = event_bus.get_subscriptions()

        assert subscriptions["Event1"] == 2
        assert subscriptions["Event2"] == 1


class TestQualiaEventHandler:
    """Test suite for QualiaEventHandler."""

    @pytest.mark.asyncio
    async def test_qualia_state_updated_handling(self, caplog):
        """Test handling of QualiaStateUpdated events."""
        with caplog.at_level(logging.INFO):
            handler = QualiaEventHandler("TestHandler")

            event = Event(
                name="QualiaStateUpdated",
                data={"intensity": 0.8, "chaos": 0.2},
                timestamp=1234567890.0,
                source="TestSource",
            )

            await handler.handle(event)

            assert "TestHandler processing QualiaState update" in caplog.text

    @pytest.mark.asyncio
    async def test_other_event_handling(self, caplog):
        """Test handling of non-QualiaState events."""
        with caplog.at_level(logging.DEBUG):
            handler = QualiaEventHandler("TestHandler")

            event = Event(
                name="OtherEvent",
                data={"other": "data"},
                timestamp=1234567890.0,
                source="TestSource",
            )

            await handler.handle(event)

            assert "TestHandler ignoring event: OtherEvent" in caplog.text


class TestEventBusSingleton:
    """Test suite for EventBus singleton pattern."""

    def test_singleton_pattern(self):
        """Test that get_event_bus returns the same instance."""
        reset_event_bus()

        bus1 = get_event_bus()
        bus2 = get_event_bus()

        assert bus1 is bus2

    def test_reset_singleton(self):
        """Test that reset_event_bus creates new instance."""
        bus1 = get_event_bus()
        reset_event_bus()
        bus2 = get_event_bus()

        assert bus1 is not bus2


class TestEventBusIntegration:
    """Integration tests for EventBus with realistic scenarios."""

    @pytest.mark.asyncio
    async def test_multiple_event_types(self):
        """Test handling multiple event types simultaneously."""
        reset_event_bus()
        event_bus = get_event_bus()

        qualia_handler = QualiaEventHandler("QualiaHandler")
        general_handler = MockEventHandler()

        event_bus.subscribe("QualiaStateUpdated", qualia_handler)
        event_bus.subscribe("GeneralEvent", general_handler)
        event_bus.subscribe("QualiaStateUpdated", general_handler)

        # Publish different types of events
        await event_bus.publish(
            "QualiaStateUpdated", {"intensity": 0.5}, source="Frontend"
        )
        await event_bus.publish("GeneralEvent", {"general": "data"}, source="System")

        await asyncio.sleep(0.1)

        # Check that events were handled appropriately
        stats = event_bus.get_stats()
        assert stats["events_published"] == 2
        assert (
            stats["events_handled"] == 3
        )  # 2 for QualiaStateUpdated, 1 for GeneralEvent

        assert len(general_handler.handled_events) == 2

    @pytest.mark.asyncio
    async def test_correlation_id_tracking(self):
        """Test event correlation ID tracking."""
        reset_event_bus()
        event_bus = get_event_bus()

        handler = MockEventHandler()
        event_bus.subscribe("CorrelatedEvent", handler)

        correlation_id = "test-correlation-123"
        await event_bus.publish(
            "CorrelatedEvent",
            {"correlated": "data"},
            source="CorrelationTest",
            correlation_id=correlation_id,
        )

        await asyncio.sleep(0.1)

        assert len(handler.handled_events) == 1
        assert handler.handled_events[0].correlation_id == correlation_id


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
