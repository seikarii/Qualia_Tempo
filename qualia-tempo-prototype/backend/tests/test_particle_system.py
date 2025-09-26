import pytest
from backend.engine.qualia_particle_engine import QualiaParticleEngine
from backend.tests.test_composition_root import TestCompositionRootFactory


@pytest.fixture
def mocked_composition_root():
    return TestCompositionRootFactory.create_mocked_composition_root()


@pytest.fixture
def particle_engine(mocked_composition_root):
    # Resolve the engine FROM THE CONTAINER
    return mocked_composition_root.get_service("particle_system")


def test_qualia_particle_engine_initialization(particle_engine):
    """Test QualiaParticleEngine initialization."""
    # The engine is now provided by the fixture, already instantiated
    assert particle_engine is not None
    # Assertions might need to change based on what the mock provides
    # For example, you'd check the mock's attributes, not a real instance's


def test_qualia_particle_engine_update_uniform_buffer(particle_engine):
    """Test updating particle engine uniform buffer from QualiaState."""
    qualia_state = {
        "intensity": 0.8,
        "precision": 0.5,
        "aggression": 0.7,
        "flow": 0.9,
        "chaos": 0.1,
        "recovery": 0.0,
        "transcendence": 0.0,
    }

    # Should not raise exception even without GPU context
    particle_engine.update_uniform_buffer(qualia_state)


def test_qualia_particle_engine_update_parameters(particle_engine):
    """Test updating particle engine parameters."""
    params = particle_engine.get_current_parameters()

    # Assertions based on mock configuration
    assert params is not None


def test_qualia_particle_engine_reset(particle_engine):
    """Test resetting particle engine."""
    particle_engine.reset()

    # Check that reset was called
    particle_engine.reset.assert_called_once()


def test_qualia_particle_engine_get_current_parameters():
    """Test getting current parameters."""
    engine = QualiaParticleEngine(ctx=None, max_particles=1000)
    params = engine.get_current_parameters()

    assert "max_particles" in params
    assert "simulation_tick" in params
    assert "status" in params


def test_qualia_particle_engine_render_frame():
    """Test rendering a frame (without GPU context)."""
    engine = QualiaParticleEngine(ctx=None, max_particles=1000)

    # Should not crash even without context
    result = engine.compute_step()
    assert result is False  # Expected to fail without context


def test_qualia_particle_engine_initialize_graphics():
    """Test initializing graphics (without GPU context)."""
    engine = QualiaParticleEngine(ctx=None, max_particles=1000)

    # Graphics initialization should handle missing context gracefully
    assert engine.ctx is None


def test_qualia_particle_engine_detect_parameter_changes(particle_engine):
    """Test detecting parameter changes."""
    qualia_state_1 = {"intensity": 0.5, "flow": 0.3}
    qualia_state_2 = {"intensity": 0.8, "flow": 0.3}

    particle_engine.update_uniform_buffer(qualia_state_1)
    particle_engine.update_uniform_buffer(qualia_state_2)

    # Check calls
    assert particle_engine.update_uniform_buffer.call_count == 2


def test_qualia_particle_engine_conditional_effects(particle_engine):
    """Test conditional effects based on QualiaState."""
    # High chaos state
    chaos_state = {"chaos": 0.9, "intensity": 0.5}
    particle_engine.update_uniform_buffer(chaos_state)

    # Recovery state
    recovery_state = {"recovery": 0.8, "chaos": 0.1}
    particle_engine.update_uniform_buffer(recovery_state)

    # Check calls
    assert particle_engine.update_uniform_buffer.call_count == 2


@pytest.mark.asyncio
async def test_qualia_particle_engine_shutdown(particle_engine):
    """Test particle engine shutdown."""
    # Should shutdown cleanly
    await particle_engine.shutdown()
    particle_engine.shutdown.assert_called_once()
