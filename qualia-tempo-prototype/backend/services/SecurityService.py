# QUALIA.CODE v1.1 - SecurityService Implementation
# Configurable authentication service for WebSocket connections

import logging
from typing import Optional, Dict, Any
from fastapi import WebSocket
from urllib.parse import parse_qs
from .interfaces.ISecurityService import ISecurityService
from .exceptions import SecurityException
from ..utils.decorators import log_execution, handle_errors

logger = logging.getLogger(__name__)


class SecurityService(ISecurityService):
    """
    Configurable security service for WebSocket authentication.
    Supports disabled authentication for development/testing environments.
    """

    def __init__(self, config: Dict[str, Any]) -> None:
        """
        Initialize SecurityService with configuration.
        
        Args:
            config: Configuration dictionary containing security settings
        """
        self._config = config
        self._security_config = config.get("security", {})
        self._websocket_config = self._security_config.get("websockets", {})
        self._auth_enabled = self._websocket_config.get("auth_enabled", False)
        
        logger.info(f"SecurityService initialized with auth_enabled={self._auth_enabled}")

    @log_execution()
    @handle_errors()
    async def verify_connection(self, websocket: WebSocket) -> Optional[Dict[str, Any]]:
        """
        Verify WebSocket connection authentication based on configuration.
        
        Args:
            websocket: The WebSocket connection to verify
            
        Returns:
            Optional[Dict[str, Any]]: User information if authenticated, None if auth disabled
            
        Raises:
            SecurityException: If authentication fails when enabled
        """
        if not self._auth_enabled:
            logger.info("Authentication disabled - allowing connection")
            return {"user": "anonymous", "auth_disabled": True}

        # Authentication is enabled - check for token
        try:
            # Extract token from query parameters
            query_string = websocket.url.query
            query_params = parse_qs(query_string)
            
            token = query_params.get("token", [None])[0]
            if not token:
                raise SecurityException("No authentication token provided", {
                    "required": True,
                    "url": str(websocket.url)
                })

            # Validate token (simple validation for now)
            user_info = await self._validate_token(token)
            logger.info(f"User authenticated successfully: {user_info.get('user', 'unknown')}")
            return user_info

        except Exception as e:
            logger.error(f"Authentication failed: {e}")
            raise SecurityException(f"Authentication failed: {str(e)}")

    def is_auth_enabled(self) -> bool:
        """
        Check if authentication is currently enabled.
        
        Returns:
            bool: True if authentication is required, False otherwise
        """
        return self._auth_enabled

    async def _validate_token(self, token: str) -> Dict[str, Any]:
        """
        Validate authentication token.
        
        Args:
            token: Authentication token to validate
            
        Returns:
            Dict[str, Any]: User information if token is valid
            
        Raises:
            SecurityException: If token is invalid
        """
        # Simple token validation - in production this would check against a database/JWT
        if token == "dev-token" or token.startswith("valid-"):
            return {
                "user": f"user_{token[-8:]}",
                "token": token,
                "authenticated": True
            }
        
        raise SecurityException(f"Invalid authentication token: {token[:8]}...")