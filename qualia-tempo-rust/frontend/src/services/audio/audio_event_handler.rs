//! # Responsibility
//! Bridges EventBus to AudioService for PlayGenerativeNote events.
//!
//! ---
//!
//! Subscribes to GameEvent::PlayGenerativeNote and forwards to AudioService
//! for synthesis. Implements the event-driven audio architecture from MUSIC.RUST.md.

use super::AudioService;
use crate::services::event_bus::EventBusService;
use anyhow::Result;
use shared_core::events::GameEvent;
use tracing::{debug, error, info, instrument};
use wasm_bindgen_futures::spawn_local;

/// # Responsibility
/// Handles audio-related events from EventBus.
///
/// ---
///
/// Spawns async task to listen for PlayGenerativeNote events and
/// forwards them to AudioService for 8D spatial synthesis.
#[derive(Clone)]
pub struct AudioEventHandlerService {
    audio_service: AudioService,
    event_bus: EventBusService,
}

impl AudioEventHandlerService {
    /// # Responsibility
    /// Creates new AudioEventHandlerService.
    pub fn new(audio_service: AudioService, event_bus: EventBusService) -> Self {
        Self {
            audio_service,
            event_bus,
        }
    }

    /// # Responsibility
    /// Starts listening for audio events.
    ///
    /// ---
    ///
    /// Spawns a WASM-friendly async task that subscribes to EventBus
    /// and processes PlayGenerativeNote events.
    #[instrument(skip(self))]
    pub fn start(&self) -> Result<()> {
        info!("Starting AudioEventHandlerService");

        let audio_service = self.audio_service.clone();
        let mut receiver = self.event_bus.subscribe();

        spawn_local(async move {
            info!("AudioEventHandler task spawned, listening for events");

            loop {
                match receiver.recv().await {
                    Ok(GameEvent::PlayGenerativeNote { note }) => {
                        debug!("Received PlayGenerativeNote event: {:?}", note);

                        if let Err(e) = audio_service.play_generative_note(&note) {
                            error!("Failed to play note: {:?}", e);
                        }
                    }
                    Ok(_) => {
                        // Ignore other event types
                    }
                    Err(async_broadcast::RecvError::Closed) => {
                        info!("EventBus closed, stopping AudioEventHandler");
                        break;
                    }
                    Err(async_broadcast::RecvError::Overflowed(skipped)) => {
                        error!("AudioEventHandler lagged, skipped {} events", skipped);
                        // Continue processing - some audio events were lost but system recovers
                    }
                }
            }

            info!("AudioEventHandler task terminated");
        });

        info!("AudioEventHandlerService started successfully");
        Ok(())
    }

    /// # Responsibility
    /// Stops the audio event handler.
    ///
    /// ---
    ///
    /// Note: Due to WASM limitations, we can't directly cancel spawn_local tasks.
    /// The task will terminate when EventBus is dropped.
    pub fn stop(&self) {
        info!("AudioEventHandlerService stop requested (task will terminate when EventBus drops)");
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use shared_core::events::audio_events::PlayGenerativeNote;
    use shared_core::utils::Vec2;
    use wasm_bindgen_test::*;

    wasm_bindgen_test_configure!(run_in_browser);

    #[wasm_bindgen_test]
    async fn test_audio_event_handler_receives_note() {
        let event_bus = EventBusService::new(100);
        let audio_service = AudioService::new().expect("AudioService creation should succeed");
        let handler = AudioEventHandlerService::new(audio_service.clone(), event_bus.clone());

        handler.start().expect("Handler start should succeed");

        // Give task time to spawn
        gloo_timers::future::TimeoutFuture::new(10).await;

        let note = PlayGenerativeNote {
            note_pitch: 60,
            velocity: 100,
            instrument_patch_id: "test".to_string(),
            position: Vec2::new(0.0, 0.0),
            duration_sec: Some(0.1),
        };

        let event = GameEvent::PlayGenerativeNote { note };

        event_bus.emit(event).expect("Emit should succeed");

        // Give time for event processing
        gloo_timers::future::TimeoutFuture::new(50).await;

        // If we reach here without panic, the test passed
        // (Note: Actual audio playback can't be easily verified in tests)
    }
}
