'''
QUALIA.CODE v1.1 - Rendering Pipeline Diagnostic
ARCHITECTURAL COMPLIANCE: Isolated verification test
'''
import asyncio
import os
import sys

# Add project root to the Python path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
backend_path = os.path.join(project_root, 'qualia-tempo-prototype')
sys.path.insert(0, backend_path)

from backend.CompositionRoot import CompositionRoot
from services.RenderingService import RenderingService
from backend.engine.qualia_particle_engine import QualiaParticleEngine

async def run_diagnostic():
    """
    Runs an isolated diagnostic test on the rendering pipeline
    to verify the "empty frame" issue.
    """
    print("🚀 Starting Rendering Pipeline Diagnostic...")

    # 1. Initialize Composition Root and Services
    print("   - Initializing CompositionRoot...")
    composition_root = CompositionRoot()
    await composition_root.initialize()

    rendering_service: RenderingService = composition_root.get_rendering_service()
    particle_engine: QualiaParticleEngine = composition_root.get_particle_system()

    if not rendering_service or not particle_engine:
        print("❌ CRITICAL: Failed to retrieve services from CompositionRoot.")
        return

    if not rendering_service.is_initialized:
        print("❌ CRITICAL: RenderingService failed to initialize. Check OpenGL/dependency issues.")
        await composition_root.shutdown()
        return

    print("✅ Services initialized successfully.")

    # 2. Render initial frame WITHOUT compute_step
    print("\n🖼️ Test 1: Rendering initial frame without simulation step...")
    initial_frame_data = rendering_service.render_frame()

    if initial_frame_data:
        with open("initial_frame.jpg", "wb") as f:
            f.write(initial_frame_data)
        print("   - ✅ Saved 'initial_frame.jpg'.")
        print("   - 🧐 Please inspect this image. It is expected to be black or mostly empty.")
    else:
        print("   - ❌ FAILED to render initial frame.")

    # 3. Run a single compute step to update particle lifetimes
    print("\n⚙️ Advancing simulation: Executing one 'compute_step'...")
    particle_engine.compute_step()
    print("   - ✅ Simulation step completed.")

    # 4. Render a second frame AFTER the compute_step
    print("\n🖼️ Test 2: Rendering frame AFTER simulation step...")
    running_frame_data = rendering_service.render_frame()

    if running_frame_data:
        with open("running_frame.jpg", "wb") as f:
            f.write(running_frame_data)
        print("   - ✅ Saved 'running_frame.jpg'.")
        print("   - 🧐 Please inspect this image. It should now show visible particles.")
    else:
        print("   - ❌ FAILED to render running frame.")

    # 5. Shutdown
    await composition_root.shutdown()
    print("\n🏁 Diagnostic finished.")

if __name__ == "__main__":
    # Ensure you have Pillow installed: pip install Pillow
    # Ensure you have numpy installed: pip install numpy
    asyncio.run(run_diagnostic())
