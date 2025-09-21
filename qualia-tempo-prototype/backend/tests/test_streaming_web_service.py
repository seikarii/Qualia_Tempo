# QUALIA.CODE v1.1 - Test Suite for StreamingWebService
# Comprehensive unit tests for WebSocket streaming service

import pytest
from unittest.mock import Mock, MagicMock, patch, AsyncMock

from backend.services.StreamingWebService import StreamingWebService
from backend.services.EventBus import EventBus
from backend.services.RenderingService import RenderingService


class TestStreamingWebService:
    """Test suite for StreamingWebService with comprehensive coverage."""

    @pytest.fixture
    def mock_event_bus(self):
        """Create a mock EventBus."""
        event_bus = Mock(spec=EventBus)
        event_bus.subscribe = Mock()
        return event_bus

    @pytest.fixture
    def mock_rendering_service(self):
        """Create a mock RenderingService."""
        service = Mock(spec=RenderingService)
        service.render_frame.return_value = (
            b"\xff\xd8\xff\xe0" + b"\x00" * 1000
        )  # Mock JPEG data
        service.is_initialized = True
        return service

    @pytest.fixture
    def streaming_service(self, mock_event_bus, mock_rendering_service):
        """Create StreamingWebService instance."""
        return StreamingWebService(mock_event_bus, mock_rendering_service)

    def test_initialization(self, mock_event_bus, mock_rendering_service):
        """Test StreamingWebService initialization."""
        service = StreamingWebService(mock_event_bus, mock_rendering_service)

        assert service._event_bus == mock_event_bus
        assert service._rendering_service == mock_rendering_service
        assert service._is_streaming is False
        assert service._connections == set()
        assert service._connected_clients == 0
        assert service._frame_count == 0

    @pytest.mark.asyncio
    async def test_connect_client(self, streaming_service):
        """Test client connection."""
        mock_websocket = MagicMock()
        mock_websocket.accept = AsyncMock()
        mock_websocket.closed = False

        await streaming_service.connect_client(mock_websocket)

        assert mock_websocket in streaming_service._connections
        assert streaming_service._is_streaming is True

    @pytest.mark.asyncio
    async def test_disconnect_client(self, streaming_service):
        """Test client disconnection."""
        mock_websocket = MagicMock()
        streaming_service._connections.add(mock_websocket)

        await streaming_service.disconnect_client(mock_websocket)

        assert mock_websocket not in streaming_service._connections

    @pytest.mark.asyncio
    async def test_start_streaming_initializes_loop(
        self, streaming_service, mock_rendering_service
    ):
        """Test that _start_streaming initializes the streaming loop."""
        with patch.object(streaming_service, "_streaming_loop") as mock_loop:
            mock_loop.return_value = AsyncMock()

            await streaming_service._start_streaming()

            mock_loop.assert_called_once()

    @pytest.mark.asyncio
    async def test_streaming_loop_calls_render_and_broadcast(
        self, streaming_service, mock_rendering_service
    ):
        """Test that streaming loop calls render_frame and broadcast_frame."""
        # Add a mock client
        mock_websocket = MagicMock()
        mock_websocket.closed = False
        streaming_service._connections.add(mock_websocket)
        streaming_service._is_streaming = True

        with patch.object(
            streaming_service, "_broadcast_frame"
        ) as mock_broadcast, patch(
            "asyncio.sleep", new_callable=AsyncMock
        ) as mock_sleep:

            # Make the loop run once then stop
            streaming_service._is_streaming = True

            async def stop_after_one_iteration(*args):
                streaming_service._is_streaming = False

            mock_sleep.side_effect = stop_after_one_iteration

            await streaming_service._streaming_loop()

            # Verify render_frame was called
            mock_rendering_service.render_frame.assert_called()

            # Verify broadcast was called with frame data
            mock_broadcast.assert_called()

    @pytest.mark.asyncio
    async def test_broadcast_frame_sends_to_clients(self, streaming_service):
        """Test that _broadcast_frame sends data to all connected clients."""
        # Setup mock clients
        mock_client1 = MagicMock()
        mock_client1.send = AsyncMock()
        mock_client1.closed = False

        mock_client2 = MagicMock()
        mock_client2.send = AsyncMock()
        mock_client2.closed = False

        streaming_service._connections = {mock_client1, mock_client2}

        frame_data = b"\xff\xd8\xff\xe0" + b"\x00" * 100

        await streaming_service._broadcast_frame(frame_data)

        # Verify both clients received the frame
        mock_client1.send.assert_called_once_with(frame_data)
        mock_client2.send.assert_called_once_with(frame_data)

    @pytest.mark.asyncio
    async def test_broadcast_frame_handles_client_errors(self, streaming_service):
        """Test that _broadcast_frame handles client send errors gracefully."""
        # Setup mock client that raises exception
        mock_client = MagicMock()
        mock_client.send = AsyncMock(side_effect=Exception("Send failed"))
        mock_client.closed = False

        streaming_service._connections = {mock_client}

        frame_data = b"\xff\xd8\xff\xe0"

        # Should not raise exception
        await streaming_service._broadcast_frame(frame_data)

        # Client should be removed from set after error
        assert mock_client not in streaming_service._connections

    def test_get_status(self, streaming_service):
        """Test get_status returns proper status information."""
        streaming_service._connections = {MagicMock(), MagicMock()}
        streaming_service._connected_clients = 2
        streaming_service._frames_sent = 150
        streaming_service._is_streaming = True

        status = streaming_service.get_status()

        assert status["is_streaming"] is True
        assert status["connected_clients"] == 2
        assert status["total_frames_sent"] == 150
        assert "fps" in status

    @pytest.mark.asyncio
    async def test_stop_streaming(self, streaming_service):
        """Test stop_streaming functionality."""
        streaming_service._is_streaming = True

        await streaming_service._stop_streaming()

        assert streaming_service._is_streaming is False


if __name__ == "__main__":
    pytest.main([__file__])
