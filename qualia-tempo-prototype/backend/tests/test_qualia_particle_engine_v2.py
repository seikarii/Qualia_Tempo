# ARCHITECTURE.GOLD.CODE v2 - QualiaParticleEngine v2 Tests
# Tests for wrapper/facade functionality (no GPU)

import pytest
import numpy as np
from unittest.mock import Mock, MagicMock, patch

from backend.engine.qualia_particle_engine import (
    QualiaParticleEngine,
    QualiaMetrics,
    create_qualia_particle_engine,
    QUALIA_PARTICLE_ENGINE_AVAILABLE
)
from backend.engine.ParticleStateCalculator import PhysicsConfig


class TestQualiaMetrics:
    """Test suite for QualiaMetrics dataclass."""

    def test_metrics_initialization(self):
        """Test metrics initialization with default values."""
        metrics = QualiaMetrics()
        
        assert metrics.total_updates == 0
        assert metrics.total_compute_time == 0.0
        assert metrics.average_update_time == 0.0
        assert metrics.particles_processed == 0

    def test_add_update_single(self):
        """Test adding a single update to metrics."""
        metrics = QualiaMetrics()
        metrics.add_update(compute_time=0.016, particle_count=1000)
        
        assert metrics.total_updates == 1
        assert metrics.total_compute_time == 0.016
        assert metrics.average_update_time == 0.016
        assert metrics.particles_processed == 1000

    def test_add_update_multiple(self):
        """Test adding multiple updates and average calculation."""
        metrics = QualiaMetrics()
        
        metrics.add_update(0.010, 1000)
        metrics.add_update(0.020, 1000)
        metrics.add_update(0.030, 1000)
        
        assert metrics.total_updates == 3
        assert metrics.total_compute_time == 0.060
        assert metrics.average_update_time == pytest.approx(0.020, 0.001)
        assert metrics.particles_processed == 3000


class TestQualiaParticleEngineV2:
    """Test suite for QualiaParticleEngine v2 wrapper."""

    def test_initialization_default(self):
        """Test engine initialization with default parameters."""
        engine = QualiaParticleEngine(max_particles=100)
        
        assert engine.max_particles == 100
        assert engine.enable_metrics is True
        assert engine.event_bus is None
        assert engine.simulation_tick == 0
        assert engine.status == "initialized"
        assert engine.particles_initialized is False
        assert engine.metrics is not None
        assert engine.calculator is None

    def test_initialization_with_event_bus(self):
        """Test engine initialization with EventBus."""
        mock_event_bus = Mock()
        engine = QualiaParticleEngine(max_particles=500, event_bus=mock_event_bus)
        
        assert engine.event_bus is mock_event_bus

    def test_initialization_with_deprecated_params(self):
        """Test that deprecated parameters log warnings."""
        mock_ctx = Mock()
        mock_inspector = Mock()
        
        with patch('backend.engine.qualia_particle_engine.logger') as mock_logger:
            engine = QualiaParticleEngine(
                ctx=mock_ctx,
                shader_inspector=mock_inspector
            )
            
            # Should log warnings for deprecated parameters
            assert mock_logger.warning.call_count == 2

    def test_initialize_buffers_success(self):
        """Test successful buffer initialization."""
        engine = QualiaParticleEngine(max_particles=10)
        result = engine.initialize_buffers()
        
        assert result is True
        assert engine.particles_initialized is True
        assert engine.status == "running"
        assert engine.calculator is not None
        assert engine.calculator.max_particles == 10

    def test_initialize_buffers_with_custom_data(self):
        """Test buffer initialization with custom particle data."""
        from backend.engine.ParticleStateCalculator import OPTIMIZED_PARTICLE_DTYPE
        
        custom_data = np.zeros(5, dtype=OPTIMIZED_PARTICLE_DTYPE)
        custom_data['position'] = np.array([[1, 2, 3]] * 5, dtype=np.float32)
        
        engine = QualiaParticleEngine(max_particles=5)
        result = engine.initialize_buffers(particles_data=custom_data)
        
        assert result is True
        assert np.array_equal(
            engine.calculator.particles['position'],
            np.array([[1, 2, 3]] * 5, dtype=np.float32)
        )

    def test_update_without_initialization(self):
        """Test that update fails without initialization."""
        engine = QualiaParticleEngine(max_particles=10)
        result = engine.update()
        
        assert result is False

    def test_update_success(self):
        """Test successful particle update."""
        engine = QualiaParticleEngine(max_particles=10)
        engine.initialize_buffers()
        
        result = engine.update(dt=0.016)
        
        assert result is True
        assert engine.simulation_tick == 1

    def test_update_increments_tick(self):
        """Test that update increments simulation tick."""
        engine = QualiaParticleEngine(max_particles=10)
        engine.initialize_buffers()
        
        for i in range(5):
            engine.update(dt=0.016)
        
        assert engine.simulation_tick == 5

    def test_update_records_metrics(self):
        """Test that update records performance metrics."""
        engine = QualiaParticleEngine(max_particles=10, enable_metrics=True)
        engine.initialize_buffers()
        
        engine.update(dt=0.016)
        
        assert engine.metrics.total_updates == 1
        assert engine.metrics.total_compute_time > 0
        assert engine.metrics.particles_processed == 10

    def test_update_from_qualia_state(self):
        """Test queuing QualiaState updates."""
        engine = QualiaParticleEngine(max_particles=10)
        engine.initialize_buffers()
        
        mock_qualia_state = Mock()
        mock_qualia_state.intensity = 0.8
        mock_qualia_state.transcendence = 0.6
        
        engine.update_from_qualia_state(mock_qualia_state)
        
        assert engine._pending_qualia_state is mock_qualia_state

    def test_apply_qualia_state_intensity(self):
        """Test that QualiaState intensity affects gravity."""
        engine = QualiaParticleEngine(max_particles=10)
        engine.initialize_buffers()
        
        mock_qualia_state = Mock()
        mock_qualia_state.intensity = 0.5
        mock_qualia_state.transcendence = 0.0
        mock_qualia_state.chaos = 0.0
        mock_qualia_state.aggression = 0.0
        
        engine._apply_qualia_state_to_physics(mock_qualia_state)
        
        # intensity = 0.5 → gravity = 9.8 * (1.0 + 0.5) = 14.7
        assert engine.physics_config.gravity == pytest.approx(14.7, 0.01)

    def test_apply_qualia_state_transcendence(self):
        """Test that transcendence creates attractive force field."""
        engine = QualiaParticleEngine(max_particles=10)
        engine.initialize_buffers()
        
        mock_qualia_state = Mock()
        mock_qualia_state.intensity = 0.0
        mock_qualia_state.transcendence = 0.8
        mock_qualia_state.chaos = 0.0
        mock_qualia_state.aggression = 0.0
        
        engine._apply_qualia_state_to_physics(mock_qualia_state)
        
        # transcendence > 0.5 should create force field
        assert len(engine.calculator.force_fields) == 1
        assert engine.calculator.force_fields[0]['strength'] == pytest.approx(160.0, 0.1)  # 200 * 0.8

    def test_apply_qualia_state_chaos(self):
        """Test that chaos creates repulsive force fields."""
        engine = QualiaParticleEngine(max_particles=10)
        engine.initialize_buffers()
        
        mock_qualia_state = Mock()
        mock_qualia_state.intensity = 0.0
        mock_qualia_state.transcendence = 0.0
        mock_qualia_state.chaos = 0.6
        mock_qualia_state.aggression = 0.0
        
        engine._apply_qualia_state_to_physics(mock_qualia_state)
        
        # chaos = 0.6 should create multiple repulsive fields
        num_fields = int(0.6 * 3) + 1  # = 2
        assert len(engine.calculator.force_fields) == num_fields

    def test_apply_qualia_state_aggression(self):
        """Test that aggression affects damping."""
        engine = QualiaParticleEngine(max_particles=10)
        engine.initialize_buffers()
        
        mock_qualia_state = Mock()
        mock_qualia_state.intensity = 0.0
        mock_qualia_state.transcendence = 0.0
        mock_qualia_state.chaos = 0.0
        mock_qualia_state.aggression = 0.4
        
        engine._apply_qualia_state_to_physics(mock_qualia_state)
        
        # aggression = 0.4 → damping = 0.98 - (0.4 * 0.15) = 0.92
        assert engine.physics_config.damping == pytest.approx(0.92, 0.01)

    def test_get_particle_states(self):
        """Test getting particle states as JSON-serializable list."""
        engine = QualiaParticleEngine(max_particles=2)
        engine.initialize_buffers()
        
        states = engine.get_particle_states()
        
        assert len(states) == 2
        assert isinstance(states, list)
        assert 'position' in states[0]
        assert 'velocity' in states[0]
        assert 'color' in states[0]

    def test_get_particle_states_without_initialization(self):
        """Test that get_particle_states returns empty list without init."""
        engine = QualiaParticleEngine(max_particles=10)
        states = engine.get_particle_states()
        
        assert states == []

    def test_get_statistics(self):
        """Test getting comprehensive statistics."""
        engine = QualiaParticleEngine(max_particles=100, enable_metrics=True)
        engine.initialize_buffers()
        engine.update(dt=0.016)
        
        stats = engine.get_statistics()
        
        assert 'simulation_tick' in stats
        assert 'status' in stats
        assert 'particles_initialized' in stats
        assert 'max_particles' in stats
        assert 'total_updates' in stats
        assert 'calculator_simulation_time' in stats
        
        assert stats['simulation_tick'] == 1
        assert stats['status'] == "running"
        assert stats['particles_initialized'] is True
        assert stats['max_particles'] == 100

    def test_cleanup(self):
        """Test cleanup of engine resources."""
        engine = QualiaParticleEngine(max_particles=10)
        engine.initialize_buffers()
        
        engine.cleanup()
        
        assert engine.calculator is None
        assert engine.particles_initialized is False
        assert engine.status == "cleaned_up"

    def test_deprecated_initialize_shader(self):
        """Test that deprecated _initialize_shader logs warning."""
        engine = QualiaParticleEngine()
        
        with patch('backend.engine.qualia_particle_engine.logger') as mock_logger:
            engine._initialize_shader()
            mock_logger.warning.assert_called_once()

    def test_deprecated_create_qualia_shader(self):
        """Test that deprecated _create_qualia_shader logs warning."""
        engine = QualiaParticleEngine()
        
        with patch('backend.engine.qualia_particle_engine.logger') as mock_logger:
            engine._create_qualia_shader("dummy_path")
            mock_logger.warning.assert_called_once()

    def test_deprecated_get_output_buffer(self):
        """Test that deprecated get_output_buffer logs warning and returns None."""
        engine = QualiaParticleEngine()
        
        with patch('backend.engine.qualia_particle_engine.logger') as mock_logger:
            result = engine.get_output_buffer()
            mock_logger.warning.assert_called_once()
            assert result is None

    def test_deprecated_read_particle_data(self):
        """Test that deprecated read_particle_data logs warning."""
        engine = QualiaParticleEngine(max_particles=10)
        engine.initialize_buffers()
        
        with patch('backend.engine.qualia_particle_engine.logger') as mock_logger:
            result = engine.read_particle_data()
            mock_logger.warning.assert_called_once()
            assert result is not None  # Should return calculator.particles


class TestFactoryFunction:
    """Test suite for factory function."""

    def test_create_qualia_particle_engine(self):
        """Test factory function creates and initializes engine."""
        engine = create_qualia_particle_engine(max_particles=50)
        
        assert engine.max_particles == 50
        assert engine.particles_initialized is True
        assert engine.status == "running"

    def test_factory_with_event_bus(self):
        """Test factory function with EventBus."""
        mock_event_bus = Mock()
        engine = create_qualia_particle_engine(
            max_particles=100,
            enable_metrics=False,
            event_bus=mock_event_bus
        )
        
        assert engine.event_bus is mock_event_bus
        assert engine.metrics is None
