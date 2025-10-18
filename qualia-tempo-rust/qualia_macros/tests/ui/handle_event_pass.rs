use qualia_macros::handle_event;

#[derive(Clone)]
struct MockService {
    event_bus: MockEventBus,
}

#[derive(Clone)]
struct MockEventBus;

impl MockEventBus {
    fn subscribe(&self) -> MockReceiver {
        MockReceiver
    }
}

struct MockReceiver;

impl MockReceiver {
    async fn recv(&mut self) -> Result<GameEvent, RecvError> {
        Err(RecvError::Closed)
    }
}

#[derive(Clone)]
struct QualiaState {
    intensity: f32,
}

enum GameEvent {
    QualiaStateUpdated(QualiaState),
}

enum RecvError {
    Lagged(u64),
    Closed,
}

impl MockService {
    #[handle_event(GameEvent::QualiaStateUpdated)]
    async fn on_qualia_update(&self, _state: QualiaState) {
        // Handler implementation
    }
}

fn main() {}
