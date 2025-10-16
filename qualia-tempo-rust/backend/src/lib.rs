//! # Responsibility
//! Backend library exports for testing.

#![warn(missing_docs)]
#![deny(clippy::unwrap_used)]
#![deny(clippy::expect_used)]

pub mod config;
pub mod services;
pub mod engine;
pub mod handlers;

#[cfg(test)]
mod tests {
    #[test]
    fn it_works() {
        assert_eq!(2 + 2, 4);
    }
}
pub mod utils;
