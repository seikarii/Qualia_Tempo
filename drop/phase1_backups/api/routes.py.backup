# QUALIA.CODE v1.0 - Backend API Routes
# FastAPI endpoints with dependency injection and event-driven architecture

from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from .models import QualiaState, QualiaUpdateResponse
from ..CompositionRoot import get_composition_root, CompositionRoot
from typing import Dict, Any
import logging
import json
import numpy as np

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Qualia Tempo Engine", version="1.0.0")

# Enable CORS for frontend communication - QUALIA.CODE v1.1 Enhanced
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],  # React dev servers with explicit 127.0.0.1
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# QUALIA.CODE Dependency Injection
async def get_services() -> CompositionRoot:
    """
    Dependency injection for CompositionRoot.
    Returns initialized CompositionRoot.
    """
    return get_composition_root()


@app.on_event("startup")
async def startup_event() -> None:
    """Initialize all services on startup for eager initialization."""
    try:
        composition_root = get_composition_root()
        await composition_root.initialize()
        logger.info("✅ QUALIA.CODE services initialized successfully on startup")
    except Exception as e:
        logger.error(f"🚨 Failed to initialize services on startup: {e}")
        raise


@app.on_event("shutdown")
async def shutdown_event() -> None:
    """
    QUALIA.CODE compliant shutdown handler.
    Ensures all background services are gracefully terminated.
    """
    logger.info("🚨 Shutting down QUALIA.CODE services...")
    try:
        composition_root = get_composition_root()
        await composition_root.shutdown()
        logger.info("✅ All services terminated gracefully.")
    except Exception as e:
        logger.error(f"🔥 Error during service shutdown: {e}")


@app.get("/")
async def root() -> Dict[str, Any]:
    return {
        "message": "Qualia Tempo Engine - QUALIA.CODE v1.0 Ready",
        "architecture": "EventBus + IoC",
    }


@app.get("/health")
async def health_check(services: CompositionRoot = Depends(get_services)) -> Dict[str, Any]:
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


@app.get("/diag/particle_buffer")
async def diagnose_particle_buffer(services: CompositionRoot = Depends(get_services)) -> Dict[str, Any]:
    """
    Endpoint de diagnóstico para inspeccionar el buffer de partículas.
    No interfiere con los servicios de producción.
    """
    try:
        # 1. Obtener la instancia del motor de partículas desde el CompositionRoot.
        particle_engine = services.get_particle_system()

        # 2. Obtener el array de datos crudos.
        particle_data = particle_engine.get_particle_data_as_numpy_array()

        # 3. Extraer metadatos para el diagnóstico.
        shape = particle_data.shape
        dtype = str(particle_data.dtype)
        byte_size = particle_data.nbytes
        
        # 4. Devolver los metadatos como respuesta JSON.
        return {
            "source": "QualiaParticleEngine",
            "method": "get_particle_data_as_numpy_array",
            "shape": shape,
            "dtype": dtype,
            "byte_size": byte_size,
            "expected_byte_size": 10000 * 21 * 4
        }

    except Exception as e:
        logger.error(f"🚨 Error en el endpoint de diagnóstico: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/particles/optimized")
async def get_optimized_particles(services: CompositionRoot = Depends(get_services)) -> Response:
    """
    GOLD.CODE: Stream optimized particle data in compact binary format.
    Returns 26% less data than original format (62 bytes vs 84 bytes per particle).
    
    Binary format uses structured NumPy array with:
    - float32 for vectors (position, velocity, acceleration, force_accumulator)
    - uint8 for colors (RGBA 0-255)
    - float16 for scalars (lifetime, size, resonance, mass, charge)
    
    Metadata is provided in response headers for client-side decoding.
    """
    try:
        particle_engine = services.get_particle_system()
        
        # Get compact binary data (GOLD.CODE format)
        particle_bytes = particle_engine.get_optimized_particle_data()
        metadata = particle_engine.get_particle_metadata()
        
        logger.info(f"📦 Streaming {len(particle_bytes)} bytes of optimized particle data (GOLD.CODE)")
        
        # Return binary response with metadata in headers
        return Response(
            content=particle_bytes,
            media_type="application/octet-stream",
            headers={
                "X-Particle-Format": "GOLD.CODE-1.0",
                "X-Particle-Count": str(metadata["count"]),
                "X-Bytes-Per-Particle": str(metadata["bytes_per_particle"]),
                "X-Memory-Savings": metadata["memory_savings"],
                "X-Particle-Metadata": json.dumps(metadata),
                "Access-Control-Expose-Headers": "X-Particle-Format,X-Particle-Count,X-Bytes-Per-Particle,X-Memory-Savings,X-Particle-Metadata"
            }
        )
    except Exception as e:
        logger.error(f"🚨 Failed to stream optimized particles: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/particle_metadata")
async def get_particle_metadata(
    services: CompositionRoot = Depends(get_services),
) -> dict[str, Any]:
    """
    GOLD.CODE: Get particle format metadata without downloading binary data.
    Useful for clients to understand the data structure before fetching.
    """
    try:
        particle_engine = services.get_particle_system()
        metadata: dict[str, Any] = particle_engine.get_particle_metadata()
        
        logger.info("📋 Returning particle metadata (GOLD.CODE)")
        return metadata
        
    except Exception as e:
        logger.error(f"🚨 Failed to get particle metadata: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/update_qualia", response_model=QualiaUpdateResponse)
async def update_qualia_visuals(
    state: QualiaState, services: CompositionRoot = Depends(get_services)
) -> QualiaUpdateResponse:
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


@app.websocket("/ws/state_stream")
async def websocket_state_stream(
    websocket: WebSocket, services: CompositionRoot = Depends(get_services)
) -> None:
    """
    QUALIA.CODE WebSocket endpoint for state streaming.
    Streams qualia state data from StateStreamingService to frontend clients.
    """
    logger.info("🔌 WebSocket connection attempt to /ws/state_stream")
    streaming_service = services.get_state_streaming_service()

    try:
        # Connect client
        logger.info("🔗 Calling connect_client...")
        await streaming_service.connect_client(websocket)

        logger.info("✅ Client connected to state stream")

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
                await websocket.send_json(
                    {"type": "error", "message": "Invalid JSON format"}
                )

            except Exception as e:
                logger.error(f"🚨 Error handling WebSocket message: {e}")
                break

    except Exception as e:
        logger.error(f"🚨 WebSocket connection error: {e}")

    finally:
        # Ensure client is properly disconnected
        await streaming_service.disconnect_client(websocket)
        logger.info("🔌 Client disconnected from state stream")


@app.get("/stream_status")
async def get_stream_status(services: CompositionRoot = Depends(get_services)) -> Dict[str, Any]:
    """Get current streaming service status."""
    try:
        streaming_service = services.get_state_streaming_service()

        return {
            "streaming": streaming_service.get_status(),
        }
    except Exception as e:
        logger.error(f"Stream status check failed: {e}")
        return {"status": "error", "error": str(e)}


@app.websocket("/ws/video_stream")
async def websocket_video_stream(
    websocket: WebSocket, services: CompositionRoot = Depends(get_services)
) -> None:
    """
    QUALIA.CODE v1.1 WebSocket endpoint for video streaming with configurable security.
    Streams rendered video frames from StreamingWebService to frontend clients.
    """
    logger.info("🔌 WebSocket connection attempt to /ws/video_stream")
    
    try:
        # Get SecurityService through dependency injection
        security_service = services.get_security_service()
        
        # Verify connection authentication based on configuration
        try:
            user_info = await security_service.verify_connection(websocket)
            if user_info:
                logger.info(f"✅ Authentication successful for video stream: {user_info}")
            else:
                logger.info("✅ Authentication disabled - allowing video stream connection")
        except Exception as e:
            logger.error(f"🚨 Authentication failed for video stream: {e}")
            await websocket.close(code=1008, reason="Authentication required")
            return

        # Get StreamingWebService through dependency injection
        streaming_web_service = services.get_streaming_web_service()
        
        # Accept WebSocket connection after authentication
        await websocket.accept()
        logger.info("✅ Video stream client connected")

        # Handle video streaming
        await streaming_web_service.handle_websocket_connection(websocket)

    except WebSocketDisconnect:
        logger.info("🔌 Video stream client disconnected")
    except Exception as e:
        logger.error(f"🚨 Video stream WebSocket error: {e}")
        try:
            await websocket.close(code=1011, reason="Internal server error")
        except:
            pass  # Connection might already be closed


@app.websocket("/ws/test")
async def websocket_test(websocket: WebSocket) -> None:
    """Simple WebSocket test endpoint to verify WebSocket infrastructure."""
    logger.info("🔌 WebSocket connection attempt to /ws/test")
    try:
        logger.info("🔗 Accepting test WebSocket connection...")
        await websocket.accept()
        logger.info("✅ Test WebSocket connection accepted")
        await websocket.send_text("WebSocket test connection successful!")
        logger.info("📤 Sent test message")
        await websocket.close()
        logger.info("🔌 Test WebSocket connection closed")
    except Exception as e:
        logger.error(f"🚨 WebSocket test failed: {e}")
        raise


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
async def reset_visual_engine(services: CompositionRoot = Depends(get_services)) -> QualiaUpdateResponse:
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
async def get_engine_stats(services: CompositionRoot = Depends(get_services)) -> Dict[str, Any]:
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
