//! # Responsibility
//! UI layer with widgets and main application window.

pub mod main_window;
pub mod widgets;
pub mod theme;

pub use main_window::{MainWindow, IMainWindow};
pub use theme::QualiaTheme;
