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
    ):
        self.ctx = ctx
        self.max_particles = max_particles
        self.enable_metrics = enable_metrics

        # Ping-pong buffer pairs for particles
        self.particle_buffers = PingPongBufferPair()
        self.uniform_buffer: Any = None

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
            uniforms = {name: uniform for name, uniform in self.compute_shader._members.items() if isinstance(uniform, moderngl.Uniform)}
            logger.info(f"🔍 Detected uniforms in shader program: {list(uniforms.keys())}")

        except Exception as e:
            logger.error("�🔥🔥 CATASTROPHIC SHADER FAILURE 🔥🔥🔥", exc_info=True)
            if hasattr(e, 'stdout'):
                # Si es un error de compilación de moderngl, stdout puede tener info del driver
                logger.error(f"📢 GLSL Compiler/Linker Output:\n{e.stdout.decode(errors='ignore')}")

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

            self.particles_initialized = True

            logger.info(
                f"✅ Ping-pong particle buffers initialized: {len(particles_data)} particles"
            )
            return True

        except Exception as e:
            logger.error(f"🚨 Failed to initialize ping-pong buffers: {e}")
            return False

    def _create_initial_particles(self) -> Any:
        """Create initial particle data with random positions and properties."""
        if not np:
            raise ImportError("NumPy is required for particle data generation")

        # QualiaParticle structure: position(3) + velocity(3) + color(4) + lifetime(1) + size(1) = 12 floats
        particles = np.zeros((self.max_particles, 12), dtype=np.float32)

        # Random positions in a cube around origin
        particles[:, 0:3] = np.random.uniform(-10.0, 10.0, (self.max_particles, 3))

        # Small random velocities
        particles[:, 3:6] = np.random.uniform(-1.0, 1.0, (self.max_particles, 3))

        # Initial colors (white with alpha)
        particles[:, 6:10] = [1.0, 1.0, 1.0, 1.0]

        # Random lifetimes (0.5 to 2.0 seconds)
        particles[:, 10] = np.random.uniform(0.5, 2.0, self.max_particles)

        # Random sizes (0.1 to 1.0)
        particles[:, 11] = np.random.uniform(0.1, 1.0, self.max_particles)

        return particles

    @log_execution(level="DEBUG")
    @handle_errors(fallback_return_value=None)
    def update_uniform_buffer(self, qualia_state: Dict[str, Any]) -> None:
        """Update uniform buffer with QualiaState parameters, respecting std140 layout."""
        if not self.ctx:
            return

        current_time = time.time() - self.start_time

        # Pack QualiaState data according to std140 shader UBO layout.
        # The struct must be padded to a multiple of 16 bytes.
        # Original: 8 floats (32 bytes) + 1 uint (4 bytes) = 36 bytes.
        # Padded size: 48 bytes (next multiple of 16).
        # Padding needed: 48 - 36 = 12 bytes.
        # Format: 8 floats, 1 unsigned int, 12 padding bytes ('x').
        uniform_data = struct.pack(
            "ffffffffI12x",  # 8 floats + 1 unsigned int + 12 bytes padding
            float(qualia_state.get("intensity", 0.0)),
            float(qualia_state.get("focus_level", 0.0)),
            float(qualia_state.get("aggression", 0.0)),
            float(qualia_state.get("flow", 0.0)),
            float(qualia_state.get("chaos", 0.0)),
            float(qualia_state.get("recovery", 0.0)),
            float(qualia_state.get("transcendence", 0.0)),
            float(current_time),
            self.max_particles,
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
            ctx = moderngl.create_context(standalone=True)
            logger.info("✅ Created standalone context for Qualia particle engine")
        except Exception as e:
            logger.warning(f"⚠️ Failed to create standalone context: {e}")

    return QualiaParticleEngine(
        ctx=ctx,
        max_particles=max_particles,
        enable_metrics=enable_metrics,
    )
