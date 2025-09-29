# QUALIA.CODE v1.1 - ISecurityService Interface
# Decoupled security service for WebSocket authentication

from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
from fastapi import WebSocket


class ISecurityService(ABC):
    """
    Interface for security services managing WebSocket authentication.
    Supports configurable authentication modes for different environments.
    """

    @abstractmethod
    async def verify_connection(self, websocket: WebSocket) -> Optional[Dict[str, Any]]:
        """
        Verify WebSocket connection authentication.
        
        Args:
            websocket: The WebSocket connection to verify
            
        Returns:
            Optional[Dict[str, Any]]: User information if authenticated, None if auth disabled
            
        Raises:
            SecurityException: If authentication fails when enabled
        """
        pass

    @abstractmethod
    def is_auth_enabled(self) -> bool:
        """
        Check if authentication is currently enabled.
        
        Returns:
            bool: True if authentication is required, False otherwise
        """
        pass