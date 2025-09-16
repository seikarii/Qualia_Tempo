# QUALIA.CODE v1.0 - CompositionRoot Tests
# Comprehensive testing for IoC container and service dependencies

import pytest
import asyncio
from unittest.mock import Mock, patch
import sys
import os

# Add project root to path for imports
sys.path.insert(
    0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)

from backend.CompositionRoot import (
    CompositionRoot,
    get_composition_root,
    reset_composition_root,
)
from backend.services.EventBus import EventBus


class TestCompositionRoot:
    """Test suite for CompositionRoot IoC container."""

    @pytest.fixture
    def composition_root(self):
        """Create a fresh CompositionRoot for each test."""
        reset_composition_root()
        return CompositionRoot()

    @pytest.mark.asyncio
    async def test_initialization(self, composition_root):
        """Test CompositionRoot initialization."""
        assert not composition_root._initialized

        await composition_root.initialize()

        assert composition_root._initialized
        assert "event_bus" in composition_root._services
        assert "particle_system" in composition_root._services
        assert "qualia_processor" in composition_root._services

    @pytest.mark.asyncio
    async def test_double_initialization_warning(self, composition_root, caplog):
        """Test that double initialization produces a warning."""
        await composition_root.initialize()
        await composition_root.initialize()  # Second call

        assert "CompositionRoot already initialized" in caplog.text

    @pytest.mark.asyncio
    async def test_service_retrieval(self, composition_root):
        """Test service retrieval after initialization."""
        await composition_root.initialize()

        event_bus = composition_root.get_event_bus()
        particle_system = composition_root.get_particle_system()
        qualia_processor = composition_root.get_qualia_processor()

        assert isinstance(event_bus, EventBus)
        assert event_bus is not None
        assert particle_system is not None
        assert qualia_processor is not None

    def test_service_retrieval_before_initialization(self, composition_root):
        """Test that service retrieval fails before initialization."""
        with pytest.raises(ValueError, match="CompositionRoot not initialized"):
            composition_root.get_service("event_bus")

    def test_invalid_service_name(self, composition_root):
        """Test retrieval of non-existent service."""
        composition_root._initialized = True  # Bypass initialization check

        with pytest.raises(ValueError, match="Service 'invalid_service' not found"):
            composition_root.get_service("invalid_service")

    @pytest.mark.asyncio
    async def test_shutdown(self, composition_root):
        """Test graceful shutdown of services."""
        await composition_root.initialize()

        # Mock service with shutdown method
        mock_service = Mock()
        mock_service.shutdown = Mock(return_value=None)
        composition_root._services["mock_service"] = mock_service

        await composition_root.shutdown()

        mock_service.shutdown.assert_called_once()
        assert not composition_root._initialized
        assert len(composition_root._services) == 0

    @pytest.mark.asyncio
    async def test_shutdown_with_async_service(self, composition_root):
        """Test shutdown with async service shutdown method."""
        await composition_root.initialize()

        # Mock async service
        mock_service = Mock()

        async def async_shutdown():
            pass

        mock_service.shutdown = async_shutdown
        composition_root._services["async_mock"] = mock_service

        # Should not raise an error
        await composition_root.shutdown()

        assert not composition_root._initialized

    @pytest.mark.asyncio
    async def test_shutdown_with_error(self, composition_root, caplog):
        """Test shutdown handles service errors gracefully."""
        await composition_root.initialize()

        # Mock service that raises error on shutdown
        mock_service = Mock()
        mock_service.shutdown = Mock(side_effect=Exception("Shutdown error"))
        composition_root._services["error_service"] = mock_service

        await composition_root.shutdown()

        assert "Error shutting down error_service" in caplog.text
        assert not composition_root._initialized

    @pytest.mark.asyncio
    @patch("backend.engine.qualia_particle_engine.QualiaParticleEngine")
    async def test_particle_system_initialization_failure(
        self, mock_particle_class, composition_root, caplog
    ):
        """Test fallback when QualiaParticleEngine initialization fails."""
        mock_particle_class.side_effect = Exception("Particle engine init failed")

        with pytest.raises(Exception):
            await composition_root.initialize()

    def test_singleton_pattern(self):
        """Test that get_composition_root returns the same instance."""
        reset_composition_root()

        root1 = get_composition_root()
        root2 = get_composition_root()

        assert root1 is root2

    def test_reset_singleton(self):
        """Test that reset_composition_root creates new instance."""
        root1 = get_composition_root()
        reset_composition_root()
        root2 = get_composition_root()

        assert root1 is not root2


class TestCompositionRootIntegration:
    """Integration tests for CompositionRoot with real services."""

    @pytest.mark.asyncio
    async def test_event_bus_integration(self):
        """Test that EventBus integration works correctly."""
        reset_composition_root()
        composition_root = get_composition_root()

        await composition_root.initialize()

        event_bus = composition_root.get_event_bus()

        # Test event publishing
        received_events = []

        def test_handler(event):
            received_events.append(event)

        event_bus.subscribe("TestEvent", test_handler)
        await event_bus.publish("TestEvent", {"test": "data"}, source="Test")

        # Give async operations time to complete
        await asyncio.sleep(0.1)

        assert len(received_events) == 1
        assert received_events[0].name == "TestEvent"
        assert received_events[0].data == {"test": "data"}

        await composition_root.shutdown()

    @pytest.mark.asyncio
    async def test_qualia_processor_integration(self):
        """Test QualiaProcessor integration through CompositionRoot."""
        reset_composition_root()
        composition_root = get_composition_root()

        await composition_root.initialize()

        qualia_processor = composition_root.get_qualia_processor()

        # Test QualiaState processing
        test_state = {
            "intensity": 0.8,
            "precision": 0.6,
            "aggression": 0.4,
            "flow": 0.9,
            "chaos": 0.2,
            "recovery": 0.1,
            "transcendence": 0.0,
        }

        await qualia_processor.process_qualia_state(test_state)

        current_state = qualia_processor.get_current_state()
        assert current_state == test_state

        await composition_root.shutdown()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
