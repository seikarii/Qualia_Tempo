import logging
import os
import struct
from typing import Any

import moderngl
import numpy as np

logger = logging.getLogger(__name__)


class GPUPhysicsEngine:
    """A GPU-based physics engine for simulating and rendering entities and particles."""
    def __init__(self, ctx):
        self,
        ctx: moderngl.Context | None,
        max_entities: int = 10000,
        max_lattices: int = 1000,
    ):
        self.ctx = ctx
        self.max_entities = max_entities
        self.max_lattices = max_lattices
        if self.ctx is None:
            raise ValueError("ModernGL context cannot be None")
        shader_path = os.path.join(
            os.path.dirname(__file__), "shaders", "ontological_physics.glsl"
        )
        with open(shader_path) as f:
            shader_source = f.read()
        self.compute_shader = self.ctx.compute_shader(shader_source)

        # Buffers will be created/updated dynamically based on simulation data
        self.entity_buffer: moderngl.Buffer | None = None
        self.lattice_buffer: moderngl.Buffer | None = None
        self.particle_buffer: moderngl.Buffer | None = None
        self.uniform_buffer: moderngl.Buffer | None = None

        self.entities_data: np.ndarray | None = None  # Store CPU-side entity data
        self.lattices_data: np.ndarray | None = None  # Store CPU-side lattice data
        self.particles_data: np.ndarray | None = None # Store CPU-side particle data

        self.entity_count = 0
        self.lattice_count = 0
        self.particle_count = 0
        self.simulation_tick = 0

    def _pack_structured_data(self, data: np.ndarray, dtype: np.dtype) -> bytes:
        """Packs structured NumPy array data into a byte string for ModernGL buffer."""
        packed_data = bytearray()
        for record in data:
            if dtype.names is None: # Add check for None
                continue
            for field_name in dtype.names:
                field_value = record[field_name]
                if dtype.fields is None: # Add check for None
                    continue
                field_dtype = dtype.fields[field_name][0]

                if (
                    field_dtype.subdtype is not None
                ):  # Handle array types (e.g., (3,) or (4,) floats)
                    for val in field_value.flatten():
                        if field_dtype.base.kind == "f":
                            packed_data.extend(struct.pack("<f", val))
                        elif field_dtype.base.kind == "u":
                            packed_data.extend(struct.pack("<I", val))
                else:  # Handle scalar types
                    if field_dtype.kind == "f":
                        packed_data.extend(struct.pack("<f", field_value))
                    elif field_dtype.kind == "u":
                        packed_data.extend(struct.pack("<I", field_value))
        return bytes(packed_data)

    def _create_entity_buffer(self, entities_data: np.ndarray):
        """Creates or updates the entity buffer on the GPU."""
        if self.ctx is None:
            logger.error("ModernGL context is None. Cannot create entity buffer.")
            return
        if self.entity_buffer:
            self.entity_buffer.release()

        packed_entities = self._pack_structured_data(entities_data, entities_data.dtype)
        self.entity_buffer = self.ctx.buffer(packed_entities)
        self.entity_count = len(entities_data)
        self.entity_buffer.bind_to_storage_buffer(0)  # Bind to binding point 0
        logger.debug(f"Created entity buffer with {self.entity_count} entities.")

    def _create_lattice_buffer(self, lattices_data: np.ndarray):
        """Creates or updates the lattice buffer on the GPU."""
        if self.ctx is None:
            logger.error("ModernGL context is None. Cannot create lattice buffer.")
            return

        if len(lattices_data) == 0:
            if self.lattice_buffer:
                self.lattice_buffer.release()
                self.lattice_buffer = None
            self.lattice_count = 0
            logger.debug("No lattice data provided. Lattice buffer released.")
            return

        if self.lattice_buffer:
            self.lattice_buffer.release()

        packed_lattices = self._pack_structured_data(lattices_data, lattices_data.dtype)
        self.lattice_buffer = self.ctx.buffer(packed_lattices)
        self.lattice_count = len(lattices_data)
        self.lattice_buffer.bind_to_storage_buffer(1)  # Bind to binding point 1
        logger.debug(f"Created lattice buffer with {self.lattice_count} lattices.")

    def _create_particle_buffer(self, particles_data: np.ndarray):
        """Creates or updates the particle buffer on the GPU."""
        if self.ctx is None:
            logger.error("ModernGL context is None. Cannot create particle buffer.")
            return

        if len(particles_data) == 0:
            if self.particle_buffer:
                self.particle_buffer.release()
                self.particle_buffer = None
            self.particle_count = 0
            logger.debug("No particle data provided. Particle buffer released.")
            return

        if self.particle_buffer:
            self.particle_buffer.release()

        packed_particles = self._pack_structured_data(particles_data, particles_data.dtype)
        self.particle_buffer = self.ctx.buffer(packed_particles)
        self.particle_count = len(particles_data)
        self.particle_buffer.bind_to_storage_buffer(3)  # Bind to binding point 3
        logger.debug(f"Created particle buffer with {self.particle_count} particles.")

    def _create_uniform_buffer(
        self,
        delta_time: float,
        reality_coherence: float,
        unified_field_center: tuple,
        chaos_entropy_level: float,
        time_dilation_factor: float,
    ):
        """Creates or updates the uniform buffer on the GPU."""
        if self.ctx is None:
            logger.error("ModernGL context is None. Cannot create uniform buffer.")
            return

        # Simplificar el formato para depuración y asegurar alineación
        # Usamos 'f' para float (4 bytes) y 'i' para int (4 bytes)
        # Aseguramos que todos los campos sean de 4 bytes para evitar problemas de alineación
        uniform_data = struct.pack(
            "ffffi",  # 4 floats, 1 int
            float(delta_time),
            float(reality_coherence),
            float(chaos_entropy_level),
            float(time_dilation_factor),
            int(self.simulation_tick),
        )

        if self.uniform_buffer:
            self.uniform_buffer.write(uniform_data)
        else:
            self.uniform_buffer = self.ctx.buffer(uniform_data)
        self.uniform_buffer.bind_to_storage_buffer(2)  # Bind to binding point 2
        logger.debug("Updated uniform buffer.")

    def update_buffers(
        self,
        entities_data: np.ndarray,
        lattices_data: np.ndarray,
        particles_data: np.ndarray,
        delta_time: float,
        reality_coherence: float,
        unified_field_center: tuple,
        chaos_entropy_level: float,
        time_dilation_factor: float,
        simulation_tick: int,
    ):
        """Updates all GPU buffers with current simulation data."""
        self.simulation_tick = simulation_tick
        self.entities_data = entities_data  # Store CPU-side data
        self.lattices_data = lattices_data  # Store CPU-side data
        self.particles_data = particles_data # Store CPU-side particle data
        self._create_entity_buffer(entities_data)
        self._create_lattice_buffer(lattices_data)
        self._create_particle_buffer(particles_data)
        self._create_uniform_buffer(
            delta_time,
            reality_coherence,
            unified_field_center,
            chaos_entropy_level,
            time_dilation_factor,
        )

    def run_simulation(self):
        """Dispatches the compute shader to run the simulation."""
        if self.compute_shader and self.entity_buffer and self.uniform_buffer:
            # Dispatch the compute shader. The number of work groups should be
            # at least the number of entities divided by the local_size_x (64).
            num_work_groups = (self.entity_count + 63) // 64
            self.compute_shader.run(num_work_groups, 1, 1)
            logger.debug(f"Compute shader dispatched for {self.entity_count} entities.")
        else:
            logger.warning(
                "Cannot run simulation: compute shader or buffers not ready."
            )

    def add_entity(self, entity_numpy_array: np.ndarray):
        """Adds a new entity (as a NumPy array) to the CPU-side data and updates the GPU buffer."""
        # Ensure entity_numpy_array is 1D for vstack to work as expected for a single entity
        if entity_numpy_array.ndim > 1:
            entity_numpy_array = entity_numpy_array.flatten()

        if self.entities_data is None or self.entities_data.size == 0:
            self.entities_data = entity_numpy_array.reshape(1, -1)
        else:
            self.entities_data = np.vstack(
                [self.entities_data, entity_numpy_array.reshape(1, -1)]
            )
        self._create_entity_buffer(self.entities_data)
        logger.debug(f"Added entity. Total entities: {self.entity_count}")

    def update_entity_state(self, entity_id: str, new_entity_numpy_array: np.ndarray):
        """Updates the state of a specific entity on the CPU-side and then updates the GPU buffer."""
        # Assuming entity_id corresponds to the row index in entities_data
        # This is a simplification; a more robust system would map entity_id to index.
        try:
            idx = int(
                entity_id.split("_")[-1]
            )  # Assuming entity_id is like 'entity_0', 'entity_1'
            if self.entities_data is not None and 0 <= idx < self.entity_count:
                self.entities_data[idx] = new_entity_numpy_array.reshape(1, -1)
                self._create_entity_buffer(
                    self.entities_data
                )  # Recreate buffer with updated data
                logger.debug(f"Updated entity {entity_id} state.")
            else:
                logger.warning(
                    f"Entity ID {entity_id} out of bounds for update or entities_data is None."
                )
        except ValueError:
            logger.warning(f"Could not parse entity ID {entity_id} for update.")

    def get_updated_entities_data(self) -> np.ndarray:
        """Reads back the updated entity data from the GPU."""
        if not self.entity_buffer:
            return np.array([])

        updated_data_bytes = self.entity_buffer.read()

        return np.frombuffer(updated_data_bytes, dtype=np.float32)

    def set_state(self, state: dict[str, Any]):
        """Sets the state of the GPUPhysicsEngine from a deserialized dictionary."""
        self.simulation_tick = state.get("simulation_tick", 0)
        # Recreate buffers if data is provided
        entities_data = state.get("entities_data")
        if entities_data is not None:
            self.entities_data = entities_data
            self._create_entity_buffer(entities_data)

        lattices_data = state.get("lattices_data")
        if lattices_data is not None:
            self.lattices_data = lattices_data
            self._create_lattice_buffer(lattices_data)

    def release(self):
        """Releases all GPU resources."""
        if self.entity_buffer:
            self.entity_buffer.release()
        if self.lattice_buffer:
            self.lattice_buffer.release()
        if self.uniform_buffer:
            self.uniform_buffer.release()
        logger.info("GPUPhysicsEngine resources released.")