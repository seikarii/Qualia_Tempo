# Tests for ParticleStateCalculator - ARCHITECTURE.GOLD.CODE compliant
# Tests pure Python particle physics without GPU dependencies

import pytest
import numpy as np
from unittest.mock import Mock, patch

from backend.engine.ParticleStateCalculator import (
    ParticleStateCalculator,
    PhysicsConfig,
    OPTIMIZED_PARTICLE_DTYPE,
    create_particle_state_calculator
)


class TestParticleStateCalculator:
    """Test suite for ParticleStateCalculator."""

    def test_initialization_default(self):
        """Test calculator initialization with default parameters."""
        calculator = ParticleStateCalculator(max_particles=100)
        
        assert calculator.max_particles == 100
        assert calculator.particles.shape == (100,)
        assert calculator.particles.dtype == OPTIMIZED_PARTICLE_DTYPE
        assert len(calculator.force_fields) == 0
        assert calculator.simulation_time == 0.0
        assert calculator.simulation_tick == 0

    def test_initialization_with_config(self):
        """Test calculator initialization with custom physics config."""
        config = PhysicsConfig(
            gravity=5.0,
            damping=0.95,
            collision_elasticity=0.8,
            max_velocity=50.0,
            dt=0.033
        )
        
        calculator = ParticleStateCalculator(
            max_particles=500,
            physics_config=config
        )
        
        assert calculator.physics_config.gravity == 5.0
        assert calculator.physics_config.damping == 0.95
        assert calculator.physics_config.collision_elasticity == 0.8
        assert calculator.physics_config.max_velocity == 50.0
        assert calculator.physics_config.dt == 0.033

    def test_numpy_not_available(self):
        """Test that ImportError is raised when NumPy is not available."""
        with patch('backend.engine.ParticleStateCalculator.np', None):
            with pytest.raises(ImportError, match="NumPy is required"):
                ParticleStateCalculator(max_particles=100)

    def test_initialize_particles_default(self):
        """Test default particle initialization."""
        calculator = ParticleStateCalculator(max_particles=10)
        result = calculator.initialize_particles()
        
        assert result is True
        
        # Check that positions are within bounds
        assert np.all(calculator.particles['position'] >= -10.0)
        assert np.all(calculator.particles['position'] <= 10.0)
        
        # Check that velocities are initialized
        assert np.all(calculator.particles['velocity'] >= -1.0)
        assert np.all(calculator.particles['velocity'] <= 1.0)
        
        # Check that color is initialized
        assert np.all(calculator.particles['color'] == [255, 255, 255, 255])

    def test_initialize_particles_with_data(self):
        """Test particle initialization with pre-existing data."""
        calculator = ParticleStateCalculator(max_particles=5)
        
        custom_particles = np.zeros(5, dtype=OPTIMIZED_PARTICLE_DTYPE)
        custom_particles['position'] = np.array([[1, 2, 3]] * 5, dtype=np.float32)
        
        result = calculator.initialize_particles(particle_data=custom_particles)
        
        assert result is True
        assert np.array_equal(
            calculator.particles['position'],
            np.array([[1, 2, 3]] * 5, dtype=np.float32)
        )

    def test_update_increases_simulation_time(self):
        """Test that update() advances simulation time."""
        calculator = ParticleStateCalculator(max_particles=10)
        calculator.initialize_particles()
        
        dt = 0.016
        result = calculator.update(dt=dt)
        
        assert result is True
        assert calculator.simulation_time == dt
        assert calculator.simulation_tick == 1

    def test_update_multiple_times(self):
        """Test multiple update calls."""
        calculator = ParticleStateCalculator(max_particles=10)
        calculator.initialize_particles()
        
        for i in range(10):
            result = calculator.update(dt=0.016)
            assert result is True
        
        assert calculator.simulation_tick == 10
        assert pytest.approx(calculator.simulation_time, 0.001) == 0.16

    def test_apply_gravity(self):
        """Test gravity application to particles."""
        calculator = ParticleStateCalculator(max_particles=1)
        calculator.initialize_particles()
        
        # Set initial state - position above ground to avoid immediate collision
        calculator.particles['position'] = np.array([[0, 5, 0]], dtype=np.float32)
        calculator.particles['velocity'] = np.array([[0, 0, 0]], dtype=np.float32)
        calculator.particles['mass'] = np.array([1.0], dtype=np.float16)
        
        # Apply small physics step
        calculator.update(dt=0.1)
        
        # Velocity should have negative y component due to gravity
        assert calculator.particles['velocity'][0, 1] < 0

    def test_damping_reduces_velocity(self):
        """Test that damping reduces particle velocity over time."""
        calculator = ParticleStateCalculator(max_particles=1)
        calculator.initialize_particles()
        
        # Set high initial velocity
        calculator.particles['velocity'] = np.array([[100, 100, 100]], dtype=np.float32)
        calculator.particles['position'] = np.array([[0, 0, 0]], dtype=np.float32)
        
        initial_speed = np.linalg.norm(calculator.particles['velocity'][0])
        
        # Run multiple updates
        for _ in range(10):
            calculator.update(dt=0.016)
        
        final_speed = np.linalg.norm(calculator.particles['velocity'][0])
        
        # Speed should decrease due to damping
        assert final_speed < initial_speed

    def test_boundary_collision(self):
        """Test particle collision with boundaries."""
        calculator = ParticleStateCalculator(max_particles=1)
        calculator.initialize_particles()
        
        # Place particle outside boundary with velocity towards boundary
        calculator.particles['position'] = np.array([[15, 0, 0]], dtype=np.float32)
        calculator.particles['velocity'] = np.array([[10, 0, 0]], dtype=np.float32)
        
        calculator.update(dt=0.016)
        
        # Particle should be clamped to boundary
        assert calculator.particles['position'][0, 0] <= 10.0
        
        # Velocity should be reversed (with elasticity)
        assert calculator.particles['velocity'][0, 0] < 0

    def test_add_force_field(self):
        """Test adding a force field."""
        calculator = ParticleStateCalculator(max_particles=10)
        calculator.initialize_particles()
        
        calculator.add_force_field(
            position=(0, 0, 0),
            strength=10.0,
            radius=5.0
        )
        
        assert len(calculator.force_fields) == 1
        assert calculator.force_fields[0]['position'] == (0, 0, 0)
        assert calculator.force_fields[0]['strength'] == 10.0
        assert calculator.force_fields[0]['radius'] == 5.0

    def test_clear_force_fields(self):
        """Test clearing all force fields."""
        calculator = ParticleStateCalculator(max_particles=10)
        calculator.initialize_particles()
        
        calculator.add_force_field((0, 0, 0), 10.0, 5.0)
        calculator.add_force_field((5, 5, 5), 20.0, 3.0)
        
        assert len(calculator.force_fields) == 2
        
        calculator.clear_force_fields()
        
        assert len(calculator.force_fields) == 0

    def test_force_field_attracts_particles(self):
        """Test that attractive force field moves particles."""
        # Use config with no gravity to isolate force field effects
        config = PhysicsConfig(gravity=0.0)
        calculator = ParticleStateCalculator(max_particles=1, physics_config=config)
        calculator.initialize_particles()
        
        # Place particle away from origin
        calculator.particles['position'] = np.array([[5, 0, 0]], dtype=np.float32)
        calculator.particles['velocity'] = np.array([[0, 0, 0]], dtype=np.float32)
        calculator.particles['mass'] = np.array([1.0], dtype=np.float16)
        
        # Add attractive force field at (0, 0, 0)
        calculator.add_force_field(
            position=(0, 0, 0),
            strength=100.0,
            radius=10.0
        )
        
        initial_x = calculator.particles['position'][0, 0]
        
        # Run simulation
        for _ in range(100):
            calculator.update(dt=0.016)
        
        final_x = calculator.particles['position'][0, 0]
        
        # Particle should move towards origin (x should decrease)
        assert final_x < initial_x

    def test_lifetime_respawn(self):
        """Test particle respawn after lifetime expires."""
        calculator = ParticleStateCalculator(max_particles=1)
        calculator.initialize_particles()
        
        # Set very short lifetime
        calculator.particles['lifetime'] = np.array([0.001], dtype=np.float16)
        original_position = calculator.particles['position'][0].copy()
        
        # Update beyond lifetime
        calculator.update(dt=0.1)
        
        # Position should have changed (respawned)
        assert not np.array_equal(calculator.particles['position'][0], original_position)
        
        # New lifetime should be positive
        assert calculator.particles['lifetime'][0] > 0

    def test_get_particle_states(self):
        """Test getting particle states as JSON-serializable list."""
        calculator = ParticleStateCalculator(max_particles=2)
        calculator.initialize_particles()
        
        states = calculator.get_particle_states()
        
        assert len(states) == 2
        assert 'position' in states[0]
        assert 'velocity' in states[0]
        assert 'color' in states[0]
        assert 'lifetime' in states[0]
        assert 'size' in states[0]
        assert 'resonance' in states[0]
        
        # Check that values are Python types (not NumPy)
        assert isinstance(states[0]['position'], list)
        assert isinstance(states[0]['lifetime'], float)

    def test_get_statistics(self):
        """Test getting simulation statistics."""
        calculator = ParticleStateCalculator(max_particles=100)
        calculator.initialize_particles()
        calculator.add_force_field((0, 0, 0), 10.0, 5.0)
        
        calculator.update(dt=0.016)
        
        stats = calculator.get_statistics()
        
        assert stats['simulation_time'] == 0.016
        assert stats['simulation_tick'] == 1
        assert stats['particle_count'] == 100
        assert stats['active_force_fields'] == 1
        assert 'memory_usage_kb' in stats

    def test_max_velocity_clamping(self):
        """Test that velocities are clamped to max_velocity."""
        config = PhysicsConfig(max_velocity=10.0)
        calculator = ParticleStateCalculator(max_particles=1, physics_config=config)
        calculator.initialize_particles()
        
        # Set very high velocity
        calculator.particles['velocity'] = np.array([[1000, 1000, 1000]], dtype=np.float32)
        
        calculator.update(dt=0.016)
        
        # Velocity magnitude should be clamped
        velocity_magnitude = np.linalg.norm(calculator.particles['velocity'][0])
        assert velocity_magnitude <= config.max_velocity * 1.01  # Small tolerance

    def test_integration_position_changes(self):
        """Test that position integration works correctly."""
        # Use config with no gravity for this test
        config = PhysicsConfig(gravity=0.0)
        calculator = ParticleStateCalculator(max_particles=1, physics_config=config)
        calculator.initialize_particles()
        
        # Set known state
        calculator.particles['position'] = np.array([[0, 0, 0]], dtype=np.float32)
        calculator.particles['velocity'] = np.array([[10, 0, 0]], dtype=np.float32)
        
        dt = 1.0
        calculator.update(dt=dt)
        
        # Position should have moved by velocity * dt (with damping applied)
        # Damping = 0.98, so velocity becomes 10 * 0.98 = 9.8
        # Position change ≈ 9.8 * 1.0 = 9.8
        assert calculator.particles['position'][0, 0] > 9.0
        assert calculator.particles['position'][0, 0] < 11.0


class TestFactoryFunction:
    """Test suite for factory function."""

    def test_create_particle_state_calculator(self):
        """Test factory function creates and initializes calculator."""
        calculator = create_particle_state_calculator(max_particles=50)
        
        assert calculator.max_particles == 50
        assert calculator.simulation_tick == 0
        
        # Particles should be initialized by factory
        assert calculator.particles is not None

    def test_factory_with_custom_config(self):
        """Test factory function with custom physics config."""
        config = PhysicsConfig(gravity=3.0)
        event_bus = Mock()
        
        calculator = create_particle_state_calculator(
            max_particles=100,
            physics_config=config,
            event_bus=event_bus
        )
        
        assert calculator.physics_config.gravity == 3.0
        assert calculator.event_bus is event_bus


class TestPhysicsConfig:
    """Test suite for PhysicsConfig dataclass."""

    def test_default_values(self):
        """Test PhysicsConfig default values."""
        config = PhysicsConfig()
        
        assert config.gravity == 9.8
        assert config.damping == 0.98
        assert config.collision_elasticity == 0.7
        assert config.max_velocity == 100.0
        assert config.dt == 0.016

    def test_custom_values(self):
        """Test PhysicsConfig with custom values."""
        config = PhysicsConfig(
            gravity=5.0,
            damping=0.9,
            collision_elasticity=0.5,
            max_velocity=200.0,
            dt=0.033
        )
        
        assert config.gravity == 5.0
        assert config.damping == 0.9
        assert config.collision_elasticity == 0.5
        assert config.max_velocity == 200.0
        assert config.dt == 0.033
