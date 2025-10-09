# QUALIA.CODE v1.1 - StateStreamingService
# WebSocket service for streaming qualia state data to frontend clients
# ARCHITECTURE.GOLD.CODE v2 - Phase 1.4: Integrated with ParticleEnginePoolManager

# QUALIA.CODE COMPLIANCE FIXES:
# - ✅ Implements IBaseService for lifecycle management (§IX @OnEvent pattern)
# - ✅ Uses @OnEvent decorator for QualiaStateUpdated subscription
# - ✅ Injects ILogger instead of using logging.getLogger() (§5.3 Logging Standard)
# - ✅ Injects ITimerService for asyncio.sleep abstraction (§4 Platform Abstraction)
# - ✅ Direct configuration injection (§II.2.3 Step 3)

import asyncio
import json
from typing import Dict, Any, Set, Optional, List
from fastapi import WebSocket, WebSocketDisconnect
from .interfaces.IEventBus import IEventBus
from .interfaces.ILogger import ILogger
from .interfaces.ITimerService import ITimerService
from .interfaces.IBaseService import IBaseService
from .interfaces.IParticleEnginePoolManager import IParticleEnginePoolManager
from .contracts.IStateStreamingService_contracts import StateStreamingServiceConfig
from ..utils.decorators import (
    log_execution,
    handle_errors,
    OnEvent
)


class StateStreamingService(IBaseService):
    """
    WebSocket service for streaming qualia state data to connected clients.
    
    ARCHITECTURE.GOLD.CODE v2 - Phase 1.4 Integration:
    - Uses async ParticleEnginePoolManager for particle calculations
    - Listens to QualiaStateUpdated events from EventBus via @OnEvent decorator
    - Submits particle calculation tasks to worker pool
    - Streams JSON state data (particle_states list) to frontend
    - Frontend KairosVisualEngine handles rendering
    
    QUALIA.CODE COMPLIANCE:
    - Implements IBaseService for lifecycle management
    - Uses @OnEvent for automatic event subscription (§IX.9.1)
    - ILogger injection (§5.3 Logging Standard)
    - ITimerService for time operations (§4 Platform Abstraction)
    - Direct configuration injection (§II Step 3)
    """

    def __init__(
        self,
        config: StateStreamingServiceConfig,
        event_bus: IEventBus,
        particle_engine: IParticleEnginePoolManager,
        timer_service: ITimerService,
        logger: ILogger
    ) -> None:
        """Initialize StateStreamingService with injected dependencies.
        
        Args:
            config: Direct configuration injection (QUALIA.CODE §II Step 3)
            event_bus: EventBus for @OnEvent subscriptions (§IV Event-Driven Architecture)
            particle_engine: ParticleEnginePoolManager for particle calculations
            timer_service: Timer service for async sleep (§4 Platform Abstraction)
            logger: Injected logger instance (§5.3 Logging Standard)
        """
        self._config = config
        self._event_bus = event_bus
        self._pool_manager = particle_engine
        self._timer_service = timer_service
        self._logger = logger

        # Connection management
        self._connections: Set[WebSocket] = set()
        self._is_streaming = False
        self._stream_task: Optional[asyncio.Task[Any]] = None

        # Streaming configuration from injected config
        self._target_fps = self._config.target_fps
        self._frame_time = 1.0 / self._target_fps

        # Statistics
        self._states_sent = 0
        self._connected_clients = 0
        
        # Qualia state tracking (updated from EventBus via @OnEvent)
        self._current_qualia_state: Optional[Dict[str, Any]] = None
        
        # Event subscription tracking for cleanup
        self._event_subscriptions: List[str] = []
        
        self._logger.info("StateStreamingService initialized with injected configuration")
    
    # ============================================================================
    # IBaseService Implementation (QUALIA.CODE §IX Lifecycle Management)
    # ============================================================================
    
    async def initialize(self) -> None:
        """Initialize service and register @OnEvent handlers."""
        # @OnEvent decorator automatically registers handlers
        # ApplicationInitializerService calls this method on startup
        await self.start_streaming()
        self._logger.info("StateStreamingService initialized via IBaseService")
    
    async def cleanup(self) -> None:
        """Cleanup service resources and stop streaming."""
        await self.stop_streaming()
        # Event subscriptions automatically cleaned up by ApplicationInitializerService
        self._logger.info("StateStreamingService cleaned up via IBaseService")
    
    @log_execution(level="DEBUG")
    def get_health_status(self) -> Dict[str, Any]:
        """Get service health status (IBaseService requirement)."""
        return {
            "is_streaming": self._is_streaming,
            "connected_clients": len(self._connections),
            "states_sent": self._states_sent,
            "target_fps": self._target_fps,
            "has_current_state": self._current_qualia_state is not None
        }
    
    # ============================================================================
    # Event Handlers (QUALIA.CODE §IX @OnEvent Pattern)
    # ============================================================================
    
    @OnEvent("QualiaStateUpdated")
    async def _on_qualia_state_updated(self, event: Any) -> None:
        """
        EventBus handler for QualiaStateUpdated events.
        Automatically subscribed via @OnEvent decorator.
        
        ARCHITECTURE.GOLD.CODE: Event-driven architecture
        Updates current qualia state to be sent to workers
        
        Args:
            event: Event object from EventBus (has .data attribute)
        """
        # EventBus wraps data in Event object - access via event.data
        event_data = event.data if hasattr(event, 'data') else event
        self._current_qualia_state = event_data.get("qualia_state")
        if self._current_qualia_state:
            intensity = self._current_qualia_state.get('intensity', 0)
            self._logger.debug(f"QualiaState updated: intensity={intensity}")

    @log_execution(level="INFO")
    @handle_errors(fallback_return_value=None)
    async def start_streaming(self) -> None:
        """Starts the state streaming loop."""
        if self._is_streaming:
            self._logger.info("Streaming is already active.")
            return

        self._is_streaming = True
        self._stream_task = asyncio.create_task(self._streaming_loop())
        self._logger.info(
            f"🚀 Started new state streaming task: {id(self._stream_task)}"
        )

    @log_execution(level="INFO")
    @handle_errors(fallback_return_value=None)
    async def stop_streaming(self) -> None:
        """Stops the state streaming loop robustly and waits for termination."""
        if not self._is_streaming or not self._stream_task:
            self._logger.info("Streaming is already stopped.")
            return

        self._is_streaming = False
        task = self._stream_task
        self._stream_task = None

        self._logger.info(f"Attempting to cancel streaming task: {id(task)}")

        if not task.done():
            task.cancel()
            try:
                await asyncio.wait_for(task, timeout=1.0)
                self._logger.info(
                    f"Streaming task {id(task)} cancelled and terminated successfully."
                )
            except asyncio.CancelledError:
                self._logger.info(f"Streaming task {id(task)} confirmed cancelled.")
            except asyncio.TimeoutError:
                self._logger.error(
                    f"Timeout waiting for task {id(task)} to cancel. It may become a zombie."
                )
            except Exception as e:
                self._logger.error(
                    f"Error during task cancellation for {id(task)}: {e}"
                )
        else:
            self._logger.info(f"Streaming task {id(task)} was already done.")



    @log_execution(level="DEBUG")
    @handle_errors(fallback_return_value=None)
    async def _streaming_loop(self) -> None:
        """
        Main streaming loop that submits tasks to worker pool and streams results.
        
        ARCHITECTURE.GOLD.CODE v2 - Phase 1.4:
        - Uses async ParticleEnginePoolManager.submit_task()
        - Sends dt and current QualiaState to workers
        - Workers return particle_states (JSON-serializable list)
        - Broadcasts JSON state to frontend clients
        """
        task_id = id(asyncio.current_task())
        last_frame_time = asyncio.get_event_loop().time()

        try:
            while self._is_streaming:
                # IMMEDIATE CANCELLATION CHECK
                if not self._is_streaming:  # pragma: no cover
                    self._logger.critical(
                        f"💀 STREAMING TERMINATED - EXITING LOOP: {task_id}"
                    )
                    break

                if not self._connections:  # If no connections, just wait
                    # Use ITimerService instead of asyncio.sleep (QUALIA.CODE §4 Platform Abstraction)
                    await self._timer_service.sleep(0.1)
                    last_frame_time = asyncio.get_event_loop().time()
                    continue

                loop_start = asyncio.get_event_loop().time()
                dt = loop_start - last_frame_time
                last_frame_time = loop_start

                try:
                    # Submit particle calculation task to worker pool
                    result = await self._pool_manager.submit_task(
                        dt=dt,
                        qualia_state=self._current_qualia_state,
                        command="update"
                    )

                    if result and result.get('success'):
                        # Extract particle states from worker result
                        particle_states = result.get('particle_states', [])
                        
                        # Create state update payload
                        state_payload = {
                            'type': 'particle_state_update',
                            'timestamp': loop_start,
                            'particle_states': particle_states,
                            'qualia_state': self._current_qualia_state,
                            'statistics': result.get('statistics', {})
                        }
                        
                        # Serialize to JSON and broadcast
                        json_payload = json.dumps(state_payload)
                        await self._broadcast_state_update(json_payload)

                        # Update statistics
                        self._states_sent += 1
                    else:
                        error_msg = result.get('error_message', 'Unknown error') if result else 'No result'
                        self._logger.warning(f"⚠️  Worker task failed: {error_msg}")

                except Exception as e:
                    self._logger.error(f"🚨 Error in state computation: {e}", exc_info=True)
                    # Use ITimerService (QUALIA.CODE §4 Platform Abstraction)
                    await self._timer_service.sleep(0.1)  # Brief pause before retry

                # Frame rate limiting
                elapsed = asyncio.get_event_loop().time() - loop_start
                sleep_time = max(0, self._frame_time - elapsed)

                if sleep_time > 0:
                    # Use ITimerService (QUALIA.CODE §4 Platform Abstraction)
                    await self._timer_service.sleep(sleep_time)

        except asyncio.CancelledError:
            self._logger.info("🛑 Streaming loop cancelled successfully")
            raise
        except Exception as e:
            self._logger.error(f"🚨 Critical error in streaming loop: {e}")
        finally:
            self._logger.info("🛑 Streaming loop terminated")

    @log_execution(level="DEBUG")
    @handle_errors(fallback_return_value=None)
    async def _broadcast_state_update(self, json_payload: str) -> None:
        """
        Send JSON particle state data to all connected clients via WebSocket.
        
        ARCHITECTURE.GOLD.CODE v2 - Phase 1.4:
        - Backend sends STATE (particle_states + qualia_state) as JSON
        - Frontend KairosVisualEngine handles rendering
        - Clean separation: Backend = Logic, Frontend = Visuals
        """
        if not self._connections:
            return

        dead_connections = set()

        for connection in self._connections:
            try:
                # JSON STREAMING: send_text with JSON payload
                await connection.send_text(json_payload)
            except WebSocketDisconnect:
                dead_connections.add(connection)
            except Exception as e:
                self._logger.error(f"Error sending JSON data to client: {e}")
                dead_connections.add(connection)

        # Remove dead connections
        self._connections -= dead_connections
        if dead_connections:
            self._logger.info(f"Removed {len(dead_connections)} dead connections")

    @log_execution(level="INFO")
    @handle_errors(fallback_return_value=None)
    async def connect_client(self, websocket: WebSocket) -> None:
        """Accepts a new WebSocket connection and adds it to the active connections."""
        await websocket.accept()
        self._connections.add(websocket)
        self._connected_clients += 1
        self._logger.info(
            f"✅ Client connected. Total connections: {len(self._connections)}"
        )

        try:
            # Keep the connection alive and handle incoming messages
            while True:
                # Wait for messages from client (if any)
                message = await websocket.receive_text()
                # Handle client messages if needed
                self._logger.debug(f"Received message from client: {message}")

        except WebSocketDisconnect:
            self._logger.info("Client disconnected gracefully")
        except Exception as e:
            self._logger.error(f"Error handling client connection: {e}")
        finally:
            # Clean up connection
            self._connections.discard(websocket)
            self._connected_clients -= 1
            self._logger.info(
                f"🗑️ Client connection cleaned up. Remaining: {len(self._connections)}"
            )

    @log_execution(level="DEBUG")
    @handle_errors(fallback_return_value=None)
    async def handle_client_message(
        self, websocket: WebSocket, message: Dict[str, Any]
    ) -> None:
        """Handle incoming messages from WebSocket clients."""
        message_type = message.get("type")

        if message_type == "ping":
            # Respond to ping with pong, including the mandatory pingId for contract compliance
            await websocket.send_json(
                {
                    "type": "pong",
                    "timestamp": message.get("timestamp"),
                    "pingId": message.get("pingId"),
                }
            )
        else:
            # For state streaming, we don't handle other message types
            self._logger.debug(f"Ignored message type: {message_type}")

    @log_execution()
    def get_status(self) -> Dict[str, Any]:
        """Get current streaming service status."""
        return {
            "is_streaming": self._is_streaming,
            "connected_clients": len(self._connections),
            "states_sent": self._states_sent,
            "target_fps": self._target_fps,
        }