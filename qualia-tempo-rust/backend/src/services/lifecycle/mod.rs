//! # Responsibility
//! Application lifecycle management services.

mod initializer;
mod traits;

pub use initializer::ApplicationInitializerService;
pub use traits::IApplicationInitializer;
