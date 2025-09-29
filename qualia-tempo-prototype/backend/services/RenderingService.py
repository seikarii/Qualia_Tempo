# QUALIA.CODE v1.1 - RenderingService
# GPU-accelerated rendering service for producing video frames

import logging
import os
from typing import Optional, Any

from ..utils.decorators import log_execution, handle_errors
from .interfaces.IRenderingService import IRenderingService

try:
    import moderngl
except ImportError:
    moderngl = None

try:
    import numpy as np
except ImportError:
    np = None

logger = logging.getLogger(__name__)


class RenderingService(IRenderingService):
    """
    GPU-accelerated rendering service that produces video frames for WebSocket streaming.
    """

    def __init__(self, ctx: Any, particle_engine: Any) -> None:
        """
        Initialize the rendering service.

        Args:
            ctx: ModernGL context
            particle_engine: Particle engine for particle data
        """
        self._ctx = ctx
        self._particle_engine = particle_engine
        self._logger = logging.getLogger(__name__)

        # Rendering resources
        self._fbo: Optional[Any] = None
        self._program: Optional[Any] = None
        self._vao: Optional[Any] = None
        self._particle_buffer: Optional[Any] = None

        # Initialize graphics resources
        self._initialize_graphics()

    @log_execution(level="DEBUG")
    @handle_errors(fallback_return_value=None)
    def _initialize_graphics(self) -> None:
        """Initialize OpenGL resources for rendering."""
        if not self._ctx or moderngl is None or np is None:
            logger.warning("ModernGL or NumPy not available, rendering disabled")
            return

        try:
            # Create framebuffer for off-screen rendering
            self._fbo = self._ctx.framebuffer(
                color_attachments=[self._ctx.texture((800, 600), 4)]
            )

            # QUALIA.CODE v1.1: Load shaders from files instead of hardcoded strings
            shader_dir = os.path.join(os.path.dirname(__file__), "..", "engine", "shaders")
            
            vertex_shader_path = os.path.join(shader_dir, "particle.vert")
            fragment_shader_path = os.path.join(shader_dir, "particle.frag")
            
            # Load vertex shader
            with open(vertex_shader_path, 'r') as f:
                vertex_shader = f.read()
            
            # Load fragment shader  
            with open(fragment_shader_path, 'r') as f:
                fragment_shader = f.read()

            self._program = self._ctx.program(
                vertex_shader=vertex_shader,
                fragment_shader=fragment_shader
            )

            # Create vertex buffer for particles (placeholder)
            # QUALIA.CODE v1.1: VAO will be created in render_frame with actual particle data
            self._particle_buffer = None  # Not needed since we use engine's buffer

            # Create VAO - will be properly initialized in render_frame with engine's buffer
            self._vao = None

            logger.info("RenderingService graphics resources initialized")

        except Exception as e:
            logger.error(f"Failed to initialize rendering graphics: {e}")
            self._cleanup_resources()

    @log_execution(level="DEBUG")
    @handle_errors(fallback_return_value=None)
    def render_frame(self) -> Optional[bytes]:
        """
        Render a single frame using particle engine data and return the pixel data.

        Returns:
            bytes: Raw RGBA pixel data, or None if rendering failed
        """
        if not self._is_ready():
            logger.warning("Rendering service not ready")
            return None
            
        try:
            # QUALIA.CODE v1.1: Use particle engine's current particle buffer as data source
            if not self._particle_engine or not hasattr(self._particle_engine, 'particle_buffers'):
                logger.warning("Particle engine not available or missing buffers")
                return None
                
            particle_buffer = self._particle_engine.particle_buffers.input_buffer
            if not particle_buffer:
                logger.warning("No particle buffer available for rendering")
                return None
            
            # Clear the framebuffer
            self._fbo.use()
            self._ctx.clear(0.0, 0.0, 0.0, 1.0)
            
            # QUALIA.CODE v1.1: Create VAO once with correct particle buffer format
            # VAO format matches shader inputs: '3f 3f 4f 1f 1f' for position, velocity, color, lifetime, size
            if self._vao is None:
                self._vao = self._ctx.vertex_array(
                    self._program,
                    [(particle_buffer, '3f 3f 4f 1f 1f', 
                      'position', 'velocity', 'color', 'lifetime', 'size')]
                )
                self._logger.debug("VAO created with correct shader attribute format")
            
            # Enable point sprites and blending for particles
            self._ctx.enable(moderngl.BLEND)
            self._ctx.blend_func = moderngl.SRC_ALPHA, moderngl.ONE_MINUS_SRC_ALPHA
            self._ctx.enable(moderngl.PROGRAM_POINT_SIZE)
            
            # Set uniforms
            if 'time' in self._program:
                self._program['time'] = self._particle_engine.start_time
            if 'intensity_multiplier' in self._program:
                self._program['intensity_multiplier'] = 1.0
                
            # Render particles
            self._vao.render(mode=moderngl.POINTS)
            
            # Read back the framebuffer data
            return self._fbo.color_attachments[0].read()
            
        except Exception as e:
            logger.error(f"Error during frame rendering: {e}")
            return None

    # QUALIA.CODE v1.1: Dummy frame method removed - all rendering now uses real GPU data

    def is_healthy(self) -> bool:
        """
        Check if the rendering service is healthy.

        Returns:
            bool: True if healthy and ready to render
        """
        return self._is_ready()

    def _is_ready(self) -> bool:
        """Check if all resources are initialized."""
        return (
            self._ctx is not None and
            self._fbo is not None and
            self._program is not None and
            moderngl is not None and
            np is not None
        )

    @log_execution(level="INFO")
    @handle_errors(fallback_return_value=None)
    def shutdown(self) -> None:
        """Shutdown the rendering service and clean up resources."""
        self._cleanup_resources()
        logger.info("RenderingService shutdown complete")

    def _cleanup_resources(self) -> None:
        """Clean up OpenGL resources."""
        try:
            if self._vao:
                self._vao.release()
                self._vao = None
            if self._program:
                self._program.release()
                self._program = None
            if self._fbo:
                self._fbo.release()
                self._fbo = None
            # QUALIA.CODE v1.1: No local particle_buffer to release (using engine's buffer)
        except Exception as e:
            logger.error(f"Error during resource cleanup: {e}")