# QUALIA.CODE v1.1 - Backend Event Contracts
# Single source of truth for all backend event types
# Eliminates circular dependencies and provides type safety

from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Union
from datetime import datetime


@dataclass
class BaseEvent:
    """Base event class for all system events."""
    type: str = ""
    timestamp: float = 0.0
    source: str = ""
    metadata: Optional[Dict[str, Any]] = None
    correlation_id: Optional[str] = None


# ============================================================================
# PLAYER ACTION EVENTS
# ============================================================================

@dataclass
class PlayerActionEvent(BaseEvent):
    """Base class for all player action events.
    
    Inherits from BaseEvent (type, timestamp, source, metadata, correlation_id).
    Adds player-specific action data.
    """
    player_id: str = ""
    action_type: str = ""  # 'dash', 'key_press', 'ability_activate'
    action_data: Dict[str, Any] = None  # type: ignore

    def __post_init__(self) -> None:
        if self.action_data is None:
            self.action_data = {}


@dataclass
class PlayerDashEvent(PlayerActionEvent):
    """Event emitted when player performs a dash."""
    position: Dict[str, float] = None  # type: ignore # {'x': float, 'y': float}
    direction: Dict[str, float] = None  # type: ignore # {'x': float, 'y': float}
    on_beat: bool = False  # True if dash was on metronome beat

    def __post_init__(self) -> None:
        super().__post_init__()
        if self.type == "":
            self.type = "PlayerAction.Dash"
        if self.source == "":
            self.source = "InputManager"
        if self.action_type == "":
            self.action_type = "dash"
        if self.position is not None and self.direction is not None and "position" not in self.action_data:
            self.action_data.update({
                "position": self.position,
                "direction": self.direction,
                "on_beat": self.on_beat
            })


@dataclass
class PlayerKeyPressEvent(PlayerActionEvent):
    """Event emitted when player presses a musical ability key (Q-E-R-T-F-G-C)."""
    key: str = ""  # 'Q', 'E', 'R', 'T', 'F', 'G', 'C'
    note: str = ""  # Musical note: 'C', 'D', 'E', 'F', 'G', 'A', 'B'
    on_beat: bool = False

    def __post_init__(self) -> None:
        super().__post_init__()
        if self.type == "":
            self.type = "PlayerAction.KeyPress"
        if self.source == "":
            self.source = "InputManager"
        if self.action_type == "":
            self.action_type = "key_press"
        if self.key and "key" not in self.action_data:
            self.action_data.update({
                "key": self.key,
                "note": self.note,
                "on_beat": self.on_beat
            })


@dataclass
class PlayerAbilityActivatedEvent(PlayerActionEvent):
    """Event emitted when player activates a special ability (combo or ultimate)."""
    ability_type: str = ""  # 'combo', 'ultimate'
    ability_id: str = ""

    def __post_init__(self) -> None:
        super().__post_init__()
        if self.type == "":
            self.type = "PlayerAction.AbilityActivated"
        if self.source == "":
            self.source = "GameLogicService"
        if self.action_type == "":
            self.action_type = "ability_activate"
        if self.ability_type and "ability_type" not in self.action_data:
            self.action_data.update({
                "ability_type": self.ability_type,
                "ability_id": self.ability_id
            })


# ============================================================================
# QUALIA SYSTEM EVENTS
# ============================================================================

@dataclass
class QualiaGeneratedEvent(BaseEvent):
    """Event emitted when Qualia is generated in the game world."""
    qualia_id: str = ""
    position: Dict[str, float] = None  # type: ignore
    color: Dict[str, float] = None  # type: ignore # RGB values
    source_type: str = ""  # 'dash', 'ability', 'metronome', 'boss'
    value: float = 0.0

    def __post_init__(self) -> None:
        if self.type == "":
            self.type = "Qualia.Generated"
        if self.source == "":
            self.source = "GameLogicService"


@dataclass
class QualiaCollectedEvent(BaseEvent):
    """Event emitted when player collects Qualia."""
    player_id: str = ""
    qualia_id: str = ""
    value: float = 0.0
    collection_time: float = 0.0  # Time since generation (ms)
    perfect_timing: bool = False  # True if collected within optimal window

    def __post_init__(self) -> None:
        if self.type == "":
            self.type = "Qualia.Collected"
        if self.source == "":
            self.source = "GameLogicService"


@dataclass
class QualiaExpiredEvent(BaseEvent):
    """Event emitted when Qualia expires (not collected in time)."""
    qualia_id: str = ""
    lifetime: float = 0.0  # How long it existed (ms)

    def __post_init__(self) -> None:
        if self.type == "":
            self.type = "Qualia.Expired"
        if self.source == "":
            self.source = "GameLogicService"


# ============================================================================
# GAME STATE EVENTS
# ============================================================================

@dataclass
class MetronomeTickEvent(BaseEvent):
    """Event emitted on each metronome beat."""
    beat_number: int = 0
    bpm: float = 0.0

    def __post_init__(self) -> None:
        if self.type == "":
            self.type = "Game.MetronomeTick"
        if self.source == "":
            self.source = "AudioEngine"


@dataclass
class ComboActivatedEvent(BaseEvent):
    """Event emitted when a combo is activated (harmonic or chaotic)."""
    player_id: str = ""
    combo_id: str = ""
    combo_type: str = ""  # 'harmonic', 'chaotic'
    combo_sequence: List[str] = None  # type: ignore # Keys pressed
    effect_id: str = ""
    effect_description: str = ""

    def __post_init__(self) -> None:
        if self.combo_sequence is None:
            self.combo_sequence = []
        if self.type == "":
            self.type = "Game.ComboActivated"
        if self.source == "":
            self.source = "GameLogicService"


@dataclass
class GameStateUpdatedEvent(BaseEvent):
    """Event emitted when the overall game state changes."""
    state: str = ""  # 'menu', 'playing', 'paused', 'game_over', 'victory'
    previous_state: Optional[str] = None

    def __post_init__(self) -> None:
        if self.type == "":
            self.type = "Game.StateUpdated"
        if self.source == "":
            self.source = "GameControllerService"


@dataclass
class ScoreUpdatedEvent(BaseEvent):
    """Event emitted when player's score changes."""
    player_id: str = ""
    new_score: int = 0
    score_delta: int = 0
    reason: str = ""  # 'qualia_collected', 'combo_multiplier', 'perfect_timing', etc.

    def __post_init__(self) -> None:
        if self.type == "":
            self.type = "Game.ScoreUpdated"
        if self.source == "":
            self.source = "GameLogicService"


@dataclass
class HealthChangedEvent(BaseEvent):
    """Event emitted when player or boss health changes."""
    entity_id: str = ""  # player_id or boss_id
    entity_type: str = ""  # 'player' or 'boss'
    new_health: float = 0.0
    health_delta: float = 0.0
    reason: str = ""  # 'damage', 'healing', 'combo_effect', etc.

    def __post_init__(self) -> None:
        if self.type == "":
            self.type = "Game.HealthChanged"
        if self.source == "":
            self.source = "GameLogicService"


@dataclass
class UltimateActivatedEvent(BaseEvent):
    """Event emitted when player activates ultimate ability (x40 combo)."""
    player_id: str = ""
    duration: float = 0.0  # Duration in seconds

    def __post_init__(self) -> None:
        if self.type == "":
            self.type = "Game.UltimateActivated"
        if self.source == "":
            self.source = "GameLogicService"


@dataclass
class CooldownUpdatedEvent(BaseEvent):
    """Event emitted when ability cooldown changes."""
    player_id: str = ""
    ability_key: str = ""  # 'Q', 'E', 'R', etc.
    cooldown_remaining: float = 0.0  # Seconds

    def __post_init__(self) -> None:
        if self.type == "":
            self.type = "Game.CooldownUpdated"
        if self.source == "":
            self.source = "GameLogicService"


# ============================================================================
# BOSS AI EVENTS
# ============================================================================

@dataclass
class BossPhaseChangedEvent(BaseEvent):
    """Event emitted when boss enters a new phase."""
    boss_id: str = ""
    new_phase: int = 0
    phase_description: str = ""

    def __post_init__(self) -> None:
        if self.type == "":
            self.type = "Boss.PhaseChanged"
        if self.source == "":
            self.source = "BossAIService"


@dataclass
class BossAttackEvent(BaseEvent):
    """Event emitted when boss launches an attack."""
    boss_id: str = ""
    attack_id: str = ""
    pattern_id: str = ""
    telegraph_duration: float = 0.0  # Seconds

    def __post_init__(self) -> None:
        if self.type == "":
            self.type = "Boss.Attack"
        if self.source == "":
            self.source = "BossAIService"


@dataclass
class BossAggressionChangedEvent(BaseEvent):
    """Event emitted when boss aggression level changes significantly."""
    boss_id: str = ""
    old_aggression: float = 0.0  # 0.0-1.0
    new_aggression: float = 0.0  # 0.0-1.0
    aggression_tier: str = ""  # 'passive', 'cautious', 'normal', 'aggressive', 'enraged'
    factors: Dict[str, float] = None  # type: ignore # Contributing factors: volume, tempo, harmony, combo

    def __post_init__(self) -> None:
        if self.factors is None:
            self.factors = {}
        if self.type == "":
            self.type = "Boss.AggressionChanged"
        if self.source == "":
            self.source = "BossAIService"


@dataclass
class BossPatternSelectedEvent(BaseEvent):
    """Event emitted when boss AI selects a new attack pattern."""
    boss_id: str = ""
    pattern_id: str = ""
    pattern_type: str = ""  # 'projectile', 'melee', 'aoe', 'movement', 'special'
    pattern_name: str = ""
    selection_context: Dict[str, Any] = None  # type: ignore # Why this pattern was chosen

    def __post_init__(self) -> None:
        if self.selection_context is None:
            self.selection_context = {}
        if self.type == "":
            self.type = "Boss.PatternSelected"
        if self.source == "":
            self.source = "BossAIService"


@dataclass
class BossEnragedEvent(BaseEvent):
    """Event emitted when boss enters enrage mode."""
    boss_id: str = ""
    time_remaining: float = 0.0  # Seconds left in song
    enrage_multipliers: Dict[str, float] = None  # type: ignore # Aggression, telegraph, frequency boosts

    def __post_init__(self) -> None:
        if self.enrage_multipliers is None:
            self.enrage_multipliers = {}
        if self.type == "":
            self.type = "Boss.Enraged"
        if self.source == "":
            self.source = "BossAIService"


@dataclass
class BossVulnerableEvent(BaseEvent):
    """Event emitted when boss becomes vulnerable after an attack."""
    boss_id: str = ""
    vulnerability_duration: float = 0.0  # Seconds
    damage_multiplier: float = 1.0  # Damage multiplier during vulnerability
    can_be_neutralized: bool = False  # Can harmonic combos neutralize boss

    def __post_init__(self) -> None:
        if self.type == "":
            self.type = "Boss.Vulnerable"
        if self.source == "":
            self.source = "BossAIService"


# ============================================================================
# MUSIC SYSTEM EVENTS
# ============================================================================

@dataclass
class SongNoteEvent(BaseEvent):
    """Event emitted when a note in the song is played."""
    note: str = ""  # Musical note: 'C', 'D', 'E', 'F', 'G', 'A', 'B'
    octave: int = 0
    duration: float = 0.0  # Seconds

    def __post_init__(self) -> None:
        if self.type == "":
            self.type = "Music.SongNote"
        if self.source == "":
            self.source = "AudioEngine"


@dataclass
class TempoChangedEvent(BaseEvent):
    """Event emitted when song tempo changes."""
    new_bpm: float = 0.0
    previous_bpm: float = 0.0

    def __post_init__(self) -> None:
        if self.type == "":
            self.type = "Music.TempoChanged"
        if self.source == "":
            self.source = "AudioEngine"


@dataclass
class VolumeChangedEvent(BaseEvent):
    """Event emitted when volume (difficulty) changes."""
    new_volume: float = 0.0  # 0.0 to 1.0
    difficulty_level: str = ""  # 'training', 'normal', 'hard', 'extreme'

    def __post_init__(self) -> None:
        if self.type == "":
            self.type = "Music.VolumeChanged"
        if self.source == "":
            self.source = "AudioEngine"


# ============================================================================
# HARMONY ANALYSIS EVENTS
# ============================================================================

@dataclass
class HarmonyScoreCalculatedEvent(BaseEvent):
    """Event emitted when harmony score is calculated."""
    player_id: str = ""
    harmony_score: float = 0.0  # 0.0-1.0
    is_harmonic: bool = False  # True if score >= threshold
    song_harmony: float = 0.0  # Harmony with song notes
    qualia_harmony: float = 0.0  # Harmony with collected qualia
    player_notes: List[str] = None  # type: ignore # Recent player notes
    song_notes: List[str] = None  # type: ignore # Current song notes
    qualia_notes: List[str] = None  # type: ignore # Notes from collected qualia

    def __post_init__(self) -> None:
        if self.player_notes is None:
            self.player_notes = []
        if self.song_notes is None:
            self.song_notes = []
        if self.qualia_notes is None:
            self.qualia_notes = []
        if self.type == "":
            self.type = "Harmony.ScoreCalculated"
        if self.source == "":
            self.source = "HarmonyAnalysisService"


@dataclass
class HarmonicPatternDetectedEvent(BaseEvent):
    """Event emitted when a harmonic (consonant) pattern is detected."""
    player_id: str = ""
    pattern_type: str = ""  # e.g., 'perfect_fifth', 'major_third', 'consonant_triad'
    notes: List[str] = None  # type: ignore # Notes in the pattern
    harmony_score: float = 0.0

    def __post_init__(self) -> None:
        if self.notes is None:
            self.notes = []
        if self.type == "":
            self.type = "Harmony.HarmonicPatternDetected"
        if self.source == "":
            self.source = "HarmonyAnalysisService"


@dataclass
class ChaoticPatternDetectedEvent(BaseEvent):
    """Event emitted when a chaotic (dissonant) pattern is detected."""
    player_id: str = ""
    pattern_type: str = ""  # e.g., 'tritone', 'minor_second', 'dissonant_cluster'
    notes: List[str] = None  # type: ignore # Notes in the pattern
    chaos_score: float = 0.0  # Inverted harmony score (1.0 - harmony)

    def __post_init__(self) -> None:
        if self.notes is None:
            self.notes = []
        if self.type == "":
            self.type = "Harmony.ChaoticPatternDetected"
        if self.source == "":
            self.source = "HarmonyAnalysisService"


# ============================================================================
# SYSTEM EVENTS
# ============================================================================

@dataclass
class ErrorEvent(BaseEvent):
    """Event emitted when an error occurs."""
    error_type: str = ""
    error_message: str = ""
    error_code: Optional[str] = None
    stack_trace: Optional[str] = None

    def __post_init__(self) -> None:
        if self.type == "":
            self.type = "System.Error"


# ============================================================================
# GAME STATE EVENTS - PHASE 6.1
# ============================================================================

@dataclass
class GameStateChangedEvent(BaseEvent):
    """Event emitted when game state changes (PHASE 6.1 - Full System Integration)"""
    combat_state: Dict[str, Any] = None  # type: ignore # Complete CombatState dict

    def __post_init__(self) -> None:
        if self.combat_state is None:
            self.combat_state = {}
        if self.type == "":
            self.type = "GameStateChanged"
        if self.source == "":
            self.source = "GameLogicService"


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
