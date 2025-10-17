//! # Responsibility
//! High-fidelity mock for IMetricsService trait.

use mockall::*;
use crate::services::interfaces::IMetricsService;

mock! {
    pub MetricsService {}
    impl IMetricsService for MetricsService {
        fn increment_counter(&self, name: &str);
        fn record_gauge(&self, name: &str, value: f64);
        fn record_histogram(&self, name: &str, value: f64);
    }
}
