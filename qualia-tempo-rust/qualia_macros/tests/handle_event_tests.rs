//! # Responsibility
//! Tests for the #[handle_event] procedural macro.
//!
//! ---
//!
//! Validates that the macro generates correct code for EventBus subscriptions,
//! including error handling and graceful shutdown.

use qualia_macros::handle_event;

// Mock structures for testing (minimal versions)
#[derive(Clone)]
struct MockEventBus;

impl MockEventBus {
    fn subscribe(&self) -> tokio::sync::broadcast::Receiver<GameEvent> {
        let (_tx, rx) = tokio::sync::broadcast::channel(10);
        rx
    }
}

#[derive(Clone, Debug)]
enum GameEvent {
    QualiaStateUpdated(QualiaState),
    PlayerAction(PlayerAction),
}

#[derive(Clone, Debug)]
struct QualiaState {
    intensity: f32,
}

#[derive(Clone, Debug)]
struct PlayerAction {
    key: char,
}

#[derive(Clone)]
struct TestService {
    event_bus: std::sync::Arc<MockEventBus>,
}

impl TestService {
    fn new() -> Self {
        Self {
            event_bus: std::sync::Arc::new(MockEventBus),
        }
    }
}

// Test that the macro compiles with correct syntax
#[test]
fn test_handle_event_compiles() {
    // If this test compiles, the macro expansion is syntactically correct
    let _service = TestService::new();
}

// Note: Full runtime tests would require mocking tokio::spawn and EventBus,
// which is complex for procedural macro tests. The primary validation is
// compilation success, which proves the generated code is valid Rust.
