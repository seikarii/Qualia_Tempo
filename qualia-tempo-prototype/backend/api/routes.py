# QUALIA.CODE v1.0 - Backend API Routes
# FastAPI endpoints with dependency injection and event-driven architecture

from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from .models import QualiaState, QualiaUpdateResponse
from ..CompositionRoot import get_composition_root, CompositionRoot
from typing import Dict, Any
from datetime import datetime
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
    """
    Comprehensive health check with dependency status.
    
    PHASE 6.5: HealthCheckService Integration
    Uses HealthCheckService for dependency checking and status aggregation.
    Returns detailed health report with all registered checks.
    """
    try:
        health_check_service = services.get_health_check()
        health_report: Dict[str, Any] = await health_check_service.get_health_report()
        
        return health_report
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "UNHEALTHY",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }


@app.get("/health/ready")
async def readiness_probe(services: CompositionRoot = Depends(get_services)) -> Dict[str, bool]:
    """
    Kubernetes readiness probe endpoint.
    
    PHASE 6.5: HealthCheckService Integration
    Returns true if the service is ready to accept traffic.
    Returns false during startup grace period or if critically unhealthy.
    
    Returns:
        {"ready": bool} - True if ready, False otherwise
    """
    try:
        health_check_service = services.get_health_check()
        is_ready = await health_check_service.check_readiness()
        
        return {"ready": is_ready}
    except Exception as e:
        logger.error(f"Readiness probe failed: {e}")
        return {"ready": False}


@app.get("/health/live")
async def liveness_probe(services: CompositionRoot = Depends(get_services)) -> Dict[str, bool]:
    """
    Kubernetes liveness probe endpoint.
    
    PHASE 6.5: HealthCheckService Integration
    Returns true if the service is alive and responsive.
    Should almost always return true unless the process is completely stuck.
    
    Returns:
        {"alive": bool} - True if alive, False otherwise
    """
    try:
        health_check_service = services.get_health_check()
        is_alive = await health_check_service.check_liveness()
        
        return {"alive": is_alive}
    except Exception as e:
        logger.error(f"Liveness probe failed: {e}")
        return {"alive": False}


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

        # Log state for debugging (enhanced) - QUALIA.CODE §5.3 compliant
        _log_qualia_state_detailed(state_dict, logger)

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


# ARCHITECTURE.GOLD.CODE: Video streaming endpoint removed - backend does not render
# Video rendering is now exclusively handled by frontend (KairosVisualEngine)
# Backend only streams STATE data via /ws/game_state endpoint

@app.websocket("/ws/game_state")
async def websocket_game_state(
    websocket: WebSocket, services: CompositionRoot = Depends(get_services)
) -> None:
    """
    PHASE 6 TASK 6.1: WebSocket endpoint for CombatState streaming.
    
    Streams complete game state (player, boss, gameState, etc.) to frontend at 60fps.
    Frontend GameStateStore consumes this data for rendering.
    
    DATA FLOW:
    Player Actions → GameLogicService → EventBus (GameStateChanged) → 
    GameStateStreamingService → WebSocket → Frontend GameStateStore →
    ViewLogicService → KairosVisualEngine
    """
    logger.info("🔌 WebSocket connection attempt to /ws/game_state")
    game_state_streaming = services.get_game_state_streaming_service()

    try:
        logger.info("🔗 Accepting game state WebSocket connection...")
        await game_state_streaming.connect_client(websocket)

    except Exception as e:
        logger.error(f"🚨 WebSocket game state connection error: {e}")

    finally:
        # Ensure client is properly disconnected
        await game_state_streaming.disconnect_client(websocket)
        logger.info("🔌 Game state client disconnected")


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


def _log_qualia_state_detailed(state_dict: dict, logger: logging.Logger) -> None:
    """
    Enhanced logging for QualiaState with visual representation.
    
    QUALIA.CODE v1.1 COMPLIANCE:
    - Uses injected ILogger instead of print() (§5.3 Logging Standard)
    - Structured logging with DEBUG level for development visibility
    
    Args:
        state_dict: QualiaState dictionary with metrics
        logger: Injected logger instance (not print())
    """
    logger.debug("=== QUALIA STATE UPDATE (QUALIA.CODE) ===")
    logger.debug(f"🔥 Intensity: {state_dict.get('intensity', 0):.3f}")
    logger.debug(f"🎯 Precision: {state_dict.get('precision', 0):.3f}")
    logger.debug(f"⚡ Aggression: {state_dict.get('aggression', 0):.3f}")
    logger.debug(f"🌊 Flow: {state_dict.get('flow', 0):.3f}")
    logger.debug(f"🌪️ Chaos: {state_dict.get('chaos', 0):.3f}")
    logger.debug(f"💊 Recovery: {state_dict.get('recovery', 0):.3f}")
    logger.debug(f"🌟 Transcendence: {state_dict.get('transcendence', 0):.3f}")
    logger.debug("==========================================")


@app.post("/reset_engine")
async def reset_visual_engine(services: CompositionRoot = Depends(get_services)) -> QualiaUpdateResponse:
    """Reset the visual engine to initial state using dependency injection."""
    try:
        # Reset through EventBus only - no direct calls
        event_bus = services.get_event_bus()
        await event_bus.publish_async(event_name="EngineReset", data={}, source="API")

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
    """
    Get engine statistics and current state.
    
    TODO (QUALIA.CODE §IV - Event-Driven Diagnostics):
    This endpoint uses a "pull" pattern (calling get_stats() directly), which violates
    QUALIA.CODE architectural principles. The correct approach is:
    
    1. Services should emit ServiceStatusUpdateEvent periodically
    2. A DiagnosticsOrchestratorService should listen to these events
    3. This endpoint should query the orchestrator's cached state (no direct service calls)
    
    This pattern prevents tight coupling and allows services to remain decoupled.
    See: QUALIA.CODE.md §IV - Event-Driven Architecture, Diagnostics subsection
    
    TRACKED IN: TODO.md - Session 14 Remaining Work #1
    """
    try:
        event_bus = services.get_event_bus()
        particle_system = services.get_particle_system()
        qualia_processor = services.get_qualia_processor()

        # NOTE: Direct service method calls below violate event-driven architecture
        # This is a KNOWN ARCHITECTURAL DEBT that will be resolved in future session
        return {
            "event_bus": event_bus.get_stats(),
            "subscriptions": event_bus.get_subscriptions(),
            "particle_parameters": particle_system.get_current_parameters(),
            "current_qualia_state": qualia_processor.get_current_state(),
            "architecture": "QUALIA.CODE v1.1 (diagnostics pending refactor)",
        }
    except Exception as e:
        logger.error(f"🚨 Error getting stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
