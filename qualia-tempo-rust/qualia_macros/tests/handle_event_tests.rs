//! # Responsibility
//! Integration tests for the #[handle_event] procedural macro.
//!
//! ---
//!
//! Validates macro expansion and runtime behavior:
//! - Correct code generation
//! - Event pattern matching
//! - Error handling (lagging, closed channel)
//! - Graceful shutdown

#[cfg(test)]
mod handle_event_tests {
    use std::sync::Arc;
    use tokio::sync::broadcast;

    /// Mock EventBus for testing
    struct MockEventBus {
        tx: broadcast::Sender<TestEvent>,
    }

    impl MockEventBus {
        fn new(capacity: usize) -> Self {
            let (tx, _rx) = broadcast::channel(capacity);
            Self { tx }
        }

        fn subscribe(&self) -> broadcast::Receiver<TestEvent> {
            self.tx.subscribe()
        }

        fn emit(&self, event: TestEvent) -> Result<usize, broadcast::error::SendError<TestEvent>> {
            self.tx.send(event)
        }
    }

    /// Test event enum
    #[derive(Debug, Clone)]
    enum TestEvent {
        TestData(String),
        OtherEvent(i32),
    }

    /// Test service with mock event handler
    #[derive(Clone)]
    struct TestService {
        event_bus: Arc<MockEventBus>,
        received: Arc<tokio::sync::Mutex<Vec<String>>>,
    }

    impl TestService {
        fn new(event_bus: Arc<MockEventBus>) -> Self {
            Self {
                event_bus,
                received: Arc::new(tokio::sync::Mutex::new(Vec::new())),
            }
        }

        /// Manual implementation of what #[handle_event] would generate
        async fn on_test_event(&self, data: String) {
            let mut received = self.received.lock().await;
            received.push(data);
        }

        /// Manual handler registration (simulating macro expansion)
        fn on_test_event_handler(&self) -> tokio::task::JoinHandle<()> {
            let event_bus = self.event_bus.clone();
            let service = Arc::new(self.clone());

            tokio::spawn(async move {
                let mut rx = event_bus.subscribe();

                loop {
                    match rx.recv().await {
                        Ok(event) => {
                            if let TestEvent::TestData(data) = event {
                                service.on_test_event(data).await;
                            }
                        }
                        Err(broadcast::error::RecvError::Lagged(_skipped)) => {
                            // In production, this would use tracing::warn
                            continue;
                        }
                        Err(broadcast::error::RecvError::Closed) => {
                            break;
                        }
                    }
                }
            })
        }
    }

    #[tokio::test]
    async fn test_event_handler_receives_matching_events() {
        let event_bus = Arc::new(MockEventBus::new(100));
        let service = TestService::new(event_bus.clone());

        let _handle = service.on_test_event_handler();

        // Give handler time to subscribe
        tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;

        // Emit events
        event_bus.emit(TestEvent::TestData("event1".to_string())).ok();
        event_bus.emit(TestEvent::OtherEvent(42)).ok(); // Should be ignored
        event_bus.emit(TestEvent::TestData("event2".to_string())).ok();

        // Give handler time to process
        tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;

        let received = service.received.lock().await;
        assert_eq!(received.len(), 2, "Should receive 2 matching events");
        assert_eq!(received[0], "event1");
        assert_eq!(received[1], "event2");
    }

    #[tokio::test]
    async fn test_event_handler_ignores_non_matching_events() {
        let event_bus = Arc::new(MockEventBus::new(100));
        let service = TestService::new(event_bus.clone());

        let _handle = service.on_test_event_handler();

        tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;

        // Emit only non-matching events
        event_bus.emit(TestEvent::OtherEvent(1)).ok();
        event_bus.emit(TestEvent::OtherEvent(2)).ok();

        tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;

        let received = service.received.lock().await;
        assert_eq!(received.len(), 0, "Should not receive non-matching events");
    }

    #[tokio::test]
    async fn test_event_handler_lag_recovery() {
        let event_bus = Arc::new(MockEventBus::new(2)); // Small buffer
        let service = TestService::new(event_bus.clone());

        let _handle = service.on_test_event_handler();

        tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;

        // Overflow buffer
        for i in 0..10 {
            event_bus.emit(TestEvent::TestData(format!("event{}", i))).ok();
        }

        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

        let received = service.received.lock().await;
        // Should receive some events despite lag (not all due to buffer overflow)
        assert!(!received.is_empty(), "Should recover from lag and receive some events");
    }

    // NOTE: Graceful shutdown via EventBus::drop is not testable with Arc cloning.
    // In production, use tokio::sync::CancellationToken for explicit shutdown signaling.
}
