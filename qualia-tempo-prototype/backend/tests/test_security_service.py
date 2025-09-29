# QUALIA.CODE v1.1 - SecurityService Tests
# ARCHITECTURAL COMPLIANCE: IoC Container Resolution & Configurable Authentication

import pytest
from unittest.mock import AsyncMock, Mock
from fastapi import WebSocket
from backend.tests.test_composition_root import TestCompositionRootFactory
from backend.services.exceptions import SecurityException


@pytest.fixture
def mocked_composition_root():
    """Provides a mocked CompositionRoot for SecurityService tests."""
    return TestCompositionRootFactory.create_mocked_composition_root()


@pytest.fixture
def security_service(mocked_composition_root):
    """Resolves the SecurityService from the container."""
    return mocked_composition_root.get_service("security_service")


@pytest.fixture
def mock_websocket():
    """Creates a mock WebSocket for testing."""
    websocket = Mock(spec=WebSocket)
    websocket.url = Mock()
    websocket.url.query = ""
    return websocket


class TestSecurityService:
    """Test suite for SecurityService using IoC fixtures."""

    def test_security_service_initialization(self, security_service):
        """Test that SecurityService initializes correctly."""
        assert security_service is not None
        assert hasattr(security_service, 'verify_connection')
        assert hasattr(security_service, 'is_auth_enabled')

    def test_auth_disabled_by_default(self, security_service):
        """Test that authentication is disabled by default in test configuration."""
        assert security_service.is_auth_enabled() is False

    @pytest.mark.asyncio
    async def test_verify_connection_auth_disabled(self, security_service, mock_websocket):
        """Test connection verification when authentication is disabled."""
        # Configure websocket URL
        mock_websocket.url.query = ""

        # Verify connection
        result = await security_service.verify_connection(mock_websocket)

        # Assert anonymous user is returned
        assert result is not None
        assert result["user"] == "anonymous"
        assert result["auth_disabled"] is True

    @pytest.mark.asyncio
    async def test_verify_connection_auth_enabled_valid_token(self, security_service, mock_websocket):
        """Test connection verification when authentication is enabled with valid token."""
        # Enable authentication by modifying config
        security_service._config["security"]["websockets"]["auth_enabled"] = True
        security_service._auth_enabled = True

        # Configure websocket with valid token
        mock_websocket.url.query = "token=valid-test-token"

        # Mock the token validation to return success
        original_validate = security_service._validate_token
        security_service._validate_token = AsyncMock(return_value={
            "user": "test_user",
            "token": "valid-test-token",
            "authenticated": True
        })

        try:
            # Verify connection
            result = await security_service.verify_connection(mock_websocket)

            # Assert authenticated user is returned
            assert result is not None
            assert result["user"] == "test_user"
            assert result["authenticated"] is True
            assert result["token"] == "valid-test-token"

            # Verify token validation was called
            security_service._validate_token.assert_called_once_with("valid-test-token")

        finally:
            # Restore original method
            security_service._validate_token = original_validate

    @pytest.mark.asyncio
    async def test_verify_connection_auth_enabled_no_token(self, security_service, mock_websocket):
        """Test connection verification when authentication is enabled but no token provided."""
        # Enable authentication
        security_service._config["security"]["websockets"]["auth_enabled"] = True
        security_service._auth_enabled = True

        # Configure websocket without token
        mock_websocket.url.query = ""

        # Verify connection raises SecurityException
        with pytest.raises(SecurityException) as exc_info:
            await security_service.verify_connection(mock_websocket)

        assert "No authentication token provided" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_verify_connection_auth_enabled_invalid_token(self, security_service, mock_websocket):
        """Test connection verification when authentication is enabled with invalid token."""
        # Enable authentication
        security_service._config["security"]["websockets"]["auth_enabled"] = True
        security_service._auth_enabled = True

        # Configure websocket with invalid token
        mock_websocket.url.query = "token=invalid-token"

        # Mock token validation to raise exception
        original_validate = security_service._validate_token
        security_service._validate_token = AsyncMock(side_effect=SecurityException("Invalid token"))

        try:
            # Verify connection raises SecurityException
            with pytest.raises(SecurityException) as exc_info:
                await security_service.verify_connection(mock_websocket)

            assert "Invalid token" in str(exc_info.value)

            # Verify token validation was called
            security_service._validate_token.assert_called_once_with("invalid-token")

        finally:
            # Restore original method
            security_service._validate_token = original_validate

    @pytest.mark.asyncio
    async def test_verify_connection_token_from_query_params(self, security_service, mock_websocket):
        """Test that token is correctly extracted from query parameters."""
        # Enable authentication
        security_service._config["security"]["websockets"]["auth_enabled"] = True
        security_service._auth_enabled = True

        # Configure websocket with token in query params
        mock_websocket.url.query = "other_param=value&token=my-test-token&another=param"

        # Mock successful token validation
        original_validate = security_service._validate_token
        security_service._validate_token = AsyncMock(return_value={
            "user": "query_user",
            "token": "my-test-token",
            "authenticated": True
        })

        try:
            # Verify connection
            result = await security_service.verify_connection(mock_websocket)

            # Assert token was extracted correctly
            assert result["token"] == "my-test-token"
            security_service._validate_token.assert_called_once_with("my-test-token")

        finally:
            # Restore original method
            security_service._validate_token = original_validate

    def test_is_auth_enabled_reflects_config(self, security_service):
        """Test that is_auth_enabled correctly reflects configuration changes."""
        # Initially disabled
        assert security_service.is_auth_enabled() is False

        # Enable authentication
        security_service._config["security"]["websockets"]["auth_enabled"] = True
        security_service._auth_enabled = True

        assert security_service.is_auth_enabled() is True

        # Disable again
        security_service._config["security"]["websockets"]["auth_enabled"] = False
        security_service._auth_enabled = False

        assert security_service.is_auth_enabled() is False

    @pytest.mark.asyncio
    async def test_token_validation_success(self, security_service):
        """Test successful token validation."""
        # Test valid tokens
        result = await security_service._validate_token("dev-token")
        assert result["user"] == "user_ev-token"  # Last 8 chars of "dev-token"
        assert result["token"] == "dev-token"
        assert result["authenticated"] is True

        # Test another valid token
        result2 = await security_service._validate_token("valid-test")
        assert result2["user"] == "user_lid-test"  # Last 8 chars of "valid-test"
        assert result2["token"] == "valid-test"
        assert result2["authenticated"] is True

    @pytest.mark.asyncio
    async def test_token_validation_failure(self, security_service):
        """Test token validation failure."""
        with pytest.raises(SecurityException) as exc_info:
            await security_service._validate_token("invalid-token")

        assert "Invalid authentication token" in str(exc_info.value)

    def test_security_service_config_structure(self, security_service):
        """Test that SecurityService has proper configuration structure."""
        config = security_service._config

        # Verify security config exists
        assert "security" in config
        assert "websockets" in config["security"]
        assert "auth_enabled" in config["security"]["websockets"]

        # Verify auth_enabled is boolean
        assert isinstance(config["security"]["websockets"]["auth_enabled"], bool)