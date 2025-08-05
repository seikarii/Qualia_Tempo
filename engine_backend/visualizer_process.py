import logging
import time
import json
import os

import moderngl
import numpy as np
import pygame

from reality_engine.gpu_physics_engine import GPUPhysicsEngine

# Configuración de logging
logging.basicConfig(
    level=logging.INFO, format="[%(levelname)s] %(asctime)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Archivo para IPC
QUALIA_STATE_FILE = os.path.join(os.path.dirname(__file__), "qualia_state.json")

# --- Configuración de Pygame ---
WIDTH, HEIGHT = 800, 600

# --- NumPy dtypes for GLSL structs ---
# LivingEntity struct: 80 bytes (20 floats)
LIVING_ENTITY_DTYPE = np.dtype(
    [
        ("position_x", "f4"),
        ("position_y", "f4"),
        ("position_z", "f4"),
        ("consciousness_level", "f4"),
        ("velocity_x", "f4"),
        ("velocity_y", "f4"),
        ("velocity_z", "f4"),
        ("ontological_drift", "f4"),
        ("qualia_state_x", "f4"),
        ("qualia_state_y", "f4"),
        ("qualia_state_z", "f4"),
        ("qualia_state_w", "f4"),
        ("lifecycle_stage", "f4"),
        ("empathetic_resonance", "f4"),
        ("chaos_influence", "f4"),
        ("entity_id", "u4"),
        ("is_active", "u4"),
        ("padding1", "f4"),  # Explicit padding to make it 80 bytes
        ("padding2", "f4"),  # Explicit padding to make it 80 bytes
        ("padding3", "f4"),  # Explicit padding to make it 80 bytes
    ]
)

# LatticePoint struct: 64 bytes (16 floats)
LATTICE_POINT_DTYPE = np.dtype(
    [
        ("position_x", "f4"),
        ("position_y", "f4"),
        ("position_z", "f4"),
        ("influence_strength", "f4"),
        ("elemental_composition_x", "f4"),
        ("elemental_composition_y", "f4"),
        ("elemental_composition_z", "f4"),
        ("elemental_composition_w", "f4"),
        ("metaphysical_state_x", "f4"),
        ("metaphysical_state_y", "f4"),
        ("metaphysical_state_z", "f4"),
        ("metaphysical_state_w", "f4"),
        ("coherence_level", "f4"),
        ("lattice_type", "u4"),
        ("padding1", "f4"),
        ("padding2", "f4"),
    ]
)

# --- Funciones del Motor Gráfico ---


def main_graphics_loop():
    try:
        pygame.init()
        pygame.display.set_mode((WIDTH, HEIGHT), pygame.OPENGL | pygame.DOUBLEBUF)
        pygame.display.set_caption("Qualia Tempo Visualizer")

        ctx = moderngl.create_context()

        # Initialize GPUPhysicsEngine
        gpu_engine = GPUPhysicsEngine(ctx)

        # --- Dummy Data for Entities and Lattices ---
        # Player entity (entity_id 0)
        player_entity = np.array(
            [
                (
                    0.0,
                    0.0,
                    0.0,  # position
                    0.5,  # consciousness_level
                    0.0,
                    0.0,
                    0.0,  # velocity
                    0.0,  # ontological_drift
                    0.5,
                    0.5,
                    0.5,
                    0.5,  # qualia_state
                    0.0,  # lifecycle_stage
                    0.0,  # empathetic_resonance
                    0.0,  # chaos_influence
                    0,  # entity_id
                    1,  # is_active
                    0.0,
                    0.0,
                    0.0,
                )
            ],  # padding
            dtype=LIVING_ENTITY_DTYPE,
        )

        # Boss entity (entity_id 1)
        boss_entity = np.array(
            [
                (
                    10.0,
                    10.0,
                    10.0,  # position
                    0.8,  # consciousness_level
                    0.0,
                    0.0,
                    0.0,  # velocity
                    0.0,  # ontological_drift
                    0.2,
                    0.2,
                    0.2,
                    0.2,  # qualia_state
                    0.0,  # lifecycle_stage
                    0.0,  # empathetic_resonance
                    0.0,  # chaos_influence
                    1,  # entity_id
                    1,  # is_active
                    0.0,
                    0.0,
                    0.0,
                )
            ],  # padding
            dtype=LIVING_ENTITY_DTYPE,
        )

        # Combine entities
        initial_entities = np.concatenate([player_entity, boss_entity])

        # Dummy lattice points
        initial_lattices = np.array(
            [
                (
                    5.0,
                    5.0,
                    0.0,  # position
                    1.0,  # influence_strength
                    1.0,
                    0.0,
                    0.0,
                    0.0,  # elemental_composition
                    0.0,
                    0.0,
                    0.0,
                    0.0,  # metaphysical_state
                    0.5,  # coherence_level
                    0,  # lattice_type
                    0.0,
                    0.0,
                ),  # padding
                (
                    -5.0,
                    -5.0,
                    0.0,  # position
                    0.8,  # influence_strength
                    0.0,
                    1.0,
                    0.0,
                    0.0,  # elemental_composition
                    0.0,
                    0.0,
                    0.0,
                    0.0,  # metaphysical_state
                    0.7,  # coherence_level
                    1,  # lattice_type
                    0.0,
                    0.0,
                ),  # padding
            ],
            dtype=LATTICE_POINT_DTYPE,
        )

        # Initialize buffers once before the main loop
        gpu_engine.update_buffers(
            initial_entities,
            initial_lattices,
            0.0,  # delta_time
            0.0,  # reality_coherence
            (0.0, 0.0, 0.0),  # unified_field_center
            0.0,  # chaos_entropy_level
            1.0,  # time_dilation_factor
            0,  # simulation_tick
        )

        # --- Rendering Shaders for Entities ---
        entity_vertex_shader_source = """
            #version 330
            in vec3 in_position;
            in vec4 in_qualia_state;
            in uint in_entity_id;

            out vec4 v_qualia_state;
            flat out uint v_entity_id;

            uniform mat4 projection;
            uniform mat4 view;

            void main() {
                gl_Position = projection * view * vec4(in_position, 1.0);
                gl_PointSize = 5.0 + in_qualia_state.x * 10.0; // Scale point size by intensity
                v_qualia_state = in_qualia_state;
                v_entity_id = in_entity_id;
            }
        """

        entity_fragment_shader_source = """
            #version 330
            in vec4 v_qualia_state;
            flat in uint v_entity_id;
            out vec4 fragColor;

            void main() {
                vec3 color = vec3(0.0);
                
                // Base color based on QualiaState
                color.r = v_qualia_state.y; // Aggression (red)
                color.g = v_qualia_state.z; // Flow (green)
                color.b = v_qualia_state.w; // Precision (blue)

                // Adjust color based on intensity
                color = mix(color, vec3(1.0), v_qualia_state.x * 0.5); // Mix with white based on intensity

                // Specific effects for player and boss
                if (v_entity_id == 0u) { // Player
                    // Player aura: more vibrant, pulsing
                    color = mix(color, vec3(0.0, 1.0, 1.0), v_qualia_state.x); // Cyan for player, scales with intensity
                    color += vec3(sin(gl_FragCoord.x * 0.1 + gl_FragCoord.y * 0.1) * 0.1 * v_qualia_state.x); // Simple pulse
                } else if (v_entity_id == 1u) { // Boss
                    // Boss disintegration: more red/purple, chaotic, less defined
                    color = mix(color, vec3(1.0, 0.0, 1.0), v_qualia_state.y); // Magenta for boss, scales with aggression
                    color *= (1.0 - v_qualia_state.y * 0.5); // Darken with aggression
                }

                fragColor = vec4(color, 1.0);
            }
        """

        entity_render_prog = ctx.program(
            vertex_shader=entity_vertex_shader_source,
            fragment_shader=entity_fragment_shader_source,
        )

        # Projection and View matrices (simple orthographic for now)
        projection = np.array(
            [
                [2.0 / WIDTH, 0.0, 0.0, 0.0],
                [0.0, 2.0 / HEIGHT, 0.0, 0.0],
                [0.0, 0.0, 1.0, 0.0],
                [0.0, 0.0, 0.0, 1.0],
            ],
            dtype="f4",
        )

        view = np.array(
            [
                [1.0, 0.0, 0.0, 0.0],
                [0.0, 1.0, 0.0, 0.0],
                [0.0, 0.0, 1.0, 0.0],
                [0.0, 0.0, 0.0, 1.0],
            ],
            dtype="f4",
        )

        entity_render_prog["projection"].write(projection.tobytes())
        entity_render_prog["view"].write(view.tobytes())

        # VAO for rendering entities
        # The stride and offsets must match the LIVING_ENTITY_DTYPE and GLSL struct layout
        entity_vao = ctx.vertex_array(
            entity_render_prog,
            [
                (gpu_engine.entity_buffer, "3f", "in_position", 0),  # Offset 0
                (
                    gpu_engine.entity_buffer,
                    "4f",
                    "in_qualia_state",
                    32,
                ),  # Offset 32 bytes
                (gpu_engine.entity_buffer, "1u", "in_entity_id", 60),  # Offset 60 bytes
            ],
            mode=moderngl.POINTS,  # Render as points
        )

        logger.info("Visualizer initialized: Pygame and ModernGL context created.")

        running = True
        last_time = time.time()
        while running:
            current_time = time.time()
            delta_time = current_time - last_time
            last_time = current_time

            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    running = False

            # Read QualiaState from file
            qualia_state = {
                "intensity": 0.0,
                "precision": 0.0,
                "aggression": 0.0,
                "flow": 0.0,
                "chaos": 0.0,
                "recovery": 0.0,
                "transcendence": 0.0,
            }
            if os.path.exists(QUALIA_STATE_FILE):
                try:
                    with open(QUALIA_STATE_FILE, "r") as f:
                        qualia_state = json.load(f)
                except json.JSONDecodeError as e:
                    logger.error(f"Error decoding qualia_state.json: {e}")
                except Exception as e:
                    logger.error(f"Error reading qualia_state.json: {e}")

            # Map QualiaState to GPUPhysicsEngine uniform parameters
            reality_coherence = qualia_state.get("intensity", 0.0)  # Example mapping
            chaos_entropy_level = qualia_state.get("chaos", 0.0)  # Example mapping
            time_dilation_factor = (
                1.0 - qualia_state.get("flow", 0.0) * 0.5
            )  # Example mapping
            unified_field_center = (0.0, 0.0, 0.0)  # Placeholder

            # Update GPUPhysicsEngine buffers and run simulation
            gpu_engine.update_buffers(
                initial_entities,  # Using dummy entities for now
                initial_lattices,  # Using dummy lattices for now
                delta_time,
                reality_coherence,
                unified_field_center,
                chaos_entropy_level,
                time_dilation_factor,
                int(current_time * 1000),  # simulation_tick
            )
            gpu_engine.run_simulation()

            ctx.clear(0.0, 0.0, 0.0)  # Clear with black background
            ctx.enable(
                moderngl.PROGRAM_POINT_SIZE
            )  # Enable point size from vertex shader
            entity_vao.render(
                moderngl.POINTS, instances=gpu_engine.entity_count
            )  # Render entities
            pygame.display.flip()
            time.sleep(0.01)  # Small delay to prevent busy-waiting

    except Exception as e:
        logger.error(f"Critical error in graphics loop: {e}")
    finally:
        pygame.quit()
        if "ctx" in locals() and ctx:
            ctx.release()
        logger.info("Visualizer loop terminated.")


if __name__ == "__main__":
    main_graphics_loop()
