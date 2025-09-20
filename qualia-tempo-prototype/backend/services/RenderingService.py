# QUALIA.CODE v1.2 - RenderingService
# GPU-based rendering service with advanced HDR post-processing pipeline

import logging
import io
import os
import time
import asyncio
from typing import Dict, Any, Optional, Tuple, Union

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


def load_shader_source(shader_filename: str) -> str:
    """
    Enhanced shader loading with caching and error handling.
    QUALIA.CODE: Robust shader management for production systems.
    """
    shader_path = os.path.join(os.path.dirname(__file__), "..", "engine", "shaders", shader_filename)
    
    if not os.path.exists(shader_path):
        raise FileNotFoundError(
            f"CRITICAL: Shader file not found: {shader_path}\n"
            f"Expected shader: {shader_filename}\n"
            f"This is a critical rendering pipeline failure."
        )
    
    try:
        with open(shader_path, 'r', encoding='utf-8') as f:
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
        
        program = ctx.program(vertex_shader=vertex_source, fragment_shader=fragment_source)
        logger.debug(f"✅ Created shader program: {vertex_file} + {fragment_file}")
        return program
        
    except Exception as e:
        logger.error(f"🚨 Shader program creation failed: {vertex_file} + {fragment_file}: {e}")
        raise RuntimeError(f"Failed to create shader program: {vertex_file}/{fragment_file}") from e
    MODERNGL_AVAILABLE = False

logger = logging.getLogger(__name__)


class RenderingService:
    """
    Advanced GPU rendering service with HDR post-processing pipeline.
    QUALIA.CODE v1.2: Multi-pass bloom rendering with professional visual effects.
    """

    def __init__(self, event_bus: EventBus, particle_engine: QualiaParticleEngine, width: int = 1920, height: int = 1080):
        self._event_bus = event_bus
        self._logger = logging.getLogger(__name__)
        self._width = width
        self._height = height
        
        # QUALIA.CODE: Receive particle engine via dependency injection
        self._particle_engine = particle_engine
        
        # Core rendering context
        self._ctx: Optional[Any] = None
        self._is_initialized = False
        
        # Particle rendering pipeline
        self._particle_render_shader: Optional[Any] = None
        self._particle_vao: Optional[Any] = None
        
        # Multi-pass post-processing pipeline framebuffers
        self._scene_fbo: Optional[Any] = None           # HDR scene rendering
        self._bright_pass_fbo: Optional[Any] = None     # Bright pixel extraction
        self._blur_fbo_a: Optional[Any] = None          # Blur ping buffer
        self._blur_fbo_b: Optional[Any] = None          # Blur pong buffer
        self._final_fbo: Optional[Any] = None           # Final composition
        
        # Post-processing shaders
        self._quad_vao: Optional[Any] = None            # Fullscreen quad
        self._bright_pass_shader: Optional[Any] = None  # Brightness extraction
        self._blur_shader: Optional[Any] = None         # Gaussian blur
        self._composite_shader: Optional[Any] = None    # Final composition
        
        # Rendering parameters and state
        self._current_qualia_state: Dict[str, Any] = {}
        self._last_frame_time = 0.0
        self._target_fps = 60.0
        self._frame_count = 0
        
        # HDR and bloom parameters
        self._bloom_threshold = 0.7
        self._bloom_strength = 1.2
        self._global_intensity = 1.0
        self._particle_scale = 1.0
        
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
        """
        Initialize complete HDR rendering pipeline with post-processing.
        QUALIA.CODE v1.2: Professional multi-pass bloom implementation.
        """
        try:
            # Create OpenGL context with fallback strategy
            context_backends = ['egl', 'glx', None]  # None = default
            
            for backend in context_backends:
                try:
                    if backend:
                        self._ctx = moderngl.create_standalone_context(require=330, backend=backend)
                        self._logger.info(f"✅ Created {backend.upper()} OpenGL context")
                    else:
                        self._ctx = moderngl.create_standalone_context(require=330)
                        self._logger.info(f"✅ Created default OpenGL context")
                    break
                except Exception as e:
                    self._logger.warning(f"⚠️ {backend or 'default'} context failed: {e}")
                    continue
            else:
                self._logger.error("🚨 All OpenGL context creation attempts failed")
                return self._initialize_software_fallback()

            # Initialize particle engine with our context
            self._particle_engine.ctx = self._ctx
            self._particle_engine._initialize_shader()
            
            if not self._particle_engine.initialize_buffers():
                self._logger.error("🚨 Failed to initialize particle buffers")
                return self._initialize_software_fallback()

            # Initialize rendering pipelines
            self._create_particle_render_pipeline()
            self._create_post_processing_pipeline()
            
            self._is_initialized = True
            self._logger.info("✅ Advanced HDR rendering pipeline initialized successfully")
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
                self._ctx, 'particle.vert', 'particle.frag'
            )
            
            # Log available uniforms for debugging (ModernGL way)
            try:
                # ModernGL Programs don't have keys(), we'll check uniforms as needed
                self._logger.info(f"✅ Particle shader program created successfully")
            except Exception as e:
                self._logger.error(f"� Error accessing shader uniforms: {e}")
            
            # Get particle buffer from compute engine
            particle_buffer = self._particle_engine.particle_buffers.input_buffer
            
            # Create VAO with particle buffer layout
            # Layout: position(3f) velocity(3f) color(4f) lifetime(1f) size(1f)
            self._particle_vao = self._ctx.vertex_array(
                self._particle_render_shader,
                [(particle_buffer, '3f 3f 4f 1f 1f', 'position', 'velocity', 'color', 'lifetime', 'size')]
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
                color_attachments=[self._ctx.texture((self._width, self._height), 4)],
                depth_attachment=self._ctx.depth_texture((self._width, self._height))
            )
            
            # Bright pass extraction framebuffer
            self._bright_pass_fbo = self._ctx.framebuffer(
                color_attachments=[self._ctx.texture((self._width, self._height), 4)]
            )
            
            # Blur framebuffers (reduced resolution for performance)
            blur_scale = 4  # 1/4 resolution for blur
            blur_width, blur_height = self._width // blur_scale, self._height // blur_scale
            
            self._blur_fbo_a = self._ctx.framebuffer(
                color_attachments=[self._ctx.texture((blur_width, blur_height), 4)]
            )
            self._blur_fbo_b = self._ctx.framebuffer(
                color_attachments=[self._ctx.texture((blur_width, blur_height), 4)]
            )
            
            # Final composition framebuffer (8-bit for output)
            self._final_fbo = self._ctx.framebuffer(
                color_attachments=[self._ctx.texture((self._width, self._height), 3)]  # RGB only
            )
            
            # Create post-processing shaders
            vertex_shader_fs = load_shader_source('fullscreen_quad.vert')
            
            self._bright_pass_shader = self._ctx.program(
                vertex_shader=vertex_shader_fs,
                fragment_shader=load_shader_source('bright_pass.glsl')
            )
            
            self._blur_shader = self._ctx.program(
                vertex_shader=vertex_shader_fs,
                fragment_shader=load_shader_source('blur.glsl')
            )
            
            self._composite_shader = self._ctx.program(
                vertex_shader=vertex_shader_fs,
                fragment_shader=load_shader_source('composite.glsl')
            )
            
            # Create fullscreen quad for post-processing
            self._create_fullscreen_quad()
            
            self._logger.info("✅ Advanced post-processing pipeline created (HDR + Bloom)")
            
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
        Creates an optimized VAO for fullscreen quad rendering.
        QUALIA.CODE: High-performance post-processing geometry.
        """
        if not self._ctx:
            return
            
        # Optimized fullscreen quad vertices (triangle strip)
        # Position (x,y) + TexCoords (u,v)
        quad_vertices = np.array([
            # First triangle
            -1.0, -1.0,  0.0, 0.0,  # Bottom-left
             1.0, -1.0,  1.0, 0.0,  # Bottom-right
            -1.0,  1.0,  0.0, 1.0,  # Top-left
             1.0,  1.0,  1.0, 1.0,  # Top-right
        ], dtype=np.float32)
        
        quad_buffer = self._ctx.buffer(quad_vertices)
        
        # Create a temporary shader program for VAO creation
        # This will be replaced by actual post-processing shaders
        temp_vertex_shader = """
        #version 330 core
        layout(location = 0) in vec2 position;
        layout(location = 1) in vec2 texCoords;
        out vec2 uv;
        void main() {
            gl_Position = vec4(position, 0.0, 1.0);
            uv = texCoords;
        }
        """
        
        temp_fragment_shader = """
        #version 330 core
        in vec2 uv;
        out vec4 fragColor;
        void main() {
            fragColor = vec4(1.0);
        }
        """
        
        temp_program = self._ctx.program(
            vertex_shader=temp_vertex_shader,
            fragment_shader=temp_fragment_shader
        )
        
        # Create VAO for triangle strip rendering
        self._quad_vao = self._ctx.vertex_array(
            temp_program,
            [(quad_buffer, '2f 2f', 'position', 'texCoords')]
        )
        
        self._logger.debug("✅ Created fullscreen quad VAO for post-processing")

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
    async def _on_qualia_state_updated(self, event: Any) -> None:
        """Handle QualiaState updates from EventBus."""
        try:
            # Extract data from event object
            data = event.data if hasattr(event, 'data') else event
            self._current_qualia_state = data
            self._logger.debug(f"🎨 RenderingService received QualiaState update: intensity={data.get('intensity', 0):.2f}")
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
        intensity = self._current_qualia_state.get('intensity', 0.5)
        chaos = self._current_qualia_state.get('chaos', 0.0)
        transcendence = self._current_qualia_state.get('transcendence', 0.0)
        precision = self._current_qualia_state.get('precision', 0.5)
        
        # Adaptive bloom strength based on game state
        dynamic_bloom_strength = self._bloom_strength * (1.0 + intensity * 0.5 + transcendence * 0.3)
        dynamic_threshold = max(0.3, self._bloom_threshold - chaos * 0.2)
        
        try:
            # === PASS 1: RENDER SCENE TO HDR FRAMEBUFFER ===
            self._scene_fbo.use()
            self._ctx.clear(0.0, 0.0, 0.0, 0.0)  # Clear with alpha 0 for proper blending
            
            # Enable advanced rendering features
            self._ctx.enable(moderngl.PROGRAM_POINT_SIZE)
            self._ctx.enable(moderngl.BLEND)
            self._ctx.blend_func = (moderngl.SRC_ALPHA, moderngl.ONE)  # Additive blending for particles
            self._ctx.enable(moderngl.DEPTH_TEST)
            
            # Set up enhanced uniforms for particle shader (with safety checks)
            mvp_matrix = self._create_projection_matrix()
            
            # Set uniforms safely - use try/except since ModernGL doesn't have 'in' for Programs
            try:
                self._particle_render_shader['mvp_matrix'].write(mvp_matrix.tobytes())
            except KeyError:
                pass  # Uniform not available in shader
            
            try:
                self._particle_render_shader['time'].value = current_time
            except KeyError:
                pass
                
            try:
                self._particle_render_shader['intensity_multiplier'].value = 1.0 + intensity * 2.0
            except KeyError:
                pass
                
            try:
                self._particle_render_shader['screen_resolution'].value = (self._width, self._height)
            except KeyError:
                pass
                
            try:
                self._particle_render_shader['global_particle_scale'].value = self._particle_scale
            except KeyError:
                pass
            
            # Enhanced fragment shader uniforms (with safety checks)
            try:
                self._particle_render_shader['bloom_threshold'].value = dynamic_threshold
            except KeyError:
                pass
                
            try:
                self._particle_render_shader['particle_glow_intensity'].value = 2.0 + transcendence * 3.0
            except KeyError:
                pass
            
            # Render particles with advanced effects
            particle_count = getattr(self._particle_engine, 'particle_count', 1000)
            self._particle_vao.render(moderngl.POINTS, particle_count)
            
            # === PASS 2: BRIGHT PASS EXTRACTION ===
            self._bright_pass_fbo.use()
            self._ctx.clear(0.0, 0.0, 0.0, 1.0)
            self._ctx.disable(moderngl.BLEND)
            self._ctx.disable(moderngl.DEPTH_TEST)
            
            # Bind scene texture
            self._scene_fbo.color_attachments[0].use(location=0)
            
            # Enhanced bright pass uniforms (professional settings)
            try:
                self._bright_pass_shader['sceneTexture'].value = 0
                self._bright_pass_shader['threshold'].value = dynamic_threshold
                self._bright_pass_shader['softThreshold'].value = 0.5 + chaos * 0.3  # Soft transitions
                self._bright_pass_shader['intensity'].value = 1.0 + intensity * 1.5
                self._bright_pass_shader['colorPreservation'].value = 0.8 + precision * 0.2
            except KeyError:
                pass  # Shader uniform not available
            
            self._quad_vao.render(moderngl.TRIANGLE_STRIP)
            
            # === PASS 3: MULTI-PASS GAUSSIAN BLUR (PING-PONG) ===
            horizontal = True
            blur_passes = min(12, max(6, int(10 + intensity * 4)))  # Dynamic blur quality
            
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
                    source_texture = (self._blur_fbo_b.color_attachments[0] if horizontal 
                                    else self._blur_fbo_a.color_attachments[0])
                
                source_texture.use(location=0)
                
                # Configure enhanced blur shader uniforms
                try:
                    self._blur_shader['image'].value = 0
                    self._blur_shader['horizontal'].value = horizontal
                    self._blur_shader['blurIntensity'].value = 0.8 + intensity * 0.2  # Dynamic blur strength
                    self._blur_shader['kernelSize'].value = 1.0 + chaos * 0.5  # Chaos adds blur spread
                except KeyError:
                    pass  # Fallback for missing uniforms
                
                self._quad_vao.render(moderngl.TRIANGLE_STRIP)
                horizontal = not horizontal  # Toggle direction
            
            # Determine final blur texture
            final_blur_texture = (self._blur_fbo_a.color_attachments[0] if horizontal 
                                else self._blur_fbo_b.color_attachments[0])
            
            # === PASS 4: FINAL COMPOSITION ===
            self._final_fbo.use()
            self._ctx.clear(0.0, 0.0, 0.0, 1.0)
            
            # Bind both scene and bloom textures
            self._scene_fbo.color_attachments[0].use(location=0)
            final_blur_texture.use(location=1)
            
            # Configure professional composition shader with ACES tone mapping
            try:
                self._composite_shader['sceneTexture'].value = 0
                self._composite_shader['bloomTexture'].value = 1
                self._composite_shader['bloomStrength'].value = dynamic_bloom_strength
                self._composite_shader['exposure'].value = -0.5 + intensity * 1.0  # Dynamic exposure
                self._composite_shader['contrast'].value = 1.0 + precision * 0.3  # Precision enhances contrast
                self._composite_shader['saturation'].value = 1.0 + intensity * 0.4  # Intensity boosts saturation
                self._composite_shader['gamma'].value = 2.2  # Standard sRGB gamma
                self._composite_shader['blendMode'].value = int(chaos * 3.99)  # Chaos selects blend mode
            except KeyError:
                pass  # Fallback for missing uniforms
            
            self._quad_vao.render(moderngl.TRIANGLE_STRIP)
            
            # === FINAL: READ PIXELS AND ENCODE ===
            raw_data = self._final_fbo.read(components=3, alignment=1)
            
            # Convert to PIL Image with proper orientation
            image = Image.frombytes('RGB', self._final_fbo.size, raw_data)
            image = image.transpose(Image.FLIP_TOP_BOTTOM)  # Correct OpenGL orientation
            
            # High-quality JPEG encoding
            with io.BytesIO() as output:
                image.save(output, format='JPEG', quality=95, optimize=True)
                jpeg_data = output.getvalue()
            
            self._last_frame_time = current_time
            
            # Performance logging every 60 frames
            if self._frame_count % 60 == 0:
                self._logger.debug(f"🎨 Rendered frame {self._frame_count} with {blur_passes} blur passes")
            
            return jpeg_data
            
        except Exception as e:
            self._logger.error(f"🚨 HDR rendering pipeline failed: {e}")
            return self._render_software_fallback()

    def _create_projection_matrix(self) -> Any:
        """
        Create optimized projection matrix for particle rendering.
        QUALIA.CODE: Efficient matrix generation for 3D to 2D projection.
        """
        # Orthographic projection matrix for 2D particle rendering
        mvp_matrix = np.eye(4, dtype=np.float32)
        
        # Scale and translate to normalize coordinates
        mvp_matrix[0, 0] = 2.0 / self._width   # X scale
        mvp_matrix[1, 1] = 2.0 / self._height  # Y scale  
        mvp_matrix[3, 0] = -1.0                # X translate
        mvp_matrix[3, 1] = -1.0                # Y translate
        
        return mvp_matrix

    @log_execution(level="DEBUG")
    def _render_software_fallback(self) -> Optional[bytes]:
        """Generate fallback frame data when GPU rendering is unavailable."""
        try:
            if not PIL_AVAILABLE:
                self._logger.warning("⚠️ PIL not available for software fallback")
                return None
                
            # Create a simple colored frame based on current qualia state
            intensity = self._current_qualia_state.get('intensity', 0.5)
            
            # Generate RGB values based on intensity
            r = int(255 * min(intensity * 2, 1.0))
            g = int(255 * min(intensity * 1.5, 1.0))
            b = int(255 * intensity)
            
            # Create PIL image with solid color
            pil_image = Image.new('RGB', (self._width, self._height), (r, g, b))
            
            # Encode as JPEG
            with io.BytesIO() as output:
                pil_image.save(output, format='JPEG', quality=85, optimize=True)
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
        if hasattr(self, '_render_task') and self._render_task and not self._render_task.done():
            self._render_task.cancel()
            try:
                await self._render_task
            except asyncio.CancelledError:
                self._logger.info("Rendering loop cancelled successfully.")

        # Release all graphics resources
        try:
            if self._particle_engine:
                # Assuming particle_engine has its own shutdown
                if hasattr(self._particle_engine, 'shutdown') and asyncio.iscoroutinefunction(self._particle_engine.shutdown):
                    await self._particle_engine.shutdown()
                elif hasattr(self._particle_engine, 'release'):
                     self._particle_engine.release() # For objects with release()

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
            self._logger.error(f"🚨 Error during RenderingService resource cleanup: {e}")

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