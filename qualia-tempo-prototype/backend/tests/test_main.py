import pytest
from fastapi.testclient import TestClient
from backend.api.routes import app


@pytest.fixture
def client():
    with TestClient(app) as client:
        yield client


def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["engine"] == "ready"
    assert "architecture" in data
    assert "event_bus_stats" in data
    assert "subscriptions" in data


def test_update_qualia_endpoint(client):
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
    assert "message" in response.json()
