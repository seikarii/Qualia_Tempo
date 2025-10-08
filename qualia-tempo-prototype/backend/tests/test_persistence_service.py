"""
QUALIA.CODE v1.1 - PersistenceService Test Suite
Phase 2 Task 2.4: Comprehensive Testing

TARGET: >85% coverage
METHODOLOGY: Isolated unit tests with TestCompositionRootFactory (QUALIA.CODE compliance)
"""

import pytest
import json
import tempfile
import shutil
from pathlib import Path
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock

from backend.tests.test_composition_root import TestCompositionRootFactory
from backend.services.contracts.IPersistenceService_contracts import (
    LeaderboardEntry,
    ScoreValidationResult
)


# ============================================================================
# FIXTURES
# ============================================================================

@pytest.fixture
def temp_storage_dir():
    """Create a temporary storage directory for tests."""
    temp_dir = tempfile.mkdtemp()
    yield temp_dir
    shutil.rmtree(temp_dir)


@pytest.fixture
def mock_config_file(temp_storage_dir):
    """Create a mock configuration file."""
    config_content = f"""
storage:
  storage_directory: "{temp_storage_dir}/data"
  leaderboard_filename: "leaderboard.json"
  backup_directory: "{temp_storage_dir}/backups"
  max_backup_count: 5
  auto_backup_interval_hours: 24

leaderboard:
  max_entries_per_song: 1000
  max_entries_global: 10000
  prune_old_entries: true
  prune_after_days: 365
  allow_duplicate_players: true
  min_score_threshold: 1000.0

validation:
  max_score_per_second: 2000.0
  max_combo_multiplier: 5.0
  min_accuracy_for_high_score: 0.70
  max_accuracy: 1.0
  suspicious_score_threshold: 0.95

features:
  enable_score_validation: true
  enable_auto_backup: true
  enable_statistics: true
  enable_caching: false
"""
    
    config_dir = Path(__file__).parent.parent / "config"
    config_dir.mkdir(exist_ok=True)
    config_file = config_dir / "persistence.yaml"
    
    with open(config_file, 'w') as f:
        f.write(config_content)
    
    yield config_file
    
    # Cleanup
    if config_file.exists():
        config_file.unlink()


@pytest.fixture
def mocked_composition_root(mock_config_file):
    """Create mocked CompositionRoot for testing (QUALIA.CODE compliance)."""
    # mock_config_file ensures config exists before creating CompositionRoot
    return TestCompositionRootFactory.create_mocked_composition_root()


@pytest.fixture
def persistence_service(mocked_composition_root):
    """Get PersistenceService from CompositionRoot (QUALIA.CODE compliant)."""
    service = mocked_composition_root.get_service("persistence_service")
    yield service
    service.shutdown()


@pytest.fixture
def sample_entry_data():
    """Sample leaderboard entry data."""
    return {
        "player_id": "player_001",
        "player_name": "TestPlayer",
        "score": 10000.0,
        "song_id": "song_001",
        "song_title": "Test Song",
        "difficulty_volume": 0.8,
        "metadata": {
            "max_combo": 100,
            "notes_hit": 95,
            "notes_total": 100,
            "accuracy": 0.95,
            "song_duration": 180.0
        }
    }


# ============================================================================
# INITIALIZATION TESTS
# ============================================================================

class TestPersistenceServiceInitialization:
    """Test service initialization."""
    
    def test_initialization_success(self, mock_config_file):
        """Test successful initialization (QUALIA.CODE compliant)."""
        composition_root = TestCompositionRootFactory.create_mocked_composition_root()
        service = composition_root.get_service("persistence_service")
        
        # Service is already initialized by TestCompositionRootFactory
        assert service._initialized is True
        assert service._config is not None
        assert service._storage_path is not None
        
        service.shutdown()
    
    def test_initialization_creates_directories(self, mock_config_file, temp_storage_dir):
        """Test that initialization creates necessary directories (QUALIA.CODE compliant)."""
        composition_root = TestCompositionRootFactory.create_mocked_composition_root()
        service = composition_root.get_service("persistence_service")
        
        storage_path = Path(temp_storage_dir) / "data"
        backup_path = Path(temp_storage_dir) / "backups"
        
        assert storage_path.exists()
        assert backup_path.exists()
        
        service.shutdown()
    
    def test_initialization_loads_existing_data(self, mock_config_file, temp_storage_dir):
        """Test that initialization loads existing leaderboard data."""
        # Create existing leaderboard file
        storage_path = Path(temp_storage_dir) / "data"
        storage_path.mkdir(parents=True, exist_ok=True)
        
        existing_data = [
            {
                "player_id": "player_001",
                "player_name": "ExistingPlayer",
                "score": 5000.0,
                "song_id": "song_001",
                "song_title": "Existing Song",
                "difficulty_volume": 0.7,
                "timestamp": datetime.now().isoformat(),
                "metadata": {}
            }
        ]
        
        with open(storage_path / "leaderboard.json", 'w') as f:
            json.dump(existing_data, f)
        
        # Initialize service (QUALIA.CODE compliant)
        composition_root = TestCompositionRootFactory.create_mocked_composition_root()
        service = composition_root.get_service("persistence_service")
        
        assert len(service._leaderboard) == 1
        assert service._leaderboard[0].player_id == "player_001"
        
        service.shutdown()


# ============================================================================
# SAVE LEADERBOARD ENTRY TESTS
# ============================================================================

class TestSaveLeaderboardEntry:
    """Test saving leaderboard entries."""
    
    def test_save_valid_entry(self, persistence_service, sample_entry_data):
        """Test saving a valid leaderboard entry."""
        result = persistence_service.save_leaderboard_entry(**sample_entry_data)
        
        assert result is True
        assert len(persistence_service._leaderboard) == 1
        assert persistence_service._leaderboard[0].player_id == "player_001"
    
    def test_save_negative_score_fails(self, persistence_service, sample_entry_data):
        """Test that negative scores are rejected."""
        sample_entry_data['score'] = -1000.0
        result = persistence_service.save_leaderboard_entry(**sample_entry_data)
        
        assert result is False
        assert len(persistence_service._leaderboard) == 0
    
    def test_save_invalid_difficulty_fails(self, persistence_service, sample_entry_data):
        """Test that invalid difficulty values are rejected."""
        sample_entry_data['difficulty_volume'] = 1.5
        result = persistence_service.save_leaderboard_entry(**sample_entry_data)
        
        assert result is False
        assert len(persistence_service._leaderboard) == 0
    
    def test_save_multiple_entries(self, persistence_service):
        """Test saving multiple entries."""
        for i in range(5):
            result = persistence_service.save_leaderboard_entry(
                player_id=f"player_{i:03d}",
                player_name=f"Player{i}",
                score=1000.0 * (i + 1),
                song_id="song_001",
                song_title="Test Song",
                difficulty_volume=0.8
            )
            assert result is True
        
        assert len(persistence_service._leaderboard) == 5
    
    def test_save_persists_to_disk(self, persistence_service, sample_entry_data):
        """Test that entries are persisted to disk."""
        persistence_service.save_leaderboard_entry(**sample_entry_data)
        
        leaderboard_file = persistence_service._storage_path / "leaderboard.json"
        assert leaderboard_file.exists()
        
        with open(leaderboard_file, 'r') as f:
            data = json.load(f)
            assert len(data) == 1
            assert data[0]['player_id'] == "player_001"


# ============================================================================
# GET LEADERBOARD TESTS
# ============================================================================

class TestGetLeaderboard:
    """Test leaderboard retrieval."""
    
    def test_get_empty_leaderboard(self, persistence_service):
        """Test getting leaderboard when empty."""
        result = persistence_service.get_leaderboard()
        assert result == []
    
    def test_get_leaderboard_sorted_by_score(self, persistence_service):
        """Test that leaderboard is sorted by score descending."""
        # Add entries in random order
        scores = [3000, 5000, 1000, 4000, 2000]
        for i, score in enumerate(scores):
            persistence_service.save_leaderboard_entry(
                player_id=f"player_{i}",
                player_name=f"Player{i}",
                score=float(score),
                song_id="song_001",
                song_title="Test Song",
                difficulty_volume=0.8
            )
        
        leaderboard = persistence_service.get_leaderboard()
        
        assert len(leaderboard) == 5
        assert leaderboard[0]['score'] == 5000.0
        assert leaderboard[1]['score'] == 4000.0
        assert leaderboard[4]['score'] == 1000.0
    
    def test_get_leaderboard_with_ranks(self, persistence_service):
        """Test that leaderboard includes ranks."""
        for i in range(3):
            persistence_service.save_leaderboard_entry(
                player_id=f"player_{i}",
                player_name=f"Player{i}",
                score=float(1000 * (3 - i)),
                song_id="song_001",
                song_title="Test Song",
                difficulty_volume=0.8
            )
        
        leaderboard = persistence_service.get_leaderboard()
        
        assert leaderboard[0]['rank'] == 1
        assert leaderboard[1]['rank'] == 2
        assert leaderboard[2]['rank'] == 3
    
    def test_get_leaderboard_filtered_by_song(self, persistence_service):
        """Test filtering leaderboard by song."""
        persistence_service.save_leaderboard_entry(
            player_id="player_001", player_name="Player1",
            score=1000.0, song_id="song_001", song_title="Song 1",
            difficulty_volume=0.8
        )
        persistence_service.save_leaderboard_entry(
            player_id="player_002", player_name="Player2",
            score=2000.0, song_id="song_002", song_title="Song 2",
            difficulty_volume=0.8
        )
        
        leaderboard = persistence_service.get_leaderboard(song_id="song_001")
        
        assert len(leaderboard) == 1
        assert leaderboard[0]['song_id'] == "song_001"
    
    def test_get_leaderboard_pagination(self, persistence_service):
        """Test leaderboard pagination."""
        for i in range(10):
            persistence_service.save_leaderboard_entry(
                player_id=f"player_{i}",
                player_name=f"Player{i}",
                score=float(1000 * (10 - i)),
                song_id="song_001",
                song_title="Test Song",
                difficulty_volume=0.8
            )
        
        # Get first page
        page1 = persistence_service.get_leaderboard(limit=5, offset=0)
        assert len(page1) == 5
        assert page1[0]['rank'] == 1
        assert page1[4]['rank'] == 5
        
        # Get second page
        page2 = persistence_service.get_leaderboard(limit=5, offset=5)
        assert len(page2) == 5
        assert page2[0]['rank'] == 6
        assert page2[4]['rank'] == 10


# ============================================================================
# PLAYER QUERIES TESTS
# ============================================================================

class TestPlayerQueries:
    """Test player-specific queries."""
    
    def test_get_player_best_score_exists(self, persistence_service):
        """Test getting player's best score."""
        persistence_service.save_leaderboard_entry(
            player_id="player_001", player_name="Player1",
            score=1000.0, song_id="song_001", song_title="Song 1",
            difficulty_volume=0.8
        )
        persistence_service.save_leaderboard_entry(
            player_id="player_001", player_name="Player1",
            score=2000.0, song_id="song_001", song_title="Song 1",
            difficulty_volume=0.8
        )
        
        best = persistence_service.get_player_best_score("player_001")
        
        assert best is not None
        assert best['score'] == 2000.0
    
    def test_get_player_best_score_not_found(self, persistence_service):
        """Test getting best score for non-existent player."""
        result = persistence_service.get_player_best_score("nonexistent")
        assert result is None
    
    def test_get_player_rank(self, persistence_service):
        """Test getting player's rank."""
        for i in range(5):
            persistence_service.save_leaderboard_entry(
                player_id=f"player_{i}",
                player_name=f"Player{i}",
                score=float(1000 * (5 - i)),
                song_id="song_001",
                song_title="Test Song",
                difficulty_volume=0.8
            )
        
        rank = persistence_service.get_player_rank("player_2")
        assert rank == 3  # 3rd highest score
    
    def test_get_player_rank_not_found(self, persistence_service):
        """Test getting rank for non-existent player."""
        rank = persistence_service.get_player_rank("nonexistent")
        assert rank is None


# ============================================================================
# SCORE VALIDATION TESTS
# ============================================================================

class TestScoreValidation:
    """Test score validation logic."""
    
    def test_validate_normal_score(self, persistence_service):
        """Test validation of a normal, valid score."""
        result = persistence_service.validate_score(
            score=10000.0,
            song_duration=180.0,
            difficulty_volume=0.8,
            max_combo=100,
            notes_hit=95,
            notes_total=100
        )
        assert result is True
    
    def test_validate_score_exceeds_max_per_second(self, persistence_service):
        """Test rejection of scores exceeding max points per second."""
        result = persistence_service.validate_score(
            score=500000.0,  # 2777 points/sec (> 2000 limit)
            song_duration=180.0,
            difficulty_volume=0.8,
            max_combo=100,
            notes_hit=100,
            notes_total=100
        )
        assert result is False
    
    def test_validate_score_exceeds_theoretical_max(self, persistence_service):
        """Test rejection of scores exceeding theoretical maximum."""
        result = persistence_service.validate_score(
            score=1000000.0,  # Impossibly high
            song_duration=180.0,
            difficulty_volume=0.8,
            max_combo=100,
            notes_hit=100,
            notes_total=100
        )
        assert result is False
    
    def test_validate_high_score_low_accuracy(self, persistence_service):
        """Test rejection of high scores with low accuracy."""
        # Score is 80% of theoretical max but accuracy is only 50%
        result = persistence_service.validate_score(
            score=32000.0,  # 80% of ~40k theoretical max
            song_duration=180.0,
            difficulty_volume=0.8,
            max_combo=100,
            notes_hit=50,  # Only 50% accuracy
            notes_total=100
        )
        assert result is False
    
    def test_validate_suspicious_score_flagged(self, persistence_service):
        """Test that suspicious scores are flagged but still valid."""
        # 96% of theoretical max (> 95% threshold)
        validation = persistence_service._validate_score_internal(
            score=38400.0,
            song_duration=180.0,
            difficulty_volume=0.8,
            max_combo=100,
            notes_hit=100,
            notes_total=100
        )
        
        assert validation.is_valid is True  # Still valid
        assert validation.confidence < 1.0  # But flagged
        assert "suspicious" in validation.reason.lower()


# ============================================================================
# STATISTICS TESTS
# ============================================================================

class TestStatistics:
    """Test statistics calculation."""
    
    def test_get_song_statistics(self, persistence_service):
        """Test song statistics calculation."""
        # Add entries for same song
        for i in range(5):
            persistence_service.save_leaderboard_entry(
                player_id=f"player_{i}",
                player_name=f"Player{i}",
                score=float(1000 * (i + 1)),
                song_id="song_001",
                song_title="Test Song",
                difficulty_volume=0.8
            )
        
        stats = persistence_service.get_song_statistics("song_001")
        
        assert stats['total_plays'] == 5
        assert stats['unique_players'] == 5
        assert stats['highest_score'] == 5000.0
        assert stats['lowest_score'] == 1000.0
        assert stats['average_score'] == 3000.0
    
    def test_get_player_statistics(self, persistence_service):
        """Test player statistics calculation."""
        # Add entries for same player
        for i in range(3):
            persistence_service.save_leaderboard_entry(
                player_id="player_001",
                player_name="TestPlayer",
                score=float(1000 * (i + 1)),
                song_id=f"song_{i}",
                song_title=f"Song {i}",
                difficulty_volume=0.8
            )
        
        stats = persistence_service.get_player_statistics("player_001")
        
        assert stats['total_plays'] == 3
        assert stats['songs_played'] == 3
        assert stats['best_score'] == 3000.0
        assert stats['average_score'] == 2000.0
    
    def test_get_service_statistics(self, persistence_service):
        """Test service-level statistics."""
        # Add diverse entries
        persistence_service.save_leaderboard_entry(
            player_id="player_001", player_name="Player1",
            score=1000.0, song_id="song_001", song_title="Song 1",
            difficulty_volume=0.8
        )
        persistence_service.save_leaderboard_entry(
            player_id="player_002", player_name="Player2",
            score=2000.0, song_id="song_002", song_title="Song 2",
            difficulty_volume=0.8
        )
        
        stats = persistence_service.get_statistics()
        
        assert stats['total_entries'] == 2
        assert stats['unique_players'] == 2
        assert stats['unique_songs'] == 2
        assert 'storage_size_bytes' in stats


# ============================================================================
# DATA MANAGEMENT TESTS
# ============================================================================

class TestDataManagement:
    """Test data management operations."""
    
    def test_clear_leaderboard_all(self, persistence_service):
        """Test clearing entire leaderboard."""
        # Add entries
        for i in range(3):
            persistence_service.save_leaderboard_entry(
                player_id=f"player_{i}",
                player_name=f"Player{i}",
                score=1000.0,
                song_id="song_001",
                song_title="Test Song",
                difficulty_volume=0.8
            )
        
        result = persistence_service.clear_leaderboard()
        
        assert result is True
        assert len(persistence_service._leaderboard) == 0
    
    def test_clear_leaderboard_by_song(self, persistence_service):
        """Test clearing leaderboard for specific song."""
        persistence_service.save_leaderboard_entry(
            player_id="player_001", player_name="Player1",
            score=1000.0, song_id="song_001", song_title="Song 1",
            difficulty_volume=0.8
        )
        persistence_service.save_leaderboard_entry(
            player_id="player_002", player_name="Player2",
            score=2000.0, song_id="song_002", song_title="Song 2",
            difficulty_volume=0.8
        )
        
        result = persistence_service.clear_leaderboard(song_id="song_001")
        
        assert result is True
        assert len(persistence_service._leaderboard) == 1
        assert persistence_service._leaderboard[0].song_id == "song_002"
    
    def test_backup_data(self, persistence_service, temp_storage_dir, sample_entry_data):
        """Test data backup."""
        persistence_service.save_leaderboard_entry(**sample_entry_data)
        
        backup_path = Path(temp_storage_dir) / "test_backup.json"
        result = persistence_service.backup_data(str(backup_path))
        
        assert result is True
        assert backup_path.exists()
        
        with open(backup_path, 'r') as f:
            data = json.load(f)
            assert len(data) == 1
    
    def test_restore_data(self, persistence_service, temp_storage_dir):
        """Test data restoration from backup."""
        # Create backup data
        backup_data = [
            {
                "player_id": "player_001",
                "player_name": "BackupPlayer",
                "score": 5000.0,
                "song_id": "song_001",
                "song_title": "Backup Song",
                "difficulty_volume": 0.8,
                "timestamp": datetime.now().isoformat(),
                "metadata": {}
            }
        ]
        
        backup_path = Path(temp_storage_dir) / "restore_backup.json"
        with open(backup_path, 'w') as f:
            json.dump(backup_data, f)
        
        result = persistence_service.restore_data(str(backup_path))
        
        assert result is True
        assert len(persistence_service._leaderboard) == 1
        assert persistence_service._leaderboard[0].player_id == "player_001"


# ============================================================================
# EDGE CASES AND CONCURRENT ACCESS TESTS
# ============================================================================

class TestEdgeCases:
    """Test edge cases and error handling."""
    
    def test_operations_before_initialization(self):
        """Test that operations fail gracefully before initialization (QUALIA.CODE compliant)."""
        # Create uninitialized service via CompositionRoot (not recommended in production)
        from backend.services.FileSystemService import FileSystemService
        from backend.services.PersistenceService import PersistenceService
        
        # For this edge case test, we need an uninitialized service
        # This is an exception to the rule as we're testing pre-initialization behavior
        filesystem_service = FileSystemService()
        service = PersistenceService(file_system_service=filesystem_service)
        # DO NOT call initialize()
        
        result = service.save_leaderboard_entry(
            player_id="player_001", player_name="Player",
            score=1000.0, song_id="song_001", song_title="Song",
            difficulty_volume=0.8
        )
        
        assert result is False
    
    def test_pruning_old_entries(self, persistence_service):
        """Test automatic pruning of old entries."""
        # Add old entry (> 365 days ago)
        old_timestamp = datetime.now() - timedelta(days=400)
        entry = {
            "player_id": "player_old",
            "player_name": "OldPlayer",
            "score": 1000.0,
            "song_id": "song_001",
            "song_title": "Old Song",
            "difficulty_volume": 0.8,
            "timestamp": old_timestamp.isoformat()  # FIX: Convert to ISO string
        }
        
        persistence_service._leaderboard.append(LeaderboardEntry.from_dict(entry))
        
        # Add new entry (triggers pruning)
        persistence_service.save_leaderboard_entry(
            player_id="player_new", player_name="NewPlayer",
            score=2000.0, song_id="song_001", song_title="New Song",
            difficulty_volume=0.8
        )
        
        # Old entry should be pruned
        player_ids = [e.player_id for e in persistence_service._leaderboard]
        assert "player_old" not in player_ids
    
    def test_empty_metadata_handling(self, persistence_service):
        """Test handling of entries without metadata."""
        result = persistence_service.save_leaderboard_entry(
            player_id="player_001",
            player_name="Player",
            score=1000.0,
            song_id="song_001",
            song_title="Song",
            difficulty_volume=0.8,
            metadata=None
        )
        
        assert result is True
        assert persistence_service._leaderboard[0].metadata == {}


# ============================================================================
# RUN TESTS
# ============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
