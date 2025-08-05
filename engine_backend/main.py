import subprocess
import time
import os
import logging

logging.basicConfig(
    level=logging.INFO, format="[%(levelname)s] %(asctime)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Rutas a los scripts
VISUALIZER_SCRIPT = os.path.join(os.path.dirname(__file__), "visualizer_process.py")
FASTAPI_SCRIPT = os.path.join(os.path.dirname(__file__), "fastapi_server.py")

# Ruta al entorno virtual
PYTHON_VENV = os.path.join(os.path.dirname(__file__), "venv", "bin", "python")

# Archivos de log para los subprocesos
FASTAPI_LOG = "fastapi.log"
VISUALIZER_PROCESS_LOG = "visualizer_process.log"  # Log específico para el visualizador


def start_backend():
    logger.info("Starting Qualia Tempo Backend processes...")

    # Asegurar que DISPLAY se pase al subproceso para aplicaciones gráficas
    env = os.environ.copy()
    if "DISPLAY" not in env:
        logger.warning(
            "DISPLAY environment variable not found. Visualizer might not work."
        )
        # Intentar establecer un DISPLAY por defecto si no se encuentra (común para sesiones SSH)
        env["DISPLAY"] = ":0"

    visualizer_process = None
    try:
        # Lanzar visualizador, su salida se redirige a su propio archivo de log interno
        # No redirigimos stdout/stderr aquí, el script visualizer_process.py lo hace internamente
        visualizer_process = subprocess.Popen(
            [PYTHON_VENV, VISUALIZER_SCRIPT], env=env  # Pasar el entorno con DISPLAY
        )
        logger.info(f"Visualizer process started with PID: {visualizer_process.pid}")
    except Exception as e:
        logger.error(f"Failed to start visualizer process: {e}")
        return

    time.sleep(2)  # Dar tiempo al visualizador para que se inicialice

    fastapi_process = None
    try:
        # Lanzar el servidor FastAPI, su salida se redirige a un archivo de log
        with open(FASTAPI_LOG, "w") as f_fastapi_log:
            fastapi_process = subprocess.Popen(
                [PYTHON_VENV, FASTAPI_SCRIPT],
                stdout=f_fastapi_log,
                stderr=f_fastapi_log,
                text=True,
            )
        logger.info(
            f"FastAPI server process started with PID: {fastapi_process.pid}. Output redirected to {FASTAPI_LOG}"
        )
    except Exception as e:
        logger.error(f"Failed to start FastAPI server process: {e}")
        # Si FastAPI falla, intentar terminar el visualizador
        if visualizer_process:
            visualizer_process.terminate()
            visualizer_process.wait()
        return

    logger.info("Backend processes started. Press Ctrl+C to stop.")

    try:
        # Mantener el script principal corriendo para que los subprocesos no terminen
        while True:
            # Monitorear si los subprocesos han terminado
            if visualizer_process.poll() is not None:
                logger.error(
                    f"Visualizer process terminated unexpectedly. Exit code: {visualizer_process.returncode}"
                )
                # Leer el log del visualizador para ver el error
                if os.path.exists(VISUALIZER_PROCESS_LOG):
                    with open(VISUALIZER_PROCESS_LOG, "r") as f:
                        logger.error(f"Visualizer log content:\n{f.read()}")
                break
            if fastapi_process.poll() is not None:
                logger.error(
                    f"FastAPI process terminated unexpectedly. Exit code: {fastapi_process.returncode}"
                )
                # Leer el log de FastAPI para ver el error
                if os.path.exists(FASTAPI_LOG):
                    with open(FASTAPI_LOG, "r") as f:
                        logger.error(f"FastAPI log content:\n{f.read()}")
                break
            time.sleep(1)
    except KeyboardInterrupt:
        logger.info("Stopping backend processes...")
    finally:
        # Terminar los subprocesos al salir
        if visualizer_process:
            visualizer_process.terminate()
            visualizer_process.wait()
            logger.info("Visualizer process terminated.")
        if fastapi_process:
            fastapi_process.terminate()
            fastapi_process.wait()
            logger.info("FastAPI process terminated.")
        logger.info("All backend processes stopped.")


if __name__ == "__main__":
    start_backend()
