import logging
import threading
import time
import queue

import moderngl
import numpy as np
import pygame
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Configuración de logging
logging.basicConfig(
    level=logging.INFO, format="[%(levelname)s] %(asctime)s - %(message)s"
)
logger = logging.getLogger(__name__)


# --- Modelos Pydantic ---
class QualiaState(BaseModel):
    intensity: float
    precision: float
    aggression: float
    flow: float
    chaos: float
    recovery: float
    transcendence: float


# --- Variables Globales para el Motor Gráfico ---
pygame_screen = None
moderngl_ctx = None
moderngl_prog = None  # Programa de shader
moderngl_vao = None  # Vertex Array Object

# Cola para comunicar el QualiaState entre hilos
qualia_state_queue: queue.Queue[QualiaState] = queue.Queue()

# Estado actual del Qualia para el renderizado
current_qualia_state = QualiaState(
    intensity=0, precision=0, aggression=0, flow=0, chaos=0, recovery=0, transcendence=0
)

# --- Configuración de Pygame ---
WIDTH, HEIGHT = 800, 600

# --- Funciones del Motor Gráfico ---


def main_graphics_loop():
    global pygame_screen, moderngl_ctx, moderngl_prog, moderngl_vao, current_qualia_state
    try:
        pygame.init()
        pygame.display.set_mode((WIDTH, HEIGHT), pygame.OPENGL | pygame.DOUBLEBUF)
        pygame.display.set_caption("Qualia Tempo Visualizer")
        pygame_screen = pygame.display.get_surface()

        moderngl_ctx = moderngl.create_context()

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
                vec3 color = vec3(0.0);
                color.r = u_chaos; 
                color.g = u_flow;  
                color.b = u_intensity; 

                fragColor = vec4(color, 1.0);
            }
        """

        moderngl_prog = moderngl_ctx.program(
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

        vbo = moderngl_ctx.buffer(vertices.tobytes())
        moderngl_vao = moderngl_ctx.vertex_array(
            moderngl_prog, [(vbo, "2f", "in_vert")]
        )

        logger.info("Graphics initialized: Pygame and ModernGL context created.")

        # --- FastAPI App (dentro del hilo principal de Pygame) ---
        app = FastAPI()

        # Configurar CORS
        app.add_middleware(
            CORSMiddleware,
            allow_origins=["http://localhost:5173"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

        @app.post("/update_qualia")
        async def update_qualia(state: QualiaState):
            # Poner el QualiaState en la cola para que el hilo de renderizado lo recoja
            if not qualia_state_queue.empty():
                try:
                    qualia_state_queue.get_nowait()  # Vaciar la cola si ya hay un elemento
                except queue.Empty:
                    pass
            qualia_state_queue.put(state)
            logger.info(f"QualiaState recibido y puesto en cola: {state.dict()}")
            return {"status": "ok", "received_state": state.dict()}

        # Función para ejecutar Uvicorn en un hilo separado
        def run_uvicorn():
            import uvicorn

            uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")

        # Iniciar el servidor Uvicorn en un hilo separado
        uvicorn_thread = threading.Thread(target=run_uvicorn)
        uvicorn_thread.daemon = (
            True  # Permite que el hilo se cierre con el programa principal
        )
        uvicorn_thread.start()
        logger.info("FastAPI server started in a separate thread.")

        running = True
        while running:
            # Obtener el último QualiaState de la cola (no bloqueante)
            try:
                current_qualia_state = qualia_state_queue.get_nowait()
                logger.debug(
                    f"QualiaState updated from queue: {current_qualia_state.dict()}"
                )
            except queue.Empty:
                pass  # No hay nuevos estados en la cola

            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    running = False

            if moderngl_prog and moderngl_vao and moderngl_ctx:
                moderngl_ctx.use()  # Activar el contexto de ModernGL

                moderngl_prog["u_intensity"].value = current_qualia_state.intensity
                moderngl_prog["u_chaos"].value = current_qualia_state.chaos
                moderngl_prog["u_flow"].value = current_qualia_state.flow
                logger.debug(
                    f"Uniforms updated: Intensity={current_qualia_state.intensity}, Chaos={current_qualia_state.chaos}, Flow={current_qualia_state.flow}"
                )

                moderngl_ctx.clear(0.0, 0.0, 0.0)
                moderngl_vao.render(moderngl.TRIANGLES)
                pygame.display.flip()
            else:
                logger.warning(
                    "ModernGL program, VAO, or context not initialized. Skipping render."
                )

            time.sleep(0.01)

    except Exception as e:
        logger.error(f"Error during rendering: {e}")
    finally:
        pygame.quit()
        if moderngl_ctx:
            moderngl_ctx.release()
        logger.info("Graphics loop terminated.")


if __name__ == "__main__":
    # Iniciar los gráficos y el bucle de renderizado en el hilo principal
    main_graphics_loop()
