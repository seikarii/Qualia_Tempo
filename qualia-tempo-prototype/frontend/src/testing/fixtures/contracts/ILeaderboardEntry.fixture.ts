import { ILeaderboardEntry } from '../../../types/ILeaderboardEntry';

export const createMockLeaderboardEntry = (overrides?: Partial<ILeaderboardEntry>): ILeaderboardEntry => ({
  rank: 1,
  playerId: 'player-001',
  playerName: 'TestPlayer',
  score: 100000,
  songId: 'song-001',
  difficulty: 'medium',
  maxCombo: 150,
  accuracy: 0.95,
  timestamp: Date.now(),
  qualiaSnapshot: {
    intensity: 0.8,
    precision: 0.9,
    aggression: 0.6,
    flow: 0.85,
    chaos: 0.3,
    recovery: 0.5,
    transcendence: 0.7,
    collectionWindowEnd: 0,
  },
  ...overrides,
});

export const createTopLeaderboardEntry = (overrides?: Partial<ILeaderboardEntry>): ILeaderboardEntry => ({
  ...createMockLeaderboardEntry(),
  rank: 1,
  score: 999999,
  maxCombo: 500,
  accuracy: 0.99,
  difficulty: 'expert',
  qualiaSnapshot: {
    intensity: 1.0,
    precision: 0.99,
    aggression: 0.8,
    flow: 0.95,
    chaos: 0.1,
    recovery: 0.6,
    transcendence: 0.95,
    collectionWindowEnd: 0,
  },
  ...overrides,
});
