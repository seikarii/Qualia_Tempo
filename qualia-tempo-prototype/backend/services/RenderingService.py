# QUALIA.CODE v1.2 - RenderingService
# GPU-based rendering service with advanced HDR post-processing pipeline

import logging
import io
import os
import time
import asyncio
from typing import Dict, Any, Optional, Tuple, Union, TYPE_CHECKING

try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    Image = None  # type: ignore
    PIL_AVAILABLE = False

from .EventBus import EventBus
from ..engine.qualia_particle_engine import (
    QualiaParticleEngine,
)
from ..utils.decorators import (
    log_execution,
    handle_errors,
    time_execution,
)

if TYPE_CHECKING:
    import moderngl
    import numpy as np
    MODERNGL_AVAILABLE = True
else:
    try:
        import moderngl
        import numpy as np
        MODERNGL_AVAILABLE = True
    except ImportError:
        moderngl = None  # type: ignore
        np = None  # type: ignore
        MODERNGL_AVAILABLE = False

logger = logging.getLogger(__name__)


# Camera service for decoupled camera management
class Camera:
    """
    Decoupled camera management service following QUALIA.CODE IoC principles.
    Handles view and projection matrix calculations separately from rendering.
    """

    def __init__(
        self,
        position: Tuple[float, float, float] = (0, 0, 80),
        target: Tuple[float, float, float] = (0, 0, 0),
        up: Tuple[float, float, float] = (0, 1, 0),
        fov: float = 45.0,
        aspect: float = 16.0 / 9.0,
        near: float = 0.1,
        far: float = 1000.0,
    ):
        if not MODERNGL_AVAILABLE or np is None:
            raise RuntimeError("NumPy is required for Camera operations")
        
        self.position = np.array(position, dtype=np.float32)
        self.target = np.array(target, dtype=np.float32)
        self.up = np.array(up, dtype=np.float32)
        self.fov = fov
        self.aspect = aspect
        self.near = near
        self.far = far

    def get_view_matrix(self) -> Any:
        """Calculate view matrix from camera parameters."""
        if np is None:
            raise RuntimeError("NumPy is required for matrix calculations")
            
        z = self.position - self.target
        z = z / np.linalg.norm(z)
        x = np.cross(self.up, z)
        x = x / np.linalg.norm(x)
        y = np.cross(z, x)

        return np.array(
            [
                [x[0], y[0], z[0], 0],
                [x[1], y[1], z[1], 0],
                [x[2], y[2], z[2], 0],
                [
                    -np.dot(x, self.position),
                    -np.dot(y, self.position),
                    -np.dot(z, self.position),
                    1,
                ],
            ],
            dtype=np.float32,
        )

    def get_projection_matrix(self) -> Any:
        """Calculate perspective projection matrix."""
        if np is None:
            raise RuntimeError("NumPy is required for matrix calculations")
            
        fov_rad = np.radians(self.fov)
        f = 1.0 / np.tan(fov_rad / 2.0)

        return np.array(
            [
                [f / self.aspect, 0, 0, 0],
                [0, f, 0, 0],
                [
                    0,
                    0,
                    (self.far + self.near) / (self.near - self.far),
                    (2 * self.far * self.near) / (self.near - self.far),
                ],
                [0, 0, -1, 0],
            ],
            dtype=np.float32,
        )

    def get_mvp_matrix(self) -> Any:
        """Calculate combined model-view-projection matrix."""
        view = self.get_view_matrix()
        projection = self.get_projection_matrix()
        return np.dot(view, projection)


def load_shader_source(shader_filename: str) -> str:
    """
    Enhanced shader loading with caching and error handling.
    QUALIA.CODE: Robust shader management for production systems.
    """
    shader_path = os.path.join(
        os.path.dirname(__file__), "..", "engine", "shaders", shader_filename
    )

    if not os.path.exists(shader_path):
        raise FileNotFoundError(
            f"CRITICAL: Shader file not found: {shader_path}\n"
            f"Expected shader: {shader_filename}\n"
            f"This is a critical rendering pipeline failure."
        )

    try:
        with open(shader_path, "r", encoding="utf-8") as f:
            content = f.read()

        if not content.strip():
            raise ValueError(f"Shader file is empty: {shader_filename}")

        logger.debug(f"✅ Loaded shader: {shader_filename} ({len(content)} chars)")
        return content

    except Exception as e:
        logger.error(f"🚨 Failed to load shader {shader_filename}: {e}")
        raise RuntimeError(f"Shader loading failed: {shader_filename}") from e


def create_shader_program(ctx: Any, vertex_file: str, fragment_file: str) -> Any:
    """
    Enhanced shader program creation with validation.
    QUALIA.CODE: Type-safe shader compilation with comprehensive error handling.
    """
    try:
        vertex_source = load_shader_source(vertex_file)
        fragment_source = load_shader_source(fragment_file)

        program = ctx.program(
            vertex_shader=vertex_source, fragment_shader=fragment_source
        )
        logger.debug(f"✅ Created shader program: {vertex_file} + {fragment_file}")
        return program

    except Exception as e:
        logger.error(
            f"🚨 Shader program creation failed: {vertex_file} + {fragment_file}: {e}"
        )
        raise RuntimeError(
            f"Failed to create shader program: {vertex_file}/{fragment_file}"
        ) from e


logger = logging.getLogger(__name__)


class RenderingService:
    """
    Advanced GPU rendering service with HDR post-processing pipeline.
    QUALIA.CODE v1.2: Multi-pass bloom rendering with professional visual effects.
    """

    def __init__(
        self,
        event_bus: EventBus,
        particle_engine: Optional[QualiaParticleEngine],
        ctx: Optional[Any] = None,  # GOLD.CODE: Receive shared OpenGL context via DI
        width: int = 1920,
        height: int = 1080,
    ):
        self._event_bus = event_bus
        self._logger = logging.getLogger(__name__)
        self._width = width
        self._height = height

        # QUALIA.CODE: Receive particle engine via dependency injection
        self._particle_engine: Optional[QualiaParticleEngine] = particle_engine

        # GOLD.CODE: Receive shared OpenGL context via dependency injection
        self._ctx: Optional[Any] = ctx

        # QUALIA.CODE: Camera decoupled from rendering logic
        self._camera = Camera(aspect=width / height)

        self._is_initialized = False

        # Particle rendering pipeline
        self._particle_render_shader: Optional[Any] = None
        self._particle_vao: Optional[Any] = None

        # Multi-pass post-processing pipeline framebuffers
        self._scene_fbo: Optional[Any] = None  # HDR scene rendering
        self._bright_pass_fbo: Optional[Any] = None  # Bright pixel extraction
        self._blur_fbo_a: Optional[Any] = None  # Blur ping buffer
        self._blur_fbo_b: Optional[Any] = None  # Blur pong buffer
        self._final_fbo: Optional[Any] = None  # Final composition

        # Post-processing shaders
        self._quad_vao: Optional[Any] = None  # Fullscreen quad
        self._bright_pass_shader: Optional[Any] = None  # Brightness extraction
        self._blur_shader: Optional[Any] = None  # Gaussian blur
        self._composite_shader: Optional[Any] = None  # Final composition

        # Rendering parameters and state
        self._current_qualia_state: Dict[str, Any] = {}
        self._last_frame_time = 0.0
        self._target_fps = 60.0
        self._frame_count = 0

        # HDR and bloom parameters - ENHANCED for visibility
        self._bloom_threshold = 0.4  # Lower threshold for more bloom
        self._bloom_strength = 2.5   # Stronger bloom effect
        self._global_intensity = 2.0 # Increased base intensity
        self._particle_scale = 1.5   # Larger particles

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
            self._logger.warning(
                f"⚠️ Missing dependencies: {', '.join(missing)} - rendering disabled"
            )

    @log_execution(level="INFO")
    @handle_errors(fallback_return_value=False)
    def _initialize_graphics(self) -> bool:
        """
        Initialize complete HDR rendering pipeline with post-processing.
        GOLD.CODE: Use shared OpenGL context instead of creating new one.
        """
        if not MODERNGL_AVAILABLE or moderngl is None:
            self._logger.error("ModernGL is not available")
            return False

        try:
            # GOLD.CODE: Use injected context instead of creating new one
            if self._ctx is None:
                self._logger.error("GOLD.CODE VIOLATION: No OpenGL context provided via DI")
                return False

            self._logger.info("✅ Using shared OpenGL context for rendering pipeline")

            # GOLD.CODE: Remove the context override hack - context is now shared properly
            # Initialize particle engine with shared context (no override needed)
            if self._particle_engine is not None:
                # Particle engine should already have the shared context from factory
                if not self._particle_engine.initialize_buffers():
                    self._logger.error("🚨 Failed to initialize particle buffers")
                    return self._initialize_software_fallback()

            # Initialize rendering pipelines
            self._create_particle_render_pipeline()
            self._create_post_processing_pipeline()

            self._is_initialized = True
            self._logger.info(
                "✅ Advanced HDR rendering pipeline initialized successfully"
            )
            return True

        except Exception as e:
            self._logger.error(f"🚨 Graphics initialization failed: {e}")
            return self._initialize_software_fallback()

    @log_execution(level="INFO")
    @handle_errors(fallback_return_value=None)
    def _create_particle_render_pipeline(self) -> None:
        """
        Create enhanced particle rendering pipeline with HDR support.
        QUALIA.CODE: High-quality particle visualization system.
        """
        try:
            # Load and compile particle shaders
            self._particle_render_shader = create_shader_program(
                self._ctx, "particle.vert", "particle.frag"
            )

            # Log available uniforms for debugging (ModernGL way)
            try:
                # ModernGL Programs don't have keys(), we'll check uniforms as needed
                self._logger.info("✅ Particle shader program created successfully")
            except Exception as e:
                self._logger.error(f"� Error accessing shader uniforms: {e}")

            # Get particle buffer from compute engine
            particle_buffer = self._particle_engine.particle_buffers.input_buffer

            # Create VAO with particle buffer layout
            # CRITICAL: Layout MUST match QualiaParticle struct in qualia_particles.glsl (21 components)
            # position(3f) velocity(3f) acceleration(3f) color(4f) lifetime(1f) size(1f) resonance(1f) mass(1f) charge(1f) force_accumulator(3f)
            # Total: 21 components
            self._particle_vao = self._ctx.vertex_array(
                self._particle_render_shader,
                [
                    (
                        particle_buffer,
                        "3f 3f 3f 4f 1f 1f 1f 1f 1f 3f",
                        "position",
                        "velocity",
                        "acceleration",
                        "color",
                        "lifetime",
                        "size",
                        "resonance",
                        "mass",
                        "charge",
                        "force_accumulator",
                    )
                ],
            )

            self._logger.info("✅ Particle render pipeline created with HDR support")

        except Exception as e:
            self._logger.error(f"🚨 Failed to create particle render pipeline: {e}")
            raise

    @log_execution(level="INFO")
    @handle_errors(fallback_return_value=None)
    def _create_post_processing_pipeline(self) -> None:
        """
        Create advanced post-processing pipeline for bloom effects.
        QUALIA.CODE: Professional HDR post-processing with multi-pass bloom.
        """
        try:
            # Create HDR framebuffers with 16-bit float precision
            self._scene_fbo = self._ctx.framebuffer(
                color_attachments=[
                    self._ctx.texture((self._width, self._height), 4, dtype="f2")
                ],
                depth_attachment=self._ctx.depth_texture((self._width, self._height)),
            )

            # Bright pass extraction framebuffer
            self._bright_pass_fbo = self._ctx.framebuffer(
                color_attachments=[
                    self._ctx.texture((self._width, self._height), 4, dtype="f2")
                ]
            )

            # Blur framebuffers (reduced resolution for performance)
            blur_scale = 4  # 1/4 resolution for blur
            blur_width, blur_height = (
                self._width // blur_scale,
                self._height // blur_scale,
            )

            self._blur_fbo_a = self._ctx.framebuffer(
                color_attachments=[
                    self._ctx.texture((blur_width, blur_height), 4, dtype="f2")
                ]
            )
            self._blur_fbo_b = self._ctx.framebuffer(
                color_attachments=[
                    self._ctx.texture((blur_width, blur_height), 4, dtype="f2")
                ]
            )

            # Final composition framebuffer (8-bit for output)
            self._final_fbo = self._ctx.framebuffer(
                color_attachments=[
                    self._ctx.texture((self._width, self._height), 3)
                ]  # RGB only
            )

            # Create post-processing shaders
            vertex_shader_fs = load_shader_source("fullscreen_quad.vert")

            self._bright_pass_shader = self._ctx.program(
                vertex_shader=vertex_shader_fs,
                fragment_shader=load_shader_source("bright_pass.glsl"),
            )

            self._blur_shader = self._ctx.program(
                vertex_shader=vertex_shader_fs,
                fragment_shader=load_shader_source("blur.glsl"),
            )

            self._composite_shader = self._ctx.program(
                vertex_shader=vertex_shader_fs,
                fragment_shader=load_shader_source("composite.glsl"),
            )

            # Create fullscreen quad for post-processing
            self._create_fullscreen_quad()

            self._logger.info(
                "✅ Advanced post-processing pipeline created (HDR + Bloom)"
            )

        except Exception as e:
            self._logger.error(f"🚨 Failed to create post-processing pipeline: {e}")
            raise

    @log_execution(level="INFO")
    def _initialize_software_fallback(self) -> bool:
        """Initialize software rendering fallback when OpenGL fails."""
        self._logger.warning("🔄 Initializing software rendering fallback...")

        # Set fallback state
        self._ctx = None
        self._particle_engine = None
        self._framebuffer = None
        self._color_texture = None
        self._render_shader = None
        self._vao = None
        self._is_initialized = True  # Mark as initialized in fallback mode

        self._logger.info("✅ Software rendering fallback initialized")
        return True

    @log_execution(level="DEBUG")
    @handle_errors(fallback_return_value=None)
    def _create_fullscreen_quad(self) -> None:
        """
        Creates a buffer-less VAO for fullscreen triangle rendering.
        QUALIA.CODE: High-performance post-processing geometry.
        """
        if not self._ctx:
            return

        # Un VAO vacío es suficiente, ya que los vértices se generan en el shader.
        self._quad_vao = self._ctx.vertex_array(self._bright_pass_shader, [])
        self._logger.debug("✅ Created buffer-less fullscreen VAO for post-processing")

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
            color_attachments=[self._color_texture], depth_attachment=depth_texture
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
                vertex_shader=vertex_shader, fragment_shader=fragment_shader
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
                    (
                        particle_buffer,
                        "3f 3f 4f 1f 1f",
                        "position",
                        "velocity",
                        "color",
                        "lifetime",
                        "size",
                    )
                ],
            )

            self._logger.info("✅ Created particle VAO with engine buffers")
        except Exception as e:
            self._logger.error(f"🚨 Failed to create particle VAO: {e}")

    @log_execution(level="DEBUG")
    @handle_errors(fallback_return_value=None)
    async def _on_qualia_state_updated(self, event: Any) -> None:
        """Handle QualiaState updates from EventBus."""
        try:
            # Extract data from event object
            data = event.data if hasattr(event, "data") else event
            self._current_qualia_state = data
            self._logger.debug(
                f"🎨 RenderingService received QualiaState update: intensity={data.get('intensity', 0):.2f}"
            )
        except Exception as e:
            self._logger.error(f"🚨 Failed to handle QualiaStateUpdated event: {e}")

    @log_execution(level="DEBUG")
    @handle_errors(fallback_return_value=None)
    @time_execution()
    def render_frame(self) -> Optional[bytes]:
        """
        Advanced HDR multi-pass rendering with bloom post-processing.
        QUALIA.CODE v1.2: Professional cinematic rendering pipeline.

        Returns:
            JPEG image data as bytes, or None if rendering failed
        """
        if not self._is_initialized or not self._ctx or not self._scene_fbo:
            return self._render_software_fallback()

        current_time = time.time()
        self._frame_count += 1

        # Dynamic bloom parameters based on qualia state
        intensity = self._current_qualia_state.get("intensity", 0.5)
        chaos = self._current_qualia_state.get("chaos", 0.0)
        transcendence = self._current_qualia_state.get("transcendence", 0.0)
        precision = self._current_qualia_state.get("precision", 0.5)
        flow = self._current_qualia_state.get(
            "flow", 0.5
        )  # CRITICAL: Define missing variable

        # Calculate velocity magnitude from current state dynamics
        velocity_magnitude = (
            intensity + chaos + abs(flow - 0.5)
        ) / 3.0  # CRITICAL: Define missing variable

        # Adaptive bloom strength based on game state
        dynamic_bloom_strength = self._bloom_strength * (
            1.0 + intensity * 0.5 + transcendence * 0.3
        )
        dynamic_threshold = max(0.3, self._bloom_threshold - chaos * 0.2)

        try:
            # === PASS 1: RENDER SCENE TO HDR FRAMEBUFFER ===
            self._scene_fbo.use()
            self._ctx.clear(
                0.0, 0.0, 0.0, 0.0
            )  # Clear with alpha 0 for proper blending

            # Enable advanced rendering features
            self._ctx.enable(moderngl.PROGRAM_POINT_SIZE)
            self._ctx.enable(moderngl.BLEND)
            self._ctx.blend_func = (
                moderngl.SRC_ALPHA,
                moderngl.ONE,
            )  # Additive blending for particles
            self._ctx.enable(moderngl.DEPTH_TEST)

            # Set up enhanced uniforms for particle shader (with safety checks)
            # QUALIA.CODE: Use decoupled Camera service for view/projection matrices
            mvp_matrix = self._camera.get_mvp_matrix()

            # Set uniforms safely - use try/except since ModernGL doesn't have 'in' for Programs
            try:
                self._particle_render_shader["mvp_matrix"].write(mvp_matrix.tobytes())
            except KeyError:
                pass  # Uniform not available in shader

            try:
                self._particle_render_shader["time"].value = current_time
            except KeyError:
                pass

            try:
                self._particle_render_shader["intensity_multiplier"].value = (
                    2.0 + intensity * 4.0  # Enhanced visibility multiplier
                )
            except KeyError:
                pass

            try:
                self._particle_render_shader["screen_resolution"].value = (
                    self._width,
                    self._height,
                )
            except KeyError:
                pass

            try:
                self._particle_render_shader["global_particle_scale"].value = (
                    self._particle_scale * 2.0  # Double particle scale for visibility
                )
            except KeyError:
                pass

            # Enhanced vertex shader uniforms for advanced animation
            try:
                self._particle_render_shader["animation_speed"].value = (
                    1.0 + intensity * 0.5
                )
            except KeyError:
                pass

            try:
                self._particle_render_shader["billboard_rotation_speed"].value = (
                    0.5 + chaos * 2.0
                )
            except KeyError:
                pass

            try:
                self._particle_render_shader["size_pulse_frequency"].value = (
                    2.0 + flow * 3.0
                )
            except KeyError:
                pass

            try:
                self._particle_render_shader["motion_blur_strength"].value = (
                    0.3 + velocity_magnitude * 0.5
                )
            except KeyError:
                pass

            # Enhanced fragment shader uniforms (with safety checks)
            try:
                self._particle_render_shader["bloom_threshold"].value = (
                    dynamic_threshold
                )
            except KeyError:
                pass

            try:
                self._particle_render_shader["particle_glow_intensity"].value = (
                    2.0 + transcendence * 3.0
                )
            except KeyError:
                pass

            # New enhanced shader uniforms for advanced effects
            try:
                self._particle_render_shader["camera_position"].value = (0.0, 0.0, 80.0)
            except KeyError:
                pass

            try:
                self._particle_render_shader["camera_near"].value = 0.1
            except KeyError:
                pass

            try:
                self._particle_render_shader["camera_far"].value = 200.0
            except KeyError:
                pass

            try:
                self._particle_render_shader["fog_color"].value = (0.1, 0.15, 0.2)
            except KeyError:
                pass

            try:
                self._particle_render_shader["fog_density"].value = 0.02 + chaos * 0.05
            except KeyError:
                pass

            try:
                self._particle_render_shader["chromatic_aberration_strength"].value = (
                    chaos * 0.01
                )
            except KeyError:
                pass

            try:
                self._particle_render_shader["color_temperature"].value = (
                    0.8 + intensity * 0.4,
                    0.9,
                    1.0 - chaos * 0.2,
                )
            except KeyError:
                pass

            try:
                self._particle_render_shader["saturation_boost"].value = (
                    0.2 + intensity * 0.3
                )
            except KeyError:
                pass

            try:
                self._particle_render_shader["contrast_enhance"].value = (
                    0.1 + precision * 0.2
                )
            except KeyError:
                pass

            # Render particles with advanced effects
            # QUALIA.CODE FIX: Use the correct attribute 'max_particles' from the injected engine.
            particle_count = self._particle_engine.max_particles if self._particle_engine else 0
            self._particle_vao.render(moderngl.POINTS, vertices=particle_count)

            # === PASS 2: BRIGHT PASS EXTRACTION ===
            self._bright_pass_fbo.use()
            self._ctx.clear(0.0, 0.0, 0.0, 1.0)
            self._ctx.disable(moderngl.BLEND)
            self._ctx.disable(moderngl.DEPTH_TEST)

            # Bind scene texture
            self._scene_fbo.color_attachments[0].use(location=0)

            # Enhanced bright pass uniforms (professional settings)
            try:
                self._bright_pass_shader["sceneTexture"].value = 0
                self._bright_pass_shader["threshold"].value = dynamic_threshold
                self._bright_pass_shader["softThreshold"].value = (
                    0.5 + chaos * 0.3
                )  # Soft transitions
                self._bright_pass_shader["intensity"].value = 1.0 + intensity * 1.5
                self._bright_pass_shader["colorPreservation"].value = (
                    0.8 + precision * 0.2
                )
            except KeyError:
                pass  # Shader uniform not available

            self._quad_vao.render(moderngl.TRIANGLES, vertices=3)

            # === PASS 3: MULTI-PASS GAUSSIAN BLUR (PING-PONG) ===
            horizontal = True
            blur_passes = min(
                12, max(6, int(10 + intensity * 4))
            )  # Dynamic blur quality

            for i in range(blur_passes):
                # Select target framebuffer
                target_fbo = self._blur_fbo_a if horizontal else self._blur_fbo_b
                target_fbo.use()
                self._ctx.clear(0.0, 0.0, 0.0, 1.0)

                # Select source texture
                if i == 0:
                    # First pass: use bright pass result
                    source_texture = self._bright_pass_fbo.color_attachments[0]
                else:
                    # Subsequent passes: ping-pong between blur buffers
                    source_texture = (
                        self._blur_fbo_b.color_attachments[0]
                        if horizontal
                        else self._blur_fbo_a.color_attachments[0]
                    )

                source_texture.use(location=0)

                # Configure enhanced blur shader uniforms
                try:
                    self._blur_shader["image"].value = 0
                    self._blur_shader["horizontal"].value = horizontal
                    self._blur_shader["blurIntensity"].value = (
                        0.8 + intensity * 0.2
                    )  # Dynamic blur strength
                    self._blur_shader["kernelSize"].value = (
                        1.0 + chaos * 0.5
                    )  # Chaos adds blur spread
                except KeyError:
                    pass  # Fallback for missing uniforms

                self._quad_vao.render(moderngl.TRIANGLES, vertices=3)
                horizontal = not horizontal  # Toggle direction

            # Determine final blur texture
            final_blur_texture = (
                self._blur_fbo_a.color_attachments[0]
                if horizontal
                else self._blur_fbo_b.color_attachments[0]
            )

            # === PASS 4: FINAL COMPOSITION ===
            self._final_fbo.use()
            self._ctx.clear(0.0, 0.0, 0.0, 1.0)

            # Bind both scene and bloom textures
            self._scene_fbo.color_attachments[0].use(location=0)
            final_blur_texture.use(location=1)

            # Configure professional composition shader with ACES tone mapping
            try:
                self._composite_shader["sceneTexture"].value = 0
                self._composite_shader["bloomTexture"].value = 1
                self._composite_shader["bloomStrength"].value = dynamic_bloom_strength
                self._composite_shader["exposure"].value = (
                    -0.5 + intensity * 1.0
                )  # Dynamic exposure
                self._composite_shader["contrast"].value = (
                    1.0 + precision * 0.3
                )  # Precision enhances contrast
                self._composite_shader["saturation"].value = (
                    1.0 + intensity * 0.4
                )  # Intensity boosts saturation
                self._composite_shader["gamma"].value = 2.2  # Standard sRGB gamma
                self._composite_shader["blendMode"].value = int(
                    chaos * 3.99
                )  # Chaos selects blend mode
            except KeyError:
                pass  # Fallback for missing uniforms

            self._quad_vao.render(moderngl.TRIANGLES, vertices=3)

            # === FINAL: READ PIXELS AND ENCODE ===
            raw_data = self._final_fbo.read(components=3, alignment=1)

            # Convert to PIL Image with proper orientation
            image = Image.frombytes("RGB", self._final_fbo.size, raw_data)
            if hasattr(Image, 'FLIP_TOP_BOTTOM'):
                image = image.transpose(Image.FLIP_TOP_BOTTOM)  # Correct OpenGL orientation
            else:
                # Fallback for older PIL versions
                image = image.transpose(2)  # FLIP_TOP_BOTTOM = 2

            # High-quality JPEG encoding
            with io.BytesIO() as output:
                image.save(output, format="JPEG", quality=95, optimize=True)
                jpeg_data = output.getvalue()

            self._last_frame_time = current_time

            # Performance logging every 60 frames
            if self._frame_count % 60 == 0:
                self._logger.debug(
                    f"🎨 Rendered frame {self._frame_count} with {blur_passes} blur passes"
                )

            return jpeg_data

        except Exception as e:
            self._logger.error(f"🚨 HDR rendering pipeline failed: {e}")
            return self._render_software_fallback()

    def _create_projection_matrix(self) -> Any:
        """
        Create a proper perspective projection matrix.
        QUALIA.CODE: Correct 3D perspective projection.
        """
        aspect_ratio = self._width / self._height
        fov_rad = np.radians(60.0)  # Campo de visión de 60 grados
        near_plane = 0.1
        far_plane = 200.0

        f = 1.0 / np.tan(fov_rad / 2.0)

        return np.array(
            [
                [f / aspect_ratio, 0, 0, 0],
                [0, f, 0, 0],
                [0, 0, (far_plane + near_plane) / (near_plane - far_plane), -1],
                [0, 0, (2 * far_plane * near_plane) / (near_plane - far_plane), 0],
            ],
            dtype="f4",
        )

    @log_execution(level="DEBUG")
    def _render_software_fallback(self) -> Optional[bytes]:
        """Generate fallback frame data when GPU rendering is unavailable."""
        try:
            if not PIL_AVAILABLE:
                self._logger.warning("⚠️ PIL not available for software fallback")
                return None

            # Create a simple colored frame based on current qualia state
            intensity = self._current_qualia_state.get("intensity", 0.5)

            # Generate RGB values based on intensity
            r = int(255 * min(intensity * 2, 1.0))
            g = int(255 * min(intensity * 1.5, 1.0))
            b = int(255 * intensity)

            # Create PIL image with solid color
            pil_image = Image.new("RGB", (self._width, self._height), (r, g, b))

            # Encode as JPEG
            with io.BytesIO() as output:
                pil_image.save(output, format="JPEG", quality=85, optimize=True)
                jpeg_data = output.getvalue()

            self._last_frame_time = time.time()
            return jpeg_data

        except Exception as e:
            self._logger.error(f"🚨 Software fallback rendering failed: {e}")
            return None

    @log_execution(level="INFO")
    @handle_errors(fallback_return_value=None)
    async def shutdown(self) -> None:
        """
        Unified shutdown method. Cancels background tasks and releases all GPU resources.
        """
        self._logger.info("Shutting down RenderingService...")
        self._is_initialized = False

        # Cancel any running background tasks (assuming one might be added later)
        if (
            hasattr(self, "_render_task")
            and self._render_task
            and not self._render_task.done()
        ):
            self._render_task.cancel()
            try:
                await self._render_task
            except asyncio.CancelledError:
                self._logger.info("Rendering loop cancelled successfully.")

        # Release all graphics resources
        try:
            if self._particle_engine:
                # Assuming particle_engine has its own shutdown
                if hasattr(
                    self._particle_engine, "shutdown"
                ) and asyncio.iscoroutinefunction(self._particle_engine.shutdown):
                    await self._particle_engine.shutdown()
                elif hasattr(self._particle_engine, "release"):
                    self._particle_engine.release()  # For objects with release()

            if self._vao:
                self._vao.release()
            if self._framebuffer:
                self._framebuffer.release()
            if self._color_texture:
                self._color_texture.release()
            if self._ctx:
                self._ctx.release()

            self._logger.info("✅ All RenderingService graphics resources released.")

        except Exception as e:
            self._logger.error(
                f"🚨 Error during RenderingService resource cleanup: {e}"
            )

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
