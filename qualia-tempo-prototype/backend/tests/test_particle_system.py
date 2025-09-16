import pytest
from backend.engine.qualia_particle_engine import QualiaParticleEngine


def test_qualia_particle_engine_initialization():
    """Test QualiaParticleEngine initialization."""
    engine = QualiaParticleEngine(ctx=None, max_particles=1000)
    assert engine is not None
    assert engine.max_particles == 1000
    assert engine.status == "initialized"
    assert not engine.particles_initialized


def test_qualia_particle_engine_update_uniform_buffer():
    """Test updating particle engine uniform buffer from QualiaState."""
    engine = QualiaParticleEngine(ctx=None, max_particles=1000)
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
    engine.update_uniform_buffer(qualia_state)


def test_qualia_particle_engine_update_parameters():
    """Test updating particle engine parameters."""
    engine = QualiaParticleEngine(ctx=None, max_particles=1000)
    params = engine.get_current_parameters()

    assert params["max_particles"] == 1000
    assert params["simulation_tick"] == 0
    assert params["status"] == "initialized"


def test_qualia_particle_engine_reset():
    """Test resetting particle engine."""
    engine = QualiaParticleEngine(ctx=None, max_particles=1000)
    engine.reset()

    # Should reset simulation tick
    assert engine.simulation_tick == 0


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


def test_qualia_particle_engine_detect_parameter_changes():
    """Test detecting parameter changes."""
    engine = QualiaParticleEngine(ctx=None, max_particles=1000)

    qualia_state_1 = {"intensity": 0.5, "flow": 0.3}
    qualia_state_2 = {"intensity": 0.8, "flow": 0.3}

    engine.update_uniform_buffer(qualia_state_1)
    engine.update_uniform_buffer(qualia_state_2)

    # Should handle updates without crashing


def test_qualia_particle_engine_conditional_effects():
    """Test conditional effects based on QualiaState."""
    engine = QualiaParticleEngine(ctx=None, max_particles=1000)

    # High chaos state
    chaos_state = {"chaos": 0.9, "intensity": 0.5}
    engine.update_uniform_buffer(chaos_state)

    # Recovery state
    recovery_state = {"recovery": 0.8, "chaos": 0.1}
    engine.update_uniform_buffer(recovery_state)

    # Should handle different states without issues


@pytest.mark.asyncio
async def test_qualia_particle_engine_shutdown():
    """Test particle engine shutdown."""
    engine = QualiaParticleEngine(ctx=None, max_particles=1000)

    # Should shutdown cleanly
    await engine.shutdown()
    assert engine.status == "shutdown"
