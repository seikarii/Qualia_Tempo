# QUALIA.CODE v1.0 - Extended Particle Engine Tests
# Extended test coverage for QualiaParticleEngine

import pytest
from unittest.mock import Mock, patch
from backend.tests.test_composition_root import TestCompositionRootFactory
from backend.engine.qualia_particle_engine import (
    QualiaParticleEngine,
    PingPongBufferPair,
    BufferState,
    QUALIA_GPU_AVAILABLE,
)


@pytest.fixture
def mocked_composition_root():
    return TestCompositionRootFactory.create_mocked_composition_root()


@pytest.fixture
def particle_engine(mocked_composition_root):
    # Resolve the engine FROM THE CONTAINER
    return mocked_composition_root.get_service("particle_system")


class TestPingPongBufferPair:
    """Test PingPongBufferPair functionality."""

    def test_buffer_pair_initialization(self):
        """Test buffer pair initialization."""
        buffer_pair = PingPongBufferPair(size=1024, element_count=256)

        assert buffer_pair.size == 1024
        assert buffer_pair.element_count == 256
        assert buffer_pair.current_input == BufferState.INPUT
        assert buffer_pair.buffer_a is None
        assert buffer_pair.buffer_b is None

    def test_buffer_pair_input_output_properties(self):
        """Test input/output buffer properties."""
        mock_buffer_a = Mock()
        mock_buffer_b = Mock()

        buffer_pair = PingPongBufferPair(
            buffer_a=mock_buffer_a,
            buffer_b=mock_buffer_b,
            current_input=BufferState.INPUT,
        )

        assert buffer_pair.input_buffer == mock_buffer_a
        assert buffer_pair.output_buffer == mock_buffer_b

    def test_buffer_pair_swap(self):
        """Test buffer swapping."""
        mock_buffer_a = Mock()
        mock_buffer_b = Mock()

        buffer_pair = PingPongBufferPair(
            buffer_a=mock_buffer_a,
            buffer_b=mock_buffer_b,
            current_input=BufferState.INPUT,
        )

        # Initial state
        assert buffer_pair.input_buffer == mock_buffer_a
        assert buffer_pair.output_buffer == mock_buffer_b

        # Swap
        buffer_pair.swap()

        # After swap
        assert buffer_pair.input_buffer == mock_buffer_b
        assert buffer_pair.output_buffer == mock_buffer_a
        assert buffer_pair.current_input == BufferState.OUTPUT


class TestQualiaParticleEngineExtended:
    """Extended tests for QualiaParticleEngine."""

    def test_engine_initialization_with_parameters(self, particle_engine):
        """Test engine initialization with various parameters."""
        # The engine is provided by fixture
        assert particle_engine is not None

    def test_engine_parameter_validation(self):
        """Test parameter validation."""
        # Valid parameters
        engine = QualiaParticleEngine(ctx=None, max_particles=1000)
        assert engine.max_particles == 1000

        # Test with different particle counts
        engine2 = QualiaParticleEngine(ctx=None, max_particles=100)
        assert engine2.max_particles == 100

    def test_update_uniform_buffer_comprehensive(self):
        """Test comprehensive uniform buffer updates."""
        engine = QualiaParticleEngine(ctx=None, max_particles=1000)

        # Test with all QualiaState fields
        complete_state = {
            "intensity": 0.8,
            "precision": 0.6,
            "aggression": 0.4,
            "flow": 0.9,
            "chaos": 0.2,
            "recovery": 0.1,
            "transcendence": 0.05,
        }

        # Should not crash
        engine.update_uniform_buffer(complete_state)

        # Test with partial state
        partial_state = {"intensity": 0.5}
        engine.update_uniform_buffer(partial_state)

        # Test with empty state
        engine.update_uniform_buffer({})

    def test_simulation_control_methods(self):
        """Test simulation control methods."""
        engine = QualiaParticleEngine(ctx=None, max_particles=1000)

        # Test reset (the main control method available)
        engine.reset()
        assert engine.simulation_tick == 0

        # Test get_current_parameters
        params = engine.get_current_parameters()
        assert isinstance(params, dict)
        assert "max_particles" in params

    def test_statistics_and_monitoring(self):
        """Test statistics and monitoring functions."""
        engine = QualiaParticleEngine(ctx=None, max_particles=1000)

        # Test get_performance_metrics (equivalent to get_statistics)
        metrics = engine.get_performance_metrics()
        assert isinstance(metrics, dict)
        assert "total_swaps" in metrics
        assert "total_compute_time" in metrics

        params = engine.get_current_parameters()
        assert isinstance(params, dict)
        assert "max_particles" in params

    @patch("backend.engine.qualia_particle_engine.moderngl")
    def test_graphics_initialization_with_mock_context(self, mock_moderngl):
        """Test graphics initialization with mocked context."""
        mock_ctx = Mock()
        mock_moderngl.create_context.return_value = mock_ctx

        engine = QualiaParticleEngine(ctx=mock_ctx, max_particles=1000)

        # Test that engine is initialized with context
        assert engine.ctx is not None
        assert engine.status == "initialized"

    def test_performance_monitoring(self):
        """Test performance monitoring capabilities."""
        engine = QualiaParticleEngine(ctx=None, max_particles=1000)

        # Multiple compute steps to test performance tracking
        for _ in range(5):
            engine.compute_step()

        # Test performance metrics instead of statistics
        metrics = engine.get_performance_metrics()
        assert isinstance(metrics, dict)
        assert "total_swaps" in metrics

    @pytest.mark.asyncio
    async def test_async_shutdown(self):
        """Test asynchronous shutdown."""
        engine = QualiaParticleEngine(ctx=None, max_particles=1000)

        # Test shutdown
        await engine.shutdown()

        # Verify cleanup was called
        assert (
            not hasattr(engine, "_compute_program") or engine._compute_program is None
        )

    def test_error_handling_in_compute_step(self):
        """Test error handling during compute step."""
        engine = QualiaParticleEngine(ctx=None, max_particles=1000)

        # Without proper context, compute_step should handle errors gracefully
        result = engine.compute_step()
        assert result is False

    def test_buffer_management(self):
        """Test buffer management functionality."""
        engine = QualiaParticleEngine(ctx=None, max_particles=1000)

        # Test that buffers are not initialized without context
        assert engine.particle_buffers.buffer_a is None
        assert engine.particle_buffers.buffer_b is None
        assert not engine.particles_initialized

    def test_shader_compilation_error_handling(self):
        """Test shader compilation error handling."""
        engine = QualiaParticleEngine(ctx=None, max_particles=1000)

        # Test that shader is not created without context
        assert engine.compute_shader is None
        assert engine.status == "initialized"

    def test_qualia_state_extremes(self):
        """Test handling of extreme QualiaState values."""
        engine = QualiaParticleEngine(ctx=None, max_particles=1000)

        # Test extreme values
        extreme_state = {
            "intensity": 1.0,
            "precision": 0.0,
            "aggression": 1.0,
            "flow": 0.0,
            "chaos": 1.0,
            "recovery": 1.0,
            "transcendence": 1.0,
        }

        engine.update_uniform_buffer(extreme_state)

        # Test negative/invalid values (should be handled gracefully)
        invalid_state = {
            "intensity": -0.5,
            "precision": 2.0,
        }

        engine.update_uniform_buffer(invalid_state)

    def test_large_particle_count(self):
        """Test with large particle counts."""
        # Test with large particle count
        engine = QualiaParticleEngine(ctx=None, max_particles=100000)
        assert engine.max_particles == 100000

        # Test compute step with large count
        result = engine.compute_step()
        assert result is False  # Expected without context

    def test_gpu_availability_flag(self):
        """Test GPU availability detection."""
        # Test the availability flag
        assert isinstance(QUALIA_GPU_AVAILABLE, bool)

        # The flag should reflect the actual availability of dependencies
        try:
            import importlib.util

            moderngl_available = importlib.util.find_spec("moderngl") is not None
            numpy_available = importlib.util.find_spec("numpy") is not None

            expected = moderngl_available and numpy_available
        except Exception:
            expected = False

        assert QUALIA_GPU_AVAILABLE == expected
