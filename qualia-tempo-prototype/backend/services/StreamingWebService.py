# QUALIA.CODE v1.1 - StreamingWebService
# WebSocket service for streaming rendered frames to frontend clients

import asyncio
import logging
import base64
from typing import Dict, Any, Set
from fastapi import WebSocket, WebSocketDisconnect
from .EventBus import EventBus
from .RenderingService import RenderingService
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

    @log_execution(level="DEBUG")
    @handle_errors(fallback_return_value=None)
    async def _start_streaming(self) -> None:
        """Start the frame streaming loop."""
        if self._is_streaming:
            return
            
        self._is_streaming = True
        self._stream_task = asyncio.create_task(self._streaming_loop())
        self._logger.info(f"🎥 Started video streaming at {self._target_fps} FPS")

    @log_execution(level="DEBUG")
    @handle_errors(fallback_return_value=None)
    async def _stop_streaming(self) -> None:
        """Stop the frame streaming loop."""
        if not self._is_streaming:
            return
            
        self._is_streaming = False
        
        if self._stream_task and not self._stream_task.done():
            self._stream_task.cancel()
            try:
                await self._stream_task
            except asyncio.CancelledError:
                pass
                
        self._logger.info("🛑 Stopped video streaming")

    @log_execution(level="DEBUG")
    @handle_errors(fallback_return_value=None)
    async def _streaming_loop(self) -> None:
        """Main streaming loop that generates and sends frames to all connected clients."""
        frame_time = 1.0 / self._target_fps
        
        while self._is_streaming and self._connections:
            loop_start = asyncio.get_event_loop().time()
            
            try:
                # Generate frame from rendering service
                frame_bytes = self._rendering_service.render_frame()
                
                if frame_bytes:
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
                self._logger.error(f"🚨 Error in streaming loop: {e}")
                await asyncio.sleep(0.1)  # Brief pause before retry

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
            # Respond to ping with pong
            await websocket.send_json({"type": "pong", "timestamp": message.get("timestamp")})
            
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
        self._logger.info("Shutting down StreamingWebService...")
        await self._stop_streaming()
        
        # Create a copy of connections to iterate over
        connections = list(self._connections)
        for websocket in connections:
            await self.disconnect_client(websocket)
        
        self._logger.info("StreamingWebService shut down.")

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