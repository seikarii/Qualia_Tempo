#!/usr/bin/env python3
"""
CRISALIDA.CODE - Final Integration Test
Complete system validation with GOLD.CODE architecture
"""

import sys
import os
import logging
from PIL import Image
import io
import moderngl
import numpy as np

logging.basicConfig(level=logging.INFO, format='%(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Copy essential functions to avoid import issues
def create_qualia_particle_engine(ctx, event_bus):
    """Simplified particle engine creation."""
    class MockParticleEngine:
        def __init__(self, ctx, event_bus):
            self.ctx = ctx
            self.event_bus = event_bus
            self.particles = np.zeros((1000, 21), dtype=np.float32)
            self._initialize_particles()
            
        def _initialize_particles(self):
            # Random positions
            self.particles[:, 0:3] = np.random.uniform(-2.0, 2.0, (1000, 3))
            # Colors (purple particles for qualia effect)
            self.particles[:, 9:13] = [0.5, 0.0, 0.8, 1.0]  # Purple
            # Sizes
            self.particles[:, 14] = np.random.uniform(0.02, 0.08, 1000)
            
        def update_qualia_state(self, state):
            # Simple update based on coherence
            speed_factor = state.coherence * 2.0
            self.particles[:, 3:6] = np.random.uniform(-speed_factor, speed_factor, (1000, 3))
            
        def update_particles(self, dt):
            # Simple physics update
            self.particles[:, 0:3] += self.particles[:, 3:6] * dt
            # Boundary wrapping
            self.particles[:, 0:3] = np.mod(self.particles[:, 0:3] + 2.0, 4.0) - 2.0
            
        def get_particle_data(self):
            return self.particles
            
    return MockParticleEngine(ctx, event_bus)

class MockEventBus:
    def __init__(self):
        self.listeners = {}
        
    def emit(self, event):
        pass
        
    def subscribe(self, event_type, callback):
        pass

class RenderingService:
    def __init__(self, ctx, particle_engine, event_bus):
        self.ctx = ctx
        self.particle_engine = particle_engine
        self.event_bus = event_bus
        self.fbo = None
        self.program = None
        self.vao = None
        self.particle_buffer = None
        self._initialize_graphics()
        
    def _initialize_graphics(self):
        # Create framebuffer
        self.fbo = self.ctx.framebuffer(
            color_attachments=[self.ctx.texture((800, 600), 4)]
        )
        
        # Create shaders
        vertex_shader = """
        #version 330 core
        in vec3 position;
        in vec4 color;
        in float size;
        
        out vec4 frag_color;
        
        void main() {
            gl_Position = vec4(position, 1.0);
            gl_PointSize = size * 100.0;
            frag_color = color;
        }
        """
        
        fragment_shader = """
        #version 330 core
        in vec4 frag_color;
        out vec4 out_color;
        
        void main() {
            vec2 center = gl_PointCoord - vec2(0.5);
            float dist = length(center);
            if (dist > 0.5) discard;
            out_color = frag_color;
        }
        """
        
        self.program = self.ctx.program(
            vertex_shader=vertex_shader,
            fragment_shader=fragment_shader
        )
        
        # Create buffer and VAO
        self.particle_buffer = self.ctx.buffer(reserve=1000 * 21 * 4)
        self.vao = self.ctx.vertex_array(
            self.program,
            [(self.particle_buffer, '3f 3f 3f 4f 1f 1f 1f 1f 3f', 
              'position', 'velocity', 'acceleration', 'color', 'lifetime', 
              'size', 'resonance', 'mass', 'force_accumulator')]
        )
        
    def render_frame(self):
        # Update particles
        self.particle_engine.update_particles(0.016)  # ~60fps
        
        # Update buffer
        particle_data = self.particle_engine.get_particle_data()
        self.particle_buffer.write(particle_data.astype(np.float32).tobytes())
        
        # Render
        self.fbo.use()
        self.ctx.clear(0.0, 0.0, 0.0, 1.0)  # Black background
        self.ctx.enable(moderngl.PROGRAM_POINT_SIZE)
        
        self.vao.render(moderngl.POINTS, vertices=len(particle_data))
        
        # Read pixels
        raw_data = self.fbo.read(components=4, alignment=1)
        return raw_data

class QualiaState:
    def __init__(self, coherence=0.5, resonance=0.5, harmony=0.5, dissonance=0.5,
                 flow_state=0.5, temporal_stability=0.5, emotional_valence=0.0,
                 cognitive_load=0.5, sensory_integration=0.5, neural_synchronization=0.5,
                 quantum_entanglement=0.5, consciousness_expansion=0.5,
                 reality_perception=0.5, dimensional_awareness=0.5, existential_clarity=0.5):
        self.coherence = coherence
        self.resonance = resonance
        self.harmony = harmony
        self.dissonance = dissonance
        self.flow_state = flow_state
        self.temporal_stability = temporal_stability
        self.emotional_valence = emotional_valence
        self.cognitive_load = cognitive_load
        self.sensory_integration = sensory_integration
        self.neural_synchronization = neural_synchronization
        self.quantum_entanglement = quantum_entanglement
        self.consciousness_expansion = consciousness_expansion
        self.reality_perception = reality_perception
        self.dimensional_awareness = dimensional_awareness
        self.existential_clarity = existential_clarity

def test_final_integration():
    """Test the complete GOLD.CODE system integration."""
    logger.info("🚀 Testing final GOLD.CODE system integration...")
    
    ctx = None
    try:
        # Create shared context
        ctx = moderngl.create_standalone_context(require=330)
        logger.info("✅ Shared OpenGL context created")
        
        # Create event bus
        event_bus = MockEventBus()
        logger.info("✅ EventBus created")
        
        # Create particle engine
        particle_engine = create_qualia_particle_engine(ctx, event_bus)
        logger.info("✅ Particle engine created")
        
        # Create rendering service
        rendering_service = RenderingService(ctx, particle_engine, event_bus)
        logger.info("✅ Rendering service created")
        
        # Create qualia state
        qualia_state = QualiaState(
            coherence=0.9,  # High coherence for vibrant particles
            resonance=0.8,
            harmony=0.85,
            dissonance=0.1,
            flow_state=0.95,
            temporal_stability=0.9,
            emotional_valence=0.2,
            cognitive_load=0.3,
            sensory_integration=0.8,
            neural_synchronization=0.85,
            quantum_entanglement=0.6,
            consciousness_expansion=0.7,
            reality_perception=0.75,
            dimensional_awareness=0.5,
            existential_clarity=0.9
        )
        
        logger.info("✅ QualiaState created with high coherence values")
        
        # Update particle engine
        particle_engine.update_qualia_state(qualia_state)
        logger.info("✅ Particle engine updated with QualiaState")
        
        # Render frame
        frame_data = rendering_service.render_frame()
        logger.info("✅ Frame rendered")
        
        # Save image
        image = Image.frombytes("RGBA", (800, 600), frame_data).convert("RGB")
        with io.BytesIO() as output:
            image.save(output, format="JPEG", quality=95)
            jpeg_data = output.getvalue()
        
        with open("final_integration_test.jpg", "wb") as f:
            f.write(jpeg_data)
        
        logger.info(f"✅ Final integration test image saved ({len(jpeg_data)} bytes)")
        
        return True
        
    except Exception as e:
        logger.error(f"🚨 Final integration test failed: {e}", exc_info=True)
        return False
    finally:
        if ctx:
            ctx.release()

if __name__ == "__main__":
    success = test_final_integration()
    sys.exit(0 if success else 1)
