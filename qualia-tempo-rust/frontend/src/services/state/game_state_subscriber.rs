//! # Responsibility
//! Bridges WebSocket messages to EventBus for CombatState distribution (BLUEPRINT #49).
//!
//! ---
//!
//! This service subscribes to WebSocket messages containing CombatState updates
//! and emits them as local GameEvent::CombatStateUpdated events on the frontend
//! EventBus for other services to consume.

use async_broadcast::Receiver;
use shared_core::contracts::CombatState;
use shared_core::events::GameEvent;
use tracing::{debug, error, warn};
use wasm_bindgen_futures::spawn_local;

use crate::services::EventBusService;

/// # Responsibility
/// Subscribes to WebSocket CombatState messages and distributes to local EventBus.
///
/// ---
///
/// Acts as a bridge between WebSocket communication (network layer) and local
/// EventBus (application layer), decoupling networking from game logic.
pub struct GameStateSubscriberService {
    event_bus: EventBusService,
}

impl GameStateSubscriberService {
    /// # Responsibility
    /// Creates a new GameStateSubscriberService.
    ///
    /// # Arguments
    /// - `event_bus`: Frontend EventBusService for local event distribution
    pub fn new(event_bus: EventBusService) -> Self {
        debug!("GameStateSubscriberService initialized");
        Self { event_bus }
    }

    /// # Responsibility
    /// Starts subscribing to a WebSocket message receiver.
    ///
    /// ---
    ///
    /// Spawns a WASM-safe async task that listens for CombatState messages
    /// and emits them as GameEvent::CombatStateUpdated on the local EventBus.
    ///
    /// # Arguments
    /// - `ws_receiver`: Receiver channel for CombatState messages from WebSocket
    pub fn start(&self, mut ws_receiver: Receiver<CombatState>) {
        let event_bus = self.event_bus.clone();

        spawn_local(async move {
            debug!("GameStateSubscriber listening for CombatState updates");

            loop {
                match ws_receiver.recv().await {
                    Ok(combat_state) => {
                        debug!(
                            "Received CombatState: phase={:?}, timestamp={}",
                            combat_state.game_phase, combat_state.timestamp
                        );

                        // Emit to local EventBus
                        let event = GameEvent::CombatStateUpdated {
                            state: combat_state,
                        };
                        
                        match event_bus.emit(event) {
                            Ok(_) => {
                                debug!("CombatState emitted successfully");
                            }
                            Err(e) => {
                                warn!("Failed to emit CombatState: {:?}", e);
                            }
                        }
                    }
                    Err(async_broadcast::RecvError::Closed) => {
                        error!("WebSocket receiver closed, exiting subscriber");
                        break;
                    }
                    Err(async_broadcast::RecvError::Overflowed(skipped)) => {
                        warn!(
                            "WebSocket receiver lagging! Skipped {} messages",
                            skipped
                        );
                        // Continue listening, don't exit on lag
                    }
                }
            }
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use async_broadcast;
    use gloo_timers::future::TimeoutFuture;
    use shared_core::contracts::{BossState, GamePhase, PlayerState, QualiaState};
    use wasm_bindgen_test::*;

    wasm_bindgen_test_configure!(run_in_browser);

    #[wasm_bindgen_test]
    async fn test_subscriber_receives_and_emits() {
        let event_bus = EventBusService::new(100);
        let subscriber = GameStateSubscriberService::new(event_bus.clone());

        // Create WebSocket mock channel
        let (ws_tx, ws_rx) = async_broadcast::broadcast(10);

        // Start subscriber
        subscriber.start(ws_rx);

        // Subscribe to EventBus to verify emission
        let mut event_receiver = event_bus.subscribe();

        // Send CombatState through WebSocket channel
        let combat_state = CombatState {
            game_phase: GamePhase::Playing,
            player: PlayerState::default(),
            boss: BossState::default(),
            qualia: QualiaState::default(),
            timestamp: 1234.0,
            song_position: 0.0,
            song_duration: 180.0,
            score: 0,
            qualia_event_history: Vec::new(),
        };

        ws_tx.broadcast(combat_state.clone()).await.unwrap();

        // Wait for event to propagate
        TimeoutFuture::new(100).await;

        // Verify event was emitted
        match event_receiver.try_recv() {
            Ok(GameEvent::CombatStateUpdated { state: received_state }) => {
                assert_eq!(received_state.timestamp, 1234.0);
                assert_eq!(received_state.game_phase, GamePhase::Playing);
            }
            Ok(other) => panic!("Unexpected event: {:?}", other),
            Err(e) => panic!("Expected CombatStateUpdated event, got error: {:?}", e),
        }
    }

    #[wasm_bindgen_test]
    async fn test_subscriber_handles_multiple_messages() {
        let event_bus = EventBusService::new(100);
        let subscriber = GameStateSubscriberService::new(event_bus.clone());

        let (ws_tx, ws_rx) = async_broadcast::broadcast(10);
        subscriber.start(ws_rx);

        let mut event_receiver = event_bus.subscribe();

        // Send 3 states
        for i in 1..=3 {
            let state = CombatState {
                timestamp: (i as f64) * 100.0,
                ..Default::default()
            };
            ws_tx.broadcast(state).await.unwrap();
        }

        TimeoutFuture::new(150).await;

        // Verify all 3 received
        let mut count = 0;
        while let Ok(GameEvent::CombatStateUpdated { .. }) = event_receiver.try_recv() {
            count += 1;
        }

        assert_eq!(count, 3, "Should receive all 3 CombatState updates");
    }
}
