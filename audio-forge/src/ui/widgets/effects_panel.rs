//! # Responsibility
//! Audio effects control panel with debounced configuration updates.
//!
//! ---
//!
//! Extracted from MainWindow (Directive 12). This widget encapsulates:
//! - 8D Audio controls (enable, intensity, rotation speed)
//! - Drop Effect controls (enable, attenuation amount)
//! - Bass Boost controls (enable, gain multiplier)
//! - Treble Boost controls (enable, gain multiplier)
//! - Debounced config propagation to avoid mutex lock spam

use crate::contracts::effect_parameters::EffectConfig;
use crate::services::interfaces::i_audio_effects::IAudioEffects;
use crate::ui::widgets::Panel;
use egui;
use std::sync::Arc;
use std::time::{Duration, Instant};

/// # Responsibility
/// Self-contained audio effects UI panel with state management.
///
/// ---
///
/// ## Architecture
/// - **Encapsulation**: All effects state lives here, not in MainWindow
/// - **Debouncing**: Config updates throttled to 100ms to reduce lock contention
/// - **SRP Compliance**: Single responsibility = effects UI rendering
pub struct EffectsPanel {
    /// Current effect configuration (local state)
    effect_config: EffectConfig,
    
    /// Service for applying effects (injected dependency)
    audio_effects: Arc<dyn IAudioEffects>,
    
    /// Flag indicating config change pending propagation
    pending_config_change: bool,
    
    /// Timestamp of last config update (for debouncing)
    last_config_update: Instant,
    
    /// Debounce interval to reduce mutex lock spam
    debounce_interval: Duration,
}

impl EffectsPanel {
    /// # Responsibility
    /// Create new EffectsPanel with injected audio effects service.
    ///
    /// ---
    ///
    /// ## Parameters
    /// - `audio_effects`: Service implementing IAudioEffects trait
    /// - `initial_config`: Initial effect configuration
    ///
    /// ## Design
    /// Uses **Dependency Injection** to receive service, enabling testability
    /// with mock services.
    pub fn new(audio_effects: Arc<dyn IAudioEffects>, initial_config: EffectConfig) -> Self {
        Self {
            effect_config: initial_config,
            audio_effects,
            pending_config_change: false,
            last_config_update: Instant::now(),
            debounce_interval: Duration::from_millis(100),
        }
    }
    
    /// # Responsibility
    /// Get current effect configuration (for persistence).
    pub fn get_config(&self) -> &EffectConfig {
        &self.effect_config
    }
    
    /// # Responsibility
    /// Update effect configuration externally (e.g., from loaded config).
    pub fn set_config(&mut self, config: EffectConfig) {
        self.effect_config = config.clone();
        self.audio_effects.set_config(config);
        self.last_config_update = Instant::now();
        self.pending_config_change = false;
    }
}

impl Panel for EffectsPanel {
    /// # Responsibility
    /// Render effects control UI with debounced config propagation.
    ///
    /// ---
    ///
    /// ## Returns
    /// `true` if config was updated (for parent notification, e.g., to save config)
    fn render(&mut self, _ctx: &egui::Context, ui: &mut egui::Ui) -> bool {
        ui.heading("🎛️ Audio Effects - Real-Time DSP");
        
        let mut config_changed = false;

        ui.horizontal(|ui| {
            // ====================================================================
            // 8D AUDIO EFFECT
            // ====================================================================
            ui.group(|ui| {
                ui.vertical(|ui| {
                    if ui.checkbox(&mut self.effect_config.effect_8d_enabled, "8D Audio")
                        .on_hover_text("Circular panning effect for immersive spatial audio")
                        .changed() 
                    {
                        config_changed = true;
                    }
                    if self.effect_config.effect_8d_enabled {
                        ui.horizontal(|ui| {
                            ui.label("Intensity:");
                            if ui.add(
                                egui::Slider::new(
                                    &mut self.effect_config.effect_8d_intensity,
                                    0.0..=1.0,
                                )
                                .text(""),
                            )
                            .on_hover_text("Depth of panning effect (0.0 = subtle, 1.0 = extreme)")
                            .changed() {
                                config_changed = true;
                            }
                        });
                        ui.horizontal(|ui| {
                            ui.label("Speed (Hz):");
                            if ui.add(
                                egui::Slider::new(
                                    &mut self.effect_config.effect_8d_rotation_hz,
                                    0.1..=1.0,
                                )
                                .text(""),
                            )
                            .on_hover_text("Rotation frequency (0.1Hz = slow, 1.0Hz = fast)")
                            .changed() {
                                config_changed = true;
                            }
                        });
                    }
                });
            });

            ui.separator();

            // ====================================================================
            // DROP EFFECT
            // ====================================================================
            ui.group(|ui| {
                ui.vertical(|ui| {
                    if ui.checkbox(&mut self.effect_config.drop_effect_enabled, "Drop Effect")
                        .on_hover_text("Volume reduction effect (sudden drop)")
                        .changed() 
                    {
                        config_changed = true;
                    }
                    if self.effect_config.drop_effect_enabled {
                        ui.horizontal(|ui| {
                            ui.label("Amount:");
                            if ui.add(
                                egui::Slider::new(
                                    &mut self.effect_config.drop_amount,
                                    0.0..=1.0,
                                )
                                .text(""),
                            )
                            .on_hover_text("Volume attenuation (0.0 = no drop, 1.0 = complete silence)")
                            .changed() {
                                config_changed = true;
                            }
                        });
                    }
                });
            });

            ui.separator();

            // ====================================================================
            // BASS BOOST
            // ====================================================================
            ui.group(|ui| {
                ui.vertical(|ui| {
                    if ui.checkbox(&mut self.effect_config.bass_boost_enabled, "Bass Boost")
                        .on_hover_text("Amplify low frequencies (20-250Hz)")
                        .changed() 
                    {
                        config_changed = true;
                    }
                    if self.effect_config.bass_boost_enabled {
                        ui.horizontal(|ui| {
                            ui.label("Gain:");
                            if ui.add(
                                egui::Slider::new(
                                    &mut self.effect_config.bass_boost_gain,
                                    1.0..=3.0,
                                )
                                .text("x"),
                            )
                            .on_hover_text("Gain multiplier (1.0 = no boost, 3.0 = +9.5dB)")
                            .changed() {
                                config_changed = true;
                            }
                        });
                    }
                });
            });

            ui.separator();

            // ====================================================================
            // TREBLE BOOST
            // ====================================================================
            ui.group(|ui| {
                ui.vertical(|ui| {
                    if ui.checkbox(&mut self.effect_config.treble_boost_enabled, "Treble Boost")
                        .on_hover_text("Amplify high frequencies (4kHz-20kHz)")
                        .changed() 
                    {
                        config_changed = true;
                    }
                    if self.effect_config.treble_boost_enabled {
                        ui.horizontal(|ui| {
                            ui.label("Gain:");
                            if ui.add(
                                egui::Slider::new(
                                    &mut self.effect_config.treble_boost_gain,
                                    1.0..=3.0,
                                )
                                .text("x"),
                            )
                            .on_hover_text("Gain multiplier (1.0 = no boost, 3.0 = +9.5dB)")
                            .changed() {
                                config_changed = true;
                            }
                        });
                    }
                });
            });
        });

        // ====================================================================
        // PITCH SHIFT / HZ CHANGER (NEW)
        // ====================================================================
        ui.horizontal(|ui| {
            ui.group(|ui| {
                ui.vertical(|ui| {
                    if ui.checkbox(&mut self.effect_config.pitch_shift_enabled, "Hz Changer (Pitch Shift)")
                        .on_hover_text("Shift reference frequency from 440Hz (A4) to harmonic alternatives")
                        .changed() 
                    {
                        config_changed = true;
                    }
                    if self.effect_config.pitch_shift_enabled {
                        ui.horizontal(|ui| {
                            ui.label("Target Frequency:");
                            if ui.add(
                                egui::DragValue::new(&mut self.effect_config.reference_frequency)
                                    .speed(1.0)
                                    .range(220.0..=880.0)
                                    .suffix(" Hz"),
                            )
                            .on_hover_text("Reference frequency for A4 (default 440Hz)")
                            .changed() {
                                config_changed = true;
                            }
                        });
                        
                        // Quick presets for common harmonic frequencies
                        ui.horizontal(|ui| {
                            ui.label("Presets:");
                            if ui.small_button("432 Hz").on_hover_text("Verdi's A (natural tuning)").clicked() {
                                self.effect_config.reference_frequency = 432.0;
                                config_changed = true;
                            }
                            if ui.small_button("528 Hz").on_hover_text("Solfeggio healing frequency").clicked() {
                                self.effect_config.reference_frequency = 528.0;
                                config_changed = true;
                            }
                            if ui.small_button("396 Hz").on_hover_text("Solfeggio liberation frequency").clicked() {
                                self.effect_config.reference_frequency = 396.0;
                                config_changed = true;
                            }
                            if ui.small_button("440 Hz").on_hover_text("Standard concert pitch (reset)").clicked() {
                                self.effect_config.reference_frequency = 440.0;
                                config_changed = true;
                            }
                        });
                    }
                });
            });
        });

        // ====================================================================
        // DEBOUNCED CONFIG PROPAGATION
        // ====================================================================
        // Avoid spamming mutex locks on every slider drag. Wait 100ms after
        // last change before propagating to service.
        
        if config_changed {
            self.pending_config_change = true;
        }
        
        let mut config_was_applied = false;
        
        if self.pending_config_change {
            let now = Instant::now();
            if now.duration_since(self.last_config_update) > self.debounce_interval {
                self.audio_effects.set_config(self.effect_config.clone());
                self.pending_config_change = false;
                self.last_config_update = now;
                config_was_applied = true;
            }
        }
        
        config_was_applied
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::audio_effects::AudioEffectsService;
    use crate::services::event_bus::EventBusService;
    
    fn create_test_service() -> Arc<dyn IAudioEffects> {
        let event_bus = Arc::new(EventBusService::default());
        Arc::new(AudioEffectsService::new(EffectConfig::default(), event_bus))
    }
    
    #[test]
    fn test_effects_panel_creates_with_default_config() {
        let service = create_test_service();
        let config = EffectConfig::default();
        
        let panel = EffectsPanel::new(service, config.clone());
        
        assert_eq!(panel.get_config().effect_8d_enabled, config.effect_8d_enabled);
        assert_eq!(panel.get_config().drop_effect_enabled, config.drop_effect_enabled);
    }
    
    #[test]
    fn test_effects_panel_set_config_updates_service() {
        let service = create_test_service();
        let mut panel = EffectsPanel::new(service.clone(), EffectConfig::default());
        
        let new_config = EffectConfig {
            effect_8d_enabled: true,
            effect_8d_intensity: 0.8,
            ..Default::default()
        };
        
        panel.set_config(new_config.clone());
        
        // Verify panel state updated
        assert!(panel.get_config().effect_8d_enabled);
        assert_eq!(panel.get_config().effect_8d_intensity, 0.8);
        
        // Verify service received update
        let service_config = service.get_config();
        assert!(service_config.effect_8d_enabled);
        assert_eq!(service_config.effect_8d_intensity, 0.8);
    }
    
    #[test]
    fn test_effects_panel_pending_flag_resets_after_set_config() {
        let service = create_test_service();
        let mut panel = EffectsPanel::new(service, EffectConfig::default());
        
        // Simulate manual config change
        panel.pending_config_change = true;
        
        // External config load should reset flag
        panel.set_config(EffectConfig::default());
        
        assert!(!panel.pending_config_change);
    }
}
