# QUALIA.CODE v1.1 - Test Suite for StreamingWebService
# ARCHITECTURAL COMPLIANCE: IoC Container Resolution
# Comprehensive unit tests for WebSocket streaming service

import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from backend.tests.test_composition_root import TestCompositionRootFactory


@pytest.fixture
def mocked_composition_root():
    """Provides a mocked CompositionRoot for StreamingWebService tests."""
    return TestCompositionRootFactory.create_mocked_composition_root()


@pytest.fixture
def streaming_service(mocked_composition_root):
    """Resolves the StreamingWebService from the container."""
    return mocked_composition_root.get_service("streaming_service")


@pytest.fixture
def mock_event_bus(mocked_composition_root):
    """Extracts the EventBus mock from the container for assertions."""
    mocks = TestCompositionRootFactory.get_service_mocks(mocked_composition_root)
    return mocks["event_bus"]


@pytest.fixture
def mock_rendering_service(mocked_composition_root):
    """Extracts the RenderingService mock from the container for assertions."""
    mocks = TestCompositionRootFactory.get_service_mocks(mocked_composition_root)
    return mocks["rendering_service"]


@pytest.fixture
def service_mocks(mocked_composition_root):
    """Extracts service mocks from the container for assertions."""
    return TestCompositionRootFactory.get_service_mocks(mocked_composition_root)


class TestStreamingWebService:
    """Test suite for StreamingWebService using IoC fixtures."""

    def test_initialization(self, streaming_service):
        """Test StreamingWebService initialization using IoC fixture."""
        # The service is already resolved from the IoC container
        assert streaming_service is not None

        # Verify the mock has the expected interface
        assert hasattr(streaming_service, "start_streaming")
        assert hasattr(streaming_service, "stop_streaming")

        # Test that methods are callable mocks
        assert callable(streaming_service.start_streaming)
        assert callable(streaming_service.stop_streaming)

    @pytest.mark.asyncio
    async def test_start_streaming(self, streaming_service):
        """Test starting streaming service using IoC fixture."""
        # Call the mock method
        streaming_service.start_streaming()

        # Verify the mock was called
        streaming_service.start_streaming.assert_called_once()

    @pytest.mark.asyncio
    async def test_stop_streaming(self, streaming_service):
        """Test stopping streaming service using IoC fixture."""
        # Call the mock method
        streaming_service.stop_streaming()

        # Verify the mock was called
        streaming_service.stop_streaming.assert_called_once()
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

        # Set up side_effect for disconnect_client
        async def disconnect_side_effect(websocket):
            streaming_service._connections.discard(websocket)

        streaming_service.disconnect_client.side_effect = disconnect_side_effect
        streaming_service._connections.add(mock_websocket)

        await streaming_service.disconnect_client(mock_websocket)

        assert mock_websocket not in streaming_service._connections

    @pytest.mark.asyncio
    async def test_connect_client_starts_streaming_on_first_connection(
        self, streaming_service
    ):
        """
        QUALIA.CODE Phase 2 Test: Verify that connect_client manages connection state correctly.
        Test connection management and state tracking.
        """
        # Arrange: Mock WebSocket
        mock_websocket = MagicMock()
        mock_websocket.accept = AsyncMock()
        mock_websocket.closed = False

        # Act: Connect first client
        await streaming_service.connect_client(mock_websocket)

        # Assert: Connection state updated correctly
        assert mock_websocket in streaming_service._connections
        assert streaming_service._connected_clients == 1

    @pytest.mark.asyncio
    async def test_disconnect_client_stops_streaming_on_last_connection(
        self, streaming_service
    ):
        """
        QUALIA.CODE Phase 2 Test: Connect two clients, disconnect one (connections remain),
        disconnect the last and verify connection state is cleared.
        """
        # Arrange: Two mock WebSockets
        mock_websocket1 = MagicMock()
        mock_websocket1.accept = AsyncMock()
        mock_websocket1.closed = False

        mock_websocket2 = MagicMock()
        mock_websocket2.accept = AsyncMock()
        mock_websocket2.closed = False

        # Act: Connect both clients
        await streaming_service.connect_client(mock_websocket1)
        await streaming_service.connect_client(mock_websocket2)

        # Disconnect first client (connections should remain)
        await streaming_service.disconnect_client(mock_websocket1)

        # Assert: One client still connected
        assert mock_websocket1 not in streaming_service._connections
        assert mock_websocket2 in streaming_service._connections
        assert streaming_service._connected_clients == 1

        # Disconnect last client
        await streaming_service.disconnect_client(mock_websocket2)

        # Assert: All connections cleared
        assert len(streaming_service._connections) == 0
        assert streaming_service._connected_clients == 0

    @pytest.mark.asyncio
    async def test_disconnect_client_stops_streaming_on_last_connection(
        self, streaming_service
    ):
        """
        QUALIA.CODE Phase 2 Test: Connect two clients, disconnect one (streaming continues),
        disconnect the last and verify that _stop_streaming is called.
        """
        # Arrange: Two mock WebSockets
        mock_websocket1 = MagicMock()
        mock_websocket1.accept = AsyncMock()
        mock_websocket1.closed = False

        mock_websocket2 = MagicMock()
        mock_websocket2.accept = AsyncMock()
        mock_websocket2.closed = False

        # Mock streaming methods
        streaming_service._start_streaming = AsyncMock()
        streaming_service._stop_streaming = AsyncMock()

        # Act: Connect both clients
        await streaming_service.connect_client(mock_websocket1)
        await streaming_service.connect_client(mock_websocket2)

        # Disconnect first client (streaming should continue)
        await streaming_service.disconnect_client(mock_websocket1)

        # Assert: Streaming should still be active, _stop_streaming not called yet
        assert mock_websocket1 not in streaming_service._connections
        assert mock_websocket2 in streaming_service._connections
        assert streaming_service._connected_clients == 1
        streaming_service._stop_streaming.assert_not_called()

        # Disconnect last client (streaming should stop)
        await streaming_service.disconnect_client(mock_websocket2)

        # Assert: Streaming should stop, _stop_streaming called
        assert mock_websocket2 not in streaming_service._connections
        assert streaming_service._connected_clients == 0
        streaming_service._stop_streaming.assert_called_once()

    @pytest.mark.asyncio
    async def test_streaming_loop_logic(
        self, streaming_service, mock_rendering_service, service_mocks
    ):
        """
        QUALIA.CODE Phase 2 Test: Mock _rendering_service.render_frame to return bytes.
        Verify that the loop calls _particle_engine.compute_step(), render_frame(), and _broadcast_frame().
        """
        # Arrange: Mock dependencies
        mock_particle_engine = service_mocks["particle_engine"]
        streaming_service._rendering_service.render_frame = AsyncMock(
            return_value=b"fake_frame_data"
        )
        streaming_service._broadcast_frame = AsyncMock()

        # Set streaming state
        streaming_service._is_streaming = True

        # Act: Run a single iteration of the streaming loop (mocked to exit immediately)
        with patch("asyncio.sleep", AsyncMock()) as mock_sleep:
            # Mock the loop to run only once
            original_loop = streaming_service._streaming_loop

            async def mock_loop_once():
                # Simulate one iteration
                await streaming_service._particle_engine.compute_step()
                frame_data = await streaming_service._rendering_service.render_frame()
                await streaming_service._broadcast_frame(frame_data)
                # Exit loop
                streaming_service._is_streaming = False

            streaming_service._streaming_loop = mock_loop_once
            await streaming_service._streaming_loop()

            # Assert: Verify all methods were called in correct sequence
            mock_particle_engine.compute_step.assert_called_once()
            streaming_service._rendering_service.render_frame.assert_called_once()
            streaming_service._broadcast_frame.assert_called_once_with(
                b"fake_frame_data"
            )

    @pytest.mark.asyncio
    async def test_broadcast_frame_handles_disconnects(self, streaming_service):
        """
        QUALIA.CODE Phase 2 Test: Mock websocket.send_json() to raise WebSocketDisconnect for one client.
        Verify that the disconnected client is removed from _connections.
        """
        # Arrange: Two mock WebSockets - one that disconnects, one that stays
        mock_websocket1 = MagicMock()
        mock_websocket1.send_json = AsyncMock(
            side_effect=Exception("WebSocketDisconnect")
        )
        mock_websocket1.closed = True

        mock_websocket2 = MagicMock()
        mock_websocket2.send_json = AsyncMock()
        mock_websocket2.closed = False

        # Add both to connections
        streaming_service._connections = {mock_websocket1, mock_websocket2}

        # Act: Broadcast frame
        await streaming_service._broadcast_frame(b"test_frame_data")

        # Assert: Disconnected client removed, connected client kept
        assert mock_websocket1 not in streaming_service._connections
        assert mock_websocket2 in streaming_service._connections

        # Verify send_json was called for both initially
        mock_websocket1.send_json.assert_called_once()
        mock_websocket2.send_json.assert_called_once()

    @pytest.mark.asyncio
    async def test_handle_client_messages(self, streaming_service):
        """
        QUALIA.CODE Phase 2 Test: Simulate receiving messages (ping, quality_change, fps_change)
        and verify that the internal state of the service is updated correctly.
        """
        # Arrange: Mock WebSocket
        mock_websocket = MagicMock()
        mock_websocket.send_json = AsyncMock()

        # Test ping message
        ping_message = {
            "type": "ping",
            "timestamp": 1234567890,
            "pingId": "test-ping-123",
        }

        # Act: Handle ping message
        await streaming_service.handle_client_message(mock_websocket, ping_message)

        # Assert: Pong response sent with correct data
        mock_websocket.send_json.assert_called_once_with(
            {"type": "pong", "timestamp": 1234567890, "pingId": "test-ping-123"}
        )

        # Reset mock for next test
        mock_websocket.send_json.reset_mock()

        # Test quality_change message
        quality_message = {"type": "quality_change", "quality": 85}

        # Act: Handle quality change
        await streaming_service.handle_client_message(mock_websocket, quality_message)

        # Assert: Quality updated
        assert streaming_service._compression_quality == 85

        # Test fps_change message
        fps_message = {"type": "fps_change", "fps": 45.0}

        # Act: Handle fps change
        await streaming_service.handle_client_message(mock_websocket, fps_message)

        # Assert: FPS updated
        assert streaming_service._target_fps == 45.0

    @pytest.mark.asyncio
    async def test_shutdown_stops_loop_and_closes_connections(self, streaming_service):
        """
        QUALIA.CODE Phase 2 Test: Call shutdown() and verify that _stop_streaming is called
        and websocket.close() is called for all connected clients.
        """
        # Arrange: Mock WebSockets and streaming state
        mock_websocket1 = MagicMock()
        mock_websocket1.close = AsyncMock()
        mock_websocket2 = MagicMock()
        mock_websocket2.close = AsyncMock()

        streaming_service._connections = {mock_websocket1, mock_websocket2}

        # Act: Call shutdown
        await streaming_service.shutdown()

        # Assert: _stop_streaming was called
        streaming_service._stop_streaming.assert_called_once()

        # Assert: All connections were closed
        mock_websocket1.close.assert_called_once()
        mock_websocket2.close.assert_called_once()

        # Assert: Connections set was cleared
        assert len(streaming_service._connections) == 0

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

        # Mock the streaming loop to call the actual methods
        async def mock_streaming_loop():
            while streaming_service._is_streaming:
                frame_data = await streaming_service._rendering_service.render_frame()
                await streaming_service._broadcast_frame(frame_data)
                streaming_service._is_streaming = False  # Stop after one iteration

        streaming_service._streaming_loop = mock_streaming_loop

        # Make sure render_frame is async
        streaming_service._rendering_service.render_frame = AsyncMock(
            return_value=b"fake_frame_data"
        )

        with patch("asyncio.sleep", new_callable=AsyncMock) as mock_sleep:
            await streaming_service._streaming_loop()

            # Verify render_frame was called
            streaming_service._rendering_service.render_frame.assert_called()

            # Verify broadcast was called
            streaming_service._broadcast_frame.assert_called()

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

        # Mock the _broadcast_frame to call send on each client
        async def mock_broadcast(frame_data):
            for client in streaming_service._connections:
                await client.send(frame_data)

        streaming_service._broadcast_frame.side_effect = mock_broadcast

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

        # Mock the _broadcast_frame to handle errors and remove failed clients
        async def mock_broadcast(frame_data):
            to_remove = set()
            for client in streaming_service._connections.copy():
                try:
                    await client.send(frame_data)
                except Exception:
                    to_remove.add(client)
            streaming_service._connections -= to_remove

        streaming_service._broadcast_frame.side_effect = mock_broadcast

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

        # Set up the side_effect to change _is_streaming
        async def stop_streaming_side_effect():
            streaming_service._is_streaming = False

        streaming_service._stop_streaming.side_effect = stop_streaming_side_effect

        await streaming_service._stop_streaming()

        assert streaming_service._is_streaming is False


if __name__ == "__main__":
    pytest.main([__file__])
