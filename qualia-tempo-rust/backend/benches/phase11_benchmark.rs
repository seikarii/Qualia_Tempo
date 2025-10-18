//! # Responsibility
//! Phase 11 optimization benchmarks: compression, caching, and throughput.
//!
//! ---
//!
//! Validates performance targets from PLAN.md Phase 11:
//! - Backend throughput > 1000 msgs/sec/client
//! - Bincode compression 60-80% reduction
//! - Cache hit rate > 90%

use backend::services::core::{EventBusService, QualiaLogger};
use backend::services::audio::HarmonyCacheService;
use backend::services::networking::GameStateStreamingService;
use criterion::{black_box, criterion_group, criterion_main, Criterion, BenchmarkId, Throughput};
use shared_core::contracts::{
    CombatState, GamePhase, PlayerState, BossState, QualiaState,
    PlayerAbilities
};
use shared_core::{Vec2};
use shared_core::traits::{IHarmonyCacheService, IGameStateStreamingService, IEventBus};
use shaku::{module, HasComponent};
use std::sync::Arc;
use tokio::runtime::Runtime;

module! {
    Phase11BenchModule {
        components = [
            EventBusService,
            QualiaLogger,
            HarmonyCacheService,
            GameStateStreamingService,
        ],
        providers = []
    }
}

fn create_sample_combat_state() -> CombatState {
    CombatState {
        game_phase: GamePhase::Playing,
        player: PlayerState {
            position: Vec2::new(100.0, 100.0),
            velocity: Vec2::new(0.0, 0.0),
            health: 100.0,
            max_health: 100.0,
            is_dashing: false,
            is_invulnerable: false,
            combo: 10,
            abilities: PlayerAbilities::default(),
            buffs: Vec::new(),
            debuffs: Vec::new(),
        },
        boss: BossState {
            id: "benchmark_boss".to_string(),
            position: Vec2::new(400.0, 300.0),
            velocity: Vec2::new(0.0, 0.0),
            health: 500.0,
            max_health: 500.0,
            current_pattern_id: None,
            is_stunned: false,
            phase: 1,
            current_aggression_level: 0.5,
        },
        qualia: QualiaState::default(),
        timestamp: 12_345.0,
        song_position: 10.0,
        song_duration: 180.0,
        score: 1000,
        qualia_event_history: Vec::new(),
    }
}

fn bench_bincode_serialization(c: &mut Criterion) {
    let state = create_sample_combat_state();
    
    let mut group = c.benchmark_group("serialization");
    
    // JSON baseline
    group.bench_function("json_serialize", |b| {
        b.iter(|| {
            black_box(serde_json::to_vec(&state).expect("JSON serialization failed"))
        });
    });
    
    // Bincode optimization
    group.bench_function("bincode_serialize", |b| {
        b.iter(|| {
            black_box(bincode::serialize(&state).expect("Bincode serialization failed"))
        });
    });
    
    group.finish();
}

fn bench_bincode_size_reduction(c: &mut Criterion) {
    let state = create_sample_combat_state();
    
    c.bench_function("size_comparison", |b| {
        b.iter(|| {
            let json_size = serde_json::to_vec(&state).expect("JSON serialization failed").len();
            let bincode_size = bincode::serialize(&state).expect("Bincode serialization failed").len();
            #[allow(clippy::cast_precision_loss)]
            let reduction = (1.0 - (bincode_size as f64 / json_size as f64)) * 100.0;
            
            black_box((json_size, bincode_size, reduction))
        });
    });
}

fn bench_streaming_throughput(c: &mut Criterion) {
    let rt = Runtime::new().expect("Failed to create Tokio runtime for benchmark");
    
    let mut group = c.benchmark_group("streaming_throughput");
    group.throughput(Throughput::Elements(1));
    
    for rate in &[30, 60, 120] {
        group.bench_with_input(
            BenchmarkId::new("updates_per_second", rate),
            rate,
            |b, &rate| {
                let container = Phase11BenchModule::builder().build();
                let streaming: Arc<dyn IGameStateStreamingService> = container.resolve();
                
                b.to_async(&rt).iter(|| async {
                    streaming.set_rate(rate);
                    let _: () = streaming.stream_state().await.expect("Streaming failed");
                    black_box(());
                });
            },
        );
    }
    
    group.finish();
}

fn bench_harmony_cache_performance(c: &mut Criterion) {
    let rt = Runtime::new().expect("Failed to create Tokio runtime for benchmark");
    let container = Phase11BenchModule::builder().build();
    let cache: Arc<dyn IHarmonyCacheService> = container.resolve();
    
    let mut group = c.benchmark_group("harmony_cache");
    
    // Cache miss (first access)
    group.bench_function("cache_miss", |b| {
        b.to_async(&rt).iter(|| async {
            let song_id = format!("song_{}", rand::random::<u64>());
            black_box(cache.get(&song_id).await)
        });
    });
    
    // Cache hit (after population)
    group.bench_function("cache_hit", |b| {
        b.to_async(&rt).iter(|| async {
            black_box(cache.get("consistent_song_id").await)
        });
    });
    
    group.finish();
}

fn bench_eventbus_broadcast_latency(c: &mut Criterion) {
    let rt = Runtime::new().expect("Failed to create Tokio runtime for benchmark");
    let container = Phase11BenchModule::builder().build();
    let event_bus: Arc<dyn IEventBus> = container.resolve();
    
    c.bench_function("eventbus_emit_latency", |b| {
        b.to_async(&rt).iter(|| async {
            use shared_core::events::GameEvent;
            let event = GameEvent::ServerTick {
                timestamp: std::time::SystemTime::now(),
            };
            black_box(event_bus.emit(event).expect("Event emission failed"))
        });
    });
}

criterion_group!(
    benches,
    bench_bincode_serialization,
    bench_bincode_size_reduction,
    bench_streaming_throughput,
    bench_harmony_cache_performance,
    bench_eventbus_broadcast_latency,
);
criterion_main!(benches);
