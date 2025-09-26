# QUALIA.CODE v1.1 - CompositionRoot Tests & Test Factory Strategy
# Comprehensive testing for IoC container and service dependencies
# SUPREME ARCHITECTURAL COMPLIANCE: ZERO TOLERANCE FOR MANUAL INSTANTIATION

import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
import sys
import os
from typing import Dict

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
from backend.services.ShaderIntrospectionService import ShaderIntrospectionService
from backend.engine.qualia_particle_engine import QualiaParticleEngine


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
        Create a CompositionRoot with REAL QualiaParticleEngine and mocked dependencies.

        QUALIA.CODE CORRECTION: The particle engine is now the REAL implementation
        with mocked dependencies, allowing us to test actual logic instead of mocks.

        Returns:
            CompositionRoot with real particle engine and mocked dependencies
        """
        reset_composition_root()
        composition_root = CompositionRoot()

        # 1. Create Mocks for all dependencies
        mock_event_bus = Mock(spec=EventBus)
        mock_event_bus.subscribe = Mock()
        mock_event_bus.unsubscribe = Mock()
        mock_event_bus.publish = AsyncMock()
        mock_event_bus._handlers = {}
        mock_event_bus.get_stats = Mock(
            return_value={
                "total_handlers": 0,
                "total_events_published": 0,
                "events_published": 0,
                "events_handled": 0,
                "errors": 0,
            }
        )
        mock_event_bus.get_subscriptions = Mock(return_value={"Event1": 2, "Event2": 1})

        mock_shader_inspector = Mock(spec=ShaderIntrospectionService)
        mock_shader_inspector.introspect = Mock(
            return_value={
                "uniforms": [("time", "float", 0), ("particle_count", "int", 4)],
                "struct_format": "fi",
                "total_size": 8,
            }
        )
        mock_shader_inspector.shutdown = AsyncMock()

        # Mock the moderngl context
        mock_ctx = Mock()

        # 2. Create REAL instance of QualiaParticleEngine with mocked dependencies
        particle_engine_instance = QualiaParticleEngine(
            ctx=None,  # Pass None to avoid shader initialization in tests
            event_bus=mock_event_bus,
            shader_inspector=mock_shader_inspector,
            max_particles=1000,
            enable_metrics=True,
        )

        # 3. Create mocks for other services (these remain mocked as they are not the SUT)
        mock_qualia_processor = Mock()
        mock_qualia_processor.process_qualia_state = AsyncMock()
        mock_qualia_processor.get_current_state = Mock(return_value=None)

        mock_rendering_service = Mock()
        mock_rendering_service.initialize = Mock(return_value=True)
        mock_rendering_service.render_frame = Mock(return_value=b"fake_frame_data")
        mock_rendering_service.shutdown = AsyncMock()

        mock_streaming_service = Mock()
        mock_streaming_service.start_streaming = AsyncMock()
        mock_streaming_service.stop_streaming = AsyncMock()
        mock_streaming_service.handle_client_message = AsyncMock()
        mock_streaming_service.connect_client = AsyncMock()
        mock_streaming_service.disconnect_client = AsyncMock()
        mock_streaming_service._start_streaming = AsyncMock()
        mock_streaming_service._stop_streaming = AsyncMock()
        mock_streaming_service._streaming_loop = AsyncMock()
        mock_streaming_service._broadcast_frame = AsyncMock()

        # Create dynamic behavior for connect_client
        async def connect_client_side_effect(websocket):
            mock_streaming_service._connections.add(websocket)
            mock_streaming_service._connected_clients = len(
                mock_streaming_service._connections
            )
            if mock_streaming_service._connected_clients == 1:
                if hasattr(mock_streaming_service, "_start_streaming"):
                    await mock_streaming_service._start_streaming()

        # Create dynamic behavior for disconnect_client
        async def disconnect_client_side_effect(websocket):
            mock_streaming_service._connections.discard(websocket)
            mock_streaming_service._connected_clients = len(
                mock_streaming_service._connections
            )
            if mock_streaming_service._connected_clients == 0:
                if hasattr(mock_streaming_service, "_stop_streaming"):
                    await mock_streaming_service._stop_streaming()

        # Create dynamic behavior for handle_client_message
        async def handle_client_message_side_effect(websocket, message):
            if message.get("type") == "ping":
                await websocket.send_json(
                    {
                        "type": "pong",
                        "timestamp": message.get("timestamp"),
                        "pingId": message.get("pingId"),
                    }
                )
            elif message.get("type") == "quality_change":
                mock_streaming_service._compression_quality = message.get("quality", 70)
            elif message.get("type") == "fps_change":
                mock_streaming_service._target_fps = message.get("fps", 30.0)

        # Create dynamic behavior for _broadcast_frame
        async def broadcast_frame_side_effect(frame_data):
            to_remove = set()
            for websocket in mock_streaming_service._connections.copy():
                try:
                    if hasattr(websocket, "send_json"):
                        await websocket.send_json(
                            {"type": "frame", "data": frame_data.decode("latin-1")}
                        )
                    elif hasattr(websocket, "send"):
                        await websocket.send(frame_data)
                    else:
                        pass
                except Exception:
                    to_remove.add(websocket)

            mock_streaming_service._connections -= to_remove

        # Create dynamic behavior for shutdown
        async def shutdown_side_effect():
            if hasattr(mock_streaming_service, "_stop_streaming"):
                await mock_streaming_service._stop_streaming()

            for websocket in mock_streaming_service._connections.copy():
                if hasattr(websocket, "close"):
                    await websocket.close()

            mock_streaming_service._connections.clear()

        mock_streaming_service.handle_client_message.side_effect = (
            handle_client_message_side_effect
        )
        mock_streaming_service._broadcast_frame.side_effect = (
            broadcast_frame_side_effect
        )
        mock_streaming_service.shutdown.side_effect = shutdown_side_effect
        mock_streaming_service._connections = set()
        mock_streaming_service._connected_clients = 0
        mock_streaming_service._frames_sent = 0
        mock_streaming_service._is_streaming = False
        mock_streaming_service._particle_engine = (
            particle_engine_instance  # Reference to real engine
        )
        mock_streaming_service._rendering_service = mock_rendering_service

        # Create dynamic get_status method
        def dynamic_get_status():
            return {
                "is_streaming": getattr(mock_streaming_service, "_is_streaming", False),
                "connected_clients": getattr(
                    mock_streaming_service, "_connected_clients", 0
                ),
                "frames_sent": getattr(mock_streaming_service, "_frames_sent", 0),
                "total_frames_sent": getattr(mock_streaming_service, "_frames_sent", 0),
                "bytes_sent": 0,
                "target_fps": getattr(mock_streaming_service, "_target_fps", 30.0),
                "compression_quality": getattr(
                    mock_streaming_service, "_compression_quality", 70
                ),
                "rendering_service_initialized": True,
                "fps": 30.0,
            }

        mock_streaming_service.get_status = Mock(side_effect=dynamic_get_status)

        # 4. Inject services into composition root
        composition_root._services = {
            "event_bus": mock_event_bus,
            "shader_introspection_service": mock_shader_inspector,
            "particle_system": particle_engine_instance,  # REAL ENGINE
            "qualia_processor": mock_qualia_processor,
            "rendering_service": mock_rendering_service,
            "streaming_service": mock_streaming_service,
        }
        composition_root._initialized = True

        # Helper to retrieve all mocks at once
        composition_root.get_all_mocks = lambda: {
            "event_bus": mock_event_bus,
            "shader_inspector": mock_shader_inspector,
            "ctx": mock_ctx,
        }

        return composition_root

    @staticmethod
    def get_service_mocks(composition_root: CompositionRoot) -> Dict[str, Mock]:
        """
        Extract all service mocks from a test CompositionRoot.

        NOTE: particle_engine is now the REAL implementation, not a mock.
        Use get_all_mocks() to get the dependency mocks for the particle engine.

        Args:
            composition_root: The mocked CompositionRoot instance

        Returns:
            Dictionary mapping service names to their mock instances (or real for SUT)
        """
        return {
            "event_bus": composition_root.get_service("event_bus"),  # Mock
            "particle_engine": composition_root.get_service(
                "particle_system"
            ),  # REAL SUT
            "qualia_processor": composition_root.get_service(
                "qualia_processor"
            ),  # Mock
            "rendering_service": composition_root.get_service(
                "rendering_service"
            ),  # Mock
            "streaming_service": composition_root.get_service(
                "streaming_service"
            ),  # Mock
            "shader_introspection_service": composition_root.get_service(
                "shader_introspection_service"
            ),  # Mock
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
        Test that mocked services are properly isolated and the SUT is real.

        QUALIA.CODE CORRECTION: This demonstrates the corrected testing philosophy:
        - Services Under Test (particle_engine) are REAL implementations
        - Dependencies are mocked for isolation
        - Behavior is predictable and verifiable
        """
        # Arrange: Get service mocks and real SUT
        mocks = TestCompositionRootFactory.get_service_mocks(mocked_composition_root)
        dependency_mocks = mocked_composition_root.get_all_mocks()

        event_bus_mock = mocks["event_bus"]
        qualia_processor_mock = mocks["qualia_processor"]
        particle_engine_sut = mocks["particle_engine"]  # This is now REAL

        # Act: Use the services through the container
        event_bus = mocked_composition_root.get_service("event_bus")
        processor = mocked_composition_root.get_service("qualia_processor")
        particle_engine = mocked_composition_root.get_service("particle_system")

        # Verify mocked services are mock instances
        assert event_bus is event_bus_mock
        assert processor is qualia_processor_mock

        # Verify SUT is real instance
        assert particle_engine is particle_engine_sut
        assert hasattr(particle_engine, "compute_step")  # Real method exists
        assert not hasattr(particle_engine, "assert_called_once")  # Not a mock

        # Act: Call methods on resolved services
        event_bus.subscribe("TestEvent", lambda x: None)
        await processor.process_qualia_state({"intensity": 0.5})

        # Assert: Verify mock interactions
        event_bus_mock.subscribe.assert_called_once()
        qualia_processor_mock.process_qualia_state.assert_called_once_with(
            {"intensity": 0.5}
        )

    def test_example_service_under_test_pattern(self, mocked_composition_root):
        """
        Example test demonstrating the CORRECTED QUALIA.CODE pattern for testing a service.

        CORRECTED PATTERN:
        1. Get mocked CompositionRoot from factory
        2. Extract dependency mocks for the SUT
        3. Resolve REAL Service Under Test from container
        4. Configure mock behaviors if needed
        5. Exercise the REAL SUT logic
        6. Assert on results and mock interactions
        """
        # Step 1: mocked_composition_root from fixture

        # Step 2: Extract dependency mocks for the SUT
        dependency_mocks = mocked_composition_root.get_all_mocks()
        event_bus_mock = dependency_mocks["event_bus"]

        # Step 3: Resolve REAL Service Under Test
        sut = mocked_composition_root.get_service("particle_system")

        # Step 4: Configure mock behaviors if needed
        # (Not needed for this simple test)

        # Step 5: Exercise the REAL SUT
        params = sut.get_current_parameters()

        # Step 6: Assert on REAL results and mock interactions
        assert params is not None
        assert "max_particles" in params
        assert params["max_particles"] == 1000  # From our test setup
        assert params["status"] == "initialized"

        # The real method should have been called, not a mock
        # This proves we're testing real logic, not mocks

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

        assert "Error during shutdown of error_service" in caplog.text
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
