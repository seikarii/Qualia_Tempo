//! # Responsibility
//! Service health monitoring UI component.
//!
//! ---
//!
//! Leptos component displaying real-time health status of all registered services.
//! Shows service name, status (Healthy/Degraded/Down), uptime, and error count.

use leptos::*;

/// # Responsibility
/// Service health status indicator.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ServiceStatus {
    /// Service operating normally
    Healthy,
    /// Service experiencing issues
    Degraded,
    /// Service not responding
    Down,
}

/// # Responsibility
/// Service diagnostic data.
#[derive(Debug, Clone)]
pub struct ServiceDiagnostic {
    pub name: String,
    pub status: ServiceStatus,
    pub uptime_ms: u64,
    pub error_count: u32,
}

/// # Responsibility
/// Displays service health monitoring panel.
///
/// # Props
/// - `services`: List of service diagnostics
/// - `visible`: Whether panel is visible
#[component]
pub fn ServiceDiagnosticsPanel(
    services: ReadSignal<Vec<ServiceDiagnostic>>,
    #[prop(default = true)] visible: bool,
) -> impl IntoView {
    if !visible {
        return view! { <div></div> }.into_view();
    }

    let status_color = |status: &ServiceStatus| match status {
        ServiceStatus::Healthy => "green",
        ServiceStatus::Degraded => "yellow",
        ServiceStatus::Down => "red",
    };

    let format_uptime = |uptime_ms: u64| {
        let seconds = uptime_ms / 1000;
        if seconds < 60 {
            format!("{}s", seconds)
        } else if seconds < 3600 {
            format!("{}m {}s", seconds / 60, seconds % 60)
        } else {
            format!("{}h {}m", seconds / 3600, (seconds % 3600) / 60)
        }
    };

    view! {
        <div class="service-diagnostics-panel">
            <div class="panel-header">"SERVICE DIAGNOSTICS"</div>
            <div class="service-list">
                <For
                    each=move || services.get()
                    key=|s| s.name.clone()
                    children=move |service: ServiceDiagnostic| {
                        let color = status_color(&service.status);
                        view! {
                            <div class="service-item">
                                <div class="service-name">{service.name}</div>
                                <div class="service-status" style:color=color>
                                    {format!("{:?}", service.status)}
                                </div>
                                <div class="service-uptime">
                                    {format_uptime(service.uptime_ms)}
                                </div>
                                <div class="service-errors">
                                    {format!("Errors: {}", service.error_count)}
                                </div>
                            </div>
                        }
                    }
                />
            </div>
        </div>
    }
    .into_view()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_service_status_healthy() {
        assert_eq!(ServiceStatus::Healthy, ServiceStatus::Healthy);
    }

    #[test]
    fn test_service_status_degraded() {
        assert_eq!(ServiceStatus::Degraded, ServiceStatus::Degraded);
    }

    #[test]
    fn test_service_status_down() {
        assert_eq!(ServiceStatus::Down, ServiceStatus::Down);
    }

    #[test]
    fn test_service_diagnostic_creation() {
        let diag = ServiceDiagnostic {
            name: "EventBus".to_string(),
            status: ServiceStatus::Healthy,
            uptime_ms: 60000,
            error_count: 0,
        };
        assert_eq!(diag.name, "EventBus");
        assert_eq!(diag.status, ServiceStatus::Healthy);
        assert_eq!(diag.uptime_ms, 60000);
        assert_eq!(diag.error_count, 0);
    }
}
