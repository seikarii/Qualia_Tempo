//! # Responsibility
//! Web Worker bridges for CPU-intensive calculations (ARCHITECTURE.RUST §3.1).
//!
//! ---
//!
//! Provides worker communication bridges for offloading intensive computations
//! from the main thread (e.g., QualiaState calculation, particle physics).

pub mod qualia_calculator;
pub mod bridge;

pub use qualia_calculator::QualiaCalculatorWorker;
pub use bridge::WorkerBridge;
