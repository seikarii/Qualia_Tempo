#!/usr/bin/env python3
"""
CRISALIDA.CODE - Direct System Test
Test particle rendering pipeline directly without CompositionRoot
"""

import sys
import os
import logging
from PIL import Image
import io
import moderngl

# Add current directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

logging.basicConfig(level=logging.INFO, format='%(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_direct_system():
    """Test the system components directly."""
    logger.info("🚀 Testing direct system components...")
    
    ctx = None
    try:
        # Create shared context directly
        ctx = moderngl.create_standalone_context(require=330)
        logger.info("✅ Shared OpenGL context created")
        
        # Import and create services directly
        from services.RenderingService import RenderingService
        from engine.qualia_particle_engine import create_qualia_particle_engine
        from services.EventBus import EventBus
        from api.models import QualiaState
        
        logger.info("✅ Direct imports successful")
        
        # Create event bus
        event_bus = EventBus()
        logger.info("✅ EventBus created")
        
        # Create particle engine with shared context
        particle_engine = create_qualia_particle_engine(ctx, event_bus)
        logger.info("✅ Particle engine created with shared context")
        
        # Create rendering service with shared context
        rendering_service = RenderingService(ctx, particle_engine, event_bus)
        logger.info("✅ Rendering service created with shared context")
        
        # Create test qualia state
        qualia_state = QualiaState(
            coherence=0.8,
            resonance=0.6,
            harmony=0.7,
            dissonance=0.2,
            flow_state=0.9,
            temporal_stability=0.85,
            emotional_valence=0.3,
            cognitive_load=0.4,
            sensory_integration=0.75,
            neural_synchronization=0.8,
            quantum_entanglement=0.5,
            consciousness_expansion=0.6,
            reality_perception=0.7,
            dimensional_awareness=0.4,
            existential_clarity=0.8
        )
        
        logger.info("✅ Test QualiaState created")
        
        # Update particle engine with state
        particle_engine.update_qualia_state(qualia_state)
        logger.info("✅ Particle engine updated with QualiaState")
        
        # Render a frame
        frame_data = rendering_service.render_frame()
        logger.info("✅ Frame rendered")
        
        # Save the frame
        image = Image.frombytes("RGB", (800, 600), frame_data)
        with io.BytesIO() as output:
            image.save(output, format="JPEG", quality=95)
            jpeg_data = output.getvalue()
        
        with open("../../direct_system_test.jpg", "wb") as f:
            f.write(jpeg_data)
        
        logger.info(f"✅ Direct system test image saved ({len(jpeg_data)} bytes)")
        
        return True
        
    except Exception as e:
        logger.error(f"🚨 Direct system test failed: {e}", exc_info=True)
        return False
    finally:
        if ctx:
            ctx.release()

if __name__ == "__main__":
    success = test_direct_system()
    sys.exit(0 if success else 1)
