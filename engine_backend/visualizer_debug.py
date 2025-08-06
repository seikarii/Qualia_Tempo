import logging
import os
import time

import moderngl
import numpy as np
import pygame

import config

# Asegurarse de que el path a GPUPhysicsEngine sea correcto
# Asumiendo que este script está en engine_backend/
# y gpu_physics_engine.py está en engine_backend/reality_engine/
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "reality_engine"))
from reality_engine.gpu_physics_engine import GPUPhysicsEngine

# Configuración de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def main():
    """Initializes Pygame and ModernGL and runs the main graphics loop."""
    pygame.init()
    pygame.display.set_mode((config.DEBUG_WIDTH, config.DEBUG_HEIGHT), pygame.OPENGL | pygame.DOUBLEBUF)
    pygame.display.set_caption("Qualia Tempo Visualizer Debug")
    screen = pygame.display.get_surface()

    ctx = moderngl.create_context()
    gpu_engine = GPUPhysicsEngine(ctx=ctx)
    logger.info("Graphics initialized: Pygame and ModernGL context created.")

    # --- Datos de Prueba para el Motor de Físicas ---
    # Simular 3 partículas con posiciones y un valor extra (para color/propiedad)
    entities_data = np.array(
        [
            [0.0, 0.0, 0.0, 0.5],  # x, y, z, w (w para un valor de qualia)
            [0.1, 0.1, 0.0, 0.8],
            [-0.1, -0.1, 0.0, 0.2],
        ],
        dtype=np.float32,
    )

    # Añadir las entidades al motor de físicas
    # Usamos add_entity para inicializar el buffer de entidades
    for entity in entities_data:
        gpu_engine.add_entity(entity)

    running = True
    last_time = time.time()
    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

        current_time = time.time()
        delta_time = current_time - last_time
        last_time = current_time

        # --- Actualizar y Computar el Motor de Físicas ---
        # Mapear valores de QualiaState simulados a los parámetros del motor
        simulated_intensity = (time.time() % config.DEBUG_INT_VALUE_5) / config.DEBUG_INT_VALUE_5  # Simular cambio de intensity
        simulated_chaos = (time.time() % config.DEBUG_INT_VALUE_3) / config.DEBUG_INT_VALUE_3  # Simular cambio de chaos

        # Asegurarse de pasar entities_data como un array 2D para update_buffers
        gpu_engine.update_buffers(
            gpu_engine.entities_data,  # Usamos los datos que ya están en el motor
            np.array([], dtype=np.float32),  # No usamos lattices
            delta_time,
            simulated_intensity,  # reality_coherence
            (0.0, 0.0, 0.0),  # unified_field_center
            simulated_chaos,  # chaos_entropy_level
            1.0,  # time_dilation_factor
            int(time.time() * config.DEBUG_INT_VALUE_100),  # simulation_tick
        )
        gpu_engine.compute()

        # --- Leer datos actualizados de la GPU ---
        updated_particle_data = gpu_engine.get_updated_entities_data()

        # --- Renderizar con Pygame ---
        screen.fill((0, 0, 0))  # Fondo negro

        # Dibujar partículas (simplificado: círculos)
        # Asumiendo que cada partícula tiene 4 floats (x, y, z, w)
        for i in range(0, len(updated_particle_data), 4):
            # Normalizar las coordenadas de -1 a 1 a las coordenadas de pantalla
            x_norm = updated_particle_data[i]
            y_norm = updated_particle_data[i + 1]

            x_screen = int((x_norm + 1) / 2 * config.DEBUG_WIDTH)
            y_screen = int((y_norm + 1) / 2 * config.DEBUG_HEIGHT)

            color_val = updated_particle_data[
                i + 3
            ]  # Usar el 4to componente para el color
            # Mapear color_val (0-1) a un color RGB
            color = (
                int(color_val * 255),
                int((1 - color_val) * 255),
                0,
            )  # Ejemplo: de rojo a verde

            pygame.draw.circle(screen, color, (x_screen, y_screen), config.DEBUG_INT_VALUE_10)

        pygame.display.flip()

    pygame.quit()
    if ctx:
        ctx.release()
    logger.info("Visualizer debug loop terminated.")


if __name__ == "__main__":
    main()
