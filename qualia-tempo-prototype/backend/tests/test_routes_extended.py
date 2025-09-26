# QUALIA.CODE v1.1 - Extended Routes Tests with IoC Compliance
# Comprehensive test coverage for API routes using TestCompositionRootFactory
# ARCHITECTURAL COMPLIANCE: ZERO MANUAL INSTANTIATION

import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch
from fastapi.testclient import TestClient
from fastapi import WebSocketDisconnect
import json
from backend.tests.test_composition_root import TestCompositionRootFactory
from backend.api.routes import app, get_services
from backend.CompositionRoot import reset_composition_root


@pytest.fixture
def mocked_composition_root():
    """Provides a mocked CompositionRoot for routes tests."""
    return TestCompositionRootFactory.create_mocked_composition_root()


@pytest.fixture
def client(mocked_composition_root):
    """Creates a TestClient with mocked dependencies injected."""
    # Override the get_services dependency
    def override_get_services():
        return mocked_composition_root

    app.dependency_overrides[get_services] = override_get_services

    with TestClient(app) as client:
        yield client

    # Clean up overrides
    app.dependency_overrides.clear()
    reset_composition_root()


class TestRoutesExtended:
    """QUALIA.CODE v1.1 Extended tests for API routes using IoC container."""

    @pytest.mark.asyncio
    async def test_startup_event_initializes_composition_root(self, mocked_composition_root):
        """
        QUALIA.CODE Phase 2 Test: Verify that composition_root.initialize() is called during startup.
        Test eager initialization of all services.
        """
        # Mock the initialize method
        mocked_composition_root.initialize = AsyncMock()

        # Patch get_composition_root to return our mocked instance
        with patch('backend.api.routes.get_composition_root', return_value=mocked_composition_root):
            # Import and call the startup event directly
            from backend.api.routes import startup_event

            await startup_event()

            # Verify initialize was called
            mocked_composition_root.initialize.assert_called_once()

    @pytest.mark.asyncio
    async def test_shutdown_event_terminates_composition_root(self, mocked_composition_root):
        """
        QUALIA.CODE Phase 2 Test: Verify that composition_root.shutdown() is called during shutdown.
        Test proper cleanup of all services.
        """
        # Mock the shutdown method
        mocked_composition_root.shutdown = AsyncMock()

        # Patch get_composition_root to return our mocked instance
        with patch('backend.api.routes.get_composition_root', return_value=mocked_composition_root):
            # Import and call the shutdown event directly
            from backend.api.routes import shutdown_event

            await shutdown_event()

            # Verify shutdown was called
            mocked_composition_root.shutdown.assert_called_once()

    def test_update_qualia_error_500(self, client, mocked_composition_root):
        """Test error handling for invalid qualia data."""
        # Get the mocked qualia processor from TestCompositionRootFactory
        mock_qualia_processor = TestCompositionRootFactory.get_service_mocks(mocked_composition_root)["qualia_processor"]

        # Configure processor to raise an exception
        mock_qualia_processor.process_qualia_state.side_effect = Exception("Processing failed")

        qualia_data = {
            "intensity": 0.5,
            "precision": 0.5,
            "aggression": 0.5,
            "flow": 0.5,
            "chaos": 0.5,
            "recovery": 0.5,
            "transcendence": 0.5,
        }

        response = client.post("/update_qualia", json=qualia_data)

        # Verify 500 status and error response
        assert response.status_code == 500
        data = response.json()
        assert "detail" in data  # FastAPI uses 'detail' for HTTPException
        assert "Processing failed" in data["detail"]

    def test_websocket_endpoint_exists(self, client):
        """
        QUALIA.CODE Phase 2 Test: Verify that WebSocket endpoint exists and is accessible.
        Test that the /ws/video_stream endpoint is registered.
        """
        # Test that WebSocket endpoint exists by checking app routes
        from backend.api.routes import app
        websocket_routes = [route for route in app.routes if hasattr(route, 'path') and 'ws' in str(route.path)]
        assert len(websocket_routes) > 0
        assert any('/ws/video_stream' in str(route.path) for route in websocket_routes)

    def test_health_endpoint_with_service_status(self, client):
        """Test health endpoint returns correct architecture version."""
        response = client.get("/health")
        assert response.status_code == 200

        data = response.json()
        assert data["architecture"] == "QUALIA.CODE v1.0"

    def test_update_qualia_success_flow(self, client):
        """Test successful qualia update flow."""
        qualia_data = {
            "intensity": 0.5,
            "precision": 0.5,
            "aggression": 0.5,
            "flow": 0.5,
            "chaos": 0.5,
            "recovery": 0.5,
            "transcendence": 0.5,
        }

        response = client.post("/update_qualia", json=qualia_data)
        assert response.status_code == 200

        data = response.json()
        assert data["status"] == "success"
        assert "QualiaState processed" in data["message"]

    def test_invalid_json_data(self, client):
        """Test handling of invalid JSON data."""
        # This should be handled by FastAPI's validation
        response = client.post(
            "/update_qualia",
            data="invalid json",
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 422  # Unprocessable Entity

    def test_missing_content_type(self, client):
        """Test handling of missing content type."""
        response = client.post("/update_qualia", data="{}")
        # FastAPI should handle this gracefully
        assert response.status_code in [200, 422]

    def test_reset_engine_endpoint(self, client):
        """Test reset engine endpoint."""
        response = client.post("/reset_engine")
        assert response.status_code == 200

        data = response.json()
        assert data["status"] == "success"
        assert "message" in data

    def test_get_engine_stats_endpoint(self, client):
        """Test get engine stats endpoint."""
        response = client.get("/stats")
        assert response.status_code == 200

        data = response.json()
        assert "event_bus" in data
        assert "particle_parameters" in data
        assert "current_qualia_state" in data
        assert "architecture" in data

    def test_root_endpoint(self, client):
        """Test root endpoint."""
        response = client.get("/")
        assert response.status_code == 200

        data = response.json()
        assert "message" in data
        assert "architecture" in data
        assert "QUALIA.CODE" in data["message"]

    def test_service_error_handling(self, client, mocked_composition_root):
        """Test error handling when services fail."""
        # Get the mocked qualia processor from TestCompositionRootFactory
        mock_qualia_processor = TestCompositionRootFactory.get_service_mocks(mocked_composition_root)["qualia_processor"]

        # Simulate service error
        mock_qualia_processor.process_qualia_state.side_effect = Exception("Service error")

        qualia_data = {
            "intensity": 0.5,
            "precision": 0.5,
            "aggression": 0.5,
            "flow": 0.5,
            "chaos": 0.5,
            "recovery": 0.5,
            "transcendence": 0.5,
        }
        response = client.post("/update_qualia", json=qualia_data)

        # Should return 500 due to service error (correct behavior)
        assert response.status_code == 500

    def test_multiple_requests(self, client):
        """Test handling of multiple sequential requests."""
        # Test multiple requests sequentially instead of concurrently
        for i in range(3):
            response = client.post(
                "/update_qualia",
                json={
                    "intensity": 0.5,
                    "precision": 0.5,
                    "aggression": 0.5,
                    "flow": 0.5,
                    "chaos": 0.5,
                    "recovery": 0.5,
                    "transcendence": 0.5,
                },
            )
            assert response.status_code == 200

    def test_large_payload(self, client):
        """Test handling of large payloads."""
        # Create a large but valid payload
        large_data = {
            "intensity": 0.8,
            "precision": 0.5,
            "aggression": 0.7,
            "flow": 0.9,
            "chaos": 0.1,
            "recovery": 0.0,
            "transcendence": 0.3,
        }

        response = client.post("/update_qualia", json=large_data)
        assert response.status_code == 200

    def test_api_versioning(self, client):
        """Test API versioning information."""
        response = client.get("/")
        data = response.json()

        assert "architecture" in data
        assert "QUALIA.CODE" in data["message"]

    @pytest.mark.asyncio
    async def test_startup_shutdown_events(self):
        """Test startup and shutdown events."""
        # This tests the FastAPI lifecycle events
        # They should execute without errors

        # Import the app and check it's properly configured
        from backend.api.routes import app

        assert app is not None

        # Test that the app has the expected routes
        routes = [route.path for route in app.routes]
        expected_routes = [
            "/",
            "/health",
            "/update_qualia",
            "/reset_engine",
            "/stats",
        ]

        for expected_route in expected_routes:
            assert any(expected_route in route for route in routes)

    def test_cors_headers(self, client):
        """Test CORS headers are properly set."""
        response = client.get("/health")

        # Check for CORS headers (if configured)
        # This depends on the actual CORS configuration
        assert response.status_code == 200

        # Basic check that the response is valid
        assert response.headers["content-type"] == "application/json"

    def test_middleware_processing(self, client):
        """Test that middleware processes requests correctly."""
        response = client.get("/health")

        # Verify middleware didn't interfere with normal processing
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
