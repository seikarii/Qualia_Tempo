"""
QUALIA.CODE v1.1 - IPersistenceService Interface
Phase 2 Task 2.4: Persistence & Leaderboard System

RESPONSIBILITIES:
- Save and load leaderboard entries
- Score validation (anti-cheat)
- Player best score tracking
- Difficulty volume tracking
- JSON file persistence (SQLite-ready architecture)
"""

from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from datetime import datetime


class IPersistenceService(ABC):
    """
    Interface for persistence operations (leaderboard, scores, player data).
    
    ARCHITECTURE NOTE:
    - Current implementation uses JSON files for simplicity
    - Design is SQLite/PostgreSQL-ready for future migration
    - All operations are thread-safe
    - Score validation prevents cheating
    """
    
    # ============================================================================
    # LEADERBOARD OPERATIONS
    # ============================================================================
    
    @abstractmethod
    def save_leaderboard_entry(
        self,
        player_id: str,
        player_name: str,
        score: float,
        song_id: str,
        song_title: str,
        difficulty_volume: float,
        timestamp: Optional[datetime] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Save a new leaderboard entry.
        
        Args:
            player_id: Unique player identifier
            player_name: Display name
            score: Final score achieved
            song_id: Unique song identifier
            song_title: Display song title
            difficulty_volume: Difficulty level (0.0-1.0)
            timestamp: Entry timestamp (defaults to now)
            metadata: Additional data (combo, accuracy, etc.)
            
        Returns:
            True if saved successfully, False otherwise
            
        VALIDATION:
        - Score must be >= 0
        - Difficulty volume must be in [0.0, 1.0]
        - Validates score is within expected range for song/difficulty
        """
        pass
    
    @abstractmethod
    def get_leaderboard(
        self,
        song_id: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
        difficulty_filter: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """
        Retrieve leaderboard entries.
        
        Args:
            song_id: Filter by specific song (None = global leaderboard)
            limit: Maximum entries to return
            offset: Pagination offset
            difficulty_filter: Filter by difficulty volume (exact match)
            
        Returns:
            List of leaderboard entries sorted by score (descending)
            
        RETURN FORMAT:
        [
            {
                "player_id": "uuid",
                "player_name": "Charlie",
                "score": 150000.0,
                "song_id": "song_001",
                "song_title": "Hell's Symphony",
                "difficulty_volume": 0.8,
                "timestamp": "2025-10-08T10:30:00",
                "rank": 1,
                "metadata": {...}
            },
            ...
        ]
        """
        pass
    
    @abstractmethod
    def get_player_best_score(
        self,
        player_id: str,
        song_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Get player's best score for a song or globally.
        
        Args:
            player_id: Player identifier
            song_id: Specific song (None = best score across all songs)
            
        Returns:
            Best score entry or None if player has no scores
        """
        pass
    
    @abstractmethod
    def get_player_rank(
        self,
        player_id: str,
        song_id: Optional[str] = None,
        difficulty_volume: Optional[float] = None
    ) -> Optional[int]:
        """
        Get player's rank in leaderboard.
        
        Args:
            player_id: Player identifier
            song_id: Specific song (None = global rank)
            difficulty_volume: Specific difficulty (None = all difficulties)
            
        Returns:
            Rank (1-indexed) or None if player not found
        """
        pass
    
    # ============================================================================
    # SCORE VALIDATION (ANTI-CHEAT)
    # ============================================================================
    
    @abstractmethod
    def validate_score(
        self,
        score: float,
        song_duration: float,
        difficulty_volume: float,
        max_combo: int,
        notes_hit: int,
        notes_total: int
    ) -> bool:
        """
        Validate if a score is legitimate (anti-cheat).
        
        Args:
            score: Claimed score
            song_duration: Song length in seconds
            difficulty_volume: Difficulty level
            max_combo: Maximum combo achieved
            notes_hit: Notes successfully hit
            notes_total: Total notes in song
            
        Returns:
            True if score is valid, False if suspicious
            
        VALIDATION RULES:
        - Score must not exceed theoretical maximum
        - Accuracy (notes_hit/notes_total) must match score
        - Combo contribution must be reasonable
        - Time-per-note must be within expected range
        """
        pass
    
    # ============================================================================
    # STATISTICS & ANALYTICS
    # ============================================================================
    
    @abstractmethod
    def get_song_statistics(self, song_id: str) -> Dict[str, Any]:
        """
        Get aggregate statistics for a song.
        
        Returns:
            {
                "song_id": "song_001",
                "total_plays": 150,
                "average_score": 75000.0,
                "highest_score": 200000.0,
                "unique_players": 50,
                "difficulty_distribution": {
                    "0.5": 30,  # 30 plays at 50% difficulty
                    "0.8": 80,
                    "1.0": 40
                }
            }
        """
        pass
    
    @abstractmethod
    def get_player_statistics(self, player_id: str) -> Dict[str, Any]:
        """
        Get aggregate statistics for a player.
        
        Returns:
            {
                "player_id": "uuid",
                "total_plays": 25,
                "total_score": 1500000.0,
                "average_score": 60000.0,
                "best_score": 200000.0,
                "songs_played": 10,
                "average_difficulty": 0.75
            }
        """
        pass
    
    # ============================================================================
    # DATA MANAGEMENT
    # ============================================================================
    
    @abstractmethod
    def clear_leaderboard(self, song_id: Optional[str] = None) -> bool:
        """
        Clear leaderboard entries.
        
        Args:
            song_id: Specific song (None = clear all)
            
        Returns:
            True if successful
            
        WARNING: This is destructive. Use with caution.
        """
        pass
    
    @abstractmethod
    def backup_data(self, backup_path: str) -> bool:
        """
        Create a backup of all persistence data.
        
        Args:
            backup_path: Path to backup file
            
        Returns:
            True if backup successful
        """
        pass
    
    @abstractmethod
    def restore_data(self, backup_path: str) -> bool:
        """
        Restore data from backup.
        
        Args:
            backup_path: Path to backup file
            
        Returns:
            True if restore successful
        """
        pass
    
    # ============================================================================
    # SERVICE LIFECYCLE
    # ============================================================================
    
    @abstractmethod
    def initialize(self) -> bool:
        """
        Initialize persistence service (create directories, load data).
        
        Returns:
            True if initialization successful
        """
        pass
    
    @abstractmethod
    def shutdown(self) -> bool:
        """
        Gracefully shut down service (flush pending writes).
        
        Returns:
            True if shutdown successful
        """
        pass
    
    @abstractmethod
    def get_statistics(self) -> Dict[str, Any]:
        """
        Get service statistics.
        
        Returns:
            {
                "total_entries": 500,
                "unique_players": 75,
                "unique_songs": 15,
                "oldest_entry": "2025-01-01T00:00:00",
                "newest_entry": "2025-10-08T10:30:00",
                "storage_size_bytes": 102400
            }
        """
        pass
