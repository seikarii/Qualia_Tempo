# 🔥 AUDIO-FORGE ARCHITECTURAL REMEDIATION PLAN v3.0 🔥
**GENERATED**: 2025-10-22 22:30 UTC (COMPREHENSIVE CODEBASE AUDIT)  
**STATUS**: CRITICAL - Immediate execution required  
**COMPLIANCE**: QUALIA.CODE.RUST v1.1  
**AUDIT SOURCES**: 
- Complete codebase scan (src/**, tests/**, Cargo.toml)
- QUALIA.CODE.RUST.md architectural mandates
- egui docs.rs (testing, layout best practices)
- tokio::sync::broadcast documentation

---

## 📊 EXECUTIVE SUMMARY

**BUILD STATUS**: ✅ Compiles clean (3.15s, 0 warnings)  
**TEST STATUS**: ✅ 95 integration tests passing  
**FUNCTIONALITY**: ✅ Backend services fully operational  
**ARCHITECTURE**: ❌ **10 CRITICAL QUALIA.CODE VIOLATIONS**  
**UX/UI**: ❌ **CATASTROPHIC** (InfoPanel useless, controls scattered)  
**HAPPY PATH TESTING**: ❌ **ZERO UI WORKFLOW COVERAGE**  
**DEPENDENCY HYGIENE**: ❌ 3 redundant/deprecated deps  
**MOCKING COMPLIANCE**: ❌ ZERO mockall usage (violates Section 9.3)  
**EVENTBUS COMPLIANCE**: ❌ MISSING (violates Section 4)  

**CODE QUALITY**: **D** (Production-quality backend trapped in junior architecture)

**VERDICT**: You are 100% correct - "CODIGO DE MIERDA" applies to architecture, not services. Backend is solid (FFT, effects, playback work). UI is unusable (InfoPanel wasting center screen). Architecture violates QUALIA.CODE on 7 fronts:
1. Service Locator anti-pattern (main.rs)
2. Missing EventBus (no tokio::sync::broadcast)
3. No mockall mocks (all tests use real services)
4. MainWindow God Object (8 responsibilities)
5. Post-construction config injection
6. InfoPanel wasting center with static text
7. Happy path untestable (egui limitation + wrong test layer)

User complaint "NO PUEDE HACER NI EL HAPPY PATH" is valid - tests validate backend, not UI workflow.

---

## 🎯 VIOLATIONS DETECTED (PRIORITIZED BY IMPACT)

### P0 - BLOCKING ISSUES (Prevent proper usage/maintenance)

#### VIOLATION 1: UI LAYOUT CATASTROPHE
**FILE**: `src/ui/main_window.rs` (lines 336-362)  
**SEVERITY**: P0 (Blocks usability)  
**QUALIA.CODE MANDATE**: "Functional UI, not scattered panels"

**CURRENT LAYOUT**:
```
┌─────────────────────────────────────┐
│ TOP: [Load] [Play] [Pause] [Export] │ ← Good (controls unified)
│      Progress: [======|=====] 2:30   │
├──────────────┬──────────────────────┤
│ LEFT:        │ CENTER: InfoPanel    │ ← WASTED CENTER SPACE
│ Waveform     │ "🎵 Features list"   │ ← Static useless text
│ (sidebar)    │ "✅ Live FFT"        │
│              │ Channel config       │
│              │ 8.1 status           │
├──────────────┼──────────────────────┤
│ RIGHT:       │ BOTTOM: Effects      │
│ Spectrum     │ [8D] [Drop] [Bass]   │
│ (sidebar)    │                      │
└──────────────┴──────────────────────┘
```

**PROBLEM ANALYSIS**:
1. **InfoPanel (CENTER)** contains:
   - Lines 69-77: Static hardcoded feature list (NO dynamic data)
   - Lines 81-116: Channel config (belongs in ControlPanel)
   - Lines 147-157: Redundant help text
   - **ONLY USEFUL CONTENT**: Channel mode switching (lines 122-138)

2. **Waveform + Spectrum as SIDEBARS** instead of primary visualizations

3. **User expectation**: Audio visualizer → waveform/spectrum CENTER

**IMPACT**:
- Violates standard audio player UX (Audacity, FL Studio, Ableton - all show waveform centered)
- Wastes prime screen real estate on static text
- Useful visualizations relegated to sidebars

**QUALIA.CODE REFERENCE**: Section 13 (UI must be functional, not decorative)

---

#### VIOLATION 2: MAIN.RS SERVICE LOCATOR ANTI-PATTERN
**FILE**: `src/main.rs` (lines 36-52)  
**SEVERITY**: P0 (Architecture)  
**QUALIA.CODE VIOLATION**: Section 2.3 - "Direct instantiation with new() is a CRITICAL VIOLATION"

**ANTI-PATTERN CODE**:
```rust
// FORBIDDEN: Service Locator in main()
let audio_player: Arc<dyn IAudioPlayer> = module.resolve();
let audio_analyzer: Arc<dyn IAudioAnalyzer> = module.resolve();
let visualization_engine: Arc<dyn IVisualizationEngine> = module.resolve();
let audio_effects: Arc<dyn IAudioEffects> = module.resolve();
let audio_exporter: Arc<dyn IAudioExporter> = module.resolve();
let multi_channel_output: Arc<dyn IMultiChannelOutput> = module.resolve();

// FORBIDDEN: Post-construction configuration
audio_effects.set_config(config.effects.clone());
audio_player.set_volume(config.audio.default_volume)?;

// FORBIDDEN: Manual constructor with 7 parameters
let mut main_window = MainWindow::new_with_config(
    config, audio_player, audio_analyzer, 
    visualization_engine, audio_effects, 
    audio_exporter, multi_channel_output,
);
```

**VIOLATIONS**:
1. **Service Locator**: 6 manual `resolve()` calls (should be 1)
2. **Post-construction config**: `set_config()` called AFTER construction
3. **Manual injection**: `new_with_config()` instead of Shaku DI

**QUALIA.CODE MANDATE** (Section 2.2):
> "Configuration is loaded ONCE at startup and injected as immutable references. Direct configuration injection eliminates the Service Locator anti-pattern."

**IMPACT**:
- Tight coupling (main knows about all services)
- Cannot replace MainWindow without rewriting main
- Config changes require post-construction calls (impure)
- Testing requires full module initialization

---

#### VIOLATION 3: MAINWINDOW GOD OBJECT
**FILE**: `src/ui/main_window.rs` (545 lines)  
**SEVERITY**: P0 (SRP Violation)  
**QUALIA.CODE VIOLATION**: Section 9 - "A class should have ONE reason to change"

**RESPONSIBILITIES DETECTED** (should be 1, found 8):
1. **File loading coordination** (lines 221-247)
2. **Playback state management** (via control_panel)
3. **Visualization data caching** (lines 186-218)
4. **Effect config propagation** (lines 336-339)
5. **Drag-and-drop handling** (lines 255-297)
6. **Panel orchestration** (lines 336-362)
7. **Config persistence** (lines 155-171, Drop trait)
8. **Error message display** (via state mutex)

**METRICS**:
- **Lines**: 545 (should be <300)
- **Public methods**: 7
- **Private methods**: 4
- **Dependencies**: 6 Arc<dyn Trait> + 5 widgets + state
- **Cyclomatic complexity**: High (nested conditionals, async tasks)

**QUALIA.CODE MANDATE**: "Each component should have ONE architectural role"

**IMPACT**:
- Impossible to test in isolation (God Object has too many concerns)
- Changes to visualization affect file loading
- Violates Open/Closed Principle

---

#### VIOLATION 4: HAPPY PATH TESTING GAP
**FILES**: `tests/e2e_tests.rs`, `tests/integration_tests.rs`  
**SEVERITY**: P0 (Quality Assurance)  
**USER COMPLAINT**: "NO PUEDE HACER NI EL HAPPY PATH"

**TESTS FOUND** (95 passing):
```rust
// ✅ Service layer fully covered:
test_e2e_complete_audio_pipeline()     // FFT → 8D → 8.1 upmix
test_e2e_real_wav_file_loading()       // Load WAV, validate duration
test_e2e_real_mp3_playback()           // Load MP3, play, pause
test_brutal_e2e_drag_and_drop_logic()  // Magic number validation
test_brutal_e2e_panic_recovery()       // Crash handling

// ❌ UI workflow NOT covered:
// - Drag file to window → verify UI updates
// - Click Play button → verify playback starts
// - Drag seek bar → verify position changes
// - Click effects checkbox → verify audio changes
```

**PROBLEM**: Tests validate SERVICE LAYER (audio_player.play()), not UI WORKFLOW (user clicks Play button)

**EGUI LIMITATION** (from webfetch):
> "egui has no headless mode. Cannot simulate button clicks programmatically without exact pixel coordinates (brittle)."

**USER IS CORRECT**: Happy path (drag file → UI loads → click play → seek → pause) is UNTESTABLE with current approach.

**SOLUTIONS AVAILABLE**:
1. **State-based integration tests** (test services that buttons call)
2. **Manual validation checklist** (for visual UI regressions)

**QUALIA.CODE REFERENCE**: Section 9.6 - "Useful tests vs useless tests"

---

### P1 - HIGH PRIORITY (Architectural debt)

#### VIOLATION 5: EVENTBUS MISSING
**EVIDENCE**: `grep -r "broadcast|EventBus" src/` → **0 MATCHES**  
**SEVERITY**: P1 (Architecture)  
**QUALIA.CODE VIOLATION**: Section 4 - "Use tokio::sync::broadcast for EventBus"

**CURRENT STATE**: Direct service calls everywhere
```rust
// MainWindow directly calls services (tight coupling)
self.audio_player.play()?;
self.audio_effects.set_config(config);
self.audio_exporter.export_wav(path, samples, sr)?;
```

**QUALIA.CODE MANDATE** (Section 4.1):
> "CRITICAL MANDATE: Use tokio::sync::broadcast for the EventBus. Manual implementations with Arc<RwLock<HashMap<...>>> are STRICTLY FORBIDDEN."

**BENEFITS OF EVENTBUS**:
- Decouple UI from services
- Enable undo/redo (event sourcing)
- Add logging/analytics without touching code
- Support multiple subscribers (e.g., visualizer + recorder)

**REQUIRED EVENTS**:
```rust
#[derive(Clone, Debug)]
pub enum AudioForgeEvent {
    FileLoaded { path: PathBuf, duration: Duration },
    PlaybackStateChanged { is_playing: bool },
    EffectsConfigUpdated { config: EffectConfig },
    VisualizationDataReady { waveform: Vec<f32>, spectrum: FrequencySpectrum },
}
```

---

#### VIOLATION 6: DEPENDENCY INJECTION INCOMPLETE
**FILES**: `src/main.rs`, `src/ui/main_window.rs`  
**SEVERITY**: P1 (Architecture)  
**QUALIA.CODE VIOLATION**: Section 2 - "All service instantiation MUST go through Shaku modules"

**CURRENT STATE**: MainWindow constructed manually, not via Shaku

**SHOULD BE**:
```rust
// MainWindow as Shaku Component
#[derive(Component)]
#[shaku(interface = IMainWindow)]
pub struct MainWindow {
    #[shaku(inject)]
    services: Arc<ApplicationServices>, // Aggregate pattern
}

// main.rs simplified
let main_window: Arc<MainWindow> = module.resolve();
```

**IMPACT**:
- Cannot swap MainWindow implementations
- Cannot test MainWindow with mocked services via DI
- Config injection happens post-construction (impure)

---

#### VIOLATION 7: CONFIGURATION INJECTION VIOLATION
**FILE**: `src/main.rs` (lines 43-47)  
**SEVERITY**: P1 (Architecture)  
**QUALIA.CODE VIOLATION**: Section 2.2 - "Configuration is injected at CONSTRUCTION TIME"

**ANTI-PATTERN**:
```rust
// Step 1: Construct service
let audio_effects: Arc<dyn IAudioEffects> = module.resolve();

// Step 2: Configure AFTER construction (VIOLATION)
audio_effects.set_config(config.effects.clone());
```

**SHOULD BE**:
```rust
// Config as Shaku provider
#[derive(Provider)]
#[shaku(interface = AppConfig)]
pub struct AppConfigProvider;

// Service receives config in constructor
#[derive(Component)]
pub struct AudioEffectsService {
    #[shaku(inject)]
    config: Arc<AppConfig>,  // Immutable, shared
}
```

---

### P2 - MEDIUM PRIORITY (Code quality)

#### VIOLATION 8: REDUNDANT DEPENDENCIES
**FILE**: `Cargo.toml` (lines 10, 15, 24)  
**SEVERITY**: P2 (Maintenance burden)  

**REDUNDANCIES DETECTED**:
```toml
cpal = "0.16.0"           # ← Redundant (rodio wraps cpal)
lazy_static = "1.5.0"     # ← DEPRECATED (use std::sync::OnceLock)
symphonia = "0.5.5"       # ← Redundant (rodio includes symphonia-all)
```

**IMPACT**:
- Bloated dependency tree
- Version conflict risks
- Maintenance burden (3 audio libs instead of 1)

**FIX**: Remove `cpal`, `symphonia`, replace `lazy_static` with `OnceLock`

---

#### VIOLATION 9: MISSING # Responsibility HEADERS
**FILES**: Multiple service files  
**SEVERITY**: P2 (Documentation)  
**QUALIA.CODE VIOLATION**: Section 13 - "Every major component MUST begin with # Responsibility header"

**VIOLATIONS FOUND**:
- ✅ Most files comply (e.g., audio_player.rs has header)
- ❌ MainWindowState struct missing header (main_window.rs line 28)
- ❌ Some widget methods lack headers (visual_panels.rs)

**QUALIA.CODE MANDATE**:
```rust
/// # Responsibility
/// [Single-sentence architectural role]
///
/// ---
///
/// [Detailed technical docs]
```

---

#### VIOLATION 10: ZERO mockall USAGE
**EVIDENCE**: `grep -r "mockall|mock!" tests/` → **0 MATCHES**  
**SEVERITY**: P2 (Testing)  
**QUALIA.CODE VIOLATION**: Section 9.3 - "All service mocks MUST use mockall crate"

**CURRENT STATE**: All tests use real services via DI
```rust
// tests/e2e_tests.rs - NO MOCKS
let module = AudioForgeModule::builder().build();
let player: Arc<dyn IAudioPlayer> = module.resolve(); // REAL service
```

**PROBLEM**: No isolated unit tests. Every test initializes full module (heavy).

**SHOULD BE**:
```rust
// Unit test with mockall
let mut mock_player = MockIAudioPlayer::new();
mock_player.expect_play()
    .times(1)
    .returning(|| Ok(()));

let service = GameLogicService {
    player: Arc::new(mock_player),
};
```

**IMPACT**:
- No isolated unit tests
- Slow test execution (full module per test)
- Cannot test edge cases with controlled mocks

---

## 🔧 REMEDIATION ROADMAP (5 PHASES)

### Phase 1: UI REDESIGN (3 days) - P0 CRITICAL USER-FACING MODERNIZATION

**Goal**: Transform Windows 95-era UI into 2025 modern music player (Spotify/Apple Music/YouTube Music standard)

**MODERN MUSIC PLAYER LAYOUT REFERENCE (2025)**:
```
┌─────────────────────────────────────────────────┐
│ MAIN AREA (CentralPanel) - Clean, spacious     │
│ ┌─────────────────────────────────────────────┐ │
│ │ 🎵 HERO WAVEFORM CARD (300px height)       │ │ ← Large focal point
│ │ Full-width, gradient overlay, rounded      │ │
│ │ Auto-scroll as playback progresses         │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ Multi-Band Spectrum Grid (6-12 animated bars): │
│ ┌────┬────┬────┬────┬────┬────┬────┬────┐      │
│ │ EQ │ EQ │ EQ │ EQ │ EQ │ EQ │ EQ │ EQ │      │ ← Smooth height animation
│ │ Bar│ Bar│ Bar│ Bar│ Bar│ Bar│ Bar│ Bar│      │
│ │ ▓▓ │ ▓▓ │ ▓▓ │ ▓▓ │ ▓▓ │ ▓▓ │ ▓▓ │ ▓▓ │      │
│ │ ▓▓ │ ▓▓ │ ▓▓ │ ▓▓ │ ▓▓ │ ▓▓ │ ▓▓ │ ▓▓ │      │
│ └────┴────┴────┴────┴────┴────┴────┴────┘      │
│                                                 │
│ [Optional: Collapsible SidePanel for Effects]  │
├─────────────────────────────────────────────────┤
│ BOTTOM PLAYBACK BAR (sticky, glassmorphism)    │ ← CRITICAL: Bottom not top!
│ 🎵 [Album Art] Title - Artist                  │
│ [◀] [⏸] [▶]  ━━━━━━━━●──────── 2:30/4:50      │
│ Volume: ▓▓▓▓▓▓▓░░░ [8.1] [Effects] [Export]    │
└─────────────────────────────────────────────────┘
```

**TASKS**:

#### Task 1: **DELETE InfoPanel** (Keep from original plan)
```bash
rm src/ui/widgets/info_panel.rs
# Remove from MainWindow imports and instantiation
```

#### Task 2: **THEME MODERNIZATION** (New neon color palette + gradients)

**FILE**: `src/ui/theme.rs`

Add modern 2025 colors:
```rust
// === NEON ACCENT COLORS (2025 Modern) ===
pub const NEON_BLUE: Color32 = Color32::from_rgb(0, 168, 255);        // Electric blue
pub const ELECTRIC_PURPLE: Color32 = Color32::from_rgb(138, 43, 226); // Vibrant purple
pub const HOT_PINK: Color32 = Color32::from_rgb(255, 20, 147);        // Hot pink
pub const LIME_GREEN: Color32 = Color32::from_rgb(50, 255, 100);      // Active state

// === GRADIENT SIMULATION (egui doesn't support native gradients) ===
pub const GRADIENT_PRIMARY_START: Color32 = NEON_BLUE;
pub const GRADIENT_PRIMARY_END: Color32 = ELECTRIC_PURPLE;
pub const GRADIENT_ACCENT_START: Color32 = Color32::from_rgb(64, 224, 208); // Turquoise
pub const GRADIENT_ACCENT_END: Color32 = NEON_BLUE;

// === SHADOWS (Multi-layer depth effect) ===
pub const SHADOW_CARD_SOFT: Shadow = Shadow {
    offset: egui::vec2(0.0, 4.0),
    blur: 8.0,
    spread: 0.0,
    color: Color32::from_black_alpha(40),
};

pub const SHADOW_CARD_ELEVATED: Shadow = Shadow {
    offset: egui::vec2(0.0, 12.0),
    blur: 24.0,
    spread: -4.0,
    color: Color32::from_black_alpha(60),
};

// === SPACING (Modern breathing room) ===
pub const SPACING_CARD_PADDING: f32 = 20.0;    // Inner card padding
pub const SPACING_PANEL_MARGIN: f32 = 16.0;    // Between panels
pub const SPACING_ITEM_GAP: f32 = 12.0;        // Between UI elements

// === HELPER: Simulate vertical gradient with overlapping rects ===
pub fn fake_gradient_vertical(
    ui: &mut egui::Ui,
    rect: egui::Rect,
    top_color: Color32,
    bottom_color: Color32,
    steps: usize,
) {
    let height_per_step = rect.height() / steps as f32;
    for i in 0..steps {
        let t = i as f32 / (steps - 1) as f32;
        let color = lerp_color(top_color, bottom_color, t);
        let step_rect = egui::Rect::from_min_size(
            egui::pos2(rect.min.x, rect.min.y + i as f32 * height_per_step),
            egui::vec2(rect.width(), height_per_step),
        );
        ui.painter().rect_filled(step_rect, 0.0, color);
    }
}

fn lerp_color(a: Color32, b: Color32, t: f32) -> Color32 {
    Color32::from_rgba_premultiplied(
        (a.r() as f32 + (b.r() as f32 - a.r() as f32) * t) as u8,
        (a.g() as f32 + (b.g() as f32 - a.g() as f32) * t) as u8,
        (a.b() as f32 + (b.b() as f32 - a.b() as f32) * t) as u8,
        (a.a() as f32 + (b.a() as f32 - a.a() as f32) * t) as u8,
    )
}
```

Update `apply()` method:
```rust
// Increase spacing for modern feel
style.spacing.item_spacing = egui::vec2(SPACING_ITEM_GAP, 8.0);
style.spacing.button_padding = egui::vec2(16.0, 8.0);
style.spacing.window_margin = egui::Margin::same(SPACING_PANEL_MARGIN);

// Rounded corners (modern aesthetic)
visuals.widgets.noninteractive.rounding = egui::Rounding::same(8.0);
visuals.widgets.inactive.rounding = egui::Rounding::same(8.0);
visuals.widgets.hovered.rounding = egui::Rounding::same(8.0);
visuals.widgets.active.rounding = egui::Rounding::same(8.0);

// Enhanced shadows
visuals.window_shadow = SHADOW_CARD_ELEVATED;
visuals.popup_shadow = SHADOW_CARD_SOFT;
```

#### Task 3: **CREATE HeroWaveformCard Component**

**FILE**: `src/ui/widgets/hero_waveform_card.rs`

```rust
//! # Responsibility
//! Large hero waveform visualization with gradient overlay and auto-scroll.
//!
//! ---
//!
//! Modern music player focal point - displays waveform in full-width card
//! with animated playback position indicator.

use crate::ui::theme::QualiaTheme;
use egui::{self, Color32, Pos2, Rect, Stroke, Vec2};

pub struct HeroWaveformCard {
    waveform_data: Vec<f32>,
    playback_position: f32, // 0.0 to 1.0
}

impl HeroWaveformCard {
    pub fn new() -> Self {
        Self {
            waveform_data: Vec::new(),
            playback_position: 0.0,
        }
    }
    
    pub fn update(&mut self, waveform: Vec<f32>, position: f32) {
        self.waveform_data = waveform;
        self.playback_position = position.clamp(0.0, 1.0);
    }
    
    pub fn render(&self, ui: &mut egui::Ui) {
        let card_height = 300.0;
        let available_width = ui.available_width();
        
        let (rect, _) = ui.allocate_exact_size(
            Vec2::new(available_width, card_height),
            egui::Sense::hover(),
        );
        
        // Draw gradient background (simulated)
        QualiaTheme::fake_gradient_vertical(
            ui,
            rect,
            QualiaTheme::GRADIENT_PRIMARY_START,
            QualiaTheme::GRADIENT_PRIMARY_END,
            10, // 10 steps for smooth gradient
        );
        
        // Draw waveform
        if !self.waveform_data.is_empty() {
            self.draw_waveform(ui, rect);
        } else {
            // Placeholder text
            ui.painter().text(
                rect.center(),
                egui::Align2::CENTER_CENTER,
                "🎵 Load an audio file to see waveform",
                egui::FontId::proportional(20.0),
                QualiaTheme::TEXT_PRIMARY,
            );
        }
        
        // Draw playback position indicator
        if self.playback_position > 0.0 {
            let x = rect.min.x + rect.width() * self.playback_position;
            ui.painter().vline(
                x,
                rect.y_range(),
                Stroke::new(2.0, QualiaTheme::LIME_GREEN),
            );
        }
        
        // Add rounded border
        ui.painter().rect_stroke(
            rect,
            8.0,
            Stroke::new(1.0, QualiaTheme::BORDER_FOCUS),
        );
    }
    
    fn draw_waveform(&self, ui: &mut egui::Ui, rect: Rect) {
        let painter = ui.painter();
        let samples_to_display = 1000.min(self.waveform_data.len());
        let step = self.waveform_data.len() / samples_to_display;
        
        let mut points = Vec::new();
        for i in 0..samples_to_display {
            let sample_idx = i * step;
            let sample = self.waveform_data.get(sample_idx).copied().unwrap_or(0.0);
            
            let x = rect.min.x + (i as f32 / samples_to_display as f32) * rect.width();
            let y = rect.center().y - sample * rect.height() * 0.4;
            
            points.push(Pos2::new(x, y));
        }
        
        painter.add(egui::Shape::line(
            points,
            Stroke::new(2.0, QualiaTheme::ACCENT_PRIMARY),
        ));
    }
}
```

#### Task 4: **CREATE MultiBandSpectrumGrid Component**

**FILE**: `src/ui/widgets/multi_band_spectrum_grid.rs`

```rust
//! # Responsibility
//! Multi-band spectrum visualizer with 6-12 animated vertical bars.
//!
//! ---
//!
//! Modern equalizer-style visualization with smooth height interpolation.

use crate::ui::theme::QualiaTheme;
use egui::{self, Color32, Rect, Rounding, Vec2};

pub struct MultiBandSpectrumGrid {
    band_heights: Vec<f32>,      // Current heights (0.0 to 1.0)
    target_heights: Vec<f32>,    // Target heights (for smooth animation)
    num_bands: usize,
}

impl MultiBandSpectrumGrid {
    pub fn new(num_bands: usize) -> Self {
        Self {
            band_heights: vec![0.0; num_bands],
            target_heights: vec![0.0; num_bands],
            num_bands,
        }
    }
    
    pub fn update(&mut self, spectrum_magnitudes: &[f32]) {
        // Downsample spectrum to num_bands
        let step = spectrum_magnitudes.len() / self.num_bands;
        for i in 0..self.num_bands {
            let start = i * step;
            let end = ((i + 1) * step).min(spectrum_magnitudes.len());
            let avg = spectrum_magnitudes[start..end]
                .iter()
                .sum::<f32>() / (end - start) as f32;
            
            self.target_heights[i] = avg.clamp(0.0, 1.0);
        }
    }
    
    pub fn render(&mut self, ui: &mut egui::Ui) {
        // Smooth interpolation (lerp toward target)
        for i in 0..self.num_bands {
            self.band_heights[i] += (self.target_heights[i] - self.band_heights[i]) * 0.3;
        }
        
        let available_width = ui.available_width();
        let bar_width = (available_width / self.num_bands as f32) - 8.0;
        let max_height = 150.0;
        
        ui.horizontal(|ui| {
            ui.spacing_mut().item_spacing.x = 8.0;
            
            for height in &self.band_heights {
                let bar_height = height * max_height;
                let (rect, _) = ui.allocate_exact_size(
                    Vec2::new(bar_width, max_height),
                    egui::Sense::hover(),
                );
                
                // Draw bar from bottom up
                let bar_rect = Rect::from_min_size(
                    egui::pos2(rect.min.x, rect.max.y - bar_height),
                    Vec2::new(bar_width, bar_height),
                );
                
                // Gradient fill (simulated)
                let color_bottom = QualiaTheme::GRADIENT_ACCENT_START;
                let color_top = QualiaTheme::GRADIENT_ACCENT_END;
                QualiaTheme::fake_gradient_vertical(ui, bar_rect, color_top, color_bottom, 5);
                
                // Rounded top
                ui.painter().rect(
                    bar_rect,
                    Rounding::same(4.0),
                    Color32::TRANSPARENT,
                    egui::Stroke::new(1.0, QualiaTheme::BORDER_FOCUS),
                );
            }
        });
    }
}
```

#### Task 5: **CREATE ModernPlaybackBar Component (BOTTOM STICKY)**

**FILE**: `src/ui/widgets/modern_playback_bar.rs`

```rust
//! # Responsibility
//! Modern bottom-sticky playback control bar (Spotify-style).
//!
//! ---
//!
//! Contains: Play/Pause/Skip, seek slider, volume, track info, effects toggle.

use crate::ui::theme::QualiaTheme;
use egui::{self, Color32, RichText};
use std::time::Duration;

pub struct ModernPlaybackBar {
    is_playing: bool,
    current_position: Duration,
    total_duration: Duration,
    volume: f32,
    current_track: String,
}

impl ModernPlaybackBar {
    pub fn new() -> Self {
        Self {
            is_playing: false,
            current_position: Duration::ZERO,
            total_duration: Duration::ZERO,
            volume: 0.7,
            current_track: "No track loaded".to_string(),
        }
    }
    
    pub fn update(
        &mut self,
        is_playing: bool,
        position: Duration,
        duration: Duration,
        track: String,
    ) {
        self.is_playing = is_playing;
        self.current_position = position;
        self.total_duration = duration;
        self.current_track = track;
    }
    
    pub fn render(&mut self, ui: &mut egui::Ui) -> PlaybackBarResponse {
        let mut response = PlaybackBarResponse::default();
        
        ui.horizontal(|ui| {
            // Track info
            ui.label(
                RichText::new(&self.current_track)
                    .color(QualiaTheme::TEXT_PRIMARY)
                    .size(14.0),
            );
            
            ui.add_space(20.0);
            
            // Playback controls
            if ui.button("◀").clicked() {
                response.skip_backward = true;
            }
            
            let play_pause_icon = if self.is_playing { "⏸" } else { "▶" };
            if ui.button(play_pause_icon).clicked() {
                response.toggle_playback = true;
            }
            
            if ui.button("▶").clicked() {
                response.skip_forward = true;
            }
            
            ui.add_space(20.0);
            
            // Seek slider
            let mut position_secs = self.current_position.as_secs_f32();
            let duration_secs = self.total_duration.as_secs_f32();
            
            if ui
                .add(
                    egui::Slider::new(&mut position_secs, 0.0..=duration_secs)
                        .show_value(false),
                )
                .changed()
            {
                response.seek_to = Some(Duration::from_secs_f32(position_secs));
            }
            
            // Time labels
            ui.label(format!(
                "{} / {}",
                format_duration(self.current_position),
                format_duration(self.total_duration)
            ));
            
            ui.add_space(20.0);
            
            // Volume slider
            ui.label("🔊");
            if ui
                .add(egui::Slider::new(&mut self.volume, 0.0..=1.0).show_value(false))
                .changed()
            {
                response.volume_changed = Some(self.volume);
            }
        });
        
        response
    }
}

#[derive(Default)]
pub struct PlaybackBarResponse {
    pub toggle_playback: bool,
    pub skip_forward: bool,
    pub skip_backward: bool,
    pub seek_to: Option<Duration>,
    pub volume_changed: Option<f32>,
}

fn format_duration(d: Duration) -> String {
    let secs = d.as_secs();
    format!("{}:{:02}", secs / 60, secs % 60)
}
```

#### Task 6: **INTEGRATE INTO MainWindow**

**FILE**: `src/ui/main_window.rs`

Replace layout code:
```rust
impl MainWindow {
    pub fn update(&mut self, ctx: &egui::Context) {
        // ===== BOTTOM PLAYBACK BAR (STICKY) =====
        egui::TopBottomPanel::bottom("playback_bar")
            .frame(egui::Frame::none()
                .fill(QualiaTheme::BG_PANEL)
                .shadow(QualiaTheme::SHADOW_CARD_ELEVATED))
            .show(ctx, |ui| {
                ui.add_space(QualiaTheme::SPACING_CARD_PADDING);
                let response = self.playback_bar.render(ui);
                
                // Handle playback bar interactions
                if response.toggle_playback {
                    // ... handle play/pause
                }
                if let Some(pos) = response.seek_to {
                    // ... handle seek
                }
                if let Some(vol) = response.volume_changed {
                    // ... handle volume
                }
            });
        
        // ===== MAIN CONTENT AREA =====
        egui::CentralPanel::default()
            .frame(egui::Frame::none().fill(QualiaTheme::BG_DARK))
            .show(ctx, |ui| {
                ui.add_space(QualiaTheme::SPACING_PANEL_MARGIN);
                
                // Hero waveform card
                self.hero_waveform.render(ui);
                
                ui.add_space(QualiaTheme::SPACING_PANEL_MARGIN);
                
                // Multi-band spectrum grid
                ui.heading("🎚️ Spectrum Analyzer");
                self.spectrum_grid.render(ui);
                
                ui.add_space(QualiaTheme::SPACING_PANEL_MARGIN);
            });
        
        // ===== OPTIONAL: SIDE PANEL FOR EFFECTS =====
        egui::SidePanel::right("effects_panel")
            .resizable(true)
            .default_width(300.0)
            .show_animated(ctx, self.show_effects_panel, |ui| {
                ui.heading("🎛️ Effects");
                self.effects_panel.render(ctx, ui);
            });
    }
}
```

#### Task 7: **ADD KEYBOARD SHORTCUTS + ANIMATIONS**

```rust
// Keyboard shortcuts (in update())
ctx.input(|i| {
    if i.key_pressed(egui::Key::Space) {
        self.toggle_playback();
    }
    if i.modifiers.ctrl && i.key_pressed(egui::Key::O) {
        self.load_file();
    }
    if i.key_pressed(egui::Key::E) {
        self.show_effects_panel = !self.show_effects_panel;
    }
});

// Request repaint for smooth animations (60fps)
ctx.request_repaint();
```

**VALIDATION**:
- ✅ `cargo build` → Must compile clean
- ✅ Manual UI check:
  - [ ] Hero waveform visible with gradient background
  - [ ] 6-12 spectrum bars animating smoothly
  - [ ] Playback controls at BOTTOM (not top)
  - [ ] Rounded corners, shadows on cards
  - [ ] Spacious 16-24px padding
  - [ ] Neon blue/purple/pink accents visible
  - [ ] Keyboard shortcuts work (Space, Ctrl+O, E)
- ✅ Performance: 60fps with 12 spectrum bars

**BEFORE/AFTER**:
```
BEFORE (WINDOWS 95):                AFTER (2025 MODERN):
┌────────────────────┐             ┌──────────────────────────┐
│ TOP: Controls      │             │ CLEAN TOP (no clutter)   │
├───┬────────┬───────┤             ├──────────────────────────┤
│Wav│ INFO   │Spec   │             │ 🎵 HERO WAVEFORM (300px) │
│   │useless │       │             │ Gradient, auto-scroll    │
│   │ text   │       │   →         ├──────────────────────────┤
├───┴────────┴───────┤             │ ┌──┬──┬──┬──┬──┬──┬──┐   │
│ Effects            │             │ │▓▓│▓▓│▓▓│▓▓│▓▓│▓▓│▓▓│   │
└────────────────────┘             │ └──┴──┴──┴──┴──┴──┴──┘   │
                                   ├──────────────────────────┤
                                   │ PLAYBACK BAR (bottom)    │
                                   │ [◀][⏸][▶] ━●━ 2:30/4:50 │
                                   └──────────────────────────┘
```

---

### Phase 2: DI REFACTOR (1 day) - P0/P1 ARCHITECTURAL CLEANUP

**Goal**: Eliminate Service Locator (Violations 2, 6, 7)

**Tasks**:
1. ✅ **Create ApplicationServices aggregate**
   ```rust
   // src/services/application_services.rs
   #[derive(Component)]
   #[shaku(interface = IApplicationServices)]
   pub struct ApplicationServices {
       #[shaku(inject)]
       audio_player: Arc<dyn IAudioPlayer>,
       #[shaku(inject)]
       audio_analyzer: Arc<dyn IAudioAnalyzer>,
       #[shaku(inject)]
       visualization_engine: Arc<dyn IVisualizationEngine>,
       #[shaku(inject)]
       audio_effects: Arc<dyn IAudioEffects>,
       #[shaku(inject)]
       audio_exporter: Arc<dyn IAudioExporter>,
       #[shaku(inject)]
       multi_channel_output: Arc<dyn IMultiChannelOutput>,
   }
   
   pub trait IApplicationServices: Interface {
       fn audio_player(&self) -> Arc<dyn IAudioPlayer>;
       fn audio_analyzer(&self) -> Arc<dyn IAudioAnalyzer>;
       // ... getters for all services
   }
   ```

2. ✅ **Convert AppConfig to Shaku provider**
   ```rust
   // src/config/provider.rs
   #[derive(Provider)]
   #[shaku(interface = AppConfig)]
   pub struct AppConfigProvider;
   
   impl Provider for AppConfigProvider {
       type Interface = AppConfig;
       fn provide(&self, _di: &dyn HasComponent<dyn Interface>) -> Result<Self::Interface, Box<dyn Error>> {
           load_config()
       }
   }
   ```

3. ✅ **Make MainWindow injectable**
   ```rust
   #[derive(Component)]
   #[shaku(interface = IMainWindow)]
   pub struct MainWindow {
       #[shaku(inject)]
       services: Arc<ApplicationServices>,
       
       #[shaku(inject)]
       config: Arc<AppConfig>,
   }
   ```

4. ✅ **Simplify main.rs**
   ```rust
   #[tokio::main]
   async fn main() -> Result<(), eframe::Error> {
       tracing_subscriber::fmt::init();
       let rt = tokio::runtime::Runtime::new().expect("Failed to create Tokio runtime");
       let _rt_guard = rt.enter();
       
       let module = AudioForgeModule::builder().build();
       let mut main_window: Arc<MainWindow> = module.resolve(); // SINGLE RESOLVE
       
       let options = eframe::NativeOptions { /* ... */ };
       eframe::run_simple_native("audio-forge", options, move |ctx, _frame| {
           QualiaTheme::apply(ctx);
           main_window.update(ctx);
       })
   }
   ```

**VALIDATION**: Run `cargo build && cargo test` → All passing

---

### Phase 3: EVENTBUS INTEGRATION (1 day) - P1 LOOSE COUPLING

**Goal**: Implement Violation 5 fix

**Tasks**:
1. ✅ **Create event types**
   ```rust
   // src/events.rs
   #[derive(Clone, Debug)]
   pub enum AudioForgeEvent {
       FileLoaded { path: PathBuf, duration: Duration },
       PlaybackStateChanged { is_playing: bool, position: Duration },
       EffectsConfigUpdated { config: EffectConfig },
       VisualizationDataReady { waveform: Vec<f32>, spectrum: FrequencySpectrum },
       ExportCompleted { path: PathBuf },
       ExportFailed { error: String },
   }
   ```

2. ✅ **Implement EventBus**
   ```rust
   // src/services/event_bus.rs
   use tokio::sync::broadcast;
   
   #[derive(Component)]
   #[shaku(interface = IEventBus)]
   pub struct AudioForgeEventBus {
       tx: broadcast::Sender<AudioForgeEvent>,
   }
   
   impl AudioForgeEventBus {
       pub fn new() -> Self {
           let (tx, _rx) = broadcast::channel(1000);
           Self { tx }
       }
   }
   
   impl IEventBus for AudioForgeEventBus {
       fn emit(&self, event: AudioForgeEvent) -> Result<usize> {
           self.tx.send(event).map_err(|e| anyhow!("EventBus send failed: {}", e))
       }
       
       fn subscribe(&self) -> broadcast::Receiver<AudioForgeEvent> {
           self.tx.subscribe()
       }
   }
   ```

3. ✅ **Convert services to publishers**
   ```rust
   impl AudioPlayerService {
       fn load_file(&self, path: &Path) -> Result<Duration> {
           let duration = /* ... load logic ... */;
           self.event_bus.emit(AudioForgeEvent::FileLoaded { 
               path: path.to_path_buf(), 
               duration 
           })?;
           Ok(duration)
       }
   }
   ```

4. ✅ **Convert MainWindow to subscriber**
   ```rust
   impl MainWindow {
       pub fn new(services: Arc<ApplicationServices>) -> Self {
           let event_bus = services.event_bus();
           let event_bus_clone = event_bus.clone();
           
           tokio::spawn(async move {
               let mut events = event_bus_clone.subscribe();
               loop {
                   match events.recv().await {
                       Ok(AudioForgeEvent::FileLoaded { path, duration }) => {
                           info!("Event: File loaded {:?} ({}s)", path, duration.as_secs());
                       }
                       Ok(AudioForgeEvent::PlaybackStateChanged { is_playing, position }) => {
                           info!("Event: Playback {} at {:.2}s", 
                               if is_playing { "started" } else { "stopped" },
                               position.as_secs_f32());
                       }
                       Err(broadcast::error::RecvError::Lagged(skipped)) => {
                           warn!("EventBus lagging! Skipped {} events", skipped);
                       }
                       Err(broadcast::error::RecvError::Closed) => break,
                       _ => {}
                   }
               }
           });
           
           Self { /* ... */ }
       }
   }
   ```

**VALIDATION**: Load file → verify event flows from service → UI without direct calls (check logs)

---

### Phase 4: DEPENDENCY CLEANUP (30 min) - P2 HOUSEKEEPING

**Goal**: Fix Violation 8

**Tasks**:
1. ✅ **Update Cargo.toml**
   ```diff
   - cpal = "0.16.0"
   - symphonia = "0.5.5"
   - lazy_static = "1.5.0"
   ```

2. ✅ **Replace lazy_static** (audio_analyzer.rs)
   ```diff
   - use lazy_static::lazy_static;
   - lazy_static! {
   -     static ref FFT_PLANNER: Mutex<FftPlanner<f32>> = Mutex::new(FftPlanner::new());
   - }
   + use std::sync::OnceLock;
   + static FFT_PLANNER: OnceLock<Mutex<FftPlanner<f32>>> = OnceLock::new();
   + 
   + fn get_planner() -> &'static Mutex<FftPlanner<f32>> {
   +     FFT_PLANNER.get_or_init(|| Mutex::new(FftPlanner::new()))
   + }
   ```

3. ✅ **Run clippy fix**
   ```bash
   cargo clippy --fix --allow-dirty
   ```

**VALIDATION**: `cargo build` → No warnings

---

### Phase 5: TESTING OVERHAUL (2 days) - P0/P2 QUALITY ASSURANCE

**Goal**: Fix Violations 4, 10 (Happy path coverage + mockall usage)

**Tasks**:
1. ✅ **Create state-based integration tests**
   ```rust
   // tests/integration_happy_path.rs
   use audio_forge::*;
   use std::path::PathBuf;
   use std::time::Duration;
   
   #[tokio::test]
   async fn test_happy_path_full_workflow() {
       // SETUP: Create test module with REAL services
       let module = AudioForgeModule::builder().build();
       let services: Arc<ApplicationServices> = module.resolve();
       
       // TEST ASSET
       let test_wav = PathBuf::from("tests/assets/sine_440hz.wav");
       assert!(test_wav.exists(), "Test asset missing");
       
       // STEP 1: Load file (simulates drag-drop)
       let load_result = services.audio_player().load_file(&test_wav);
       assert!(load_result.is_ok(), "File load failed");
       
       let duration = load_result.unwrap();
       assert!((4..=6).contains(&duration.as_secs()), "Duration invalid");
       
       // STEP 2: Play (simulates Play button click)
       assert!(services.audio_player().play().is_ok(), "Play failed");
       tokio::time::sleep(Duration::from_millis(100)).await;
       assert!(services.audio_player().is_playing(), "Not playing after play()");
       
       // STEP 3: Seek (simulates progress bar drag)
       let mid_point = duration / 2;
       assert!(services.audio_player().seek(mid_point).is_ok(), "Seek failed");
       
       let current = services.audio_player().current_position();
       let diff = (current.as_secs_f32() - mid_point.as_secs_f32()).abs();
       assert!(diff < 0.1, "Seek position inaccurate");
       
       // STEP 4: Pause (simulates Pause button click)
       assert!(services.audio_player().pause().is_ok(), "Pause failed");
       tokio::time::sleep(Duration::from_millis(50)).await;
       assert!(!services.audio_player().is_playing(), "Still playing after pause");
       
       // STEP 5: Effects (simulates checkbox click)
       let mut config = EffectConfig::default();
       config.effect_8d_enabled = true;
       config.effect_8d_intensity = 0.8;
       
       assert!(services.audio_effects().set_config(config.clone()).is_ok());
       
       // STEP 6: Export (simulates Export button click)
       let temp_dir = tempfile::tempdir().unwrap();
       let export_path = temp_dir.path().join("exported.wav");
       
       let samples = services.audio_player().capture_processed_audio().unwrap();
       let sr = services.audio_player().get_sample_rate();
       
       assert!(services.audio_exporter().export_wav(&export_path, &samples, sr).is_ok());
       assert!(export_path.exists(), "Export file not created");
   }
   
   #[test]
   fn test_concurrent_file_loading_race_condition() {
       let module = AudioForgeModule::builder().build();
       let player: Arc<dyn IAudioPlayer> = module.resolve();
       
       // Spawn 10 threads trying to load different files
       let handles: Vec<_> = (0..10).map(|i| {
           let player = player.clone();
           std::thread::spawn(move || {
               let path = format!("tests/assets/test_{}.wav", i % 3); // Cycle through 3 files
               player.load_file(&PathBuf::from(path))
           })
       }).collect();
       
       let results: Vec<_> = handles.into_iter().map(|h| h.join().unwrap()).collect();
       
       // At least one should succeed (last one wins)
       assert!(results.iter().any(|r| r.is_ok()), "All concurrent loads failed");
   }
   ```

2. ✅ **Add property-based tests**
   ```rust
   // tests/property_tests.rs
   use proptest::prelude::*;
   
   proptest! {
       #[test]
       fn test_effects_no_nan_or_inf(
           samples in prop::collection::vec(-1.0f32..=1.0, 1..10000),
           gain in 0.0f32..5.0
       ) {
           let mut samples = samples;
           let effects = AudioEffectsService::default();
           
           let config = EffectConfig {
               bass_boost_enabled: true,
               bass_boost_gain: gain,
               ..Default::default()
           };
           effects.set_config(config).unwrap();
           effects.apply_bass_boost(&mut samples, 44100).unwrap();
           
           assert!(samples.iter().all(|&s| s.is_finite()), "Effects produced NaN/Inf");
       }
       
       #[test]
       fn test_seek_boundary_clamping(
           target_secs in 0u64..1000
       ) {
           let module = AudioForgeModule::builder().build();
           let player: Arc<dyn IAudioPlayer> = module.resolve();
           
           // Load test file (5 seconds)
           player.load_file(&PathBuf::from("tests/assets/sine_440hz.wav")).unwrap();
           let duration = player.total_duration();
           
           // Try to seek beyond duration
           let target = Duration::from_secs(target_secs);
           player.seek(target).ok(); // May fail, that's fine
           
           // Position should be clamped to [0, duration]
           let pos = player.current_position();
           assert!(pos <= duration, "Position exceeds duration");
       }
   }
   ```

3. ✅ **Create mockall unit tests**
   ```rust
   // tests/unit_tests.rs
   use mockall::*;
   
   #[automock]
   pub trait IAudioPlayer: Send + Sync {
       fn load_file(&self, path: &Path) -> Result<Duration>;
       fn play(&self) -> Result<()>;
       fn is_playing(&self) -> bool;
   }
   
   #[test]
   fn test_main_window_handles_load_error_gracefully() {
       let mut mock_player = MockIAudioPlayer::new();
       
       // Simulate load failure
       mock_player.expect_load_file()
           .times(1)
           .returning(|_| Err(anyhow!("File not found")));
       
       let services = /* ... inject mock ... */;
       let window = MainWindow::new(services);
       
       // UI should show error, not crash
       let state = window.state.lock().unwrap();
       assert!(state.loading_error.is_some(), "Error not propagated to UI");
   }
   ```

4. ✅ **Create manual validation checklist**
   ```markdown
   # MANUAL_VALIDATION_CHECKLIST.md
   
   ## Happy Path (Primary)
   - [ ] Launch app → UI loads without errors
   - [ ] Click "Load Audio File" → File picker opens
   - [ ] Select `sine_440hz.wav` → File loads (duration displays)
   - [ ] Click "Play" button → Audio plays (waveform animates)
   - [ ] Click progress bar at 50% → Playback jumps to middle
   - [ ] Drag volume slider to 50% → Volume decreases audibly
   - [ ] Press Space key → Playback pauses
   - [ ] Click "8D Effect" checkbox → Audio spatializes
   - [ ] Click "Export" → WAV file saves successfully
   - [ ] Drag WAV file to window → File loads (replaces previous)
   
   ## Edge Cases
   - [ ] Drag invalid file (txt) → Error message displays
   - [ ] Click Play with no file → No crash (graceful message)
   - [ ] Seek beyond duration → Position clamps to end
   - [ ] Resize window → UI adapts without breaking
   - [ ] Minimize/restore → UI state preserved
   
   ## Visual Regression
   - [ ] Dark theme renders correctly (no white artifacts)
   - [ ] Waveform + spectrum side-by-side (center)
   - [ ] Controls unified at top (no scattered panels)
   - [ ] Effects panel collapsible at bottom
   - [ ] No InfoPanel visible (removed)
   - [ ] Keyboard shortcuts display in tooltips
   ```

**VALIDATION**:
- Run `cargo test` → 120+ tests passing (95 existing + 20 integration + 5 property)
- Run through manual checklist → All items pass

---

## 📊 SUCCESS METRICS

### Before (Current State - BROKEN)
- ❌ 6 manual service resolutions in main()
- ❌ MainWindow is 545 lines (God Object)
- ❌ Post-construction config injection
- ❌ No EventBus (tight coupling)
- ❌ InfoPanel useless (static text in CENTER)
- ❌ 0 happy path integration tests
- ❌ 0 mockall unit tests
- ❌ 3 redundant dependencies
- ⚠️ 95 tests (backend only, no UI workflow)

### After (Target State - PRODUCTION-GRADE)
- ✅ 1 service resolution in main() (MainWindow via DI)
- ✅ MainWindow < 300 lines (coordinators extracted)
- ✅ Constructor injection only (config via Shaku provider)
- ✅ EventBus with tokio::sync::broadcast (loose coupling)
- ✅ InfoPanel removed (waveform/spectrum in center)
- ✅ 25+ integration tests (state-based happy path)
- ✅ 10+ mockall unit tests (isolated service tests)
- ✅ 0 redundant dependencies
- ✅ 130+ tests (backend + integration + property + unit)

---

## 🔥 FINAL VERDICT

**CURRENT CODE QUALITY**: **D** (Works but violates 10 QUALIA.CODE mandates)  
**TARGET CODE QUALITY**: **A** (Production-grade Rust)

**BLOCKING ISSUES**:
1. UI/UX usability (P0-1): InfoPanel wasting center, controls scattered
2. Testing gaps (P0-4): No happy path integration tests
3. Architecture violations (P0-2, P1-5,6,7): Service Locator, missing EventBus, manual DI

**PRIORITY ORDER** (Maximize user impact):
1. **Phase 1** (UI redesign) → Immediate user value
2. **Phase 5** (integration tests) → Prevents regressions
3. **Phase 2** (DI refactor) → Long-term maintainability
4. **Phase 3** (EventBus) → Architectural purity
5. **Phase 4** (dependency cleanup) → Housekeeping

**TIMELINE**: 4-5 days for complete remediation (3 days if phases 3+4 deferred).

**RISK**: **LOW** (Tests already passing, refactor is mostly code organization + layout changes)

---

**COMPLIANCE VERIFICATION**:
- ✅ QUALIA.CODE Section 2 (DI): After Phase 2
- ✅ QUALIA.CODE Section 4 (EventBus): After Phase 3
- ✅ QUALIA.CODE Section 9 (Testing): After Phase 5
- ✅ QUALIA.CODE Section 13 (Docs): Violations 9 fixed

**END OF PLAN v3.0**  
**NEXT ACTION**: Execute Phase 1 (UI Redesign) + Phase 5 (Integration Tests) in parallel.
