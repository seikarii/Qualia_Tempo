# CRISALIDA.CODE - Core Graphics Capability Test
#
# This is a standalone, zero-dependency (outside of moderngl/numpy/pillow) script
# to verify the fundamental rendering capability of the host environment.
# It does NOT import or touch any application code.

import moderngl
import numpy as np
from PIL import Image
import io
import logging

# --- Basic Configuration ---
WIDTH, HEIGHT = 800, 600
OUTPUT_FILENAME = "core_render_test_output.jpg"
LOG_FORMAT = '%(asctime)s - %(levelname)s - %(message)s'
logging.basicConfig(level=logging.INFO, format=LOG_FORMAT)

def run_core_render_test():
    """
    Executes a minimal, isolated render test to validate the environment.
    """
    logging.info("🚀 Starting Core Graphics Capability Test...")

    ctx = None
    try:
        # --- 1. Context Creation ---
        # Attempt to create a standalone context, which is the most basic step.
        logging.info("Attempting to create standalone moderngl context...")
        ctx = moderngl.create_standalone_context(require=330)
        logging.info(f"✅ Context created successfully. Vendor: {ctx.info.get('GL_VENDOR')}, Renderer: {ctx.info.get('GL_RENDERER')}")

        # --- 2. Shader Creation ---
        # Shaders are hardcoded inline to remove any file dependencies.
        logging.info("Compiling minimal shaders...")
        vertex_shader = """
            #version 330 core
            in vec2 in_vert;
            void main() { gl_Position = vec4(in_vert, 0.0, 1.0); }
        """
        fragment_shader = """
            #version 330 core
            out vec4 fragColor;
            void main() { fragColor = vec4(1.0, 0.0, 0.0, 1.0); } // Solid RED
        """
        program = ctx.program(vertex_shader=vertex_shader, fragment_shader=fragment_shader)
        logging.info("✅ Shaders compiled successfully.")

        # --- 3. Geometry Creation ---
        logging.info("Creating minimal geometry (VBO/VAO)...")
        vertices = np.array([-0.75, -0.75, 0.75, -0.75, 0.0, 0.75], dtype='f4')
        vbo = ctx.buffer(vertices)
        vao = ctx.vertex_array(program, [(vbo, '2f', 'in_vert')])
        logging.info("✅ Geometry created successfully.")

        # --- 4. Framebuffer Creation ---
        logging.info("Creating offscreen framebuffer...")
        fbo = ctx.framebuffer(
            color_attachments=[ctx.texture((WIDTH, HEIGHT), 4)]
        )
        fbo.use()
        logging.info("✅ Framebuffer created and activated.")

        # --- 5. Render Execution ---
        logging.info("Executing render pass...")
        ctx.clear(0.0, 0.1, 0.4, 1.0)  # Clear to BLUE
        vao.render(moderngl.TRIANGLES)
        logging.info("✅ Render command issued.")

        # --- 6. Read Pixels and Save ---
        logging.info(f"Reading pixels from framebuffer and saving to '{OUTPUT_FILENAME}'...")
        raw_data = fbo.read(components=4, alignment=1)
        image = Image.frombytes("RGBA", fbo.size, raw_data).transpose(Image.FLIP_TOP_BOTTOM)

        with io.BytesIO() as output:
            image.convert("RGB").save(output, format="JPEG", quality=95)
            jpeg_data = output.getvalue()

        with open(OUTPUT_FILENAME, "wb") as f:
            f.write(jpeg_data)

        logging.info(f"✅ Image saved successfully.")

    except Exception as e:
        logging.error(f"🚨 TEST FAILED: An exception occurred during the test.", exc_info=True)
        if "No backend available" in str(e) or "Cannot find gl library" in str(e):
            logging.error("CRITICAL FAILURE REASON: The system environment appears to be missing necessary OpenGL libraries (like libGL.so.1) or a valid backend (EGL, GLX). This is an environment issue, not application code.")
        return False

    finally:
        # --- 7. Cleanup ---
        if ctx:
            logging.info("Releasing OpenGL resources.")
            ctx.release()

    logging.info("🏁 Core Graphics Capability Test finished successfully.")
    return True

if __name__ == "__main__":
    run_core_render_test()
