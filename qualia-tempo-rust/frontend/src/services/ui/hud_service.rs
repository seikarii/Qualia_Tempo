//! # Responsibility
//! Renders HUD overlay (HP bars, combo counter, score) (BLUEPRINT #43).
//!
//! ---
//!
//! This service subscribes to PlayerState, BossState, and QualiaState reactive
//! signals and renders UI overlays using HTML/CSS (Leptos components).

use anyhow::Result;
use leptos::*;
use shared_core::contracts::{BossState, PlayerState, QualiaState};
use tracing::debug;

/// # Responsibility
/// Manages HUD rendering and animation for gameplay UI.
///
/// ---
///
/// Provides reactive UI components that automatically update when game state
/// changes. Renders HP bars, combo counter, score, and qualia intensity bar.
#[derive(Clone)]
pub struct HUDService {
    /// Player state reader signal
    player_reader: ReadSignal<PlayerState>,
    /// Boss state reader signal
    boss_reader: ReadSignal<BossState>,
    /// Qualia state reader signal
    qualia_reader: ReadSignal<QualiaState>,
}

impl HUDService {
    /// # Responsibility
    /// Creates a new HUDService with reactive state signals.
    ///
    /// # Arguments
    /// - `player_reader`: ReadSignal for player state
    /// - `boss_reader`: ReadSignal for boss state
    /// - `qualia_reader`: ReadSignal for qualia state
    pub fn new(
        player_reader: ReadSignal<PlayerState>,
        boss_reader: ReadSignal<BossState>,
        qualia_reader: ReadSignal<QualiaState>,
    ) -> Result<Self> {
        debug!("HUDService initialized");

        Ok(Self {
            player_reader,
            boss_reader,
            qualia_reader,
        })
    }

    /// # Responsibility
    /// Renders player HP bar as HTML string.
    ///
    /// ---
    ///
    /// Returns HTML markup for player health visualization.
    /// Uses reactive signals to auto-update on state changes.
    #[must_use]
    pub fn render_player_hp(&self) -> String {
        let player = self.player_reader.get();
        let hp_percent = (player.health / player.max_health * 100.0).clamp(0.0, 100.0);

        format!(
            r#"<div class="player-hp-bar">
                <div class="hp-fill" style="width: {:.1}%"></div>
                <span class="hp-text">{:.0} / {:.0}</span>
            </div>"#,
            hp_percent, player.health, player.max_health
        )
    }

    /// # Responsibility
    /// Renders boss HP bar as HTML string.
    #[must_use]
    pub fn render_boss_hp(&self) -> String {
        let boss = self.boss_reader.get();
        let hp_percent = (boss.health / boss.max_health * 100.0).clamp(0.0, 100.0);

        format!(
            r#"<div class="boss-hp-bar">
                <div class="hp-fill boss" style="width: {:.1}%"></div>
                <span class="hp-text">{:.0} / {:.0}</span>
            </div>"#,
            hp_percent, boss.health, boss.max_health
        )
    }

    /// # Responsibility
    /// Renders combo counter as HTML string.
    #[must_use]
    pub fn render_combo(&self) -> String {
        let player = self.player_reader.get();
        let combo_class = if player.combo >= 100 {
            "combo-legendary"
        } else if player.combo >= 50 {
            "combo-epic"
        } else if player.combo >= 20 {
            "combo-great"
        } else {
            "combo-normal"
        };

        format!(
            r#"<div class="combo-counter {class}">
                <span class="combo-label">COMBO</span>
                <span class="combo-value">{combo}x</span>
            </div>"#,
            class = combo_class,
            combo = player.combo
        )
    }

    /// # Responsibility
    /// Renders qualia intensity bar as HTML string.
    ///
    /// ---
    ///
    /// Visualizes current qualia intensity with color-coded bar.
    #[must_use]
    pub fn render_qualia_bar(&self) -> String {
        let qualia = self.qualia_reader.get();
        let intensity_percent = (qualia.intensity * 100.0).clamp(0.0, 100.0);

        let color = if intensity_percent >= 80.0 {
            "#ff0066" // High intensity: red-pink
        } else if intensity_percent >= 50.0 {
            "#ff9900" // Medium: orange
        } else {
            "#00ccff" // Low: cyan
        };

        format!(
            r#"<div class="qualia-intensity-bar">
                <div class="qualia-fill" style="width: {:.1}%; background-color: {}"></div>
                <span class="qualia-label">INTENSITY</span>
            </div>"#,
            intensity_percent, color
        )
    }

    /// # Responsibility
    /// Renders complete HUD as HTML string.
    ///
    /// ---
    ///
    /// Combines all HUD elements into a single overlay.
    #[must_use]
    pub fn render_full_hud(&self) -> String {
        format!(
            r#"<div class="game-hud">
                {}
                {}
                {}
                {}
            </div>"#,
            self.render_player_hp(),
            self.render_boss_hp(),
            self.render_combo(),
            self.render_qualia_bar()
        )
    }

    /// # Responsibility
    /// Gets current combo value (read-only).
    #[must_use]
    pub fn get_combo(&self) -> u32 {
        self.player_reader.get().combo
    }

    /// # Responsibility
    /// Gets current player HP percentage (read-only).
    #[must_use]
    pub fn get_player_hp_percent(&self) -> f32 {
        let player = self.player_reader.get();
        (player.health / player.max_health * 100.0).clamp(0.0, 100.0)
    }

    /// # Responsibility
    /// Gets current boss HP percentage (read-only).
    #[must_use]
    pub fn get_boss_hp_percent(&self) -> f32 {
        let boss = self.boss_reader.get();
        (boss.health / boss.max_health * 100.0).clamp(0.0, 100.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use shared_core::contracts::{QualiaState, PlayerState, BossState};

    #[test]
    fn test_render_player_hp() {
        let (player_reader, _player_signal) = create_signal(PlayerState {
            health: 75.0,
            max_health: 100.0,
            ..Default::default()
        });
        let (boss_reader, _) = create_signal(BossState::default());
        let (qualia_reader, _) = create_signal(QualiaState::default());

        let hud = HUDService::new(player_reader, boss_reader, qualia_reader).unwrap();

        let html = hud.render_player_hp();
        assert!(html.contains("75.0%"), "HP bar should show 75% width");
        assert!(html.contains("75 / 100"), "HP text should show 75/100");
    }

    #[test]
    fn test_render_combo() {
        let (player_reader, _) = create_signal(PlayerState {
            combo: 42,
            ..Default::default()
        });
        let (boss_reader, _) = create_signal(BossState::default());
        let (qualia_reader, _) = create_signal(QualiaState::default());

        let hud = HUDService::new(player_reader, boss_reader, qualia_reader).unwrap();

        let html = hud.render_combo();
        assert!(html.contains("42x"), "Combo should display 42x");
        assert!(html.contains("combo-great"), "Combo >= 20 should use 'great' class");
    }

    #[test]
    fn test_render_qualia_bar_high_intensity() {
        let (player_reader, _) = create_signal(PlayerState::default());
        let (boss_reader, _) = create_signal(BossState::default());
        let (qualia_reader, _) = create_signal(QualiaState {
            intensity: 0.9,
            ..Default::default()
        });

        let hud = HUDService::new(player_reader, boss_reader, qualia_reader).unwrap();

        let html = hud.render_qualia_bar();
        assert!(html.contains("90.0%"), "Intensity should be 90%");
        assert!(html.contains("#ff0066"), "High intensity should use red-pink");
    }

    #[test]
    fn test_get_combo() {
        let (player_reader, _) = create_signal(PlayerState {
            combo: 15,
            ..Default::default()
        });
        let (boss_reader, _) = create_signal(BossState::default());
        let (qualia_reader, _) = create_signal(QualiaState::default());

        let hud = HUDService::new(player_reader, boss_reader, qualia_reader).unwrap();

        assert_eq!(hud.get_combo(), 15);
    }

    #[test]
    fn test_hp_percent_calculations() {
        let (player_reader, _) = create_signal(PlayerState {
            health: 50.0,
            max_health: 200.0,
            ..Default::default()
        });
        let (boss_reader, _) = create_signal(BossState {
            health: 250.0,
            max_health: 1000.0,
            ..Default::default()
        });
        let (qualia_reader, _) = create_signal(QualiaState::default());

        let hud = HUDService::new(player_reader, boss_reader, qualia_reader).unwrap();

        assert_eq!(hud.get_player_hp_percent(), 25.0);
        assert_eq!(hud.get_boss_hp_percent(), 25.0);
    }
}
