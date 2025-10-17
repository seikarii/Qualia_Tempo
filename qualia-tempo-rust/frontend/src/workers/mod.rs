//! # Responsibility
//! Web Workers for CPU offloading in WASM environment.

pub mod qualia_calculator;

pub use qualia_calculator::{
    QualiaCalculatorCore, QualiaCalculatorConfig, WorkerMessage, WorkerResponse,
    start_qualia_worker,
};
