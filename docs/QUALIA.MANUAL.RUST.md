# QUALIA.MANUAL.RUST v1.0 - Implementation Guide
# TARGET: Qualia Tempo Rust Rewrite
# COMPLIANCE: QUALIA.CODE.RUST

---

## Introduction

This manual provides step-by-step implementation examples for the Rust rewrite of Qualia Tempo. While QUALIA.CODE.RUST defines the architectural laws, this manual shows **HOW** to implement them with real code.

---

## 1. PROJECT SETUP

### 1.1. Workspace Structure

```bash
qualia-tempo-rust/
├── Cargo.toml              # Workspace manifest
├── .cargo/
│   └── config.toml         # Cargo configuration
├── shared_core/            # Shared library (contracts, traits)
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs
│       ├── contracts.rs    # QualiaState, PlayerAction, etc.
│       ├── events.rs       # Event definitions
│       └── traits.rs       # Shared trait interfaces
├── backend/                # Server binary
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs
│       ├── services/       # Service implementations
│       ├── handlers/       # WebSocket/HTTP handlers
│       └── config/         # Configuration loading
├── frontend/               # WASM client
│   ├── Cargo.toml
│   ├── index.html
│   └── src/
│       ├── lib.rs
│       ├── components/     # Leptos UI components
│       ├── rendering/      # wgpu renderer
│       └── audio/          # Web Audio bindings
├── qualia_macros/          # Custom procedural macros
│   ├── Cargo.toml
│   └── src/
│       └── lib.rs
└── scripts/
    └── generate_schemas.rs # JSON Schema generation
```

### 1.2. Root Cargo.toml

```toml
[workspace]
members = ["shared_core", "backend", "frontend", "qualia_macros"]
resolver = "2"

[workspace.dependencies]
tokio = { version = "1.41", features = ["full"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tracing = "0.1"
tracing-subscriber = "0.3"
anyhow = "1.0"
thiserror = "1.0"

[workspace.lints.clippy]
all = "warn"
pedantic = "warn"
nursery = "warn"
must_use_candidate = "allow"

[profile.release]
opt-level = 3
lto = true
codegen-units = 1
strip = true
```

### 1.3. Shared Core Cargo.toml

```toml
[package]
name = "shared_core"
version = "0.1.0"
edition = "2021"

[dependencies]
serde.workspace = true
serde_json.workspace = true
schemars = "1.0"
uuid = { version = "1.0", features = ["serde", "v4"] }
chrono = { version = "0.4", features = ["serde"] }

[features]
default = []
wasm = ["uuid/js"]
```

---

## 2. SHARED CONTRACTS IMPLEMENTATION

### 2.1. Core Data Structures

```rust
// shared_core/src/contracts.rs
use serde::{Deserialize, Serialize};
use schemars::JsonSchema;

/// The central qualia state representing player's musical/emotional state
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct QualiaState {
    /// Intensity of player engagement (0.0 - 1.0)
    pub intensity: f32,
    
    /// Harmonic alignment with music (0.0 - 1.0)
    pub harmony: f32,
    
    /// Chaotic energy/complexity (0.0 - 1.0)
    pub chaos: f32,
    
    /// Kairos timing perfection (0.0 - 1.0)
    pub kairos: f32,
    
    /// Unix timestamp in milliseconds
    pub timestamp: u64,
}

impl Default for QualiaState {
    fn default() -> Self {
        Self {
            intensity: 0.0,
            harmony: 0.0,
            chaos: 0.0,
            kairos: 0.0,
            timestamp: 0,
        }
    }
}

/// Player input actions
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum PlayerAction {
    KeyPressed {
        key: char,
        timestamp: u64,
        accuracy: f32,
    },
    Dashed {
        direction: Vec2,
        timestamp: u64,
    },
    MissNote {
        timestamp: u64,
    },
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema)]
pub struct Vec2 {
    pub x: f32,
    pub y: f32,
}

impl Vec2 {
    pub const fn new(x: f32, y: f32) -> Self {
        Self { x, y }
    }
}

/// Complete game state snapshot
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct GameState {
    pub player: PlayerState,
    pub boss: BossState,
    pub qualia: QualiaState,
    pub score: u32,
    pub health: f32,
    pub phase: GamePhase,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct PlayerState {
    pub position: Vec2,
    pub velocity: Vec2,
    pub is_dashing: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct BossState {
    pub position: Vec2,
    pub health: f32,
    pub current_pattern: Option<String>,
    pub phase: u8,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum GamePhase {
    Menu,
    Loading,
    Playing,
    Paused,
    GameOver,
}
```

### 2.2. Event Definitions

```rust
// shared_core/src/events.rs
use super::contracts::*;
use serde::{Deserialize, Serialize};

/// Base event trait for type safety
pub trait Event: Send + Sync + 'static {}

/// All possible game events
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "eventType", rename_all = "camelCase")]
pub enum GameEvent {
    /// Player performed an action
    PlayerAction(PlayerAction),
    
    /// Qualia state was updated
    QualiaStateUpdated(QualiaState),
    
    /// Game state changed
    GameStateChanged {
        old_phase: GamePhase,
        new_phase: GamePhase,
        timestamp: u64,
    },
    
    /// Boss initiated attack
    BossAttack {
        pattern_id: String,
        timestamp: u64,
    },
    
    /// Audio beat detected
    AudioBeat {
        beat_number: u32,
        timestamp: u64,
        bpm: f32,
    },
}

impl Event for GameEvent {}
```

---

## 3. DEPENDENCY INJECTION WITH SHAKU

### 3.1. Service Interface Definition

```rust
// backend/src/services/interfaces.rs
use shaku::Interface;
use async_trait::async_trait;
use anyhow::Result;
use shared_core::contracts::*;

/// Logger interface
pub trait ILogger: Interface {
    fn info(&self, message: &str);
    fn warn(&self, message: &str);
    fn error(&self, message: &str);
}

/// Game logic service interface
#[async_trait]
pub trait IGameLogicService: Interface {
    async fn process_action(&self, action: PlayerAction) -> Result<QualiaState>;
    async fn update_game_state(&self, dt: f32) -> Result<GameState>;
}

/// Event bus interface
#[async_trait]
pub trait IEventBus: Interface + Send + Sync {
    async fn emit(&self, event: GameEvent);
    async fn subscribe(&self) -> async_channel::Receiver<GameEvent>;
}
```

### 3.2. Service Implementation

```rust
// backend/src/services/game_logic_service.rs
use shaku::Component;
use std::sync::Arc;
use tracing::{instrument, info};

#[derive(Component)]
#[shaku(interface = IGameLogicService)]
pub struct GameLogicService {
    config: Arc<GameLogicConfig>,
    
    #[shaku(inject)]
    logger: Arc<dyn ILogger>,
    
    #[shaku(inject)]
    event_bus: Arc<dyn IEventBus>,
}

#[async_trait]
impl IGameLogicService for GameLogicService {
    #[instrument(skip(self))]
    async fn process_action(&self, action: PlayerAction) -> Result<QualiaState> {
        info!("Processing player action: {:?}", action);
        
        // Calculate new qualia state
        let new_state = match action {
            PlayerAction::KeyPressed { accuracy, .. } => {
                self.calculate_qualia_from_accuracy(accuracy)
            }
            PlayerAction::Dashed { .. } => {
                self.apply_dash_bonus()
            }
            PlayerAction::MissNote { .. } => {
                self.apply_miss_penalty()
            }
        };
        
        // Emit event
        self.event_bus.emit(GameEvent::QualiaStateUpdated(new_state)).await;
        
        Ok(new_state)
    }
    
    async fn update_game_state(&self, dt: f32) -> Result<GameState> {
        // Update logic...
        Ok(GameState { /* ... */ })
    }
}

impl GameLogicService {
    fn calculate_qualia_from_accuracy(&self, accuracy: f32) -> QualiaState {
        QualiaState {
            intensity: accuracy,
            harmony: accuracy * 0.9,
            chaos: (1.0 - accuracy) * 0.5,
            kairos: accuracy,
            timestamp: chrono::Utc::now().timestamp_millis() as u64,
        }
    }
    
    fn apply_dash_bonus(&self) -> QualiaState {
        // Implementation...
        QualiaState::default()
    }
    
    fn apply_miss_penalty(&self) -> QualiaState {
        // Implementation...
        QualiaState::default()
    }
}
```

### 3.3. Configuration Loading

```rust
// backend/src/config.rs
use serde::Deserialize;
use anyhow::{Context, Result};

#[derive(Debug, Clone, Deserialize)]
pub struct GameLogicConfig {
    pub base_intensity_multiplier: f32,
    pub harmony_decay_rate: f32,
    pub chaos_threshold: f32,
    pub combo_multiplier: f32,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
    pub max_connections: usize,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AppConfig {
    pub server: ServerConfig,
    pub game_logic: GameLogicConfig,
}

impl AppConfig {
    pub fn load() -> Result<Self> {
        let config_path = std::env::var("CONFIG_PATH")
            .unwrap_or_else(|_| "config.yaml".to_string());
        
        let config_str = std::fs::read_to_string(&config_path)
            .context(format!("Failed to read config from {}", config_path))?;
        
        let config: AppConfig = serde_yaml::from_str(&config_str)
            .context("Failed to parse YAML config")?;
        
        Ok(config)
    }
}
```

### 3.4. Module Setup

```rust
// backend/src/services/mod.rs
use shaku::module;

module! {
    pub GameModule {
        components = [
            QualiaLogger,
            GameLogicService,
            EventBusService,
            ParticleEngineService,
        ],
        providers = []
    }
}

// Usage in main.rs
#[tokio::main]
async fn main() -> Result<()> {
    let config = AppConfig::load()?;
    
    let module = GameModule::builder()
        .with_component_parameters::<GameLogicService>(
            GameLogicServiceParameters {
                config: Arc::new(config.game_logic.clone()),
            }
        )
        .build();
    
    let game_logic: &dyn IGameLogicService = module.resolve_ref();
    
    // Use service...
    
    Ok(())
}
```

---

## 4. EVENT BUS IMPLEMENTATION

### 4.1. Async Channel-Based EventBus

```rust
// backend/src/services/event_bus.rs
use async_channel::{Sender, Receiver, unbounded};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use shared_core::events::GameEvent;
use tracing::{instrument, debug};

pub struct EventBusService {
    subscribers: Arc<RwLock<Vec<Sender<GameEvent>>>>,
}

impl Default for EventBusService {
    fn default() -> Self {
        Self::new()
    }
}

impl EventBusService {
    pub fn new() -> Self {
        Self {
            subscribers: Arc::new(RwLock::new(Vec::new())),
        }
    }
    
    #[instrument(skip(self, event))]
    pub async fn emit(&self, event: GameEvent) {
        debug!("Emitting event: {:?}", event);
        
        let subscribers = self.subscribers.read().await;
        let mut dead_senders = Vec::new();
        
        for (idx, sender) in subscribers.iter().enumerate() {
            if sender.send(event.clone()).await.is_err() {
                dead_senders.push(idx);
            }
        }
        
        // Cleanup dead subscribers
        if !dead_senders.is_empty() {
            drop(subscribers);
            let mut subscribers = self.subscribers.write().await;
            for idx in dead_senders.into_iter().rev() {
                subscribers.swap_remove(idx);
            }
        }
    }
    
    pub async fn subscribe(&self) -> Receiver<GameEvent> {
        let (tx, rx) = unbounded();
        let mut subscribers = self.subscribers.write().await;
        subscribers.push(tx);
        rx
    }
    
    pub async fn subscriber_count(&self) -> usize {
        self.subscribers.read().await.len()
    }
}

// Make it a Shaku component
#[shaku::Component(interface = IEventBus)]
impl EventBusService {
    // Shaku constructor
}

#[async_trait]
impl IEventBus for EventBusService {
    async fn emit(&self, event: GameEvent) {
        EventBusService::emit(self, event).await
    }
    
    async fn subscribe(&self) -> Receiver<GameEvent> {
        EventBusService::subscribe(self).await
    }
}
```

### 4.2. Service with Event Subscription

```rust
// Example: Boss AI Service that reacts to events
use tokio::task;

pub struct BossAIService {
    event_bus: Arc<dyn IEventBus>,
    config: Arc<BossAIConfig>,
}

impl BossAIService {
    pub async fn start(&self) -> Result<()> {
        let event_bus = self.event_bus.clone();
        let config = self.config.clone();
        
        task::spawn(async move {
            let mut events = event_bus.subscribe().await;
            
            while let Ok(event) = events.recv().await {
                match event {
                    GameEvent::QualiaStateUpdated(state) => {
                        Self::adapt_to_qualia(&config, state).await;
                    }
                    GameEvent::PlayerAction(action) => {
                        Self::counter_action(&config, action).await;
                    }
                    _ => {}
                }
            }
        });
        
        Ok(())
    }
    
    async fn adapt_to_qualia(config: &BossAIConfig, state: QualiaState) {
        if state.intensity > config.aggression_threshold {
            // Increase attack frequency
        }
    }
    
    async fn counter_action(config: &BossAIConfig, action: PlayerAction) {
        // React to player moves
    }
}
```

---

## 5. WEBSOCKET SERVER WITH AXUM

### 5.1. WebSocket Handler

```rust
// backend/src/handlers/websocket.rs
use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::IntoResponse,
};
use futures::{StreamExt, SinkExt};
use std::sync::Arc;
use tracing::{info, error, warn};

pub async fn websocket_handler(
    ws: WebSocketUpgrade,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

async fn handle_socket(socket: WebSocket, state: Arc<AppState>) {
    let (mut sender, mut receiver) = socket.split();
    let client_id = uuid::Uuid::new_v4();
    
    info!("Client {} connected", client_id);
    
    // Spawn sender task (events → client)
    let event_bus = state.event_bus.clone();
    let send_task = tokio::spawn(async move {
        let mut events = event_bus.subscribe().await;
        
        while let Ok(event) = events.recv().await {
            let json = serde_json::to_string(&event).unwrap();
            
            if sender.send(Message::Text(json)).await.is_err() {
                break;
            }
        }
    });
    
    // Spawn receiver task (client → server)
    let game_logic = state.game_logic.clone();
    let recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = receiver.next().await {
            if let Message::Text(text) = msg {
                match serde_json::from_str::<PlayerAction>(&text) {
                    Ok(action) => {
                        if let Err(e) = game_logic.process_action(action).await {
                            error!("Failed to process action: {}", e);
                        }
                    }
                    Err(e) => {
                        warn!("Invalid message: {}", e);
                    }
                }
            }
        }
    });
    
    // Wait for either task to finish
    tokio::select! {
        _ = send_task => {}
        _ = recv_task => {}
    }
    
    info!("Client {} disconnected", client_id);
}

// Application state
pub struct AppState {
    pub event_bus: Arc<dyn IEventBus>,
    pub game_logic: Arc<dyn IGameLogicService>,
}
```

### 5.2. Server Main

```rust
// backend/src/main.rs
use axum::{
    Router,
    routing::get,
};
use std::net::SocketAddr;
use std::sync::Arc;
use tower_http::trace::TraceLayer;
use tracing_subscriber::{fmt, EnvFilter, prelude::*};

mod services;
mod handlers;
mod config;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(fmt::layer().compact())
        .with(EnvFilter::from_default_env()
            .add_directive("qualia_tempo=debug".parse()?))
        .init();
    
    // Load config
    let config = config::AppConfig::load()?;
    
    // Build DI container
    let module = services::GameModule::builder()
        .build();
    
    // Create app state
    let state = Arc::new(handlers::AppState {
        event_bus: module.resolve(),
        game_logic: module.resolve(),
    });
    
    // Build router
    let app = Router::new()
        .route("/ws", get(handlers::websocket_handler))
        .route("/health", get(|| async { "OK" }))
        .layer(TraceLayer::new_for_http())
        .with_state(state);
    
    // Start server
    let addr = SocketAddr::from(([0, 0, 0, 0], config.server.port));
    tracing::info!("Server listening on {}", addr);
    
    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await?;
    
    Ok(())
}
```

---

## 6. FRONTEND: LEPTOS UI + WGPU RENDERING

### 6.1. Leptos Component

```rust
// frontend/src/components/game_ui.rs
use leptos::*;
use shared_core::contracts::*;
use wasm_bindgen::prelude::*;

#[component]
pub fn GameUI(cx: Scope) -> impl IntoView {
    let (game_state, set_game_state) = create_signal(cx, GameState::default());
    let (connected, set_connected) = create_signal(cx, false);
    
    // WebSocket connection
    create_effect(cx, move |_| {
        spawn_local(async move {
            match connect_to_backend().await {
                Ok(mut ws) => {
                    set_connected.set(true);
                    
                    while let Ok(state) = ws.recv_state().await {
                        set_game_state.set(state);
                    }
                }
                Err(e) => {
                    log::error!("WebSocket error: {}", e);
                }
            }
        });
    });
    
    view! { cx,
        <div class="game-container">
            <StatusBar connected=connected />
            <QualiaDisplay state=move || game_state.get().qualia />
            <Canvas />
            <Controls />
        </div>
    }
}

#[component]
fn QualiaDisplay(cx: Scope, state: Signal<QualiaState>) -> impl IntoView {
    view! { cx,
        <div class="qualia-display">
            <div class="qualia-bar">
                <span>"Intensity: "</span>
                <progress value=move || state.get().intensity max="1.0" />
            </div>
            <div class="qualia-bar">
                <span>"Harmony: "</span>
                <progress value=move || state.get().harmony max="1.0" />
            </div>
            <div class="qualia-bar">
                <span>"Chaos: "</span>
                <progress value=move || state.get().chaos max="1.0" />
            </div>
        </div>
    }
}
```

### 6.2. WebSocket Client (WASM)

```rust
// frontend/src/websocket.rs
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use web_sys::{MessageEvent, WebSocket};
use shared_core::{contracts::*, events::*};
use anyhow::Result;

pub struct GameWebSocket {
    ws: WebSocket,
}

impl GameWebSocket {
    pub async fn connect(url: &str) -> Result<Self> {
        let ws = WebSocket::new(url)?;
        
        // Set up event handlers
        let onopen = Closure::wrap(Box::new(move |_| {
            log::info!("WebSocket connected");
        }) as Box<dyn FnMut(JsValue)>);
        ws.set_onopen(Some(onopen.as_ref().unchecked_ref()));
        onopen.forget();
        
        Ok(Self { ws })
    }
    
    pub async fn send_action(&self, action: PlayerAction) -> Result<()> {
        let json = serde_json::to_string(&action)?;
        self.ws.send_with_str(&json)?;
        Ok(())
    }
    
    pub async fn recv_state(&self) -> Result<GameState> {
        // Set up promise-based receiver
        // (simplified, real implementation uses channels)
        todo!("Implement promise-based state receiver")
    }
}
```

### 6.3. wgpu Renderer

```rust
// frontend/src/rendering/renderer.rs
use wgpu;
use winit::window::Window;

pub struct WgpuRenderer {
    device: wgpu::Device,
    queue: wgpu::Queue,
    surface: wgpu::Surface,
    config: wgpu::SurfaceConfiguration,
    pipeline: wgpu::RenderPipeline,
}

impl WgpuRenderer {
    pub async fn new(window: &Window) -> Result<Self> {
        // Create instance
        let instance = wgpu::Instance::new(wgpu::InstanceDescriptor {
            backends: wgpu::Backends::all(),
            ..Default::default()
        });
        
        // Create surface
        let surface = unsafe { instance.create_surface(window) }?;
        
        // Request adapter
        let adapter = instance.request_adapter(&wgpu::RequestAdapterOptions {
            power_preference: wgpu::PowerPreference::HighPerformance,
            compatible_surface: Some(&surface),
            force_fallback_adapter: false,
        }).await.unwrap();
        
        // Request device
        let (device, queue) = adapter.request_device(
            &wgpu::DeviceDescriptor {
                features: wgpu::Features::empty(),
                limits: wgpu::Limits::default(),
                label: None,
            },
            None,
        ).await?;
        
        // Configure surface
        let size = window.inner_size();
        let config = wgpu::SurfaceConfiguration {
            usage: wgpu::TextureUsages::RENDER_ATTACHMENT,
            format: surface.get_capabilities(&adapter).formats[0],
            width: size.width,
            height: size.height,
            present_mode: wgpu::PresentMode::Fifo,
            alpha_mode: wgpu::CompositeAlphaMode::Auto,
            view_formats: vec![],
        };
        surface.configure(&device, &config);
        
        // Load shader
        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Shader"),
            source: wgpu::ShaderSource::Wgsl(include_str!("shader.wgsl").into()),
        });
        
        // Create pipeline
        let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("Pipeline Layout"),
            bind_group_layouts: &[],
            push_constant_ranges: &[],
        });
        
        let pipeline = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label: Some("Render Pipeline"),
            layout: Some(&pipeline_layout),
            vertex: wgpu::VertexState {
                module: &shader,
                entry_point: "vs_main",
                buffers: &[],
            },
            fragment: Some(wgpu::FragmentState {
                module: &shader,
                entry_point: "fs_main",
                targets: &[Some(wgpu::ColorTargetState {
                    format: config.format,
                    blend: Some(wgpu::BlendState::REPLACE),
                    write_mask: wgpu::ColorWrites::ALL,
                })],
            }),
            primitive: wgpu::PrimitiveState::default(),
            depth_stencil: None,
            multisample: wgpu::MultisampleState::default(),
            multiview: None,
        });
        
        Ok(Self {
            device,
            queue,
            surface,
            config,
            pipeline,
        })
    }
    
    pub fn render(&self, particles: &[Particle]) -> Result<()> {
        let output = self.surface.get_current_texture()?;
        let view = output.texture.create_view(&wgpu::TextureViewDescriptor::default());
        
        let mut encoder = self.device.create_command_encoder(&wgpu::CommandEncoderDescriptor {
            label: Some("Render Encoder"),
        });
        
        {
            let mut render_pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("Render Pass"),
                color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                    view: &view,
                    resolve_target: None,
                    ops: wgpu::Operations {
                        load: wgpu::LoadOp::Clear(wgpu::Color::BLACK),
                        store: wgpu::StoreOp::Store,
                    },
                })],
                depth_stencil_attachment: None,
                occlusion_query_set: None,
                timestamp_writes: None,
            });
            
            render_pass.set_pipeline(&self.pipeline);
            render_pass.draw(0..3, 0..1); // Draw triangle
        }
        
        self.queue.submit(std::iter::once(encoder.finish()));
        output.present();
        
        Ok(())
    }
}
```

---

## 7. TESTING EXAMPLES

### 7.1. Unit Tests

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_qualia_state_default() {
        let state = QualiaState::default();
        assert_eq!(state.intensity, 0.0);
        assert_eq!(state.harmony, 0.0);
        assert!(state.timestamp == 0);
    }
    
    #[tokio::test]
    async fn test_event_bus_emit_receive() {
        let bus = EventBusService::new();
        let mut rx = bus.subscribe().await;
        
        let event = GameEvent::AudioBeat {
            beat_number: 1,
            timestamp: 1000,
            bpm: 120.0,
        };
        
        bus.emit(event.clone()).await;
        
        let received = rx.recv().await.unwrap();
        assert!(matches!(received, GameEvent::AudioBeat { .. }));
    }
    
    #[test]
    fn test_serde_round_trip() {
        let state = QualiaState {
            intensity: 0.8,
            harmony: 0.6,
            chaos: 0.3,
            kairos: 0.9,
            timestamp: 12345,
        };
        
        let json = serde_json::to_string(&state).unwrap();
        let deserialized: QualiaState = serde_json::from_str(&json).unwrap();
        
        assert_eq!(state.intensity, deserialized.intensity);
    }
}
```

### 7.2. Integration Tests

```rust
// tests/integration_test.rs
use qualia_tempo_backend::*;

#[tokio::test]
async fn test_full_game_loop() {
    let module = GameModule::builder().build();
    let game_logic: &dyn IGameLogicService = module.resolve_ref();
    let event_bus: &dyn IEventBus = module.resolve_ref();
    
    let mut events = event_bus.subscribe().await;
    
    // Process action
    let action = PlayerAction::KeyPressed {
        key: 'Q',
        timestamp: 1000,
        accuracy: 0.95,
    };
    
    let state = game_logic.process_action(action).await.unwrap();
    
    // Verify event was emitted
    let event = events.recv().await.unwrap();
    assert!(matches!(event, GameEvent::QualiaStateUpdated(_)));
    
    // Verify state
    assert!(state.intensity > 0.0);
}
```

### 7.3. Property-Based Tests

```rust
use proptest::prelude::*;

proptest! {
    #[test]
    fn test_qualia_values_bounded(
        intensity in 0.0f32..=1.0,
        harmony in 0.0f32..=1.0,
    ) {
        let state = QualiaState {
            intensity,
            harmony,
            chaos: 0.5,
            kairos: 0.5,
            timestamp: 0,
        };
        
        prop_assert!(state.intensity >= 0.0 && state.intensity <= 1.0);
        prop_assert!(state.harmony >= 0.0 && state.harmony <= 1.0);
    }
}
```

---

**END OF QUALIA.MANUAL.RUST**

*"From theory to practice. From architecture to implementation."*
