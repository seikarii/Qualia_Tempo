#!/usr/bin/env python3
"""
CRISALIDA.CODE - Simple Particle Rendering Test
Direct test of particle rendering without complex imports
"""

import moderngl
import numpy as np
from PIL import Image
import io
import logging
import sys

logging.basicConfig(level=logging.INFO, format='%(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def create_simple_particle_data(num_particles=100):
    """Create simple particle data for testing."""
    particles = np.zeros((num_particles, 21), dtype=np.float32)
    
    # Random positions
    particles[:, 0:3] = np.random.uniform(-2.0, 2.0, (num_particles, 3))
    
    # Small velocities
    particles[:, 3:6] = np.random.uniform(-0.1, 0.1, (num_particles, 3))
    
    # Colors (red particles)
    particles[:, 9:13] = [1.0, 0.0, 0.0, 1.0]
    
    # Lifetimes
    particles[:, 13] = np.random.uniform(1.0, 3.0, num_particles)
    
    # Sizes
    particles[:, 14] = np.random.uniform(0.05, 0.15, num_particles)
    
    # Masses
    particles[:, 16] = np.random.uniform(0.5, 2.0, num_particles)
    
    return particles

def test_basic_particle_rendering():
    """Test basic particle rendering with hardcoded shaders."""
    logger.info("🚀 Testing basic particle rendering...")
    
    ctx = None
    try:
        # Create context
        ctx = moderngl.create_standalone_context(require=330)
        logger.info("✅ OpenGL context created")
        
        # Create framebuffer
        fbo = ctx.framebuffer(
            color_attachments=[ctx.texture((800, 600), 4)]
        )
        fbo.use()
        logger.info("✅ Framebuffer created")
        
        # Create particle data
        particles = create_simple_particle_data(100)
        particle_bytes = particles.astype(np.float32).tobytes()
        logger.info(f"✅ Created particle data: {len(particles)} particles")
        
        # Create buffer
        particle_buffer = ctx.buffer(particle_bytes)
        logger.info("✅ Particle buffer created")
        
        # Simple vertex shader for points
        vertex_shader = """
        #version 330 core
        in vec3 position;
        in vec4 color;
        in float size;
        
        out vec4 frag_color;
        
        void main() {
            gl_Position = vec4(position, 1.0);
            gl_PointSize = size * 50.0; // Scale point size
            frag_color = color;
        }
        """
        
        # Simple fragment shader
        fragment_shader = """
        #version 330 core
        in vec4 frag_color;
        out vec4 out_color;
        
        void main() {
            // Create circular points
            vec2 center = gl_PointCoord - vec2(0.5);
            float dist = length(center);
            if (dist > 0.5) discard;
            
            out_color = frag_color;
        }
        """
        
        # Create program
        program = ctx.program(
            vertex_shader=vertex_shader,
            fragment_shader=fragment_shader
        )
        logger.info("✅ Shaders compiled and linked")
        
        # Create VAO
        vao = ctx.vertex_array(
            program,
            [(particle_buffer, '3f 3f 3f 4f 1f 1f 1f 1f 3f', 'position', 'velocity', 'acceleration', 'color', 'lifetime', 'size', 'resonance', 'mass', 'force_accumulator')]
        )
        logger.info("✅ VAO created")
        
        # Clear and render
        ctx.clear(0.0, 0.0, 0.0, 1.0)  # Black background
        ctx.enable(moderngl.PROGRAM_POINT_SIZE)
        # Remove blend_func as it's not supported in standalone context
        # ctx.enable(moderngl.BLEND)
        # ctx.blend_func(moderngl.SRC_ALPHA, moderngl.ONE)
        
        vao.render(moderngl.POINTS, vertices=len(particles))
        logger.info("✅ Particles rendered")
        
        # Read pixels
        raw_data = fbo.read(components=4, alignment=1)
        image = Image.frombytes("RGBA", fbo.size, raw_data).transpose(Image.FLIP_TOP_BOTTOM)
        
        # Save image
        with io.BytesIO() as output:
            image.convert("RGB").save(output, format="JPEG", quality=95)
            jpeg_data = output.getvalue()
        
        with open("../../simple_particle_test.jpg", "wb") as f:
            f.write(jpeg_data)
        
        logger.info(f"✅ Image saved ({len(jpeg_data)} bytes)")
        
        return True
        
    except Exception as e:
        logger.error(f"🚨 Test failed: {e}", exc_info=True)
        return False
    finally:
        if ctx:
            ctx.release()

if __name__ == "__main__":
    success = test_basic_particle_rendering()
    sys.exit(0 if success else 1)
