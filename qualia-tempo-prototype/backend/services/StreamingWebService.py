# QUALIA.CODE v1.1 - StreamingWebService
# WebSocket service for streaming rendered frames to frontend clients

import asyncio
import logging
import base64
from typing import Dict, Any, Set, Optional
from fastapi import WebSocket, WebSocketDisconnect
from .EventBus import EventBus, RenderingPipelineFailedEvent
from .RenderingService import RenderingService
from .exceptions import RenderingPipelineError, GPUResourceError
from ..utils.decorators import (
    log_execution,
    handle_errors,
)

logger = logging.getLogger(__name__)


class StreamingWebService:
    """
    WebSocket service for streaming rendered frames to connected clients.
    Manages connections and coordinates with RenderingService for frame generation.
    """

    def __init__(
        self,
        event_bus: EventBus,
        rendering_service: RenderingService,
        particle_engine: Any,
    ) -> None:
        self._event_bus = event_bus
        self._rendering_service = rendering_service
        self._particle_engine = (
            particle_engine  # QUALIA.CODE: Inject particle engine for simulation
        )
        self._logger = logging.getLogger(__name__)

        # Connection management
        self._connections: Set[WebSocket] = set()
        self._is_streaming = False
        self._stream_task: Optional[asyncio.Task[Any]] = None

        # Streaming configuration
        self._target_fps = 30.0  # Lower FPS for WebSocket streaming
        self._compression_quality = 70  # JPEG quality (0-100)

        # Statistics
        self._frames_sent = 0
        self._bytes_sent = 0
        self._connected_clients = 0

        # Subscribe to rendering pipeline failure events
        self._event_bus.subscribe(
            "RENDERING_PIPELINE_FAILED", self._handle_rendering_failure
        )

    @log_execution(level="INFO")
    @handle_errors(fallback_return_value=None)
    async def connect_client(self, websocket: WebSocket) -> None:
        """Accept new WebSocket connection and add to active connections."""
        try:
            await websocket.accept()
            self._connections.add(websocket)
            self._connected_clients = len(self._connections)

            self._logger.info(
                f"🔗 Client connected. Total connections: {self._connected_clients}"
            )

            # Start streaming if this is the first connection
            if not self._is_streaming and self._connected_clients > 0:
                await self._start_streaming()

        except Exception as e:
            self._logger.error(f"🚨 Failed to connect client: {e}")

    @log_execution(level="INFO")
    @handle_errors(fallback_return_value=None)
    async def disconnect_client(self, websocket: WebSocket) -> None:
        """Remove WebSocket connection from active connections."""
        try:
            if websocket in self._connections:
                self._connections.remove(websocket)
                self._connected_clients = len(self._connections)

                self._logger.info(
                    f"🔌 Client disconnected. Total connections: {self._connected_clients}"
                )

                # Stop streaming if no connections remain
                if self._connected_clients == 0 and self._is_streaming:
                    await self._stop_streaming()

        except Exception as e:
            self._logger.error(f"🚨 Error disconnecting client: {e}")

    @log_execution(level="INFO")
    @handle_errors(fallback_return_value=None)
    async def _start_streaming(self) -> None:
        """Starts the video streaming loop, ensuring any previous task is stopped."""
        if self._is_streaming:
            self._logger.warning("Start streaming called, but it is already running.")
            return

        # Ensure any lingering task is robustly stopped before starting a new one.
        await self._stop_streaming()

        self._is_streaming = True
        self._stream_task = asyncio.create_task(self._streaming_loop())
        self._logger.info(
            f"🚀 Started new video streaming task: {id(self._stream_task)}"
        )

    async def _handle_rendering_failure(
        self, event: RenderingPipelineFailedEvent
    ) -> None:
        """Handle rendering pipeline failure events by stopping the stream."""
        self._logger.critical(
            f"🚨 Rendering pipeline failed: {event.data['error_message']}"
        )
        self._logger.critical("🛑 Shutting down stream due to rendering failure")

        # Disconnect all clients with error message
        disconnect_message = {
            "type": "error",
            "message": "Rendering pipeline failed. Stream terminated.",
            "error_code": event.data["error_code"],
            "timestamp": event.timestamp,
        }

        # Send error message to all clients before disconnecting
        for connection in list(self._connections):
            try:
                await connection.send_json(disconnect_message)
                await connection.close(code=1011)  # Internal Error
            except Exception as e:
                self._logger.error(f"Failed to notify client of rendering failure: {e}")

        # Stop streaming immediately
        await self._stop_streaming()

    @log_execution(level="INFO")
    @handle_errors(fallback_return_value=None)
    async def _stop_streaming(self) -> None:
        """Stops the video streaming loop robustly and waits for termination."""
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
        """Main streaming loop that generates and sends frames to all connected clients."""
        frame_time = 1.0 / self._target_fps
        task_id = id(asyncio.current_task())

        # Health check pre-loop: Check if rendering service is healthy before starting
        if not self._rendering_service.is_healthy():
            self._logger.critical(
                "RenderingService is not healthy. Aborting streaming."
            )
            await self._stop_streaming()
            return

        try:
            while self._is_streaming:  # Check streaming state
                # IMMEDIATE CANCELLATION CHECK
                if not self._is_streaming:
                    logger.critical(
                        f"💀 STREAMING TERMINATED - EXITING LOOP: {task_id}"
                    )
                    break

                if not self._connections:  # If no connections, just wait
                    await asyncio.sleep(0.1)
                    continue

                loop_start = asyncio.get_event_loop().time()

                # SECOND CANCELLATION CHECK BEFORE EXPENSIVE OPERATION
                if not self._is_streaming:
                    logger.critical(
                        f"💀 STREAMING CANCELLED - ABORTING RENDER: {task_id}"
                    )
                    break

                # QUALIA.CODE CRITICAL FIX: CONTEXT-SAFE OpenGL operations
                # CRITICAL: All OpenGL operations must run in the main thread context
                frame_bytes = None

                try:
                    # CRITICAL: Execute particle simulation step with OpenGL context safety
                    compute_success = self._particle_engine.compute_step()
                    if not compute_success:
                        self._logger.warning(
                            "⚠️ Particle compute step failed - continuing with last frame"
                        )
                        # Continue with rendering even if particle step fails

                    # CRITICAL: Execute rendering in the same thread context as particle engine
                    # Both operations must share the same OpenGL context to prevent segfaults
                    # This call will now raise specific exceptions if it fails
                    frame_bytes = self._rendering_service.render_frame()

                except (RenderingPipelineError, GPUResourceError) as e:
                    self._logger.critical(
                        f"Unrecoverable rendering error caught: {e}. Shutting down stream."
                    )
                    # The event handler will handle the shutdown via RenderingPipelineFailedEvent
                    break  # Exit the loop

                except Exception as e:
                    self._logger.error(f"Unhandled exception in streaming loop: {e}")
                    # Consider if this should also trigger a shutdown
                    continue

                if frame_bytes:
                    # THIRD CANCELLATION CHECK BEFORE TRANSMISSION
                    if not self._is_streaming:
                        logger.critical(
                            f"💀 STREAMING CANCELLED - ABORTING TRANSMISSION: {task_id}"
                        )
                        break

                    try:
                        # Encode frame as base64 for WebSocket transmission
                        frame_b64 = base64.b64encode(frame_bytes).decode("utf-8")

                        # Create WebSocket message
                        message = {
                            "type": "video_frame",
                            "data": frame_b64,
                            "timestamp": loop_start,
                            "frame_number": self._frames_sent,
                        }

                        # Send frame to all connected clients
                        await self._broadcast_frame(message)

                        # Update statistics
                        self._frames_sent += 1
                        self._bytes_sent += len(frame_bytes)

                    except WebSocketDisconnect:
                        # Handle client disconnects gracefully
                        self._logger.debug(
                            "Client disconnected during frame transmission"
                        )
                    except Exception as e:
                        self._logger.error(f"🚨 Error in frame transmission: {e}")
                else:
                    # This case should now only happen if render_frame explicitly returns None
                    # in a controlled, non-error scenario (which it shouldn't).
                    self._logger.warning(
                        "render_frame returned None without an exception. This indicates a potential logic flaw."
                    )

                # Frame rate limiting
                elapsed = asyncio.get_event_loop().time() - loop_start
                sleep_time = max(0, frame_time - elapsed)

                if sleep_time > 0:
                    await asyncio.sleep(sleep_time)

        except asyncio.CancelledError:
            self._logger.info("🛑 Streaming loop cancelled successfully")
            raise
        except Exception as e:
            self._logger.error(f"🚨 Critical error in streaming loop: {e}")
        finally:
            self._logger.info("🛑 Streaming loop terminated")

    @log_execution(level="DEBUG")
    @handle_errors(fallback_return_value=None)
    async def _broadcast_frame(self, message: Dict[str, Any]) -> None:
        """Send frame message to all connected clients, removing dead connections."""
        if not self._connections:
            return

        # Send to all connections simultaneously
        disconnected = set()

        for websocket in self._connections.copy():
            try:
                await websocket.send_json(message)

            except WebSocketDisconnect:
                disconnected.add(websocket)

            except Exception as e:
                self._logger.error(f"🚨 Error sending frame to client: {e}")
                disconnected.add(websocket)

        # Remove disconnected clients
        for websocket in disconnected:
            await self.disconnect_client(websocket)

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

        elif message_type == "quality_change":
            # Handle quality change requests
            new_quality = message.get("quality", self._compression_quality)
            if 10 <= new_quality <= 100:
                self._compression_quality = new_quality
                self._logger.info(f"🎛️ Changed streaming quality to {new_quality}")

        elif message_type == "fps_change":
            # Handle FPS change requests
            new_fps = message.get("fps", self._target_fps)
            if 1.0 <= new_fps <= 60.0:
                self._target_fps = new_fps
                self._logger.info(f"🎛️ Changed streaming FPS to {new_fps}")

        else:
            self._logger.warning(f"⚠️ Unknown message type: {message_type}")

    @log_execution(level="INFO")
    @handle_errors(fallback_return_value=None)
    async def shutdown(self) -> None:
        """Gracefully stop the streaming loop and disconnect all clients."""
        self._logger.info("Shutting down StreamingWebService...")

        # Stop the streaming task robustly.
        await self._stop_streaming()

        # Gracefully close all active connections.
        if self._connections:
            self._logger.info(f"Closing {len(self._connections)} client connections...")
            tasks = [ws.close() for ws in self._connections]
            await asyncio.gather(*tasks, return_exceptions=True)
            self._connections.clear()

        self._logger.info("✅ StreamingWebService shutdown complete.")

    @log_execution(level="DEBUG")
    def get_status(self) -> Dict[str, Any]:
        """Get current streaming service status."""
        return {
            "is_streaming": self._is_streaming,
            "connected_clients": self._connected_clients,
            "target_fps": self._target_fps,
            "compression_quality": self._compression_quality,
            "frames_sent": self._frames_sent,
            "bytes_sent": self._bytes_sent,
            "rendering_service_initialized": self._rendering_service.is_initialized,
        }

    @property
    @log_execution(level="DEBUG")
    def connected_clients(self) -> int:
        """Get number of connected clients."""
        return self._connected_clients

    @property
    @log_execution(level="DEBUG")
    def is_streaming(self) -> bool:
        """Check if currently streaming."""
        return self._is_streaming
