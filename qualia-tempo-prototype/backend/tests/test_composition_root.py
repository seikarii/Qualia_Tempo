# QUALIA.CODE v1.1 - CompositionRoot Tests & Test Factory Strategy
# Comprehensive testing for IoC container and service dependencies
# SUPREME ARCHITECTURAL COMPLIANCE: ZERO TOLERANCE FOR MANUAL INSTANTIATION

import pytest
import asyncio
from unittest.mock import Mock, patch, MagicMock, AsyncMock
import sys
import os
from typing import Any, Dict, Optional

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


class TestCompositionRootFactory:
    """
    QUALIA.CODE v1.1 Test Factory for Backend Services
    
    This factory creates properly mocked CompositionRoot instances for testing,
    ensuring all services are resolved with controlled dependencies.
    
    CRITICAL MANDATE: NO manual service instantiation in tests.
    ALL services MUST be resolved through the mocked CompositionRoot.
    """
    
    @staticmethod
    def create_mocked_composition_root() -> CompositionRoot:
        """
        Create a CompositionRoot with all services mocked for testing.
        
        Returns:
            CompositionRoot with mocked services but real initialization logic
        """
        reset_composition_root()
        composition_root = CompositionRoot()
        
        # Mock all services with proper interfaces
        mock_event_bus = Mock(spec=EventBus)
        mock_event_bus.subscribe = Mock()
        mock_event_bus.unsubscribe = Mock()
        mock_event_bus.publish = Mock()
        mock_event_bus._handlers = {}
        mock_event_bus.get_stats = Mock(return_value={
            "total_handlers": 0,
            "total_events_published": 0
        })
        
        mock_particle_engine = Mock()
        mock_particle_engine.initialize_buffers = Mock(return_value=True)
        mock_particle_engine.update_uniform_buffer = Mock()
        mock_particle_engine.get_stats = Mock(return_value={
            "particles": 1000,
            "gpu_available": True
        })
        
        mock_qualia_processor = Mock()
        mock_qualia_processor.process_qualia_state = AsyncMock()
        mock_qualia_processor.get_current_state = Mock(return_value=None)
        
        mock_rendering_service = Mock()
        mock_rendering_service.initialize = Mock(return_value=True)
        mock_rendering_service.render_frame = Mock(return_value=b"fake_frame_data")
        
        mock_streaming_service = Mock()
        mock_streaming_service.start_streaming = Mock()
        mock_streaming_service.stop_streaming = Mock()
        
        mock_shader_introspection = Mock()
        mock_shader_introspection.introspect = Mock(return_value={
            'uniforms': [('time', 'float', 0), ('particle_count', 'int', 4)],
            'struct_format': 'fi',
            'total_size': 8
        })
        
        # Inject mocks into composition root
        composition_root._services = {
            "event_bus": mock_event_bus,
            "shader_introspection_service": mock_shader_introspection,
            "particle_system": mock_particle_engine,
            "qualia_processor": mock_qualia_processor,
            "rendering_service": mock_rendering_service,
            "streaming_service": mock_streaming_service,
        }
        composition_root._initialized = True
        
        return composition_root
    
    @staticmethod
    def get_service_mocks(composition_root: CompositionRoot) -> Dict[str, Mock]:
        """
        Extract all service mocks from a test CompositionRoot.
        
        Args:
            composition_root: The mocked CompositionRoot instance
            
        Returns:
            Dictionary mapping service names to their mock instances
        """
        return {
            "event_bus": composition_root.get_service("event_bus"),
            "particle_engine": composition_root.get_service("particle_system"),
            "qualia_processor": composition_root.get_service("qualia_processor"),
            "rendering_service": composition_root.get_service("rendering_service"),
            "streaming_service": composition_root.get_service("streaming_service"),
        }


class TestCompositionRoot:
    """Test suite for CompositionRoot IoC container."""

    @pytest.fixture
    def composition_root(self):
        """Create a fresh CompositionRoot for each test."""
        reset_composition_root()
        return CompositionRoot()
    
    @pytest.fixture
    def mocked_composition_root(self):
        """Create a fully mocked CompositionRoot for each test."""
        return TestCompositionRootFactory.create_mocked_composition_root()

    @pytest.mark.asyncio
    async def test_mocked_service_isolation(self, mocked_composition_root):
        """
        Test that mocked services are properly isolated and controllable.
        
        This demonstrates the QUALIA.CODE testing philosophy:
        - Services Under Test are resolved from the container
        - Dependencies are mocked for isolation
        - Behavior is predictable and verifiable
        """
        # Arrange: Get service mocks
        mocks = TestCompositionRootFactory.get_service_mocks(mocked_composition_root)
        event_bus_mock = mocks["event_bus"]
        processor_mock = mocks["qualia_processor"]
        
        # Act: Use the service through the container
        event_bus = mocked_composition_root.get_service("event_bus")
        processor = mocked_composition_root.get_service("qualia_processor")
        
        # Verify services are the same mock instances
        assert event_bus is event_bus_mock
        assert processor is processor_mock
        
        # Act: Call methods on resolved services
        event_bus.subscribe("TestEvent", lambda x: None)
        # For async mocks, we need to use AsyncMock or handle differently
        processor_mock.process_qualia_state.return_value = None  # Make it return None instead of awaiting
        processor.process_qualia_state({"intensity": 0.5})  # Don't await the mock
        
        # Assert: Verify mock interactions
        event_bus_mock.subscribe.assert_called_once()
        processor_mock.process_qualia_state.assert_called_once_with({"intensity": 0.5})
    
    def test_example_service_under_test_pattern(self, mocked_composition_root):
        """
        Example test demonstrating the correct pattern for testing a service.
        
        PATTERN:
        1. Get mocked CompositionRoot from factory
        2. Extract dependency mocks
        3. Resolve Service Under Test from container
        4. Configure mock behaviors
        5. Exercise the SUT
        6. Assert on mock interactions
        """
        # Step 1: mocked_composition_root from fixture
        
        # Step 2: Extract dependency mocks
        mocks = TestCompositionRootFactory.get_service_mocks(mocked_composition_root)
        event_bus_mock = mocks["event_bus"]
        
        # Step 3: Resolve Service Under Test
        # In a real test, this would be your actual service class
        sut = mocked_composition_root.get_service("particle_system")
        
        # Step 4: Configure mock behaviors
        # For async operations, we can configure them at test time
        
        # Step 5: Exercise the SUT
        stats = sut.get_stats()
        
        # Step 6: Assert on results and mock interactions
        assert stats is not None
        assert "particles" in stats
        sut.get_stats.assert_called_once()

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
