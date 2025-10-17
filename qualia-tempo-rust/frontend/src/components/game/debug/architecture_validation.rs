//! # Responsibility
//! Runtime architecture compliance checker UI.
//!
//! ---
//!
//! Leptos component displaying real-time validation of QUALIA.CODE.RUST principles.
//! Shows EventBus lock-free status, dependency injection integrity, and test coverage.

use leptos::*;

/// # Responsibility
/// Architecture validation result.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ValidationResult {
    /// Rule compliant
    Pass,
    /// Rule violated
    Fail,
}

/// # Responsibility
/// Architecture rule validation.
#[derive(Debug, Clone)]
pub struct ArchitectureRule {
    pub name: String,
    pub result: ValidationResult,
    pub message: String,
}

/// # Responsibility
/// Displays architecture validation panel.
///
/// # Props
/// - `rules`: List of validated rules
/// - `visible`: Whether panel is visible
#[component]
pub fn ArchitectureValidation(
    rules: ReadSignal<Vec<ArchitectureRule>>,
    #[prop(default = true)] visible: bool,
) -> impl IntoView {
    if !visible {
        return view! { <div></div> }.into_view();
    }

    let result_icon = |result: &ValidationResult| match result {
        ValidationResult::Pass => "✅",
        ValidationResult::Fail => "❌",
    };

    let all_passing = move || {
        rules.get().iter().all(|r| r.result == ValidationResult::Pass)
    };

    view! {
        <div class="architecture-validation">
            <div class="panel-header">
                "ARCHITECTURE VALIDATION "
                {move || if all_passing() { "✅" } else { "⚠️" }}
            </div>
            <div class="rule-list">
                <For
                    each=move || rules.get()
                    key=|r| r.name.clone()
                    children=move |rule: ArchitectureRule| {
                        let icon = result_icon(&rule.result);
                        view! {
                            <div class="rule-item">
                                <div class="rule-icon">{icon}</div>
                                <div class="rule-name">{rule.name}</div>
                                <div class="rule-message">{rule.message}</div>
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
    fn test_validation_result_pass() {
        assert_eq!(ValidationResult::Pass, ValidationResult::Pass);
    }

    #[test]
    fn test_validation_result_fail() {
        assert_eq!(ValidationResult::Fail, ValidationResult::Fail);
    }

    #[test]
    fn test_architecture_rule_creation() {
        let rule = ArchitectureRule {
            name: "EventBus Lock-Free".to_string(),
            result: ValidationResult::Pass,
            message: "Using tokio::sync::broadcast".to_string(),
        };
        assert_eq!(rule.name, "EventBus Lock-Free");
        assert_eq!(rule.result, ValidationResult::Pass);
    }

    #[test]
    fn test_validation_result_inequality() {
        assert_ne!(ValidationResult::Pass, ValidationResult::Fail);
    }
}
