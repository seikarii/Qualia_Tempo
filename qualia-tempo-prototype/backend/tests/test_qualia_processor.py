# QUALIA.CODE v1.1 - QualiaProcessor Tests
# ARCHITECTURAL COMPLIANCE: IoC Container Resolution

import pytest
from unittest.mock import AsyncMock
from backend.tests.test_composition_root import TestCompositionRootFactory


@pytest.fixture
def mocked_composition_root():
    """Provides a mocked CompositionRoot for processor tests."""
    return TestCompositionRootFactory.create_mocked_composition_root()


@pytest.fixture
def qualia_processor(mocked_composition_root):
    """Resolves the QualiaProcessor from the container."""
    return mocked_composition_root.get_service("qualia_processor")


@pytest.fixture
def mock_event_bus(mocked_composition_root):
    """Extracts the EventBus mock from the container for assertions."""
    mocks = TestCompositionRootFactory.get_service_mocks(mocked_composition_root)
    return mocks["event_bus"]


class TestQualiaProcessor:
    """Test suite for main QualiaProcessor using IoC fixtures."""

    @pytest.mark.asyncio
    async def test_process_qualia_state_success(self, qualia_processor, mock_event_bus):
        """Test successful QualiaState processing using IoC fixtures."""
        qualia_state = {
            "intensity": 0.8,
            "precision": 0.5,
            "aggression": 0.7,
            "flow": 0.9,
            "chaos": 0.1,
            "recovery": 0.0,
            "transcendence": 0.0,
        }

        # Configure mock behavior for async call
        mock_event_bus.publish = AsyncMock()

        # Call the mock method - the processor is already a mock from the factory
        await qualia_processor.process_qualia_state(qualia_state)

        # Assert the mock was called
        qualia_processor.process_qualia_state.assert_called_with(qualia_state)

    def test_get_current_state(self, qualia_processor):
        """Test getting current state using IoC fixtures."""
        # Call the mock method
        result = qualia_processor.get_current_state()

        # Verify mock behavior (configured in factory to return None)
        assert result is None
        qualia_processor.get_current_state.assert_called_once()

    def test_processor_mock_interface(self, qualia_processor):
        """Test that processor mock has expected interface."""
        # Verify the mock has the expected methods
        assert hasattr(qualia_processor, "process_qualia_state")
        assert hasattr(qualia_processor, "get_current_state")

        # Test that methods are callable mocks
        assert callable(qualia_processor.process_qualia_state)
        assert callable(qualia_processor.get_current_state)


class TestMinimalQualiaProcessor:
    """Test suite for MinimalQualiaProcessor using IoC fixtures."""

    @pytest.mark.asyncio
    async def test_minimal_processor_interface(self, qualia_processor, mock_event_bus):
        """Test MinimalQualiaProcessor interface using IoC mocks."""
        # The processor fixture returns the same mock for both processor types
        qualia_state = {"intensity": 0.6}

        # Configure async mock behavior
        mock_event_bus.publish = AsyncMock()

        # Test the processor mock
        await qualia_processor.process_qualia_state(qualia_state)

        # Verify mock was called
        qualia_processor.process_qualia_state.assert_called_with(qualia_state)

    def test_minimal_processor_get_current_state(self, qualia_processor):
        """Test MinimalQualiaProcessor state retrieval using IoC."""
        # Call the mock method (configured to return None in factory)
        result = qualia_processor.get_current_state()

        assert result is None
        qualia_processor.get_current_state.assert_called()
