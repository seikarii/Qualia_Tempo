//! # Responsibility
//! Manages user-facing notifications and toast messages.
//!
//! ---
//!
//! Displays temporary messages for game events: combos, achievements, errors.
//! Uses Leptos reactive signals for UI integration.

use std::sync::{Arc, Mutex};
use std::collections::VecDeque;
use leptos::*;
use crate::services::core::ILogger;

/// # Responsibility
/// Configuration for notification system.
#[derive(Debug, Clone)]
pub struct NotificationConfig {
    /// Maximum number of concurrent notifications
    pub max_concurrent: usize,
    
    /// Default notification duration (seconds)
    pub default_duration_sec: f64,
    
    /// Whether to auto-dismiss notifications
    pub auto_dismiss: bool,
}

impl Default for NotificationConfig {
    fn default() -> Self {
        Self {
            max_concurrent: 3,
            default_duration_sec: 3.0,
            auto_dismiss: true,
        }
    }
}

/// # Responsibility
/// Defines notification severity levels.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NotificationLevel {
    Info,
    Success,
    Warning,
    Error,
}

impl NotificationLevel {
    /// # Responsibility
    /// Gets CSS class name for styling.
    pub fn css_class(&self) -> &'static str {
        match self {
            Self::Info => "notification-info",
            Self::Success => "notification-success",
            Self::Warning => "notification-warning",
            Self::Error => "notification-error",
        }
    }
    
    /// # Responsibility
    /// Gets color for UI rendering.
    pub fn color(&self) -> &'static str {
        match self {
            Self::Info => "#3B82F6",    // Blue
            Self::Success => "#10B981",  // Green
            Self::Warning => "#F59E0B",  // Amber
            Self::Error => "#EF4444",    // Red
        }
    }
}

/// # Responsibility
/// Represents a single notification.
#[derive(Debug, Clone)]
pub struct Notification {
    pub id: String,
    pub message: String,
    pub level: NotificationLevel,
    pub duration_sec: f64,
    pub timestamp: f64, // Creation time (Performance.now())
}

impl Notification {
    /// # Responsibility
    /// Creates a new notification with auto-generated ID.
    pub fn new(message: String, level: NotificationLevel, duration_sec: f64) -> Self {
        let id = uuid::Uuid::new_v4().to_string();
        let timestamp = web_sys::window()
            .and_then(|w| w.performance())
            .map(|p| p.now())
            .unwrap_or(0.0);
        
        Self {
            id,
            message,
            level,
            duration_sec,
            timestamp,
        }
    }
    
    /// # Responsibility
    /// Checks if notification has expired.
    pub fn is_expired(&self, now: f64) -> bool {
        (now - self.timestamp) / 1000.0 > self.duration_sec
    }
}

/// # Responsibility
/// Manages notification queue and display.
///
/// ---
///
/// Maintains a FIFO queue of notifications with automatic expiration.
/// Integrates with Leptos reactivity via RwSignal<Vec<Notification>>.
pub struct NotificationService {
    config: NotificationConfig,
    logger: Arc<dyn ILogger>,
    
    // Notification queue (thread-safe for cross-component access)
    notifications: Arc<Mutex<VecDeque<Notification>>>,
}

impl NotificationService {
    /// # Responsibility
    /// Creates new notification service.
    pub fn new(config: NotificationConfig, logger: Arc<dyn ILogger>) -> Self {
        Self {
            config,
            logger,
            notifications: Arc::new(Mutex::new(VecDeque::new())),
        }
    }
    
    /// # Responsibility
    /// Shows a notification with custom duration.
    pub fn show(&self, message: String, level: NotificationLevel, duration_sec: f64) {
        let notification = Notification::new(message, level, duration_sec);
        
        self.logger.debug(&format!(
            "Notification: [{:?}] {}",
            level, notification.message
        ));
        
        let mut queue = self.notifications.lock().unwrap();
        
        // Enforce max concurrent limit (drop oldest)
        while queue.len() >= self.config.max_concurrent {
            queue.pop_front();
        }
        
        queue.push_back(notification);
    }
    
    /// # Responsibility
    /// Shows an info notification.
    pub fn info(&self, message: String) {
        self.show(message, NotificationLevel::Info, self.config.default_duration_sec);
    }
    
    /// # Responsibility
    /// Shows a success notification.
    pub fn success(&self, message: String) {
        self.show(message, NotificationLevel::Success, self.config.default_duration_sec);
    }
    
    /// # Responsibility
    /// Shows a warning notification.
    pub fn warn(&self, message: String) {
        self.show(message, NotificationLevel::Warning, self.config.default_duration_sec);
    }
    
    /// # Responsibility
    /// Shows an error notification.
    pub fn error(&self, message: String) {
        self.show(message, NotificationLevel::Error, self.config.default_duration_sec);
    }
    
    /// # Responsibility
    /// Gets current notifications (for UI rendering).
    pub fn get_notifications(&self) -> Vec<Notification> {
        self.notifications.lock().unwrap().iter().cloned().collect()
    }
    
    /// # Responsibility
    /// Removes a specific notification by ID.
    pub fn dismiss(&self, id: &str) {
        let mut queue = self.notifications.lock().unwrap();
        queue.retain(|n| n.id != id);
    }
    
    /// # Responsibility
    /// Removes expired notifications (should be called periodically).
    pub fn prune_expired(&self) {
        if !self.config.auto_dismiss {
            return;
        }
        
        let now = web_sys::window()
            .and_then(|w| w.performance())
            .map(|p| p.now())
            .unwrap_or(0.0);
        
        let mut queue = self.notifications.lock().unwrap();
        queue.retain(|n| !n.is_expired(now));
    }
    
    /// # Responsibility
    /// Clears all notifications.
    pub fn clear_all(&self) {
        self.notifications.lock().unwrap().clear();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::tests::mocks::MockLogger;
    
    fn create_test_service() -> NotificationService {
        let config = NotificationConfig::default();
        let logger = Arc::new(MockLogger);
        NotificationService::new(config, logger)
    }
    
    #[test]
    fn test_notification_service_creation() {
        let service = create_test_service();
        assert_eq!(service.get_notifications().len(), 0);
    }
    
    #[test]
    fn test_show_notification() {
        let service = create_test_service();
        
        service.info("Test message".to_string());
        
        let notifications = service.get_notifications();
        assert_eq!(notifications.len(), 1);
        assert_eq!(notifications[0].message, "Test message");
        assert_eq!(notifications[0].level, NotificationLevel::Info);
    }
    
    #[test]
    fn test_max_concurrent_limit() {
        let service = create_test_service();
        
        // Add 5 notifications (max_concurrent = 3)
        for i in 0..5 {
            service.info(format!("Message {}", i));
        }
        
        let notifications = service.get_notifications();
        
        // Should only have last 3
        assert_eq!(notifications.len(), 3);
        assert_eq!(notifications[0].message, "Message 2");
        assert_eq!(notifications[2].message, "Message 4");
    }
    
    #[test]
    fn test_dismiss_notification() {
        let service = create_test_service();
        
        service.info("Test 1".to_string());
        service.info("Test 2".to_string());
        
        let notifications = service.get_notifications();
        let id_to_dismiss = notifications[0].id.clone();
        
        service.dismiss(&id_to_dismiss);
        
        let notifications_after = service.get_notifications();
        assert_eq!(notifications_after.len(), 1);
        assert_eq!(notifications_after[0].message, "Test 2");
    }
    
    #[test]
    fn test_clear_all_notifications() {
        let service = create_test_service();
        
        service.info("Test 1".to_string());
        service.info("Test 2".to_string());
        service.info("Test 3".to_string());
        
        service.clear_all();
        
        assert_eq!(service.get_notifications().len(), 0);
    }
    
    #[test]
    fn test_notification_levels() {
        assert_eq!(NotificationLevel::Info.css_class(), "notification-info");
        assert_eq!(NotificationLevel::Success.css_class(), "notification-success");
        assert_eq!(NotificationLevel::Warning.css_class(), "notification-warning");
        assert_eq!(NotificationLevel::Error.css_class(), "notification-error");
    }
}
