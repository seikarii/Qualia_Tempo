//! # Responsibility
//! High-fidelity mock for IPerformanceService trait.

use mockall::*;
use crate::services::interfaces::IPerformanceService;

mock! {
    pub PerformanceService {}
    impl IPerformanceService for PerformanceService {
        fn start_timer(&self, name: &str) -> String;
        fn end_timer(&self, timer_id: &str);
        fn get_avg_frame_time(&self) -> f64;
    }
}
