# QUALIA.CODE v1.1 - Phase 1.4 Integration Tests
# Tests for CompositionRoot + ParticleEnginePoolManager + StateStreamingService integration

import pytest
import pytest_asyncio
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from backend.CompositionRoot import CompositionRoot, get_composition_root, reset_composition_root
from backend.services.ParticleEnginePoolManager import ParticleEnginePoolManager
from backend.services.StateStreamingService import StateStreamingService
from backend.services.EventBus import EventBus


@pytest.fixture
def reset_singleton():
    """Reset global CompositionRoot singleton before each test."""
    reset_composition_root()
    yield
    reset_composition_root()


@pytest_asyncio.fixture
async def composition_root(reset_singleton):
    """Create and initialize CompositionRoot for testing."""
    root = CompositionRoot()
    await root.initialize()
    yield root
    await root.shutdown()


class TestCompositionRootIntegration:
    """Test CompositionRoot with ParticleEnginePoolManager integration."""

    @pytest.mark.asyncio
    async def test_composition_root_initializes_pool_manager(self, composition_root):
        """Test that CompositionRoot creates ParticleEnginePoolManager."""
        particle_system = composition_root.get_service("particle_system")
        
        assert particle_system is not None
        assert isinstance(particle_system, ParticleEnginePoolManager)
        assert particle_system.is_running is True
        assert particle_system.config.num_workers > 0

    @pytest.mark.asyncio
    async def test_composition_root_shutdown_stops_pool(self, reset_singleton):
        """Test that CompositionRoot.shutdown() stops the pool gracefully."""
        root = CompositionRoot()
        await root.initialize()
        
        pool_manager = root.get_service("particle_system")
        assert pool_manager.is_running is True
        
        await root.shutdown()
        
        assert pool_manager.is_running is False

    @pytest.mark.asyncio
    async def test_pool_manager_can_submit_tasks(self, composition_root):
        """Test that the pool manager can accept and process tasks."""
        pool_manager = composition_root.get_service("particle_system")
        
        # Submit a simple update task
        result = await pool_manager.submit_task(
            dt=0.016,  # ~60fps
            qualia_state=None,
            command="update"
        )
        
        assert result is not None
        assert result.get('success') is True
        assert 'particle_states' in result
        assert isinstance(result['particle_states'], list)

    @pytest.mark.asyncio
    async def test_multiple_concurrent_task_submissions(self, composition_root):
        """Test pool manager handles concurrent task submissions."""
        pool_manager = composition_root.get_service("particle_system")
        
        # Submit multiple tasks concurrently
        tasks = [
            pool_manager.submit_task(dt=0.016, command="update")
            for _ in range(5)
        ]
        
        results = await asyncio.gather(*tasks)
        
        # All tasks should succeed
        assert len(results) == 5
        assert all(r is not None and r.get('success') for r in results)


class TestStateStreamingServiceIntegration:
    """Test StateStreamingService with ParticleEnginePoolManager."""

    @pytest.mark.asyncio
    async def test_state_streaming_service_initialization(self, composition_root):
        """Test that StateStreamingService is properly initialized with pool manager."""
        streaming_service = composition_root.get_service("state_streaming_service")
        
        assert streaming_service is not None
        assert isinstance(streaming_service._pool_manager, ParticleEnginePoolManager)
        assert streaming_service._pool_manager.is_running is True

    @pytest.mark.asyncio
    async def test_state_streaming_with_pool_manager(self, composition_root):
        """Test state streaming loop uses pool manager correctly."""
        streaming_service = composition_root.get_service("state_streaming_service")
        event_bus = composition_root.get_event_bus()
        pool_manager = composition_root.get_service("particle_system")
        
        # Verify pool is running
        assert pool_manager.is_running, "Pool manager should be running"
        
        # Mock WebSocket connection
        mock_websocket = AsyncMock()
        mock_websocket.send_text = AsyncMock()
        streaming_service._connections.add(mock_websocket)
        
        # Start streaming
        await streaming_service.start_streaming()
        
        # Wait longer for worker pool to process tasks (workers need time to spawn and respond)
        await asyncio.sleep(1.0)
        
        # Stop streaming
        await streaming_service.stop_streaming()
        
        # Check pool metrics to see if tasks were submitted
        metrics = pool_manager.get_metrics()
        print(f"\n🔍 Pool Metrics: {metrics}")
        
        # Check streaming status
        status = streaming_service.get_status()
        print(f"🔍 Streaming Status: {status}")
        
        # Verify that WebSocket sent data
        if not mock_websocket.send_text.called:
            # Debug: Print what happened
            print(f"❌ send_text was not called")
            print(f"   Connections: {len(streaming_service._connections)}")
            print(f"   Is streaming: {streaming_service._is_streaming}")
            print(f"   States sent: {streaming_service._states_sent}")
        
        assert mock_websocket.send_text.called, f"send_text should have been called. States sent: {status['states_sent']}"
        
        # Check that JSON payload was sent
        calls = mock_websocket.send_text.call_args_list
        assert len(calls) > 0
        
        # Parse first call and verify structure
        import json
        first_call_payload = calls[0][0][0]
        payload = json.loads(first_call_payload)
        
        assert 'type' in payload
        assert payload['type'] == 'particle_state_update'
        assert 'particle_states' in payload
        assert 'qualia_state' in payload
        assert isinstance(payload['particle_states'], list)

    @pytest.mark.asyncio
    async def test_qualia_state_updates_propagate_to_workers(self, composition_root):
        """Test that QualiaState updates from EventBus reach worker pool."""
        streaming_service = composition_root.get_service("state_streaming_service")
        event_bus = composition_root.get_event_bus()
        
        # Mock WebSocket
        mock_websocket = AsyncMock()
        mock_websocket.send_text = AsyncMock()
        streaming_service._connections.add(mock_websocket)
        
        # Start streaming
        await streaming_service.start_streaming()
        
        # Publish QualiaState update
        test_qualia_state = {
            'intensity': 0.8,
            'precision': 0.9,
            'flow': 0.5,
            'chaos': 0.2,
            'aggression': 0.3,
            'transcendence': 0.1,
            'recovery': 0.4
        }
        
        await event_bus.publish('QualiaStateUpdated', {
            'qualia_state': test_qualia_state
        })
        
        # Wait for event to propagate and be processed
        await asyncio.sleep(0.3)
        
        # Verify service received the state
        if streaming_service._current_qualia_state != test_qualia_state:
            print(f"\n❌ Expected: {test_qualia_state}")
            print(f"   Got: {streaming_service._current_qualia_state}")
        
        assert streaming_service._current_qualia_state == test_qualia_state, "QualiaState should have been received by StateStreamingService"
        
        # Wait for streaming to send it
        await asyncio.sleep(0.5)
        
        # Stop streaming
        await streaming_service.stop_streaming()
        
        # Verify that the qualia state was included in broadcast
        assert mock_websocket.send_text.called
        calls = mock_websocket.send_text.call_args_list
        
        import json
        # Find a call that includes qualia_state
        found_qualia = False
        for call in calls:
            payload = json.loads(call[0][0])
            if payload.get('qualia_state'):
                assert payload['qualia_state']['intensity'] == 0.8
                found_qualia = True
                break
        
        assert found_qualia, "QualiaState not found in any broadcast"


class TestFullSystemIntegration:
    """Test complete backend flow: EventBus → Pool → Workers → Streaming."""

    @pytest.mark.asyncio
    async def test_full_backend_flow(self, composition_root):
        """Test complete flow from event to WebSocket output."""
        # Get services
        event_bus = composition_root.get_event_bus()
        pool_manager = composition_root.get_service("particle_system")
        streaming_service = composition_root.get_service("state_streaming_service")
        
        # Mock WebSocket
        mock_websocket = AsyncMock()
        mock_websocket.send_text = AsyncMock()
        streaming_service._connections.add(mock_websocket)
        
        # Start streaming
        await streaming_service.start_streaming()
        
        # Simulate game events
        # 1. Player action
        await event_bus.publish('PlayerActionEvent', {
            'action': 'dash',
            'timestamp': 1000.0
        })
        
        # 2. QualiaState update (from QualiaProcessor)
        await event_bus.publish('QualiaStateUpdated', {
            'qualia_state': {
                'intensity': 0.7,
                'precision': 0.8,
                'flow': 0.6,
                'chaos': 0.3,
                'aggression': 0.4,
                'transcendence': 0.2,
                'recovery': 0.5
            }
        })
        
        # Wait for processing (longer to ensure worker pool processes tasks)
        await asyncio.sleep(1.0)
        
        # Stop streaming
        await streaming_service.stop_streaming()
        
        # Verify full flow
        assert mock_websocket.send_text.called
        
        # Check metrics
        metrics = pool_manager.get_metrics()
        assert metrics['total_tasks_submitted'] > 0
        assert metrics['total_tasks_completed'] > 0
        assert metrics['success_rate'] > 0
        
        # Check streaming stats
        status = streaming_service.get_status()
        assert status['states_sent'] > 0
        assert status['is_streaming'] is False

    @pytest.mark.asyncio
    async def test_pool_manager_metrics_tracking(self, composition_root):
        """Test that pool manager tracks metrics correctly."""
        pool_manager = composition_root.get_service("particle_system")
        
        initial_metrics = pool_manager.get_metrics()
        initial_submitted = initial_metrics['total_tasks_submitted']
        
        # Submit several tasks
        for i in range(10):
            await pool_manager.submit_task(dt=0.016, command="update")
        
        final_metrics = pool_manager.get_metrics()
        
        assert final_metrics['total_tasks_submitted'] == initial_submitted + 10
        assert final_metrics['total_tasks_completed'] >= 8  # Allow some failures
        assert final_metrics['average_execution_time_ms'] > 0

    @pytest.mark.asyncio
    async def test_error_recovery_in_streaming(self, composition_root):
        """Test that streaming service handles worker errors gracefully."""
        streaming_service = composition_root.get_service("state_streaming_service")
        pool_manager = composition_root.get_service("particle_system")
        
        # Mock a failing worker
        original_submit = pool_manager.submit_task
        
        call_count = [0]
        async def failing_submit(*args, **kwargs):
            call_count[0] += 1
            if call_count[0] == 2:  # Fail on second call
                return {'success': False, 'error_message': 'Simulated failure'}
            return await original_submit(*args, **kwargs)
        
        pool_manager.submit_task = failing_submit
        
        # Mock WebSocket
        mock_websocket = AsyncMock()
        mock_websocket.send_text = AsyncMock()
        streaming_service._connections.add(mock_websocket)
        
        # Start streaming
        await streaming_service.start_streaming()
        await asyncio.sleep(1.0)  # Longer wait for worker pool
        await streaming_service.stop_streaming()
        
        # Service should continue despite error
        assert mock_websocket.send_text.called
        status = streaming_service.get_status()
        assert status['states_sent'] > 0  # Some states sent despite error


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
