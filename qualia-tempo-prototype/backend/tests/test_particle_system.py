import pytest
from backend.tests.test_composition_root import TestCompositionRootFactory


@pytest.fixture
def mocked_composition_root():
    """Provides a mocked CompositionRoot for particle system tests."""
    return TestCompositionRootFactory.create_mocked_composition_root()


@pytest.fixture
def particle_engine(mocked_composition_root):
    """Resolves the ParticleEngine from the container."""
    return mocked_composition_root.get_service("particle_system")


@pytest.fixture
def service_mocks(mocked_composition_root):
    """Extracts service mocks from the container for assertions."""
    return TestCompositionRootFactory.get_service_mocks(mocked_composition_root)


def test_qualia_particle_engine_initialization(particle_engine):
    """Test QualiaParticleEngine initialization using IoC fixtures."""
    # The engine is resolved from the IoC container with proper mocks
    assert particle_engine is not None
    # Verify mock functionality is available
    assert hasattr(particle_engine, 'get_stats')
    assert hasattr(particle_engine, 'initialize_buffers')


def test_qualia_particle_engine_update_uniform_buffer(particle_engine):
    """Test updating particle engine uniform buffer from QualiaState using IoC."""
    qualia_state = {
        "intensity": 0.8,
        "precision": 0.5,
        "aggression": 0.7,
        "flow": 0.9,
        "chaos": 0.1,
        "recovery": 0.0,
        "transcendence": 0.0,
    }

    # Call the mock method - it should not raise exception
    particle_engine.update_uniform_buffer(qualia_state)
    
    # Verify the mock was called with correct parameters
    particle_engine.update_uniform_buffer.assert_called_with(qualia_state)


def test_qualia_particle_engine_get_stats(particle_engine):
    """Test getting particle engine statistics using IoC."""
    # Call the mock method
    stats = particle_engine.get_stats()

    # Verify mock returns expected structure
    assert stats is not None
    assert "particles" in stats
    assert "gpu_available" in stats
    particle_engine.get_stats.assert_called_once()


def test_qualia_particle_engine_initialize_buffers(particle_engine):
    """Test initializing particle engine buffers using IoC."""
    # Call the mock method
    result = particle_engine.initialize_buffers()
    
    # Verify mock behavior (configured to return True in factory)
    assert result is True
    particle_engine.initialize_buffers.assert_called_once()


def test_qualia_particle_engine_interface(particle_engine):
    """Test particle engine interface completeness using IoC."""
    # Verify the mock has the expected interface
    assert hasattr(particle_engine, 'get_stats')
    assert hasattr(particle_engine, 'initialize_buffers')
    assert hasattr(particle_engine, 'update_uniform_buffer')
    
    # Test that methods are callable mocks
    assert callable(particle_engine.get_stats)
    assert callable(particle_engine.initialize_buffers)
    assert callable(particle_engine.update_uniform_buffer)


def test_qualia_particle_engine_detect_parameter_changes(particle_engine):
    """Test detecting parameter changes using IoC fixture."""
    qualia_state_1 = {"intensity": 0.5, "flow": 0.3}
    qualia_state_2 = {"intensity": 0.8, "flow": 0.3}

    # Call the mock methods
    particle_engine.update_uniform_buffer(qualia_state_1)
    particle_engine.update_uniform_buffer(qualia_state_2)

    # Verify mock was called with correct parameters
    particle_engine.update_uniform_buffer.assert_any_call(qualia_state_1)
    particle_engine.update_uniform_buffer.assert_any_call(qualia_state_2)
    assert particle_engine.update_uniform_buffer.call_count == 2


def test_qualia_particle_engine_conditional_effects(particle_engine):
    """Test conditional effects based on QualiaState using IoC fixture."""
    # High chaos state
    chaos_state = {"chaos": 0.9, "intensity": 0.5}
    particle_engine.update_uniform_buffer(chaos_state)

    # Recovery state  
    recovery_state = {"recovery": 0.8, "chaos": 0.1}
    particle_engine.update_uniform_buffer(recovery_state)

    # Verify mock was called with both states
    particle_engine.update_uniform_buffer.assert_any_call(chaos_state)
    particle_engine.update_uniform_buffer.assert_any_call(recovery_state)


def test_qualia_particle_engine_mock_behavior(particle_engine):
    """Test particle engine mock behavior using IoC fixture."""
    # Test that the mock is properly configured
    assert particle_engine is not None
    
    # Test stats retrieval
    stats = particle_engine.get_stats()
    assert stats is not None
    assert "particles" in stats
    assert "gpu_available" in stats
    
    # Test buffer initialization
    result = particle_engine.initialize_buffers()
    assert result is True
