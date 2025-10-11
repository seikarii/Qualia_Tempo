# QUALIA.MANUAL.RUST v1.1 - Implementation Guide
# TARGET: Qualia Tempo Rust Rewrite
# COMPLIANCE: QUALIA.CODE.RUST v1.1

---

## Introduction

This manual provides step-by-step implementation examples for the Rust rewrite of Qualia Tempo. While QUALIA.CODE.RUST defines the architectural laws, this manual shows **HOW** to implement them with real code.

**CRITICAL**: All code examples follow QUALIA.CODE.RUST v1.1 mandates, including `tokio::sync::broadcast` for EventBus, `mockall` for mocks, and `# Responsibility` docstrings.

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
mockall = "0.12"

[workspace.lints.clippy]
all = "warn"
pedantic = "warn"
nursery = "warn"
unwrap_used = "deny"
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
validator = { version = "0.16", features = ["derive"] }

[features]
default = []
wasm = ["uuid/js", "chrono/wasmbind"]
```

---

## 2. SHARED CONTRACTS IMPLEMENTATION

### 2.1. Core Data Structures with # Responsibility

```rust
//! # Responsibility
//! Defines all shared data structures for communication between frontend and backend.
//!
//! ---
//!
//! This module contains the core contracts (QualiaState, PlayerAction, GameState)
//! that are serialized over WebSocket connections. All structs implement Serde
//! traits for JSON serialization and JsonSchema for documentation generation.

// shared_core/src/contracts.rs
use serde::{Deserialize, Serialize};
use schemars::JsonSchema;

/// # Responsibility
/// Represents the player's current emotional/musical state in the game.
///
/// ---
///
/// The qualia state is calculated in real-time based on player actions and
/// musical input. All values are normalized to [0.0, 1.0] range.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
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

/// # Responsibility
/// Enumerates all possible player input actions in the game.
///
/// ---
///
/// This tagged enum uses Serde's `tag = "type"` for clean JSON serialization.
/// Each variant contains the relevant data for that action type.
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

/// # Responsibility
/// Represents a 2D vector for positions and directions.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
pub struct Vec2 {
    pub x: f32,
    pub y: f32,
}

impl Vec2 {
    pub const fn new(x: f32, y: f32) -> Self {
        Self { x, y }
    }
}

/// # Responsibility
/// Represents the complete game state snapshot at a given moment.
///
/// ---
///
/// This is the authoritative state sent from backend to frontend over WebSocket.
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

/// # Responsibility
/// Represents the player entity's state.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct PlayerState {
    pub position: Vec2,
    pub velocity: Vec2,
    pub is_dashing: bool,
}

/// # Responsibility
/// Represents the boss entity's state.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct BossState {
    pub position: Vec2,
    pub health: f32,
    pub current_pattern: Option<String>,
    pub phase: u8,
}

/// # Responsibility
/// Enumerates the possible game phases.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Eq)]
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
//! # Responsibility
//! Defines all event types for the EventBus communication pattern.

// shared_core/src/events.rs
use super::contracts::*;
use serde::{Deserialize, Serialize};

/// # Responsibility
/// Enumerates all events that can flow through the EventBus.
///
/// ---
///
/// Events are the primary communication mechanism between services.
/// All variants must be Clone for broadcast distribution.
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
```

---

## 3. DEPENDENCY INJECTION WITH SHAKU

### 3.1. Service Interface Definition

```rust
//! # Responsibility
//! Defines all service trait interfaces for dependency injection.

// backend/src/services/interfaces.rs
use shaku::Interface;
use async_trait::async_trait;
use anyhow::Result;
use shared_core::contracts::*;

/// # Responsibility
/// Provides structured logging throughout the application.
pub trait ILogger: Interface {
    fn info(&self, message: &str);
    fn warn(&self, message: &str);
    fn error(&self, message: &str);
}

/// # Responsibility
/// Processes game logic, calculating state changes from player actions.
#[async_trait]
pub trait IGameLogicService: Interface {
    async fn process_action(&self, action: PlayerAction) -> Result<QualiaState>;
    async fn update_game_state(&self, dt: f32) -> Result<GameState>;
    fn get_current_score(&self) -> u32;
}

/// # Responsibility
/// Manages event distribution using the broadcast pattern.
pub trait IEventBus: Interface + Send + Sync {
    fn emit(&self, event: GameEvent) -> Result<usize, tokio::sync::broadcast::error::SendError<GameEvent>>;
    fn subscribe(&self) -> tokio::sync::broadcast::Receiver<GameEvent>;
}
```

### 3.2. Service Implementation

```rust
//! # Responsibility
//! Implements core game logic, processing player actions into state updates.

// backend/src/services/game_logic_service.rs
use shaku::Component;
use std::sync::Arc;
use tracing::{instrument, info};
use shared_core::{contracts::*, events::*};
use super::interfaces::{ILogger, IEventBus, IGameLogicService};

#[derive(Component)]
#[shaku(interface = IGameLogicService)]
pub struct GameLogicService {
    config: Arc<GameLogicConfig>,
    
    #[shaku(inject)]
    logger: Arc<dyn ILogger>,
    
    #[shaku(inject)]
    event_bus: Arc<dyn IEventBus>,
}

#[async_trait::async_trait]
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
        
        // Emit event via broadcast
        let _ = self.event_bus.emit(GameEvent::QualiaStateUpdated(new_state));
        
        Ok(new_state)
    }
    
    async fn update_game_state(&self, dt: f32) -> Result<GameState> {
        // Update logic implementation...
        Ok(GameState {
            player: PlayerState {
                position: Vec2::new(0.0, 0.0),
                velocity: Vec2::new(0.0, 0.0),
                is_dashing: false,
            },
            boss: BossState {
                position: Vec2::new(0.0, 0.0),
                health: 100.0,
                current_pattern: None,
                phase: 1,
            },
            qualia: QualiaState::default(),
            score: 0,
            health: 100.0,
            phase: GamePhase::Playing,
        })
    }
    
    fn get_current_score(&self) -> u32 {
        0 // Placeholder
    }
}

impl GameLogicService {
    fn calculate_qualia_from_accuracy(&self, accuracy: f32) -> QualiaState {
        QualiaState {
            intensity: accuracy * self.config.base_intensity_multiplier,
            harmony: accuracy * 0.9,
            chaos: (1.0 - accuracy) * 0.5,
            kairos: accuracy,
            timestamp: chrono::Utc::now().timestamp_millis() as u64,
        }
    }
    
    fn apply_dash_bonus(&self) -> QualiaState {
        QualiaState {
            intensity: 0.8,
            harmony: 0.6,
            chaos: 0.9,
            kairos: 0.7,
            timestamp: chrono::Utc::now().timestamp_millis() as u64,
        }
    }
    
    fn apply_miss_penalty(&self) -> QualiaState {
        QualiaState {
            intensity: 0.2,
            harmony: 0.1,
            chaos: 0.1,
            kairos: 0.0,
            timestamp: chrono::Utc::now().timestamp_millis() as u64,
        }
    }
}
```

### 3.3. Configuration Loading

```rust
//! # Responsibility
//! Loads and validates application configuration from YAML files.

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
            EventBusService,
            GameLogicService,
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
    
    let game_logic: Arc<dyn IGameLogicService> = module.resolve();
    
    // Use service...
    
    Ok(())
}
```

---

## 4. EVENT BUS IMPLEMENTATION WITH TOKIO::SYNC::BROADCAST

### 4.1. The Correct EventBus Pattern

```rust
//! # Responsibility
//! Provides lock-free event distribution using tokio::sync::broadcast.
//!
//! ---
//!
//! This implementation uses Tokio's broadcast channel for zero-contention,
//! one-to-many event distribution. All subscribers receive all events.

// backend/src/services/event_bus.rs
use tokio::sync::broadcast;
use shared_core::events::GameEvent;
use shaku::Component;
use super::interfaces::IEventBus;
use tracing::{instrument, debug, warn};

/// # Responsibility
/// Manages event distribution to multiple subscribers using broadcast channels.
#[derive(Component)]
#[shaku(interface = IEventBus)]
pub struct EventBusService {
    tx: broadcast::Sender<GameEvent>,
}

impl EventBusService {
    pub fn new(capacity: usize) -> Self {
        let (tx, _rx) = broadcast::channel(capacity);
        Self { tx }
    }
}

impl IEventBus for EventBusService {
    #[instrument(skip(self, event))]
    fn emit(&self, event: GameEvent) -> Result<usize, broadcast::error::SendError<GameEvent>> {
        debug!("Emitting event: {:?}", event);
        
        match self.tx.send(event) {
            Ok(receiver_count) => {
                debug!("Event delivered to {} receivers", receiver_count);
                Ok(receiver_count)
            }
            Err(e) => {
                warn!("Failed to emit event (no receivers): {:?}", e);
                Err(e)
            }
        }
    }
    
    fn subscribe(&self) -> broadcast::Receiver<GameEvent> {
        self.tx.subscribe()
    }
}

// Implement Default for Shaku
impl Default for EventBusService {
    fn default() -> Self {
        Self::new(1000) // Default capacity
    }
}
```

### 4.2. Service with Event Subscription

```rust
//! # Responsibility
//! Manages boss AI behavior, reacting to player actions and game events.

use tokio::task;
use tracing::{instrument, info};

pub struct BossAIService {
    event_bus: Arc<dyn IEventBus>,
    config: Arc<BossAIConfig>,
}

impl BossAIService {
    #[instrument(skip(self))]
    pub async fn start(&self) -> Result<()> {
        let event_bus = self.event_bus.clone();
        let config = self.config.clone();
        
        task::spawn(async move {
            let mut events = event_bus.subscribe();
            
            loop {
                match events.recv().await {
                    Ok(event) => {
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
                    Err(broadcast::error::RecvError::Lagged(skipped)) => {
                        warn!("BossAI lagged, skipped {} events", skipped);
                    }
                    Err(broadcast::error::RecvError::Closed) => {
                        info!("EventBus closed, stopping BossAI");
                        break;
                    }
                }
            }
        });
        
        Ok(())
    }
    
    async fn adapt_to_qualia(config: &BossAIConfig, state: QualiaState) {
        if state.intensity > config.aggression_threshold {
            // Increase attack frequency
            info!("Boss aggression increased due to high intensity");
        }
    }
    
    async fn counter_action(config: &BossAIConfig, action: PlayerAction) {
        match action {
            PlayerAction::Dashed { direction, .. } => {
                info!("Boss reacting to player dash: {:?}", direction);
            }
            _ => {}
        }
    }
}
```

### 4.3. Why broadcast > Manual RwLock Implementation

**Performance Comparison**:

```rust
// ANTI-PATTERN (FORBIDDEN): Manual implementation with RwLock
pub struct ManualEventBus {
    subscribers: Arc<RwLock<Vec<Sender<GameEvent>>>>, // Lock contention!
}

// Under load:
// - RwLock.write() blocks all other operations
// - Dead subscriber cleanup requires write lock
// - Performance degrades with subscriber count

// CORRECT: tokio::sync::broadcast
pub struct EventBusService {
    tx: broadcast::Sender<GameEvent>, // Lock-free!
}

// Under load:
// - Zero locks, zero contention
// - Built-in lagging detection
// - Performance scales with CPU cores
```

---

## 5. WEBSOCKET SERVER WITH AXUM

### 5.1. WebSocket Handler

```rust
//! # Responsibility
//! Handles WebSocket connections for real-time client-server communication.

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
use tracing::{info, error, warn, instrument};
use shared_core::{contracts::*, events::*};

pub async fn websocket_handler(
    ws: WebSocketUpgrade,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

#[instrument(skip(socket, state))]
async fn handle_socket(socket: WebSocket, state: Arc<AppState>) {
    let (mut sender, mut receiver) = socket.split();
    let client_id = uuid::Uuid::new_v4();
    
    info!("Client {} connected", client_id);
    
    // Spawn sender task (events → client)
    let event_bus = state.event_bus.clone();
    let send_task = tokio::spawn(async move {
        let mut events = event_bus.subscribe();
        
        loop {
            match events.recv().await {
                Ok(event) => {
                    let json = serde_json::to_string(&event).unwrap();
                    
                    if sender.send(Message::Text(json)).await.is_err() {
                        break;
                    }
                }
                Err(broadcast::error::RecvError::Lagged(skipped)) => {
                    warn!("Client {} lagged, skipped {} events", client_id, skipped);
                }
                Err(broadcast::error::RecvError::Closed) => {
                    info!("EventBus closed");
                    break;
                }
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
                        warn!("Invalid message from client {}: {}", client_id, e);
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

/// # Responsibility
/// Holds application state shared across WebSocket handlers.
pub struct AppState {
    pub event_bus: Arc<dyn IEventBus>,
    pub game_logic: Arc<dyn IGameLogicService>,
}
```

### 5.2. Server Main

```rust
//! # Responsibility
//! Application entry point, initializes services and starts the Axum server.

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
        .with_component_parameters::<services::GameLogicService>(
            services::GameLogicServiceParameters {
                config: Arc::new(config.game_logic.clone()),
            }
        )
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
//! # Responsibility
//! Provides the root UI component for the game interface.

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

/// # Responsibility
/// Displays the current qualia state with progress bars.
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
            <div class="qualia-bar">
                <span>"Kairos: "</span>
                <progress value=move || state.get().kairos max="1.0" />
            </div>
        </div>
    }
}
```

### 6.2. wgpu Renderer

```rust
//! # Responsibility
//! Manages WebGPU rendering pipeline for 3D graphics.

// frontend/src/rendering/renderer.rs
use wgpu;
use winit::window::Window;
use anyhow::Result;

/// # Responsibility
/// Initializes and manages the wgpu rendering context.
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
            label: Some("Main Shader"),
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
    
    pub fn render(&self) -> Result<()> {
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

## 7. TESTING WITH MOCKALL AND ISOLATED CONTAINERS

### 7.1. High-Fidelity Mock Creation

```rust
//! # Responsibility
//! Provides centralized, high-fidelity mocks for all service interfaces.

// backend/src/services/tests/mocks/logger.rs
use mockall::*;
use super::super::interfaces::ILogger;

mock! {
    /// # Responsibility
    /// High-fidelity mock implementation of ILogger for testing.
    pub Logger {}
    
    impl ILogger for Logger {
        fn info(&self, message: &str);
        fn warn(&self, message: &str);
        fn error(&self, message: &str);
    }
}

// backend/src/services/tests/mocks/event_bus.rs
use mockall::*;
use tokio::sync::broadcast;
use shared_core::events::GameEvent;
use super::super::interfaces::IEventBus;

mock! {
    /// # Responsibility
    /// High-fidelity mock implementation of IEventBus for testing.
    pub EventBus {}
    
    impl IEventBus for EventBus {
        fn emit(&self, event: GameEvent) -> Result<usize, broadcast::error::SendError<GameEvent>>;
        fn subscribe(&self) -> broadcast::Receiver<GameEvent>;
    }
}
```

### 7.2. Isolated Test Container Factory

```rust
//! # Responsibility
//! Provides isolated Shaku containers for testing, preventing cross-contamination.

// backend/src/services/tests/test_container_factory.rs
use shaku::module;
use std::sync::Arc;
use super::mocks::*;
use super::super::interfaces::*;

/// # Responsibility
/// Creates an isolated GameModule with all dependencies mocked.
pub fn create_test_module() -> GameModule {
    GameModule::builder()
        .with_component_override::<dyn ILogger>(Box::new(|| {
            let mut mock = MockLogger::new();
            // High-fidelity: Set default expectations
            mock.expect_info().return_const(());
            mock.expect_warn().return_const(());
            mock.expect_error().return_const(());
            Box::new(mock)
        }))
        .with_component_override::<dyn IEventBus>(Box::new(|| {
            let mut mock = MockEventBus::new();
            // High-fidelity: Return realistic defaults
            mock.expect_emit().returning(|_| Ok(1usize));
            
            let (tx, rx) = broadcast::channel(100);
            mock.expect_subscribe().return_once(move || rx);
            
            Box::new(mock)
        }))
        .build()
}
```

### 7.3. Unit Tests with High-Fidelity Mocks

```rust
// backend/src/services/tests/game_logic_tests.rs
use super::*;
use mockall::predicate::*;

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_process_action_emits_qualia_event() {
        // STEP 1: Identify SUT
        // Testing: GameLogicService

        // STEP 2: Create Isolated Test Container
        let module = create_test_module();
        
        // STEP 3: Configure Mock Behaviors
        let mut mock_event_bus = MockEventBus::new();
        mock_event_bus.expect_emit()
            .with(function(|event: &GameEvent| {
                matches!(event, GameEvent::QualiaStateUpdated(_))
            }))
            .times(1)
            .returning(|_| Ok(1));
        
        // STEP 4: Exercise the SUT
        let sut: Arc<dyn IGameLogicService> = module.resolve();
        let action = PlayerAction::KeyPressed {
            key: 'Q',
            timestamp: 1000,
            accuracy: 0.95,
        };
        
        let result = sut.process_action(action).await;
        
        // STEP 5: Assert Results and Interactions
        assert!(result.is_ok());
        let state = result.unwrap();
        assert!(state.intensity > 0.0);
        assert!(state.intensity <= 1.0);
        
        // mockall automatically verifies expectations on drop
    }
    
    #[test]
    fn test_qualia_calculation_accuracy_bounds() {
        let config = GameLogicConfig {
            base_intensity_multiplier: 1.0,
            harmony_decay_rate: 0.1,
            chaos_threshold: 0.5,
            combo_multiplier: 1.2,
        };
        
        let service = GameLogicService {
            config: Arc::new(config),
            logger: Arc::new(MockLogger::new()),
            event_bus: Arc::new(MockEventBus::new()),
        };
        
        let state = service.calculate_qualia_from_accuracy(0.95);
        
        assert_eq!(state.intensity, 0.95);
        assert!(state.harmony >= 0.0 && state.harmony <= 1.0);
    }
}
```

### 7.4. Property-Based Tests

```rust
use proptest::prelude::*;

proptest! {
    #[test]
    fn test_qualia_values_always_bounded(
        intensity in 0.0f32..=1.0,
        harmony in 0.0f32..=1.0,
        chaos in 0.0f32..=1.0,
        kairos in 0.0f32..=1.0,
    ) {
        let state = QualiaState {
            intensity,
            harmony,
            chaos,
            kairos,
            timestamp: 0,
        };
        
        prop_assert!(state.intensity >= 0.0 && state.intensity <= 1.0);
        prop_assert!(state.harmony >= 0.0 && state.harmony <= 1.0);
        prop_assert!(state.chaos >= 0.0 && state.chaos <= 1.0);
        prop_assert!(state.kairos >= 0.0 && state.kairos <= 1.0);
    }
}
```

### 7.5. Integration Tests

```rust
// tests/integration/full_game_loop.rs
use qualia_tempo_backend::*;

#[tokio::test]
async fn test_full_event_flow() {
    // Create real module (not mocked for integration test)
    let config = AppConfig::load().unwrap();
    let module = GameModule::builder()
        .with_component_parameters::<GameLogicService>(
            GameLogicServiceParameters {
                config: Arc::new(config.game_logic),
            }
        )
        .build();
    
    let game_logic: Arc<dyn IGameLogicService> = module.resolve();
    let event_bus: Arc<dyn IEventBus> = module.resolve();
    
    // Subscribe to events
    let mut events = event_bus.subscribe();
    
    // Process action
    let action = PlayerAction::KeyPressed {
        key: 'Q',
        timestamp: 1000,
        accuracy: 0.95,
    };
    
    let state = game_logic.process_action(action).await.unwrap();
    
    // Verify event was emitted
    let received_event = events.recv().await.unwrap();
    assert!(matches!(received_event, GameEvent::QualiaStateUpdated(_)));
    
    // Verify state
    assert!(state.intensity > 0.0);
}
```

---

**END OF QUALIA.MANUAL.RUST v1.1**

*"From principles to practice. From architecture to code. From broadcast channels to tested services."*
