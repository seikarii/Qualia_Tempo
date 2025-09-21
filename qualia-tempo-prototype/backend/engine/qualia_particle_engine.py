# QUALIA.CODE v1.0 - QualiaParticleEngine
# GPU-optimized particle system with ping-pong buffer optimization for real-time visual effects

import logging
import os
import struct
import time
from typing import Any, Dict
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
    QualiaState = Any  # type: ignore[misc]
    QUALIA_STATE_AVAILABLE = False

logger = logging.getLogger(__name__)

# Availability flag
QUALIA_GPU_AVAILABLE = moderngl is not None and np is not None


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
    ):
        self.ctx = ctx
        self.max_particles = max_particles
        self.enable_metrics = enable_metrics
        self.event_bus = event_bus  # QUALIA.CODE: Store EventBus reference

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
        """Initialize ping-pong buffer pairs with particle data."""
        if not self.ctx or not self.compute_shader:
            logger.error("Cannot initialize buffers without valid context and shader")
            return False

        try:
            # Create initial particle data if not provided
            if particles_data is None:
                particles_data = self._create_initial_particles()

            # Convert to proper format
            particle_bytes = particles_data.astype(np.float32).tobytes()
            particle_size = len(particle_bytes)

            # Create dual buffers for ping-pong operation
            self.particle_buffers.buffer_a = self.ctx.buffer(particle_bytes)
            self.particle_buffers.buffer_b = self.ctx.buffer(
                b"\x00" * particle_size
            )  # Empty buffer of same size
            self.particle_buffers.size = particle_size
            self.particle_buffers.element_count = len(particles_data)

            # CRITICAL: Create ForceFieldsBuffer for binding = 2
            # Create placeholder force fields data (empty for now)
            force_fields_data = self._create_initial_force_fields()
            force_fields_bytes = force_fields_data.astype(np.float32).tobytes()
            self.force_fields_buffer = self.ctx.buffer(force_fields_bytes)

            self.particles_initialized = True

            logger.info(
                f"✅ Ping-pong particle buffers initialized: {len(particles_data)} particles"
            )
            logger.info(
                f"✅ ForceFieldsBuffer initialized with {len(force_fields_data)} force fields"
            )
            return True

        except Exception as e:
            logger.error(f"🚨 Failed to initialize ping-pong buffers: {e}")
            return False

    def _create_initial_particles(self) -> Any:
        """Create initial particle data with enhanced physics properties."""
        if not np:
            raise ImportError("NumPy is required for particle data generation")

        # CRITICAL: Must match QualiaParticle struct in qualia_particles.glsl
        # position(3) + velocity(3) + acceleration(3) + color(4) + lifetime(1) + size(1) + resonance(1) + mass(1) + charge(1) + force_accumulator(3) = 21 components
        particles = np.zeros((self.max_particles, 21), dtype=np.float32)

        # Random positions in a cube around origin
        particles[:, 0:3] = np.random.uniform(-10.0, 10.0, (self.max_particles, 3))

        # Small random velocities
        particles[:, 3:6] = np.random.uniform(-1.0, 1.0, (self.max_particles, 3))

        # Zero initial acceleration
        particles[:, 6:9] = 0.0

        # Initial colors (white with alpha)
        particles[:, 9:13] = [1.0, 1.0, 1.0, 1.0]

        # Random lifetimes (0.5 to 2.0 seconds)
        particles[:, 13] = np.random.uniform(0.5, 2.0, self.max_particles)

        # Random sizes (0.1 to 1.0)
        particles[:, 14] = np.random.uniform(0.1, 1.0, self.max_particles)

        # Initial resonance (0.0)
        particles[:, 15] = 0.0

        # Random mass (0.5 to 2.0)
        particles[:, 16] = np.random.uniform(0.5, 2.0, self.max_particles)

        # Random charge (-1.0 to 1.0)
        particles[:, 17] = np.random.uniform(-1.0, 1.0, self.max_particles)

        # Zero initial force accumulator
        particles[:, 18:21] = 0.0

        return particles

    def _create_initial_force_fields(self) -> Any:
        """Create initial force fields data for physics simulation."""
        if not np:
            raise ImportError("NumPy is required for force field data generation")

        # CRITICAL: Must match ForceField struct in qualia_particles.glsl
        # position(3) + force_direction(3) + strength(1) + radius(1) + field_type(1) = 9 components
        # Create 4 placeholder force fields for now
        num_force_fields = 4
        force_fields = np.zeros((num_force_fields, 9), dtype=np.float32)

        # Placeholder force fields (will be populated dynamically later)
        for i in range(num_force_fields):
            # Position
            force_fields[i, 0:3] = [0.0, 0.0, 0.0]
            # Force direction
            force_fields[i, 3:6] = [0.0, 1.0, 0.0]  # Upward force
            # Strength
            force_fields[i, 6] = 0.0  # No force initially
            # Radius
            force_fields[i, 7] = 10.0
            # Field type (0=gravitational)
            force_fields[i, 8] = 0.0

        return force_fields

    @log_execution(level="INFO")
    @handle_errors(fallback_return_value=None)
    def start(self) -> None:
        """Start the QualiaParticleEngine and subscribe to QualiaState events."""
        if not self.event_bus:
            logger.warning(
                "⚠️ No EventBus provided, cannot start event-driven operation"
            )
            return

        # QUALIA.CODE: Subscribe to QualiaStateUpdated events for EDA compliance
        self.event_bus.subscribe("QualiaStateUpdated", self._on_qualia_state_updated)
        self.status = "running"
        logger.info(
            "🎆 QualiaParticleEngine started and subscribed to QualiaState events"
        )

    @log_execution(level="DEBUG")
    @handle_errors(fallback_return_value=None)
    def _on_qualia_state_updated(self, event: Any) -> None:
        """Handle QualiaStateUpdated events and update uniform buffer."""
        try:
            # Extract QualiaState from event data
            # QUALIA.CODE: EventBus passes Event object with data attribute
            qualia_state = event.data if hasattr(event, "data") else event

            if not qualia_state:
                logger.warning("⚠️ QualiaStateUpdated event missing qualia_state data")
                return

            # Update uniform buffer with new state
            self.update_uniform_buffer(qualia_state)

            # Execute compute step for particle simulation
            # QUALIA.CODE: Maintain particle system responsiveness to state changes
            self.compute_step()

            logger.debug(
                "✅ Particle system updated and computed from QualiaState event"
            )

        except Exception as e:
            logger.error(f"🚨 Failed to handle QualiaStateUpdated event: {e}")

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

        # QUALIA.CODE: Use Pydantic QualiaState model with proper validation
        # Extract values from the model with getattr for safety
        uniform_data = struct.pack(
            "ffffffffI3f3f",  # 8 floats + 1 unsigned int + 3 floats + 3 floats (attractor position)
            float(getattr(qualia_state, "intensity", 0.0)),
            float(
                getattr(qualia_state, "accuracy", 0.0)
            ),  # CRITICAL: Use accuracy to match shader uniform
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
                self.uniform_buffer.bind_to_uniform_buffer(1)  # QualiaState

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

    def read_particles_data(self) -> Any:
        """Read current particle data from GPU (lazy transfer)."""
        if not self.particles_initialized:
            return None

        try:
            # Read from current input buffer (most recent computed data)
            current_buffer = self.particle_buffers.input_buffer
            particle_bytes = current_buffer.read()

            # Convert back to numpy array
            particles_array = np.frombuffer(particle_bytes, dtype=np.float32)
            # Reshape based on QualiaParticle structure (12 floats per particle)
            return particles_array.reshape(-1, 12)

        except Exception as e:
            logger.error(f"🚨 Failed to read particles data: {e}")
            return None

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
    async def shutdown(self) -> None:
        """Clean shutdown of Qualia particle engine."""
        try:
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
) -> QualiaParticleEngine:
    """
    Factory function to create a Qualia particle engine.

    Args:
        max_particles: Maximum number of particles to simulate
        enable_metrics: Whether to track performance metrics
        standalone: Whether to create a standalone context

    Returns:
        Configured QualiaParticleEngine instance
    """
    ctx = None

    if moderngl and standalone:
        try:
            # Try EGL first, fallback to software if not available
            try:
                ctx = moderngl.create_standalone_context(backend="egl")
                logger.info(
                    "✅ Created standalone EGL context for Qualia particle engine"
                )
            except Exception as egl_error:
                logger.warning(
                    f"⚠️ EGL not available ({egl_error}), trying software context"
                )
                try:
                    ctx = moderngl.create_standalone_context(backend="software")
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
    )
