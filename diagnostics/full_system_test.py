#!/usr/bin/env python3
"""
CRISALIDA.CODE - Full System Test with GOLD.CODE Architecture
Test complete particle rendering pipeline with shared context
"""

import sys
import os
import logging
from PIL import Image
import io

# Add current directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

logging.basicConfig(level=logging.INFO, format='%(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_full_system():
    """Test the complete system with GOLD.CODE architecture."""
    logger.info("🚀 Testing full system with GOLD.CODE architecture...")
    
    try:
        # Import our services
        from CompositionRoot import CompositionRoot
        from api.models import QualiaState
        
        logger.info("✅ Imports successful")
        
        # Create composition root
        root = CompositionRoot()
        root.initialize()
        
        logger.info("✅ CompositionRoot initialized")
        
        # Get services
        rendering_service = root.get_rendering_service()
        particle_engine = root.get_particle_engine()
        
        logger.info("✅ Services resolved from IoC container")
        
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
        
        with open("../../full_system_test.jpg", "wb") as f:
            f.write(jpeg_data)
        
        logger.info(f"✅ Full system test image saved ({len(jpeg_data)} bytes)")
        
        # Cleanup
        root.shutdown()
        logger.info("✅ System shutdown complete")
        
        return True
        
    except Exception as e:
        logger.error(f"🚨 Full system test failed: {e}", exc_info=True)
        return False

if __name__ == "__main__":
    success = test_full_system()
    sys.exit(0 if success else 1)
