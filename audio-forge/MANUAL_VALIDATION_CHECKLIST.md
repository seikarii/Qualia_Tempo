# MANUAL VALIDATION CHECKLIST
**Audio Forge - Qualia Tempo**  
**Version**: 1.0  
**Purpose**: UI/UX workflow validation (egui has no headless testing)

---

## 🎯 TESTING PHILOSOPHY

This checklist covers **UI workflows** that cannot be automated due to egui limitations:
- Button clicks → Visual feedback
- Drag-and-drop → File loading
- Slider interactions → Real-time parameter changes
- Window resizing → Layout adaptation
- Keyboard shortcuts → Accessibility features

**Automated tests** (integration_tests.rs, unit_tests.rs) validate **service layer logic**.  
**Manual tests** (this checklist) validate **user-facing behavior**.

---

## ✅ PRIMARY HAPPY PATH

### HP-1: Application Launch
- [ ] Launch `cargo run --release`
- [ ] **EXPECTED**: Window opens at 1280x800
- [ ] **EXPECTED**: Dark theme applied (no white artifacts)
- [ ] **EXPECTED**: No error messages in console

### HP-2: Load Audio File (File Picker)
- [ ] Click "Cargar Archivo" button
- [ ] **EXPECTED**: Native file picker opens
- [ ] Select `tests/assets/sine_440hz.wav`
- [ ] **EXPECTED**: File loads within 2 seconds
- [ ] **EXPECTED**: Duration displays (e.g., "0:10")
- [ ] **EXPECTED**: Waveform renders in hero card

### HP-3: Playback Controls
- [ ] Click "Reproducir" button
- [ ] **EXPECTED**: Audio plays (440Hz sine wave audible)
- [ ] **EXPECTED**: Waveform animates with playback position
- [ ] **EXPECTED**: Button changes to "Pausar"
- [ ] Click "Pausar" button
- [ ] **EXPECTED**: Audio pauses
- [ ] **EXPECTED**: Position remains at pause point
- [ ] Click "Detener" button
- [ ] **EXPECTED**: Playback stops, position resets to 0:00

### HP-4: Seek Functionality
- [ ] With file loaded, click progress slider at 50%
- [ ] **EXPECTED**: Playback jumps to middle of file
- [ ] **EXPECTED**: Position updates instantly (no lag)
- [ ] Drag slider to 75%
- [ ] **EXPECTED**: Position follows mouse (smooth dragging)

### HP-5: Volume Control
- [ ] Drag volume slider to 50%
- [ ] **EXPECTED**: Audio volume decreases audibly
- [ ] **EXPECTED**: No crackling/distortion
- [ ] Drag volume slider to 100%
- [ ] **EXPECTED**: Full volume restored

### HP-6: Effects Application
- [ ] Enable "8D Audio" checkbox
- [ ] **EXPECTED**: Stereo panning effect audible
- [ ] **EXPECTED**: No audio glitches
- [ ] Disable "8D Audio"
- [ ] **EXPECTED**: Effect removed, normal stereo restored
- [ ] Enable "Drop Effect"
- [ ] **EXPECTED**: Volume reduction applied
- [ ] Enable "Bass Boost" slider
- [ ] **EXPECTED**: Low frequencies enhanced
- [ ] Enable "Treble Boost" slider
- [ ] **EXPECTED**: High frequencies enhanced

### HP-7: Audio Export
- [ ] Click "Exportar WAV" button
- [ ] **EXPECTED**: File save dialog opens
- [ ] Save as `/tmp/test_export.wav`
- [ ] **EXPECTED**: Export completes within 5 seconds
- [ ] **EXPECTED**: Success message appears
- [ ] Open exported file in Audacity
- [ ] **EXPECTED**: Waveform matches original + effects

### HP-8: Drag-and-Drop File Loading
- [ ] Drag `tests/assets/sine_440hz.wav` to window
- [ ] **EXPECTED**: File loads (same as HP-2)
- [ ] **EXPECTED**: Previous file replaced

---

## 🔍 EDGE CASES & ERROR HANDLING

### EC-1: Invalid File Handling
- [ ] Drag `README.md` (non-audio file) to window
- [ ] **EXPECTED**: Error message displays
- [ ] **EXPECTED**: No crash
- [ ] **EXPECTED**: Previous file remains loaded

### EC-2: Play Without File
- [ ] Launch app (no file loaded)
- [ ] Click "Reproducir" button
- [ ] **EXPECTED**: Error message "No hay archivo cargado"
- [ ] **EXPECTED**: No crash

### EC-3: Seek Without File
- [ ] With no file loaded, drag seek slider
- [ ] **EXPECTED**: Slider moves but does nothing
- [ ] **EXPECTED**: No crash

### EC-4: Multiple File Loads
- [ ] Load `sine_440hz.wav`
- [ ] Immediately load `sine_440hz.wav` again (spam clicks)
- [ ] **EXPECTED**: Second load completes
- [ ] **EXPECTED**: No double-playback or crashes

### EC-5: Volume Out of Range (UI Clipping)
- [ ] Manually type `1.5` in volume input (if editable)
- [ ] **EXPECTED**: Value clamps to 1.0
- [ ] **EXPECTED**: No error

### EC-6: Window Resize Behavior
- [ ] Resize window to 800x600 (smaller)
- [ ] **EXPECTED**: UI adapts (no overlapping widgets)
- [ ] **EXPECTED**: Waveform rescales
- [ ] Resize to 1920x1080 (larger)
- [ ] **EXPECTED**: UI utilizes extra space
- [ ] **EXPECTED**: No empty gaps

### EC-7: Minimize/Restore State Persistence
- [ ] Load file, play, pause at 50%
- [ ] Minimize window
- [ ] Restore window
- [ ] **EXPECTED**: Playback state preserved (paused at 50%)
- [ ] **EXPECTED**: UI unchanged

---

## ⌨️ KEYBOARD SHORTCUTS

### KS-1: Space to Play/Pause
- [ ] Load file
- [ ] Press `Space` key
- [ ] **EXPECTED**: Playback starts
- [ ] Press `Space` again
- [ ] **EXPECTED**: Playback pauses

### KS-2: Ctrl+O to Open File
- [ ] Press `Ctrl+O`
- [ ] **EXPECTED**: File picker opens (same as button click)

### KS-3: E to Toggle Effects Panel
- [ ] Press `E` key
- [ ] **EXPECTED**: Effects panel collapses/expands
- [ ] **EXPECTED**: Keyboard focus handled correctly

---

## 🎨 VISUAL REGRESSION CHECKS

### VR-1: Theme Consistency
- [ ] **Dark theme colors**:
  - Background: #1A1A1A
  - Panel BG: #242424
  - Accent: Electric Blue (#00A8FF)
- [ ] **No white artifacts** (common egui bug)
- [ ] **Rounded corners** on cards (8px radius)
- [ ] **Shadows** visible on cards

### VR-2: Hero Waveform Card
- [ ] **Height**: 300px (use ruler or estimate)
- [ ] **Gradient background**: Visible top-to-bottom fade
- [ ] **Auto-scroll**: Waveform shifts as playback progresses
- [ ] **Playback position indicator**: Vertical line at current position

### VR-3: Multi-Band Spectrum Grid
- [ ] **Bar count**: 6-12 vertical bars visible
- [ ] **Animation**: Bars height changes smoothly (no stutter)
- [ ] **Color gradient**: Bars use accent color (neon blue/purple)

### VR-4: Modern Playback Bar (Bottom)
- [ ] **Location**: Sticky bottom (not top)
- [ ] **Contents**: Play/Pause/Stop + Seek slider + Volume + Time
- [ ] **Glassmorphism**: Slight transparency (if implemented)

### VR-5: No InfoPanel Visible
- [ ] **CRITICAL CHECK**: InfoPanel must NOT be visible
- [ ] **EXPECTED**: No static "Features list" text in center
- [ ] **EXPECTED**: Waveform/spectrum occupy center space

---

## 🚀 PERFORMANCE CHECKS

### PERF-1: Waveform Rendering (60fps Target)
- [ ] Load 5-minute MP3
- [ ] Play and observe waveform animation
- [ ] **EXPECTED**: Smooth 60fps (no stuttering)
- [ ] **TOOL**: Use `cargo run --release` (optimizations enabled)

### PERF-2: Spectrum Bars (30fps Throttle)
- [ ] Play audio with spectrum visible
- [ ] **EXPECTED**: Bars update ~30 times/second (smooth but not excessive)

### PERF-3: Effects Processing Latency
- [ ] Enable all effects (8D + Drop + Bass + Treble)
- [ ] Play audio
- [ ] **EXPECTED**: No audible crackling/pops
- [ ] **EXPECTED**: < 20ms latency (imperceptible)

### PERF-4: Memory Usage (Baseline)
- [ ] Load 10MB MP3
- [ ] Open system monitor
- [ ] **EXPECTED**: < 150MB RAM usage
- [ ] **EXPECTED**: No memory leaks over 5 minutes

---

## 🔧 REGRESSION CHECKLIST (Post-Update)

Run this section after ANY code change to catch regressions:

### REG-1: Critical Path (5 minutes)
- [ ] HP-2: Load file
- [ ] HP-3: Play/Pause/Stop
- [ ] HP-4: Seek
- [ ] HP-6: Toggle 8D effect
- [ ] HP-7: Export WAV

### REG-2: Error Handling (2 minutes)
- [ ] EC-1: Drag invalid file
- [ ] EC-2: Play without file

### REG-3: Visual Check (1 minute)
- [ ] VR-5: InfoPanel removed
- [ ] VR-4: Playback bar at bottom
- [ ] VR-1: Dark theme (no white)

**Total regression time**: ~8 minutes

---

## 📊 PASS CRITERIA

### Minimum Viable (MVP)
- ✅ All HP (Happy Path) checks pass
- ✅ No crashes during EC (Edge Cases)
- ✅ VR-5 (No InfoPanel) passes
- ✅ PERF-1 (60fps) achieves ≥ 50fps

### Production Ready
- ✅ MVP + All KS (Keyboard Shortcuts) work
- ✅ PERF-3 (Latency) < 20ms
- ✅ All VR (Visual Regression) checks pass

---

## 🐛 ISSUE REPORTING TEMPLATE

If any check fails, report using this template:

```
**CHECK FAILED**: [Checklist ID, e.g., HP-3]
**DESCRIPTION**: [What went wrong]
**EXPECTED**: [From checklist]
**ACTUAL**: [What happened]
**REPRODUCIBLE**: [Yes/No, steps if Yes]
**SEVERITY**: [Critical / High / Medium / Low]
**LOGS**: [Paste console output if relevant]
```

---

## 🎯 LAST VALIDATED

- **Date**: [YYYY-MM-DD]
- **Tester**: [Name]
- **Version**: [Git commit hash]
- **Pass Rate**: [X/Y checks passed]
- **Notes**: [Any observations]

---

**END OF MANUAL VALIDATION CHECKLIST v1.0**
