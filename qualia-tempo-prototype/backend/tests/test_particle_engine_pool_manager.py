# QUALIA.CODE v1.1 - ParticleEnginePoolManager Concurrency Tests
# Comprehensive testing for multiprocessing pool infrastructure
# ARCHITECTURE.GOLD.CODE v2: Backend calculates STATE, never renders

import pytest
import pytest_asyncio
import asyncio
import time
import os
import sys
from typing import Dict, Any

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.services.ParticleEnginePoolManager import (
    ParticleEnginePoolManager,
    PoolConfig,
    PoolMetrics,
    get_pool_manager
)


# ============================================================================
# FIXTURES
# ============================================================================

@pytest.fixture
def test_config_path(tmp_path):
    """Create a temporary test configuration file."""
    config_content = """
pool:
  num_workers: 2
  max_tasks_per_child: 10
  worker_restart_policy: "on_failure"

queue:
  max_size: 10
  timeout_seconds: 2.0
  priority_enabled: false

error_handling:
  max_retries: 2
  retry_delay_seconds: 0.1
  fallback_strategy: "skip"
  log_level: "WARNING"

performance:
  batch_size: 1
  collect_metrics: true
  metrics_window_seconds: 60.0

monitoring:
  health_check_interval_seconds: 5.0
  worker_timeout_seconds: 10.0
  enable_diagnostics: true

shutdown:
  grace_period_seconds: 2.0
  force_terminate_after_seconds: 5.0

features:
  enable_async_result_handling: true
  enable_worker_pool_scaling: false
  enable_task_cancellation: false
"""
    config_file = tmp_path / "test-process-pool.yaml"
    config_file.write_text(config_content)
    return str(config_file)


@pytest_asyncio.fixture
async def pool_manager(test_config_path):
    """Create a pool manager instance for testing."""
    manager = ParticleEnginePoolManager(config_path=test_config_path)
    yield manager
    # Cleanup
    if manager.is_running:
        await manager.stop()


@pytest_asyncio.fixture
async def started_pool_manager(pool_manager):
    """Create and start a pool manager instance."""
    success = await pool_manager.start()
    assert success, "Failed to start pool manager"
    yield pool_manager
    # Cleanup
    if pool_manager.is_running:
        await pool_manager.stop()


# ============================================================================
# TEST CLASS 1: POOL LIFECYCLE
# ============================================================================

class TestPoolLifecycle:
    """Test pool start, stop, restart, and multiple cycles."""
    
    @pytest.mark.asyncio
    async def test_pool_start_success(self, pool_manager):
        """Test successful pool startup."""
        success = await pool_manager.start()
        
        assert success is True
        assert pool_manager.is_running is True
        assert pool_manager.pool is not None
        
        # Cleanup
        await pool_manager.stop()
    
    @pytest.mark.asyncio
    async def test_pool_stop_graceful(self, pool_manager):
        """Test graceful pool shutdown."""
        await pool_manager.start()
        assert pool_manager.is_running is True
        
        success = await pool_manager.stop()
        
        assert success is True
        assert pool_manager.is_running is False
        assert pool_manager.pool is None
    
    @pytest.mark.asyncio
    async def test_pool_restart_after_stop(self, pool_manager):
        """Test restarting pool after graceful stop."""
        # Start
        await pool_manager.start()
        assert pool_manager.is_running is True
        
        # Stop
        await pool_manager.stop()
        assert pool_manager.is_running is False
        
        # Restart
        success = await pool_manager.start()
        assert success is True
        assert pool_manager.is_running is True
        
        # Cleanup
        await pool_manager.stop()


# ============================================================================
# TEST CLASS 2: TASK SUBMISSION
# ============================================================================

class TestTaskSubmission:
    """Test task submission scenarios."""
    
    @pytest.mark.asyncio
    async def test_submit_single_task(self, started_pool_manager):
        """Test submitting a single task successfully."""
        result = await started_pool_manager.submit_task(
            dt=0.016,
            qualia_state=None,
            command="update"
        )
        
        assert result is not None
        assert result['success'] is True
        assert 'particle_states' in result
        assert 'statistics' in result
        assert 'execution_time_ms' in result
    
    @pytest.mark.asyncio
    async def test_submit_multiple_sequential_tasks(self, started_pool_manager):
        """Test submitting multiple tasks sequentially."""
        results = []
        
        for i in range(5):
            result = await started_pool_manager.submit_task(
                dt=0.016,
                qualia_state=None,
                command="update"
            )
            results.append(result)
        
        assert len(results) == 5
        for result in results:
            assert result is not None
            assert result['success'] is True
    
    @pytest.mark.asyncio
    async def test_submit_concurrent_tasks(self, started_pool_manager):
        """Test submitting multiple tasks concurrently."""
        # Submit 10 tasks concurrently
        tasks = [
            started_pool_manager.submit_task(dt=0.016, qualia_state=None, command="update")
            for _ in range(10)
        ]
        
        results = await asyncio.gather(*tasks)
        
        assert len(results) == 10
        successful = sum(1 for r in results if r and r['success'])
        assert successful == 10, f"Only {successful}/10 tasks succeeded"
    
    @pytest.mark.asyncio
    async def test_submit_task_with_qualia_state(self, started_pool_manager):
        """Test submitting task with QualiaState data."""
        qualia_state = {
            'intensity': 0.8,
            'transcendence': 0.6,
            'chaos': 0.3,
            'aggression': 0.5
        }
        
        result = await started_pool_manager.submit_task(
            dt=0.016,
            qualia_state=qualia_state,
            command="update"
        )
        
        assert result is not None
        assert result['success'] is True
    
    @pytest.mark.asyncio
    async def test_submit_task_to_stopped_pool(self, pool_manager):
        """Test that submitting to stopped pool returns None."""
        # Don't start pool
        assert pool_manager.is_running is False
        
        result = await pool_manager.submit_task(
            dt=0.016,
            qualia_state=None,
            command="update"
        )
        
        assert result is None


# ============================================================================
# TEST CLASS 3: METRICS
# ============================================================================

class TestMetrics:
    """Test metrics collection and accuracy."""
    
    def test_metrics_initial_state(self, test_config_path):
        """Test metrics in initial state."""
        manager = ParticleEnginePoolManager(config_path=test_config_path)
        metrics = manager.get_metrics()
        
        assert metrics['total_tasks_submitted'] == 0
        assert metrics['total_tasks_completed'] == 0
        assert metrics['total_tasks_failed'] == 0
        assert metrics['success_rate'] == 0.0
        assert metrics['is_running'] is False
    
    @pytest.mark.asyncio
    async def test_metrics_after_successful_tasks(self, started_pool_manager):
        """Test metrics after successful task submissions."""
        # Submit 5 tasks
        for _ in range(5):
            await started_pool_manager.submit_task(dt=0.016, qualia_state=None, command="update")
        
        metrics = started_pool_manager.get_metrics()
        
        assert metrics['total_tasks_submitted'] == 5
        assert metrics['total_tasks_completed'] == 5
        assert metrics['success_rate'] == 100.0
        assert metrics['is_running'] is True
    
    @pytest.mark.asyncio
    async def test_average_execution_time_calculation(self, started_pool_manager):
        """Test that average execution time is calculated correctly."""
        # Submit several tasks
        for _ in range(10):
            await started_pool_manager.submit_task(dt=0.016, qualia_state=None, command="update")
        
        metrics = started_pool_manager.get_metrics()
        
        assert 'average_execution_time_ms' in metrics
        assert metrics['average_execution_time_ms'] > 0.0


# ============================================================================
# TEST CLASS 4: HEALTH CHECKS
# ============================================================================

class TestHealthCheck:
    """Test health check functionality."""
    
    @pytest.mark.asyncio
    async def test_health_check_on_healthy_pool(self, started_pool_manager):
        """Test health check on operational pool."""
        is_healthy = await started_pool_manager.health_check()
        
        assert is_healthy is True
    
    @pytest.mark.asyncio
    async def test_health_check_on_stopped_pool(self, pool_manager):
        """Test health check on stopped pool."""
        assert pool_manager.is_running is False
        
        is_healthy = await pool_manager.health_check()
        
        assert is_healthy is False


# ============================================================================
# TEST CLASS 5: ASYNC INTEGRATION
# ============================================================================

class TestAsyncIntegration:
    """Test async/await integration with FastAPI compatibility."""
    
    @pytest.mark.asyncio
    async def test_await_single_task(self, started_pool_manager):
        """Test awaiting a single task."""
        result = await started_pool_manager.submit_task(
            dt=0.016,
            qualia_state=None,
            command="update"
        )
        
        assert result is not None
        assert isinstance(result, dict)
    
    @pytest.mark.asyncio
    async def test_await_multiple_concurrent_tasks(self, started_pool_manager):
        """Test awaiting multiple tasks concurrently."""
        tasks = [
            started_pool_manager.submit_task(dt=0.016, qualia_state=None, command="update")
            for _ in range(5)
        ]
        
        results = await asyncio.gather(*tasks)
        
        assert len(results) == 5
        for result in results:
            assert result is not None
    
    @pytest.mark.asyncio
    async def test_future_resolution_thread_safety(self, started_pool_manager):
        """Test that future resolution is thread-safe."""
        # Submit many concurrent tasks to stress-test thread safety
        tasks = [
            started_pool_manager.submit_task(dt=0.016, qualia_state=None, command="update")
            for _ in range(20)
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Verify no exceptions
        exceptions = [r for r in results if isinstance(r, Exception)]
        assert len(exceptions) == 0, f"Thread safety issues: {exceptions}"


# ============================================================================
# TEST CLASS 6: CONFIGURATION
# ============================================================================

class TestConfiguration:
    """Test configuration loading and validation."""
    
    def test_load_config_from_yaml(self, test_config_path):
        """Test loading configuration from YAML file."""
        manager = ParticleEnginePoolManager(config_path=test_config_path)
        
        assert manager.config is not None
        assert manager.config.num_workers == 2
        assert manager.config.max_tasks_per_child == 10
        assert manager.config.queue_timeout_seconds == 2.0
    
    def test_config_validation(self, test_config_path):
        """Test that configuration values are correctly parsed."""
        manager = ParticleEnginePoolManager(config_path=test_config_path)
        
        # Validate pool config
        assert manager.config.num_workers > 0
        assert manager.config.max_tasks_per_child > 0
        
        # Validate queue config
        assert manager.config.queue_max_size > 0
        assert manager.config.queue_timeout_seconds > 0.0
        
        # Validate error handling
        assert manager.config.max_retries >= 0
        assert manager.config.retry_delay_seconds >= 0.0


# ============================================================================
# INTEGRATION TEST
# ============================================================================

class TestIntegration:
    """End-to-end integration tests."""
    
    @pytest.mark.asyncio
    async def test_full_workflow(self, test_config_path):
        """Test complete workflow: start, submit, metrics, health check, stop."""
        manager = ParticleEnginePoolManager(config_path=test_config_path)
        
        # Start
        success = await manager.start()
        assert success is True
        
        # Health check
        is_healthy = await manager.health_check()
        assert is_healthy is True
        
        # Submit tasks
        tasks = [
            manager.submit_task(dt=0.016, qualia_state=None, command="update")
            for _ in range(5)
        ]
        results = await asyncio.gather(*tasks)
        
        # Verify results
        assert len(results) == 5
        successful = sum(1 for r in results if r and r['success'])
        assert successful == 5
        
        # Check metrics
        metrics = manager.get_metrics()
        # health_check submits 1 task + 5 tasks = 6 total
        assert metrics['total_tasks_completed'] == 6
        assert metrics['success_rate'] == 100.0
        
        # Stop
        success = await manager.stop()
        assert success is True
        assert manager.is_running is False
