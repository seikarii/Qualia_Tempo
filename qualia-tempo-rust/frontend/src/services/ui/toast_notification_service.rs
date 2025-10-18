//! # Responsibility
//! Displays temporary toast notifications (achievements, combos, warnings) (BLUEPRINT #44).
//!
//! ---
//!
//! This service manages a queue of toast notifications with automatic dismissal,
//! preventing overlaps and ensuring smooth fade animations.

use anyhow::Result;
use leptos::*;
use std::collections::VecDeque;
use tracing::debug;
use wasm_bindgen_futures::spawn_local;
use gloo_timers::future::TimeoutFuture;

/// # Responsibility
/// Represents a single toast notification.
#[derive(Debug, Clone, PartialEq)]
pub struct ToastNotification {
    pub id: String,
    pub message: String,
    pub toast_type: ToastType,
    pub duration_ms: u32,
}

/// # Responsibility
/// Enumerates toast notification types.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ToastType {
    Achievement,
    Combo,
    Warning,
    Info,
}

impl ToastType {
    /// Get CSS class for toast type
    #[must_use]
    pub fn css_class(&self) -> &'static str {
        match self {
            Self::Achievement => "toast-achievement",
            Self::Combo => "toast-combo",
            Self::Warning => "toast-warning",
            Self::Info => "toast-info",
        }
    }
}

/// # Responsibility
/// Manages toast notification queue and display.
///
/// ---
///
/// Provides FIFO queue for toast notifications with auto-dismissal and overlap
/// prevention. Each toast has configurable duration and type-specific styling.
#[derive(Clone)]
pub struct ToastNotificationService {
    /// Active toast queue signal
    pub queue_signal: WriteSignal<VecDeque<ToastNotification>>,
    pub queue_reader: ReadSignal<VecDeque<ToastNotification>>,
    /// Maximum concurrent toasts
    max_concurrent: usize,
}

impl ToastNotificationService {
    /// # Responsibility
    /// Creates a new ToastNotificationService.
    ///
    /// # Arguments
    /// - `max_concurrent`: Maximum number of toasts displayed at once (default 3)
    pub fn new(max_concurrent: usize) -> Result<Self> {
        let (queue_reader, queue_signal) = create_signal(VecDeque::new());

        debug!("ToastNotificationService initialized with max_concurrent={}", max_concurrent);

        Ok(Self {
            queue_signal,
            queue_reader,
            max_concurrent,
        })
    }

    /// # Responsibility
    /// Shows a new toast notification.
    ///
    /// ---
    ///
    /// Adds toast to queue and auto-dismisses after duration.
    /// If max_concurrent limit reached, oldest toast is removed.
    ///
    /// # Arguments
    /// - `message`: Toast message text
    /// - `toast_type`: Type of notification (affects styling)
    /// - `duration_ms`: Display duration in milliseconds (default 3000ms)
    pub fn show_toast(&self, message: String, toast_type: ToastType, duration_ms: Option<u32>) {
        let duration = duration_ms.unwrap_or(3000);
        let toast_id = format!("toast_{}", js_sys::Date::now());

        let toast = ToastNotification {
            id: toast_id.clone(),
            message,
            toast_type,
            duration_ms: duration,
        };

        debug!("Showing toast: {} ({:?}, {}ms)", toast.message, toast_type, duration);

        // Add to queue
        let mut queue = self.queue_reader.get();
        
        // Remove oldest if at limit
        if queue.len() >= self.max_concurrent {
            queue.pop_front();
        }
        
        queue.push_back(toast);
        self.queue_signal.set(queue);

        // Auto-dismiss after duration
        let queue_signal = self.queue_signal;
        let queue_reader = self.queue_reader;
        
        spawn_local(async move {
            TimeoutFuture::new(duration).await;
            
            let mut queue = queue_reader.get();
            queue.retain(|t| t.id != toast_id);
            queue_signal.set(queue);
            
            debug!("Toast dismissed: {}", toast_id);
        });
    }

    /// # Responsibility
    /// Shows achievement notification.
    pub fn show_achievement(&self, message: String) {
        self.show_toast(message, ToastType::Achievement, Some(4000));
    }

    /// # Responsibility
    /// Shows combo notification.
    pub fn show_combo(&self, combo: u32) {
        let message = format!("{}x COMBO!", combo);
        self.show_toast(message, ToastType::Combo, Some(2000));
    }

    /// # Responsibility
    /// Shows warning notification.
    pub fn show_warning(&self, message: String) {
        self.show_toast(message, ToastType::Warning, Some(3500));
    }

    /// # Responsibility
    /// Shows info notification.
    pub fn show_info(&self, message: String) {
        self.show_toast(message, ToastType::Info, Some(2500));
    }

    /// # Responsibility
    /// Clears all active toasts.
    pub fn clear_all(&self) {
        self.queue_signal.set(VecDeque::new());
        debug!("All toasts cleared");
    }

    /// # Responsibility
    /// Gets current toast queue (read-only).
    #[must_use]
    pub fn get_queue(&self) -> VecDeque<ToastNotification> {
        self.queue_reader.get()
    }

    /// # Responsibility
    /// Renders all active toasts as HTML string.
    #[must_use]
    pub fn render_toasts(&self) -> String {
        let queue = self.queue_reader.get();
        
        let toasts_html: Vec<String> = queue
            .iter()
            .map(|toast| {
                format!(
                    r#"<div class="toast {}" id="{}">
                        <span class="toast-message">{}</span>
                    </div>"#,
                    toast.toast_type.css_class(),
                    toast.id,
                    toast.message
                )
            })
            .collect();

        format!(
            r#"<div class="toast-container">{}</div>"#,
            toasts_html.join("\n")
        )
    }
}

impl Default for ToastNotificationService {
    fn default() -> Self {
        Self::new(3).expect("Failed to create ToastNotificationService")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use wasm_bindgen_test::*;

    wasm_bindgen_test_configure!(run_in_browser);

    #[wasm_bindgen_test]
    fn test_show_toast() {
        let service = ToastNotificationService::new(3).unwrap();

        service.show_toast("Test message".to_string(), ToastType::Info, Some(1000));

        let queue = service.get_queue();
        assert_eq!(queue.len(), 1);
        assert_eq!(queue[0].message, "Test message");
        assert_eq!(queue[0].toast_type, ToastType::Info);
    }

    #[wasm_bindgen_test]
    fn test_max_concurrent_limit() {
        let service = ToastNotificationService::new(2).unwrap();

        service.show_toast("Toast 1".to_string(), ToastType::Info, Some(5000));
        service.show_toast("Toast 2".to_string(), ToastType::Info, Some(5000));
        service.show_toast("Toast 3".to_string(), ToastType::Info, Some(5000));

        let queue = service.get_queue();
        assert_eq!(queue.len(), 2, "Should not exceed max_concurrent");
        assert_eq!(queue[0].message, "Toast 2");
        assert_eq!(queue[1].message, "Toast 3");
    }

    #[wasm_bindgen_test]
    fn test_show_achievement() {
        let service = ToastNotificationService::new(3).unwrap();

        service.show_achievement("First Blood!".to_string());

        let queue = service.get_queue();
        assert_eq!(queue.len(), 1);
        assert_eq!(queue[0].toast_type, ToastType::Achievement);
        assert_eq!(queue[0].duration_ms, 4000);
    }

    #[wasm_bindgen_test]
    fn test_show_combo() {
        let service = ToastNotificationService::new(3).unwrap();

        service.show_combo(50);

        let queue = service.get_queue();
        assert_eq!(queue.len(), 1);
        assert_eq!(queue[0].message, "50x COMBO!");
        assert_eq!(queue[0].toast_type, ToastType::Combo);
    }

    #[wasm_bindgen_test]
    fn test_clear_all() {
        let service = ToastNotificationService::new(3).unwrap();

        service.show_info("Test 1".to_string());
        service.show_info("Test 2".to_string());
        assert_eq!(service.get_queue().len(), 2);

        service.clear_all();
        assert_eq!(service.get_queue().len(), 0);
    }

    #[wasm_bindgen_test]
    fn test_toast_type_css_class() {
        assert_eq!(ToastType::Achievement.css_class(), "toast-achievement");
        assert_eq!(ToastType::Combo.css_class(), "toast-combo");
        assert_eq!(ToastType::Warning.css_class(), "toast-warning");
        assert_eq!(ToastType::Info.css_class(), "toast-info");
    }

    #[wasm_bindgen_test]
    async fn test_auto_dismissal() {
        let service = ToastNotificationService::new(3).unwrap();

        service.show_toast("Auto dismiss".to_string(), ToastType::Info, Some(100));

        assert_eq!(service.get_queue().len(), 1);

        // Wait for auto-dismissal
        TimeoutFuture::new(150).await;

        assert_eq!(service.get_queue().len(), 0, "Toast should be auto-dismissed");
    }
}
