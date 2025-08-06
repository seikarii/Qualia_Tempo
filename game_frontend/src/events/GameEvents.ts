import type { Entity } from '../ecs/Entity';
import type { QualiaState as QualiaStateType } from '../types/QualiaState';

export const GameEvent = {
  // Lifecycle
  EntityDied: 'EntityDied',
  SceneLoaded: 'SceneLoaded',
  BossDefeated: 'boss_defeated',

  // Player Progression
  TalentPointsGained: 'TalentPointsGained',
  TalentUnlocked: 'TalentUnlocked',
  KeybindChanged: 'KeybindChanged',
  ShowTalentScreen: 'show_talent_screen',
  HideTalentScreen: 'hide_talent_screen',
  UnlockTalentRequest: 'unlock_talent_request',
  TalentStateUpdated: 'talent_state_updated',
  // ... (otros eventos)
  PlayerStateUpdated: 'player_state_updated',

  // Talent & Progression Flow
  RespecTalentRequest: 'respec_talent_request',
  ConfirmTalents: 'confirm_talents',
  ShowGameOverScreen: 'show_game_over_screen',
  RepeatChallengeRequest: 'repeat_challenge_request',
  ShowContinuePrompt: 'show_continue_prompt',
  ContinueAfterBoss: 'continue_after_boss',

  // Combat & Abilities
  AbilityCasted: 'AbilityCasted',
  EntityDamaged: 'EntityDamaged',
  PLAYER_ABILITY_USED: 'player_ability_used',
  PlayerDashSuccess: 'player_dash_success',
  PlayerDashFail: 'player_dash_fail',
  PlayerAbilityPause: 'PlayerAbilityPause',
  PlayerAbilityFastForward: 'PlayerAbilityFastForward',
  PlayerAbilityRewind: 'PlayerAbilityRewind',
  PlayerAbilityUltimate: 'PlayerAbilityUltimate',
  // ...

  // Dialogue
  StartDialogue: 'StartDialogue',
  AdvanceDialogue: 'AdvanceDialogue',
  ShowDialogueLine: 'ShowDialogueLine',
  HideDialogue: 'HideDialogue',
  DialogueFinished: 'DialogueFinished',

  // Gameplay Elements
  FloorTileSpawned: 'FloorTileSpawned',
  FloorTileCollected: 'FloorTileCollected',
  ComboChanged: 'ComboChanged',
  Beat: 'Beat' as const,

  // UI & System Events
  GamePaused: 'GamePaused',
  GameResumed: 'GameResumed',
  StartAudio: 'StartAudio',
  StopAudio: 'StopAudio',
  MusicDataUpdated: 'MusicDataUpdated',
};

export interface AbilityCastedEvent {
  entityId: number;
  abilityId: string;
  targetPosition?: { x: number; y: number };
}

// ... (el resto de las interfaces permanece igual)

export interface EntityDamagedEvent {
  entityId: number;
  damage: number;
  abilityColor?: string;
}

export interface FloorTileSpawnedEvent {
  tileId: number;
  position: { x: number; y: number };
  color: string;
}

export interface FloorTileCollectedEvent {
  tileId: number;
  color: string;
}

export interface ComboChangedEvent {
  newComboCount: number;
}

export interface StartAudioEvent {
  trackId: string;
}

export interface MusicDataUpdatedEvent {
    intensity: number;
    beat: boolean;
}

export interface GameEventData {
  [GameEvent.EntityDied]: { entityId: number; isBoss: boolean };
  [GameEvent.SceneLoaded]: { sceneId: string };
  [GameEvent.TalentPointsGained]: { amount: number };
  [GameEvent.KeybindChanged]: { abilityId: string; newKey: string };
  [GameEvent.AbilityCasted]: AbilityCastedEvent;
  [GameEvent.PLAYER_ABILITY_USED]: { entityId: Entity; abilityId: string };
  [GameEvent.PlayerDashSuccess]: { cursorPosition: { x: number; y: number } };
  [GameEvent.PlayerDashFail]: void;
    [GameEvent.PlayerAbilityPause]: undefined;
  [GameEvent.PlayerAbilityFastForward]: undefined;
  [GameEvent.PlayerAbilityRewind]: undefined;
  [GameEvent.PlayerAbilityUltimate]: undefined;
  [GameEvent.EntityDamaged]: EntityDamagedEvent;
  [GameEvent.StartDialogue]: { dialogueId: string };
  [GameEvent.AdvanceDialogue]: undefined;
  [GameEvent.DialogueFinished]: { dialogueId: string };
  [GameEvent.ShowDialogueLine]: { text: string; speaker: string };
  [GameEvent.HideDialogue]: undefined;
  [GameEvent.GamePaused]: undefined;
  [GameEvent.GameResumed]: undefined;
  [GameEvent.FloorTileSpawned]: FloorTileSpawnedEvent;
  [GameEvent.FloorTileCollected]: FloorTileCollectedEvent;
  [GameEvent.ComboChanged]: ComboChangedEvent;
  [GameEvent.Beat]: { time: number; bpm: number };
  [GameEvent.StartAudio]: StartAudioEvent;
  [GameEvent.StopAudio]: undefined;
  [GameEvent.MusicDataUpdated]: MusicDataUpdatedEvent;
  qualia_updated: QualiaStateType;
  combo_updated: { combo: number };
  player_ability_cooldown_updated: { [key: string]: number };
  player_state_updated: { health: number; dashCharges: number };
  boss_state_updated: { health: number };
}