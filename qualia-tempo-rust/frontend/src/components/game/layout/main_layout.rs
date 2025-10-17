//! # Responsibility
//! Root application layout component.
//!
//! ---
//!
//! Leptos component that provides the root layout structure for the entire application.
//! Manages routing between menu and game states, and global atmosphere effects.

use leptos::*;
use crate::components::game::core::QualiaTempoGame;

/// # Responsibility
/// Root layout component managing application-wide structure.
///
/// # Props
/// - `current_screen`: Current screen state (Menu, Game, Settings)
#[component]
pub fn MainLayout(
    #[prop(default = ScreenState::Menu)] current_screen: ReadSignal<ScreenState>,
) -> impl IntoView {
    let screen_content = move || match current_screen.get() {
        ScreenState::Menu => render_menu(),
        ScreenState::Game(song_id) => render_game(song_id),
        ScreenState::Settings => render_settings(),
    };

    view! {
        <div class="main-layout">
            // Global atmosphere effects (always active)
            <div class="global-atmosphere"></div>
            
            // Screen content
            <div class="screen-content">
                {screen_content}
            </div>
        </div>
    }
}

/// # Responsibility
/// Renders main menu screen.
fn render_menu() -> impl IntoView {
    view! {
        <div class="menu-screen">
            <div class="menu-title">"QUALIA TEMPO"</div>
            <div class="menu-subtitle">"A Charlie Hellsinger Story"</div>
            <div class="menu-buttons">
                <button class="menu-button">"NEW GAME"</button>
                <button class="menu-button">"LEADERBOARD"</button>
                <button class="menu-button">"SETTINGS"</button>
            </div>
        </div>
    }
}

/// # Responsibility
/// Renders game screen with specified song.
fn render_game(song_id: String) -> impl IntoView {
    view! {
        <QualiaTempoGame song_id=song_id />
    }
}

/// # Responsibility
/// Renders settings screen.
fn render_settings() -> impl IntoView {
    view! {
        <div class="settings-screen">
            <div class="settings-title">"SETTINGS"</div>
            // TODO: Audio settings
            // TODO: Graphics settings
            // TODO: Accessibility settings
        </div>
    }
}

/// # Responsibility
/// Enumerates application screen states.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ScreenState {
    /// Main menu
    Menu,
    /// Active game with song ID
    Game(String),
    /// Settings menu
    Settings,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_screen_state_menu() {
        let state = ScreenState::Menu;
        assert_eq!(state, ScreenState::Menu);
    }

    #[test]
    fn test_screen_state_game() {
        let state = ScreenState::Game("song_001".to_string());
        assert_eq!(state, ScreenState::Game("song_001".to_string()));
    }

    #[test]
    fn test_screen_state_settings() {
        let state = ScreenState::Settings;
        assert_eq!(state, ScreenState::Settings);
    }

    #[test]
    fn test_screen_state_inequality() {
        assert_ne!(ScreenState::Menu, ScreenState::Settings);
        assert_ne!(ScreenState::Menu, ScreenState::Game("test".to_string()));
    }
}
