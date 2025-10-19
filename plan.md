# Qualia Tempo 8D Audio Processor
## Standalone Rust-Native Spatial Audio Engine

**VERSION**: 1.0  
**COMPLIANCE**: QUALIA.CODE.RUST v1.1 (RUST ONLY - ZERO PYTHON)  
**STATUS**: Mission-Ready Architecture  
**TARGET**: Batch processing de canciones con efecto 8D orbital

---

## 🎯 MISSION OBJECTIVE

Construir un procesador de audio 8D **standalone** en Rust puro que transforme canciones en experiencias espaciales inmersivas mediante:

1. **Separación por instrumento** (stems individuales)
2. **Movimiento circular automático** (rotación orbital de cada instrumento)
3. **Efecto orquesta** (duplicación con microshifts para densidad)
4. **Boosting selectivo** (ancla de bass, claridad vocal, potencia de coros)
5. **Calidad sin pérdidas** (no audio bleeding, convolución HRTF precisa)

**CRÍTICO**: Este sistema es **INDEPENDIENTE** del juego. Produce assets de audio procesados que pueden usarse standalone O integrarse posteriormente en Qualia Tempo.

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

## 🛠️ STACK TECNOLÓGICO (100% RUST)

### Core Audio Libraries

| Crate | Versión | Propósito |
|-------|---------|-----------|
| **cpal** | 0.16+ | Audio I/O cross-platform (real-time + batch) |
| **dasp** | 0.11+ | DSP fundamentals (sample manipulation, filtering) |
| **sofar** | 0.1+ | Bindings para libmysofa (carga HRTF/SOFA datasets) |
| **symphonia** | 0.5+ | Decodificación multi-formato (MP3, FLAC, OGG, WAV) |
| **rubato** | 0.15+ | Resampling de alta calidad |
| **hound** | 3.5+ | Escritura de archivos WAV |
| **rustfft** | 6.2+ | FFT para convolución eficiente |
| **rayon** | 1.8+ | Paralelización de procesamiento por stems |

### Opcional (Futura Fase)

| Crate | Propósito |
|-------|-----------|
| **tract** | Inferencia ONNX (si se integra Demucs convertido) |
| **rodio** | Preview en tiempo real (playback con procesamiento) |

### Datasets Externos

- **MIT KEMAR HRTF**: Dataset SOFA con 710 posiciones (azimuth/elevation)
  - Fuente: [https://sound.media.mit.edu/resources/KEMAR.html](https://sound.media.mit.edu/resources/KEMAR.html)
  - Formato: AES69-2015 SOFA
  - Tamaño: ~50MB

---

## 🏗️ ARQUITECTURA DEL SISTEMA

### Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────────┐
│                   INPUT HANDLER                                 │
│  - Carga stems individuales O archivo completo                 │
│  - Decodificación vía symphonia                                │
│  - Normalización sample rate → 48kHz                           │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
         ┌─────────────────────────────────────────┐
         │  Para cada stem en paralelo (rayon):    │
         └─────────────────────────────────────────┘
                           │
      ┌────────────────────┼────────────────────┐
      │                    │                    │
      ▼                    ▼                    ▼
┌─────────────┐   ┌─────────────────┐   ┌──────────────┐
│  ENSEMBLE   │   │ CIRCULAR MOTION │   │ FREQ BOOST   │
│  EFFECT     │   │    ENGINE       │   │   MODULE     │
│             │   │                 │   │              │
│ - Duplicate │   │ - θ(t) calc    │   │ - Parametric │
│ - Delays    │   │ - HRTF lookup  │   │   EQ         │
│ - Detuning  │   │ - Interpolate  │   │ - Presets    │
└──────┬──────┘   └────────┬────────┘   └──────┬───────┘
       │                   │                   │
       └─────────┬─────────┴────────┬──────────┘
                 │                  │
                 ▼                  ▼
         ┌──────────────┐   ┌─────────────────┐
         │ HRTF CONVOLVE│   │  SPATIAL MIX    │
         │              │   │                 │
         │ - FFT conv   │   │ - Combine stems │
         │ - Binaural L │   │ - Level balance │
         │ - Binaural R │   │ - Final limiter │
         └──────┬───────┘   └────────┬────────┘
                │                    │
                └────────┬───────────┘
                         │
                         ▼
                ┌────────────────┐
                │ OUTPUT WRITER  │
                │                │
                │ - WAV 48kHz    │
                │ - 24-bit depth │
                └────────────────┘
```

### Módulos del Código

```
src/
├── main.rs                 # CLI entry point
├── lib.rs                  # Public API
├── config.rs               # Config loading (YAML)
├── audio/
│   ├── mod.rs
│   ├── input_handler.rs    # InputHandler struct
│   ├── hrtf_convolution.rs # HRTFConvolver struct
│   ├── circular_motion.rs  # CircularMotionEngine struct
│   ├── ensemble_effect.rs  # EnsembleEffect struct
│   ├── eq_boost.rs         # FrequencyBooster struct
│   └── mixer.rs            # SpatialMixer struct
└── cli.rs                  # Clap argument parsing
```

---

## 🔧 MÓDULOS DETALLADOS

### 1. InputHandler

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

## 📦 CARGO.TOML

```toml
[package]
name = "qualia-8d-processor"
version = "0.1.0"
edition = "2021"
rust-version = "1.75"

[dependencies]
# Audio I/O and DSP
cpal = "0.16"
dasp = "0.11"
symphonia = { version = "0.5", features = ["all"] }
rubato = "0.15"
hound = "3.5"
rustfft = "6.2"

# HRTF
sofar = "0.1"  # Rust bindings for libmysofa

# Concurrency
rayon = "1.8"
tokio = { version = "1.41", features = ["full"] }

# Configuration
serde = { version = "1.0", features = ["derive"] }
serde_yaml = "0.9"

# CLI
clap = { version = "4.5", features = ["derive"] }

# Error handling
anyhow = "1.0"
thiserror = "1.0"

# Logging
tracing = "0.1"
tracing-subscriber = "0.3"

[dev-dependencies]
criterion = "0.5"
approx = "0.5"  # For float comparisons in tests

[[bin]]
name = "qualia-8d"
path = "src/main.rs"

[lib]
name = "qualia_8d"
path = "src/lib.rs"

[[bench]]
name = "processing_bench"
harness = false
```

---

## 🛣️ ROADMAP DE DESARROLLO

### Fase 1: Foundation (Semanas 1-2)

- [ ] Setup proyecto Rust con estructura de archivos
- [ ] Implementar `InputHandler` (carga + decodificación)
- [ ] Implementar `CircularMotionEngine` (cálculo posiciones)
- [ ] Tests unitarios para módulos básicos

### Fase 2: HRTF Core (Semanas 3-4)

- [ ] Integrar `sofar` crate + descargar MIT KEMAR dataset
- [ ] Implementar `HRTFConvolver` con FFT convolution
- [ ] Implementar interpolación HRTF
- [ ] Benchmark de performance (target: <50ms/chunk)

### Fase 3: Effects (Semanas 5-6)

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
