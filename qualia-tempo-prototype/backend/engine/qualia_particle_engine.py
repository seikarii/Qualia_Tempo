# ARCHITECTURE.GOLD.CODE v2.0 - QualiaParticleEngine Refactored
# Pure state calculation wrapper - NO GPU, NO rendering
# Delegates all physics to ParticleStateCalculator

import logging
import time
from typing import Any, Dict, Optional, List
from dataclasses import dataclass

try:
    import numpy as np
except ImportError:
    np = None  # type: ignore[assignment]

from .ParticleStateCalculator import (
    ParticleStateCalculator,
    PhysicsConfig,
    OPTIMIZED_PARTICLE_DTYPE,
    create_particle_state_calculator
)

# Import decorators - handle both relative and absolute imports
try:
    from backend.utils.decorators import log_execution, handle_errors, time_execution
except ImportError:
    from utils.decorators import log_execution, handle_errors, time_execution

# QUALIA.CODE v1.1 - QualiaParticleEngine
# Main particle engine for Qualia Tempo
# ARCHITECTURE.GOLD.CODE v2: Backend calculates STATE, no rendering

# mypy: disable-error-code="import-not-found,no-redef,misc"
# Rationale: Phase 1 code with complex imports and type aliasing. Will be refactored in optimization pass.

import numpy as np
import logging
from typing import List, Dict, Any, Optional, Union
from dataclasses import dataclass, asdict
import time
import yaml
try:
    from backend.api.models import QualiaState as _QualiaStateModel
    QualiaState = _QualiaStateModel
    QUALIA_STATE_AVAILABLE = True
except ImportError:
    try:
        from api.models import QualiaState as _QualiaStateModel
        QualiaState = _QualiaStateModel
        QUALIA_STATE_AVAILABLE = True
    except ImportError:
        from typing import Any
        QualiaState = Any  # type: ignore[assignment,misc]
        QUALIA_STATE_AVAILABLE = False
    QUALIA_STATE_AVAILABLE = False

logger = logging.getLogger(__name__)

# Availability flag (NO GPU REQUIRED)
QUALIA_PARTICLE_ENGINE_AVAILABLE = np is not None


@dataclass
class QualiaMetrics:
    """Performance metrics for Qualia particle operations."""
    
    total_updates: int = 0
    total_compute_time: float = 0.0
    average_update_time: float = 0.0
    particles_processed: int = 0
    
    def add_update(self, compute_time: float, particle_count: int) -> None:
        """Record a particle update operation."""
        self.total_updates += 1
        self.total_compute_time += compute_time
        self.particles_processed += particle_count
        self.average_update_time = self.total_compute_time / self.total_updates if self.total_updates > 0 else 0.0


class QualiaParticleEngine:
    """
    ARCHITECTURE.GOLD.CODE compliant particle engine wrapper.
    
    This class serves as a facade/adapter that maintains backward compatibility
    with the v1 API while delegating all particle physics calculations to the
    ParticleStateCalculator. It handles:
    - QualiaState-driven particle parameter updates
    - EventBus integration for event-driven architecture
    - State aggregation and JSON serialization for frontend consumption
    - Performance metrics and monitoring
    
    KEY PRINCIPLE: This class does NOT render, does NOT use GPU, does NOT use ModernGL.
    It only calculates STATE and emits it for the frontend to render.
    """

    def __init__(
        self,
        calculator_factory: Optional[Any] = None,  # Callable that creates ParticleStateCalculator
        ctx: Any = None,  # DEPRECATED - kept for backward compatibility, not used
        max_particles: int = 10000,
        enable_metrics: bool = True,
        event_bus: Any = None,
        shader_inspector: Any = None,  # DEPRECATED - kept for backward compatibility, not used
    ):
        """
        Initialize the QualiaParticleEngine wrapper.
        
        QUALIA.CODE COMPLIANCE FIX:
        - Accepts calculator_factory for dependency injection (§2.1 IoC)
        - If calculator_factory is None, falls back to direct instantiation (backward compatibility)
        
        Args:
            calculator_factory: Optional factory function to create ParticleStateCalculator (IoC)
            ctx: DEPRECATED (v1 GPU context, not used in v2)
            max_particles: Maximum number of particles to simulate
            enable_metrics: Enable performance metrics tracking
            event_bus: EventBus for event-driven communication (QUALIA.CODE)
            shader_inspector: DEPRECATED (v1 shader introspection, not used in v2)
        """
        if ctx is not None:
            logger.warning(
                "⚠️ DEPRECATION: 'ctx' parameter is deprecated in v2. "
                "QualiaParticleEngine no longer uses GPU/ModernGL."
            )
        
        if shader_inspector is not None:
            logger.warning(
                "⚠️ DEPRECATION: 'shader_inspector' parameter is deprecated in v2. "
                "No shaders are used in pure state calculation mode."
            )
        
        self.max_particles = max_particles
        self.enable_metrics = enable_metrics
        self.event_bus = event_bus
        self._calculator_factory = calculator_factory
        
        # State tracking
        self.simulation_tick = 0
        self.status = "initialized"
        self.particles_initialized = False
        
        # Performance metrics
        self.metrics = QualiaMetrics() if enable_metrics else None
        
        # Current time for animations
        self.start_time = time.time()
        
        # Physics configuration from QualiaState
        self.physics_config = PhysicsConfig()
        
        # Create the pure state calculator (NO GPU) - Will be created via factory if provided
        self.calculator: Optional[ParticleStateCalculator] = None
        
        # QUALIA.CODE v1.2: State cache for decoupling event handling
        self._pending_qualia_state: Optional[Any] = None
        self._current_qualia_state: Optional[Any] = None
        
        logger.info(
            f"✅ QualiaParticleEngine v2 initialized (max_particles={max_particles}, "
            f"GPU=False, Pure State Calculation=True)"
        )

    @log_execution(level="INFO")
    @handle_errors(fallback_return_value=False)
    def initialize_buffers(self, particles_data: Any = None) -> bool:
        """
        Initialize particle state calculator with initial particle data.
        
        This replaces the v1 GPU buffer initialization with pure CPU/NumPy initialization.
        
        Args:
            particles_data: Optional pre-initialized particle data (NumPy structured array)
            
        Returns:
            True if initialization successful
        """
        if np is None:
            logger.error("NumPy is required for particle calculations")
            return False
        
        try:
            # Create the particle state calculator via factory (IoC) or direct instantiation (backward compatibility)
            if self._calculator_factory is not None:
                # QUALIA.CODE COMPLIANT: Use injected factory
                self.calculator = self._calculator_factory(
                    max_particles=self.max_particles,
                    physics_config=self.physics_config,
                    event_bus=self.event_bus
                )
                logger.debug("ParticleStateCalculator created via injected factory (IoC compliant)")
            else:
                # BACKWARD COMPATIBILITY: Direct instantiation
                self.calculator = ParticleStateCalculator(
                    max_particles=self.max_particles,
                    physics_config=self.physics_config,
                    event_bus=self.event_bus
                )
                logger.debug("ParticleStateCalculator created via direct instantiation (backward compatibility mode)")
            
            # Initialize particles (either with provided data or defaults)
            success = self.calculator.initialize_particles(particle_data=particles_data)
            
            if success:
                self.particles_initialized = True
                self.status = "running"
                logger.info(
                    f"✅ Particle state calculator initialized: {self.max_particles} particles, "
                    f"{self.calculator.particles.nbytes / 1024:.2f} KB memory"
                )
            else:
                logger.error("Failed to initialize particle state calculator")
                return False
            
            return True
            
        except Exception as e:  # pragma: no cover
            # Exception handling: reachable on calculator initialization failure
            logger.error(f"Buffer initialization failed: {e}", exc_info=True)
            return False

    @time_execution()
    @handle_errors(fallback_return_value=None)
    def update(self, dt: Optional[float] = None) -> bool:
        """
        Update particle physics simulation by one time step.
        
        This is the main simulation loop that delegates to ParticleStateCalculator.
        
        Args:
            dt: Delta time in seconds (uses physics config default if None)
            
        Returns:
            True if update successful
        """
        if not self.particles_initialized or self.calculator is None:
            logger.warning("Cannot update: particles not initialized")
            return False
        
        start_time = time.time()
        
        # Apply any pending QualiaState updates to physics parameters
        if self._pending_qualia_state is not None:
            self._apply_qualia_state_to_physics(self._pending_qualia_state)
            self._current_qualia_state = self._pending_qualia_state
            self._pending_qualia_state = None
        
        # Delegate physics calculation to ParticleStateCalculator
        success: bool = bool(self.calculator.update(dt=dt))
        
        if success:
            self.simulation_tick += 1
            
            # Update metrics
            if self.metrics:
                compute_time = time.time() - start_time
                self.metrics.add_update(compute_time, self.max_particles)
        
        return success

    def _apply_qualia_state_to_physics(self, qualia_state: Any) -> None:
        """
        Apply QualiaState parameters to physics simulation.
        
        This method translates high-level Qualia parameters into physics forces and fields.
        
        Args:
            qualia_state: QualiaState object with intensity, transcendence, etc.
        """
        try:
            # Clear existing force fields
            if self.calculator:
                self.calculator.clear_force_fields()
            
            # intensity → gravity strength
            if hasattr(qualia_state, 'intensity'):
                intensity = float(qualia_state.intensity)
                self.physics_config.gravity = 9.8 * (1.0 + intensity)
                if self.calculator:
                    self.calculator.physics_config.gravity = self.physics_config.gravity
            
            # transcendence → attractive force field at center
            if hasattr(qualia_state, 'transcendence'):
                transcendence = float(qualia_state.transcendence)
                if transcendence > 0.5 and self.calculator:
                    # Create central attractor
                    strength = 200.0 * transcendence
                    self.calculator.add_force_field(
                        position=(0.0, 0.0, 0.0),
                        strength=strength,
                        radius=15.0
                    )
            
            # chaos → turbulent force fields
            if hasattr(qualia_state, 'chaos'):
                chaos = float(qualia_state.chaos)
                if chaos > 0.3 and self.calculator:
                    # Create chaotic repulsive fields at random positions
                    num_fields = int(chaos * 3) + 1
                    for _ in range(num_fields):
                        pos = (
                            np.random.uniform(-8, 8),
                            np.random.uniform(-8, 8),
                            np.random.uniform(-8, 8)
                        )
                        self.calculator.add_force_field(
                            position=pos,
                            strength=-50.0 * chaos,  # Negative = repulsive
                            radius=5.0
                        )
            
            # aggression → damping (less damping = more aggressive movement)
            if hasattr(qualia_state, 'aggression'):
                aggression = float(qualia_state.aggression)
                self.physics_config.damping = 0.98 - (aggression * 0.15)  # 0.98 → 0.83
                if self.calculator:
                    self.calculator.physics_config.damping = self.physics_config.damping
            
            logger.debug(f"Applied QualiaState to physics: gravity={self.physics_config.gravity:.2f}, damping={self.physics_config.damping:.3f}")
            
        except Exception as e:
            logger.error(f"Failed to apply QualiaState to physics: {e}")

    def update_from_qualia_state(self, qualia_state: Any) -> None:
        """
        Queue a QualiaState update for the next physics step.
        
        This method is called by external systems (EventBus subscribers, API routes)
        to update particle behavior based on game state.
        
        Args:
            qualia_state: QualiaState object from backend
        """
        self._pending_qualia_state = qualia_state
        logger.debug(f"Queued QualiaState update for next physics tick")

    @log_execution(level="INFO")
    def get_particle_states(self) -> List[Dict[str, Any]]:
        """
        Get current particle states as JSON-serializable list.
        
        This is the primary output method for sending state to the frontend.
        
        Returns:
            List of dictionaries containing particle state data
        """
        if not self.particles_initialized or self.calculator is None:
            logger.warning("Cannot get particle states: particles not initialized")
            return []
        
        # Explicitly cast to list to satisfy MyPy
        result: list[dict[str, Any]] = self.calculator.get_particle_states()
        return result

    def get_statistics(self) -> Dict[str, Any]:
        """
        Get comprehensive simulation statistics.
        
        Returns:
            Dictionary with simulation stats and performance metrics
        """
        stats = {
            'simulation_tick': self.simulation_tick,
            'status': self.status,
            'particles_initialized': self.particles_initialized,
            'max_particles': self.max_particles,
        }
        
        # Add calculator stats if available
        if self.calculator:
            calc_stats = self.calculator.get_statistics()
            stats.update({
                'calculator_' + k: v for k, v in calc_stats.items()
            })
        
        # Add performance metrics if enabled
        if self.metrics:
            stats.update({
                'total_updates': self.metrics.total_updates,
                'total_compute_time': self.metrics.total_compute_time,
                'average_update_time': self.metrics.average_update_time,
                'particles_processed': self.metrics.particles_processed,
            })
        
        return stats

    @log_execution(level="DEBUG")
    @handle_errors(fallback_return_value=b'')
    def get_optimized_particle_data(self) -> bytes:
        """
        Get particle data in optimized GOLD.CODE binary format (62 bytes per particle).
        
        This is the primary data output method for streaming to frontend via WebSocket
        or REST API. The binary format uses:
        - float32 for vector fields (position, velocity, acceleration, force_accumulator)
        - uint8 for color (RGBA 0-255)
        - float16 for scalar fields (lifetime, size, resonance, mass, charge)
        
        Returns:
            Binary data as bytes (particle_count * 62 bytes)
        """
        if not self.particles_initialized or self.calculator is None:
            logger.warning("Cannot get particle data: particles not initialized")
            return b''
        
        try:
            # Get particles from calculator (already in OPTIMIZED_PARTICLE_DTYPE format)
            particles = self.calculator.particles
            
            # Convert to bytes - NumPy structured array tobytes() preserves dtype layout
            particle_bytes: bytes = particles.tobytes()
            
            logger.debug(
                f"Generated {len(particle_bytes)} bytes of optimized particle data "
                f"({self.max_particles} particles × 62 bytes)"
            )
            
            return particle_bytes
            
        except Exception as e:
            logger.error(f"Failed to generate optimized particle data: {e}", exc_info=True)
            return b''

    @log_execution(level="DEBUG")
    @handle_errors(fallback_return_value={})
    def get_particle_metadata(self) -> Dict[str, Any]:
        """
        Get metadata describing the particle data format.
        
        This metadata is used by clients to correctly decode the binary particle data.
        
        Returns:
            Dictionary with format specification and particle count
        """
        if not self.particles_initialized or self.calculator is None:
            return {
                "format": "GOLD.CODE-1.0",
                "particle_count": 0,
                "bytes_per_particle": 62,
                "total_bytes": 0,
                "dtype": "structured_numpy_array",
                "fields": []
            }
        
        try:
            return {
                "format": "GOLD.CODE-1.0",
                "particle_count": self.max_particles,
                "bytes_per_particle": 62,
                "total_bytes": self.max_particles * 62,
                "dtype": "structured_numpy_array",
                "fields": [
                    {"name": "position", "type": "float32", "shape": [3], "offset": 0},
                    {"name": "velocity", "type": "float32", "shape": [3], "offset": 12},
                    {"name": "acceleration", "type": "float32", "shape": [3], "offset": 24},
                    {"name": "force_accumulator", "type": "float32", "shape": [3], "offset": 36},
                    {"name": "color", "type": "uint8", "shape": [4], "offset": 48},
                    {"name": "lifetime", "type": "float16", "shape": [], "offset": 52},
                    {"name": "size", "type": "float16", "shape": [], "offset": 54},
                    {"name": "resonance", "type": "float16", "shape": [], "offset": 56},
                    {"name": "mass", "type": "float16", "shape": [], "offset": 58},
                    {"name": "charge", "type": "float16", "shape": [], "offset": 60}
                ]
            }
        except Exception as e:
            logger.error(f"Failed to generate particle metadata: {e}", exc_info=True)
            return {}

    def cleanup(self) -> None:
        """
        Clean up resources.
        
        In v2, this is much simpler since there are no GPU resources to release.
        """
        if self.calculator:
            logger.info("Cleaning up ParticleStateCalculator")
            self.calculator = None
        
        self.particles_initialized = False
        self.status = "cleaned_up"
        logger.info("✅ QualiaParticleEngine cleanup complete")

    # DEPRECATED v1 METHODS (kept for backward compatibility, log warnings)
    
    def _initialize_shader(self) -> None:
        """DEPRECATED: Shaders not used in v2."""
        logger.warning("⚠️ DEPRECATION: _initialize_shader() is deprecated in v2 (no GPU)")

    def _create_qualia_shader(self, shader_path: str) -> None:
        """DEPRECATED: Shaders not used in v2."""
        logger.warning("⚠️ DEPRECATION: _create_qualia_shader() is deprecated in v2 (no GPU)")

    def get_output_buffer(self) -> Any:
        """DEPRECATED: GPU buffers not used in v2."""
        logger.warning("⚠️ DEPRECATION: get_output_buffer() is deprecated in v2 (no GPU)")
        return None

    def read_particle_data(self) -> Any:
        """DEPRECATED: Use get_particle_states() instead."""
        logger.warning("⚠️ DEPRECATION: read_particle_data() is deprecated, use get_particle_states()")
        if self.calculator:
            return self.calculator.particles
        return None


# Factory function for backward compatibility
@log_execution(level="INFO")
def create_qualia_particle_engine(
    max_particles: int = 10000,
    enable_metrics: bool = True,
    event_bus: Any = None,
) -> QualiaParticleEngine:
    """
    Factory function to create a QualiaParticleEngine instance.
    
    Args:
        max_particles: Maximum number of particles
        enable_metrics: Enable performance metrics
        event_bus: EventBus instance for event-driven architecture
        
    Returns:
        Initialized QualiaParticleEngine
    """
    engine = QualiaParticleEngine(
        max_particles=max_particles,
        enable_metrics=enable_metrics,
        event_bus=event_bus
    )
    
    # Initialize with default state
    engine.initialize_buffers()
    
    return engine
