import { PatternData } from '../../../types/PatternData';

export const createMockPatternData = (overrides?: Partial<PatternData>): PatternData => ({
  id: 'pattern-001',
  name: 'Test Pattern',
  type: 'projectile',
  phases: [0, 1],
  notes: [
    {
      timestamp: 0,
      position: { x: 5, y: 5 },
      damage: 10,
    },
  ],
  durationSec: 5.0,
  cooldownSec: 2.0,
  ...overrides,
});

export const createIntensePattern = (overrides?: Partial<PatternData>): PatternData => ({
  ...createMockPatternData(),
  id: 'pattern-intense-001',
  name: 'Chaos Barrage',
  type: 'projectile',
  phases: [2],
  notes: Array.from({ length: 20 }, (_, i) => ({
    timestamp: i * 0.2,
    position: { x: Math.random() * 10, y: Math.random() * 10 },
    velocity: { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2 },
    damage: 15,
    visualData: { color: '#FF0000', size: 2, shape: 'circle' as const },
  })),
  durationSec: 4.0,
  cooldownSec: 8.0,
  requiredQualiaThreshold: { aggression: 0.7, chaos: 0.8 },
  ...overrides,
});
