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

        # ARCHITECTURE.GOLD.CODE v2: OpenGL context removed
        # QualiaParticleEngine v2 no longer requires ctx, shader_inspector parameters

        # 2. Create REAL instance of QualiaParticleEngine with mocked dependencies
        particle_engine_instance = QualiaParticleEngine(
            event_bus=mock_event_bus,
            max_particles=1000,
            enable_metrics=True,
        )

        # 3. Create mocks for other services (these remain mocked as they are not the SUT)
        mock_qualia_processor = Mock()
        mock_qualia_processor.process_qualia_state = AsyncMock()
        mock_qualia_processor.get_current_state = Mock(return_value=None)

        # ARCHITECTURE.GOLD.CODE: RenderingService and StreamingWebService removed
        # Backend no longer performs video rendering or streaming
        
        # StateStreamingService mock (for state-only streaming)
        mock_state_streaming_service = Mock()
        mock_state_streaming_service.start = AsyncMock()
        mock_state_streaming_service.stop = AsyncMock()
        mock_state_streaming_service.send_state = AsyncMock()
        mock_state_streaming_service.get_active_connections = Mock(return_value=0)
        mock_state_streaming_service.shutdown = AsyncMock()
        
        # ARCHITECTURE.GOLD.CODE: All video streaming behavior removed
        # StateStreamingService handles state-only streaming (no frames)

        # Create MOCK SecurityService for testing
        mock_security_service = Mock()
        mock_security_service.validate_token = Mock(return_value=True)
        mock_security_service.generate_token = Mock(return_value="mock_token")

        # Create REAL FileSystemService from container (Phase 1 migration)
        from backend.services.interfaces.IFileSystemService import IFileSystemService
        from backend.services.container_config import get_configured_container
        
        # Get configured container
        test_container = get_configured_container()
        filesystem_service = test_container.resolve(IFileSystemService)  # type: ignore[type-abstract]

        # Create REAL PersistenceService with real FileSystemService
        from backend.services.PersistenceService import PersistenceService
        persistence_service = PersistenceService(file_system_service=filesystem_service)
        persistence_service.initialize()

        # Create REAL ParticleEnginePoolManager from container (unstarted - tests will start it)
        # Phase 2.1: Now uses container for proper IoC
        # Note: We don't start it here because start() is async
        from backend.services.interfaces.IParticleEnginePoolManager import IParticleEnginePoolManager
        from backend.services.container_config import get_configured_container
        
        # Get configured container with ParticleEnginePoolManager registered
        test_container = get_configured_container()
        particle_pool_manager = test_container.resolve(IParticleEnginePoolManager)  # type: ignore[type-abstract]
        
        # Create REAL GameLogicService from container (Phase 2.2)
        from backend.services.interfaces.IGameLogicService import IGameLogicService
        game_logic_service = test_container.resolve(IGameLogicService)  # type: ignore[type-abstract]
        
        # Create REAL HarmonyAnalysisService from container (Phase 2.3)
        from backend.services.interfaces.IHarmonyAnalysisService import IHarmonyAnalysisService
        harmony_analysis_service = test_container.resolve(IHarmonyAnalysisService)  # type: ignore[type-abstract]
        
        # Create REAL BossAIService from container (Phase 2.4)
        from backend.services.interfaces.IBossAIService import IBossAIService
        boss_ai_service = test_container.resolve(IBossAIService)  # type: ignore[type-abstract]
        
        # Create REAL PatternSystemService from container (Phase 2.5)
        from backend.services.interfaces.IBossAIService import IPatternSystemService
        pattern_system_service = test_container.resolve(IPatternSystemService)  # type: ignore[type-abstract]

        # 4. Inject services into composition root
        composition_root._services = {
            "event_bus": mock_event_bus,
            "shader_introspection_service": mock_shader_inspector,
            "particle_system": particle_engine_instance,  # REAL ENGINE (legacy)
            "qualia_processor": mock_qualia_processor,
            # ARCHITECTURE.GOLD.CODE: rendering_service and streaming_service removed
            "state_streaming_service": mock_state_streaming_service,  # State-only streaming
            "security_service": mock_security_service,  # MOCK SECURITY SERVICE
            "filesystem_service": filesystem_service,  # REAL FileSystemService
            "persistence_service": persistence_service,  # REAL PersistenceService
            "particle_pool_manager": particle_pool_manager,  # REAL ParticleEnginePoolManager (unstarted)
            "game_logic_service": game_logic_service,  # REAL GameLogicService (Phase 2.2)
            "harmony_analysis_service": harmony_analysis_service,  # REAL HarmonyAnalysisService (Phase 2.3)
            "boss_ai_service": boss_ai_service,  # REAL BossAIService (Phase 2.4)
            "pattern_system_service": pattern_system_service,  # REAL PatternSystemService (Phase 2.5)
        }
        composition_root._initialized = True

        # Helper to retrieve all mocks at once
        # ARCHITECTURE.GOLD.CODE v2: ctx removed (no longer needed)
        composition_root.get_all_mocks = lambda: {  # type: ignore[attr-defined]
            "event_bus": mock_event_bus,
            "shader_inspector": mock_shader_inspector,
        }

        return composition_root

    @staticmethod
    def get_service_mocks(composition_root: CompositionRoot) -> Dict[str, Mock]:
        """
        Extract all service mocks from a test CompositionRoot.

        NOTE: particle_engine is now the REAL implementation, not a mock.
        Use get_all_mocks() to get the dependency mocks for the particle engine.

        ARCHITECTURE.GOLD.CODE: rendering_service and streaming_service removed.
        Backend no longer performs video rendering or streaming.

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
            # ARCHITECTURE.GOLD.CODE: rendering_service and streaming_service removed
            "state_streaming_service": composition_root.get_service(
                "state_streaming_service"
            ),  # Mock - State-only streaming
            "shader_introspection_service": composition_root.get_service(
                "shader_introspection_service"
            ),  # Mock
            "security_service": composition_root.get_service(
                "security_service"
            ),  # REAL SUT
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
        mocked_composition_root.get_all_mocks()

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
        # ARCHITECTURE.GOLD.CODE v2: QualiaParticleEngine now has update() instead of compute_step()
        assert hasattr(particle_engine, "update")  # Real v2 method exists
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
        dependency_mocks["event_bus"]

        # Step 3: Resolve REAL Service Under Test
        sut = mocked_composition_root.get_service("particle_system")

        # Step 4: Configure mock behaviors if needed
        # (Not needed for this simple test)

        # Step 5: Exercise the REAL SUT
        # ARCHITECTURE.GOLD.CODE v2: Use get_statistics() instead of get_current_parameters()
        stats = sut.get_statistics()

        # Step 6: Assert on REAL results and mock interactions
        assert stats is not None
        # v2 statistics structure includes max_particles and particles_initialized
        assert "max_particles" in stats
        assert stats["max_particles"] == 1000  # From our test setup
        assert "particles_initialized" in stats
        assert stats["particles_initialized"] is False  # No particles initialized yet

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
        # EventBus uses 'type' not 'name' for event identification
        assert received_events[0].type == "TestEvent"
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
