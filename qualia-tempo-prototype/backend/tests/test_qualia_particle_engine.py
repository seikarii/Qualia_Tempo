# QUALIA.CODE v1.1 - CORRECTED: QualiaParticleEngine Testing
# IoC-Compliant Testing with REAL Service Under Test and Mocked Dependencies

import pytest
from unittest.mock import MagicMock, patch
from backend.tests.test_composition_root import TestCompositionRootFactory
from backend.engine.qualia_particle_engine import QualiaParticleEngine, BufferState


# QUALIA.CODE: Use a class to group related tests for the SUT
class TestQualiaParticleEngineLogic:
    """
    CORRECTED QUALIA.CODE COMPLIANT TESTS
    
    These tests validate the REAL QualiaParticleEngine logic with mocked dependencies.
    The SUT is instantiated by the IoC container with controlled mocks.
    """

    @pytest.fixture(scope="function")
    def setup(self):
        """
        QUALIA.CODE COMPLIANT FIXTURE
        - Creates a new, isolated container for EACH test function.
        - Resolves the REAL SUT and its MOCKED dependencies.
        """
        mocked_composition_root = TestCompositionRootFactory.create_mocked_composition_root()

        # 1. Resolve the REAL Service Under Test (SUT)
        sut = mocked_composition_root.get_service("particle_system")

        # 2. Extract the MOCKS for its dependencies
        mocks = mocked_composition_root.get_all_mocks()

        return sut, mocks

    def test_compute_step_executes_and_swaps_buffers(self, setup):
        """
        GIVEN an initialized particle engine
        WHEN compute_step is called
        THEN the compute shader runs, the context is finished, and buffers are swapped.
        """
        # ARRANGE
        sut, mocks = setup
        sut.particles_initialized = True  # Manually set state for the test
        sut.compute_shader = MagicMock()
        sut.particle_buffers.swap = MagicMock()  # Mock the swap method on the buffer pair
        sut.particle_buffers.element_count = 128
        
        # Mock the input and output buffers
        mock_input_buffer = MagicMock()
        mock_output_buffer = MagicMock()
        sut.particle_buffers.buffer_a = mock_input_buffer
        sut.particle_buffers.buffer_b = mock_output_buffer
        sut.particle_buffers.current_input = BufferState.INPUT  # So input_buffer = buffer_a
        
        # Mock ctx for finish()
        sut.ctx = mocks["ctx"]

        # ACT
        result = sut.compute_step()

        # ASSERT
        assert result is True
        # Assert that the REAL logic called the mocked dependencies correctly
        mock_input_buffer.bind_to_storage_buffer.assert_called_once_with(0)
        mock_output_buffer.bind_to_storage_buffer.assert_called_once_with(1)
        sut.compute_shader.run.assert_called_once_with(group_x=2)  # (128 + 63) // 64 = 2
        mocks["ctx"].finish.assert_called_once()
        sut.particle_buffers.swap.assert_called_once()
        assert sut.simulation_tick == 1

    def test_start_subscribes_to_event_bus(self, setup):
        """
        GIVEN a particle engine with an event bus
        WHEN start is called
        THEN it subscribes to the 'QualiaStateUpdated' event.
        """
        # ARRANGE
        sut, mocks = setup
        mock_event_bus = mocks["event_bus"]

        # ACT
        sut.start()

        # ASSERT
        assert sut.status == "running"
        # Assert that the REAL start() method called the subscribe method on the MOCKED event bus
        mock_event_bus.subscribe.assert_called_once_with(
            "QualiaStateUpdated", sut._on_qualia_state_updated
        )

    @patch('backend.engine.qualia_particle_engine.struct.pack')
    def test_update_uniform_buffer_packs_correct_data(self, mock_struct_pack, setup):
        """
        GIVEN a valid QualiaState dictionary
        WHEN update_uniform_buffer is called
        THEN it packs the correct floating-point data for the GPU.
        """
        # ARRANGE
        sut, mocks = setup
        sut.ctx = mocks["ctx"]  # Set ctx so the method doesn't return early
        sut.uniform_buffer = MagicMock()  # Mock the buffer itself
        sut.ubo_info = {'uniforms': [], 'struct_format': '', 'total_size': 0}  # Force fallback for simplicity

        qualia_state = {
            "intensity": 0.8, "precision": 0.6, "aggression": 0.4,
            "flow": 0.9, "chaos": 0.2, "recovery": 0.1, "transcendence": 0.05
        }

        # ACT
        sut.update_uniform_buffer(qualia_state)

        # ASSERT
        # Now we are testing the LOGIC inside update_uniform_buffer.
        # We check that it called struct.pack with the correct values.
        call_args = mock_struct_pack.call_args[0]
        assert call_args[0] == "ffffffffI3f3f"  # The format string
        assert call_args[1] == 0.8  # intensity
        assert call_args[2] == 0.6  # precision
        assert call_args[3] == 0.4  # aggression
        # ... and so on for all other parameters.
        sut.uniform_buffer.write.assert_called_once()

    def test_get_current_parameters_returns_correct_structure(self, setup):
        """
        GIVEN a particle engine
        WHEN get_current_parameters is called
        THEN it returns the correct parameter structure.
        """
        # ARRANGE
        sut, mocks = setup

        # ACT
        params = sut.get_current_parameters()

        # ASSERT
        assert isinstance(params, dict)
        assert "max_particles" in params
        assert "simulation_tick" in params
        assert "status" in params
        assert params["max_particles"] == 1000  # From our test setup
        assert params["status"] == "initialized"

    def test_initialization_sets_correct_defaults(self, setup):
        """
        GIVEN a newly created particle engine
        THEN it has correct default values.
        """
        # ARRANGE
        sut, mocks = setup

        # ASSERT
        assert sut.max_particles == 1000
        assert sut.enable_metrics is True
        assert sut.status == "initialized"
        assert sut.simulation_tick == 0
        assert sut.particles_initialized is False
        assert sut.ctx is None  # Not injected in tests to avoid shader init
        assert sut.event_bus == mocks["event_bus"]  # Injected mock
        assert sut.shader_inspector == mocks["shader_inspector"]  # Injected mock

    @patch('backend.engine.qualia_particle_engine.os.path.exists')
    @patch('backend.engine.qualia_particle_engine.open')
    def test_initialize_shader_success(self, mock_open, mock_exists, setup):
        """
        GIVEN shader file exists
        WHEN shader is initialized
        THEN compute shader is created successfully.
        """
        # ARRANGE
        sut, mocks = setup
        sut.ctx = mocks["ctx"]  # Set ctx so the method doesn't return early
        mock_exists.return_value = True
        mock_open.return_value.__enter__.return_value.read.return_value = (
            "#version 430\nvoid main(){}"
        )
        mock_ctx = mocks["ctx"]
        mock_compute_shader = MagicMock()
        mock_ctx.compute_shader.return_value = mock_compute_shader

        # ACT
        sut._initialize_shader()

        # ASSERT
        mock_ctx.compute_shader.assert_called_once()
        assert sut.compute_shader == mock_compute_shader

    def test_initialize_buffers_without_particles_fails(self, setup):
        """
        GIVEN no particles data
        WHEN initialize_buffers is called
        THEN it returns False.
        """
        # ARRANGE
        sut, mocks = setup

        # ACT
        result = sut.initialize_buffers()

        # ASSERT
        assert result is False
        assert not sut.particles_initialized

    def test_compute_step_without_initialization_fails(self, setup):
        """
        GIVEN particles not initialized
        WHEN compute_step is called
        THEN it returns False.
        """
        # ARRANGE
        sut, mocks = setup
        sut.particles_initialized = False

        # ACT
        result = sut.compute_step()

        # ASSERT
        assert result is False

    def test_buffer_swap_logic(self, setup):
        """
        GIVEN a buffer pair
        WHEN swap is called
        THEN buffer states are correctly swapped.
        """
        # ARRANGE
        sut, mocks = setup
        buffer_pair = sut.particle_buffers

        # ACT & ASSERT - Test swap from INPUT to OUTPUT
        assert buffer_pair.current_input == BufferState.INPUT
        buffer_pair.swap()
        assert buffer_pair.current_input == BufferState.OUTPUT

        # ACT & ASSERT - Test swap from OUTPUT to INPUT
        buffer_pair.swap()
        assert buffer_pair.current_input == BufferState.INPUT

    @pytest.mark.asyncio
    async def test_shutdown_cleans_up_resources(self, setup):
        """
        GIVEN a particle engine with resources
        WHEN shutdown is called
        THEN resources are properly cleaned up.
        """
        # ARRANGE
        sut, mocks = setup
        mock_buffer = MagicMock()
        sut.uniform_buffer = mock_buffer
        mock_buffer_a = MagicMock()
        mock_buffer_b = MagicMock()
        sut.particle_buffers.buffer_a = mock_buffer_a
        sut.particle_buffers.buffer_b = mock_buffer_b

        # ACT
        await sut.shutdown()

        # ASSERT
        assert sut.uniform_buffer is None
        # Check that release was called on the mocks before they were set to None
        mock_buffer_a.release.assert_called_once()
        mock_buffer_b.release.assert_called_once()

    def test_metrics_tracking(self, setup):
        """
        GIVEN metrics enabled
        WHEN operations are performed
        THEN metrics are tracked correctly.
        """
        # ARRANGE
        sut, mocks = setup
        assert sut.enable_metrics is True
        assert sut.metrics is not None

        # ACT
        initial_swaps = sut.metrics.total_swaps
        sut.metrics.add_swap(0.5, 1024)

        # ASSERT
        assert sut.metrics.total_swaps == initial_swaps + 1
        assert sut.metrics.total_compute_time == 0.5
        assert sut.metrics.gpu_memory_saved == 1024
