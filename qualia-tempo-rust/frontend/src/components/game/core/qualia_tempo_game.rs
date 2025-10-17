//! # Responsibility
//! Main game orchestrator component - top-level game container.
//!
//! ---
//!
//! Leptos component that orchestrates the entire game experience.
//! Manages game state, event flow, and coordinates all child components.

use leptos::*;
use crate::components::game::hud::*;

/// # Responsibility
/// Orchestrates the complete Qualia Tempo game experience.
///
/// # Props
/// - `song_id`: ID of the song/boss to load
/// - `on_game_end`: Callback when game ends (score, time, qualia history)
#[component]
pub fn QualiaTempoGame(
    song_id: String,
    #[prop(optional)] on_game_end: Option<Box<dyn Fn(GameEndData)>>,
) -> impl IntoView {
    // Game state signals
    let (game_phase, set_game_phase) = create_signal(GamePhase::Loading);
    let (qualia_state, set_qualia_state) = create_signal(QualiaState::default());
    let (player_state, set_player_state) = create_signal(PlayerState::default());
    let (boss_state, set_boss_state) = create_signal(BossState::default());
    let (score, set_score) = create_signal(0u64);
    let (combo, set_combo) = create_signal(0u32);
    let (max_combo, set_max_combo) = create_signal(0u32);
    let (multiplier, set_multiplier) = create_signal(1.0f32);
    let (elapsed_time, set_elapsed_time) = create_signal(0.0f64);
    let (current_phase, set_current_phase) = create_signal(0u8);
    let (total_phases, set_total_phases) = create_signal(4u8);
    let (pattern_type, set_pattern_type) = create_signal(PatternType::Wave);
    let (time_until_pattern, set_time_until_pattern) = create_signal(5.0f32);
    let (pattern_difficulty, set_pattern_difficulty) = create_signal(0.5f32);

    // Initialize game on mount
    create_effect(move |_| {
        if game_phase.get() == GamePhase::Loading {
            // TODO: Initialize WebSocket connection
            // TODO: Load song data
            // TODO: Initialize audio system
            set_game_phase.set(GamePhase::Ready);
        }
    });

    // Game loop effect
    create_effect(move |_| {
        if game_phase.get() == GamePhase::Playing {
            // TODO: Request animation frame
            // TODO: Update elapsed time
            // TODO: Process input
            // TODO: Update game state
        }
    });

    // Render based on game phase
    let game_content = move || match game_phase.get() {
        GamePhase::Loading => render_loading(),
        GamePhase::Ready => render_ready(set_game_phase),
        GamePhase::Playing => render_playing(
            qualia_state,
            player_state,
            boss_state,
            score,
            combo,
            max_combo,
            multiplier,
            elapsed_time,
            current_phase,
            total_phases,
            pattern_type,
            time_until_pattern,
            pattern_difficulty,
        ),
        GamePhase::Paused => render_paused(set_game_phase),
        GamePhase::GameOver => render_game_over(score, elapsed_time, max_combo),
    };

    view! {
        <div class="qualia-tempo-game-container">
            {game_content}
        </div>
    }
}

/// # Responsibility
/// Renders loading screen.
fn render_loading() -> impl IntoView {
    view! {
        <div class="game-loading">
            <div class="loading-spinner"></div>
            <div class="loading-text">"Loading..."</div>
        </div>
    }
}

/// # Responsibility
/// Renders ready screen with start button.
fn render_ready(set_game_phase: WriteSignal<GamePhase>) -> impl IntoView {
    let start_game = move |_| {
        set_game_phase.set(GamePhase::Playing);
    };

    view! {
        <div class="game-ready">
            <div class="ready-title">"QUALIA TEMPO"</div>
            <button class="start-button" on:click=start_game>
                "START"
            </button>
        </div>
    }
}

/// # Responsibility
/// Renders active gameplay with all HUD elements.
#[allow(clippy::too_many_arguments)]
fn render_playing(
    qualia_state: ReadSignal<QualiaState>,
    player_state: ReadSignal<PlayerState>,
    boss_state: ReadSignal<BossState>,
    score: ReadSignal<u64>,
    combo: ReadSignal<u32>,
    max_combo: ReadSignal<u32>,
    multiplier: ReadSignal<f32>,
    elapsed_time: ReadSignal<f64>,
    current_phase: ReadSignal<u8>,
    total_phases: ReadSignal<u8>,
    pattern_type: ReadSignal<PatternType>,
    time_until_pattern: ReadSignal<f32>,
    pattern_difficulty: ReadSignal<f32>,
) -> impl IntoView {
    let player_health = create_memo(move |_| player_state.get().health);
    let player_max_health = create_signal(100.0).0;
    let boss_health = create_memo(move |_| boss_state.get().health);
    let boss_max_health = create_signal(100.0).0;

    let intensity = create_memo(move |_| qualia_state.get().intensity);
    let harmony = create_memo(move |_| qualia_state.get().harmony);
    let chaos = create_memo(move |_| qualia_state.get().chaos);
    let kairos = create_memo(move |_| qualia_state.get().kairos);
    let transcendence = create_memo(move |_| qualia_state.get().transcendence);

    view! {
        <div class="game-playing">
            // 3D Game Field (Canvas/WebGL)
            <canvas class="game-canvas" width="1920" height="1080"></canvas>

            // HUD Overlay
            <div class="game-hud">
                // Top-left: Score & Combo
                <div class="hud-top-left">
                    <ScoreDisplay score=score combo=combo multiplier=multiplier show_combo=true />
                    <ComboStreak combo=combo max_combo=max_combo />
                </div>

                // Top-center: Boss Phase
                <div class="hud-top-center">
                    <BossPhaseIndicator current_phase=current_phase total_phases=total_phases />
                </div>

                // Top-right: Time & Pattern Preview
                <div class="hud-top-right">
                    <TimeDisplay elapsed_seconds=elapsed_time mode=TimeDisplayMode::Elapsed />
                    <PatternPreview 
                        pattern_type=pattern_type 
                        time_until_pattern=time_until_pattern 
                        difficulty=pattern_difficulty 
                    />
                </div>

                // Middle-left: Qualia Orb
                <div class="hud-middle-left">
                    <QualiaOrb state=qualia_state size=200 />
                </div>

                // Middle-right: Intensity & Kairos
                <div class="hud-middle-right">
                    <IntensityIndicator intensity=intensity style=IntensityStyle::Bars />
                    <KairosMeter kairos=kairos orientation=KairosOrientation::Vertical />
                </div>

                // Bottom-center: Health Bars & Transcendence
                <div class="hud-bottom-center">
                    <HealthVisualization 
                        player_health=player_health 
                        player_max_health=player_max_health 
                        boss_health=boss_health 
                        boss_max_health=boss_max_health 
                    />
                    <TranscendenceGauge transcendence=transcendence />
                </div>
            </div>
        </div>
    }
}

/// # Responsibility
/// Renders paused screen.
fn render_paused(set_game_phase: WriteSignal<GamePhase>) -> impl IntoView {
    let resume = move |_| {
        set_game_phase.set(GamePhase::Playing);
    };

    view! {
        <div class="game-paused">
            <div class="paused-title">"PAUSED"</div>
            <button class="resume-button" on:click=resume>
                "RESUME"
            </button>
        </div>
    }
}

/// # Responsibility
/// Renders game over screen with final stats.
fn render_game_over(
    score: ReadSignal<u64>,
    elapsed_time: ReadSignal<f64>,
    max_combo: ReadSignal<u32>,
) -> impl IntoView {
    let final_score = score.get();
    let final_time = elapsed_time.get();
    let final_combo = max_combo.get();

    view! {
        <div class="game-over">
            <div class="game-over-title">"GAME OVER"</div>
            <div class="final-stats">
                <div class="stat-row">
                    <span class="stat-label">"Score:"</span>
                    <span class="stat-value">{final_score}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">"Time:"</span>
                    <span class="stat-value">{format!("{:.1}s", final_time)}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">"Max Combo:"</span>
                    <span class="stat-value">{final_combo}</span>
                </div>
            </div>
        </div>
    }
}

/// # Responsibility
/// Enumerates game phase states.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GamePhase {
    /// Loading assets
    Loading,
    /// Ready to start
    Ready,
    /// Active gameplay
    Playing,
    /// Game paused
    Paused,
    /// Game ended
    GameOver,
}

/// # Responsibility
/// Represents player entity state.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct PlayerState {
    pub health: f32,
    pub position_x: f32,
    pub position_y: f32,
    pub is_dashing: bool,
}

impl Default for PlayerState {
    fn default() -> Self {
        Self {
            health: 100.0,
            position_x: 0.0,
            position_y: 0.0,
            is_dashing: false,
        }
    }
}

/// # Responsibility
/// Represents boss entity state.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct BossState {
    pub health: f32,
    pub position_x: f32,
    pub position_y: f32,
    pub current_phase: u8,
}

impl Default for BossState {
    fn default() -> Self {
        Self {
            health: 100.0,
            position_x: 0.0,
            position_y: 0.0,
            current_phase: 0,
        }
    }
}

/// # Responsibility
/// Represents qualia state (player mastery).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct QualiaState {
    pub intensity: f32,
    pub harmony: f32,
    pub chaos: f32,
    pub kairos: f32,
    pub transcendence: f32,
}

impl Default for QualiaState {
    fn default() -> Self {
        Self {
            intensity: 0.5,
            harmony: 0.5,
            chaos: 0.5,
            kairos: 0.5,
            transcendence: 0.0,
        }
    }
}

/// # Responsibility
/// Data passed to callback when game ends.
#[derive(Debug, Clone)]
pub struct GameEndData {
    pub final_score: u64,
    pub elapsed_time: f64,
    pub max_combo: u32,
    pub qualia_history: Vec<QualiaState>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_player_state_default() {
        let state = PlayerState::default();
        assert_eq!(state.health, 100.0);
        assert_eq!(state.position_x, 0.0);
        assert_eq!(state.position_y, 0.0);
        assert_eq!(state.is_dashing, false);
    }

    #[test]
    fn test_boss_state_default() {
        let state = BossState::default();
        assert_eq!(state.health, 100.0);
        assert_eq!(state.current_phase, 0);
    }

    #[test]
    fn test_qualia_state_default() {
        let state = QualiaState::default();
        assert_eq!(state.intensity, 0.5);
        assert_eq!(state.harmony, 0.5);
        assert_eq!(state.chaos, 0.5);
        assert_eq!(state.kairos, 0.5);
        assert_eq!(state.transcendence, 0.0);
    }

    #[test]
    fn test_game_phase_equality() {
        assert_eq!(GamePhase::Loading, GamePhase::Loading);
        assert_ne!(GamePhase::Loading, GamePhase::Playing);
    }
}
