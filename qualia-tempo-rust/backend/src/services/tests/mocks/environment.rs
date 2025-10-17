//! # Responsibility
//! High-fidelity mock for IEnvironmentService trait.

use crate::services::interfaces::{IEnvironmentService, Environment};
use mockall::*;

mock! {
    /// # Responsibility
    /// High-fidelity mock for IEnvironmentService, used in unit tests.
    pub EnvironmentService {}
    
    impl IEnvironmentService for EnvironmentService {
        fn get_environment(&self) -> Environment;
        fn get_os(&self) -> &'static str;
        fn get_arch(&self) -> &'static str;
        fn get_cpu_count(&self) -> usize;
        fn get_config_dir(&self) -> &'static str;
    }
}
