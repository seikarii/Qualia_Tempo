# Qualia Tempo 8D Audio Processor + Harmony Analysis Engine
## Production-Grade Standalone Spatial Audio & Musical Intelligence System

**VERSION**: 2.0  
**COMPLIANCE**: QUALIA.CODE.RUST v1.1 (RUST ONLY - ZERO PYTHON)  
**STATUS**: Production-Ready Architecture (NO MVP)  
**TARGET**: Industrial-strength batch processing with ML-powered music theory extraction

---

## 🎯 MISSION OBJECTIVE

Construir un procesador de audio **PRODUCTION-GRADE STANDALONE** en Rust puro que:

### Core Capabilities (NO Optional Features)

1. **HRTF-Based 8D Spatialization** (MIT KEMAR + cubic interpolation)
2. **ML-Powered MIDI Transcription** (Basic-Pitch ONNX + onset detection)
3. **Harmonic Analysis Engine** (chromagram → chord recognition → tonality extraction)
4. **Source Separation Ready** (Demucs v4 ONNX integration OR pre-separated stems)
5. **Ensemble Orchestration** (micro-delays + pitch shifting + spatial spread)
6. **Frequency Sculpting** (parametric EQ with presets per instrument class)
7. **Production Audio Pipeline** (48kHz 24-bit, THD+N <0.001%, zero artifacts)

### System Architecture Philosophy

```
┌─────────────────────────────────────────────────────────────┐
│  THIS IS A STANDALONE TOOL. NO GAME DEPENDENCIES.          │
│  Input:  Raw audio files (.mp3, .flac, .wav, .ogg)         │
│  Output: 8D WAV + JSON HarmonyMap + MIDI file              │
└─────────────────────────────────────────────────────────────┘
```

**CRITICAL CLARIFICATIONS:**
- ❌ **NO WebSocket events** - This tool does NOT communicate with a game server
- ❌ **NO "GameLogicService"** - Harmony analysis produces JSON files, not runtime events
- ❌ **NO optional features** - Every component is production-mandatory
- ✅ **Outputs are artifacts** - Generated files can be consumed by ANY system later (game or otherwise)

---

## 🧠 COMPRENSIÓN DE AUDIO 8D

### ¿Qué es Audio 8D?

**Audio 8D** = Espacialización binaural 3D + movimiento circular **automático** de fuentes de sonido alrededor de la cabeza del oyente.

**Componentes técnicos**:
- **HRTF Convolution**: Aplicar Head-Related Impulse Responses (HRIR) para simular cómo el oído percibe sonidos desde posiciones 3D específicas
- **Circular Motion**: Automatizar azimuth θ(t) de 0° a 360° en loop continuo
- **Binaural Output**: Señal estéreo que, con headphones, crea ilusión de sonidos "girando" alrededor de la cabeza

**NO ES**:
- Simplemente panning L-R estéreo
- Surround sound multicanal (no requiere speakers)
- Reverb o delay estéreo

**ES**:
- Convolución con HRTFs posicionales
- Movimiento dinámico en esfera 3D
- Percepción de distancia, elevación y azimuth

### El Efecto "Orquesta"

**Objetivo**: Simular múltiples músicos tocando el mismo instrumento.

**Implementación**:
- Duplicar cada stem 3-7 veces
- Aplicar micro-delays (5-30ms aleatorios)
- Aplicar micro-detuning (±3-8 cents pitch shift)
- Posicionar cada copia en ubicación espacial única pero cercana
- Resultado: Sensación de ensemble/sección orquestal

### Boosting Selectivo

| Instrumento | Frecuencias | Ganancia | Propósito |
|-------------|-------------|----------|-----------|
| **Bass** | 40-120 Hz | +3 a +6 dB | Ancla física, sub-bass |
| **Vocals** | 2-5 kHz | +2 a +4 dB | Claridad, inteligibilidad |
| **Coros** | 3-8 kHz | +3 dB | Brillo, aire sobre backing |

**Técnicas adicionales**:
- Compresión sidechain: voces ducking instrumental
- EQ complementario: reducir mid-low en ensemble voices para evitar mud

---

## 🛠️ STACK TECNOLÓGICO (100% RUST - 2025 CUTTING-EDGE)

### Core Audio Processing

| Crate | Versión | Propósito | Justificación |
|-------|---------|-----------|---------------|
| **cpal** | 0.16+ | Cross-platform audio I/O | Industry standard for Rust audio |
| **dasp** | 0.11+ | DSP fundamentals (filtering, interpolation) | RustAudio ecosystem core |
| **symphonia** | 0.5+ | Multi-codec decoding (MP3/FLAC/OGG/WAV) | Zero-copy, pure Rust decoder |
| **rubato** | 0.15+ | High-quality resampling | Sinc interpolation for 48kHz normalization |
| **hound** | 3.5+ | WAV file writing (24-bit support) | Production-quality audio export |
| **rustfft** | 6.2+ | FFT for convolution | SIMD-accelerated transforms |
| **rayon** | 1.10+ | Parallel stem processing | Data parallelism across cores |

### HRTF Spatialization

| Crate | Versión | Propósito |
|-------|---------|-----------|
| **sofar** | 0.1+ | SOFA dataset loading (libmysofa bindings) |
| **realfft** | 3.3+ | Real-valued FFT for HRIR convolution |

### Machine Learning (ONNX Inference)

| Crate | Versión | Propósito | Why NOT Tract |
|-------|---------|-----------|---------------|
| **ort** | 1.16+ | ONNX Runtime bindings | ✅ Twitter-scale production (100M+ users) |
|  |  |  | ✅ Microsoft ONNX Runtime 1.16 (latest) |
|  |  |  | ✅ GPU acceleration (CUDA/TensorRT/DirectML) |
|  |  |  | ✅ Dynamic model loading (`load-dynamic` feature) |
|  |  |  | ❌ Tract is 0.22 (older, less optimized) |

### Audio Analysis

| Crate | Versión | Propósito |
|-------|---------|-----------|
| **pitch-detection** | 0.3+ | McLeod/YIN pitch detectors |
| **aubio-rs** | 0.2+ | Onset detection, tempo estimation |
| **spectrum-analyzer** | 1.5+ | Real-time FFT spectrum analysis |

### Source Separation (Optional Path)

| Crate | Versión | Propósito |
|-------|---------|-----------|
| **charon-audio** | 0.1+ | Modern ML-powered stem separation |
| **ort** | 1.16+ | Demucs v4 ONNX model inference |

### Pitch Manipulation

| Crate | Versión | Propósito |
|-------|---------|-----------|
| **rubato** | 0.15+ | Pitch shifting via resampling |
| **dasp_sample** | 0.11+ | Sample rate conversion |

### Configuration & Serialization

| Crate | Versión | Propósito |
|-------|---------|-----------|
| **serde** | 1.0 | Serialization framework |
| **serde_json** | 1.0 | JSON output (HarmonyMap contracts) |
| **serde_yaml** | 0.9 | YAML config files |
| **toml** | 0.8 | Alternative config format |

### CLI & Logging

| Crate | Versión | Propósito |
|-------|---------|-----------|
| **clap** | 4.5+ | CLI argument parsing (derive API) |
| **tracing** | 0.1 | Structured logging |
| **tracing-subscriber** | 0.3 | Log output formatting |
| **indicatif** | 0.17+ | Progress bars for batch processing |

### Async Runtime

| Crate | Versión | Propósito |
|-------|---------|-----------|
| **tokio** | 1.41+ | Async runtime for I/O-bound tasks |
| **async-trait** | 0.1 | Async trait methods |

### Optional (Future Enhancement)

| Crate | Propósito |
|-------|-----------|
| **rodio** | Real-time audio preview |
| **egui** | Optional GUI (if needed) |
| **vst3** | VST3 plugin wrapper |

### External Datasets

- **MIT KEMAR HRTF**: 710 SOFA positions (azimuth/elevation)
  - Source: [https://sound.media.mit.edu/resources/KEMAR.html](https://sound.media.mit.edu/resources/KEMAR.html)
  - Format: AES69-2015 SOFA
  - Size: ~50MB
- **Basic-Pitch ONNX Model**: Spotify's MIDI transcription
  - Source: [https://github.com/spotify/basic-pitch](https://github.com/spotify/basic-pitch)
  - Format: ONNX (TensorFlow → ONNX export)
  - Capabilities: Polyphonic transcription, pitch bends, onset detection

---

## 🏗️ ARQUITECTURA DEL SISTEMA

### Diagrama de Componentes (v2.0 - Dynamic Intensity Pipeline)

```
┌──────────────────────────────────────────────────────────────────────┐
│                        INPUT HANDLER                                 │
│  - Multi-codec decoding (symphonia)                                  │
│  - Resampling to 48kHz (rubato)                                      │
│  - Mono/Stereo normalization                                         │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             ▼
         ┌────────────────────────────────────────────────────┐
         │         INTENSITY ANALYZER (NEW v2.0)              │
         │  - RMS-based intensity curve generation            │
         │  - Frame-by-frame analysis [0.0, 1.0]              │
         │  - Drives dynamic effect parameters                │
         └───────────────────┬────────────────────────────────┘
                             │
                             ▼
         ┌────────────────────────────────────────────────────┐
         │   AUDIO PROCESSING PIPELINE (Composition Root)     │
         │                                                     │
         │   process_time_varying(audio, intensity_curve)     │
         │                                                     │
         │   Dynamic effect chain (intensity-modulated):      │
         │   1. FrequencyBooster    (EQ with intensity)       │
         │   2. HarmonicExciter     (3-16kHz psychoacoustic)  │
         │   3. PsychoacousticBass  (missing fundamental)     │
         │   4. ConvolutionReverb   (impulse response)        │
         │   5. EnsembleEffect      (Synchronized mode NEW)   │
         │   6. StereoWidener       (Haas + Mid-Side)         │
         │   7. TransientShaper     (attack/sustain shaping)  │
         └───────────────────┬────────────────────────────────┘
                             │
                             ▼
         ┌────────────────────────────────────────────────────┐
         │  PARALLEL PROCESSING (rayon ThreadPool)            │
         │  For each voice: HRTF spatialization + ML analysis │
         └───────────────────┬────────────────────────────────┘
                             │
      ┌──────────────────────┼──────────────────────┐
      │                      │                      │
      ▼                      ▼                      ▼
┌─────────────┐   ┌──────────────────┐   ┌─────────────────┐
│ CIRCULAR    │   │ HRTF ENGINE      │   │ ML ANALYZER     │
│ MOTION      │   │                  │   │                 │
│             │   │ - SOFA loader    │   │ - MIDI Trans.   │
│ - θ(t) calc │   │ - Position interp│   │ - Chromagram    │
│ - Azimuth   │   │ - FFT convolve   │   │ - Chord Recog.  │
│ - Elevation │   │                  │   │ - HarmonyMap    │
└──────┬──────┘   └────────┬─────────┘   └────────┬────────┘
       │                   │                      │
       └─────────┬─────────┴──────────────────────┘
                 │
                 ▼
         ┌──────────────┐
         │ SPATIAL      │
         │ MIXER        │
         │ - Voice sum  │
         │ - Limiter    │
         └──────┬───────┘
                │
    ┌───────────┼────────────┐
    ▼           ▼            ▼
┌──────────┐ ┌──────┐ ┌──────────────┐
│ 8D WAV   │ │ MIDI │ │ HarmonyMap   │
│ (24-bit) │ │ File │ │ JSON         │
└──────────┘ └──────┘ └──────────────┘
```

**CAMBIOS ARQUITECTÓNICOS CLAVE v2.0:**
- ✅ **IntensityAnalyzer**: Nuevo módulo que genera curva de intensidad [0.0, 1.0] frame-by-frame
- ✅ **AudioProcessingPipeline**: Composition Root centralizado que orquesta todos los efectos
- ✅ **process_time_varying()**: Método principal que aplica efectos con modulación dinámica por intensidad
- ✅ **EnsembleMode::Synchronized**: Nuevo modo con intensity gating (activación >= 0.7)
- ✅ **7 Efectos Modulados**: Todos los efectos ahora reciben parámetro `intensity` para modulación expresiva

### Módulos del Código

```
src/
├── main.rs                      # CLI entry point
├── lib.rs                       # Public API
├── config.rs                    # Config loading (YAML/JSON)
│
├── audio/
│   ├── mod.rs
│   ├── input_handler.rs         # InputHandler struct (Symphonia decoder + resampler)
│   ├── pipeline.rs              # AudioProcessingPipeline (Composition Root - CENTRAL)
│   ├── hrtf_convolution.rs      # HRTFConvolver struct (FFT-based SOFA convolution)
│   ├── circular_motion.rs       # CircularMotionEngine struct (θ(t) calculator)
│   ├── ensemble_effect.rs       # EnsembleEffect struct (Humanized/Rhythmic/Synchronized modes)
│   ├── frequency_booster.rs     # FrequencyBooster struct (parametric EQ with intensity)
│   ├── harmonic_exciter.rs      # HarmonicExciter struct (3-16kHz psychoacoustic enhancement)
│   ├── stereo_widener.rs        # StereoWidener struct (Haas + Mid-Side processing)
│   ├── transient_shaper.rs      # TransientShaper struct (attack/sustain dynamic shaping)
│   ├── psychoacoustic_bass.rs   # PsychoacousticBass struct (missing fundamental synthesis)
│   ├── convolution_reverb.rs    # ConvolutionReverb struct (impulse response convolution)
│   ├── sofa_loader.rs           # SofaLoader struct (MIT KEMAR dataset loader)
│   └── spatial_mixer.rs         # SpatialMixer struct (stem summing + limiter)
│
├── analysis/
│   ├── mod.rs
│   ├── intensity_analyzer.rs    # IntensityAnalyzer struct (RMS-based intensity curve)
│
├── ml/
│   ├── mod.rs
│   ├── midi_transcription.rs    # BasicPitchTranscriber (monophonic MPM transcription)
│   ├── onset_detection.rs       # OnsetDetector (aubio-rs)
│   ├── chromagram.rs            # ChromagramAnalyzer (12-bin pitch class analysis)
│   ├── chord_recognition.rs     # ChordRecognizer (template matching)
│   └── harmony_map_builder.rs   # HarmonyMapBuilder (Krumhansl-Schmuckler tonality)
│
├── contracts/
│   ├── mod.rs
│   ├── harmony_map.rs           # HarmonyMap struct (JSON serializable music theory)
│   ├── midi_note.rs             # MidiNote struct (transcription output)
│   └── audio_metadata.rs        # AudioMetadata struct (processing metadata)
│
```

**NOTA ARQUITECTÓNICA CRÍTICA**: `pipeline.rs` es el **Composition Root** del sistema. Orquesta todos los efectos (FrequencyBooster → HarmonicExciter → PsychoacousticBass → ConvolutionReverb → EnsembleEffect → StereoWidener → TransientShaper) con procesamiento **dinámico basado en curva de intensidad** vía método `process_time_varying()`.

---

## 🔧 MÓDULOS DETALLADOS - PRODUCCIÓN COMPLETA

### 1. InputHandler (Audio Decoding & Normalization)

**Responsabilidad**: Carga, decodifica y normaliza streams de audio.

```rust
// src/audio/input_handler.rs

/// # Responsibility
/// Loads audio files, decodes them via Symphonia, and resamples to target rate.
pub struct InputHandler {
    target_sample_rate: u32,
}

impl InputHandler {
    pub fn new(target_sample_rate: u32) -> Self { /* ... */ }
    
    pub fn load_stem(&self, path: &Path) -> Result<AudioBuffer> {
        // 1. Abrir archivo con symphonia
        // 2. Decodificar a f32 samples
        // 3. Resample a target_sample_rate si necesario (rubato)
        // 4. Convertir a mono si es estéreo (promedio L+R)
    }
    
    pub fn load_stems_parallel(&self, paths: &[PathBuf]) -> Result<Vec<AudioBuffer>> {
        // Cargar múltiples stems en paralelo con rayon
    }
}

pub struct AudioBuffer {
    pub samples: Vec<f32>,  // Mono, normalized [-1.0, 1.0]
    pub sample_rate: u32,
}
```

---

### 2. CircularMotionEngine

**Responsabilidad**: Calcula posiciones esféricas (θ, φ, r) para cada timestamp.

```rust
// src/audio/circular_motion.rs

/// # Responsibility
/// Generates 3D spherical positions for circular motion over time.
pub struct CircularMotionEngine {
    rotation_speed_rpm: f32,  // Revoluciones por minuto
    radius_meters: f32,
    elevation_degrees: f32,
    direction: RotationDirection,
}

pub enum RotationDirection {
    Clockwise,
    CounterClockwise,
}

impl CircularMotionEngine {
    pub fn calculate_position(&self, time_sec: f64) -> SphericalPosition {
        let omega = self.rotation_speed_rpm * 2.0 * PI / 60.0; // rad/s
        let theta = (omega * time_sec) % (2.0 * PI);
        
        let theta_deg = match self.direction {
            Clockwise => theta.to_degrees(),
            CounterClockwise => 360.0 - theta.to_degrees(),
        };
        
        SphericalPosition {
            azimuth_deg: theta_deg,
            elevation_deg: self.elevation_degrees,
            distance_m: self.radius_meters,
        }
    }
}

pub struct SphericalPosition {
    pub azimuth_deg: f32,      // 0-360°, 0=front, 90=right
    pub elevation_deg: f32,    // -90 to +90°, 0=horizontal
    pub distance_m: f32,       // Metros desde oyente
}
```

---

### 3. HRTFConvolver

**Responsabilidad**: Aplica HRTFs vía convolución para generar señal binaural.

```rust
// src/audio/hrtf_convolution.rs
use sofar::Sofa;  // Rust bindings para libmysofa

/// # Responsibility
/// Loads SOFA dataset and convolves input signal with HRIRs for spatial audio.
pub struct HRTFConvolver {
    sofa_dataset: Sofa,
    fft_planner: FftPlanner<f32>,
    hrir_cache: HashMap<(i32, i32), CachedHRIR>,  // (azimuth, elevation) → HRIR
}

struct CachedHRIR {
    left: Vec<f32>,   // HRIR para oído izquierdo
    right: Vec<f32>,  // HRIR para oído derecho
}

impl HRTFConvolver {
    pub fn new(sofa_path: &Path) -> Result<Self> {
        // Cargar dataset SOFA con sofar crate
    }
    
    pub fn convolve(&self, 
                    input: &[f32], 
                    position: &SphericalPosition) -> Result<BinauralSignal> {
        // 1. Obtener HRIR para posición (interpolar si necesario)
        let (hrir_left, hrir_right) = self.get_hrir_interpolated(position)?;
        
        // 2. Convolución vía FFT (overlap-add method)
        let left_channel = self.fft_convolve(input, &hrir_left)?;
        let right_channel = self.fft_convolve(input, &hrir_right)?;
        
        Ok(BinauralSignal { left: left_channel, right: right_channel })
    }
    
    fn get_hrir_interpolated(&self, pos: &SphericalPosition) -> Result<(Vec<f32>, Vec<f32>)> {
        // Interpolación esférica (VBAP) entre HRIRs vecinos
        // Para smooth transitions durante movimiento
    }
    
    fn fft_convolve(&self, signal: &[f32], impulse: &[f32]) -> Result<Vec<f32>> {
        // FFT-based convolution con rustfft
        // Overlap-add para procesamiento en chunks
    }
}

pub struct BinauralSignal {
    pub left: Vec<f32>,
    pub right: Vec<f32>,
}
```

---

### 4. EnsembleEffect

**Responsabilidad**: Duplica señal con variaciones para efecto orquestal.

```rust
// src/audio/ensemble_effect.rs

/// # Responsibility
/// Creates ensemble/chorus effect by duplicating signal with micro-variations.
pub struct EnsembleEffect {
    num_voices: usize,
    delay_range_ms: (f32, f32),
    pitch_shift_cents: (f32, f32),
    spatial_spread_deg: f32,
}

impl EnsembleEffect {
    pub fn apply(&self, 
                 input: &[f32], 
                 base_position: &SphericalPosition) -> Vec<EnhancedVoice> {
        let mut voices = Vec::with_capacity(self.num_voices);
        
        for i in 0..self.num_voices {
            // 1. Generar delay aleatorio
            let delay_samples = self.random_delay_samples(i);
            let delayed = self.apply_delay(input, delay_samples);
            
            // 2. Aplicar pitch shift aleatorio
            let shifted = self.apply_pitch_shift(&delayed, 
                                                  self.random_pitch_shift(i));
            
            // 3. Calcular posición espacial variada
            let angle_offset = (i as f32 / self.num_voices as f32) 
                               * self.spatial_spread_deg;
            let position = SphericalPosition {
                azimuth_deg: base_position.azimuth_deg + angle_offset,
                elevation_deg: base_position.elevation_deg + 
                               (i as f32 - self.num_voices as f32 / 2.0) * 5.0,
                distance_m: base_position.distance_m,
            };
            
            voices.push(EnhancedVoice {
                samples: shifted,
                position,
                level: 1.0 / self.num_voices as f32,  // Equal loudness
            });
        }
        
        voices
    }
    
    fn apply_pitch_shift(&self, input: &[f32], cents: f32) -> Vec<f32> {
        // Phase vocoder o time-domain pitch shifting
        // Librería: pitch_shift crate (o implementar simple)
    }
}

pub struct EnhancedVoice {
    pub samples: Vec<f32>,
    pub position: SphericalPosition,
    pub level: f32,  // Multiplicador de volumen
}
```

---

### 5. FrequencyBooster

**Responsabilidad**: EQ paramétrico por tipo de instrumento.

```rust
// src/audio/eq_boost.rs
use dasp::signal::Signal;

/// # Responsibility
/// Applies parametric EQ boosts based on instrument type presets.
pub struct FrequencyBooster {
    presets: HashMap<String, Vec<EQBand>>,
}

pub struct EQBand {
    pub frequency_hz: f32,
    pub gain_db: f32,
    pub q_factor: f32,
}

impl FrequencyBooster {
    pub fn apply(&self, input: &[f32], preset_name: &str) -> Result<Vec<f32>> {
        let bands = self.presets.get(preset_name)
            .ok_or_else(|| anyhow!("Preset not found: {}", preset_name))?;
        
        let mut output = input.to_vec();
        
        for band in bands {
            output = self.apply_biquad_filter(
                &output, 
                band.frequency_hz, 
                band.gain_db, 
                band.q_factor
            )?;
        }
        
        Ok(output)
    }
    
    fn apply_biquad_filter(&self, 
                           input: &[f32], 
                           freq: f32, 
                           gain_db: f32, 
                           q: f32) -> Result<Vec<f32>> {
        // Implementar biquad peaking EQ con dasp
        // Coeficientes del filtro via Audio EQ Cookbook
    }
}
```

---

### 6. SpatialMixer

**Responsabilidad**: Combina múltiples señales binaurales en mix final.

```rust
// src/audio/mixer.rs

/// # Responsibility
/// Mixes multiple binaural stems into final stereo output with limiting.
pub struct SpatialMixer {
    limiter_threshold_db: f32,
}

impl SpatialMixer {
    pub fn mix(&self, stems: &[BinauralSignal]) -> Result<BinauralSignal> {
        // 1. Sumar todas las señales
        let mut left_sum = vec![0.0f32; stems[0].left.len()];
        let mut right_sum = vec![0.0f32; stems[0].right.len()];
        
        for stem in stems {
            for (i, sample) in stem.left.iter().enumerate() {
                left_sum[i] += sample;
            }
            for (i, sample) in stem.right.iter().enumerate() {
                right_sum[i] += sample;
            }
        }
        
        // 2. Aplicar limiter para evitar clipping
        self.apply_limiter(&mut left_sum)?;
        self.apply_limiter(&mut right_sum)?;
        
        Ok(BinauralSignal {
            left: left_sum,
            right: right_sum,
        })
    }
    
    fn apply_limiter(&self, samples: &mut [f32]) -> Result<()> {
        let threshold = db_to_linear(self.limiter_threshold_db);
        
        for sample in samples.iter_mut() {
            if sample.abs() > threshold {
                *sample = threshold * sample.signum();
            }
        }
        
        Ok(())
    }
}

fn db_to_linear(db: f32) -> f32 {
    10.0_f32.powf(db / 20.0)
}
```

---

### 7. BasicPitchTranscriber (ML-Powered MIDI Transcription)

**Responsabilidad**: Transcribe audio a MIDI usando modelo ONNX de Spotify Basic-Pitch.

```rust
// src/ml/midi_transcription.rs
use ort::{Session, Value, inputs};

/// # Responsibility
/// Transcribes audio to MIDI using Spotify's Basic-Pitch ONNX model.
/// Outputs polyphonic MIDI notes with pitch bends and onset timestamps.
pub struct BasicPitchTranscriber {
    session: Session,
    sample_rate: u32,
    frame_size: usize,
}

impl BasicPitchTranscriber {
    pub fn new(model_path: &Path, sample_rate: u32) -> Result<Self> {
        let session = Session::builder()?
            .with_optimization_level(ort::GraphOptimizationLevel::Level3)?
            .with_intra_threads(4)?
            .commit_from_file(model_path)?;
        
        Ok(Self {
            session,
            sample_rate,
            frame_size: 2048,
        })
    }
    
    pub fn transcribe(&self, audio: &[f32]) -> Result<Vec<MidiNote>> {
        // 1. Pre-procesamiento: spectrogramas para el modelo
        let input_tensor = self.prepare_input(audio)?;
        
        // 2. Inferencia ONNX
        let outputs = self.session.run(inputs![input_tensor]?)?;
        
        // 3. Post-procesamiento: extraer notas MIDI
        let note_probabilities = outputs["note_probabilities"].try_extract_tensor::<f32>()?;
        let onset_probabilities = outputs["onset_probabilities"].try_extract_tensor::<f32>()?;
        let contour_probabilities = outputs["contour_probabilities"].try_extract_tensor::<f32>()?;
        
        let midi_notes = self.decode_to_midi(
            note_probabilities.view(),
            onset_probabilities.view(),
            contour_probabilities.view(),
        )?;
        
        Ok(midi_notes)
    }
    
    fn prepare_input(&self, audio: &[f32]) -> Result<Value> {
        // Convertir audio a mel-spectrogram
        // Normalizar a [-1, 1]
        // Reshape para formato ONNX [batch, channels, time, freq]
        todo!("Implementar con spectrum-analyzer crate")
    }
    
    fn decode_to_midi(
        &self,
        notes: ndarray::ArrayViewD<f32>,
        onsets: ndarray::ArrayViewD<f32>,
        contours: ndarray::ArrayViewD<f32>,
    ) -> Result<Vec<MidiNote>> {
        // Algoritmo de pico + seguimiento de contorno
        // Threshold-based note onset detection
        // Tracking de pitch bends via contours
        todo!("Implementar decodificador de probabilidades")
    }
}
```

---

### 8. OnsetDetector (Aubio-based Onset Detection)

**Responsabilidad**: Detecta onsets (ataques) de notas para análisis rítmico.

```rust
// src/ml/onset_detection.rs
use aubio_rs::Onset;

/// # Responsibility
/// Detects note onsets (attacks) using aubio's ComplexDomain method.
pub struct OnsetDetector {
    detector: Onset,
    threshold: f32,
}

impl OnsetDetector {
    pub fn new(sample_rate: u32, hop_size: usize) -> Result<Self> {
        let detector = Onset::new(
            aubio_rs::OnsetMode::ComplexDomain,
            1024,  // window size
            hop_size,
            sample_rate,
        )?;
        
        Ok(Self {
            detector,
            threshold: 0.3,
        })
    }
    
    pub fn detect_onsets(&mut self, audio: &[f32]) -> Result<Vec<OnsetEvent>> {
        let mut onsets = Vec::new();
        
        for (frame_idx, chunk) in audio.chunks(512).enumerate() {
            if self.detector.do_result(chunk)? {
                let time_sec = (frame_idx * 512) as f64 / self.sample_rate as f64;
                let confidence = self.detector.get_descriptor();
                
                if confidence > self.threshold {
                    onsets.push(OnsetEvent {
                        time_sec,
                        confidence,
                    });
                }
            }
        }
        
        Ok(onsets)
    }
}

#[derive(Debug, Clone)]
pub struct OnsetEvent {
    pub time_sec: f64,
    pub confidence: f32,
}
```

---

### 9. ChromagramAnalyzer (Pitch Class Analysis)

**Responsabilidad**: Genera chromagrams (distribución de pitch classes) para chord recognition.

```rust
// src/ml/chromagram.rs
use spectrum_analyzer::{FrequencySpectrum, samples_fft_to_spectrum};
use rustfft::FftPlanner;

/// # Responsibility
/// Generates 12-bin chromagrams (pitch class distributions) from audio.
/// Used for chord recognition and key detection.
pub struct ChromagramAnalyzer {
    fft_size: usize,
    hop_size: usize,
    sample_rate: u32,
    fft_planner: FftPlanner<f32>,
}

impl ChromagramAnalyzer {
    pub fn new(sample_rate: u32) -> Self {
        Self {
            fft_size: 8192,  // High resolution for pitch accuracy
            hop_size: 2048,
            sample_rate,
            fft_planner: FftPlanner::new(),
        }
    }
    
    pub fn analyze(&self, audio: &[f32]) -> Result<Vec<Chromagram>> {
        let mut chromagrams = Vec::new();
        
        for (frame_idx, window) in audio.windows(self.fft_size)
            .step_by(self.hop_size)
            .enumerate() 
        {
            let chroma = self.compute_chromagram(window)?;
            
            chromagrams.push(Chromagram {
                time_sec: (frame_idx * self.hop_size) as f64 / self.sample_rate as f64,
                bins: chroma,
            });
        }
        
        Ok(chromagrams)
    }
    
    fn compute_chromagram(&self, window: &[f32]) -> Result<[f32; 12]> {
        // 1. Apply Hann window
        let windowed: Vec<f32> = window.iter()
            .enumerate()
            .map(|(i, &x)| {
                let hann = 0.5 * (1.0 - (2.0 * PI * i as f32 / window.len() as f32).cos());
                x * hann
            })
            .collect();
        
        // 2. FFT
        let spectrum = self.compute_fft(&windowed)?;
        
        // 3. Bin frequencies into 12 pitch classes
        let mut chroma = [0.0; 12];
        
        for (freq_hz, magnitude) in spectrum.iter() {
            if *freq_hz < 20.0 || *freq_hz > 5000.0 {
                continue; // Ignore out-of-range frequencies
            }
            
            let midi_note = Self::hz_to_midi(*freq_hz);
            let pitch_class = (midi_note % 12) as usize;
            chroma[pitch_class] += magnitude;
        }
        
        // 4. Normalize
        let sum: f32 = chroma.iter().sum();
        if sum > 0.0 {
            for bin in &mut chroma {
                *bin /= sum;
            }
        }
        
        Ok(chroma)
    }
    
    fn hz_to_midi(freq_hz: f32) -> i32 {
        (69.0 + 12.0 * (freq_hz / 440.0).log2()).round() as i32
    }
    
    fn compute_fft(&self, samples: &[f32]) -> Result<Vec<(f32, f32)>> {
        // Use rustfft + spectrum-analyzer for clean FFT → frequency/magnitude pairs
        todo!("Implementar con rustfft")
    }
}

#[derive(Debug, Clone)]
pub struct Chromagram {
    pub time_sec: f64,
    pub bins: [f32; 12],  // C, C#, D, D#, E, F, F#, G, G#, A, A#, B
}
```

---

### 10. ChordRecognizer (Template-Based Chord Detection)

**Responsabilidad**: Reconoce acordes a partir de chromagrams usando template matching.

```rust
// src/ml/chord_recognition.rs

/// # Responsibility
/// Recognizes chords from chromagrams using template-based pattern matching.
/// Supports major, minor, diminished, augmented, 7th chords.
pub struct ChordRecognizer {
    chord_templates: HashMap<String, [f32; 12]>,
}

impl ChordRecognizer {
    pub fn new() -> Self {
        let mut templates = HashMap::new();
        
        // Major triads: root, major third, perfect fifth
        templates.insert("C".to_string(), Self::build_template(&[0, 4, 7]));
        templates.insert("C#".to_string(), Self::build_template(&[1, 5, 8]));
        // ... (all 12 major keys)
        
        // Minor triads: root, minor third, perfect fifth
        templates.insert("Cm".to_string(), Self::build_template(&[0, 3, 7]));
        // ... (all 12 minor keys)
        
        // 7th chords
        templates.insert("Cmaj7".to_string(), Self::build_template(&[0, 4, 7, 11]));
        templates.insert("Cm7".to_string(), Self::build_template(&[0, 3, 7, 10]));
        // ... (all variations)
        
        Self { chord_templates: templates }
    }
    
    pub fn recognize(&self, chromagram: &Chromagram) -> Option<ChordLabel> {
        let mut best_match = None;
        let mut best_score = 0.0;
        
        for (chord_name, template) in &self.chord_templates {
            let score = self.cosine_similarity(&chromagram.bins, template);
            
            if score > best_score && score > 0.7 {  // Confidence threshold
                best_score = score;
                best_match = Some(ChordLabel {
                    name: chord_name.clone(),
                    confidence: score,
                    time_sec: chromagram.time_sec,
                });
            }
        }
        
        best_match
    }
    
    fn build_template(pitch_classes: &[usize]) -> [f32; 12] {
        let mut template = [0.0; 12];
        for &pc in pitch_classes {
            template[pc % 12] = 1.0;
        }
        // Normalize
        let sum: f32 = template.iter().sum();
        if sum > 0.0 {
            for bin in &mut template {
                *bin /= sum;
            }
        }
        template
    }
    
    fn cosine_similarity(&self, a: &[f32; 12], b: &[f32; 12]) -> f32 {
        let dot_product: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
        let mag_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
        let mag_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();
        
        if mag_a == 0.0 || mag_b == 0.0 {
            0.0
        } else {
            dot_product / (mag_a * mag_b)
        }
    }
}

#[derive(Debug, Clone)]
pub struct ChordLabel {
    pub name: String,       // e.g., "Cm7", "G", "F#maj7"
    pub confidence: f32,
    pub time_sec: f64,
}
```

---

### 11. HarmonyMapBuilder (Tonality & Structure Extraction)

**Responsabilidad**: Construye HarmonyMap final combinando MIDI, chords y análisis tonal.

```rust
// src/ml/harmony_map_builder.rs

/// # Responsibility
/// Builds final HarmonyMap by analyzing MIDI notes, chord progressions,
/// and extracting key signature via Krumhansl-Schmuckler algorithm.
pub struct HarmonyMapBuilder {
    chord_recognizer: ChordRecognizer,
}

impl HarmonyMapBuilder {
    pub fn new() -> Self {
        Self {
            chord_recognizer: ChordRecognizer::new(),
        }
    }
    
    pub fn build(
        &self,
        midi_notes: &[MidiNote],
        chromagrams: &[Chromagram],
        audio_duration_sec: f64,
    ) -> Result<HarmonyMap> {
        // 1. Detect chord progression
        let chord_progression: Vec<ChordLabel> = chromagrams.iter()
            .filter_map(|chroma| self.chord_recognizer.recognize(chroma))
            .collect();
        
        // 2. Estimate key signature via Krumhansl-Schmuckler
        let key_signature = self.estimate_key(chromagrams)?;
        
        // 3. Detect time signature via onset analysis
        let time_signature = self.estimate_time_signature(midi_notes)?;
        
        // 4. Build harmonic contexts (time regions with stable chords)
        let contexts = self.build_harmonic_contexts(&chord_progression, audio_duration_sec)?;
        
        Ok(HarmonyMap {
            song_id: format!("processed_{}", chrono::Utc::now().timestamp()),
            key_signature,
            time_signature,
            tempo_bpm: self.estimate_tempo(midi_notes)?,
            progression: contexts,
        })
    }
    
    fn estimate_key(&self, chromagrams: &[Chromagram]) -> Result<String> {
        // Krumhansl-Schmuckler key-finding algorithm
        // Correlate average chromagram with major/minor key profiles
        
        let avg_chroma = self.average_chromagram(chromagrams);
        
        let key_profiles = Self::get_key_profiles();
        let mut best_key = String::from("C Major");
        let mut best_score = 0.0;
        
        for (key_name, profile) in key_profiles {
            let score = self.correlate(&avg_chroma, &profile);
            if score > best_score {
                best_score = score;
                best_key = key_name;
            }
        }
        
        Ok(best_key)
    }
    
    fn estimate_time_signature(&self, midi_notes: &[MidiNote]) -> Result<(u8, u8)> {
        // Analyze onset patterns → detect meter (4/4, 3/4, 6/8, etc.)
        // Default to 4/4 if uncertain
        Ok((4, 4))
    }
    
    fn estimate_tempo(&self, midi_notes: &[MidiNote]) -> Result<f32> {
        // Calculate inter-onset intervals (IOI)
        // Peak detection in IOI histogram → dominant tempo
        
        if midi_notes.is_empty() {
            return Ok(120.0);  // Default BPM
        }
        
        let mut iois: Vec<f64> = midi_notes.windows(2)
            .map(|pair| pair[1].start_time_sec - pair[0].start_time_sec)
            .filter(|&ioi| ioi > 0.1 && ioi < 2.0)  // Filter outliers
            .collect();
        
        if iois.is_empty() {
            return Ok(120.0);
        }
        
        iois.sort_by(|a, b| a.partial_cmp(b).unwrap());
        let median_ioi = iois[iois.len() / 2];
        
        let tempo_bpm = 60.0 / median_ioi;
        Ok(tempo_bpm as f32)
    }
    
    fn build_harmonic_contexts(
        &self,
        chords: &[ChordLabel],
        duration_sec: f64,
    ) -> Result<Vec<HarmonicContext>> {
        // Group consecutive identical chords into regions
        let mut contexts = Vec::new();
        let mut current_chord: Option<&ChordLabel> = None;
        let mut region_start = 0.0;
        
        for chord in chords {
            match current_chord {
                Some(prev) if prev.name == chord.name => {
                    // Continue current region
                }
                _ => {
                    // Start new region
                    if let Some(prev) = current_chord {
                        contexts.push(HarmonicContext {
                            start_time_sec: region_start,
                            end_time_sec: chord.time_sec,
                            chord: prev.name.clone(),
                            scale: Self::chord_to_scale(&prev.name),
                        });
                    }
                    current_chord = Some(chord);
                    region_start = chord.time_sec;
                }
            }
        }
        
        // Close final region
        if let Some(chord) = current_chord {
            contexts.push(HarmonicContext {
                start_time_sec: region_start,
                end_time_sec: duration_sec,
                chord: chord.name.clone(),
                scale: Self::chord_to_scale(&chord.name),
            });
        }
        
        Ok(contexts)
    }
    
    fn chord_to_scale(chord_name: &str) -> Vec<String> {
        // Map chord to appropriate scale notes
        // e.g., "Cm7" → C Dorian scale
        // This is a simplified heuristic
        
        let root = &chord_name[0..1];  // Extract root note
        
        if chord_name.contains('m') {
            // Minor chord → Natural minor scale
            Self::build_minor_scale(root)
        } else {
            // Major chord → Major scale
            Self::build_major_scale(root)
        }
    }
    
    fn build_major_scale(root: &str) -> Vec<String> {
        let intervals = [0, 2, 4, 5, 7, 9, 11];  // Major scale intervals
        Self::build_scale(root, &intervals)
    }
    
    fn build_minor_scale(root: &str) -> Vec<String> {
        let intervals = [0, 2, 3, 5, 7, 8, 10];  // Natural minor scale intervals
        Self::build_scale(root, &intervals)
    }
    
    fn build_scale(root: &str, intervals: &[i32]) -> Vec<String> {
        let note_names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
        let root_idx = note_names.iter().position(|&n| n == root).unwrap_or(0);
        
        intervals.iter()
            .map(|&interval| note_names[(root_idx + interval as usize) % 12].to_string())
            .collect()
    }
    
    fn average_chromagram(&self, chromagrams: &[Chromagram]) -> [f32; 12] {
        let mut avg = [0.0; 12];
        for chroma in chromagrams {
            for (i, &val) in chroma.bins.iter().enumerate() {
                avg[i] += val;
            }
        }
        let count = chromagrams.len() as f32;
        for bin in &mut avg {
            *bin /= count;
        }
        avg
    }
    
    fn correlate(&self, a: &[f32; 12], b: &[f32; 12]) -> f32 {
        // Pearson correlation
        let mean_a: f32 = a.iter().sum::<f32>() / 12.0;
        let mean_b: f32 = b.iter().sum::<f32>() / 12.0;
        
        let mut numerator = 0.0;
        let mut denom_a = 0.0;
        let mut denom_b = 0.0;
        
        for i in 0..12 {
            let diff_a = a[i] - mean_a;
            let diff_b = b[i] - mean_b;
            numerator += diff_a * diff_b;
            denom_a += diff_a * diff_a;
            denom_b += diff_b * diff_b;
        }
        
        if denom_a == 0.0 || denom_b == 0.0 {
            0.0
        } else {
            numerator / (denom_a.sqrt() * denom_b.sqrt())
        }
    }
    
    fn get_key_profiles() -> HashMap<String, [f32; 12]> {
        // Krumhansl-Kessler key profiles (empirically derived)
        let mut profiles = HashMap::new();
        
        // C Major profile (normalized)
        profiles.insert("C Major".to_string(), [
            6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88
        ]);
        
        // C Minor profile
        profiles.insert("C Minor".to_string(), [
            6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17
        ]);
        
        // TODO: Add all 24 key profiles (12 major + 12 minor)
        // Each transposed by semitone offsets
        
        profiles
    }
}
```

---

## 📋 DATA CONTRACTS (JSON Serializable)

### HarmonyMap Structure

```rust
// src/contracts/harmony_map.rs

/// # Responsibility
/// Complete musical theory analysis of a song, serializable to JSON.
/// This is the PRIMARY OUTPUT of the ML analysis pipeline.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HarmonyMap {
    pub song_id: String,
    pub key_signature: String,         // e.g., "C Major", "A Minor"
    pub time_signature: (u8, u8),      // e.g., (4, 4) for 4/4 time
    pub tempo_bpm: f32,
    pub progression: Vec<HarmonicContext>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HarmonicContext {
    pub start_time_sec: f64,
    pub end_time_sec: f64,
    pub chord: String,                 // e.g., "Am7", "G", "Cmaj7"
    pub scale: Vec<String>,            // e.g., ["A", "B", "C", "D", "E", "F", "G"]
}
```

### MidiNote Structure

```rust
// src/contracts/midi_note.rs

/// # Responsibility
/// Represents a single MIDI note with pitch bend information.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MidiNote {
    pub midi_number: u8,               // 0-127 MIDI note number
    pub start_time_sec: f64,
    pub duration_sec: f64,
    pub velocity: u8,                  // 0-127 velocity
    pub pitch_bend: Option<Vec<PitchBendPoint>>,  // Optional pitch bend automation
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PitchBendPoint {
    pub time_offset_sec: f64,          // Relative to note start
    pub bend_semitones: f32,           // ±2 semitones typical range
}
```

---

## ⚙️ CONFIGURACIÓN (YAML)

```yaml
# config/default.yaml

audio:
  sample_rate: 48000
  buffer_size: 2048  # Chunks para procesamiento streaming
  bit_depth: 24      # Output WAV bit depth

hrtf:
  dataset_path: "config/hrtf/MIT_KEMAR_normal.sofa"
  interpolation: "linear"  # linear, cubic, nearest
  cache_size: 500          # Máximo de HRIRs en cache

circular_motion:
  default_speed_rpm: 6     # 1 revolución cada 10 segundos
  default_radius_m: 1.5    # Distancia percibida
  default_elevation_deg: 0 # Horizontal
  direction: "clockwise"   # clockwise, counterclockwise

ensemble:
  default_voices: 5
  delay_range_ms: [5, 25]
  pitch_shift_cents: [-5, 5]
  spatial_spread_deg: 15   # Ángulo de dispersión

eq_presets:
  bass_anchor:
    - {freq: 60, gain_db: 4, q: 0.7}
    - {freq: 120, gain_db: 2, q: 1.0}
  
  vocal_clarity:
    - {freq: 3000, gain_db: 3, q: 2.0}
    - {freq: 5000, gain_db: 1.5, q: 1.5}
  
  chorus_boost:
    - {freq: 4000, gain_db: 3, q: 1.8}
    - {freq: 8000, gain_db: 2, q: 1.2}

mixer:
  limiter_threshold_db: -0.3  # Ceiling para evitar clipping
```

---

## 🖥️ INTERFAZ CLI

```bash
# Sintaxis básica
qualia-8d process [OPTIONS] --output <FILE>

# Opción 1: Stems individuales (RECOMENDADO)
qualia-8d process \
  --stems ./docs/music/song1/drums.wav \
         ./docs/music/song1/bass.wav \
         ./docs/music/song1/guitar.wav \
         ./docs/music/song1/vocals.wav \
  --output ./output/song1_8d.wav \
  --rotation-speed 0.1 \  # rev/sec (6 rpm)
  --ensemble-voices 5 \
  --eq-preset bass_anchor drums.wav \
  --eq-preset vocal_clarity vocals.wav

# Opción 2: Archivo completo (sin separación)
qualia-8d process \
  --input ./docs/music/song1.mp3 \
  --output ./output/song1_8d.wav \
  --no-separation  # Aplica 8D al mix entero

# Opción 3: Preview en tiempo real
qualia-8d preview \
  --stems ./stems/*.wav \
  --rotation-speed 0.2 \
  --live  # Playback en tiempo real con procesamiento

# Opción 4: Batch processing
qualia-8d batch \
  --input-dir ./docs/music/ \
  --output-dir ./output/ \
  --config ./config/custom.yaml \
  --parallel 4  # Procesar 4 canciones simultáneamente
```

### Argumentos del CLI

```rust
// src/cli.rs
use clap::Parser;

#[derive(Parser)]
#[command(name = "qualia-8d")]
#[command(about = "Standalone 8D Audio Processor", long_about = None)]
pub struct Cli {
    #[command(subcommand)]
    pub command: Commands,
}

#[derive(Subcommand)]
pub enum Commands {
    /// Process audio files with 8D effect
    Process {
        /// Input audio stems (multiple files)
        #[arg(long, value_name = "FILE", num_args = 1..)]
        stems: Option<Vec<PathBuf>>,
        
        /// Single input file (no separation)
        #[arg(long, value_name = "FILE")]
        input: Option<PathBuf>,
        
        /// Output WAV file path
        #[arg(short, long, value_name = "FILE")]
        output: PathBuf,
        
        /// Rotation speed (revolutions per minute)
        #[arg(long, default_value = "6")]
        rotation_speed: f32,
        
        /// Number of ensemble voices per stem
        #[arg(long, default_value = "5")]
        ensemble_voices: usize,
        
        /// EQ preset mappings (format: preset_name file_pattern)
        #[arg(long, value_parser = parse_eq_preset)]
        eq_preset: Vec<(String, String)>,
        
        /// Config YAML path
        #[arg(long, value_name = "FILE")]
        config: Option<PathBuf>,
    },
    
    /// Real-time preview with processing
    Preview {
        #[arg(long)]
        stems: Vec<PathBuf>,
        
        #[arg(long, default_value = "6")]
        rotation_speed: f32,
    },
    
    /// Batch process multiple songs
    Batch {
        #[arg(long)]
        input_dir: PathBuf,
        
        #[arg(long)]
        output_dir: PathBuf,
        
        #[arg(long)]
        config: Option<PathBuf>,
        
        #[arg(long, default_value = "1")]
        parallel: usize,
    },
}
```

---

## 🚀 WORKFLOW DE PROCESAMIENTO

### Pipeline Completo

```rust
// src/main.rs

async fn process_song(config: &Config, stems: &[PathBuf], output: &Path) -> Result<()> {
    // 1. Cargar stems en paralelo
    let input_handler = InputHandler::new(config.audio.sample_rate);
    let audio_buffers = input_handler.load_stems_parallel(stems)?;
    
    // 2. Inicializar procesadores
    let motion_engine = CircularMotionEngine::new(&config.circular_motion);
    let hrtf_convolver = HRTFConvolver::new(&config.hrtf.dataset_path)?;
    let ensemble_effect = EnsembleEffect::new(&config.ensemble);
    let freq_booster = FrequencyBooster::new(&config.eq_presets);
    
    // 3. Procesar cada stem en paralelo
    let binaural_stems: Vec<BinauralSignal> = audio_buffers
        .par_iter()  // rayon parallel iterator
        .enumerate()
        .map(|(i, buffer)| -> Result<BinauralSignal> {
            // 3a. Aplicar EQ boost si corresponde
            let boosted = if let Some(preset) = detect_preset(stems[i]) {
                freq_booster.apply(&buffer.samples, preset)?
            } else {
                buffer.samples.clone()
            };
            
            // 3b. Aplicar ensemble effect
            let base_position = motion_engine.calculate_position(0.0);
            let voices = ensemble_effect.apply(&boosted, &base_position);
            
            // 3c. Procesar cada voice con HRTF + circular motion
            let mut binaural_mix_left = vec![0.0; boosted.len()];
            let mut binaural_mix_right = vec![0.0; boosted.len()];
            
            for voice in voices {
                // Procesar en chunks para streaming
                for (chunk_idx, chunk) in voice.samples.chunks(config.audio.buffer_size).enumerate() {
                    let time_sec = (chunk_idx * config.audio.buffer_size) as f64 
                                   / config.audio.sample_rate as f64;
                    
                    let position = motion_engine.calculate_position(time_sec);
                    let binaural = hrtf_convolver.convolve(chunk, &position)?;
                    
                    // Sumar a mix
                    let offset = chunk_idx * config.audio.buffer_size;
                    for (j, sample) in binaural.left.iter().enumerate() {
                        binaural_mix_left[offset + j] += sample * voice.level;
                    }
                    for (j, sample) in binaural.right.iter().enumerate() {
                        binaural_mix_right[offset + j] += sample * voice.level;
                    }
                }
            }
            
            Ok(BinauralSignal {
                left: binaural_mix_left,
                right: binaural_mix_right,
            })
        })
        .collect::<Result<Vec<_>>>()?;
    
    // 4. Mezclar todos los stems
    let mixer = SpatialMixer::new(config.mixer.limiter_threshold_db);
    let final_mix = mixer.mix(&binaural_stems)?;
    
    // 5. Escribir archivo WAV
    write_wav_file(output, &final_mix, config.audio.sample_rate, config.audio.bit_depth)?;
    
    Ok(())
}

fn write_wav_file(path: &Path, signal: &BinauralSignal, sample_rate: u32, bit_depth: u16) -> Result<()> {
    use hound::{WavWriter, WavSpec};
    
    let spec = WavSpec {
        channels: 2,
        sample_rate,
        bits_per_sample: bit_depth,
        sample_format: hound::SampleFormat::Int,
    };
    
    let mut writer = WavWriter::create(path, spec)?;
    
    // Interleave L/R samples
    for (left, right) in signal.left.iter().zip(signal.right.iter()) {
        let left_int = (left * (2_i32.pow(bit_depth as u32 - 1) as f32)) as i32;
        let right_int = (right * (2_i32.pow(bit_depth as u32 - 1) as f32)) as i32;
        
        writer.write_sample(left_int)?;
        writer.write_sample(right_int)?;
    }
    
    writer.finalize()?;
    Ok(())
}
```

---

## ⚠️ DESAFÍOS TÉCNICOS Y SOLUCIONES

### 1. Evitar Audio Bleeding

**Problema**: Ensemble effect puede crear "barro" (mud) si todas las voces están en mid-low frequencies.

**Solución**:
- EQ complementario: voces ensemble tienen -2dB en 200-500Hz
- Spatial separation: cada voice en posición única (no stack)
- Dry/wet mix: 60-70% wet typical

### 2. Interpolación HRTF Suave

**Problema**: Saltar entre HRTFs discretos causa artifacts audibles durante rotación.

**Solución**:
- Interpolación lineal entre HRTFs vecinos más cercanos
- Crossfade de 50ms al cambiar entre posiciones
- Cache de HRTFs interpoladas para posiciones comunes

### 3. Performance en Tiempo Real

**Problema**: Convolución HRTF es computacionalmente costosa.

**Solución**:
- FFT-based convolution (10x más rápido que time-domain)
- Paralelización por stems con rayon
- Procesamiento por chunks (2048 samples = ~43ms @ 48kHz)
- HRIR cache

### 4. Separación de Instrumentos

**Problema**: No hay solución nativa Rust para source separation.

**Opciones**:
- **RECOMENDADA**: Usuario provee stems pre-separados (ej. via Demucs externo)
- **Alternativa 1**: Subprocess call a Demucs Python CLI (wrap externo)
- **Alternativa 2**: tract + ONNX Demucs (complejo, futuro)
- **Alternativa 3**: Bandpass filtering básico (limitado pero funcional)

---

## 📊 MÉTRICAS DE CALIDAD

### Objetivos de Performance

| Métrica | Target | Método de medición |
|---------|--------|-------------------|
| **SDR** | >25 dB | Signal-to-Distortion Ratio post-procesamiento |
| **Latencia** | <100ms | Tiempo procesamiento chunk (real-time preview) |
| **Memory** | <500MB | RAM usage para canción 5 minutos |
| **CPU** | <50% | 1 core i5 moderno durante batch processing |

### Calidad de Audio

- **Sample Rate**: 48kHz (balance calidad/performance)
- **Bit Depth**: 24-bit (output WAV)
- **THD+N**: <0.01% (Total Harmonic Distortion + Noise)
- **HRTF Dataset**: MIT KEMAR (710 posiciones, industry standard)

---

## 🗂️ ESTRUCTURA DE ARCHIVOS

```
qualia-8d-processor/
├── Cargo.toml
├── Cargo.lock
├── README.md
├── LICENSE
├── .gitignore
│
├── config/
│   ├── default.yaml          # Configuración por defecto
│   ├── presets/              # Presets de EQ
│   │   ├── bass_anchor.yaml
│   │   ├── vocal_clarity.yaml
│   │   └── chorus_boost.yaml
│   └── hrtf/                 # HRTF datasets
│       └── MIT_KEMAR_normal.sofa
│
├── src/
│   ├── main.rs               # CLI entry point
│   ├── lib.rs                # Public API for library use
│   ├── config.rs             # Config structs and loading
│   ├── cli.rs                # Clap CLI definitions
│   │
│   └── audio/
│       ├── mod.rs
│       ├── input_handler.rs
│       ├── hrtf_convolution.rs
│       ├── circular_motion.rs
│       ├── ensemble_effect.rs
│       ├── eq_boost.rs
│       └── mixer.rs
│
├── tests/
│   ├── integration_tests.rs
│   └── fixtures/
│       └── test_stems/
│           ├── drums.wav
│           ├── bass.wav
│           └── vocals.wav
│
├── benches/
│   └── processing_bench.rs  # Criterion benchmarks
│
└── examples/
    ├── simple_process.rs
    └── custom_config.rs
```

---

## 📦 CARGO.TOML - PRODUCTION 2025 STACK

```toml
[package]
name = "qualia-8d-harmony-processor"
version = "2.0.0"
edition = "2021"
rust-version = "1.75"
authors = ["QualiaTempo Team"]
description = "Production-grade 8D spatial audio processor with ML-powered harmonic analysis"
license = "Apache-2.0"

[dependencies]
# ============================================================================
# CORE AUDIO PROCESSING
# ============================================================================
cpal = "0.16"                          # Cross-platform audio I/O
dasp = "0.11"                          # DSP fundamentals
symphonia = { version = "0.5", features = ["all"] }  # Multi-codec decoding
rubato = "0.15"                        # High-quality resampling
hound = "3.5"                          # WAV file writing (24-bit)
rustfft = "6.2"                        # SIMD-accelerated FFT
realfft = "3.3"                        # Real-valued FFT optimization

# ============================================================================
# HRTF SPATIALIZATION
# ============================================================================
sofar = "0.1"                          # SOFA dataset loader (libmysofa bindings)

# ============================================================================
# MACHINE LEARNING (ONNX INFERENCE)
# ============================================================================
ort = { version = "1.16", features = ["load-dynamic", "half"] }  # ONNX Runtime
ndarray = "0.15"                       # N-dimensional arrays for ML tensors

# ============================================================================
# AUDIO ANALYSIS
# ============================================================================
pitch-detection = "0.3"                # McLeod/YIN pitch detectors
aubio-rs = "0.2"                       # Onset detection, tempo estimation
spectrum-analyzer = "1.5"              # Real-time FFT spectrum analysis

# ============================================================================
# PITCH MANIPULATION
# ============================================================================
# pitch_shift = "0.1"                  # Future: Phase vocoder pitch shifting

# ============================================================================
# CONCURRENCY
# ============================================================================
rayon = "1.10"                         # Data parallelism (stem processing)
tokio = { version = "1.41", features = ["full"] }  # Async runtime
async-trait = "0.1"                    # Async trait methods

# ============================================================================
# CONFIGURATION & SERIALIZATION
# ============================================================================
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"                     # JSON output (HarmonyMap)
serde_yaml = "0.9"                     # YAML config files
toml = "0.8"                           # Alternative config format

# ============================================================================
# CLI & USER INTERFACE
# ============================================================================
clap = { version = "4.5", features = ["derive", "env"] }  # CLI argument parsing
indicatif = "0.17"                     # Progress bars for batch processing

# ============================================================================
# ERROR HANDLING & LOGGING
# ============================================================================
anyhow = "1.0"                         # Flexible error handling
thiserror = "1.0"                      # Custom error types
tracing = "0.1"                        # Structured logging
tracing-subscriber = { version = "0.3", features = ["env-filter", "fmt", "json"] }

# ============================================================================
# UTILITIES
# ============================================================================
chrono = "0.4"                         # Timestamps for output files
num-traits = "0.2"                     # Generic numeric traits

# ============================================================================
# OPTIONAL (FUTURE ENHANCEMENTS)
# ============================================================================
# rodio = "0.18"                       # Real-time audio preview
# egui = "0.28"                        # Optional GUI
# vst3 = "0.1"                         # VST3 plugin wrapper
# charon-audio = "0.1"                 # ML-powered stem separation

[dev-dependencies]
criterion = { version = "0.5", features = ["html_reports"] }  # Benchmarking
approx = "0.5"                         # Float comparisons in tests
tempfile = "3.10"                      # Temporary files for tests

[[bin]]
name = "qualia-8d"
path = "src/main.rs"

[lib]
name = "qualia_8d_harmony"
path = "src/lib.rs"

[[bench]]
name = "hrtf_convolution_bench"
harness = false

[[bench]]
name = "midi_transcription_bench"
harness = false

[[bench]]
name = "full_pipeline_bench"
harness = false

[profile.release]
opt-level = 3
lto = "fat"                            # Link-time optimization for max perf
codegen-units = 1                      # Single codegen unit for better optimization
panic = "abort"                        # Smaller binary, faster unwinds

[profile.bench]
inherits = "release"

[profile.dev]
opt-level = 0                          # Fast compilation

[features]
default = ["ml-analysis"]
ml-analysis = ["ort", "pitch-detection", "aubio-rs", "spectrum-analyzer"]  # ML features
gpu-acceleration = ["ort/cuda"]        # CUDA support for ONNX models
```

---

## 🛣️ ROADMAP DE DESARROLLO - PRODUCTION-READY

### Fase 1: Audio Foundation (Week 1-2)

- [ ] **Setup proyecto** con estructura completa
- [ ] **InputHandler**: symphonia decoding + rubato resampling
- [ ] **CircularMotionEngine**: spherical position calculator
- [ ] **Unit tests** para audio primitives
- [ ] **CI/CD**: GitHub Actions para automated testing

### Fase 2: HRTF Core (Week 3-4)

- [ ] **HRTFConvolver**: sofar integration + MIT KEMAR loading
- [ ] **FFT convolution**: rustfft overlap-add implementation
- [ ] **HRTF interpolation**: cubic spline for smooth motion
- [ ] **Benchmark**: <5ms/chunk target validation
- [ ] **Integration tests**: real SOFA dataset verification

### Fase 3: Audio Effects (Week 5-6)

- [ ] **EnsembleEffect**: voice duplication + micro-variations
- [ ] **FrequencyBooster**: parametric EQ with biquad filters
- [ ] **SpatialMixer**: stem summing + brick-wall limiter
- [ ] **Audio quality tests**: THD+N measurement, artifact detection
- [ ] **Config system**: YAML loading with validation

### Fase 4: ML Pipeline - MIDI Transcription (Week 7-8) ✅ COMPLETE (2025-10-19)

- [x] **pitch-detection integration**: McLeod Pitch Method (MPM) for monophonic tracking
- [x] **BasicPitchTranscriber**: functional transcription pipeline (0 external deps)
- [x] **MIDI encoder**: Note On/Off events with timestamp conversion
- [x] **Note segmentation**: vibrato-tolerant onset/offset detection (1 semitone)
- [x] **Dual MIDI export**: Transcription + chord MIDI files
- [x] **15 unit tests**: Edge cases, accuracy validation, filtering
- [x] **Integration validated**: 192 tests passing | Production-ready
- [x] **Report**: `docs/reports/PHASE4_MIDI_TRANSCRIPTION_REPORT_2025-10-19.md`

**Status**: 20% → 100% | Deliverable: Functional monophonic MIDI transcription with McLeod Pitch Method

### Fase 5: ML Pipeline - Harmonic Analysis (Week 9-10)

- [ ] **OnsetDetector**: aubio-rs integration for rhythm analysis
- [ ] **ChromagramAnalyzer**: 12-bin pitch class distribution
- [ ] **ChordRecognizer**: template-based chord detection
- [ ] **HarmonyMapBuilder**: key estimation (Krumhansl-Schmuckler)
- [ ] **Integration tests**: validate HarmonyMap JSON output

### Fase 6: CLI & Batch Processing (Week 11-12)

- [ ] **CLI**: clap interface with all options
- [ ] **Batch mode**: parallel processing with rayon
- [ ] **Progress bars**: indicatif for user feedback
- [ ] **File I/O**: robust path handling + error messages
- [ ] **Documentation**: README + usage examples

### Fase 7: Optimization & Polish (Week 13-14)

- [ ] **Memory profiling**: valgrind/heaptrack analysis
- [ ] **CPU profiling**: perf/flamegraph optimization
- [ ] **SIMD optimization**: manual vectorization of hot paths
- [ ] **Cargo release profile**: LTO + codegen tuning
- [ ] **Stress tests**: 1-hour songs, 100-stem mixes

### Fase 8: Production Deployment (Week 15-16)

- [ ] **Docker image**: multi-stage build for Linux deployment
- [ ] **Release artifacts**: binaries for Windows/macOS/Linux
- [ ] **User documentation**: full tutorial + troubleshooting guide
- [ ] **Example datasets**: sample stems + expected outputs
- [ ] **Performance report**: benchmarks vs. competitors

---

## 🎓 DIFERENCIACIÓN vs MUSIC.RUST.MD

| Aspecto | MUSIC.RUST.MD (Game Engine) | Este Sistema (Standalone Tool) |
|---------|-----------------------------|---------------------------------|
| **Propósito** | Música generativa reactiva al gameplay | Batch processing + análisis ML de canciones |
| **Input** | Acciones de jugador en tiempo real | Archivos de audio pre-existentes |
| **Output** | Notas/samples generados proceduralmente | 8D WAV + HarmonyMap JSON + MIDI |
| **Armonía** | HarmonyEngine CONSUME HarmonyMaps en runtime | HarmonyEngine GENERA HarmonyMaps offline |
| **Integración** | Parte del game loop (60fps) | Pre-procesamiento de assets (offline) |
| **Uso** | Runtime durante combate | Pre-producción de contenido |
| **WebSocket** | ✅ Sí - comunica con frontend | ❌ No - herramienta CLI standalone |

**COMPLEMENTARIEDAD CRÍTICA**: Este sistema GENERA los HarmonyMaps que `MUSIC.RUST.MD` CONSUME. El juego NO genera HarmonyMaps en runtime, los CARGA desde JSON. Este es el pipeline de producción de contenido musical.

- [ ] Implementar `EnsembleEffect` (delays + pitch shift)
- [ ] Implementar `FrequencyBooster` (EQ paramétrico)
- [ ] Implementar `SpatialMixer` (summing + limiting)
- [ ] Tests de integración con audio real

### Fase 4: CLI & Config (Semana 7)

- [ ] Implementar CLI con clap
- [ ] Sistema de configuración YAML
- [ ] Presets de EQ
- [ ] Documentación de uso

### Fase 5: Optimization & Polish (Semana 8)

- [ ] Paralelización con rayon
- [ ] Cache optimization para HRTFs
- [ ] Memory profiling
- [ ] Batch processing mode

### Fase 6: Advanced Features (Opcional)

- [ ] Real-time preview mode con rodio
- [ ] GUI con egui (opcional)
- [ ] Integración opcional con tract + ONNX Demucs
- [ ] Plugin VST3 wrapper

---

## 🎓 DIFERENCIACIÓN vs MUSIC.RUST.MD

| Aspecto | MUSIC.RUST.MD (Juego) | Este Sistema (Standalone) |
|---------|----------------------|---------------------------|
| **Propósito** | Música generativa reactiva al gameplay | Procesamiento batch de canciones existentes |
| **Input** | Acciones de jugador en tiempo real | Archivos de audio pre-existentes |
| **Output** | Notas/samples generados proceduralmente | Archivos WAV procesados 8D |
| **Armonía** | HarmonyEngine analiza y restringe notas | No aplica (procesa audio completo) |
| **Integración** | Parte del loop del juego | Herramienta independiente CLI |
| **Uso** | Runtime durante combate | Pre-procesamiento de assets |

**Complementariedad**: Este sistema puede generar versiones 8D de canciones base que luego MUSIC.RUST.MD manipula generativamente durante el juego.

---

## 🔬 VALIDACIÓN TÉCNICA

### Pruebas de Concepto

1. **Convolución HRTF básica**:
```bash
cargo test test_hrtf_convolution -- --nocapture
```

2. **Movimiento circular**:
```bash
cargo run --example circular_motion_demo
```

3. **Ensemble effect**:
```bash
cargo test test_ensemble_effect -- --nocapture
```

### Benchmarks

```bash
cargo bench --bench processing_bench
```

**Targets**:
- HRTF convolution: <5ms por chunk de 2048 samples
- Ensemble generation: <10ms por voice
- Total pipeline: <50ms por segundo de audio procesado

---

## 📚 RECURSOS Y REFERENCIAS

### Documentación Técnica

- **HRTF Theory**: [CIPIC HRTF Documentation](http://interface.cipic.ucdavis.edu/sound/hrtf.html)
- **SOFA Format**: [AES69-2015 Standard](http://www.aes.org/publications/standards/search.cfm?docID=99)
- **FFT Convolution**: [Smith, J.O. "Spectral Audio Signal Processing"](https://ccrma.stanford.edu/~jos/sasp/)

### Datasets HRTF

- **MIT KEMAR**: [https://sound.media.mit.edu/resources/KEMAR.html](https://sound.media.mit.edu/resources/KEMAR.html)
- **CIPIC**: [https://www.ece.ucdavis.edu/cipic/spatial-sound/hrtf-data/](https://www.ece.ucdavis.edu/cipic/spatial-sound/hrtf-data/)
- **LISTEN (IRCAM)**: [http://recherche.ircam.fr/equipes/salles/listen/](http://recherche.ircam.fr/equipes/salles/listen/)

### Rust Crates Documentación

- **cpal**: [https://docs.rs/cpal/](https://docs.rs/cpal/)
- **dasp**: [https://docs.rs/dasp/](https://docs.rs/dasp/)
- **sofar**: [https://docs.rs/sofar/](https://docs.rs/sofar/)
- **symphonia**: [https://docs.rs/symphonia/](https://docs.rs/symphonia/)

---

## ✅ COMPLIANCE CHECKLIST

- [x] **100% Rust** - No Python, no TypeScript, no JavaScript
- [x] **Standalone** - Independiente del juego Qualia Tempo
- [x] **Modular** - Componentes reutilizables y testables
- [x] **Documented** - `# Responsibility` headers en todos los módulos
- [x] **Testable** - Arquitectura permite unit + integration tests
- [x] **Configurable** - YAML config para todos los parámetros
- [x] **Performance** - Targets claros de latencia y CPU
- [x] **Quality** - Sin audio bleeding, convolución precisa HRTF

---

## 🚀 NEXT STEPS

Execute order:

1. **Crear proyecto base**:
```bash
cargo new --lib qualia-8d-processor
cd qualia-8d-processor
```

2. **Setup Cargo.toml** con dependencias listadas

3. **Implementar módulos por orden**:
   - `input_handler.rs` (Fase 1)
   - `circular_motion.rs` (Fase 1)
   - `hrtf_convolution.rs` (Fase 2)
   - `ensemble_effect.rs` (Fase 3)
   - `eq_boost.rs` (Fase 3)
   - `mixer.rs` (Fase 3)

4. **Tests continuos**:
```bash
cargo test
cargo clippy
cargo build --release
```

5. **Iteración y optimización** basada en benchmarks

---

**MISSION STATUS**: Architecture defined. Awaiting green light for implementation.

**AFFIRMATIVE. PLAN COMPLETE. RUST ONLY. ZERO PYTHON. EXECUTE WHEN READY.**
