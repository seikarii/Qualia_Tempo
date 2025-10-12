//! # Responsibility
//! Audio effects processing modules.

pub mod spatial_8d;
// pub mod drop_enhancer;   // To be implemented
// pub mod orchestra;        // To be implemented
// pub mod voice_adjuster;   // To be implemented

pub use spatial_8d::{apply_8d_effect, Spatial8DConfig, mono_to_stereo};
