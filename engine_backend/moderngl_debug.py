import pygame
import moderngl
import numpy as np
import time

import config


def main():
    """Initializes Pygame and ModernGL and runs the main graphics loop."""
    pygame.init()
    pygame.display.set_mode((config.DEBUG_WIDTH, config.DEBUG_HEIGHT), pygame.OPENGL | pygame.DOUBLEBUF)
    pygame.display.set_caption("Qualia Tempo Visualizer Debug")

    ctx = moderngl.create_context()

    # Shader de vértice (simple, para dibujar un cuadrado que cubra la pantalla)
    vertex_shader_source = """
        #version 330
        in vec2 in_vert;
        void main() {
            gl_Position = vec4(in_vert, 0.0, 1.0);
        }
    """

    # Shader de fragmento (cambia el color basado en uniformes)
    fragment_shader_source = """
        #version 330
        out vec4 fragColor;

        uniform float u_intensity;
        uniform float u_chaos;
        uniform float u_flow;

        void main() {
            // Simular el efecto del QualiaState en el color del fondo
            vec3 color = vec3(0.0);
            color.r = u_chaos; // El caos afecta al rojo
            color.g = u_flow;  // El flow afecta al verde
            color.b = u_intensity; // La intensidad afecta al azul

            fragColor = vec4(color, 1.0);
        }
    """

    prog = ctx.program(
        vertex_shader=vertex_shader_source,
        fragment_shader=fragment_shader_source,
    )

    # Un cuadrado que cubre toda la pantalla (dos triángulos)
    vertices = np.array(
        [
            -1.0,
            -1.0,
            1.0,
            -1.0,
            -1.0,
            1.0,
            -1.0,
            1.0,
            1.0,
            -1.0,
            1.0,
            1.0,
        ],
        dtype="f4",
    )

    vbo = ctx.buffer(vertices.tobytes())
    vao = ctx.vertex_array(prog, [(vbo, "2f", "in_vert")])

    running = True
    start_time = time.time()
    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

        # Simular QualiaState dinámico
        elapsed_time = time.time() - start_time
        simulated_intensity = (np.sin(elapsed_time * config.DEBUG_FLOAT_VALUE_0_5) + config.DEBUG_FLOAT_VALUE_1_0) / 2.0  # 0 a 1
        simulated_chaos = (np.sin(elapsed_time * config.DEBUG_FLOAT_VALUE_1_0) + config.DEBUG_FLOAT_VALUE_1_0) / 2.0  # 0 a 1
        simulated_flow = (np.cos(elapsed_time * config.DEBUG_FLOAT_VALUE_0_7) + config.DEBUG_FLOAT_VALUE_1_0) / 2.0  # 0 a 1

        # Pasar los valores simulados como uniformes al shader
        prog["u_intensity"].value = simulated_intensity
        prog["u_chaos"].value = simulated_chaos
        prog["u_flow"].value = simulated_flow

        ctx.clear(0.0, 0.0, 0.0)  # Fondo negro antes de renderizar el cuadrado
        vao.render(moderngl.TRIANGLES)
        pygame.display.flip()

    pygame.quit()
    ctx.release()


if __name__ == "__main__":
    main()
