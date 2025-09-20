# QUALIA.CODE v1.1 - StreamingWebService
# WebSocket service for streaming rendered frames to frontend clients

import asyncio
import logging
import base64
import signal
import os
import threading
from typing import Dict, Any, Set, List
from fastapi import WebSocket, WebSocketDisconnect
from .EventBus import EventBus
from .RenderingService import RenderingService
from ..utils.decorators import (
    log_execution,
    handle_errors,
)

logger = logging.getLogger(__name__)

# GLOBAL TASK REGISTRY FOR ZOMBIE ELIMINATION
_global_streaming_tasks: List[asyncio.Task] = []
_task_registry_lock = threading.Lock()

def register_streaming_task(task: asyncio.Task):
    """Register a streaming task for shutdown tracking."""
    with _task_registry_lock:
        _global_streaming_tasks.append(task)
        logger.debug(f"🎯 Registered streaming task: {id(task)}")

def force_kill_all_streaming_tasks():
    """NUCLEAR OPTION: Force cancel all registered streaming tasks."""
    with _task_registry_lock:
        logger.critical(f"🚨 FORCE KILLING {len(_global_streaming_tasks)} streaming tasks")
        for task in _global_streaming_tasks:
            if not task.done():
                task.cancel()
                logger.critical(f"💀 FORCE CANCELLED TASK: {id(task)}")
        _global_streaming_tasks.clear()


class StreamingWebService:
    """
    WebSocket service for streaming rendered frames to connected clients.
    Manages connections and coordinates with RenderingService for frame generation.
    """

    def __init__(self, event_bus: EventBus, rendering_service: RenderingService):
        self._event_bus = event_bus
        self._rendering_service = rendering_service
        self._logger = logging.getLogger(__name__)
        
        # Connection management
        self._connections: Set[WebSocket] = set()
        self._is_streaming = False
        self._stream_task: asyncio.Task = None
        
        # Streaming configuration
        self._target_fps = 30.0  # Lower FPS for WebSocket streaming
        self._compression_quality = 70  # JPEG quality (0-100)
        
        # Statistics
        self._frames_sent = 0
        self._bytes_sent = 0
        self._connected_clients = 0

    @log_execution(level="INFO")
    @handle_errors(fallback_return_value=None)
    async def connect_client(self, websocket: WebSocket) -> None:
        """Accept new WebSocket connection and add to active connections."""
        try:
            await websocket.accept()
            self._connections.add(websocket)
            self._connected_clients = len(self._connections)
            
            self._logger.info(f"🔗 Client connected. Total connections: {self._connected_clients}")
            
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
                
                self._logger.info(f"🔌 Client disconnected. Total connections: {self._connected_clients}")
                
                # Stop streaming if no connections remain
                if self._connected_clients == 0 and self._is_streaming:
                    await self._stop_streaming()
                    
        except Exception as e:
            self._logger.error(f"🚨 Error disconnecting client: {e}")

    @log_execution(level="INFO")
    @handle_errors(fallback_return_value=None)
    async def _start_streaming(self) -> None:
        """Start the video streaming loop."""
        if self._is_streaming:
            return
            
        self._is_streaming = True
        self._stream_task = asyncio.create_task(self._streaming_loop())
        
        # REGISTER TASK FOR ZOMBIE ELIMINATION
        register_streaming_task(self._stream_task)
        
        self._logger.info(f"� Started video streaming (Task ID: {id(self._stream_task)})")

    @log_execution(level="INFO")  
    @handle_errors(fallback_return_value=None)
    async def _stop_streaming(self) -> None:
        """Stop the video streaming loop."""
        if not self._is_streaming:
            return
            
        self._is_streaming = False
        
        if self._stream_task and not self._stream_task.done():
            self._logger.critical(f"💀 FORCE CANCELLING STREAMING TASK: {id(self._stream_task)}")
            self._stream_task.cancel()
            try:
                await asyncio.wait_for(self._stream_task, timeout=1.0)
            except (asyncio.CancelledError, asyncio.TimeoutError):
                self._logger.critical(f"🔥 TASK TERMINATED: {id(self._stream_task)}")
                
        self._logger.info("🛑 Stopped video streaming")

    @log_execution(level="DEBUG")
    @handle_errors(fallback_return_value=None)
    async def _streaming_loop(self) -> None:
        """Main streaming loop that generates and sends frames to all connected clients."""
        frame_time = 1.0 / self._target_fps
        task_id = id(asyncio.current_task())
        
        try:
            while self._is_streaming:  # Check streaming state
                # IMMEDIATE CANCELLATION CHECK
                if not self._is_streaming:
                    logger.critical(f"💀 STREAMING TERMINATED - EXITING LOOP: {task_id}")
                    break
                    
                if not self._connections:  # If no connections, just wait
                    await asyncio.sleep(0.1)
                    continue
                    
                loop_start = asyncio.get_event_loop().time()
                
                try:
                    # SECOND CANCELLATION CHECK BEFORE EXPENSIVE OPERATION
                    if not self._is_streaming:
                        logger.critical(f"💀 STREAMING CANCELLED - ABORTING RENDER: {task_id}")
                        break
                        
                    # Generate frame from rendering service - MAKE IT CANCELLABLE!
                    # Run the blocking render_frame() in a thread pool to make it cancellable
                    loop = asyncio.get_event_loop()
                    try:
                        frame_bytes = await asyncio.wait_for(
                            loop.run_in_executor(None, self._rendering_service.render_frame),
                            timeout=0.1  # 100ms timeout for frame rendering
                        )
                    except asyncio.TimeoutError:
                        logger.warning(f"⚠️ Frame rendering timed out - skipping frame")
                        frame_bytes = None
                    except asyncio.CancelledError:
                        logger.critical(f"💀 FRAME RENDERING CANCELLED: {task_id}")
                        break
                
                    if frame_bytes:
                        # THIRD CANCELLATION CHECK BEFORE TRANSMISSION
                        if not self._is_streaming:
                            logger.critical(f"💀 STREAMING CANCELLED - ABORTING TRANSMISSION: {task_id}")
                            break
                            
                        # Encode frame as base64 for WebSocket transmission
                        frame_b64 = base64.b64encode(frame_bytes).decode('utf-8')
                        
                        # Create WebSocket message
                        message = {
                            "type": "video_frame",
                            "data": frame_b64,
                            "timestamp": loop_start,
                            "frame_number": self._frames_sent
                        }
                        
                        # Send frame to all connected clients
                        await self._broadcast_frame(message)
                        
                        # Update statistics
                        self._frames_sent += 1
                        self._bytes_sent += len(frame_bytes)
                    
                    # Frame rate limiting
                    elapsed = asyncio.get_event_loop().time() - loop_start
                    sleep_time = max(0, frame_time - elapsed)
                    
                    if sleep_time > 0:
                        await asyncio.sleep(sleep_time)
                        
                except Exception as e:
                    self._logger.error(f"🚨 Error in frame generation: {e}")
                    await asyncio.sleep(0.1)  # Brief pause before retry
                    
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
    async def handle_client_message(self, websocket: WebSocket, message: Dict[str, Any]) -> None:
        """Handle incoming messages from WebSocket clients."""
        message_type = message.get("type")
        
        if message_type == "ping":
            # Respond to ping with pong, including the mandatory pingId for contract compliance
            await websocket.send_json({
                "type": "pong",
                "timestamp": message.get("timestamp"),
                "pingId": message.get("pingId")
            })
            
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
        """Gracefully stop the streaming loop and disconnect clients."""
        self._logger.critical("🚨 NUCLEAR SHUTDOWN: Forcing termination of StreamingWebService...")
        
        # NUCLEAR OPTION: Force kill ALL streaming tasks globally
        force_kill_all_streaming_tasks()
        
        # Force stop streaming immediately
        self._is_streaming = False
        
        # Cancel the streaming task with maximum force
        if hasattr(self, '_stream_task') and self._stream_task and not self._stream_task.done():
            self._logger.critical(f"� MURDERING STREAMING TASK: {id(self._stream_task)}")
            self._stream_task.cancel()
            try:
                await asyncio.wait_for(self._stream_task, timeout=0.5)  # Reduced timeout
            except (asyncio.CancelledError, asyncio.TimeoutError):
                self._logger.critical("💀 TASK EXECUTION TERMINATED")
        
        # Stop streaming properly
        await self._stop_streaming()
        
        # Force disconnect all clients
        if self._connections:
            self._logger.critical(f"🔌 SEVERING {len(self._connections)} client connections...")
            connections = list(self._connections)
            for websocket in connections:
                try:
                    if websocket.state == websocket.OPEN:
                        await websocket.close()
                except:
                    pass  # Ignore errors during force close
            self._connections.clear()
        
        self._logger.critical("💀 StreamingWebService TERMINATED.")

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
    def connected_clients(self) -> int:
        """Get number of connected clients."""
        return self._connected_clients

    @property
    def is_streaming(self) -> bool:
        """Check if currently streaming."""
        return self._is_streaming