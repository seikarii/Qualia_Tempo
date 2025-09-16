# QUALIA.CODE v1.0 - QualiaProcessor Tests

import pytest
from unittest.mock import MagicMock, AsyncMock
from backend.services.QualiaProcessor import QualiaProcessor, MinimalQualiaProcessor
from backend.services.EventBus import EventBus


class TestQualiaProcessor:
    """Test suite for main QualiaProcessor."""

    def setup_method(self):
        """Setup test fixtures."""
        self.mock_event_bus = MagicMock(spec=EventBus)
        self.mock_event_bus.publish = AsyncMock()
        self.processor = QualiaProcessor(self.mock_event_bus)

    @pytest.mark.asyncio
    async def test_process_qualia_state_success(self):
        """Test successful QualiaState processing."""
        qualia_state = {
            "intensity": 0.8,
            "precision": 0.5,
            "aggression": 0.7,
            "flow": 0.9,
            "chaos": 0.1,
            "recovery": 0.0,
            "transcendence": 0.0,
        }

        await self.processor.process_qualia_state(qualia_state)

        assert self.processor._current_state == qualia_state
        self.mock_event_bus.publish.assert_called_once()

    @pytest.mark.asyncio
    async def test_process_qualia_state_disabled(self):
        """Test processing when disabled."""
        self.processor.disable_processing()
        qualia_state = {"intensity": 0.5}

        await self.processor.process_qualia_state(qualia_state)

        # Should not publish when disabled
        self.mock_event_bus.publish.assert_not_called()

    def test_get_current_state(self):
        """Test getting current state."""
        assert self.processor.get_current_state() is None

        qualia_state = {"intensity": 0.7}
        self.processor._current_state = qualia_state
        assert self.processor.get_current_state() == qualia_state

    def test_enable_disable_processing(self):
        """Test enabling and disabling processing."""
        # Initially enabled
        assert self.processor._processing_enabled is True

        # Disable
        self.processor.disable_processing()
        assert self.processor._processing_enabled is False

        # Enable
        self.processor.enable_processing()
        assert self.processor._processing_enabled is True

    @pytest.mark.asyncio
    async def test_shutdown(self):
        """Test shutdown functionality."""
        await self.processor.shutdown()
        # Should not raise any exceptions
        assert True

    @pytest.mark.asyncio
    async def test_analyze_state_changes(self):
        """Test state change analysis."""
        new_state = {
            "intensity": 0.8,
            "precision": 0.5,
            "aggression": 0.7,
            "flow": 0.9,
            "chaos": 0.1,
            "recovery": 0.0,
            "transcendence": 0.0,
        }

        await self.processor._analyze_state_changes(new_state)
        # Should not raise any exceptions
        assert True


class TestMinimalQualiaProcessor:
    """Test suite for MinimalQualiaProcessor fallback."""

    def setup_method(self):
        """Setup test fixtures."""
        self.mock_event_bus = MagicMock(spec=EventBus)
        self.mock_event_bus.publish = AsyncMock()
        self.processor = MinimalQualiaProcessor(self.mock_event_bus)

    @pytest.mark.asyncio
    async def test_process_qualia_state(self):
        """Test basic QualiaState processing."""
        qualia_state = {"intensity": 0.6}

        await self.processor.process_qualia_state(qualia_state)

        self.mock_event_bus.publish.assert_called_once()

    def test_get_current_state(self):
        """Test getting current state (should be None)."""
        assert self.processor.get_current_state() is None

    def test_enable_disable_processing(self):
        """Test enable/disable methods (should be no-ops)."""
        # Should not raise any exceptions
        self.processor.enable_processing()
        self.processor.disable_processing()
        assert True

    @pytest.mark.asyncio
    async def test_shutdown(self):
        """Test shutdown functionality."""
        await self.processor.shutdown()
        # Should not raise any exceptions
        assert True
