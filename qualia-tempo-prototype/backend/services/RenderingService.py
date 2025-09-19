# QUALIA.CODE v1.1 - RenderingService
# GPU-based rendering service with off-screen FBO rendering for streaming

import logging
import io
import time
from typing import Dict, Any, Optional, Tuple

try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

from .EventBus import EventBus
from ..engine.qualia_particle_engine import QualiaParticleEngine, create_qualia_particle_engine
from ..utils.decorators import (
    log_execution,
    handle_errors,
    time_execution,
)

try:
    import moderngl
    import numpy as np
    MODERNGL_AVAILABLE = True
except ImportError:
    moderngl = None
    np = None
    MODERNGL_AVAILABLE = False

logger = logging.getLogger(__name__)


class RenderingService:
    """
    High-performance GPU rendering service for Qualia visual effects.
    Renders particle systems to off-screen framebuffer for streaming.
    """

    def __init__(self, event_bus: EventBus, width: int = 1920, height: int = 1080):
        self._event_bus = event_bus
        self._logger = logging.getLogger(__name__)
        self._width = width
        self._height = height
        
        # Rendering components
        self._ctx: Optional[Any] = None
        self._particle_engine: Optional[QualiaParticleEngine] = None
        self._framebuffer: Optional[Any] = None
        self._color_texture: Optional[Any] = None
        self._render_shader: Optional[Any] = None
        self._vao: Optional[Any] = None  # Vertex Array Object for particle rendering
        
        # State tracking
        self._current_qualia_state: Dict[str, Any] = {}
        self._is_initialized = False
        self._last_frame_time = 0.0
        self._target_fps = 60.0
        
        # Subscribe to QualiaState updates
        self._event_bus.subscribe("QualiaStateUpdated", self._on_qualia_state_updated)
        
        if MODERNGL_AVAILABLE and PIL_AVAILABLE:
            self._initialize_graphics()
        else:
            missing = []
            if not MODERNGL_AVAILABLE:
                missing.append("ModernGL")
            if not PIL_AVAILABLE:
                missing.append("PIL")
            self._logger.warning(f"⚠️ Missing dependencies: {', '.join(missing)} - rendering disabled")

    @log_execution(level="INFO")
    @handle_errors(fallback_return_value=False)
    def _initialize_graphics(self) -> bool:
        """Initialize OpenGL context and rendering pipeline."""
        try:
            # Create standalone OpenGL context
            self._ctx = moderngl.create_context(standalone=True)
            self._logger.info(f"✅ Created OpenGL context: {self._ctx}")
            
            # Create particle engine
            self._particle_engine = create_qualia_particle_engine(
                max_particles=10000,
                enable_metrics=True,
                standalone=False  # Use our context
            )
            self._particle_engine.ctx = self._ctx
            self._particle_engine._initialize_shader()
            
            # Initialize particle buffers
            if not self._particle_engine.initialize_buffers():
                self._logger.error("🚨 Failed to initialize particle buffers")
                return False
            
            # Create off-screen framebuffer
            self._create_framebuffer()
            
            # Create particle rendering shader
            self._create_render_shader()
            
            # Create VAO for particle rendering
            self._create_particle_vao()
            
            self._is_initialized = True
            self._logger.info("✅ RenderingService graphics pipeline initialized")
            return True
            
        except Exception as e:
            self._logger.error(f"🚨 Failed to initialize graphics: {e}")
            return False

    @log_execution(level="DEBUG")
    @handle_errors(fallback_return_value=None)
    def _create_framebuffer(self) -> None:
        """Create off-screen framebuffer for rendering."""
        if not self._ctx:
            return
            
        # Create color texture
        self._color_texture = self._ctx.texture((self._width, self._height), 4)
        self._color_texture.filter = (moderngl.LINEAR, moderngl.LINEAR)
        
        # Create depth texture
        depth_texture = self._ctx.depth_texture((self._width, self._height))
        
        # Create framebuffer
        self._framebuffer = self._ctx.framebuffer(
            color_attachments=[self._color_texture],
            depth_attachment=depth_texture
        )
        
        self._logger.info(f"✅ Created framebuffer {self._width}x{self._height}")

    @log_execution(level="DEBUG")  
    @handle_errors(fallback_return_value=None)
    def _create_render_shader(self) -> None:
        """Create shader program for rendering particles to framebuffer."""
        if not self._ctx:
            return
            
        vertex_shader = """
        #version 330 core
        
        in vec3 position;
        in vec3 velocity;
        in vec4 color;
        in float lifetime;
        in float size;
        
        out vec4 v_color;
        
        uniform mat4 mvp_matrix;
        
        void main() {
            gl_Position = mvp_matrix * vec4(position, 1.0);
            gl_PointSize = size * 10.0; // Scale particle size
            v_color = color;
        }
        """
        
        fragment_shader = """
        #version 330 core
        
        in vec4 v_color;
        out vec4 fragColor;
        
        void main() {
            // Create circular particle with smooth edges
            vec2 coord = gl_PointCoord - vec2(0.5);
            float dist = length(coord);
            if (dist > 0.5) discard;
            
            float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
            fragColor = vec4(v_color.rgb, v_color.a * alpha);
        }
        """
        
        try:
            self._render_shader = self._ctx.program(
                vertex_shader=vertex_shader,
                fragment_shader=fragment_shader
            )
            self._logger.info("✅ Created particle render shader")
        except Exception as e:
            self._logger.error(f"🚨 Failed to create render shader: {e}")

    @log_execution(level="DEBUG")  
    @handle_errors(fallback_return_value=None)
    def _create_particle_vao(self) -> None:
        """Create Vertex Array Object for particle rendering using particle engine buffers."""
        if not self._ctx or not self._particle_engine or not self._render_shader:
            return
            
        try:
            # Get the input buffer from particle engine (contains position, velocity, color, lifetime, size)
            particle_buffer = self._particle_engine.particle_buffers.input_buffer
            
            # Create VAO with particle buffer as vertex buffer
            # Particle structure: position(3) + velocity(3) + color(4) + lifetime(1) + size(1) = 12 floats per particle
            self._vao = self._ctx.vertex_array(
                self._render_shader,
                [
                    # Position attribute (location 0): 3 floats starting at offset 0
                    (particle_buffer, '3f 3f 4f 1f 1f', 'position', 'velocity', 'color', 'lifetime', 'size')
                ]
            )
            
            self._logger.info("✅ Created particle VAO with engine buffers")
        except Exception as e:
            self._logger.error(f"🚨 Failed to create particle VAO: {e}")

    @log_execution(level="DEBUG")
    @handle_errors(fallback_return_value=None)
    async def _on_qualia_state_updated(self, data: Dict[str, Any]) -> None:
        """Handle QualiaState updates from EventBus."""
        self._current_qualia_state = data
        self._logger.debug(f"🎨 RenderingService received QualiaState update: intensity={data.get('intensity', 0):.2f}")

    @log_execution(level="DEBUG")
    @handle_errors(fallback_return_value=None)
    @time_execution()
    def render_frame(self) -> Optional[bytes]:
        """
        Render current frame to framebuffer and return as JPEG bytes.
        
        Returns:
            JPEG image data as bytes, or None if rendering failed
        """
        if not self._is_initialized or not self._framebuffer:
            return None
            
        current_time = time.time()
        
        # Frame rate limiting
        time_since_last_frame = current_time - self._last_frame_time
        min_frame_time = 1.0 / self._target_fps
        
        if time_since_last_frame < min_frame_time:
            time.sleep(min_frame_time - time_since_last_frame)
            
        try:
            # Update particle engine with current QualiaState
            if self._particle_engine and self._current_qualia_state:
                self._particle_engine.update_uniform_buffer(self._current_qualia_state)
                self._particle_engine.compute_step()
            
            # Bind framebuffer for off-screen rendering
            self._framebuffer.use()
            self._ctx.clear(0.0, 0.0, 0.0, 1.0)  # Clear to black
            self._ctx.enable(moderngl.BLEND)
            self._ctx.blend_func = moderngl.SRC_ALPHA, moderngl.ONE_MINUS_SRC_ALPHA
            
            # Render particles (simplified for now - in full implementation would use particle buffer data)
            if self._render_shader:
                # Create simple MVP matrix (orthographic projection)
                mvp_matrix = np.eye(4, dtype=np.float32)
                mvp_matrix[0, 0] = 2.0 / self._width
                mvp_matrix[1, 1] = 2.0 / self._height
                mvp_matrix[3, 0] = -1.0
                mvp_matrix[3, 1] = -1.0
                
                self._render_shader['mvp_matrix'].write(mvp_matrix.tobytes())
                
                # Render actual particle data using VAO
                if self._vao:
                    self._vao.render(moderngl.POINTS)
            
            # Read framebuffer pixels
            raw_data = self._framebuffer.read(components=3)  # RGB only for JPEG
            
            # Convert to PIL Image and encode as JPEG
            image_array = np.frombuffer(raw_data, dtype=np.uint8)
            image_array = image_array.reshape((self._height, self._width, 3))
            image_array = np.flipud(image_array)  # Flip vertically (OpenGL to image coordinates)
            
            pil_image = Image.fromarray(image_array, 'RGB')
            
            # Encode as JPEG
            with io.BytesIO() as output:
                pil_image.save(output, format='JPEG', quality=85, optimize=True)
                jpeg_data = output.getvalue()
            
            self._last_frame_time = time.time()
            
            return jpeg_data
            
        except Exception as e:
            self._logger.error(f"🚨 Frame rendering failed: {e}")
            return None

    @log_execution(level="INFO")
    @handle_errors(fallback_return_value=None)
    async def shutdown(self) -> None:
        """Clean shutdown of rendering service."""
        try:
            if self._particle_engine:
                await self._particle_engine.shutdown()
                
            if self._vao:
                self._vao.release()
                
            if self._framebuffer:
                self._framebuffer.release()
                
            if self._color_texture:
                self._color_texture.release()
                
            if self._ctx:
                self._ctx.release()
                
            self._is_initialized = False
            self._logger.info("✅ RenderingService shutdown complete")
            
        except Exception as e:
            self._logger.error(f"🚨 Error during RenderingService shutdown: {e}")

    @property
    def is_initialized(self) -> bool:
        """Check if rendering service is properly initialized."""
        return self._is_initialized

    @property  
    def current_fps(self) -> float:
        """Get current rendering FPS."""
        if self._last_frame_time == 0:
            return 0.0
        return 1.0 / max(time.time() - self._last_frame_time, 0.001)

    def get_status(self) -> Dict[str, Any]:
        """Get current rendering service status."""
        return {
            "initialized": self._is_initialized,
            "resolution": f"{self._width}x{self._height}",
            "target_fps": self._target_fps,
            "current_fps": self.current_fps,
            "moderngl_available": MODERNGL_AVAILABLE,
            "pil_available": PIL_AVAILABLE,
            "has_particle_engine": self._particle_engine is not None,
        }