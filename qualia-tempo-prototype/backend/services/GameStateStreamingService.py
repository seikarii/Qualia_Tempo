# QUALIA.CODE v1.1 - GameStateStreamingService
# WebSocket service for streaming CombatState (game state) data to frontend clients
# ARCHITECTURE.GOLD.CODE v2 - Phase 6.1: Full System Integration
# Separate from StateStreamingService (particles) for independent update rates

import asyncio
import logging
import json
from typing import Dict, Any, Set, Optional
from fastapi import WebSocket, WebSocketDisconnect
from .EventBus import EventBus
from ..utils.decorators import (
    log_execution,
    handle_errors,
)

logger = logging.getLogger(__name__)


class GameStateStreamingService:
    """
    WebSocket service for streaming CombatState (game state) data to connected clients.
    
    ARCHITECTURE.GOLD.CODE v2 - Phase 6.1:
    - Listens to GameStateChanged events from EventBus
    - Streams complete CombatState (player, boss, game state) to frontend at 60fps
    - Frontend GameStateStore consumes this data for rendering
    - Separate from particle streaming for independent update rates
    
    DATA FLOW:
    Player Actions → GameLogicService → EventBus (GameStateChanged) → 
    GameStateStreamingService → WebSocket → Frontend GameStateStore → 
    ViewLogicService → KairosVisualEngine
    """

    def __init__(
        self, event_bus: EventBus, config: Dict[str, Any]
    ) -> None:
        self._event_bus = event_bus
        self._config = config
        self._logger = logging.getLogger(__name__)

        # Connection management
        self._connections: Set[WebSocket] = set()
        self._is_streaming = False
        self._stream_task: Optional[asyncio.Task[Any]] = None

        # Streaming configuration
        self._target_fps = self._config.get("game_state_streaming", {}).get("target_fps", 60.0)
        self._frame_time = 1.0 / self._target_fps

        # Statistics
        self._states_sent = 0
        self._connected_clients = 0
        
        # CombatState tracking (updated from EventBus)
        self._current_combat_state: Optional[Dict[str, Any]] = None
        self._last_broadcasted_state: Optional[Dict[str, Any]] = None
        
        # Subscribe to GameStateChanged events from EventBus
        self._event_bus.subscribe("GameStateChanged", self._on_game_state_changed)

    @log_execution(level="INFO")
    @handle_errors(fallback_return_value=None)
    async def start_streaming(self) -> None:
        """Starts the game state streaming loop."""
        if self._is_streaming:
            self._logger.info("Game state streaming is already active.")
            return

        self._is_streaming = True
        self._stream_task = asyncio.create_task(self._streaming_loop())
        self._logger.info(
            f"🚀 Started GameStateStreaming task: {id(self._stream_task)}"
        )

    @log_execution(level="INFO")
    @handle_errors(fallback_return_value=None)
    async def stop_streaming(self) -> None:
        """Stops the game state streaming loop."""
        if not self._is_streaming or not self._stream_task:
            self._logger.info("Game state streaming is already stopped.")
            return

        self._is_streaming = False
        task = self._stream_task
        self._stream_task = None

        self._logger.info(f"Attempting to cancel game state streaming task: {id(task)}")

        if not task.done():
            task.cancel()
            try:
                await asyncio.wait_for(task, timeout=1.0)
                self._logger.info(
                    f"GameStateStreaming task {id(task)} cancelled successfully."
                )
            except asyncio.CancelledError:
                self._logger.info(f"GameStateStreaming task {id(task)} confirmed cancelled.")
            except asyncio.TimeoutError:
                self._logger.error(
                    f"Timeout waiting for task {id(task)} to cancel."
                )
            except Exception as e:
                self._logger.error(
                    f"Error during task cancellation for {id(task)}: {e}"
                )
        else:
            self._logger.info(f"GameStateStreaming task {id(task)} was already done.")

    async def _on_game_state_changed(self, event: Any) -> None:
        """
        EventBus handler for GameStateChanged events.
        
        ARCHITECTURE.GOLD.CODE: Event-driven architecture
        Updates current combat state to be broadcast to clients
        
        Args:
            event: Event object from EventBus (has .data attribute)
        """
        # EventBus wraps data in Event object - access via event.data
        event_data = event.data if hasattr(event, 'data') else event
        self._current_combat_state = event_data.get("combat_state")
        if self._current_combat_state:
            game_state = self._current_combat_state.get('gameState', 'unknown')
            self._logger.debug(f"CombatState updated: gameState={game_state}")

    @log_execution(level="DEBUG")
    @handle_errors(fallback_return_value=None)
    async def _streaming_loop(self) -> None:
        """
        Main streaming loop that broadcasts CombatState to all connected clients.
        
        ARCHITECTURE.GOLD.CODE v2 - Phase 6.1:
        - Broadcasts complete CombatState (player, boss, gameState, etc.)
        - Runs at 60fps for smooth gameplay synchronization
        - Only broadcasts when state has changed (delta compression)
        - Frontend receives JSON via WebSocket and updates GameStateStore
        """
        task_id = id(asyncio.current_task())
        last_frame_time = asyncio.get_event_loop().time()

        try:
            while self._is_streaming:
                # IMMEDIATE CANCELLATION CHECK
                if not self._is_streaming:
                    logger.critical(
                        f"💀 GAME STATE STREAMING TERMINATED - EXITING LOOP: {task_id}"
                    )
                    break

                if not self._connections:  # If no connections, just wait
                    await asyncio.sleep(0.1)
                    last_frame_time = asyncio.get_event_loop().time()
                    continue

                loop_start = asyncio.get_event_loop().time()
                dt = loop_start - last_frame_time
                last_frame_time = loop_start

                try:
                    # Only broadcast if state has changed (delta compression)
                    if self._current_combat_state and self._current_combat_state != self._last_broadcasted_state:
                        # Create state update payload
                        state_payload = {
                            'type': 'combat_state_update',
                            'timestamp': loop_start,
                            'combat_state': self._current_combat_state,
                            'dt': dt
                        }
                        
                        # Serialize to JSON and broadcast
                        json_payload = json.dumps(state_payload)
                        await self._broadcast_state_update(json_payload)

                        # Update statistics
                        self._states_sent += 1
                        self._last_broadcasted_state = self._current_combat_state.copy()

                except Exception as e:
                    self._logger.error(f"🚨 Error in game state broadcast: {e}", exc_info=True)
                    await asyncio.sleep(0.1)  # Brief pause before retry

                # Frame rate limiting (60fps target)
                elapsed = asyncio.get_event_loop().time() - loop_start
                sleep_time = max(0, self._frame_time - elapsed)

                if sleep_time > 0:
                    await asyncio.sleep(sleep_time)

        except asyncio.CancelledError:
            self._logger.info("🛑 Game state streaming loop cancelled successfully")
            raise
        except Exception as e:
            self._logger.error(f"�� Critical error in game state streaming loop: {e}")
        finally:
            self._logger.info("🛑 Game state streaming loop terminated")

    @log_execution(level="DEBUG")
    @handle_errors(fallback_return_value=None)
    async def _broadcast_state_update(self, json_payload: str) -> None:
        """
        Send JSON CombatState data to all connected clients via WebSocket.
        
        ARCHITECTURE.GOLD.CODE v2 - Phase 6.1:
        - Backend sends STATE (complete CombatState) as JSON
        - Frontend GameStateStore handles state management
        - ViewLogicService computes visual parameters from CombatState
        - KairosVisualEngine renders based on visual parameters
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
                self._logger.error(f"Error sending game state to client: {e}")
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
            f"✅ Game state client connected. Total connections: {len(self._connections)}"
        )

        # Send initial state immediately if available
        if self._current_combat_state:
            initial_payload = {
                'type': 'combat_state_update',
                'timestamp': asyncio.get_event_loop().time(),
                'combat_state': self._current_combat_state,
                'dt': 0.0
            }
            await websocket.send_json(initial_payload)

        try:
            # Keep the connection alive and handle incoming messages
            while True:
                # Wait for messages from client (if any)
                message = await websocket.receive_text()
                # Parse and handle client messages
                try:
                    message_data = json.loads(message)
                    await self.handle_client_message(websocket, message_data)
                except json.JSONDecodeError:
                    self._logger.warning(f"Received invalid JSON from client: {message}")

        except WebSocketDisconnect:
            self._logger.info("Game state client disconnected gracefully")
        except Exception as e:
            self._logger.error(f"Error handling game state client connection: {e}")
        finally:
            # Clean up connection
            self._connections.discard(websocket)
            self._connected_clients -= 1
            self._logger.info(
                f"🗑️ Game state client cleaned up. Remaining: {len(self._connections)}"
            )

    @log_execution(level="DEBUG")
    @handle_errors(fallback_return_value=None)
    async def handle_client_message(
        self, websocket: WebSocket, message: Dict[str, Any]
    ) -> None:
        """Handle incoming messages from WebSocket clients."""
        message_type = message.get("type")

        if message_type == "ping":
            # Respond to ping with pong
            await websocket.send_json(
                {
                    "type": "pong",
                    "timestamp": message.get("timestamp"),
                    "pingId": message.get("pingId"),
                }
            )
        elif message_type == "request_state":
            # Client requesting current state
            if self._current_combat_state:
                await websocket.send_json({
                    "type": "combat_state_update",
                    "timestamp": asyncio.get_event_loop().time(),
                    "combat_state": self._current_combat_state,
                    "dt": 0.0
                })
        else:
            self._logger.debug(f"Ignored message type: {message_type}")

    @log_execution()
    def get_status(self) -> Dict[str, Any]:
        """Get current game state streaming service status."""
        return {
            "is_streaming": self._is_streaming,
            "connected_clients": len(self._connections),
            "states_sent": self._states_sent,
            "target_fps": self._target_fps,
            "has_current_state": self._current_combat_state is not None
        }

    @log_execution(level="INFO")
    @handle_errors(fallback_return_value=None)
    async def disconnect_client(self, websocket: WebSocket) -> None:
        """Explicitly disconnect a client."""
        self._connections.discard(websocket)
        self._logger.info(f"Client manually disconnected. Remaining: {len(self._connections)}")
