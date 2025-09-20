# QUALIA.CODE v1.0 - Comprehensive Particle Engine Tests
# Focused tests to achieve high coverage of QualiaParticleEngine

import pytest
from unittest.mock import Mock, patch
from backend.engine.qualia_particle_engine import (
    QualiaParticleEngine,
    PingPongBufferPair,
    BufferState,
    QualiaMetrics,
    QUALIA_GPU_AVAILABLE,
)


class TestQualiaMetrics:
    """Comprehensive tests for QualiaMetrics class."""

    def test_initialization(self):
        """Test QualiaMetrics initialization."""
        metrics = QualiaMetrics()
        assert metrics.total_swaps == 0
        assert metrics.total_compute_time == 0.0
        assert metrics.total_transfer_time == 0.0
        assert metrics.gpu_memory_saved == 0
        assert metrics.performance_gain == 0.0

    def test_add_swap_without_transfer(self):
        """Test adding swap without transfer avoidance."""
        metrics = QualiaMetrics()
        metrics.add_swap(0.5)

        assert metrics.total_swaps == 1
        assert metrics.total_compute_time == 0.5
        assert metrics.total_transfer_time == 0.0
        assert metrics.gpu_memory_saved == 0
        assert metrics.performance_gain == 0.0

    def test_add_swap_with_transfer_avoidance(self):
        """Test adding swap with transfer avoidance."""
        metrics = QualiaMetrics()
        transfer_saved = 1024 * 1024 * 1024  # 1GB
        metrics.add_swap(0.5, transfer_saved)

        assert metrics.total_swaps == 1
        assert metrics.total_compute_time == 0.5
        assert metrics.gpu_memory_saved == transfer_saved
        assert metrics.total_transfer_time > 0  # Should be ~0.1 seconds
        assert 0 < metrics.performance_gain < 1  # Should be calculated

    def test_multiple_swaps(self):
        """Test multiple swap operations."""
        metrics = QualiaMetrics()
        metrics.add_swap(0.1, 1024 * 1024)  # 1MB
        metrics.add_swap(0.2, 2 * 1024 * 1024)  # 2MB
        metrics.add_swap(0.3)  # No transfer

        assert metrics.total_swaps == 3
        assert (
            abs(metrics.total_compute_time - 0.6) < 1e-10
        )  # Handle floating point precision
        assert metrics.gpu_memory_saved == 3 * 1024 * 1024


class TestPingPongBufferPairComplete:
    """Complete tests for PingPongBufferPair."""

    def test_initialization_with_parameters(self):
        """Test initialization with specific parameters."""
        buffer_pair = PingPongBufferPair(
            size=2048, element_count=512, current_input=BufferState.OUTPUT
        )

        assert buffer_pair.size == 2048
        assert buffer_pair.element_count == 512
        assert buffer_pair.current_input == BufferState.OUTPUT

    def test_buffer_properties_output_first(self):
        """Test buffer properties when OUTPUT is current input."""
        mock_buffer_a = Mock()
        mock_buffer_b = Mock()

        buffer_pair = PingPongBufferPair(
            buffer_a=mock_buffer_a,
            buffer_b=mock_buffer_b,
            current_input=BufferState.OUTPUT,
        )

        assert buffer_pair.input_buffer == mock_buffer_b
        assert buffer_pair.output_buffer == mock_buffer_a

    def test_swap_from_output_to_input(self):
        """Test swapping from OUTPUT to INPUT."""
        buffer_pair = PingPongBufferPair(current_input=BufferState.OUTPUT)
        buffer_pair.swap()
        assert buffer_pair.current_input == BufferState.INPUT

    def test_release_with_mock_buffers(self):
        """Test releasing buffers with mock objects."""
        mock_buffer_a = Mock()
        mock_buffer_b = Mock()

        buffer_pair = PingPongBufferPair(buffer_a=mock_buffer_a, buffer_b=mock_buffer_b)

        buffer_pair.release()

        mock_buffer_a.release.assert_called_once()
        mock_buffer_b.release.assert_called_once()
        assert buffer_pair.buffer_a is None
        assert buffer_pair.buffer_b is None

    def test_release_with_none_buffers(self):
        """Test releasing when buffers are None."""
        buffer_pair = PingPongBufferPair()

        # Should not raise an exception
        buffer_pair.release()

        assert buffer_pair.buffer_a is None
        assert buffer_pair.buffer_b is None


class TestQualiaParticleEngineComprehensive:
    """Comprehensive tests for QualiaParticleEngine to achieve high coverage."""

    def test_initialization_with_all_parameters(self):
        """Test initialization with all possible parameters."""
        mock_ctx = Mock()
        engine = QualiaParticleEngine(
            ctx=mock_ctx, max_particles=5000, enable_metrics=False
        )

        assert engine.ctx == mock_ctx
        assert engine.max_particles == 5000
        assert engine.enable_metrics is False
        assert engine.metrics is None
        assert engine.simulation_tick == 0
        assert engine.status == "initialized"
        assert not engine.particles_initialized

    def test_initialization_without_context(self):
        """Test initialization without context."""
        engine = QualiaParticleEngine()

        assert engine.ctx is None
        assert engine.max_particles == 10000
        assert engine.enable_metrics is True
        assert engine.metrics is not None
        assert engine.compute_shader is None

    @patch("backend.engine.qualia_particle_engine.os.path.exists")
    @patch("backend.engine.qualia_particle_engine.open")
    def test_initialize_shader_success(self, mock_open, mock_exists):
        """Test successful shader initialization."""
        mock_exists.return_value = True
        mock_open.return_value.__enter__.return_value.read.return_value = (
            "#version 430\nvoid main(){}"
        )

        mock_ctx = Mock()
        mock_compute_shader = Mock()
        mock_ctx.compute_shader.return_value = mock_compute_shader

        engine = QualiaParticleEngine(ctx=mock_ctx)

        assert engine.compute_shader == mock_compute_shader
        mock_ctx.compute_shader.assert_called_once()

    @patch("backend.engine.qualia_particle_engine.os.path.exists")
    def test_initialize_shader_file_not_exists(self, mock_exists):
        """Test shader initialization when file doesn't exist."""
        mock_exists.return_value = False

        mock_ctx = Mock()
        engine = QualiaParticleEngine()
        engine.ctx = mock_ctx

        with patch.object(engine, "_create_qualia_shader") as mock_create:
            engine._initialize_shader()
            mock_create.assert_called_once()

    def test_create_qualia_shader(self):
        """Test _create_qualia_shader method."""
        engine = QualiaParticleEngine()

        # Should not raise exception
        engine._create_qualia_shader("/path/to/shader.glsl")

    @patch("backend.engine.qualia_particle_engine.np")
    def test_create_initial_particles(self, mock_np):
        """Test initial particle creation."""
        # Create a proper mock array that supports item assignment
        import numpy as np

        mock_particles = np.zeros((100, 12), dtype=np.float32)
        mock_np.zeros.return_value = mock_particles

        # Mock different return values for different calls
        def mock_uniform(*args, **kwargs):
            if len(args) == 3 and args[2] == (100, 3):  # positions and velocities
                return np.random.uniform(args[0], args[1], args[2])
            elif len(args) == 3 and args[2] == 100:  # lifetime and size
                return np.random.uniform(args[0], args[1], args[2])
            else:
                return np.random.uniform(*args, **kwargs)

        mock_np.random.uniform.side_effect = mock_uniform
        mock_np.float32 = np.float32

        engine = QualiaParticleEngine(max_particles=100)
        result = engine._create_initial_particles()

        assert result is not None
        mock_np.zeros.assert_called_once_with((100, 12), dtype=mock_np.float32)

    def test_create_initial_particles_no_numpy(self):
        """Test initial particle creation without numpy."""
        with patch("backend.engine.qualia_particle_engine.np", None):
            engine = QualiaParticleEngine()

            with pytest.raises(ImportError, match="NumPy is required"):
                engine._create_initial_particles()

    def test_initialize_buffers_success(self):
        """Test successful buffer initialization."""
        mock_ctx = Mock()
        mock_compute_shader = Mock()

        # Create mock particles data with proper methods
        mock_particles_data = Mock()
        mock_float32_data = Mock()
        mock_float32_data.tobytes.return_value = b"test_data"
        mock_particles_data.astype.return_value = mock_float32_data

        # Mock len() to return particle count
        mock_particles_data.__len__ = Mock(return_value=100)

        engine = QualiaParticleEngine(ctx=mock_ctx)
        engine.compute_shader = mock_compute_shader

        result = engine.initialize_buffers(mock_particles_data)

        assert result is True
        assert engine.particles_initialized is True
        assert mock_ctx.buffer.call_count == 2  # Two buffers created

    def test_initialize_buffers_no_context(self):
        """Test buffer initialization without context."""
        engine = QualiaParticleEngine()

        result = engine.initialize_buffers()

        assert result is False
        assert not engine.particles_initialized

    def test_initialize_buffers_no_shader(self):
        """Test buffer initialization without shader."""
        mock_ctx = Mock()
        engine = QualiaParticleEngine(ctx=mock_ctx)
        engine.compute_shader = None

        result = engine.initialize_buffers()

        assert result is False
        assert not engine.particles_initialized

    @patch("backend.engine.qualia_particle_engine.struct.pack")
    @patch("backend.engine.qualia_particle_engine.time.time")
    def test_update_uniform_buffer_new_buffer(self, mock_time, mock_pack):
        """Test updating uniform buffer when creating new buffer."""
        mock_time.return_value = 5.0
        mock_pack.return_value = b"packed_data"

        mock_ctx = Mock()
        engine = QualiaParticleEngine(ctx=mock_ctx)
        engine.start_time = 2.0

        qualia_state = {"intensity": 0.8, "precision": 0.6, "flow": 0.9, "chaos": 0.1}

        engine.update_uniform_buffer(qualia_state)

        mock_pack.assert_called_once_with(
            "ffffffffI",  # Updated format: 8 floats + 1 unsigned int
            0.8,
            0.6,
            0.0,
            0.9,
            0.1,
            0.0,
            0.0,
            3.0,  # current_time = 5.0 - 2.0 = 3.0
            10000,  # max_particles (default value)
        )
        mock_ctx.buffer.assert_called_once_with(b"packed_data")

    @patch("backend.engine.qualia_particle_engine.struct.pack")
    def test_update_uniform_buffer_existing_buffer(self, mock_pack):
        """Test updating existing uniform buffer."""
        mock_pack.return_value = b"packed_data"

        mock_ctx = Mock()
        mock_uniform_buffer = Mock()

        engine = QualiaParticleEngine(ctx=mock_ctx)
        engine.uniform_buffer = mock_uniform_buffer

        qualia_state = {"intensity": 0.5}
        engine.update_uniform_buffer(qualia_state)

        mock_uniform_buffer.write.assert_called_once_with(b"packed_data")

    def test_update_uniform_buffer_no_context(self):
        """Test updating uniform buffer without context."""
        engine = QualiaParticleEngine()

        # Should not raise exception
        engine.update_uniform_buffer({"intensity": 0.5})

    @patch("backend.engine.qualia_particle_engine.time.time")
    def test_compute_step_success(self, mock_time):
        """Test successful compute step."""
        mock_time.return_value = 1.0

        mock_ctx = Mock()
        mock_compute_shader = Mock()
        mock_input_buffer = Mock()
        mock_output_buffer = Mock()
        mock_uniform_buffer = Mock()

        engine = QualiaParticleEngine(ctx=mock_ctx, enable_metrics=True)
        engine.compute_shader = mock_compute_shader
        engine.particles_initialized = True
        engine.uniform_buffer = mock_uniform_buffer

        # Setup particle buffers
        engine.particle_buffers.buffer_a = mock_input_buffer
        engine.particle_buffers.buffer_b = mock_output_buffer
        engine.particle_buffers.element_count = 1000
        engine.particle_buffers.current_input = BufferState.INPUT

        result = engine.compute_step()

        assert result is True

        # Verify buffer binding
        mock_input_buffer.bind_to_storage_buffer.assert_called_once_with(0)
        mock_output_buffer.bind_to_storage_buffer.assert_called_once_with(1)
        mock_uniform_buffer.bind_to_uniform_buffer.assert_called_once_with(1)

        # Verify compute dispatch
        expected_work_groups = (1000 + 63) // 64  # 16 work groups
        mock_compute_shader.run.assert_called_once_with(group_x=expected_work_groups)

        # Verify context finish
        mock_ctx.finish.assert_called_once()

    def test_compute_step_not_initialized(self):
        """Test compute step when not initialized."""
        engine = QualiaParticleEngine()
        engine.particles_initialized = False

        result = engine.compute_step()

        assert result is False

    def test_compute_step_no_shader(self):
        """Test compute step without shader."""
        engine = QualiaParticleEngine()
        engine.particles_initialized = True
        engine.compute_shader = None

        result = engine.compute_step()

        assert result is False

    def test_compute_step_without_uniform_buffer(self):
        """Test compute step without uniform buffer."""
        mock_ctx = Mock()
        mock_compute_shader = Mock()
        mock_input_buffer = Mock()
        mock_output_buffer = Mock()

        engine = QualiaParticleEngine(ctx=mock_ctx)
        engine.compute_shader = mock_compute_shader
        engine.particles_initialized = True
        engine.uniform_buffer = None

        # Setup particle buffers
        engine.particle_buffers.buffer_a = mock_input_buffer
        engine.particle_buffers.buffer_b = mock_output_buffer
        engine.particle_buffers.element_count = 100

        result = engine.compute_step()

        assert result is True
        # Should not try to bind uniform buffer
        mock_input_buffer.bind_to_storage_buffer.assert_called_once_with(0)
        mock_output_buffer.bind_to_storage_buffer.assert_called_once_with(1)

    def test_compute_step_with_exception(self):
        """Test compute step with exception in binding."""
        mock_ctx = Mock()
        mock_compute_shader = Mock()
        mock_input_buffer = Mock()
        mock_input_buffer.bind_to_storage_buffer.side_effect = Exception(
            "Binding failed"
        )

        engine = QualiaParticleEngine(ctx=mock_ctx)
        engine.compute_shader = mock_compute_shader
        engine.particles_initialized = True

        # Setup particle buffers
        engine.particle_buffers.buffer_a = mock_input_buffer
        engine.particle_buffers.buffer_b = Mock()
        engine.particle_buffers.element_count = 100

        result = engine.compute_step()

        assert result is False

    def test_get_current_parameters(self):
        """Test getting current parameters."""
        engine = QualiaParticleEngine(max_particles=2000)
        engine.simulation_tick = 5
        engine.status = "running"

        params = engine.get_current_parameters()

        assert params["max_particles"] == 2000
        assert params["simulation_tick"] == 5
        assert params["status"] == "running"

    @pytest.mark.asyncio
    async def test_shutdown(self):
        """Test engine shutdown."""
        mock_ctx = Mock()
        mock_buffer_a = Mock()
        mock_buffer_b = Mock()
        mock_uniform_buffer = Mock()

        engine = QualiaParticleEngine(ctx=mock_ctx)

        # Setup some resources
        engine.particle_buffers = PingPongBufferPair(
            buffer_a=mock_buffer_a, buffer_b=mock_buffer_b
        )
        engine.uniform_buffer = mock_uniform_buffer

        await engine.shutdown()

        # Verify cleanup
        mock_buffer_a.release.assert_called_once()
        mock_buffer_b.release.assert_called_once()
        assert engine.uniform_buffer is None

    @pytest.mark.asyncio
    async def test_shutdown_with_none_buffers(self):
        """Test shutdown when buffers are None."""
        engine = QualiaParticleEngine()

        # Should not raise exception
        await engine.shutdown()

    def test_qualia_gpu_available_flag(self):
        """Test QUALIA_GPU_AVAILABLE flag computation."""
        # Test the actual computation logic
        from backend.engine import qualia_particle_engine

        # The flag should be computed based on actual imports
        expected = (
            qualia_particle_engine.moderngl is not None
            and qualia_particle_engine.np is not None
        )

        assert QUALIA_GPU_AVAILABLE == expected

    def test_edge_case_zero_particles(self):
        """Test edge case with zero particles."""
        mock_ctx = Mock()
        mock_compute_shader = Mock()
        mock_buffer_a = Mock()
        mock_buffer_b = Mock()

        engine = QualiaParticleEngine(ctx=mock_ctx, max_particles=0)
        assert engine.max_particles == 0

        # Setup properly for compute step
        engine.particles_initialized = True
        engine.compute_shader = mock_compute_shader
        engine.particle_buffers = PingPongBufferPair(
            buffer_a=mock_buffer_a, buffer_b=mock_buffer_b, element_count=0
        )

        result = engine.compute_step()
        # Should still return True but with 1 work group minimum
        assert result is True

    def test_large_particle_count_work_groups(self):
        """Test work group calculation with large particle count."""
        mock_ctx = Mock()
        mock_compute_shader = Mock()

        engine = QualiaParticleEngine(ctx=mock_ctx)
        engine.compute_shader = mock_compute_shader
        engine.particles_initialized = True
        engine.particle_buffers.element_count = 10000  # Large count
        engine.particle_buffers.buffer_a = Mock()
        engine.particle_buffers.buffer_b = Mock()

        engine.compute_step()

        expected_work_groups = (10000 + 63) // 64  # Should be 157
        mock_compute_shader.run.assert_called_once_with(group_x=expected_work_groups)

    def test_metrics_recording_during_compute(self):
        """Test that metrics are recorded during compute step."""
        mock_ctx = Mock()
        mock_compute_shader = Mock()

        engine = QualiaParticleEngine(ctx=mock_ctx, enable_metrics=True)
        engine.compute_shader = mock_compute_shader
        engine.particles_initialized = True
        engine.particle_buffers.element_count = 1000
        engine.particle_buffers.buffer_a = Mock()
        engine.particle_buffers.buffer_b = Mock()

        initial_swaps = engine.metrics.total_swaps

        engine.compute_step()

        # Should have recorded the swap
        assert engine.metrics.total_swaps == initial_swaps + 1
        assert engine.metrics.total_compute_time > 0

    def test_buffer_swap_occurs_after_compute(self):
        """Test that buffers are swapped after compute step."""
        mock_ctx = Mock()
        mock_compute_shader = Mock()

        engine = QualiaParticleEngine(ctx=mock_ctx)
        engine.compute_shader = mock_compute_shader
        engine.particles_initialized = True
        engine.particle_buffers.element_count = 100
        engine.particle_buffers.buffer_a = Mock()
        engine.particle_buffers.buffer_b = Mock()

        initial_state = engine.particle_buffers.current_input

        engine.compute_step()

        # Buffer state should have swapped
        assert engine.particle_buffers.current_input != initial_state
