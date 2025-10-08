"""
QUALIA.CODE v1.1 - PersistenceService Implementation
Phase 2 Task 2.4: Leaderboard & Score Persistence

RESPONSIBILITIES (per ARCHITECTURE.GOLD.CODE):
- Save and load leaderboard entries
- Score validation (anti-cheat detection)
- Player statistics tracking
- JSON file persistence (SQLite-ready architecture)
- Thread-safe file operations
# mypy: disable-error-code="union-attr,no-any-return,operator"
# Rationale: Config is always initialized before use; MyPy cannot prove this statically

"""

import json
import logging
import os
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from threading import Lock
from typing import List, Optional, Dict, Any
import yaml

from .interfaces.IPersistenceService import IPersistenceService
from .interfaces.IFileSystemService import IFileSystemService
from .contracts.IPersistenceService_contracts import (
    LeaderboardEntry,
    PersistenceServiceConfig,
    ScoreValidationResult,
    SongStatistics,
    PlayerStatistics,
    StorageConfig,
    LeaderboardConfig,
    ScoreValidationThresholds
)
from backend.utils.decorators import log_execution, handle_errors


class PersistenceService(IPersistenceService):
    """
    Persistence service for leaderboard and score management.
    
    ARCHITECTURE NOTES:
    - Thread-safe file operations via Lock
    - JSON storage for simplicity (SQLite-ready design)
    - Score validation prevents cheating
    - Automatic pruning of old entries
    - Statistics calculation for analytics
    """
    
    def __init__(self, file_system_service: IFileSystemService) -> None:
        """Initialize PersistenceService with configuration.
        
        Args:
            file_system_service: FileSystemService for file operations (QUALIA.CODE §4 Platform Abstraction)
        """
        self._logger = logging.getLogger(__name__)
        self._file_system_service = file_system_service
        self._config: Optional[PersistenceServiceConfig] = None
        self._leaderboard: List[LeaderboardEntry] = []
        self._lock = Lock()  # Thread safety for file operations
        self._initialized = False
        self._storage_path: Optional[Path] = None
        self._last_backup: Optional[datetime] = None
        
        # Statistics cache
        self._stats_cache: Dict[str, Any] = {}
        self._stats_cache_time: Optional[datetime] = None
        
    @log_execution()
    @handle_errors()
    def initialize(self) -> bool:
        """
        Initialize persistence service.
        
        Creates storage directories and loads existing data.
        """
        try:
            # Load configuration using FileSystemService (QUALIA.CODE compliance)
            config_path = Path(__file__).parent.parent / "config" / "persistence.yaml"
            config_content = self._file_system_service.read_file(config_path)
            config_data = yaml.safe_load(config_content)
            
            # Parse configuration into dataclasses
            storage_cfg = StorageConfig(**config_data['storage'])
            leaderboard_cfg = LeaderboardConfig(**config_data['leaderboard'])
            validation_cfg = ScoreValidationThresholds(**config_data['validation'])
            
            self._config = PersistenceServiceConfig(
                storage=storage_cfg,
                leaderboard=leaderboard_cfg,
                validation=validation_cfg,
                enable_score_validation=config_data['features']['enable_score_validation'],
                enable_auto_backup=config_data['features']['enable_auto_backup'],
                enable_statistics=config_data['features']['enable_statistics']
            )
            
            # Create storage directories
            self._storage_path = Path(self._config.storage.storage_directory)
            self._storage_path.mkdir(parents=True, exist_ok=True)
            
            backup_path = Path(self._config.storage.backup_directory)
            backup_path.mkdir(parents=True, exist_ok=True)
            
            # Load existing leaderboard data using FileSystemService
            leaderboard_file = self._storage_path / self._config.storage.leaderboard_filename
            if self._file_system_service.exists(leaderboard_file):
                leaderboard_content = self._file_system_service.read_file(leaderboard_file)
                data = json.loads(leaderboard_content)
                self._leaderboard = [LeaderboardEntry.from_dict(entry) for entry in data]
                self._logger.info(f"Loaded {len(self._leaderboard)} leaderboard entries from disk")
            else:
                self._leaderboard = []
                self._logger.info("No existing leaderboard found, starting fresh")
            
            self._initialized = True
            self._logger.info("✅ PersistenceService initialized successfully")
            return True
            
        except Exception as e:
            self._logger.error(f"Failed to initialize PersistenceService: {e}")
            raise
    
    @log_execution()
    @handle_errors()
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
        """Save a new leaderboard entry with validation."""
        if not self._initialized:
            self._logger.error("PersistenceService not initialized")
            return False
        
        # Validate inputs
        if score < 0:
            self._logger.warning(f"Invalid score {score} (must be >= 0)")
            return False
        
        if not (0.0 <= difficulty_volume <= 1.0):
            self._logger.warning(f"Invalid difficulty {difficulty_volume} (must be 0.0-1.0)")
            return False
        
        # Score validation (if enabled and data available)
        if self._config.enable_score_validation and metadata:
            validation_result = self._validate_score_internal(
                score=score,
                song_duration=metadata.get('song_duration', 0),
                difficulty_volume=difficulty_volume,
                max_combo=metadata.get('max_combo', 0),
                notes_hit=metadata.get('notes_hit', 0),
                notes_total=metadata.get('notes_total', 1)
            )
            
            if not validation_result.is_valid:
                self._logger.warning(
                    f"Score validation failed: {validation_result.reason} "
                    f"(confidence: {validation_result.confidence:.2f})"
                )
                return False
        
        # Create entry
        entry = LeaderboardEntry(
            player_id=player_id,
            player_name=player_name,
            score=score,
            song_id=song_id,
            song_title=song_title,
            difficulty_volume=difficulty_volume,
            timestamp=timestamp or datetime.now(),
            max_combo=metadata.get('max_combo') if metadata else None,
            notes_hit=metadata.get('notes_hit') if metadata else None,
            notes_total=metadata.get('notes_total') if metadata else None,
            accuracy=metadata.get('accuracy') if metadata else None,
            song_duration=metadata.get('song_duration') if metadata else None,
            metadata=metadata or {}
        )
        
        # Thread-safe addition
        with self._lock:
            self._leaderboard.append(entry)
            
            # Prune if necessary
            self._prune_leaderboard()
            
            # Save to disk
            self._save_to_disk()
        
        self._logger.info(
            f"Saved leaderboard entry: {player_name} scored {score:.0f} "
            f"on {song_title} (difficulty: {difficulty_volume:.2f})"
        )
        
        # Auto-backup if enabled
        if self._config.enable_auto_backup:
            self._check_and_perform_backup()
        
        # Invalidate statistics cache
        self._stats_cache_time = None
        
        return True
    
    @log_execution()
    @handle_errors()
    def get_leaderboard(
        self,
        song_id: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
        difficulty_filter: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """Retrieve leaderboard entries with filtering and pagination."""
        if not self._initialized:
            self._logger.error("PersistenceService not initialized")
            return []
        
        with self._lock:
            # Filter entries
            filtered = self._leaderboard
            
            if song_id:
                filtered = [e for e in filtered if e.song_id == song_id]
            
            if difficulty_filter is not None:
                filtered = [e for e in filtered if abs(e.difficulty_volume - difficulty_filter) < 0.01]
            
            # Sort by score (descending)
            sorted_entries = sorted(filtered, key=lambda e: e.score, reverse=True)
            
            # Apply pagination
            paginated = sorted_entries[offset:offset + limit]
            
            # Convert to dict with rank
            result = []
            for i, entry in enumerate(paginated, start=offset + 1):
                entry_dict = entry.to_dict()
                entry_dict['rank'] = i
                result.append(entry_dict)
            
            return result
    
    @log_execution()
    @handle_errors()
    def get_player_best_score(
        self,
        player_id: str,
        song_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Get player's best score."""
        if not self._initialized:
            return None
        
        with self._lock:
            # Filter by player
            player_entries = [e for e in self._leaderboard if e.player_id == player_id]
            
            if not player_entries:
                return None
            
            # Filter by song if specified
            if song_id:
                player_entries = [e for e in player_entries if e.song_id == song_id]
            
            if not player_entries:
                return None
            
            # Get best score
            best = max(player_entries, key=lambda e: e.score)
            return best.to_dict()
    
    @log_execution()
    @handle_errors()
    def get_player_rank(
        self,
        player_id: str,
        song_id: Optional[str] = None,
        difficulty_volume: Optional[float] = None
    ) -> Optional[int]:
        """Get player's rank in leaderboard."""
        if not self._initialized:
            return None
        
        # Get full leaderboard
        leaderboard = self.get_leaderboard(
            song_id=song_id,
            limit=10000,  # Get all entries
            difficulty_filter=difficulty_volume
        )
        
        # Find player's rank
        for entry in leaderboard:
            if entry['player_id'] == player_id:
                return entry['rank']
        
        return None
    
    @log_execution()
    @handle_errors()
    def validate_score(
        self,
        score: float,
        song_duration: float,
        difficulty_volume: float,
        max_combo: int,
        notes_hit: int,
        notes_total: int
    ) -> bool:
        """Public score validation method."""
        result = self._validate_score_internal(
            score=score,
            song_duration=song_duration,
            difficulty_volume=difficulty_volume,
            max_combo=max_combo,
            notes_hit=notes_hit,
            notes_total=notes_total
        )
        return result.is_valid
    
    def _validate_score_internal(
        self,
        score: float,
        song_duration: float,
        difficulty_volume: float,
        max_combo: int,
        notes_hit: int,
        notes_total: int
    ) -> ScoreValidationResult:
        """
        Internal score validation with detailed result.
        
        VALIDATION RULES:
        - Score must not exceed theoretical maximum
        - Accuracy must be reasonable
        - Points per second must be within limits
        - Combo contribution must be reasonable
        """
        # Calculate accuracy
        accuracy = notes_hit / max(notes_total, 1)
        
        # Theoretical max score (simplified formula)
        # Based on: base_points_per_note * notes_total * combo_multiplier
        base_points_per_note = 100.0 * difficulty_volume
        theoretical_max = (
            base_points_per_note * notes_total * 
            self._config.validation.max_combo_multiplier
        )
        
        # Points per second check
        if song_duration > 0:
            points_per_second = score / song_duration
            if points_per_second > self._config.validation.max_score_per_second:
                return ScoreValidationResult(
                    is_valid=False,
                    reason=f"Score rate too high: {points_per_second:.0f} points/sec "
                           f"(max: {self._config.validation.max_score_per_second})",
                    theoretical_max_score=theoretical_max,
                    actual_score=score,
                    confidence=0.2
                )
        
        # Theoretical max check
        if score > theoretical_max:
            return ScoreValidationResult(
                is_valid=False,
                reason=f"Score exceeds theoretical maximum: {score:.0f} > {theoretical_max:.0f}",
                theoretical_max_score=theoretical_max,
                actual_score=score,
                confidence=0.0
            )
        
        # Accuracy check (high scores require good accuracy)
        score_ratio = score / theoretical_max
        if score_ratio > 0.7 and accuracy < self._config.validation.min_accuracy_for_high_score:
            return ScoreValidationResult(
                is_valid=False,
                reason=f"High score requires better accuracy: {accuracy:.1%} "
                       f"(min: {self._config.validation.min_accuracy_for_high_score:.1%})",
                theoretical_max_score=theoretical_max,
                actual_score=score,
                confidence=0.3
            )
        
        # Suspicious score check (flag for review)
        if score_ratio > self._config.validation.suspicious_score_threshold:
            self._logger.warning(
                f"Suspicious score flagged for review: {score:.0f} "
                f"({score_ratio:.1%} of theoretical max)"
            )
            return ScoreValidationResult(
                is_valid=True,  # Still valid, but flagged
                reason="Score is suspiciously high (manual review recommended)",
                theoretical_max_score=theoretical_max,
                actual_score=score,
                confidence=0.6
            )
        
        # All checks passed
        return ScoreValidationResult(
            is_valid=True,
            theoretical_max_score=theoretical_max,
            actual_score=score,
            confidence=1.0
        )
    
    @log_execution()
    @handle_errors()
    def get_song_statistics(self, song_id: str) -> Dict[str, Any]:
        """Get aggregate statistics for a song."""
        if not self._initialized or not self._config.enable_statistics:
            return {}
        
        with self._lock:
            song_entries = [e for e in self._leaderboard if e.song_id == song_id]
            
            if not song_entries:
                return {"song_id": song_id, "total_plays": 0}
            
            # Calculate statistics
            scores = [e.score for e in song_entries]
            unique_players = len(set(e.player_id for e in song_entries))
            
            # Difficulty distribution
            difficulty_dist: Dict[str, int] = {}
            for entry in song_entries:
                diff_key = f"{entry.difficulty_volume:.1f}"
                difficulty_dist[diff_key] = difficulty_dist.get(diff_key, 0) + 1
            
            return {
                "song_id": song_id,
                "total_plays": len(song_entries),
                "average_score": sum(scores) / len(scores),
                "highest_score": max(scores),
                "lowest_score": min(scores),
                "unique_players": unique_players,
                "difficulty_distribution": difficulty_dist
            }
    
    @log_execution()
    @handle_errors()
    def get_player_statistics(self, player_id: str) -> Dict[str, Any]:
        """Get aggregate statistics for a player."""
        if not self._initialized or not self._config.enable_statistics:
            return {}
        
        with self._lock:
            player_entries = [e for e in self._leaderboard if e.player_id == player_id]
            
            if not player_entries:
                return {"player_id": player_id, "total_plays": 0}
            
            # Calculate statistics
            scores = [e.score for e in player_entries]
            unique_songs = len(set(e.song_id for e in player_entries))
            difficulties = [e.difficulty_volume for e in player_entries]
            timestamps = [e.timestamp for e in player_entries]
            
            return {
                "player_id": player_id,
                "player_name": player_entries[0].player_name,
                "total_plays": len(player_entries),
                "total_score": sum(scores),
                "average_score": sum(scores) / len(scores),
                "best_score": max(scores),
                "songs_played": unique_songs,
                "average_difficulty": sum(difficulties) / len(difficulties),
                "first_play": min(timestamps).isoformat(),
                "last_play": max(timestamps).isoformat()
            }
    
    @log_execution()
    @handle_errors()
    def clear_leaderboard(self, song_id: Optional[str] = None) -> bool:
        """Clear leaderboard entries (DESTRUCTIVE)."""
        with self._lock:
            if song_id:
                # Remove entries for specific song
                before_count = len(self._leaderboard)
                self._leaderboard = [e for e in self._leaderboard if e.song_id != song_id]
                after_count = len(self._leaderboard)
                self._logger.warning(
                    f"Cleared {before_count - after_count} entries for song {song_id}"
                )
            else:
                # Clear all entries
                count = len(self._leaderboard)
                self._leaderboard = []
                self._logger.warning(f"Cleared all {count} leaderboard entries")
            
            self._save_to_disk()
            self._stats_cache_time = None
            return True
    
    @log_execution()
    @handle_errors()
    def backup_data(self, backup_path: str) -> bool:
        """Create a backup of leaderboard data."""
        try:
            with self._lock:
                source = self._storage_path / self._config.storage.leaderboard_filename
                if not source.exists():
                    self._logger.warning("No data to backup")
                    return False
                
                shutil.copy2(source, backup_path)
                self._logger.info(f"Backup created: {backup_path}")
                return True
        except Exception as e:
            self._logger.error(f"Backup failed: {e}")
            return False
    
    @log_execution()
    @handle_errors()
    def restore_data(self, backup_path: str) -> bool:
        """Restore data from backup."""
        try:
            if not Path(backup_path).exists():
                self._logger.error(f"Backup file not found: {backup_path}")
                return False
            
            with self._lock:
                # Load backup data using FileSystemService (QUALIA.CODE compliance)
                backup_content = self._file_system_service.read_file(backup_path)
                data = json.loads(backup_content)
                self._leaderboard = [LeaderboardEntry.from_dict(entry) for entry in data]
                
                # Save to current location
                self._save_to_disk()
                self._logger.info(f"Data restored from backup: {backup_path}")
                self._stats_cache_time = None
                return True
        except Exception as e:
            self._logger.error(f"Restore failed: {e}")
            return False
    
    @log_execution()
    @handle_errors()
    def shutdown(self) -> bool:
        """Gracefully shut down service."""
        if not self._initialized:
            return True
        
        try:
            # Final save
            with self._lock:
                self._save_to_disk()
            
            self._logger.info("PersistenceService shut down successfully")
            return True
        except Exception as e:
            self._logger.error(f"Shutdown failed: {e}")
            return False
    
    @log_execution()
    @handle_errors()
    def get_statistics(self) -> Dict[str, Any]:
        """Get service statistics."""
        if not self._initialized:
            return {}
        
        with self._lock:
            if not self._leaderboard:
                return {
                    "total_entries": 0,
                    "unique_players": 0,
                    "unique_songs": 0,
                    "storage_size_bytes": 0
                }
            
            timestamps = [e.timestamp for e in self._leaderboard]
            unique_players = len(set(e.player_id for e in self._leaderboard))
            unique_songs = len(set(e.song_id for e in self._leaderboard))
            
            # Get file size
            leaderboard_file = self._storage_path / self._config.storage.leaderboard_filename
            file_size = leaderboard_file.stat().st_size if leaderboard_file.exists() else 0
            
            return {
                "total_entries": len(self._leaderboard),
                "unique_players": unique_players,
                "unique_songs": unique_songs,
                "oldest_entry": min(timestamps).isoformat(),
                "newest_entry": max(timestamps).isoformat(),
                "storage_size_bytes": file_size
            }
    
    # ============================================================================
    # PRIVATE HELPER METHODS
    # ============================================================================
    
    def _save_to_disk(self) -> None:
        """Save leaderboard to JSON file (thread-safe, must be called within lock)."""
        try:
            leaderboard_file = self._storage_path / self._config.storage.leaderboard_filename
            data = [entry.to_dict() for entry in self._leaderboard]
            
            # Write atomically using FileSystemService (write to temp file, then rename)
            temp_file = leaderboard_file.with_suffix('.tmp')
            json_content = json.dumps(data, indent=2)
            self._file_system_service.write_file(temp_file, json_content)
            
            temp_file.replace(leaderboard_file)
            self._logger.debug(f"Saved {len(self._leaderboard)} entries to disk")
        except Exception as e:
            self._logger.error(f"Failed to save to disk: {e}")
            raise
    
    def _prune_leaderboard(self) -> None:
        """Prune old/excess entries (thread-safe, must be called within lock)."""
        if not self._config.leaderboard.prune_old_entries:
            return
        
        # Remove old entries
        cutoff_date = datetime.now() - timedelta(days=self._config.leaderboard.prune_after_days)
        before_count = len(self._leaderboard)
        self._leaderboard = [e for e in self._leaderboard if e.timestamp > cutoff_date]
        
        if len(self._leaderboard) < before_count:
            self._logger.info(f"Pruned {before_count - len(self._leaderboard)} old entries")
        
        # Enforce global entry limit
        if len(self._leaderboard) > self._config.leaderboard.max_entries_global:
            # Sort by score and keep top entries
            self._leaderboard.sort(key=lambda e: e.score, reverse=True)
            self._leaderboard = self._leaderboard[:self._config.leaderboard.max_entries_global]
            self._logger.info(f"Pruned to {self._config.leaderboard.max_entries_global} entries")
    
    def _check_and_perform_backup(self) -> None:
        """Check if auto-backup is due and perform it."""
        if not self._config.enable_auto_backup:
            return
        
        # Check if backup is due
        if self._last_backup:
            hours_since_backup = (datetime.now() - self._last_backup).total_seconds() / 3600
            if hours_since_backup < self._config.storage.auto_backup_interval_hours:
                return
        
        # Perform backup
        backup_dir = Path(self._config.storage.backup_directory)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = backup_dir / f"leaderboard_backup_{timestamp}.json"
        
        if self.backup_data(str(backup_path)):
            self._last_backup = datetime.now()
            
            # Prune old backups
            self._prune_backups(backup_dir)
    
    def _prune_backups(self, backup_dir: Path) -> None:
        """Keep only the most recent N backups."""
        backups = sorted(backup_dir.glob("leaderboard_backup_*.json"))
        
        if len(backups) > self._config.storage.max_backup_count:
            # Remove oldest backups
            for backup in backups[:-self._config.storage.max_backup_count]:
                backup.unlink()
                self._logger.debug(f"Removed old backup: {backup.name}")
