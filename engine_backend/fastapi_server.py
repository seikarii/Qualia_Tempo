import logging
import json

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import HTTPException
from pydantic import BaseModel

from engine_backend import config

# Configuración de logging
logging.basicConfig(
    level=logging.INFO, format="[%(levelname)s] %(asctime)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Archivo para IPC
QUALIA_STATE_FILE = config.QUALIA_STATE_FILE


# --- Modelos Pydantic ---
class QualiaState(BaseModel):
    """Represents the state of Qualia."""

    intensity: float
    precision: float
    aggression: float
    flow: float
    chaos: float
    recovery: float
    transcendence: float


# --- FastAPI App ---
app = FastAPI()

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/update_qualia")
async def update_qualia(state: QualiaState):
    """Receives and processes the Qualia state."""
    try:
        with open(QUALIA_STATE_FILE, "w") as f:
            json.dump(state.model_dump(), f)
        logger.info(f"QualiaState recibido y escrito en archivo: {state.model_dump()}")
        return {"status": "ok", "received_state": state.model_dump()}
    except IOError as e:
        logger.error(f"Error escribiendo QualiaState en archivo: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=config.FASTAPI_PORT, log_level="info")
