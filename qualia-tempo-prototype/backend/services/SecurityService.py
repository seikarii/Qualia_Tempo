# QUALIA.CODE v1.1 - SecurityService Implementation
# Configurable authentication service for WebSocket connections

from typing import Optional, Dict, Any
from fastapi import WebSocket
from urllib.parse import parse_qs
from .interfaces.ISecurityService import ISecurityService
from .interfaces.ISystemEnvironmentService import ISystemEnvironmentService
from .interfaces.ILogger import ILogger
from .contracts.ISecurityService_contracts import SecurityConfig
from .exceptions import SecurityException
from ..utils.decorators import log_execution, handle_errors


class SecurityService(ISecurityService):
    """
    Configurable security service for WebSocket authentication.
    Supports disabled authentication for development/testing environments.
    
    QUALIA.CODE v1.1: Uses injected ILogger, SecurityConfig, and ISystemEnvironmentService.
    """

    def __init__(
        self, 
        config: SecurityConfig, 
        env_service: ISystemEnvironmentService,
        logger: ILogger
    ) -> None:
        """
        Initialize SecurityService with dependency injection.
        
        Args:
            config: Service configuration
            env_service: Injected SystemEnvironmentService for environment access
            logger: Injected logger service
        """
        self._config = config
        self._auth_enabled = config.auth_enabled
        self._env_service = env_service
        self._logger = logger
        
        self._logger.info(f"SecurityService initialized with auth_enabled={self._auth_enabled}")

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
            self._logger.info("Authentication disabled - allowing connection")
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
            self._logger.info(f"User authenticated successfully: {user_info.get('user', 'unknown')}")
            return user_info

        except Exception as e:
            self._logger.error(f"Authentication failed: {e}")
            raise SecurityException(f"Authentication failed: {str(e)}")

    @log_execution()
    def is_auth_enabled(self) -> bool:
        """
        Check if authentication is currently enabled.
        
        Returns:
            bool: True if authentication is required, False otherwise
        """
        return bool(self._auth_enabled)

    async def _validate_token(self, token: str) -> Dict[str, Any]:
        """
        Validate authentication token using JWT or environment-based validation.
        
        Args:
            token: Authentication token to validate
            
        Returns:
            Dict[str, Any]: User information if token is valid
            
        Raises:
            SecurityException: If token is invalid
        """
        # QUALIA.CODE §4: Use injected SystemEnvironmentService instead of direct os.getenv
        auth_method = self._env_service.get_env("AUTH_METHOD", "jwt")
        
        if auth_method == "jwt":
            return await self._validate_jwt_token(token)
        elif auth_method == "env_token":
            return await self._validate_env_token(token)
        else:
            raise SecurityException(f"Unknown authentication method: {auth_method}")
    
    async def _validate_jwt_token(self, token: str) -> Dict[str, Any]:
        """Validate JWT token (requires PyJWT)."""
        try:
            import jwt
            
            # QUALIA.CODE §4: Use injected SystemEnvironmentService
            secret_key = self._env_service.get_env("JWT_SECRET_KEY")
            if not secret_key:
                raise SecurityException("JWT_SECRET_KEY not configured")
            
            payload = jwt.decode(token, secret_key, algorithms=["HS256"])
            
            return {
                "user": payload.get("sub", "unknown"),
                "token": token,
                "authenticated": True,
                "jwt_payload": payload
            }
        except ImportError:
            raise SecurityException("JWT authentication requires PyJWT library")
        except jwt.InvalidTokenError as e:
            raise SecurityException(f"Invalid JWT token: {str(e)}")
    
    async def _validate_env_token(self, token: str) -> Dict[str, Any]:
        """Validate token against environment variable."""
        # QUALIA.CODE §4: Use injected SystemEnvironmentService
        valid_tokens_str = self._env_service.get_env("VALID_TOKENS", "")
        if valid_tokens_str is None:
            valid_tokens_str = ""
        valid_tokens = valid_tokens_str.split(",")
        valid_tokens = [t.strip() for t in valid_tokens if t.strip()]
        
        if not valid_tokens:
            raise SecurityException("No valid tokens configured in VALID_TOKENS environment variable")
        
        if token in valid_tokens:
            return {
                "user": f"env_user_{token[-8:]}",
                "token": token,
                "authenticated": True
            }
        
        raise SecurityException(f"Invalid authentication token")