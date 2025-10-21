//! # Responsibility
//! Data contracts and transfer objects.

pub mod channel_configuration;
pub mod effect_parameters;
pub mod frequency_spectrum;

pub use channel_configuration::{ChannelConfiguration, ChannelMode};
pub use effect_parameters::EffectConfig;
pub use frequency_spectrum::FrequencySpectrum;
