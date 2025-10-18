//! # Responsibility
//! Integration tests for #[handle_event] macro expansion.
//!
//! ---
//!
//! Verifies correct code generation and event dispatch logic.

use qualia_macros::handle_event;

// Mock event types for testing
#[derive(Debug, Clone)]
enum TestEvent {
    StateUpdated(TestState),
    PlayerAction(TestAction),
}

#[derive(Debug, Clone)]
struct TestState {
    value: u32,
}

#[derive(Debug, Clone)]
struct TestAction {
    action_type: String,
}

// Mock EventBus interface
struct MockEventBus {
    tx: tokio::sync::broadcast::Sender<TestEvent>,
}

impl MockEventBus {
    fn new() -> Self {
        let (tx, _) = tokio::sync::broadcast::channel(100);
        Self { tx }
    }

    fn subscribe(&self) -> tokio::sync::broadcast::Receiver<TestEvent> {
        self.tx.subscribe()
    }

    fn emit(&self, event: TestEvent) -> Result<usize, tokio::sync::broadcast::error::SendError<TestEvent>> {
        self.tx.send(event)
    }
}

// Mock service using the macro
#[derive(Clone)]
struct TestService {
    event_bus: std::sync::Arc<MockEventBus>,
    counter: std::sync::Arc<std::sync::atomic::AtomicU32>,
}

impl TestService {
    fn new(event_bus: std::sync::Arc<MockEventBus>) -> Self {
        Self {
            event_bus,
            counter: std::sync::Arc::new(std::sync::atomic::AtomicU32::new(0)),
        }
    }

    #[handle_event(TestEvent::StateUpdated)]
    async fn on_state_updated(&self, state: TestState) -> Result<(), anyhow::Error> {
        self.counter.fetch_add(state.value, std::sync::atomic::Ordering::SeqCst);
        Ok(())
    }
}

#[tokio::test]
async fn test_handle_event_receives_matching_events() {
    let event_bus = std::sync::Arc::new(MockEventBus::new());
    let service = TestService::new(event_bus.clone());

    // Start event handler
    let _handle = service.on_state_updated_handler();

    // Give handler time to subscribe
    tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;

    // Emit matching event
    event_bus.emit(TestEvent::StateUpdated(TestState { value: 42 })).ok();

    // Give handler time to process
    tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;

    // Verify handler was called
    let count = service.counter.load(std::sync::atomic::Ordering::SeqCst);
    assert_eq!(count, 42, "Handler should have processed StateUpdated event");
}

#[tokio::test]
async fn test_handle_event_ignores_non_matching_events() {
    let event_bus = std::sync::Arc::new(MockEventBus::new());
    let service = TestService::new(event_bus.clone());

    let _handle = service.on_state_updated_handler();
    tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;

    // Emit non-matching event
    event_bus.emit(TestEvent::PlayerAction(TestAction {
        action_type: "test".to_string(),
    })).ok();

    tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;

    // Verify handler was NOT called
    let count = service.counter.load(std::sync::atomic::Ordering::SeqCst);
    assert_eq!(count, 0, "Handler should ignore non-matching events");
}

#[tokio::test]
async fn test_handle_event_processes_multiple_events() {
    let event_bus = std::sync::Arc::new(MockEventBus::new());
    let service = TestService::new(event_bus.clone());

    let _handle = service.on_state_updated_handler();
    tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;

    // Emit multiple events
    for i in 1..=5 {
        event_bus.emit(TestEvent::StateUpdated(TestState { value: i })).ok();
    }

    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

    // Verify all events processed (1+2+3+4+5 = 15)
    let count = service.counter.load(std::sync::atomic::Ordering::SeqCst);
    assert_eq!(count, 15, "Handler should process all matching events");
}
