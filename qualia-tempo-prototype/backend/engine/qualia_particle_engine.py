# QUALIA.CODE v1.0 - QualiaParticleEngine
# GPU-optimized particle system with ping-pong buffer optimization for real-time visual effects

import logging
import os
import struct
import time
from typing import Any, Dict, Optional
from dataclasses import dataclass
from enum import Enum

try:
    import moderngl
except ImportError:
    moderngl = None  # type: ignore[assignment]

try:
    import numpy as np
except ImportError:
    np = None  # type: ignore[assignment]

from ..utils.decorators import log_execution, handle_errors, time_execution

# QUALIA.CODE: Import Pydantic QualiaState model for type safety
try:
    from ..api.models import QualiaState as _QualiaStateModel

    QualiaState = _QualiaStateModel
    QUALIA_STATE_AVAILABLE = True
except ImportError:
    from typing import Any

    QualiaState = Any  # type: ignore[assignment,misc]
    QUALIA_STATE_AVAILABLE = False

logger = logging.getLogger(__name__)

# Availability flag
QUALIA_GPU_AVAILABLE = moderngl is not None and np is not None

# GOLD.CODE: Optimized particle data structure
# Memory-efficient structured array with precision-matched types
# Achieves 26% memory reduction (84 → 62 bytes per particle)
if np is not None:
    OPTIMIZED_PARTICLE_DTYPE = np.dtype([
        # High-precision vector fields: position, velocity, acceleration (float32)
        ('position', 'f4', (3,)),          # vec3: 12 bytes
        ('velocity', 'f4', (3,)),          # vec3: 12 bytes  
        ('acceleration', 'f4', (3,)),      # vec3: 12 bytes
        ('force_accumulator', 'f4', (3,)), # vec3: 12 bytes
        
        # Color: uint8 RGBA (0-255 range, GPU-standard)
        ('color', 'u1', (4,)),             # uvec4: 4 bytes (75% savings from float32)
        
        # Scalar properties: float16 (sufficient precision for visual effects)
        ('lifetime', 'f2'),                # float16: 2 bytes (50% savings)
        ('size', 'f2'),                    # float16: 2 bytes
        ('resonance', 'f2'),               # float16: 2 bytes
        ('mass', 'f2'),                    # float16: 2 bytes
        ('charge', 'f2'),                  # float16: 2 bytes
    ])
    # Memory Layout: 62 bytes per particle (vs 84 bytes original)
    # Savings: 22 bytes per particle (26.2% reduction)
else:
    OPTIMIZED_PARTICLE_DTYPE = None


class BufferState(Enum):
    """Buffer states for ping-pong management."""

    INPUT = "input"
    OUTPUT = "output"


@dataclass
class PingPongBufferPair:
    """A pair of buffers for ping-pong operations."""

    buffer_a: Any = None
    buffer_b: Any = None
    current_input: BufferState = BufferState.INPUT
    size: int = 0
    element_count: int = 0

    @property
    def input_buffer(self) -> Any:
        """Get the current input buffer."""
        return (
            self.buffer_a if self.current_input == BufferState.INPUT else self.buffer_b
        )

    @property
    def output_buffer(self) -> Any:
        """Get the current output buffer."""
        return (
            self.buffer_b if self.current_input == BufferState.INPUT else self.buffer_a
        )

    def swap(self) -> None:
        """Swap input/output buffer roles."""
        self.current_input = (
            BufferState.OUTPUT
            if self.current_input == BufferState.INPUT
            else BufferState.INPUT
        )

    def release(self) -> None:
        """Release both buffers."""
        if self.buffer_a:
            self.buffer_a.release()
            self.buffer_a = None
        if self.buffer_b:
            self.buffer_b.release()
            self.buffer_b = None


@dataclass
class QualiaMetrics:
    """Performance metrics for Qualia particle operations."""

    total_swaps: int = 0
    total_compute_time: float = 0.0
    total_transfer_time: float = 0.0
    gpu_memory_saved: int = 0  # Bytes saved by avoiding transfers
    performance_gain: float = 0.0  # Estimated performance improvement

    def add_swap(self, compute_time: float, transfer_avoided: int = 0) -> None:
        """Record a buffer swap operation."""
        self.total_swaps += 1
        self.total_compute_time += compute_time
        self.gpu_memory_saved += transfer_avoided

        # Estimate performance gain (avoiding transfer overhead)
        if transfer_avoided > 0:
            estimated_transfer_time = (
                transfer_avoided / (1024**3) * 0.1
            )  # ~100ms per GB
            self.total_transfer_time += estimated_transfer_time
            self.performance_gain = self.total_transfer_time / (
                self.total_compute_time + self.total_transfer_time
            )


class QualiaParticleEngine:
    """
    GPU-optimized particle engine with ping-pong buffer optimization for Qualia Tempo.

    This engine eliminates CPU-GPU transfer bottlenecks by maintaining dual
    buffer sets and swapping their roles after each compute pass. Particles respond
    in real-time to QualiaState changes for immersive visual feedback.
    """

    def __init__(
        self,
        ctx: Any = None,
        max_particles: int = 10000,
        enable_metrics: bool = True,
        event_bus: Any = None,  # QUALIA.CODE: EventBus injection for EDA compliance
        shader_inspector: Any = None,  # QUALIA.CODE: ShaderIntrospectionService injection
    ):
        self.ctx = ctx
        self.max_particles = max_particles
        self.enable_metrics = enable_metrics
        self.event_bus = event_bus  # QUALIA.CODE: Store EventBus reference
        self.shader_inspector = (
            shader_inspector  # QUALIA.CODE: Store ShaderIntrospectionService reference
        )

        # Ping-pong buffer pairs for particles
        self.particle_buffers = PingPongBufferPair()
        self.uniform_buffer: Any = None
        self.force_fields_buffer: Any = (
            None  # CRITICAL: ForceFieldsBuffer for binding = 2
        )

        # State tracking
        self.simulation_tick = 0
        self.status = "initialized"
        self.particles_initialized = False

        # Performance metrics
        self.metrics = QualiaMetrics() if enable_metrics else None

        # Shader management
        self.compute_shader: Any = None

        # Current time for animations
        self.start_time = time.time()

        # QUALIA.CODE v1.1: Autonomous simulation loop management  
        self._simulation_task: Optional[Any] = None
        self._is_simulating = False
        self._target_fps = 60.0  # High-frequency autonomous simulation

        # QUALIA.CODE v1.2: State cache for decoupling event handling from GPU operations
        self._pending_qualia_state: Optional[Any] = None

        if ctx:
            self._initialize_shader()

        logger.info(f"QualiaParticleEngine initialized (max_particles={max_particles})")

    @log_execution(level="INFO")
    @handle_errors(fallback_return_value=None)
    def _initialize_shader(self) -> None:
        """Initialize the compute shader for Qualia particle operations."""
        if not self.ctx:
            return

        try:
            logger.info("🔧 Compiling and linking GLSL shaders...")

            shader_path = os.path.join(
                os.path.dirname(__file__), "shaders", "qualia_particles.glsl"
            )

            if not os.path.exists(shader_path):
                # Create Qualia-optimized shader if it doesn't exist
                self._create_qualia_shader(shader_path)

            with open(shader_path, "r") as f:
                shader_source = f.read()

            # QUALIA.CODE: Use ShaderIntrospectionService to parse shader
            if self.shader_inspector:
                self.ubo_info = self.shader_inspector.introspect(shader_source)
                logger.info(
                    f"🔍 Shader introspection complete: {len(self.ubo_info['uniforms'])} uniforms, format: {self.ubo_info['struct_format']}"
                )
            else:
                logger.warning(
                    "⚠️ ShaderIntrospectionService not available, using fallback"
                )
                self.ubo_info = {"uniforms": [], "struct_format": "", "total_size": 0}

            self.compute_shader = self.ctx.compute_shader(shader_source)
            logger.info("✅ Shaders compiled and linked successfully.")

            # Loguear los uniforms esperados por el programa de shaders
            uniforms = {
                name: uniform
                for name, uniform in self.compute_shader._members.items()
                if isinstance(uniform, moderngl.Uniform)
            }
            logger.info(
                f"🔍 Detected uniforms in shader program: {list(uniforms.keys())}"
            )

        except Exception as e:
            logger.error("�🔥🔥 CATASTROPHIC SHADER FAILURE 🔥🔥🔥", exc_info=True)
            if hasattr(e, "stdout"):
                # Si es un error de compilación de moderngl, stdout puede tener info del driver
                logger.error(
                    f"📢 GLSL Compiler/Linker Output:\n{e.stdout.decode(errors='ignore')}"
                )

            # Forzar un crash si los shaders fallan, para evitar un estado de 'falso positivo'
            raise RuntimeError("Shader initialization failed, cannot continue.") from e

    def _create_qualia_shader(self, shader_path: str) -> None:
        """Create optimized compute shader for Qualia particle operations."""
        # Shader is already created in separate file - this method is kept for compatibility
        # The actual shader creation happens in the separate .glsl file
        logger.info(f"Qualia shader should be created at {shader_path}")
        pass

    @log_execution(level="INFO")
    @handle_errors(fallback_return_value=False)
    def initialize_buffers(self, particles_data: Any = None) -> bool:
        """
        GOLD.CODE: Initialize ping-pong buffers with optimized particle data.
        Maintains structured format on CPU, converts to GPU format for upload.
        """
        if not self.ctx or not self.compute_shader:
            logger.error("Cannot initialize buffers without valid context and shader")
            return False

        try:
            # Create initial particle data with optimized structure (GOLD.CODE)
            if particles_data is None:
                self._cpu_particles = self._create_initial_particles()  # Structured array
            else:
                self._cpu_particles = particles_data

            # Convert to GPU-compatible format (flat float32 array)
            gpu_particles = self._convert_particles_to_gpu_format(self._cpu_particles)
            particle_bytes = gpu_particles.tobytes()
            particle_size = len(particle_bytes)

            # Create dual buffers for ping-pong operation
            self.particle_buffers.buffer_a = self.ctx.buffer(particle_bytes)
            self.particle_buffers.buffer_b = self.ctx.buffer(
                b"\x00" * particle_size
            )  # Empty buffer of same size
            self.particle_buffers.size = particle_size
            self.particle_buffers.element_count = len(self._cpu_particles)

            # Store structured array for later access (API serialization, updates)
            self._structured_particles_cache = self._cpu_particles

            # CRITICAL: Create ForceFieldsBuffer for binding = 2
            force_fields_data = self._create_initial_force_fields()
            force_fields_bytes = force_fields_data.astype(np.float32).tobytes()
            self.force_fields_buffer = self.ctx.buffer(force_fields_bytes)

            self.particles_initialized = True

            logger.info(f"✅ GOLD.CODE: Ping-pong buffers initialized with {len(self._cpu_particles)} particles")
            logger.info(f"📊 CPU memory: {self._cpu_particles.nbytes / 1024:.2f} KB (optimized)")
            logger.info(f"📊 GPU memory: {particle_size / 1024:.2f} KB (expanded for compatibility)")
            logger.info(f"✅ ForceFieldsBuffer initialized with {len(force_fields_data)} force fields")
            return True

        except Exception as e:
            logger.error(f"🚨 Failed to initialize ping-pong buffers: {e}")
            return False

    def _create_initial_particles(self) -> Any:
        """
        GOLD.CODE: Create optimized particle data with precision-matched types.
        Uses structured NumPy array for 26% memory reduction (84→62 bytes per particle).
        """
        if not np:
            raise ImportError("NumPy is required for particle data generation")

        if OPTIMIZED_PARTICLE_DTYPE is None:
            raise ImportError("NumPy not available, cannot create optimized particles")

        # Create structured array with optimized dtype (GOLD.CODE)
        particles = np.zeros(self.max_particles, dtype=OPTIMIZED_PARTICLE_DTYPE)

        # Initialize high-precision vector fields (float32)
        particles['position'] = np.random.uniform(-10.0, 10.0, (self.max_particles, 3)).astype(np.float32)
        particles['velocity'] = np.random.uniform(-1.0, 1.0, (self.max_particles, 3)).astype(np.float32)
        particles['acceleration'] = np.zeros((self.max_particles, 3), dtype=np.float32)
        particles['force_accumulator'] = np.zeros((self.max_particles, 3), dtype=np.float32)

        # Initialize color with uint8 (0-255 range, standard for GPUs)
        particles['color'] = np.array([255, 255, 255, 255], dtype=np.uint8)

        # Initialize scalar properties with float16 (sufficient for visual effects)
        particles['lifetime'] = np.random.uniform(0.5, 2.0, self.max_particles).astype(np.float16)
        particles['size'] = np.random.uniform(0.1, 1.0, self.max_particles).astype(np.float16)
        particles['resonance'] = np.zeros(self.max_particles, dtype=np.float16)
        particles['mass'] = np.random.uniform(0.5, 2.0, self.max_particles).astype(np.float16)
        particles['charge'] = np.random.uniform(-1.0, 1.0, self.max_particles).astype(np.float16)

        logger.info(f"✅ GOLD.CODE: Initialized {self.max_particles} particles with optimized dtype")
        logger.info(f"📊 Memory footprint: {particles.nbytes / (1024**2):.2f} MB (26% reduction achieved)")
        
        return particles

    @log_execution(level="DEBUG")
    def _convert_particles_to_gpu_format(self, structured_particles: Any) -> Any:
        """
        GOLD.CODE: Convert structured particles to GPU-compatible flat array.
        Expands uint8 colors to float32 and float16 to float32 for shader consumption.
        
        This conversion happens only during GPU upload, maintaining memory savings on CPU side.
        
        Args:
            structured_particles: NumPy structured array with OPTIMIZED_PARTICLE_DTYPE
            
        Returns:
            Flat NumPy array (N, 21) with float32 for GPU buffer upload
        """
        if not np:
            raise ImportError("NumPy required for conversion")
        
        num_particles = len(structured_particles)
        
        # Allocate flat GPU buffer (21 float32 components per particle)
        gpu_particles = np.zeros((num_particles, 21), dtype=np.float32)
        
        # Copy high-precision vectors (already float32)
        gpu_particles[:, 0:3] = structured_particles['position']
        gpu_particles[:, 3:6] = structured_particles['velocity']
        gpu_particles[:, 6:9] = structured_particles['acceleration']
        
        # Expand uint8 colors to float32 (normalize 0-255 → 0.0-1.0)
        colors_u8 = structured_particles['color']
        gpu_particles[:, 9:13] = colors_u8.astype(np.float32) / 255.0
        
        # Convert float16 scalars to float32
        gpu_particles[:, 13] = structured_particles['lifetime'].astype(np.float32)
        gpu_particles[:, 14] = structured_particles['size'].astype(np.float32)
        gpu_particles[:, 15] = structured_particles['resonance'].astype(np.float32)
        gpu_particles[:, 16] = structured_particles['mass'].astype(np.float32)
        gpu_particles[:, 17] = structured_particles['charge'].astype(np.float32)
        
        # Copy force accumulator
        gpu_particles[:, 18:21] = structured_particles['force_accumulator']
        
        logger.debug(f"🔄 Converted {num_particles} particles to GPU format (flat float32 array)")
        
        return gpu_particles

    def _create_initial_force_fields(self) -> Any:
        """Create initial force fields data for physics simulation."""
        if not np:
            raise ImportError("NumPy is required for force field data generation")

        # CRITICAL: Must match ForceField struct in qualia_particles.glsl
        # position(3) + force_direction(3) + strength(1) + radius(1) + field_type(1) = 9 components
        # Initialize with maximum capacity for dynamic force fields
        max_force_fields = 16  # Increased capacity for dynamic gameplay
        force_fields = np.zeros((max_force_fields, 9), dtype=np.float32)

        # Initialize all fields as inactive (zero strength)
        for i in range(max_force_fields):
            # Position (inactive)
            force_fields[i, 0:3] = [0.0, 0.0, 0.0]
            # Force direction (default upward)
            force_fields[i, 3:6] = [0.0, 1.0, 0.0]
            # Strength (inactive)
            force_fields[i, 6] = 0.0
            # Radius
            force_fields[i, 7] = 10.0
            # Field type (0=attractor, 1=repulsor)
            force_fields[i, 8] = 0.0

        return force_fields

    @log_execution(level="INFO")
    @handle_errors(fallback_return_value=None)
    def update_force_fields(self, fields: list) -> None:
        """
        Update dynamic force fields from gameplay events.
        
        Args:
            fields: List of force field dictionaries with structure:
                {
                    "type": "attractor" | "repulsor",
                    "position": (x, y, z),
                    "strength": float,
                    "radius": float,
                    "duration": float  # Optional for future lifecycle management
                }
        """
        if not self.ctx or not self.force_fields_buffer:
            logger.warning("Cannot update force fields: OpenGL context or buffer not initialized")
            return
            
        if not np:
            logger.error("NumPy is required for force field operations")
            return

        # Validate input
        if not isinstance(fields, list):
            logger.error("Force fields must be provided as a list")
            return

        # Limit to maximum capacity
        max_fields = 16
        active_fields = fields[:max_fields]
        
        # Create new force fields array
        force_fields_data = np.zeros((max_fields, 9), dtype=np.float32)
        
        for i, field in enumerate(active_fields):
            try:
                # Validate required fields
                if not all(key in field for key in ["type", "position", "strength", "radius"]):
                    logger.warning(f"Force field {i} missing required keys, skipping")
                    continue
                
                # Position
                position = field["position"]
                if len(position) >= 3:
                    force_fields_data[i, 0:3] = position[0:3]
                else:
                    logger.warning(f"Force field {i} position incomplete, using defaults")
                    force_fields_data[i, 0:3] = [0.0, 0.0, 0.0]
                
                # Force direction (normalized from position for attractors/repulsors)
                force_fields_data[i, 3:6] = [0.0, 1.0, 0.0]  # Default upward
                
                # Strength
                strength = float(field["strength"])
                force_fields_data[i, 6] = strength
                
                # Radius
                radius = float(field["radius"])
                force_fields_data[i, 7] = max(radius, 0.1)  # Minimum radius to prevent division issues
                
                # Field type: 0=attractor, 1=repulsor
                field_type = 0 if field["type"] == "attractor" else 1
                force_fields_data[i, 8] = float(field_type)
                
            except (KeyError, ValueError, TypeError) as e:
                logger.warning(f"Error processing force field {i}: {e}")
                continue
        
        # Update GPU buffer with new data
        try:
            force_fields_bytes = force_fields_data.astype(np.float32).tobytes()
            self.force_fields_buffer.write(force_fields_bytes)
            
            active_count = len([f for f in active_fields if f.get("strength", 0) != 0])
            logger.debug(f"✅ Updated {active_count} active force fields on GPU")
            
        except Exception as e:
            logger.error(f"🚨 Failed to update force fields buffer: {e}")

    @log_execution(level="INFO")
    @handle_errors(fallback_return_value=None)
    def start(self) -> None:
        """Start the QualiaParticleEngine and wait for system resources to be ready."""
        if not self.event_bus:
            logger.warning(
                "⚠️ No EventBus provided, cannot start event-driven operation"
            )
            return

        # QUALIA.CODE: Subscribe to QualiaStateUpdated events for EDA compliance
        self.event_bus.subscribe("QualiaStateUpdated", self._on_qualia_state_updated)
        
        # QUALIA.CODE v1.1: Subscribe to System.ResourcesReady event instead of starting immediately
        self.event_bus.subscribe("System.ResourcesReady", self._on_resources_ready)
        
        self.status = "waiting_for_resources"
        logger.info(
            "🎆 QualiaParticleEngine started and waiting for System.ResourcesReady event"
        )

    @log_execution(level="INFO")
    @handle_errors(fallback_return_value=None)
    def _on_resources_ready(self, event: Any) -> None:
        """
        Handle System.ResourcesReady event.
        THIS IS THE CORRECT PLACE TO INITIALIZE BUFFERS.
        """
        # Add a guard to prevent re-initialization
        if self.particles_initialized:
            logger.warning("Buffers already initialized, ignoring redundant ResourcesReady event.")
            return

        logger.info("📡 Received System.ResourcesReady event. Initializing particle buffers...")

        # 1. CRITICAL FIX: Initialize the buffers here.
        if self.initialize_buffers():
            logger.info("✅ Particle buffers initialized successfully.")
            # 2. Only start the simulation AFTER buffers are ready.
            self._start_autonomous_simulation()
            self.status = "running"
        else:
            logger.critical("🔥🔥 FAILED TO INITIALIZE PARTICLE BUFFERS. Engine cannot start. 🔥🔥")
            self.status = "error_buffer_initialization_failed"

    @log_execution(level="DEBUG")
    @handle_errors(fallback_return_value=None)
    def _on_qualia_state_updated(self, event: Any) -> None:
        """Handle QualiaStateUpdated events and cache state for GPU update in simulation loop."""
        try:
            # Extract QualiaState from event data
            # QUALIA.CODE: EventBus passes Event object with data attribute
            qualia_state = event.data if hasattr(event, "data") else event

            if not qualia_state:
                logger.warning("⚠️ QualiaStateUpdated event missing qualia_state data")
                return

            # QUALIA.CODE v1.2: Cache state instead of directly updating GPU buffer
            # GPU operations are now centralized in the autonomous simulation loop
            self._pending_qualia_state = qualia_state

            logger.debug(
                "✅ Cached QualiaState for next simulation tick"
            )

        except Exception as e:
            logger.error(f"🚨 Failed to cache QualiaStateUpdated event: {e}")

    @log_execution(level="DEBUG")
    @handle_errors(fallback_return_value=None)
    def update_uniform_buffer(
        self, qualia_state: Any
    ) -> None:  # QUALIA.CODE: Accepts Pydantic QualiaState model
        """Update uniform buffer with QualiaState parameters, respecting std140 layout."""
        if not self.ctx:
            return

        # QUALIA.CODE: Convert Dict to Pydantic model if necessary for type safety
        if isinstance(qualia_state, dict) and QUALIA_STATE_AVAILABLE:
            try:
                qualia_state = QualiaState(**qualia_state)
                logger.debug("✅ Converted Dict to Pydantic QualiaState model")
            except Exception as e:
                logger.warning(f"⚠️ Failed to convert Dict to QualiaState model: {e}")
                # Continue with dict, using getattr as fallback

        current_time = time.time() - self.start_time

        # QUALIA.CODE: Use ShaderIntrospectionService for dynamic uniform packing
        if hasattr(self, "ubo_info") and self.ubo_info["uniforms"]:
            # Build uniform values list based on introspected uniforms
            uniform_values = []
            for name, type_name, offset in self.ubo_info["uniforms"]:
                if name == "time":
                    uniform_values.append(float(current_time))
                elif name == "particle_count":
                    uniform_values.append(self.max_particles)
                elif name == "intensity":
                    uniform_values.append(
                        float(getattr(qualia_state, "intensity", 0.0))
                    )
                elif name == "precision":
                    uniform_values.append(
                        float(getattr(qualia_state, "precision", 0.0))
                    )
                elif name == "aggression":
                    uniform_values.append(
                        float(getattr(qualia_state, "aggression", 0.0))
                    )
                elif name == "flow":
                    uniform_values.append(float(getattr(qualia_state, "flow", 0.0)))
                elif name == "chaos":
                    uniform_values.append(float(getattr(qualia_state, "chaos", 0.0)))
                elif name == "recovery":
                    uniform_values.append(float(getattr(qualia_state, "recovery", 0.0)))
                elif name == "transcendence":
                    uniform_values.append(
                        float(getattr(qualia_state, "transcendence", 0.0))
                    )
                else:
                    uniform_values.append(0.0)  # Default value for unknown uniforms

            uniform_data = struct.pack(self.ubo_info["struct_format"], *uniform_values)
        else:
            # Fallback to hardcoded format if introspection failed
            logger.warning("⚠️ Using hardcoded uniform format as fallback")
            uniform_data = struct.pack(
                "ffffffffI3f3f",  # 8 floats + 1 unsigned int + 3 floats + 3 floats (attractor position)
                float(getattr(qualia_state, "intensity", 0.0)),
                float(
                    getattr(qualia_state, "precision", 0.0)
                ),  # QUALIA.CODE ARCHITECTURAL FIX: Use 'precision' from data model, 'accuracy' is a shader-only name
                float(getattr(qualia_state, "aggression", 0.0)),
                float(getattr(qualia_state, "flow", 0.0)),
                float(getattr(qualia_state, "chaos", 0.0)),
                float(getattr(qualia_state, "recovery", 0.0)),
                float(getattr(qualia_state, "transcendence", 0.0)),
                float(current_time),
                self.max_particles,
                # Enhanced parameters for advanced physics
                0.0,
                0.0,
                0.0,  # attractor_position (x, y, z)
                2.0,  # interaction_radius
                0.98,  # damping_factor
                1.0,  # force_field_strength
            )

        if self.uniform_buffer:
            self.uniform_buffer.write(uniform_data)
        else:
            # Ensure buffer is created with the correct, padded size.
            self.uniform_buffer = self.ctx.buffer(uniform_data)

    @log_execution(level="DEBUG")
    @handle_errors(fallback_return_value=False)
    @time_execution()
    def compute_step(self) -> bool:
        """Execute one compute step with ping-pong buffer optimization."""
        if not self.particles_initialized or not self.compute_shader:
            logger.warning("Cannot compute: buffers not initialized or shader missing")
            return False

        # CRITICAL SAFETY CHECKS
        if not self.particle_buffers or not self.particle_buffers.input_buffer or not self.particle_buffers.output_buffer:
            logger.error("CRITICAL: Particle buffers not properly initialized")
            return False
        
        if not self.ctx:
            logger.error("CRITICAL: OpenGL context not available")
            return False

        start_time = time.time() if self.enable_metrics else 0

        try:
            # Bind buffers for ping-pong operation
            self.particle_buffers.input_buffer.bind_to_storage_buffer(
                0
            )  # Input particles
            self.particle_buffers.output_buffer.bind_to_storage_buffer(
                1
            )  # Output particles

            # CRITICAL: Bind ForceFieldsBuffer at binding = 2
            if self.force_fields_buffer:
                self.force_fields_buffer.bind_to_storage_buffer(2)  # Force fields

            if self.uniform_buffer:
                self.uniform_buffer.bind_to_uniform_buffer(3)  # QualiaState

            # Dispatch compute shader
            num_work_groups = (self.particle_buffers.element_count + 63) // 64
            self.compute_shader.run(group_x=num_work_groups)

            # Ensure completion
            self.ctx.finish()

            # Swap buffer roles for next iteration
            self.particle_buffers.swap()
            self.simulation_tick += 1

            # Record metrics
            if self.enable_metrics and self.metrics:
                compute_time = time.time() - start_time
                transfer_saved = self.particle_buffers.size
                self.metrics.add_swap(compute_time, transfer_saved)

            logger.debug(f"Qualia compute step {self.simulation_tick} completed")
            return True

        except Exception as e:
            logger.error(f"🚨 Qualia compute step failed: {e}")
            return False

    @log_execution(level="INFO")
    @handle_errors(fallback_return_value=None)
    def reset(self) -> None:
        """Reset particle engine to initial state."""
        try:
            if self.particles_initialized:
                # Regenerate initial particle data
                initial_particles = self._create_initial_particles()
                particle_bytes = initial_particles.astype(np.float32).tobytes()

                # Reset both buffers to initial state
                self.particle_buffers.buffer_a.write(particle_bytes)
                self.particle_buffers.buffer_b.write(b"\x00" * len(particle_bytes))

                # Reset to initial input state
                self.particle_buffers.current_input = BufferState.INPUT

                self.simulation_tick = 0
                self.start_time = time.time()

                logger.info("🔄 QualiaParticleEngine reset to initial state")

        except Exception as e:
            logger.error(f"🚨 Failed to reset particle engine: {e}")

    def get_particle_data_as_numpy_array(self) -> Any:
        """Read current particle data from GPU as numpy array (binary-ready).
        
        QUALIA.CODE v1.2: Renamed from read_particles_data() for explicit naming.
        Fixed critical reshape bug: particles have 21 components, not 12.
        Returns binary-ready numpy array for zero-copy streaming.
        """
        if not self.particles_initialized:
            return None

        try:
            # Read from current input buffer (most recent computed data)
            current_buffer = self.particle_buffers.input_buffer
            particle_bytes = current_buffer.read()

            # Convert back to numpy array
            particles_array = np.frombuffer(particle_bytes, dtype=np.float32)
            # CRITICAL FIX: Reshape based on QualiaParticle structure (21 components)
            # position(3) + velocity(3) + acceleration(3) + color(4) + lifetime(1) + size(1) + resonance(1) + mass(1) + charge(1) + force_accumulator(3) = 21
            return particles_array.reshape(-1, 21)

        except Exception as e:
            logger.error(f"🚨 Failed to read particles data: {e}")
            return None

    @log_execution(level="DEBUG")
    def get_optimized_particle_data(self) -> bytes:
        """
        GOLD.CODE: Export particles in optimized structured format for API transfer.
        Returns compact binary representation (62 bytes per particle vs 84 original).
        
        Returns:
            bytes: Compact structured array in binary format (26% smaller)
        """
        if not self.particles_initialized or not hasattr(self, '_structured_particles_cache'):
            logger.warning("Particles not initialized or cache unavailable, returning empty data")
            return b""
        
        # Return structured array as compact bytes (26% smaller than GPU format)
        particle_bytes: bytes = self._structured_particles_cache.tobytes()
        return particle_bytes

    @log_execution(level="DEBUG")
    def get_particle_metadata(self) -> Dict[str, Any]:
        """
        GOLD.CODE: Return metadata for frontend to decode optimized format.
        Provides complete schema information for binary decoding.
        
        Returns:
            Dict containing dtype, size, and field offset information
        """
        if OPTIMIZED_PARTICLE_DTYPE is None:
            return {"error": "NumPy not available"}
            
        return {
            "dtype": str(OPTIMIZED_PARTICLE_DTYPE),
            "count": self.max_particles,
            "bytes_per_particle": OPTIMIZED_PARTICLE_DTYPE.itemsize,
            "total_bytes": self.max_particles * OPTIMIZED_PARTICLE_DTYPE.itemsize,
            "format_version": "GOLD.CODE-1.0",
            "memory_savings": "26.2%",
            "fields": {
                "position": {"type": "float32", "shape": [3], "offset": 0, "bytes": 12},
                "velocity": {"type": "float32", "shape": [3], "offset": 12, "bytes": 12},
                "acceleration": {"type": "float32", "shape": [3], "offset": 24, "bytes": 12},
                "force_accumulator": {"type": "float32", "shape": [3], "offset": 36, "bytes": 12},
                "color": {"type": "uint8", "shape": [4], "offset": 48, "bytes": 4},
                "lifetime": {"type": "float16", "shape": [], "offset": 52, "bytes": 2},
                "size": {"type": "float16", "shape": [], "offset": 54, "bytes": 2},
                "resonance": {"type": "float16", "shape": [], "offset": 56, "bytes": 2},
                "mass": {"type": "float16", "shape": [], "offset": 58, "bytes": 2},
                "charge": {"type": "float16", "shape": [], "offset": 60, "bytes": 2},
            }
        }

    def get_current_parameters(self) -> Dict[str, Any]:
        """Get current engine parameters for compatibility."""
        return {
            "max_particles": self.max_particles,
            "simulation_tick": self.simulation_tick,
            "particles_initialized": self.particles_initialized,
            "status": self.status,
        }

    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get Qualia performance metrics."""
        if not self.metrics:
            return {"metrics_disabled": True}

        return {
            "total_swaps": self.metrics.total_swaps,
            "total_compute_time": self.metrics.total_compute_time,
            "total_transfer_time_saved": self.metrics.total_transfer_time,
            "gpu_memory_transfers_avoided": self.metrics.gpu_memory_saved,
            "estimated_performance_gain": f"{self.metrics.performance_gain:.2%}",
            "average_compute_time": self.metrics.total_compute_time
            / max(1, self.metrics.total_swaps),
            "simulation_ticks": self.simulation_tick,
        }

    @log_execution(level="INFO")
    @handle_errors(fallback_return_value=None)
    def _start_autonomous_simulation(self) -> None:
        """Start the autonomous simulation loop at high frequency."""
        if self._is_simulating:
            logger.warning("Autonomous simulation already running")
            return
            
        self._is_simulating = True
        
        # Import asyncio here to avoid top-level import issues
        import asyncio
        self._simulation_task = asyncio.create_task(self._autonomous_simulation_loop())
        logger.info(f"🎯 Started autonomous simulation loop at {self._target_fps}fps")

    @log_execution(level="DEBUG")
    @handle_errors(fallback_return_value=None)
    async def _autonomous_simulation_loop(self) -> None:
        """Autonomous high-frequency simulation loop."""
        import asyncio
        import time
        
        frame_time = 1.0 / self._target_fps
        
        try:
            while self._is_simulating:
                loop_start = time.time()
                
                # QUALIA.CODE v1.2: Consume cached QualiaState before compute step
                if self._pending_qualia_state is not None:
                    self.update_uniform_buffer(self._pending_qualia_state)
                    self._pending_qualia_state = None  # Clear cache
                
                # Execute particle simulation step
                self.compute_step()
                
                # Frame rate limiting
                elapsed = time.time() - loop_start
                sleep_time = max(0, frame_time - elapsed)
                
                if sleep_time > 0:
                    await asyncio.sleep(sleep_time)
                    
        except asyncio.CancelledError:
            logger.info("🛑 Autonomous simulation loop cancelled")
            raise
        except Exception as e:
            logger.error(f"🚨 Error in autonomous simulation loop: {e}")
        finally:
            logger.info("🛑 Autonomous simulation loop terminated")

    @log_execution(level="INFO")
    @handle_errors(fallback_return_value=None)
    async def _stop_autonomous_simulation(self) -> None:
        """Stop the autonomous simulation loop."""
        if not self._is_simulating or not self._simulation_task:
            return
            
        self._is_simulating = False
        
        if not self._simulation_task.done():
            self._simulation_task.cancel()
            try:
                import asyncio
                await asyncio.wait_for(self._simulation_task, timeout=1.0)
                logger.info("✅ Autonomous simulation loop stopped successfully")
            except asyncio.CancelledError:
                logger.info("✅ Autonomous simulation loop cancelled")
            except asyncio.TimeoutError:
                logger.warning("⚠️ Timeout stopping autonomous simulation loop")
                
        self._simulation_task = None

    @log_execution(level="INFO")
    @handle_errors(fallback_return_value=None)
    async def shutdown(self) -> None:
        """Clean shutdown of Qualia particle engine."""
        try:
            # QUALIA.CODE v1.1: Stop autonomous simulation first
            await self._stop_autonomous_simulation()
            
            self.particle_buffers.release()

            if self.uniform_buffer:
                self.uniform_buffer.release()
                self.uniform_buffer = None

            self.status = "shutdown"
            logger.info("✅ QualiaParticleEngine shutdown complete")

        except Exception as e:
            logger.error(f"🚨 Error during particle engine shutdown: {e}")


# Factory function for easy integration
def create_qualia_particle_engine(
    max_particles: int = 10000,
    enable_metrics: bool = True,
    standalone: bool = False,
    event_bus: Any = None,  # QUALIA.CODE: EventBus parameter for DI
    ctx: Any = None,  # GOLD.CODE: Accept existing context for shared OpenGL context
    shader_inspector: Any = None,  # QUALIA.CODE: ShaderIntrospectionService parameter
) -> QualiaParticleEngine:
    """
    Factory function to create a Qualia particle engine.

    Args:
        max_particles: Maximum number of particles to simulate
        enable_metrics: Whether to track performance metrics
        standalone: Whether to create a standalone context (ignored if ctx provided)
        ctx: Existing OpenGL context to use (GOLD.CODE: Shared context pattern)
        shader_inspector: ShaderIntrospectionService for dynamic uniform handling

    Returns:
        Configured QualiaParticleEngine instance
    """
    # GOLD.CODE: Use provided context, only create standalone if none provided
    if ctx is None and moderngl and standalone:
        try:
            # Try EGL first, fallback to software if not available
            try:
                ctx = moderngl.create_standalone_context(require=330)
                logger.info(
                    "✅ Created standalone OpenGL context for Qualia particle engine"
                )
            except Exception as gl_error:
                logger.warning(
                    f"⚠️ OpenGL context creation failed ({gl_error}), trying fallback"
                )
                try:
                    ctx = moderngl.create_standalone_context()
                    logger.info(
                        "✅ Created standalone software context for Qualia particle engine"
                    )
                except Exception as sw_error:
                    logger.warning(
                        f"⚠️ Software context failed ({sw_error}), trying default context"
                    )
                    ctx = moderngl.create_standalone_context()
                    logger.info(
                        "✅ Created default standalone context for Qualia particle engine"
                    )
        except Exception as e:
            logger.warning(f"⚠️ Failed to create standalone context: {e}")

    return QualiaParticleEngine(
        ctx=ctx,
        max_particles=max_particles,
        enable_metrics=enable_metrics,
        event_bus=event_bus,  # QUALIA.CODE: Pass EventBus to constructor
        shader_inspector=shader_inspector,  # QUALIA.CODE: Pass ShaderIntrospectionService
    )
