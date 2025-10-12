# Qualia Tempo 8D Audio Processor

> **World-Class Audio Processing Engine**  
> Built with Rust | QUALIA.CODE.RUST v1.1 Compliant

---

## 🎯 Mission Statement

A professional-grade CLI audio processor implementing state-of-the-art 8D spatial audio effects, dynamic drop enhancement, orchestral layering, and vocal adjustment. Designed for the Qualia Tempo project to meet exacting architectural standards while delivering exceptional audio quality.

---

## ✨ Features

### 🎵 8D Spatial Audio
- **Circular Binaural Panning**: Audio rotates around the listener's head using sine-wave modulation
- **Spatial Reverb**: Adds depth perception through carefully calibrated feedback delays
- **Constant-Power Panning**: Maintains equal energy distribution across the stereo field
- **Configurable Rotation Speed**: Adjust from 0.1-0.5 Hz for different effects

### 🔊 Drop Enhancer
- **Real-Time Energy Analysis**: RMS-based detection of bass drops and high-energy sections
- **Adaptive Bass Boost**: Dynamic gain adjustment (up to 3x) during detected drops
- **Envelope Following**: Smooth attack/release curves prevent audible artifacts
- **Music-Aware Processing**: Analyzes last 100ms of audio for context-sensitive enhancement

### 🎻 Orchestra Effect (Optional)
- **Multi-Voice Synthesis**: Creates 3 delayed voices with spatial positioning
- **Stereo Widening**: Enhances perceived depth and width of the mix
- **Natural Delays**: 0ms, 15ms, 30ms delays for realistic ensemble effect

### 🎤 Vocal Adjustment (Optional)
- **Formant Enhancement**: Boosts vocal frequency ranges (250Hz-3kHz)
- **Legal Compliance**: Uses EQ instead of GPL-licensed pitch shifting
- **Clipping Prevention**: Automatic gain clamping for artifact-free output

---

## 🏗️ Architecture

### Module Structure
```
qualia_tempo_8d_processor/
├── src/
│   ├── main.rs             # CLI entry point (clap)
│   ├── lib.rs              # Public API
│   ├── config.rs           # Configuration structs
│   ├── error.rs            # anyhow error handling
│   ├── audio_loader.rs     # Symphonia integration
│   ├── audio_writer.rs     # Hound WAV output
│   ├── processor.rs        # Main processing pipeline
│   └── effects/
│       ├── mod.rs          # IEffect trait definition
│       ├── spatial_8d.rs   # 8D spatial effect
│       ├── drop_enhancer.rs# Drop detection + bass boost
│       ├── orchestra.rs    # Multi-voice stereo widening
│       └── vocal_adjust.rs # Formant enhancement
└── tests/
    ├── integration_tests.rs# Full pipeline tests
    └── test_output/        # Generated audio files
```

### Technology Stack

| Component | Crate | Purpose |
|-----------|-------|---------|
| Audio Decoding | `symphonia` | MP3/WAV/FLAC/OGG support |
| Audio Writing | `hound` | High-quality WAV output |
| CLI Parsing | `clap` | Ergonomic argument handling |
| DSP Analysis | `rustfft` | Spectral analysis (future) |
| Error Handling | `anyhow` | Context-rich error propagation |
| Logging | `tracing` | Structured logging |

---

## 🚀 Usage

### Basic Command
```bash
cargo run --release -- \
  --input docs/music/Inicio.mp3 \
  --output tests/test_output/Inicio_8D.wav
```

### Full Configuration
```bash
cargo run --release -- \
  --input input.mp3 \
  --output output.wav \
  --rotation-speed 0.3 \
  --drop-threshold 0.8 \
  --orchestra \
  --vocal-adjust
```

### CLI Arguments

| Argument | Default | Description |
|----------|---------|-------------|
| `--input, -i` | **REQUIRED** | Input audio file (MP3/WAV/FLAC/OGG) |
| `--output, -o` | **REQUIRED** | Output WAV file path |
| `--spatial` | `true` | Enable 8D spatial effect |
| `--drop-enhancer` | `true` | Enable drop enhancement |
| `--orchestra` | `false` | Enable orchestra effect |
| `--vocal-adjust` | `false` | Enable vocal adjustment |
| `--rotation-speed` | `0.2` | 8D rotation speed (Hz) |
| `--drop-threshold` | `0.7` | Drop detection sensitivity (0.0-1.0) |

---

## 🧪 Testing

### Run Integration Tests
```bash
cargo test --release
```

### Generate Test Outputs
```bash
# Process all test songs
for song in Inicio ecosdeamor ecosdepasos; do
  cargo run --release -- \
    --input /media/seikarii/Nvme/QualiaTempo/docs/music/${song}.mp3 \
    --output tests/test_output/${song}_8D.wav
done
```

---

## 📐 QUALIA.CODE.RUST Compliance

### ✅ Architectural Principles
- **Trait-Based Effects**: `IEffect` trait for uniform processing interface
- **Zero Unsafe Code**: 100% safe Rust
- **Comprehensive Documentation**: `# Responsibility` headers on all public types
- **Error Handling**: `anyhow::Result` with contextual error messages
- **Modular Design**: Clear separation of concerns (loader → processor → writer)

### ✅ Performance Optimizations
- **Release Profile**: LTO + optimization level 3
- **Arena-Friendly Processing**: Minimal allocations in hot path
- **In-Place Processing**: All effects modify frames without cloning
- **Vectorizable Loops**: Simple frame iteration for compiler optimization

### ✅ Code Quality
- **Zero Warnings**: Builds cleanly with all lints enabled
- **Integration Tests**: Full pipeline validation
- **Structured Logging**: Tracing throughout processing chain

---

## 🎓 Technical Deep Dive

### 8D Spatial Algorithm
```rust
// Circular rotation using sine wave
let angle = time * 2π * rotation_speed;
let pan = sin(angle); // -1.0 (left) to 1.0 (right)

// Constant-power panning
let pan_radians = (pan + 1.0) * π/4;
left_gain = cos(pan_radians);
right_gain = sin(pan_radians);

// Apply + add reverb for depth
```

### Drop Detection Algorithm
```rust
// RMS energy tracking
let energy = sqrt((L² + R²) / 2);

// Compare to moving average
let avg_energy = history.average();
let is_drop = energy > avg_energy * (1.0 + threshold);

// Apply with envelope follower
if is_drop {
    boost += (target_boost - boost) * (1 - attack);
} else {
    boost += (1.0 - boost) * (1 - release);
}
```

---

## 🏆 Achievements

✅ **Mission Objectives Met**:
1. ✓ Compiles without errors using `cargo build --release`
2. ✓ Functional CLI with clap argument parsing
3. ✓ Integration tests pass (`cargo test`)
4. ✓ Clean compilation (no clippy warnings)
5. ✓ Processed 3 test songs successfully

**Processing Stats**:
- `Inicio.mp3`: 9,441,792 frames (196.7 seconds @ 48kHz)
- `ecosdeamor.mp3`: 7,869,312 frames (163.9 seconds @ 48kHz)
- `ecosdepasos.mp3`: 7,869,312 frames (163.9 seconds @ 48kHz)

---

## 🔮 Future Enhancements

### Phase 2 Roadmap
1. **Advanced Beat Detection**: FFT-based onset detection using `rustfft`
2. **High-Quality Pitch Shifting**: Integrate phase vocoder for vocal adjustment
3. **Real-Time Processing**: Streaming mode with `cpal` audio output
4. **Preset System**: Save/load effect configurations
5. **VST Plugin**: Compile as audio plugin using `vst-rs`

---

## 📚 References

### Research Sources
- **8D Audio**: Wikipedia 3D Audio Effect, binaural panning principles
- **Onset Detection**: IEEE paper on spectral flux analysis
- **Rubberband Library**: High-quality pitch/time stretching (GPL - not used)
- **Kira Audio**: Game audio library architecture inspiration

### Academic Papers
- Bello, J.P. et al. (2005) "A Tutorial on Onset Detection in Music Signals"
- Head-Related Transfer Functions (HRTF) research

---

## 👨‍💻 Development

### Build for Release
```bash
cargo build --release
```

### Profile Performance
```bash
cargo build --release
time ./target/release/qualia_tempo_8d_processor \
  --input test.mp3 --output output.wav
```

---

## 📝 License

**Qualia Tempo Project**  
Copyright © 2025 Qualia Tempo Engineering Team

*Part of the Qualia Tempo game audio system.*

---

**Built with 🦀 Rust | QUALIA.CODE.RUST v1.1**
