"""
QUALIA.CODE v1.1 - IPersistenceService Data Contracts
Phase 2 Task 2.4: Data structures for persistence service
"""

from dataclasses import dataclass, field
from typing import Optional, Dict, Any
from datetime import datetime


# ============================================================================
# LEADERBOARD DATA STRUCTURES
# ============================================================================

@dataclass
class LeaderboardEntry:
    """
    Represents a single leaderboard entry.
    
    ARCHITECTURE NOTE:
    - Matches ILeaderboardEntry from shared contracts
    - Includes additional metadata for analytics
    - JSON-serializable for file storage
    """
    player_id: str
    player_name: str
    score: float
    song_id: str
    song_title: str
    difficulty_volume: float
    timestamp: datetime
    
    # Optional metadata
    max_combo: Optional[int] = None
    notes_hit: Optional[int] = None
    notes_total: Optional[int] = None
    accuracy: Optional[float] = None  # notes_hit / notes_total
    song_duration: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to JSON-serializable dict."""
        return {
            "player_id": self.player_id,
            "player_name": self.player_name,
            "score": self.score,
            "song_id": self.song_id,
            "song_title": self.song_title,
            "difficulty_volume": self.difficulty_volume,
            "timestamp": self.timestamp.isoformat(),
            "max_combo": self.max_combo,
            "notes_hit": self.notes_hit,
            "notes_total": self.notes_total,
            "accuracy": self.accuracy,
            "song_duration": self.song_duration,
            "metadata": self.metadata or {}
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "LeaderboardEntry":
        """Create from JSON-deserialized dict."""
        return cls(
            player_id=data["player_id"],
            player_name=data["player_name"],
            score=data["score"],
            song_id=data["song_id"],
            song_title=data["song_title"],
            difficulty_volume=data["difficulty_volume"],
            timestamp=datetime.fromisoformat(data["timestamp"]),
            max_combo=data.get("max_combo"),
            notes_hit=data.get("notes_hit"),
            notes_total=data.get("notes_total"),
            accuracy=data.get("accuracy"),
            song_duration=data.get("song_duration"),
            metadata=data.get("metadata", {})
        )


# ============================================================================
# VALIDATION CONFIGURATION
# ============================================================================

@dataclass
class ScoreValidationThresholds:
    """
    Anti-cheat validation thresholds.
    
    Used to detect impossible or suspicious scores.
    """
    max_score_per_second: float = 2000.0  # Max points per second
    max_combo_multiplier: float = 5.0     # Max combo multiplier
    min_accuracy_for_high_score: float = 0.7  # Min 70% accuracy for top scores
    max_accuracy: float = 1.0              # Perfect accuracy cap
    suspicious_score_threshold: float = 0.95  # Flag if exceeds 95% of theoretical max


# ============================================================================
# SERVICE CONFIGURATION
# ============================================================================

@dataclass
class StorageConfig:
    """
    Storage configuration for persistence service.
    """
    storage_directory: str = "./data/leaderboard"
    leaderboard_filename: str = "leaderboard.json"
    backup_directory: str = "./data/backups"
    max_backup_count: int = 5
    auto_backup_interval_hours: int = 24


@dataclass
class LeaderboardConfig:
    """
    Leaderboard behavior configuration.
    """
    max_entries_per_song: int = 1000
    max_entries_global: int = 10000
    prune_old_entries: bool = True
    prune_after_days: int = 365  # Keep entries for 1 year
    allow_duplicate_players: bool = True  # Same player can have multiple entries
    min_score_threshold: float = 1000.0  # Minimum score to save


@dataclass
class PersistenceServiceConfig:
    """
    Complete configuration for PersistenceService.
    
    EXTERNALIZED TO: backend/config/persistence.yaml
    """
    storage: StorageConfig = field(default_factory=StorageConfig)
    leaderboard: LeaderboardConfig = field(default_factory=LeaderboardConfig)
    validation: ScoreValidationThresholds = field(default_factory=ScoreValidationThresholds)
    
    # Feature flags
    enable_score_validation: bool = True
    enable_auto_backup: bool = True
    enable_statistics: bool = True


# ============================================================================
# STATISTICS DATA STRUCTURES
# ============================================================================

@dataclass
class SongStatistics:
    """Aggregate statistics for a song."""
    song_id: str
    total_plays: int = 0
    average_score: float = 0.0
    highest_score: float = 0.0
    lowest_score: float = 0.0
    unique_players: int = 0
    difficulty_distribution: Dict[str, int] = field(default_factory=dict)


@dataclass
class PlayerStatistics:
    """Aggregate statistics for a player."""
    player_id: str
    player_name: str
    total_plays: int = 0
    total_score: float = 0.0
    average_score: float = 0.0
    best_score: float = 0.0
    songs_played: int = 0
    average_difficulty: float = 0.0
    first_play: Optional[datetime] = None
    last_play: Optional[datetime] = None


# ============================================================================
# VALIDATION RESULT
# ============================================================================

@dataclass
class ScoreValidationResult:
    """
    Result of score validation check.
    """
    is_valid: bool
    reason: Optional[str] = None
    theoretical_max_score: Optional[float] = None
    actual_score: Optional[float] = None
    confidence: float = 1.0  # 0.0 (very suspicious) to 1.0 (definitely legit)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dict for logging."""
        return {
            "is_valid": self.is_valid,
            "reason": self.reason,
            "theoretical_max_score": self.theoretical_max_score,
            "actual_score": self.actual_score,
            "confidence": self.confidence
        }
