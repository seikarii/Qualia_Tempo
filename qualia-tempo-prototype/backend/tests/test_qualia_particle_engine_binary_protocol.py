# QUALIA.CODE v1.1 - Tests for GOLD.CODE Binary Protocol Methods
# Tests for get_optimized_particle_data() and get_particle_metadata()

import pytest
import struct
from backend.engine.qualia_particle_engine import (
    QualiaParticleEngine,
    create_qualia_particle_engine,
    QUALIA_PARTICLE_ENGINE_AVAILABLE
)

# Skip tests if numpy not available
pytestmark = pytest.mark.skipif(
    not QUALIA_PARTICLE_ENGINE_AVAILABLE,
    reason="NumPy not available"
)


@pytest.fixture
def particle_engine():
    """Create a real QualiaParticleEngine instance for testing."""
    engine = create_qualia_particle_engine(max_particles=100)
    return engine


class TestBinaryProtocol:
    """Tests for GOLD.CODE binary protocol methods."""
    
    def test_get_optimized_particle_data_returns_bytes(self, particle_engine):
        """Test that get_optimized_particle_data() returns bytes."""
        result = particle_engine.get_optimized_particle_data()
        assert isinstance(result, bytes), "Should return bytes type"
    
    def test_get_optimized_particle_data_correct_size(self, particle_engine):
        """Test that binary data has correct size (particle_count * 62 bytes)."""
        result = particle_engine.get_optimized_particle_data()
        expected_size = 100 * 62  # 100 particles * 62 bytes per particle
        assert len(result) == expected_size, f"Expected {expected_size} bytes, got {len(result)}"
    
    def test_get_optimized_particle_data_uninitialized(self):
        """Test that uninitialized engine returns empty bytes."""
        engine = QualiaParticleEngine(max_particles=100)
        # Don't call initialize_buffers()
        engine.particles_initialized = False
        result = engine.get_optimized_particle_data()
        assert result == b'', "Uninitialized engine should return empty bytes"
    
    def test_get_particle_metadata_structure(self, particle_engine):
        """Test that get_particle_metadata() returns correct structure."""
        metadata = particle_engine.get_particle_metadata()
        
        assert isinstance(metadata, dict), "Metadata should be a dictionary"
        assert metadata["format"] == "GOLD.CODE-1.0"
        assert metadata["particle_count"] == 100
        assert metadata["bytes_per_particle"] == 62
        assert metadata["total_bytes"] == 6200  # 100 * 62
        assert metadata["dtype"] == "structured_numpy_array"
        assert "fields" in metadata
    
    def test_get_particle_metadata_fields(self, particle_engine):
        """Test that metadata contains all expected fields."""
        metadata = particle_engine.get_particle_metadata()
        fields = metadata["fields"]
        
        expected_fields = [
            "position", "velocity", "acceleration", "force_accumulator",
            "color", "lifetime", "size", "resonance", "mass", "charge"
        ]
        
        field_names = [f["name"] for f in fields]
        for expected_field in expected_fields:
            assert expected_field in field_names, f"Missing field: {expected_field}"
    
    def test_get_particle_metadata_field_offsets(self, particle_engine):
        """Test that field offsets are correct."""
        metadata = particle_engine.get_particle_metadata()
        fields = {f["name"]: f for f in metadata["fields"]}
        
        # Verify offsets match GOLD.CODE specification
        assert fields["position"]["offset"] == 0
        assert fields["velocity"]["offset"] == 12  # position (12 bytes) + 0
        assert fields["acceleration"]["offset"] == 24  # velocity (12 bytes) + 12
        assert fields["force_accumulator"]["offset"] == 36  # acceleration (12 bytes) + 24
        assert fields["color"]["offset"] == 48  # force_accumulator (12 bytes) + 36
        assert fields["lifetime"]["offset"] == 52  # color (4 bytes) + 48
        assert fields["size"]["offset"] == 54  # lifetime (2 bytes) + 52
        assert fields["resonance"]["offset"] == 56  # size (2 bytes) + 54
        assert fields["mass"]["offset"] == 58  # resonance (2 bytes) + 56
        assert fields["charge"]["offset"] == 60  # mass (2 bytes) + 58
    
    def test_get_particle_metadata_uninitialized(self):
        """Test that uninitialized engine returns minimal metadata."""
        engine = QualiaParticleEngine(max_particles=100)
        engine.particles_initialized = False
        metadata = engine.get_particle_metadata()
        
        assert metadata["particle_count"] == 0
        assert metadata["total_bytes"] == 0
        assert metadata["fields"] == []
    
    def test_binary_data_integrity(self, particle_engine):
        """Test that binary data can be decoded back to structured array."""
        import numpy as np
        from backend.engine.ParticleStateCalculator import OPTIMIZED_PARTICLE_DTYPE
        
        # Get binary data
        binary_data = particle_engine.get_optimized_particle_data()
        
        # Decode back to structured array
        particles = np.frombuffer(binary_data, dtype=OPTIMIZED_PARTICLE_DTYPE)
        
        # Verify correct number of particles
        assert len(particles) == 100
        
        # Verify structure (all fields should exist)
        assert 'position' in particles.dtype.names
        assert 'velocity' in particles.dtype.names
        assert 'color' in particles.dtype.names
        assert 'lifetime' in particles.dtype.names
    
    def test_binary_protocol_integration(self, particle_engine):
        """Test full binary protocol workflow: update → binary → metadata."""
        # Update particles
        success = particle_engine.update(dt=0.016)
        assert success
        
        # Get binary data
        binary_data = particle_engine.get_optimized_particle_data()
        assert len(binary_data) > 0
        
        # Get metadata
        metadata = particle_engine.get_particle_metadata()
        assert metadata["particle_count"] == 100
        
        # Verify consistency
        assert len(binary_data) == metadata["total_bytes"]
