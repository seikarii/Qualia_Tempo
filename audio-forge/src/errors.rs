//! # Responsibility
//! Defines domain-specific structured error types for all audio-forge services.
//!
//! ---
//!
//! **ARCHITECTURAL MANDATE**: The service layer MUST NOT use `anyhow::Result`.
//! All public service interfaces return typed errors using `thiserror` to enable
//! programmatic error handling by consumers (UI, tests, other services).
//!
//! Each service domain has its own error enum with specific variants that map
//! to failure modes. This allows callers to `match` on error types and handle
//! them appropriately (e.g., retry, user prompt, fallback).

use std::path::PathBuf;
use thiserror::Error;

/// # Responsibility
/// Errors specific to the audio player service.
///
/// ---
///
/// Covers file loading, playback control, and device failures.
#[derive(Debug, Error)]
pub enum AudioPlayerError {
    #[error("Archivo no encontrado en la ruta: {0}")]
    FileNotFound(PathBuf),

    #[error("Error de decodificación: {0}")]
    DecodingError(String),

    #[error("No hay ningún archivo de audio cargado")]
    NoFileLoaded,

    #[error("Error de dispositivo de audio: {0}")]
    DeviceError(String),

    #[error("Error de reproducción: {0}")]
    PlaybackError(String),

    #[error("Error de seek: {0}")]
    SeekError(String),

    #[error("Error de volumen: {0}")]
    VolumeError(String),
}

/// # Responsibility
/// Errors specific to audio effects processing.
///
/// ---
///
/// Covers configuration validation and DSP processing failures.
#[derive(Debug, Error)]
pub enum AudioEffectsError {
    #[error("Configuración de efectos inválida: {0}")]
    InvalidConfig(String),

    #[error("Error de procesamiento DSP: {0}")]
    ProcessingFailed(String),

    #[error("Parámetro fuera de rango: {0}")]
    ParameterOutOfRange(String),
}

/// # Responsibility
/// Errors specific to audio export service.
///
/// ---
///
/// Covers file path validation, encoding, and I/O failures.
#[derive(Debug, Error)]
pub enum AudioExporterError {
    #[error("Ruta de archivo inválida: {0}")]
    InvalidPath(PathBuf),

    #[error("Error de codificación WAV: {0}")]
    EncodingError(String),

    #[error("Error de escritura de archivo: {0}")]
    WriteError(String),

    #[error("No hay audio para exportar")]
    NoAudioLoaded,

    #[error("Error de conversión de sample: {0}")]
    SampleConversionError(String),
}

/// # Responsibility
/// Errors specific to audio analysis service.
///
/// ---
///
/// Covers FFT computation, spectrum analysis, and buffer management.
#[derive(Debug, Error)]
pub enum AudioAnalyzerError {
    #[error("No hay datos de audio para analizar")]
    NoData,

    #[error("Sample rate inválido: {0}")]
    InvalidSampleRate(u32),

    #[error("Error de FFT: {0}")]
    FftError(String),

    #[error("Error de buffer: {0}")]
    BufferError(String),
}

/// # Responsibility
/// Errors specific to visualization engine.
///
/// ---
///
/// Covers waveform rendering, spectrum visualization, and buffer management.
#[derive(Debug, Error)]
pub enum VisualizationError {
    #[error("Buffer de visualización inválido: {0}")]
    InvalidBuffer(String),

    #[error("Formato de datos inválido: {0}")]
    InvalidFormat(String),

    #[error("Error de renderizado: {0}")]
    RenderError(String),
}

/// # Responsibility
/// Errors specific to multi-channel output service.
///
/// ---
///
/// Covers 8.1 surround, device enumeration, and channel mapping.
#[derive(Debug, Error)]
pub enum MultiChannelError {
    #[error("Dispositivo de audio no disponible: {0}")]
    DeviceNotAvailable(String),

    #[error("Configuración de canales no soportada: {0}")]
    UnsupportedChannelConfig(String),

    #[error("Error de inicialización de dispositivo: {0}")]
    DeviceInitError(String),

    #[error("Error de reproducción multi-canal: {0}")]
    PlaybackError(String),
}
