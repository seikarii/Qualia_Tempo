# CRISALIDA.CODE - Particle Pipeline Diagnostic
# 
# This diagnostic specifically tests the Qualia particle rendering pipeline
# within the application context, now that we know the OpenGL environment works.

import sys
import os
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def test_particle_pipeline():
    """Test the complete particle rendering pipeline step by step."""
    logger.info("🚀 Starting Particle Pipeline Diagnostic...")
    
    try:
        # Import application components
        logger.info("Importing application components...")
        import moderngl
        from engine.qualia_particle_engine import create_qualia_particle_engine
        from services.RenderingService import RenderingService
        from services.EventBus import EventBus
        logger.info("✅ All imports successful")
        
        # Step 1: Create shared OpenGL context
        logger.info("Step 1: Creating shared OpenGL context...")
        ctx = moderngl.create_standalone_context(require=330)
        logger.info(f"✅ Context created: {ctx.info.get('GL_VENDOR')} - {ctx.info.get('GL_RENDERER')}")
        
        # Step 2: Create particle engine with shared context
        logger.info("Step 2: Creating particle engine...")
        event_bus = EventBus()
        particle_engine = create_qualia_particle_engine(
            max_particles=1000,  # Smaller for testing
            enable_metrics=True,
            standalone=False,
            ctx=ctx,
            event_bus=event_bus
        )
        logger.info("✅ Particle engine created")
        
        # Step 3: Initialize particle buffers
        logger.info("Step 3: Initializing particle buffers...")
        success = particle_engine.initialize_buffers()
        if not success:
            logger.error("❌ Failed to initialize particle buffers")
            return False
        logger.info("✅ Particle buffers initialized")
        
        # Step 4: Start particle engine
        logger.info("Step 4: Starting particle engine...")
        particle_engine.start()
        logger.info("✅ Particle engine started")
        
        # Step 5: Create RenderingService with shared context
        logger.info("Step 5: Creating RenderingService...")
        rendering_service = RenderingService(
            event_bus=event_bus,
            particle_engine=particle_engine,
            ctx=ctx,
            width=800,
            height=600
        )
        logger.info("✅ RenderingService created")
        
        # Step 6: Check if RenderingService initialized
        logger.info("Step 6: Checking RenderingService initialization...")
        if not rendering_service._is_initialized:
            logger.error("❌ RenderingService failed to initialize")
            return False
        logger.info("✅ RenderingService initialized")
        
        # Step 7: Execute particle simulation step
        logger.info("Step 7: Executing particle simulation...")
        compute_success = particle_engine.compute_step()
        if not compute_success:
            logger.error("❌ Particle computation failed")
            return False
        logger.info("✅ Particle simulation executed")
        
        # Step 8: Render a frame
        logger.info("Step 8: Rendering frame...")
        frame_data = rendering_service.render_frame()
        if frame_data is None:
            logger.error("❌ Frame rendering returned None")
            return False
        logger.info(f"✅ Frame rendered successfully ({len(frame_data)} bytes)")
        
        # Step 9: Save the frame
        logger.info("Step 9: Saving rendered frame...")
        with open("../../particle_pipeline_test.jpg", "wb") as f:
            f.write(frame_data)
        logger.info("✅ Frame saved as particle_pipeline_test.jpg")
        
        # Step 10: Cleanup
        logger.info("Step 10: Cleaning up...")
        ctx.release()
        logger.info("✅ Cleanup completed")
        
        logger.info("🏁 Particle Pipeline Diagnostic COMPLETED SUCCESSFULLY")
        return True
        
    except Exception as e:
        logger.error(f"🚨 Particle Pipeline Diagnostic FAILED: {e}", exc_info=True)
        return False

if __name__ == "__main__":
    success = test_particle_pipeline()
    sys.exit(0 if success else 1)
