# GOLD.CODE Test Suite: Optimized Particle Data Structure
# Validates 26% memory reduction and GPU conversion accuracy

import pytest
import numpy as np
from backend.engine.qualia_particle_engine import (
    QualiaParticleEngine, 
    OPTIMIZED_PARTICLE_DTYPE,
    QUALIA_GPU_AVAILABLE
)


@pytest.mark.skipif(not QUALIA_GPU_AVAILABLE, reason="ModernGL and NumPy required")
class TestOptimizedParticles:
    """Test suite for GOLD.CODE optimized particle structure."""
    
    def test_optimized_dtype_definition(self):
        """Verify that OPTIMIZED_PARTICLE_DTYPE is correctly defined."""
        assert OPTIMIZED_PARTICLE_DTYPE is not None
        assert OPTIMIZED_PARTICLE_DTYPE.itemsize == 62, \
            f"Expected 62 bytes per particle, got {OPTIMIZED_PARTICLE_DTYPE.itemsize}"
        
        # Verify field names
        field_names = OPTIMIZED_PARTICLE_DTYPE.names
        expected_fields = [
            'position', 'velocity', 'acceleration', 'force_accumulator',
            'color', 'lifetime', 'size', 'resonance', 'mass', 'charge'
        ]
        assert set(field_names) == set(expected_fields), \
            f"Field mismatch. Expected: {expected_fields}, Got: {field_names}"
    
    def test_memory_optimization(self):
        """Validate 26% memory reduction from 84 to 62 bytes per particle."""
        # Create engine without GL context (no GPU needed for this test)
        engine = QualiaParticleEngine(ctx=None, max_particles=10000)
        
        # Create optimized particles
        particles = engine._create_initial_particles()
        
        # Verify dtype
        assert particles.dtype == OPTIMIZED_PARTICLE_DTYPE
        
        # Verify size reduction
        expected_size = 10000 * 62  # 62 bytes per particle
        assert particles.nbytes == expected_size, \
            f"Expected {expected_size} bytes, got {particles.nbytes}"
        
        # Verify 26% reduction from original
        original_size = 10000 * 84  # Original: 21 float32 = 84 bytes
        reduction = (original_size - particles.nbytes) / original_size
        assert abs(reduction - 0.262) < 0.01, \
            f"Expected ~26% reduction, got {reduction * 100:.1f}%"
    
    def test_field_data_types(self):
        """Verify that each field uses the correct data type."""
        engine = QualiaParticleEngine(ctx=None, max_particles=100)
        particles = engine._create_initial_particles()
        
        # Check vector fields are float32
        assert particles['position'].dtype == np.float32
        assert particles['velocity'].dtype == np.float32
        assert particles['acceleration'].dtype == np.float32
        assert particles['force_accumulator'].dtype == np.float32
        
        # Check color is uint8
        assert particles['color'].dtype == np.uint8
        
        # Check scalars are float16
        assert particles['lifetime'].dtype == np.float16
        assert particles['size'].dtype == np.float16
        assert particles['resonance'].dtype == np.float16
        assert particles['mass'].dtype == np.float16
        assert particles['charge'].dtype == np.float16
    
    def test_gpu_conversion_accuracy(self):
        """Verify that GPU conversion maintains data integrity."""
        engine = QualiaParticleEngine(ctx=None, max_particles=100)
        structured = engine._create_initial_particles()
        gpu_array = engine._convert_particles_to_gpu_format(structured)
        
        # Verify shape
        assert gpu_array.shape == (100, 21), \
            f"Expected shape (100, 21), got {gpu_array.shape}"
        
        # Verify dtype
        assert gpu_array.dtype == np.float32
        
        # Verify position preservation
        np.testing.assert_array_almost_equal(
            gpu_array[0, 0:3], 
            structured['position'][0],
            decimal=5,
            err_msg="Position not preserved during GPU conversion"
        )
        
        # Verify color normalization (uint8 → float32)
        colors_u8 = structured['color'][0]
        colors_f32 = gpu_array[0, 9:13]
        expected = colors_u8.astype(np.float32) / 255.0
        np.testing.assert_array_almost_equal(
            colors_f32,
            expected,
            decimal=6,
            err_msg="Color normalization failed"
        )
        
        # Verify float16 → float32 conversion
        lifetime_f16 = float(structured['lifetime'][0])
        lifetime_f32 = gpu_array[0, 13]
        assert abs(lifetime_f32 - lifetime_f16) < 0.01, \
            f"Lifetime conversion error: {lifetime_f16} → {lifetime_f32}"
    
    def test_structured_array_field_access(self):
        """Verify structured array allows field-based access."""
        engine = QualiaParticleEngine(ctx=None, max_particles=10)
        particles = engine._create_initial_particles()
        
        # Should be able to access fields by name
        positions = particles['position']
        assert positions.shape == (10, 3)
        
        colors = particles['color']
        assert colors.shape == (10, 4)
        assert colors.dtype == np.uint8
        
        masses = particles['mass']
        assert masses.shape == (10,)
        assert masses.dtype == np.float16
    
    def test_color_range_validation(self):
        """Verify colors are in valid uint8 range (0-255)."""
        engine = QualiaParticleEngine(ctx=None, max_particles=100)
        particles = engine._create_initial_particles()
        
        colors = particles['color']
        
        # All color values should be in 0-255 range
        assert np.all(colors >= 0) and np.all(colors <= 255), \
            "Colors outside uint8 range"
    
    def test_optimized_api_methods(self):
        """Verify API serialization methods work correctly."""
        engine = QualiaParticleEngine(ctx=None, max_particles=1000)
        engine._cpu_particles = engine._create_initial_particles()
        engine._structured_particles_cache = engine._cpu_particles
        engine.particles_initialized = True
        
        # Test get_optimized_particle_data
        binary_data = engine.get_optimized_particle_data()
        assert isinstance(binary_data, bytes)
        assert len(binary_data) == 1000 * 62, \
            f"Expected {1000 * 62} bytes, got {len(binary_data)}"
        
        # Test get_particle_metadata
        metadata = engine.get_particle_metadata()
        assert metadata["format_version"] == "GOLD.CODE-1.0"
        assert metadata["bytes_per_particle"] == 62
        assert metadata["count"] == 1000
        assert metadata["memory_savings"] == "26.2%"
        
        # Verify field metadata
        assert "position" in metadata["fields"]
        assert metadata["fields"]["position"]["type"] == "float32"
        assert metadata["fields"]["color"]["type"] == "uint8"
        assert metadata["fields"]["lifetime"]["type"] == "float16"
    
    def test_roundtrip_serialization(self):
        """Verify data can be serialized and deserialized without loss."""
        engine = QualiaParticleEngine(ctx=None, max_particles=50)
        original = engine._create_initial_particles()
        
        # Serialize to bytes
        binary_data = original.tobytes()
        
        # Deserialize back
        reconstructed = np.frombuffer(binary_data, dtype=OPTIMIZED_PARTICLE_DTYPE)
        
        # Verify exact match
        np.testing.assert_array_equal(
            original['position'],
            reconstructed['position'],
            err_msg="Position data not preserved in roundtrip"
        )
        
        np.testing.assert_array_equal(
            original['color'],
            reconstructed['color'],
            err_msg="Color data not preserved in roundtrip"
        )


@pytest.mark.skipif(not QUALIA_GPU_AVAILABLE, reason="ModernGL and NumPy required")
class TestPerformanceMetrics:
    """Performance and scalability tests for optimized particles."""
    
    def test_memory_scaling(self):
        """Verify memory savings scale linearly with particle count."""
        particle_counts = [1000, 10000, 100000]
        
        for count in particle_counts:
            engine = QualiaParticleEngine(ctx=None, max_particles=count)
            particles = engine._create_initial_particles()
            
            expected_size = count * 62
            assert particles.nbytes == expected_size
            
            # Calculate savings vs original format
            original_size = count * 84
            savings_mb = (original_size - particles.nbytes) / (1024 ** 2)
            
            print(f"\n{count:,} particles: {savings_mb:.2f} MB saved")
    
    def test_conversion_overhead(self):
        """Measure GPU conversion time for different particle counts."""
        import time
        
        engine = QualiaParticleEngine(ctx=None, max_particles=100000)
        structured = engine._create_initial_particles()
        
        start = time.time()
        gpu_array = engine._convert_particles_to_gpu_format(structured)
        elapsed = time.time() - start
        
        print(f"\nGPU conversion time for 100K particles: {elapsed * 1000:.2f}ms")
        
        # Conversion should be fast (< 50ms for 100K particles)
        assert elapsed < 0.05, \
            f"GPU conversion too slow: {elapsed * 1000:.1f}ms"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
