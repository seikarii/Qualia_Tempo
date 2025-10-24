//! # Responsibility
//! High-fidelity mocks for all service interfaces using mockall.
//!
//! ---
//!
//! ## Purpose
//! Provides compile-time verified mocks for unit testing services that depend
//! on trait abstractions. All mocks implement Shaku's `Interface` trait for
//! dependency injection compatibility.
//!
//! ## Usage Pattern
//! ```no_run
//! use audio_forge::services::mocks::*;
//! use std::sync::Arc;
//!
//! // Example test function (not executed as doctest)
//! fn test_service_with_mock_logger() {
//!     let mut mock_logger = MockLogger::new();
//!     
//!     // Set expectations
//!     mock_logger.expect_info()
//!         .times(1)
//!         .withf(|msg: &str| msg.contains("success"))
//!         .return_const(());
//!     
//!     // Inject mock into service
//!     // let service = MyService::new(Arc::new(mock_logger));
//!     // service.do_work();
//!     
//!     // mockall automatically verifies expectations on drop
//! }
//! ```
//!
//! ## QUALIA.CODE.RUST Compliance
//! **Section 9.3**: All service traits have corresponding high-fidelity mocks.
//! - Type-safe expectations with mockall
//! - Compile-time verification of signatures
//! - Automatic expectation verification
//! - Zero runtime overhead in production (test-only module)

pub mod mock_audio_analyzer;
pub mod mock_audio_effects;
pub mod mock_audio_exporter;
pub mod mock_audio_player;
pub mod mock_logger;
pub mod mock_multi_channel_output;
pub mod mock_visualization_engine;

// Re-export mocks for convenient importing
pub use mock_audio_analyzer::MockAudioAnalyzer;
pub use mock_audio_effects::MockAudioEffects;
pub use mock_audio_exporter::MockAudioExporter;
pub use mock_audio_player::MockAudioPlayer;
pub use mock_logger::MockLogger;
pub use mock_multi_channel_output::MockMultiChannelOutput;
pub use mock_visualization_engine::MockVisualizationEngine;
