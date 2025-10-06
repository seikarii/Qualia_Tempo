import { IGameSettings } from '../../../types/IGameSettings';

export const createMockGameSettings = (overrides?: Partial<IGameSettings>): IGameSettings => ({
  audio: {
    masterVolume: 0.8,
    musicVolume: 0.9,
    sfxVolume: 0.7,
    audioOffsetMs: 0,
  },
  gameplay: {
    timingWindowMs: {
      perfect: 50,
      good: 100,
      ok: 150,
    },
    autoplay: false,
    practiceMode: false,
    showTiming: true,
  },
  visual: {
    brightness: 1.0,
    particleDensity: 'high',
    postProcessingEnabled: true,
    bloomIntensity: 0.6,
    showHitEffects: true,
    showComboText: true,
    backgroundAnimations: true,
  },
  input: {
    keyBindings: {
      hitNote: ['Q', 'E', 'R', 'T', 'F', 'G', 'C'],
      dash: ['Space', 'LeftClick'],
      pause: ['Escape', 'P'],
    },
    mouseSensitivity: 1.0,
  },
  accessibility: {
    colorblindMode: 'none',
    screenShakeIntensity: 1.0,
    flashingEffects: true,
    subtitlesEnabled: false,
  },
  ...overrides,
});

export const createLowPerformanceSettings = (overrides?: Partial<IGameSettings>): IGameSettings => ({
  ...createMockGameSettings(),
  visual: {
    brightness: 1.0,
    particleDensity: 'low',
    postProcessingEnabled: false,
    bloomIntensity: 0.3,
    showHitEffects: true,
    showComboText: true,
    backgroundAnimations: false,
  },
  ...overrides,
});
