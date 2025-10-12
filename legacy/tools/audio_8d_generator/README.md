# 8D Audio Generator

A sophisticated Rust-based command-line tool for converting standard audio files into immersive 8D audio.

## What is 8D Audio?

8D audio creates the illusion of sound moving in a circle around the listener's head using:
- **Binaural Panning**: Amplitude differences between left/right channels
- **Interaural Time Difference (ITD)**: Subtle delays simulating head acoustics
- **HRTF-Inspired Filtering**: Spectral shaping for spatial realism

## Features

### Core Features
- ✅ **8D Spatial Effect**: Circular sound rotation with configurable speed and intensity
- ✅ **Multi-Format Support**: MP3, WAV, FLAC, Vorbis, AAC via Symphonia
- ✅ **High-Quality Output**: 32-bit float WAV files
- ✅ **Automatic Conversion**: Mono → Stereo, Multi-channel → Stereo downmix
- ✅ **HRTF Filtering**: Optional head-related transfer function approximation

### Planned Features
- 🚧 **Drop Enhancer**: Bass boost for rhythm drops
- 🚧 **Orchestra Mode**: Multi-track spatial distribution
- 🚧 **Voice Adjuster**: Pitch/formant shifting for voice modification

## Installation

### Prerequisites
- Rust 1.70+ ([Install Rust](https://rustup.rs/))

### Build from Source
```bash
cd tools/audio_8d_generator
cargo build --release
```

The compiled binary will be at `target/release/audio_8d_generator`.

## Usage

### Basic Usage
```bash
./target/release/audio_8d_generator \
  --input docs/music/Inicio.mp3 \
  --output output_8d.wav
```

### Advanced Options
```bash
./target/release/audio_8d_generator \
  --input song.mp3 \
  --output song_8d.wav \
  --rotation-speed 0.75 \
  --intensity 0.9 \
  --no-hrtf
```

### Options
- `-i, --input <PATH>`: Input audio file (required)
- `-o, --output <PATH>`: Output WAV file (required)
- `--rotation-speed <FLOAT>`: Rotation speed in Hz (default: 0.5)
- `--intensity <FLOAT>`: Effect intensity 0.0-1.0 (default: 0.8)
- `--no-hrtf`: Disable HRTF-inspired filtering
- `--drop-enhancer`: Enable bass enhancement (WIP)
- `--orchestra`: Enable multi-track spatial mode (WIP)
- `--voice-adjuster`: Enable voice modification (WIP)

## Technical Details

### Architecture
```
audio_8d_generator/
├── src/
│   ├── audio/          # I/O: Decode (Symphonia) + Encode (Hound)
│   ├── effects/        # 8D spatial, drop enhancer, orchestra, voice
│   ├── dsp/            # Low-level DSP primitives
│   ├── error.rs        # Unified error handling
│   └── main.rs         # CLI interface
```

### Algorithm Overview
1. **Decode**: Symphonia loads MP3/WAV/FLAC → f32 samples
2. **Stereo Conversion**: Mono duplicated, multi-channel downmixed
3. **8D Effect**:
   - Calculate rotation angle per frame
   - Apply equal-power panning law
   - Simulate ITD via sample delays (±0.7ms)
   - Optional HRTF spectral shaping
4. **Encode**: Hound writes 32-bit float WAV

### Performance
- Compiled with LTO and optimization level 3
- Processes typical 3-minute song in ~2-5 seconds
- Memory efficient: Streams audio in chunks

## Examples

### Test with Provided Music
```bash
cargo run --release -- \
  --input ../../docs/music/Inicio.mp3 \
  --output inicio_8d.wav \
  --rotation-speed 0.5 \
  --intensity 0.8
```

### Fast Rotation (Dramatic Effect)
```bash
cargo run --release -- \
  --input song.mp3 \
  --output song_8d_fast.wav \
  --rotation-speed 2.0 \
  --intensity 1.0
```

### Subtle Effect (Background Music)
```bash
cargo run --release -- \
  --input ambient.mp3 \
  --output ambient_8d.wav \
  --rotation-speed 0.2 \
  --intensity 0.5
```

## Troubleshooting

### "Failed to decode audio file"
- Ensure input file is a valid audio format
- Check file permissions
- Try converting to WAV first with `ffmpeg`

### Output sounds distorted
- Reduce `--intensity` value
- Try disabling HRTF with `--no-hrtf`
- Check input file quality

### Build errors
- Update Rust: `rustup update`
- Clean build: `cargo clean && cargo build --release`

## Development

### Run Tests
```bash
cargo test
```

### Enable Debug Logging
```bash
RUST_LOG=debug cargo run -- -i input.mp3 -o output.wav
```

### Contributing
This tool follows QUALIA.CODE.RUST architectural principles:
- All public items have `# Responsibility` docstrings
- Error handling via `Result<T, Audio8DError>`
- Clear separation of concerns (I/O, effects, DSP)
- Performance-first design

## License

Part of the Qualia Tempo project. See repository root for license.

## References

- [8D Audio on Wikipedia](https://en.wikipedia.org/wiki/3D_audio_effect)
- [HRTF - Head-Related Transfer Function](https://en.wikipedia.org/wiki/Head-related_transfer_function)
- [Binaural Recording](https://en.wikipedia.org/wiki/Binaural_recording)
- [Symphonia Codec Library](https://github.com/pdeljanov/Symphonia)
