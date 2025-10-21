# 🎯 AUDIO FORGE - MISSION DIRECTIVE
**Project Codename**: `audio-forge`  
**Compliance**: QUALIA.CODE.RUST v1.1  
**Objective**: Lightweight, cross-platform audio player with real-time analysis & effects  
**Language**: Pure Rust (ZERO exceptions)

---

## 📋 EXECUTIVE SUMMARY

Create a modern audio player capable of:
1. **Playback**: Support WAV/MP3/FLAC/OGG/AAC with 8.1 channel output
2. **Visualization**: Real-time waveform + frequency spectrum rendering
3. **Analysis**: FFT-based instrument detection (bass/mid/treble mapping)
4. **Effects**: 8D audio processing, drop effects, frequency boost
5. **UI**: Modern egui-based interface with FL Studio-style visualizations

---

## 🏗️ ARCHITECTURAL OVERVIEW

### Technology Stack

| Component | Library | Purpose |
|-----------|---------|---------|
| **Audio I/O** | `cpal 0.16` | Low-level cross-platform audio |
| **Playback** | `rodio 0.21` | High-level playback engine |
| **Decoding** | `symphonia 0.5` | Multi-format decoder |
| **DSP/FFT** | `rustfft 6.4` | Fast Fourier Transform |
| **Analysis** | `spectrum-analyzer 1.7` | Frequency spectrum extraction |
| **GUI** | `egui 0.33 + eframe` | Immediate mode UI framework |
| **DI Container** | `shaku 0.6` | Dependency injection |
| **Async Runtime** | `tokio 1.x` | Async task execution |
| **Logging** | `tracing 0.1` | Structured logging |
| **Errors** | `anyhow 1.0` | Error handling |

### Service Architecture (Shaku DI Pattern)

```
AudioForgeModule
├── IAudioPlayer           → AudioPlayerService
├── IAudioAnalyzer         → AudioAnalyzerService
├── IVisualizationEngine   → VisualizationEngineService
├── IAudioEffects          → AudioEffectsService
└── IMultiChannelOutput    → MultiChannelOutputService
```

---

## 📁 PROJECT STRUCTURE

```
audio-forge/
├── Cargo.toml                           # Dependencies manifest
├── README.md                            # User documentation
├── .gitignore
├── src/
│   ├── main.rs                          # egui app entry point
│   ├── lib.rs                           # Public API exports
│   │
│   ├── services/
│   │   ├── mod.rs                       # Shaku module + component registration
│   │   │
│   │   ├── interfaces/                  # Trait definitions (I*)
│   │   │   ├── mod.rs
│   │   │   ├── i_audio_player.rs        # Playback control trait
│   │   │   ├── i_audio_analyzer.rs      # FFT analysis trait
│   │   │   ├── i_visualization_engine.rs # Rendering trait
│   │   │   ├── i_audio_effects.rs       # Effects pipeline trait
│   │   │   └── i_multi_channel_output.rs # 8.1 channel routing trait
│   │   │
│   │   ├── audio_player.rs              # Rodio-based implementation
│   │   ├── audio_analyzer.rs            # RustFFT integration
│   │   ├── visualization_engine.rs      # Waveform/spectrum rendering
│   │   ├── audio_effects.rs             # 8D/drop/volume DSP
│   │   └── multi_channel_output.rs      # Cpal 8.1 channel mapping
│   │
│   ├── config/
│   │   ├── mod.rs
│   │   └── app_config.rs                # YAML-based configuration
│   │
│   ├── ui/
│   │   ├── mod.rs
│   │   ├── main_window.rs               # Root egui container
│   │   ├── waveform_widget.rs           # Time-domain plot
│   │   └── spectrum_widget.rs           # Frequency bars widget
│   │
│   └── contracts/                       # Data transfer objects
│       ├── mod.rs
│       ├── audio_state.rs               # Playback state
│       ├── frequency_spectrum.rs        # FFT result data
│       └── effect_parameters.rs         # DSP configuration
│
├── tests/
│   ├── integration_tests.rs             # Full pipeline tests
│   ├── mocks/
│   │   ├── mock_audio_player.rs         # Mockall-generated mocks
│   │   └── mock_audio_analyzer.rs
│   └── test_assets/
│       └── test_audio_44100hz_stereo.wav # Test fixture
│
└── assets/
    └── fonts/                           # Optional custom fonts
```

---

## 📦 CARGO.TOML

```toml
[package]
name = "audio-forge"
version = "0.1.0"
edition = "2021"
rust-version = "1.88.0"

[dependencies]
# Audio Core
cpal = "0.16"
rodio = { version = "0.21", features = ["symphonia-all"] }
symphonia = { version = "0.5", features = ["all"] }
hound = "3.5"

# DSP & Analysis
rustfft = { version = "6.4", features = ["avx"] }
spectrum-analyzer = "1.7"

# GUI
egui = "0.33"
eframe = { version = "0.33", default-features = false, features = ["glow"] }

# Architecture
shaku = "0.6"
tokio = { version = "1", features = ["rt-multi-thread", "sync", "macros"] }
async-trait = "0.1"

# Utilities
anyhow = "1.0"
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }
serde = { version = "1.0", features = ["derive"] }
serde_yaml = "0.9"

[dev-dependencies]
mockall = "0.13"

[profile.release]
opt-level = 3
lto = true
codegen-units = 1
```

---

## 🧬 SERVICE INTERFACE SPECIFICATIONS

### 1. IAudioPlayer (Playback Control)

```rust
// src/services/interfaces/i_audio_player.rs

/// # Responsibility
/// Controls audio playback: load, play, pause, seek, volume.
#[async_trait]
pub trait IAudioPlayer: Interface {
    /// Load audio file (WAV/MP3/FLAC/OGG/AAC). Returns total duration.
    async fn load_file(&mut self, path: &Path) -> Result<Duration>;
    
    /// Start/resume playback
    fn play(&mut self) -> Result<()>;
    
    /// Pause playback (non-destructive)
    fn pause(&mut self) -> Result<()>;
    
    /// Stop and reset to beginning
    fn stop(&mut self) -> Result<()>;
    
    /// Seek to timestamp
    fn seek(&mut self, position: Duration) -> Result<()>;
    
    /// Set volume [0.0, 1.0]
    fn set_volume(&mut self, volume: f32) -> Result<()>;
    
    /// Current position
    fn current_position(&self) -> Duration;
    
    /// Total duration
    fn total_duration(&self) -> Duration;
    
    /// Playback status
    fn is_playing(&self) -> bool;
}
```

### 2. IAudioAnalyzer (FFT Analysis)

```rust
// src/services/interfaces/i_audio_analyzer.rs

/// # Responsibility
/// Performs FFT analysis for visualization and instrument detection.
pub trait IAudioAnalyzer: Interface {
    /// Compute frequency spectrum from audio samples
    fn analyze_spectrum(&self, samples: &[f32], sample_rate: u32) -> Result<FrequencySpectrum>;
    
    /// Detect instruments via frequency range analysis
    /// Returns: (bass_level, mid_level, treble_level) in [0.0, 1.0]
    fn detect_instruments(&self, spectrum: &FrequencySpectrum) -> (f32, f32, f32);
    
    /// Downsample waveform for visualization
    fn get_waveform_samples(&self, audio_buffer: &[f32], target_samples: usize) -> Vec<f32>;
}
```

### 3. IVisualizationEngine (UI Rendering)

```rust
// src/services/interfaces/i_visualization_engine.rs

/// # Responsibility
/// Renders waveform and spectrum widgets in egui.
pub trait IVisualizationEngine: Interface {
    /// Time-domain waveform plot
    fn render_waveform(&self, ui: &mut Ui, samples: &[f32]) -> Response;
    
    /// Frequency-domain spectrum bars
    fn render_spectrum(&self, ui: &mut Ui, spectrum: &FrequencySpectrum) -> Response;
    
    /// Instrument detection overlay (color-coded regions)
    fn render_instrument_map(&self, ui: &mut Ui, bass: f32, mid: f32, treble: f32) -> Response;
}
```

### 4. IAudioEffects (DSP Pipeline)

```rust
// src/services/interfaces/i_audio_effects.rs

/// # Responsibility
/// Real-time audio effects: 8D, drop, frequency boost.
pub trait IAudioEffects: Interface {
    /// 8D audio: circular panning + HRTF simulation
    fn apply_8d_effect(&mut self, samples: &mut [f32], sample_rate: u32, intensity: f32) -> Result<()>;
    
    /// Drop effect: pitch/volume reduction
    fn apply_drop_effect(&mut self, samples: &mut [f32], drop_amount: f32) -> Result<()>;
    
    /// Boost frequency range (parametric EQ)
    fn boost_frequency_range(&mut self, samples: &mut [f32], low_hz: f32, high_hz: f32, gain: f32) -> Result<()>;
    
    /// Enable/disable effects
    fn set_enabled(&mut self, enabled: bool);
    
    /// Get configuration
    fn get_config(&self) -> &EffectConfig;
}
```

### 5. IMultiChannelOutput (8.1 Channel Routing)

```rust
// src/services/interfaces/i_multi_channel_output.rs

/// # Responsibility
/// Routes audio to 8.1 surround output (7.1 + subwoofer).
pub trait IMultiChannelOutput: Interface {
    /// Configure device for 8-channel output
    fn configure_8_1_channels(&mut self) -> Result<()>;
    
    /// Upmix stereo to 8.1 channels
    fn upmix_stereo_to_8_1(&self, stereo_samples: &[f32]) -> Result<Vec<f32>>;
    
    /// Check 8.1 hardware availability
    fn is_8_1_supported(&self) -> bool;
    
    /// Fallback to stereo
    fn fallback_to_stereo(&mut self) -> Result<()>;
}
```

---

## 🎨 UI DESIGN (EGUI LAYOUT)

### Main Window Structure

```
┌─────────────────────────────────────────────────────────┐
│  ▶ Play  ⏸ Pause  ⏹ Stop  [═══════Volume═══════]      │ Top Panel
├───────────────────┬─────────────────────────────────────┤
│   WAVEFORM        │   FREQUENCY SPECTRUM                │
│   ┌─────────┐     │   ┌───┬───┬───┬───┬───┬───┬───┐    │
│   │ ∿∿∿∿∿∿∿ │     │   │███│██ │█  │██ │███│██ │█  │    │
│   │∿∿   ∿∿∿│     │   │███│██ │█  │██ │███│██ │█  │    │
│   │  ∿∿∿   ∿│     │   │███│██ │█  │██ │███│██ │█  │    │ Side Panels
│   └─────────┘     │   └───┴───┴───┴───┴───┴───┴───┘    │
│                   │                                     │
│   Time Domain     │   INSTRUMENT MAP                    │
│                   │   🔴 Bass  🟢 Mid  🔵 Treble        │
├───────────────────┴─────────────────────────────────────┤
│  [8D Effect] [Drop: ═════0.5═════] [Boost: Bass]       │ Bottom Panel
├─────────────────────────────────────────────────────────┤
│  ████████████████████████──────────────── 2:34 / 4:12   │ Progress Bar
└─────────────────────────────────────────────────────────┘
```

---

## 🔬 TESTING STRATEGY

### Unit Tests (Mockall)

```rust
// tests/mocks/mock_audio_player.rs

use mockall::mock;

mock! {
    pub AudioPlayer {}
    
    #[async_trait]
    impl IAudioPlayer for AudioPlayer {
        async fn load_file(&mut self, path: &Path) -> Result<Duration>;
        fn play(&mut self) -> Result<()>;
        fn pause(&mut self) -> Result<()>;
        fn stop(&mut self) -> Result<()>;
        fn seek(&mut self, position: Duration) -> Result<()>;
        fn set_volume(&mut self, volume: f32) -> Result<()>;
        fn current_position(&self) -> Duration;
        fn total_duration(&self) -> Duration;
        fn is_playing(&self) -> bool;
    }
}

#[tokio::test]
async fn test_load_file_returns_duration() {
    let mut mock = MockAudioPlayer::new();
    mock.expect_load_file()
        .times(1)
        .returning(|_| Ok(Duration::from_secs(180)));
    
    let result = mock.load_file(Path::new("test.wav")).await;
    assert_eq!(result.unwrap(), Duration::from_secs(180));
}
```

### Integration Tests

```rust
// tests/integration_tests.rs

#[tokio::test]
async fn test_full_pipeline_load_analyze_play() {
    // Create DI module
    let module = create_test_module();
    
    // Resolve services
    let player: Arc<dyn IAudioPlayer> = module.resolve();
    let analyzer: Arc<dyn IAudioAnalyzer> = module.resolve();
    
    // Test playback
    let duration = player.load_file(Path::new("tests/test_assets/test_audio_44100hz_stereo.wav"))
        .await
        .unwrap();
    assert!(duration > Duration::ZERO);
    
    // Test analysis
    let samples = vec![0.0; 4096];
    let spectrum = analyzer.analyze_spectrum(&samples, 44100).unwrap();
    assert!(!spectrum.frequencies.is_empty());
    
    // Test state
    player.play().unwrap();
    assert!(player.is_playing());
}
```

---

## 🚀 IMPLEMENTATION ROADMAP

### Phase 1: Core Playback (Week 1)
**Priority**: CRITICAL

- [ ] Project scaffold (`cargo new audio-forge`)
- [ ] Implement `IAudioPlayer` with rodio/symphonia
- [ ] Implement `IMultiChannelOutput` with cpal
- [ ] Basic egui window with play/pause/stop controls
- [ ] Unit tests for AudioPlayerService
- [ ] Integration test: Load → Play → Pause → Stop

**Deliverable**: Working audio player with basic controls

---

### Phase 2: Visualization (Week 2)
**Priority**: HIGH

- [ ] Implement `IAudioAnalyzer` with rustfft
- [ ] Implement `IVisualizationEngine` with egui
- [ ] Waveform widget (time-domain line plot)
- [ ] Frequency spectrum widget (bar chart)
- [ ] Instrument detection logic (bass/mid/treble classification)
- [ ] Real-time audio buffer capture for visualization
- [ ] Unit tests for analysis service

**Deliverable**: Live waveform and spectrum visualization

---

### Phase 3: Effects Pipeline (Week 3)
**Priority**: MEDIUM

- [ ] Implement `IAudioEffects` with custom DSP
- [ ] 8D audio algorithm:
  - Circular panning (L/R oscillation)
  - HRTF simulation (ITD + ILD)
  - Reverb/delay for spatial depth
- [ ] Drop effect (pitch shift + volume fade)
- [ ] Frequency boost (parametric EQ with Q factor)
- [ ] Real-time effect toggle in UI
- [ ] Unit tests for each effect

**Deliverable**: Working 8D audio and effects pipeline

---

### Phase 4: 8.1 Channel Support (Week 4)
**Priority**: MEDIUM

- [ ] Implement 8.1 channel upmixing algorithm
- [ ] Detect available audio output devices
- [ ] Graceful fallback to stereo if 8.1 unavailable
- [ ] Channel mapping UI (visual representation)
- [ ] Integration test with virtual 8.1 device

**Deliverable**: Full 8.1 surround support

---

### Phase 5: Polish & Optimization (Week 5)
**Priority**: LOW

- [ ] Performance profiling (`cargo flamegraph`)
- [ ] Optimize FFT latency (target: <16ms @ 60fps)
- [ ] Memory leak detection (`cargo miri`)
- [ ] UI responsiveness improvements
- [ ] Documentation (README + rustdoc)
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Release build optimization

**Deliverable**: Production-ready binary

---

## 🎯 8D AUDIO PROCESSING ALGORITHM

### Theory

**8D Audio** = Binaural 3D spatialization via:
1. **Panning**: Circular left-right movement
2. **ITD** (Interaural Time Difference): Delay between ears (0-700μs)
3. **ILD** (Interaural Level Difference): Volume difference between ears
4. **Reverb**: Distance/room simulation

### Implementation Pseudocode

```rust
fn apply_8d_effect(samples: &mut [f32], sample_rate: u32, intensity: f32, time: f32) {
    let rotation_hz = 0.25; // 4-second rotation
    let pan_angle = 2.0 * PI * rotation_hz * time;
    
    for i in (0..samples.len()).step_by(2) {
        let left = samples[i];
        let right = samples[i + 1];
        
        // Circular panning
        let pan = pan_angle.sin() * intensity;
        let left_gain = (1.0 - pan) * 0.5;
        let right_gain = (1.0 + pan) * 0.5;
        
        // Apply ITD (delay simulation)
        let delay_samples = (pan.abs() * 0.0007 * sample_rate as f32) as usize;
        // Delay left channel when panning right, vice versa
        
        // Apply ILD (volume difference)
        samples[i] = left * left_gain + right * (1.0 - left_gain);
        samples[i + 1] = right * right_gain + left * (1.0 - right_gain);
    }
}
```

---

## 📊 INSTRUMENT DETECTION ALGORITHM

### Frequency Range Classification

| Instrument | Frequency Range | Detection Logic |
|------------|----------------|-----------------|
| **Bass** | 20-250 Hz | Sum FFT bins in range, normalize |
| **Kick Drum** | 50-100 Hz | Peak detection @ 60-80Hz |
| **Snare** | 150-250 Hz + 3-5 kHz | Dual-band peak detection |
| **Hi-hat** | 8-15 kHz | High-frequency energy |
| **Vocals** | 300-3000 Hz | Spectral centroid in mid-range |

### Implementation

```rust
fn detect_instruments(spectrum: &FrequencySpectrum) -> (f32, f32, f32) {
    let bass = spectrum.average_amplitude_in_range(20.0, 250.0);
    let mid = spectrum.average_amplitude_in_range(250.0, 3000.0);
    let treble = spectrum.average_amplitude_in_range(3000.0, 20000.0);
    
    // Normalize to [0.0, 1.0]
    let max = bass.max(mid).max(treble);
    (bass / max, mid / max, treble / max)
}
```

---

## ⚠️ CRITICAL CONSTRAINTS

| Constraint | Requirement | Enforcement |
|-----------|-------------|-------------|
| **Language** | Pure Rust only | No JS/Python/C++ |
| **Build** | `cargo build --release` success | CI gate |
| **Tests** | `cargo test` 100% pass | CI gate |
| **Architecture** | Shaku DI pattern | Manual review |
| **Docstrings** | `# Responsibility` on all public items | Linter check |
| **Error Handling** | `anyhow::Result`, no unwrap() in prod | Clippy lint |
| **Logging** | `tracing` macros only | Grep check |
| **Memory** | Max 200MB heap during playback | `valgrind` profiling |
| **Latency** | FFT < 16ms (60fps) | `tracing` spans |

---

## 📊 PERFORMANCE BENCHMARKS

| Metric | Target | Measurement Tool |
|--------|--------|-----------------|
| **FFT Latency** | < 16ms | `tracing::span!` timing |
| **Audio Latency** | < 10ms | cpal buffer callback time |
| **UI Frame Time** | < 16ms (60fps) | egui built-in profiler |
| **Memory Usage** | < 200MB | `cargo flamegraph --memory` |
| **Binary Size** | < 50MB | `ls -lh target/release/audio-forge` |
| **Cold Start** | < 1s | `time ./audio-forge` |

---

## 🔗 REFERENCE DOCUMENTATION

### Audio Libraries
- **cpal docs**: https://docs.rs/cpal/latest/cpal/
- **rodio docs**: https://docs.rs/rodio/latest/rodio/
- **symphonia docs**: https://docs.rs/symphonia/latest/symphonia/

### DSP Libraries
- **rustfft docs**: https://docs.rs/rustfft/latest/rustfft/
- **spectrum-analyzer docs**: https://docs.rs/spectrum-analyzer/latest/spectrum_analyzer/

### GUI
- **egui docs**: https://docs.rs/egui/latest/egui/
- **egui demo**: https://www.egui.rs/#demo

### Architecture
- **QUALIA.CODE.RUST**: `@docs/QUALIA.CODE.RUST.md`
- **Copilot Instructions**: `@.github/copilot-instructions.md`

---

## 🚀 QUICK START COMMANDS

### Initialize Project
```bash
cd /media/seikarii/Nvme/QualiaTempo
mkdir audio-forge && cd audio-forge
cargo init --name audio-forge
```

### Add Dependencies
```bash
cargo add cpal rodio egui eframe rustfft spectrum-analyzer hound symphonia
cargo add shaku tokio async-trait anyhow tracing tracing-subscriber serde serde_yaml
cargo add --dev mockall
```

### Build & Test
```bash
cargo build --release
cargo test
cargo clippy -- -D warnings
cargo fmt --check
```

### Run
```bash
cargo run --release
```

---

## 📝 CHECKLIST FOR COMPLETION

### Core Features
- [ ] Audio file loading (WAV/MP3/FLAC/OGG/AAC)
- [ ] Play/Pause/Stop/Seek controls
- [ ] Volume control
- [ ] Real-time waveform visualization
- [ ] Real-time frequency spectrum
- [ ] Instrument detection (bass/mid/treble)
- [ ] 8D audio effect
- [ ] Drop effect
- [ ] Frequency boost effect
- [ ] 8.1 channel output support

### Architecture
- [ ] All services follow `I*` trait pattern
- [ ] Shaku DI module with `#[Component]`
- [ ] `# Responsibility` docstrings on all public items
- [ ] `anyhow::Result` error handling
- [ ] `tracing` logging (no println!)
- [ ] Unit tests with mockall
- [ ] Integration tests

### Quality Assurance
- [ ] `cargo build --release` passes
- [ ] `cargo test` passes 100%
- [ ] `cargo clippy` clean
- [ ] `cargo fmt` applied
- [ ] FFT latency < 16ms
- [ ] Memory usage < 200MB
- [ ] Binary size < 50MB

---

**END OF MISSION DIRECTIVE**

*"From research to architecture. From architecture to execution. From execution to production."*

**DIRECTIVE STATUS**: ✅ READY FOR IMPLEMENTATION
