# QUALIA.CODE v1.1 - Backend Event Contracts
# Single source of truth for all backend event types
# Eliminates circular dependencies and provides type safety

from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Union
from datetime import datetime


@dataclass
class BaseEvent:
    """Base event class for all system events."""
    type: str
    timestamp: float
    source: str
    metadata: Optional[Dict[str, Any]] = None
    correlation_id: Optional[str] = None


# ============================================================================
# PLAYER ACTION EVENTS
# ============================================================================

class PlayerActionEvent(BaseEvent):
    """Base class for all player action events."""
    player_id: str
    action_type: str  # 'dash', 'key_press', 'ability_activate'
    action_data: Dict[str, Any]


class PlayerDashEvent(PlayerActionEvent):
    """Event emitted when player performs a dash."""
    def __init__(
        self,
        player_id: str,
        position: Dict[str, float],  # {'x': float, 'y': float}
        direction: Dict[str, float],  # {'x': float, 'y': float}
        on_beat: bool,  # True if dash was on metronome beat
        timestamp: float,
        source: str = "InputManager",
        metadata: Optional[Dict[str, Any]] = None
    ):
        BaseEvent.__init__(
            self,
            type="PlayerAction.Dash",
            timestamp=timestamp,
            source=source,
            metadata=metadata
        )
        self.player_id = player_id
        self.action_type = "dash"
        self.action_data = {
            "position": position,
            "direction": direction,
            "on_beat": on_beat
        }


class PlayerKeyPressEvent(PlayerActionEvent):
    """Event emitted when player presses a musical ability key (Q-E-R-T-F-G-C)."""
    def __init__(
        self,
        player_id: str,
        key: str,  # 'Q', 'E', 'R', 'T', 'F', 'G', 'C'
        note: str,  # Musical note: 'C', 'D', 'E', 'F', 'G', 'A', 'B'
        timestamp: float,
        on_beat: bool = False,
        source: str = "InputManager",
        metadata: Optional[Dict[str, Any]] = None
    ):
        BaseEvent.__init__(
            self,
            type="PlayerAction.KeyPress",
            timestamp=timestamp,
            source=source,
            metadata=metadata
        )
        self.player_id = player_id
        self.action_type = "key_press"
        self.action_data = {
            "key": key,
            "note": note,
            "on_beat": on_beat
        }


class PlayerAbilityActivatedEvent(PlayerActionEvent):
    """Event emitted when player activates a special ability (combo or ultimate)."""
    def __init__(
        self,
        player_id: str,
        ability_type: str,  # 'combo', 'ultimate'
        ability_id: str,
        timestamp: float,
        source: str = "GameLogicService",
        metadata: Optional[Dict[str, Any]] = None
    ):
        BaseEvent.__init__(
            self,
            type="PlayerAction.AbilityActivated",
            timestamp=timestamp,
            source=source,
            metadata=metadata
        )
        self.player_id = player_id
        self.action_type = "ability_activate"
        self.action_data = {
            "ability_type": ability_type,
            "ability_id": ability_id
        }


# ============================================================================
# QUALIA SYSTEM EVENTS
# ============================================================================

class QualiaGeneratedEvent(BaseEvent):
    """Event emitted when Qualia is generated in the game world."""
    def __init__(
        self,
        qualia_id: str,
        position: Dict[str, float],
        color: Dict[str, float],  # RGB values
        source_type: str,  # 'dash', 'ability', 'metronome', 'boss'
        value: float,
        timestamp: float,
        source: str = "GameLogicService",
        metadata: Optional[Dict[str, Any]] = None
    ):
        BaseEvent.__init__(

            self,
            type="Qualia.Generated",
            timestamp=timestamp,
            source=source,
            metadata=metadata
        )
        self.qualia_id = qualia_id
        self.position = position
        self.color = color
        self.source_type = source_type
        self.value = value


class QualiaCollectedEvent(BaseEvent):
    """Event emitted when player collects Qualia."""
    def __init__(
        self,
        player_id: str,
        qualia_id: str,
        value: float,
        collection_time: float,  # Time since generation (ms)
        perfect_timing: bool,  # True if collected within optimal window
        timestamp: float,
        source: str = "GameLogicService",
        metadata: Optional[Dict[str, Any]] = None
    ):
        BaseEvent.__init__(

            self,
            type="Qualia.Collected",
            timestamp=timestamp,
            source=source,
            metadata=metadata
        )
        self.player_id = player_id
        self.qualia_id = qualia_id
        self.value = value
        self.collection_time = collection_time
        self.perfect_timing = perfect_timing


class QualiaExpiredEvent(BaseEvent):
    """Event emitted when Qualia expires (not collected in time)."""
    def __init__(
        self,
        qualia_id: str,
        lifetime: float,  # How long it existed (ms)
        timestamp: float,
        source: str = "GameLogicService",
        metadata: Optional[Dict[str, Any]] = None
    ):
        BaseEvent.__init__(

            self,
            type="Qualia.Expired",
            timestamp=timestamp,
            source=source,
            metadata=metadata
        )
        self.qualia_id = qualia_id
        self.lifetime = lifetime


# ============================================================================
# GAME STATE EVENTS
# ============================================================================

class MetronomeTickEvent(BaseEvent):
    """Event emitted on each metronome beat."""
    def __init__(
        self,
        beat_number: int,
        bpm: float,
        timestamp: float,
        source: str = "AudioEngine",
        metadata: Optional[Dict[str, Any]] = None
    ):
        BaseEvent.__init__(

            self,
            type="Game.MetronomeTick",
            timestamp=timestamp,
            source=source,
            metadata=metadata
        )
        self.beat_number = beat_number
        self.bpm = bpm


class ComboActivatedEvent(BaseEvent):
    """Event emitted when a combo is activated (harmonic or chaotic)."""
    def __init__(
        self,
        player_id: str,
        combo_id: str,
        combo_type: str,  # 'harmonic', 'chaotic'
        combo_sequence: List[str],  # Keys pressed
        effect_id: str,
        effect_description: str,
        timestamp: float,
        source: str = "GameLogicService",
        metadata: Optional[Dict[str, Any]] = None
    ):
        BaseEvent.__init__(

            self,
            type="Game.ComboActivated",
            timestamp=timestamp,
            source=source,
            metadata=metadata
        )
        self.player_id = player_id
        self.combo_id = combo_id
        self.combo_type = combo_type
        self.combo_sequence = combo_sequence
        self.effect_id = effect_id
        self.effect_description = effect_description


class GameStateUpdatedEvent(BaseEvent):
    """Event emitted when the overall game state changes."""
    def __init__(
        self,
        state: str,  # 'menu', 'playing', 'paused', 'game_over', 'victory'
        previous_state: Optional[str],
        timestamp: float,
        source: str = "GameControllerService",
        metadata: Optional[Dict[str, Any]] = None
    ):
        BaseEvent.__init__(

            self,
            type="Game.StateUpdated",
            timestamp=timestamp,
            source=source,
            metadata=metadata
        )
        self.state = state
        self.previous_state = previous_state


class ScoreUpdatedEvent(BaseEvent):
    """Event emitted when player's score changes."""
    def __init__(
        self,
        player_id: str,
        new_score: int,
        score_delta: int,
        reason: str,  # 'qualia_collected', 'combo_multiplier', 'perfect_timing', etc.
        timestamp: float,
        source: str = "GameLogicService",
        metadata: Optional[Dict[str, Any]] = None
    ):
        BaseEvent.__init__(

            self,
            type="Game.ScoreUpdated",
            timestamp=timestamp,
            source=source,
            metadata=metadata
        )
        self.player_id = player_id
        self.new_score = new_score
        self.score_delta = score_delta
        self.reason = reason


class HealthChangedEvent(BaseEvent):
    """Event emitted when player or boss health changes."""
    def __init__(
        self,
        entity_id: str,  # player_id or boss_id
        entity_type: str,  # 'player' or 'boss'
        new_health: float,
        health_delta: float,
        reason: str,  # 'damage', 'healing', 'combo_effect', etc.
        timestamp: float,
        source: str = "GameLogicService",
        metadata: Optional[Dict[str, Any]] = None
    ):
        BaseEvent.__init__(

            self,
            type="Game.HealthChanged",
            timestamp=timestamp,
            source=source,
            metadata=metadata
        )
        self.entity_id = entity_id
        self.entity_type = entity_type
        self.new_health = new_health
        self.health_delta = health_delta
        self.reason = reason


class UltimateActivatedEvent(BaseEvent):
    """Event emitted when player activates ultimate ability (x40 combo)."""
    def __init__(
        self,
        player_id: str,
        duration: float,  # Duration in seconds
        timestamp: float,
        source: str = "GameLogicService",
        metadata: Optional[Dict[str, Any]] = None
    ):
        BaseEvent.__init__(

            self,
            type="Game.UltimateActivated",
            timestamp=timestamp,
            source=source,
            metadata=metadata
        )
        self.player_id = player_id
        self.duration = duration


class CooldownUpdatedEvent(BaseEvent):
    """Event emitted when ability cooldown changes."""
    def __init__(
        self,
        player_id: str,
        ability_key: str,  # 'Q', 'E', 'R', etc.
        cooldown_remaining: float,  # Seconds
        timestamp: float,
        source: str = "GameLogicService",
        metadata: Optional[Dict[str, Any]] = None
    ):
        BaseEvent.__init__(

            self,
            type="Game.CooldownUpdated",
            timestamp=timestamp,
            source=source,
            metadata=metadata
        )
        self.player_id = player_id
        self.ability_key = ability_key
        self.cooldown_remaining = cooldown_remaining


# ============================================================================
# BOSS AI EVENTS
# ============================================================================

class BossPhaseChangedEvent(BaseEvent):
    """Event emitted when boss enters a new phase."""
    def __init__(
        self,
        boss_id: str,
        new_phase: int,
        phase_description: str,
        timestamp: float,
        source: str = "BossAIService",
        metadata: Optional[Dict[str, Any]] = None
    ):
        BaseEvent.__init__(

            self,
            type="Boss.PhaseChanged",
            timestamp=timestamp,
            source=source,
            metadata=metadata
        )
        self.boss_id = boss_id
        self.new_phase = new_phase
        self.phase_description = phase_description


class BossAttackEvent(BaseEvent):
    """Event emitted when boss launches an attack."""
    def __init__(
        self,
        boss_id: str,
        attack_id: str,
        pattern_id: str,
        telegraph_duration: float,  # Seconds
        timestamp: float,
        source: str = "BossAIService",
        metadata: Optional[Dict[str, Any]] = None
    ):
        BaseEvent.__init__(

            self,
            type="Boss.Attack",
            timestamp=timestamp,
            source=source,
            metadata=metadata
        )
        self.boss_id = boss_id
        self.attack_id = attack_id
        self.pattern_id = pattern_id
        self.telegraph_duration = telegraph_duration


class BossAggressionChangedEvent(BaseEvent):
    """Event emitted when boss aggression level changes significantly."""
    def __init__(
        self,
        boss_id: str,
        old_aggression: float,  # 0.0-1.0
        new_aggression: float,  # 0.0-1.0
        aggression_tier: str,  # 'passive', 'cautious', 'normal', 'aggressive', 'enraged'
        factors: Dict[str, float],  # Contributing factors: volume, tempo, harmony, combo
        timestamp: float,
        source: str = "BossAIService",
        metadata: Optional[Dict[str, Any]] = None
    ):
        BaseEvent.__init__(
            self,
            type="Boss.AggressionChanged",
            timestamp=timestamp,
            source=source,
            metadata=metadata
        )
        self.boss_id = boss_id
        self.old_aggression = old_aggression
        self.new_aggression = new_aggression
        self.aggression_tier = aggression_tier
        self.factors = factors


class BossPatternSelectedEvent(BaseEvent):
    """Event emitted when boss AI selects a new attack pattern."""
    def __init__(
        self,
        boss_id: str,
        pattern_id: str,
        pattern_type: str,  # 'projectile', 'melee', 'aoe', 'movement', 'special'
        pattern_name: str,
        selection_context: Dict[str, Any],  # Why this pattern was chosen
        timestamp: float,
        source: str = "BossAIService",
        metadata: Optional[Dict[str, Any]] = None
    ):
        BaseEvent.__init__(
            self,
            type="Boss.PatternSelected",
            timestamp=timestamp,
            source=source,
            metadata=metadata
        )
        self.boss_id = boss_id
        self.pattern_id = pattern_id
        self.pattern_type = pattern_type
        self.pattern_name = pattern_name
        self.selection_context = selection_context


class BossEnragedEvent(BaseEvent):
    """Event emitted when boss enters enrage mode."""
    def __init__(
        self,
        boss_id: str,
        time_remaining: float,  # Seconds left in song
        enrage_multipliers: Dict[str, float],  # Aggression, telegraph, frequency boosts
        timestamp: float,
        source: str = "BossAIService",
        metadata: Optional[Dict[str, Any]] = None
    ):
        BaseEvent.__init__(
            self,
            type="Boss.Enraged",
            timestamp=timestamp,
            source=source,
            metadata=metadata
        )
        self.boss_id = boss_id
        self.time_remaining = time_remaining
        self.enrage_multipliers = enrage_multipliers


class BossVulnerableEvent(BaseEvent):
    """Event emitted when boss becomes vulnerable after an attack."""
    def __init__(
        self,
        boss_id: str,
        vulnerability_duration: float,  # Seconds
        damage_multiplier: float,  # Damage multiplier during vulnerability
        can_be_neutralized: bool,  # Can harmonic combos neutralize boss
        timestamp: float,
        source: str = "BossAIService",
        metadata: Optional[Dict[str, Any]] = None
    ):
        BaseEvent.__init__(
            self,
            type="Boss.Vulnerable",
            timestamp=timestamp,
            source=source,
            metadata=metadata
        )
        self.boss_id = boss_id
        self.vulnerability_duration = vulnerability_duration
        self.damage_multiplier = damage_multiplier
        self.can_be_neutralized = can_be_neutralized


# ============================================================================
# MUSIC SYSTEM EVENTS
# ============================================================================

class SongNoteEvent(BaseEvent):
    """Event emitted when a note in the song is played."""
    def __init__(
        self,
        note: str,  # Musical note: 'C', 'D', 'E', 'F', 'G', 'A', 'B'
        octave: int,
        duration: float,  # Seconds
        timestamp: float,
        source: str = "AudioEngine",
        metadata: Optional[Dict[str, Any]] = None
    ):
        BaseEvent.__init__(

            self,
            type="Music.SongNote",
            timestamp=timestamp,
            source=source,
            metadata=metadata
        )
        self.note = note
        self.octave = octave
        self.duration = duration


class TempoChangedEvent(BaseEvent):
    """Event emitted when song tempo changes."""
    def __init__(
        self,
        new_bpm: float,
        previous_bpm: float,
        timestamp: float,
        source: str = "AudioEngine",
        metadata: Optional[Dict[str, Any]] = None
    ):
        BaseEvent.__init__(

            self,
            type="Music.TempoChanged",
            timestamp=timestamp,
            source=source,
            metadata=metadata
        )
        self.new_bpm = new_bpm
        self.previous_bpm = previous_bpm


class VolumeChangedEvent(BaseEvent):
    """Event emitted when volume (difficulty) changes."""
    def __init__(
        self,
        new_volume: float,  # 0.0 to 1.0
        difficulty_level: str,  # 'training', 'normal', 'hard', 'extreme'
        timestamp: float,
        source: str = "AudioEngine",
        metadata: Optional[Dict[str, Any]] = None
    ):
        BaseEvent.__init__(

            self,
            type="Music.VolumeChanged",
            timestamp=timestamp,
            source=source,
            metadata=metadata
        )
        self.new_volume = new_volume
        self.difficulty_level = difficulty_level


# ============================================================================
# HARMONY ANALYSIS EVENTS
# ============================================================================

class HarmonyScoreCalculatedEvent(BaseEvent):
    """Event emitted when harmony score is calculated."""
    def __init__(
        self,
        player_id: str,
        harmony_score: float,  # 0.0-1.0
        is_harmonic: bool,  # True if score >= threshold
        song_harmony: float,  # Harmony with song notes
        qualia_harmony: float,  # Harmony with collected qualia
        player_notes: List[str],  # Recent player notes
        song_notes: List[str],  # Current song notes
        qualia_notes: List[str],  # Notes from collected qualia
        timestamp: float,
        source: str = "HarmonyAnalysisService",
        metadata: Optional[Dict[str, Any]] = None
    ):
        BaseEvent.__init__(
            self,
            type="Harmony.ScoreCalculated",
            timestamp=timestamp,
            source=source,
            metadata=metadata
        )
        self.player_id = player_id
        self.harmony_score = harmony_score
        self.is_harmonic = is_harmonic
        self.song_harmony = song_harmony
        self.qualia_harmony = qualia_harmony
        self.player_notes = player_notes
        self.song_notes = song_notes
        self.qualia_notes = qualia_notes


class HarmonicPatternDetectedEvent(BaseEvent):
    """Event emitted when a harmonic (consonant) pattern is detected."""
    def __init__(
        self,
        player_id: str,
        pattern_type: str,  # e.g., 'perfect_fifth', 'major_third', 'consonant_triad'
        notes: List[str],  # Notes in the pattern
        harmony_score: float,
        timestamp: float,
        source: str = "HarmonyAnalysisService",
        metadata: Optional[Dict[str, Any]] = None
    ):
        BaseEvent.__init__(
            self,
            type="Harmony.HarmonicPatternDetected",
            timestamp=timestamp,
            source=source,
            metadata=metadata
        )
        self.player_id = player_id
        self.pattern_type = pattern_type
        self.notes = notes
        self.harmony_score = harmony_score


class ChaoticPatternDetectedEvent(BaseEvent):
    """Event emitted when a chaotic (dissonant) pattern is detected."""
    def __init__(
        self,
        player_id: str,
        pattern_type: str,  # e.g., 'tritone', 'minor_second', 'dissonant_cluster'
        notes: List[str],  # Notes in the pattern
        chaos_score: float,  # Inverted harmony score (1.0 - harmony)
        timestamp: float,
        source: str = "HarmonyAnalysisService",
        metadata: Optional[Dict[str, Any]] = None
    ):
        BaseEvent.__init__(
            self,
            type="Harmony.ChaoticPatternDetected",
            timestamp=timestamp,
            source=source,
            metadata=metadata
        )
        self.player_id = player_id
        self.pattern_type = pattern_type
        self.notes = notes
        self.chaos_score = chaos_score


# ============================================================================
# SYSTEM EVENTS
# ============================================================================

class ErrorEvent(BaseEvent):
    """Event emitted when an error occurs."""
    def __init__(
        self,
        error_type: str,
        error_message: str,
        error_code: Optional[str],
        stack_trace: Optional[str],
        timestamp: float,
        source: str,
        metadata: Optional[Dict[str, Any]] = None
    ):
        BaseEvent.__init__(

            self,
            type="System.Error",
            timestamp=timestamp,
            source=source,
            metadata=metadata
        )
        self.error_type = error_type
        self.error_message = error_message
        self.error_code = error_code
        self.stack_trace = stack_trace


# ============================================================================
# GAME STATE EVENTS - PHASE 6.1
# ============================================================================

class GameStateChangedEvent(BaseEvent):
    """Event emitted when game state changes (PHASE 6.1 - Full System Integration)"""
    def __init__(
        self,
        combat_state: Dict[str, Any],  # Complete CombatState dict
        timestamp: float,
        source: str = "GameLogicService",
        metadata: Optional[Dict[str, Any]] = None
    ):
        BaseEvent.__init__(
            self,
            type="GameStateChanged",
            timestamp=timestamp,
            source=source,
            metadata=metadata
        )
        self.combat_state = combat_state


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def event_to_dict(event: BaseEvent) -> Dict[str, Any]:
    """Convert an event to a dictionary for serialization."""
    return {
        "type": event.type,
        "timestamp": event.timestamp,
        "source": event.source,
        "metadata": event.metadata,
        "correlation_id": event.correlation_id,
        **{k: v for k, v in event.__dict__.items() if k not in ['type', 'timestamp', 'source', 'metadata', 'correlation_id']}
    }


def dict_to_event(data: Dict[str, Any]) -> BaseEvent:
    """Convert a dictionary back to an event object."""
    event_type: str = data.get('type', 'Unknown')
    
    # Map event types to their classes
    event_map = {
        "PlayerAction.Dash": PlayerDashEvent,
        "PlayerAction.KeyPress": PlayerKeyPressEvent,
        "PlayerAction.AbilityActivated": PlayerAbilityActivatedEvent,
        "Qualia.Generated": QualiaGeneratedEvent,
        "Qualia.Collected": QualiaCollectedEvent,
        "Qualia.Expired": QualiaExpiredEvent,
        "Game.MetronomeTick": MetronomeTickEvent,
        "Game.ComboActivated": ComboActivatedEvent,
        "Game.StateUpdated": GameStateUpdatedEvent,
        "Game.ScoreUpdated": ScoreUpdatedEvent,
        "Game.HealthChanged": HealthChangedEvent,
        "Game.UltimateActivated": UltimateActivatedEvent,
        "Game.CooldownUpdated": CooldownUpdatedEvent,
        "Boss.PhaseChanged": BossPhaseChangedEvent,
        "Boss.Attack": BossAttackEvent,
        "Boss.AggressionChanged": BossAggressionChangedEvent,
        "Boss.PatternSelected": BossPatternSelectedEvent,
        "Boss.Enraged": BossEnragedEvent,
        "Boss.Vulnerable": BossVulnerableEvent,
        "Music.SongNote": SongNoteEvent,
        "Music.TempoChanged": TempoChangedEvent,
        "Music.VolumeChanged": VolumeChangedEvent,
        "Harmony.ScoreCalculated": HarmonyScoreCalculatedEvent,
        "Harmony.HarmonicPatternDetected": HarmonicPatternDetectedEvent,
        "Harmony.ChaoticPatternDetected": ChaoticPatternDetectedEvent,
        "System.Error": ErrorEvent,
        "GameStateChanged": GameStateChangedEvent,  # PHASE 6.1
    }
    
    event_class = event_map.get(event_type, BaseEvent)
    
    # For base event, just create it directly
    if event_class == BaseEvent:
        return BaseEvent(
            type=data['type'],
            timestamp=data['timestamp'],
            source=data['source'],
            metadata=data.get('metadata'),
            correlation_id=data.get('correlation_id')
        )
    
    # For specific events, this would need more complex deserialization
    # For now, return a base event with the data attached
    base_event = BaseEvent(
        type=data['type'],
        timestamp=data['timestamp'],
        source=data['source'],
        metadata=data.get('metadata'),
        correlation_id=data.get('correlation_id')
    )
    # Attach additional fields
    for key, value in data.items():
        if key not in ['type', 'timestamp', 'source', 'metadata', 'correlation_id']:
            setattr(base_event, key, value)
    
    return base_event
