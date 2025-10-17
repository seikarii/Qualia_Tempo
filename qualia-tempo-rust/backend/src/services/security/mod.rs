//! # Responsibility
//! Security services module aggregator.

pub mod auth;
pub mod validation;

pub use auth::AuthService;
pub use validation::ValidationService;
