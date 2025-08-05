import logging
import json

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Configuración de logging
logging.basicConfig(
    level=logging.INFO, format="[%(levelname)s] %(asctime)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Archivo para IPC
QUALIA_STATE_FILE = "qualia_state.json"


# --- Modelos Pydantic ---
class QualiaState(BaseModel):
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
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/update_qualia")
async def update_qualia(state: QualiaState):
    try:
        with open(QUALIA_STATE_FILE, "w") as f:
            json.dump(state.dict(), f)
        logger.info(f"QualiaState recibido y escrito en archivo: {state.dict()}")
        return {"status": "ok", "received_state": state.dict()}
    except Exception as e:
        logger.error(f"Error escribiendo QualiaState en archivo: {e}")
        return {"status": "error", "message": str(e)}, 500


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
