# QUALIA.CODE v1.1 - Backend Service Contracts
# Centralized exports for all service contracts and event types

from .events import (
    # Base
    BaseEvent,
    # Player Actions
    PlayerActionEvent,
    PlayerDashEvent,
    PlayerKeyPressEvent,
    PlayerAbilityActivatedEvent,
    # Qualia System
    QualiaGeneratedEvent,
    QualiaCollectedEvent,
    QualiaExpiredEvent,
    # Game State
    MetronomeTickEvent,
    ComboActivatedEvent,
    GameStateUpdatedEvent,
    ScoreUpdatedEvent,
    HealthChangedEvent,
    UltimateActivatedEvent,
    CooldownUpdatedEvent,
    # Boss AI
    BossPhaseChangedEvent,
    BossAttackEvent,
    # Music System
    SongNoteEvent,
    TempoChangedEvent,
    VolumeChangedEvent,
    # System
    ErrorEvent,
    # Helpers
    event_to_dict,
    dict_to_event,
)

__all__ = [
    # Base
    "BaseEvent",
    # Player Actions
    "PlayerActionEvent",
    "PlayerDashEvent",
    "PlayerKeyPressEvent",
    "PlayerAbilityActivatedEvent",
    # Qualia System
    "QualiaGeneratedEvent",
    "QualiaCollectedEvent",
    "QualiaExpiredEvent",
    # Game State
    "MetronomeTickEvent",
    "ComboActivatedEvent",
    "GameStateUpdatedEvent",
    "ScoreUpdatedEvent",
    "HealthChangedEvent",
    "UltimateActivatedEvent",
    "CooldownUpdatedEvent",
    # Boss AI
    "BossPhaseChangedEvent",
    "BossAttackEvent",
    # Music System
    "SongNoteEvent",
    "TempoChangedEvent",
    "VolumeChangedEvent",
    # System
    "ErrorEvent",
    # Helpers
    "event_to_dict",
    "dict_to_event",
]
