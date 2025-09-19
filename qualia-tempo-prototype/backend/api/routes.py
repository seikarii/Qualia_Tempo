# QUALIA.CODE v1.0 - Backend API Routes
# FastAPI endpoints with dependency injection and event-driven architecture

from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from .models import QualiaState, QualiaUpdateResponse
from ..CompositionRoot import get_composition_root, CompositionRoot
import logging
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Qualia Tempo Engine", version="1.0.0")

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
    ],  # React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# QUALIA.CODE Dependency Injection
async def get_services() -> CompositionRoot:
    """
    Dependency injection for CompositionRoot.
    Returns initialized CompositionRoot.
    """
    return get_composition_root()


@app.on_event("startup")
async def startup_event():
    """Initialize all services on startup for eager initialization."""
    try:
        composition_root = get_composition_root()
        await composition_root.initialize()
        logger.info("✅ QUALIA.CODE services initialized successfully on startup")
    except Exception as e:
        logger.error(f"🚨 Failed to initialize services on startup: {e}")
        raise


@app.get("/")
async def root():
    return {
        "message": "Qualia Tempo Engine - QUALIA.CODE v1.0 Ready",
        "architecture": "EventBus + IoC",
    }


@app.get("/health")
async def health_check(services: CompositionRoot = Depends(get_services)):
    """Health check with service validation."""
    try:
        event_bus = services.get_event_bus()
        stats = event_bus.get_stats()
        subscriptions = event_bus.get_subscriptions()

        return {
            "status": "healthy",
            "engine": "ready",
            "architecture": "QUALIA.CODE v1.0",
            "event_bus_stats": stats,
            "subscriptions": subscriptions,
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {"status": "degraded", "error": str(e)}


@app.post("/update_qualia", response_model=QualiaUpdateResponse)
async def update_qualia_visuals(
    state: QualiaState, services: CompositionRoot = Depends(get_services)
):
    """
    QUALIA.CODE compliant endpoint for QualiaState updates.
    Uses dependency injection and EventBus for decoupled communication.
    """
    try:
        logger.info("🎵 Received QualiaState update")

        # Get QualiaProcessor through dependency injection
        qualia_processor = services.get_qualia_processor()

        # Process QualiaState through EventBus architecture
        state_dict = state.dict()
        await qualia_processor.process_qualia_state(state_dict)

        # Log state for debugging (enhanced)
        _log_qualia_state_detailed(state_dict)

        return QualiaUpdateResponse(
            status="success", message="QualiaState processed via EventBus architecture"
        )

    except Exception as e:
        logger.error(f"🚨 Error processing QualiaState: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.websocket("/ws/video_stream")
async def websocket_video_stream(websocket: WebSocket, services: CompositionRoot = Depends(get_services)):
    """
    QUALIA.CODE WebSocket endpoint for video streaming.
    Streams rendered frames from RenderingService to frontend clients.
    """
    streaming_service = services.get_streaming_web_service()
    
    try:
        # Connect client
        await streaming_service.connect_client(websocket)
        
        logger.info("🎥 Client connected to video stream")
        
        # Handle incoming messages
        while True:
            try:
                # Receive message from client
                message_text = await websocket.receive_text()
                message = json.loads(message_text)
                
                # Handle client message
                await streaming_service.handle_client_message(websocket, message)
                
            except WebSocketDisconnect:
                break
                
            except json.JSONDecodeError as e:
                logger.error(f"🚨 Invalid JSON from client: {e}")
                await websocket.send_json({"type": "error", "message": "Invalid JSON format"})
                
            except Exception as e:
                logger.error(f"🚨 Error handling WebSocket message: {e}")
                break
                
    except Exception as e:
        logger.error(f"🚨 WebSocket connection error: {e}")
        
    finally:
        # Ensure client is properly disconnected
        await streaming_service.disconnect_client(websocket)
        logger.info("🔌 Client disconnected from video stream")


@app.get("/stream_status")
async def get_stream_status(services: CompositionRoot = Depends(get_services)):
    """Get current streaming service status."""
    try:
        streaming_service = services.get_streaming_web_service()
        rendering_service = services.get_rendering_service()
        
        return {
            "streaming": streaming_service.get_status(),
            "rendering": rendering_service.get_status(),
        }
    except Exception as e:
        logger.error(f"Stream status check failed: {e}")
        return {"status": "error", "error": str(e)}


def _log_qualia_state_detailed(state_dict: dict) -> None:
    """Enhanced logging for QualiaState with visual representation."""
    print("")
    print("=== QUALIA STATE UPDATE (QUALIA.CODE) ===")
    print(f"🔥 Intensity: {state_dict.get('intensity', 0):.3f}")
    print(f"🎯 Precision: {state_dict.get('precision', 0):.3f}")
    print(f"⚡ Aggression: {state_dict.get('aggression', 0):.3f}")
    print(f"🌊 Flow: {state_dict.get('flow', 0):.3f}")
    print(f"🌪️ Chaos: {state_dict.get('chaos', 0):.3f}")
    print(f"💊 Recovery: {state_dict.get('recovery', 0):.3f}")
    print(f"🌟 Transcendence: {state_dict.get('transcendence', 0):.3f}")
    print("==========================================")
    print("")


@app.post("/reset_engine")
async def reset_visual_engine(services: CompositionRoot = Depends(get_services)):
    """Reset the visual engine to initial state using dependency injection."""
    try:
        # Reset through EventBus only - no direct calls
        event_bus = services.get_event_bus()
        await event_bus.publish(event_name="EngineReset", data={}, source="API")

        logger.info("✅ Visual engine reset event published via EventBus")
        return QualiaUpdateResponse(
            status="success",
            message="Visual engine reset initiated via EventBus architecture",
        )
    except Exception as e:
        logger.error(f"🚨 Error resetting engine: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to reset engine: {str(e)}")


@app.get("/stats")
async def get_engine_stats(services: CompositionRoot = Depends(get_services)):
    """Get engine statistics and current state."""
    try:
        event_bus = services.get_event_bus()
        particle_system = services.get_particle_system()
        qualia_processor = services.get_qualia_processor()

        return {
            "event_bus": event_bus.get_stats(),
            "subscriptions": event_bus.get_subscriptions(),
            "particle_parameters": particle_system.get_current_parameters(),
            "current_qualia_state": qualia_processor.get_current_state(),
            "architecture": "QUALIA.CODE v1.0",
        }
    except Exception as e:
        logger.error(f"🚨 Error getting stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


def _log_qualia_state_detailed(state_dict: dict) -> None:
    """Enhanced logging for QualiaState updates."""
    print("=== QUALIA STATE UPDATE (QUALIA.CODE) ===")
    print(f"🔥 Intensity: {state_dict.get('intensity', 0):.3f}")
    print(f"🎯 Precision: {state_dict.get('precision', 0):.3f}")
    print(f"⚡ Aggression: {state_dict.get('aggression', 0):.3f}")
    print(f"🌊 Flow: {state_dict.get('flow', 0):.3f}")
    print(f"🌪️ Chaos: {state_dict.get('chaos', 0):.3f}")
    print(f"💊 Recovery: {state_dict.get('recovery', 0):.3f}")
    print(f"🌟 Transcendence: {state_dict.get('transcendence', 0):.3f}")
    print("==========================================")
