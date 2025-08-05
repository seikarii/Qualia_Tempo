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
        ("qualia_state_intensity", "f4"),
        ("qualia_state_precision", "f4"),
        ("qualia_state_aggression", "f4"),
        ("qualia_state_flow", "f4"),
        ("qualia_state_chaos", "f4"),
        ("qualia_state_recovery", "f4"),
        ("qualia_state_transcendence", "f4"),
        ("lifecycle_stage", "f4"),
        ("empathetic_resonance", "f4"),
        ("chaos_influence", "f4"),
        ("entity_id", "u4"),
        ("is_active", "u4"),
        ("padding", "f4"), # Padding to make total size 96 bytes (24 floats * 4 bytes/float)
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

# Particle struct
PARTICLE_DTYPE = np.dtype(
    [
        ("position_x", "f4"),
        ("position_y", "f4"),
        ("position_z", "f4"),
        ("velocity_x", "f4"),
        ("velocity_y", "f4"),
        ("velocity_z", "f4"),
        ("color_r", "f4"),
        ("color_g", "f4"),
        ("color_b", "f4"),
        ("lifetime", "f4"),  # Current lifetime (decreases)
        ("max_lifetime", "f4"),  # Initial lifetime
        ("size", "f4"),
        ("type", "u4"),  # e.g., 0=aura, 1=explosion, 2=trail
        ("active", "u4"),  # 1 if active, 0 if inactive
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
                    0.0,  # qualia_state_intensity
                    0.0,  # qualia_state_precision
                    0.0,  # qualia_state_aggression
                    0.0,  # qualia_state_flow
                    0.0,  # qualia_state_chaos
                    0.0,  # qualia_state_recovery
                    0.0,  # qualia_state_transcendence
                    0.0,  # lifecycle_stage
                    0.0,  # empathetic_resonance
                    0.0,  # chaos_influence
                    0,  # entity_id
                    1,  # is_active
                    0.0,  # padding
                )
            ],
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
                    0.0,  # qualia_state_intensity
                    0.0,  # qualia_state_precision
                    0.0,  # qualia_state_aggression
                    0.0,  # qualia_state_flow
                    0.0,  # qualia_state_chaos
                    0.0,  # qualia_state_recovery
                    0.0,  # qualia_state_transcendence
                    0.0,  # lifecycle_stage
                    0.0,  # empathetic_resonance
                    0.0,  # chaos_influence
                    1,  # entity_id
                    1,  # is_active
                    0.0,  # padding
                )
            ],
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

        # Dummy particle data
        initial_particles = np.array(
            [
                (
                    0.0, 0.0, 0.0,  # position
                    0.1, 0.1, 0.1,  # velocity
                    1.0, 0.0, 0.0,  # color (red)
                    1.0,  # lifetime
                    1.0,  # max_lifetime
                    5.0,  # size
                    0,  # type (aura)
                    1,  # active
                    0.0, 0.0, # padding
                )
            ],
            dtype=PARTICLE_DTYPE,
        )

        # Initialize buffers once before the main loop
        gpu_engine.update_buffers(
            initial_entities,
            initial_lattices,
            initial_particles,
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
            in float in_qualia_state_intensity;
            in float in_qualia_state_precision;
            in float in_qualia_state_aggression;
            in float in_qualia_state_flow;
            in float in_qualia_state_chaos;
            in float in_qualia_state_recovery;
            in float in_qualia_state_transcendence;
            in uint in_entity_id;

            out float v_qualia_state_intensity;
            out float v_qualia_state_precision;
            out float v_qualia_state_aggression;
            out float v_qualia_state_flow;
            out float v_qualia_state_chaos;
            out float v_qualia_state_recovery;
            out float v_qualia_state_transcendence;
            flat out uint v_entity_id;

            uniform mat4 projection;
            uniform mat4 view;

            void main() {
                gl_Position = projection * view * vec4(in_position, 1.0);
                gl_PointSize = 5.0 + in_qualia_state_intensity * 10.0; // Scale point size by intensity
                v_qualia_state_intensity = in_qualia_state_intensity;
                v_qualia_state_precision = in_qualia_state_precision;
                v_qualia_state_aggression = in_qualia_state_aggression;
                v_qualia_state_flow = in_qualia_state_flow;
                v_qualia_state_chaos = in_qualia_state_chaos;
                v_qualia_state_recovery = in_qualia_state_recovery;
                v_qualia_state_transcendence = in_qualia_state_transcendence;
                v_entity_id = in_entity_id;
            }
        """

        entity_fragment_shader_source = """
            #version 330
            in float v_qualia_state_intensity;
            in float v_qualia_state_precision;
            in float v_qualia_state_aggression;
            in float v_qualia_state_flow;
            in float v_qualia_state_chaos;
            in float v_qualia_state_recovery;
            in float v_qualia_state_transcendence;
            flat in uint v_entity_id;
            out vec4 fragColor;

            void main() {
                vec3 color = vec3(0.0);
                
                // Base color based on QualiaState components
                color.r = v_qualia_state_aggression; // Aggression (red)
                color.g = v_qualia_state_flow;       // Flow (green)
                color.b = v_qualia_state_precision;  // Precision (blue)

                // Adjust color based on intensity
                color = mix(color, vec3(1.0), v_qualia_state_intensity * 0.5); // Mix with white based on intensity

                // Specific effects for player and boss
                if (v_entity_id == 0u) { // Player
                    // Player aura: more vibrant, pulsing, influenced by transcendence
                    color = mix(color, vec3(0.0, 1.0, 1.0), v_qualia_state_intensity); // Cyan for player, scales with intensity
                    color += vec3(sin(gl_FragCoord.x * 0.1 + gl_FragCoord.y * 0.1 + v_qualia_state_transcendence * 10.0) * 0.1 * v_qualia_state_intensity); // Simple pulse with transcendence
                } else if (v_entity_id == 1u) { // Boss
                    // Boss disintegration: more red/purple, chaotic, less defined, influenced by chaos
                    color = mix(color, vec3(1.0, 0.0, 1.0), v_qualia_state_aggression); // Magenta for boss, scales with aggression
                    color *= (1.0 - v_qualia_state_chaos * 0.5); // Darken with chaos
                }

                fragColor = vec4(color, 1.0);
            }
        """

        entity_render_prog = ctx.program(
            vertex_shader=entity_vertex_shader_source,
            fragment_shader=entity_fragment_shader_source,
        )

        # --- Rendering Shaders for Particles ---
        particle_vertex_shader_source = """
            #version 330
            in vec3 in_position;
            in vec3 in_color;
            in float in_size;
            in float in_lifetime;
            in float in_max_lifetime;

            out vec3 v_color;
            out float v_alpha;

            uniform mat4 projection;
            uniform mat4 view;

            void main() {
                gl_Position = projection * view * vec4(in_position, 1.0);
                gl_PointSize = in_size; // Use particle size
                v_color = in_color;
                v_alpha = in_lifetime / in_max_lifetime; // Fade out over lifetime
            }
        """

        particle_fragment_shader_source = """
            #version 330
            in vec3 v_color;
            in float v_alpha;
            out vec4 fragColor;

            void main() {
                fragColor = vec4(v_color, v_alpha);
            }
        """

        particle_render_prog = ctx.program(
            vertex_shader=particle_vertex_shader_source,
            fragment_shader=particle_fragment_shader_source,
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
        particle_render_prog["projection"].write(projection.tobytes())
        particle_render_prog["view"].write(view.tobytes())

        # VAO for rendering entities
        # The stride and offsets must match the LIVING_ENTITY_DTYPE and GLSL struct layout
        entity_vao = ctx.vertex_array(
            entity_render_prog,
            [
                (gpu_engine.entity_buffer, "3f", "in_position", 0),  # Offset 0 (position_x, y, z)
                (gpu_engine.entity_buffer, "1f", "in_qualia_state_intensity", 32), # Offset 32 (consciousness_level is at 12, then 4 floats for velocity, 4 for ontological_drift, then 7 floats for qualia_state)
                (gpu_engine.entity_buffer, "1f", "in_qualia_state_precision", 36),
                (gpu_engine.entity_buffer, "1f", "in_qualia_state_aggression", 40),
                (gpu_engine.entity_buffer, "1f", "in_qualia_state_flow", 44),
                (gpu_engine.entity_buffer, "1f", "in_qualia_state_chaos", 48),
                (gpu_engine.entity_buffer, "1f", "in_qualia_state_recovery", 52),
                (gpu_engine.entity_buffer, "1f", "in_qualia_state_transcendence", 56),
                (gpu_engine.entity_buffer, "1u", "in_entity_id", 60),  # Offset 60 (entity_id)
            ],
            mode=moderngl.POINTS,  # Render as points
        )

        # VAO for rendering particles
        particle_vao = ctx.vertex_array(
            particle_render_prog,
            [
                (gpu_engine.particle_buffer, "3f", "in_position", 0),  # position_x, y, z
                (gpu_engine.particle_buffer, "3f", "in_color", 24),  # color_r, g, b (offset 6*4 = 24)
                (gpu_engine.particle_buffer, "1f", "in_size", 40),  # size (offset 10*4 = 40)
                (gpu_engine.particle_buffer, "1f", "in_lifetime", 36),  # lifetime (offset 9*4 = 36)
                (gpu_engine.particle_buffer, "1f", "in_max_lifetime", 40),  # max_lifetime (offset 10*4 = 40)
            ],
            mode=moderngl.POINTS,
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
            particle_multiplier = qualia_state.get("transcendence", 0.0) * 5.0 + 1.0 # Example: more particles with transcendence

            # Update GPUPhysicsEngine buffers and run simulation
            # Update dummy entities with current qualia state
            player_entity[0]["qualia_state_intensity"] = qualia_state.get("intensity", 0.0)
            player_entity[0]["qualia_state_precision"] = qualia_state.get("precision", 0.0)
            player_entity[0]["qualia_state_aggression"] = qualia_state.get("aggression", 0.0)
            player_entity[0]["qualia_state_flow"] = qualia_state.get("flow", 0.0)
            player_entity[0]["qualia_state_chaos"] = qualia_state.get("chaos", 0.0)
            player_entity[0]["qualia_state_recovery"] = qualia_state.get("recovery", 0.0)
            player_entity[0]["qualia_state_transcendence"] = qualia_state.get("transcendence", 0.0)

            boss_entity[0]["qualia_state_intensity"] = qualia_state.get("intensity", 0.0)
            boss_entity[0]["qualia_state_precision"] = qualia_state.get("precision", 0.0)
            boss_entity[0]["qualia_state_aggression"] = qualia_state.get("aggression", 0.0)
            boss_entity[0]["qualia_state_flow"] = qualia_state.get("flow", 0.0)
            boss_entity[0]["qualia_state_chaos"] = qualia_state.get("chaos", 0.0)
            boss_entity[0]["qualia_state_recovery"] = qualia_state.get("recovery", 0.0)
            boss_entity[0]["qualia_state_transcendence"] = qualia_state.get("transcendence", 0.0)

            updated_entities = np.concatenate([player_entity, boss_entity])

            # Dummy particle generation (example: generate particles based on qualia intensity)
            num_new_particles = int(qualia_state.get("intensity", 0.0) * 50 * particle_multiplier) # Max 50 new particles per frame
            new_particles = []
            for _ in range(num_new_particles):
                # Particle color based on qualia state
                particle_color_r = qualia_state.get("aggression", 0.0)
                particle_color_g = qualia_state.get("flow", 0.0)
                particle_color_b = qualia_state.get("precision", 0.0)

                # Particle velocity influenced by chaos
                particle_vx = np.random.uniform(-0.5, 0.5) * (1 + qualia_state.get("chaos", 0.0))
                particle_vy = np.random.uniform(-0.5, 0.5) * (1 + qualia_state.get("chaos", 0.0))
                particle_vz = np.random.uniform(-0.5, 0.5) * (1 + qualia_state.get("chaos", 0.0))

                new_particles.append((
                    np.random.uniform(-5, 5), np.random.uniform(-5, 5), 0.0,  # position
                    particle_vx, particle_vy, particle_vz,  # velocity
                    particle_color_r, particle_color_g, particle_color_b,  # color
                    1.0,  # lifetime
                    1.0,  # max_lifetime
                    np.random.uniform(1.0, 10.0),  # size
                    0,  # type (aura)
                    1,  # active
                    0.0, 0.0,  # padding
                ))
            
            current_particles = gpu_engine.particles_data if gpu_engine.particles_data is not None else np.array([], dtype=PARTICLE_DTYPE)
            if len(new_particles) > 0:
                updated_particles = np.concatenate([current_particles, np.array(new_particles, dtype=PARTICLE_DTYPE)])
            else:
                updated_particles = current_particles

            # Simple particle lifecycle: update lifetime and remove inactive particles
            for i in range(len(updated_particles)):
                if updated_particles[i]["active"] == 1:
                    updated_particles[i]["lifetime"] -= delta_time
                    if updated_particles[i]["lifetime"] <= 0.0:
                        updated_particles[i]["active"] = 0
            
            updated_particles = updated_particles[updated_particles["active"] == 1]

            gpu_engine.update_buffers(
                updated_entities,  # Using updated entities
                initial_lattices,  # Using dummy lattices for now
                updated_particles, # Using updated particles
                delta_time,
                reality_coherence,
                unified_field_center,
                chaos_entropy_level,
                time_dilation_factor,
                int(current_time * 1000),  # simulation_tick
                particle_multiplier,
            )
            gpu_engine.run_simulation()

            ctx.clear(0.0, 0.0, 0.0)  # Clear with black background
            ctx.enable(
                moderngl.PROGRAM_POINT_SIZE
            )  # Enable point size from vertex shader
            entity_vao.render(
                moderngl.POINTS, instances=gpu_engine.entity_count
            )  # Render entities

            # Render particles
            if gpu_engine.particle_count > 0:
                particle_vao.render(moderngl.POINTS, instances=gpu_engine.particle_count)

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
