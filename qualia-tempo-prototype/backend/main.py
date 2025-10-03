# QUALIA.CODE v1.0 - Backend Entry Point
# Initializes CompositionRoot and starts FastAPI server

import uvicorn
import logging
import yaml
import sys
from pathlib import Path
from typing import Any

# Ensure the parent directory is in the Python path for proper module resolution
backend_dir = Path(__file__).parent
prototype_dir = backend_dir.parent
if str(prototype_dir) not in sys.path:
    sys.path.insert(0, str(prototype_dir))

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def load_server_config() -> dict[str, Any]:
    """Load server configuration from YAML file."""
    config_path = Path(__file__).parent / "config" / "server.yaml"
    try:
        with open(config_path, "r") as file:
            config: dict[str, Any] = yaml.safe_load(file)
            return config
    except FileNotFoundError:
        logger.warning(f"Configuration file not found at {config_path}, using defaults")
        return {
            "server": {
                "host": "127.0.0.1",
                "port": 8000,
                "reload": True,
                "log_level": "info",
            }
        }


if __name__ == "__main__":
    print("🎵 Starting Qualia Tempo Visual Engine (QUALIA.CODE v1.0)...")
    print("🔥 Backend ready to receive rhythm data from frontend")
    print("🌟 Visual effects generated via EventBus architecture")
    print("")

    config = load_server_config()
    server_config = config.get("server", {})

    host = server_config.get("host", "127.0.0.1")
    port = server_config.get("port", 8000)

    print(f"Backend running on: http://{host}:{port}")
    print(f"API Documentation: http://{host}:{port}/docs")
    print("Architecture: IoC + EventBus + Dependency Injection")
    print("")

    # Use import string format to fix reload warning
    uvicorn.run(
        "backend.api.routes:app",
        host=host,
        port=port,
        reload=server_config.get("reload", True),
        log_level=server_config.get("log_level", "info"),
    )
