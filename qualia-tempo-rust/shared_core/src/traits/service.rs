//! # Responsibility
//! Defines base service trait.

use shaku::Interface;

/// # Responsibility
/// Base trait for all services.
///
/// ---
///
/// Provides common lifecycle methods.
pub trait IBaseService: Interface {
    fn name(&self) -> &str;
}
