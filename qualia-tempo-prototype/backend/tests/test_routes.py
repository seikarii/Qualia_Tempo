import pytest
from fastapi.testclient import TestClient
from backend.api.routes import app


@pytest.fixture
def client():
    with TestClient(app) as client:
        yield client


def test_update_qualia(client):
    qualia_data = {
        "intensity": 0.8,
        "focus_level": 0.5,
        "aggression": 0.7,
        "flow": 0.9,
        "chaos": 0.1,
        "recovery": 0.0,
        "transcendence": 0.0,
    }
    response = client.post("/update_qualia", json=qualia_data)
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert data["message"] == "QualiaState processed via EventBus architecture"
    assert data["status"] == "success"


def test_reset_engine(client):
    """Test engine reset endpoint."""
    response = client.post("/reset_engine")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "reset" in data["message"].lower()


def test_get_engine_stats(client):
    """Test engine stats endpoint."""
    response = client.get("/stats")
    assert response.status_code == 200
    data = response.json()
    assert "event_bus" in data
    assert "subscriptions" in data
    assert "particle_parameters" in data
    assert "current_qualia_state" in data
    assert "architecture" in data


def test_root_endpoint(client):
    """Test root endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "Qualia Tempo" in data["message"]
    assert "EventBus" in data["architecture"]
