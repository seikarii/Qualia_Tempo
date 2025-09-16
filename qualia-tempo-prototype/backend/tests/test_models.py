from backend.api.models import QualiaState, QualiaUpdateResponse


def test_qualia_state_creation():
    state = QualiaState(
        intensity=0.8,
        precision=0.5,
        aggression=0.7,
        flow=0.9,
        chaos=0.1,
        recovery=0.0,
        transcendence=0.0,
    )
    assert state.intensity == 0.8
    assert state.precision == 0.5
    assert state.aggression == 0.7
    assert state.flow == 0.9
    assert state.chaos == 0.1
    assert state.recovery == 0.0
    assert state.transcendence == 0.0


def test_qualia_update_response():
    response = QualiaUpdateResponse(status="success", message="Test message")
    assert response.status == "success"
    assert response.message == "Test message"
