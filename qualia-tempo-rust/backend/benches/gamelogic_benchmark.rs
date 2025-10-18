//! # Responsibility
//! Performance benchmarks for `GameLogicService`.
//!
//! ---
//!
//! Measures throughput and latency of core game logic operations.

use backend::services::core::{EventBusService, QualiaLogger};
use backend::services::gameplay::{GameLogicService, QualiaValidatorService};
use backend::services::audio::HarmonyAnalysisService;
use criterion::{black_box, criterion_group, criterion_main, Criterion, BenchmarkId};
use shared_core::contracts::{PlayerAction, QualiaState};
use shared_core::traits::IGameLogicService;
use shaku::{module, HasComponent};
use std::sync::Arc;
use tokio::runtime::Runtime;

module! {
    BenchModule {
        components = [
            EventBusService,
            QualiaLogger,
            GameLogicService,
            QualiaValidatorService,
            HarmonyAnalysisService,
        ],
        providers = []
    }
}

fn create_bench_container() -> BenchModule {
    BenchModule::builder().build()
}

fn bench_process_single_action(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();
    let container = create_bench_container();
    let game_logic: Arc<dyn IGameLogicService> = container.resolve();
    
    c.bench_function("process_single_action", |b| {
        b.to_async(&rt).iter(|| async {
            let action = PlayerAction::KeyPressed {
                key: 'Q',
                timestamp: 1000.0,
                accuracy: 0.85,
            };
            
            let qualia = QualiaState {
                intensity: 0.7,
                precision: 0.85,
                aggression: 0.5,
                flow: 0.8,
                chaos: 0.2,
                recovery: 0.0,
                transcendence: 0.0,
                collection_window_end: 2000.0,
            };
            
            black_box(
                game_logic
                    .process_action(action, qualia)
                    .await
                    .expect("Failed to process action")
            )
        });
    });
}

fn bench_process_action_burst(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();
    
    let mut group = c.benchmark_group("process_action_burst");
    
    for burst_size in &[10, 50, 100, 500] {
        group.bench_with_input(
            BenchmarkId::from_parameter(burst_size),
            burst_size,
            |b, &burst_size| {
                let container = create_bench_container();
                let game_logic: Arc<dyn IGameLogicService> = container.resolve();
                
                b.to_async(&rt).iter(|| async {
                    for i in 0..burst_size {
                        let action = PlayerAction::KeyPressed {
                            key: 'Q',
                            timestamp: f64::from(i).mul_add(10.0, 1000.0),
                            accuracy: 0.8,
                        };
                        
                        let qualia = QualiaState {
                            intensity: 0.6,
                            precision: 0.8,
                            aggression: 0.4,
                            flow: 0.75,
                            chaos: 0.25,
                            recovery: 0.0,
                            transcendence: 0.0,
                            collection_window_end: 2000.0,
                        };
                        
                        black_box(
                            game_logic
                                .process_action(action, qualia)
                                .await
                                .expect("Failed")
                        );
                    }
                });
            },
        );
    }
    
    group.finish();
}

fn bench_qualia_state_validation(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();
    let container = create_bench_container();
    let game_logic: Arc<dyn IGameLogicService> = container.resolve();
    
    c.bench_function("qualia_validation_with_clamping", |b| {
        b.to_async(&rt).iter(|| async {
            let action = PlayerAction::KeyPressed {
                key: 'Q',
                timestamp: 1000.0,
                accuracy: 0.9,
            };
            
            // Intentionally out-of-bounds to test clamping
            let invalid_qualia = QualiaState {
                intensity: 1.5,
                precision: 1.2,
                aggression: -0.1,
                flow: 0.8,
                chaos: 0.3,
                recovery: 0.0,
                transcendence: 0.0,
                collection_window_end: 2000.0,
            };
            
            black_box(
                game_logic
                    .process_action(action, invalid_qualia)
                    .await
                    .expect("Validation failed")
            )
        });
    });
}

criterion_group!(
    benches,
    bench_process_single_action,
    bench_process_action_burst,
    bench_qualia_state_validation
);
criterion_main!(benches);
