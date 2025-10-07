# ARCHITECTURE.GOLD.CODE v2.0 - ParticleStateCalculator
# Pure Python particle physics calculator - NO GPU, NO rendering
# Calculates particle state transitions for streaming to frontend

import logging
from typing import Any, Dict, List, Optional, Tuple
from dataclasses import dataclass
import time

try:
    import numpy as np
except ImportError:
    np = None  # type: ignore[assignment]

# Import decorators - handle both relative and absolute imports
try:
    from backend.utils.decorators import log_execution, handle_errors, time_execution
except ImportError:
    from utils.decorators import log_execution, handle_errors, time_execution

logger = logging.getLogger(__name__)

# ARCHITECTURE.GOLD.CODE: Optimized particle data structure (maintained from v1)
# This structure is used for CPU-side particle physics calculations
if np is not None:
    OPTIMIZED_PARTICLE_DTYPE = np.dtype([
        # High-precision vector fields: position, velocity, acceleration (float32)
        ('position', 'f4', (3,)),          # vec3: 12 bytes
        ('velocity', 'f4', (3,)),          # vec3: 12 bytes  
        ('acceleration', 'f4', (3,)),      # vec3: 12 bytes
        ('force_accumulator', 'f4', (3,)), # vec3: 12 bytes
        
        # Color: uint8 RGBA (0-255 range)
        ('color', 'u1', (4,)),             # uvec4: 4 bytes
        
        # Scalar properties: float16 (sufficient precision for visual effects)
        ('lifetime', 'f2'),                # float16: 2 bytes
        ('size', 'f2'),                    # float16: 2 bytes
        ('resonance', 'f2'),               # float16: 2 bytes
        ('mass', 'f2'),                    # float16: 2 bytes
        ('charge', 'f2'),                  # float16: 2 bytes
    ])
else:  # pragma: no cover
    # MyPy false positive: this is reachable when numpy is not installed
    OPTIMIZED_PARTICLE_DTYPE = None


@dataclass
class PhysicsConfig:
    """Configuration for particle physics simulation."""
    gravity: float = 9.8
    damping: float = 0.98
    collision_elasticity: float = 0.7
    max_velocity: float = 100.0
    dt: float = 0.016  # ~60 FPS


class ParticleStateCalculator:
    """
    ARCHITECTURE.GOLD.CODE compliant pure particle physics calculator.
    
    This class handles all particle state calculations WITHOUT any GPU operations.
    It's designed to run in a Process Pool (Task 1.3) for parallel processing.
    
    Key principles:
    - NO ModernGL dependencies
    - NO rendering code
    - Pure state calculation
    - JSON-serializable output
    - Deterministic physics
    """

    def __init__(
        self,
        max_particles: int = 10000,
        physics_config: Optional[PhysicsConfig] = None,
        event_bus: Any = None,
    ):
        """
        Initialize the particle state calculator.
        
        Args:
            max_particles: Maximum number of particles to simulate
            physics_config: Physics simulation configuration
            event_bus: EventBus for event-driven communication (QUALIA.CODE)
        """
        if np is None:
            raise ImportError("NumPy is required for ParticleStateCalculator")
        
        if OPTIMIZED_PARTICLE_DTYPE is None:
            raise ImportError("NumPy not available, cannot create optimized particles")
        
        self.max_particles = max_particles
        self.physics_config = physics_config or PhysicsConfig()
        self.event_bus = event_bus
        
        # Initialize particle array with optimized dtype
        self.particles = np.zeros(max_particles, dtype=OPTIMIZED_PARTICLE_DTYPE)
        
        # Force fields (attract/repel zones)
        self.force_fields: List[Dict[str, Any]] = []
        
        # Simulation state
        self.simulation_time = 0.0
        self.simulation_tick = 0
        
        logger.info(
            f"✅ ParticleStateCalculator initialized: {max_particles} particles, "
            f"{self.particles.nbytes / 1024:.2f} KB memory"
        )

    @log_execution(level="DEBUG")
    @handle_errors(fallback_return_value=None)
    def initialize_particles(
        self,
        particle_data: Optional[Any] = None
    ) -> bool:
        """
        Initialize particle states.
        
        Args:
            particle_data: Optional pre-initialized particle data
            
        Returns:
            True if initialization successful
        """
        try:
            if particle_data is not None:
                self.particles = particle_data
            else:
                # Initialize with default random distribution
                self.particles['position'] = np.random.uniform(
                    -10.0, 10.0, (self.max_particles, 3)
                ).astype(np.float32)
                
                self.particles['velocity'] = np.random.uniform(
                    -1.0, 1.0, (self.max_particles, 3)
                ).astype(np.float32)
                
                self.particles['acceleration'] = np.zeros(
                    (self.max_particles, 3), dtype=np.float32
                )
                
                self.particles['force_accumulator'] = np.zeros(
                    (self.max_particles, 3), dtype=np.float32
                )
                
                # Initialize color (white by default)
                self.particles['color'] = np.array([255, 255, 255, 255], dtype=np.uint8)
                
                # Initialize scalar properties
                self.particles['lifetime'] = np.random.uniform(
                    0.5, 2.0, self.max_particles
                ).astype(np.float16)
                
                self.particles['size'] = np.random.uniform(
                    0.1, 1.0, self.max_particles
                ).astype(np.float16)
                
                self.particles['resonance'] = np.zeros(self.max_particles, dtype=np.float16)
                self.particles['mass'] = np.random.uniform(
                    0.5, 2.0, self.max_particles
                ).astype(np.float16)
                
                self.particles['charge'] = np.random.uniform(
                    -1.0, 1.0, self.max_particles
                ).astype(np.float16)
            
            logger.info(f"✅ Initialized {self.max_particles} particles")
            return True
            
        except Exception as e:
            logger.error(f"🚨 Failed to initialize particles: {e}")
            return False

    @time_execution()
    @handle_errors(fallback_return_value=None)
    def update(self, dt: Optional[float] = None) -> bool:
        """
        Update particle physics simulation by one time step.
        
        Args:
            dt: Delta time in seconds (uses config default if None)
            
        Returns:
            True if update successful
        """
        if dt is None:
            dt = self.physics_config.dt
        
        try:
            # Clear force accumulators
            self.particles['force_accumulator'][:] = 0.0
            
            # Apply damping to existing velocities
            self._apply_damping()
            
            # Apply force fields
            self._apply_force_fields()
            
            # Apply gravity
            self._apply_gravity(dt)
            
            # Update velocities from forces (F = ma, v = v + a*dt)
            self._integrate_forces(dt)
            
            # Update positions from velocities
            self._integrate_velocity(dt)
            
            # Handle collisions
            self._handle_collisions()
            
            # Update lifetimes
            self._update_lifetimes(dt)
            
            # Update simulation state
            self.simulation_time += dt
            self.simulation_tick += 1
            
            return True
            
        except Exception as e:
            logger.error(f"�� Particle update failed: {e}")
            return False

    def _apply_force_fields(self) -> None:
        """Apply force field influences to particles."""
        for field in self.force_fields:
            field_pos = np.array(field['position'], dtype=np.float32)
            field_strength = field['strength']
            field_radius = field['radius']
            
            # Calculate distance from each particle to field center
            delta = self.particles['position'] - field_pos  # Vector FROM field TO particle
            dist = np.linalg.norm(delta, axis=1, keepdims=True)
            
            # Avoid division by zero
            dist = np.maximum(dist, 0.001)
            
            # Calculate force magnitude (inverse square law with radius limit)
            in_range = (dist[:, 0] < field_radius)
            force_mag = field_strength / (dist ** 2)
            force_mag = np.clip(force_mag, -1000.0, 1000.0)
            
            # Calculate force direction
            # For ATTRACTION (positive strength): force points FROM particle TO field (negative delta)
            # For REPULSION (negative strength): force points FROM field TO particle (positive delta)
            force_dir = -delta / dist  # Negative delta gives attraction
            
            # Apply force (only to particles in range)
            force = force_dir * force_mag
            self.particles['force_accumulator'][in_range] += force[in_range]

    def _apply_gravity(self, dt: float) -> None:
        """Apply gravity force to all particles."""
        # Gravity acts downward (negative Y direction)
        # F = m * g (force equals mass times gravitational acceleration)
        mass_column = self.particles['mass'][:, np.newaxis].astype(np.float32)
        gravity_force = np.array([0.0, -self.physics_config.gravity, 0.0], dtype=np.float32)
        self.particles['force_accumulator'] += gravity_force * mass_column

    def _integrate_forces(self, dt: float) -> None:
        """Integrate forces to update velocities (F = ma)."""
        # a = F / m
        mass = self.particles['mass'][:, np.newaxis].astype(np.float32)
        mass = np.maximum(mass, 0.001)  # Avoid division by zero
        
        acceleration = self.particles['force_accumulator'] / mass
        self.particles['acceleration'] = acceleration
        
        # v = v + a * dt
        self.particles['velocity'] += acceleration * dt

    def _apply_damping(self) -> None:
        """Apply velocity damping (air resistance)."""
        self.particles['velocity'] *= self.physics_config.damping

    def _integrate_velocity(self, dt: float) -> None:
        """Integrate velocity to update positions."""
        # Clamp velocities to max
        vel_mag = np.linalg.norm(self.particles['velocity'], axis=1, keepdims=True)
        vel_mag = np.maximum(vel_mag, 0.001)
        
        over_max = vel_mag[:, 0] > self.physics_config.max_velocity
        self.particles['velocity'][over_max] *= (
            self.physics_config.max_velocity / vel_mag[over_max]
        )
        
        # p = p + v * dt
        self.particles['position'] += self.particles['velocity'] * dt

    def _handle_collisions(self) -> None:
        """Handle particle collisions with boundaries."""
        # Simple box collision (boundaries at ±10 units)
        bounds = 10.0
        
        for axis in range(3):
            # Check lower bound
            below = self.particles['position'][:, axis] < -bounds
            self.particles['position'][below, axis] = -bounds
            self.particles['velocity'][below, axis] *= -self.physics_config.collision_elasticity
            
            # Check upper bound
            above = self.particles['position'][:, axis] > bounds
            self.particles['position'][above, axis] = bounds
            self.particles['velocity'][above, axis] *= -self.physics_config.collision_elasticity

    def _update_lifetimes(self, dt: float) -> None:
        """Update particle lifetimes and respawn dead particles."""
        self.particles['lifetime'] -= dt
        
        # Respawn particles with expired lifetime
        dead = self.particles['lifetime'] <= 0
        if np.any(dead):
            num_dead = int(np.sum(dead))
            self.particles['lifetime'][dead] = np.random.uniform(
                0.5, 2.0, num_dead
            ).astype(np.float16)
            
            self.particles['position'][dead] = np.random.uniform(
                -10.0, 10.0, (num_dead, 3)
            ).astype(np.float32)

    def add_force_field(
        self,
        position: Tuple[float, float, float],
        strength: float,
        radius: float
    ) -> None:
        """
        Add a force field to the simulation.
        
        Args:
            position: (x, y, z) position of force field center
            strength: Force strength (positive = attract, negative = repel)
            radius: Effective radius of force field
        """
        self.force_fields.append({
            'position': position,
            'strength': strength,
            'radius': radius
        })
        logger.debug(f"Added force field at {position}, strength={strength}, radius={radius}")

    def clear_force_fields(self) -> None:
        """Remove all force fields."""
        self.force_fields.clear()
        logger.debug("Cleared all force fields")

    @log_execution(level="INFO")
    def get_particle_states(self) -> List[Dict[str, Any]]:
        """
        Get current particle states as JSON-serializable list.
        
        This is the output that will be sent to the frontend for rendering.
        
        Returns:
            List of dictionaries containing particle state data
        """
        states = []
        
        for i in range(self.max_particles):
            particle = {
                'position': self.particles['position'][i].tolist(),
                'velocity': self.particles['velocity'][i].tolist(),
                'color': self.particles['color'][i].tolist(),
                'lifetime': float(self.particles['lifetime'][i]),
                'size': float(self.particles['size'][i]),
                'resonance': float(self.particles['resonance'][i]),
            }
            states.append(particle)
        
        return states

    def get_statistics(self) -> Dict[str, Any]:
        """
        Get simulation statistics.
        
        Returns:
            Dictionary with simulation stats
        """
        return {
            'simulation_time': self.simulation_time,
            'simulation_tick': self.simulation_tick,
            'particle_count': self.max_particles,
            'active_force_fields': len(self.force_fields),
            'memory_usage_kb': self.particles.nbytes / 1024,
        }


# Factory function for creating calculator instances
@log_execution(level="INFO")
def create_particle_state_calculator(
    max_particles: int = 10000,
    physics_config: Optional[PhysicsConfig] = None,
    event_bus: Any = None,
) -> ParticleStateCalculator:
    """
    Factory function to create a ParticleStateCalculator instance.
    
    Args:
        max_particles: Maximum number of particles
        physics_config: Physics configuration
        event_bus: EventBus instance for event-driven architecture
        
    Returns:
        Initialized ParticleStateCalculator
    """
    calculator = ParticleStateCalculator(
        max_particles=max_particles,
        physics_config=physics_config,
        event_bus=event_bus
    )
    
    # Initialize particles with default state
    calculator.initialize_particles()
    
    return calculator
