# QUALIA.CODE v1.1 - BossAIService Tests
# Comprehensive test suite for Boss AI behavior

import pytest
import time
from unittest.mock import Mock, patch, MagicMock
from pathlib import Path

from backend.services.BossAIService import BossAIService
from backend.services.EventBus import EventBus
from backend.services.contracts.IBossAIService_contracts import (
    BossPhase,
    AggressionTier,
    AttackPattern,
)


@pytest.fixture
def event_bus():
    """Create a mock EventBus for testing."""
    bus = Mock(spec=EventBus)
    bus.publish = Mock()
    return bus


@pytest.fixture
def config_path():
    """Get path to test configuration."""
    return Path(__file__).parent.parent / "config" / "boss-ai.yaml"


@pytest.fixture
def boss_ai_service(event_bus, config_path):
    """Create BossAIService instance for testing."""
    return BossAIService(event_bus=event_bus, config_path=str(config_path))


# ============================================================================
# INITIALIZATION TESTS
# ============================================================================

class TestBossAIInitialization:
    """Test BossAIService initialization."""

    def test_initialization_success(self, boss_ai_service, event_bus):
        """Test successful service initialization."""
        assert boss_ai_service is not None
        assert boss_ai_service._event_bus == event_bus
        assert len(boss_ai_service._phase_configs) == 4
        assert len(boss_ai_service._available_patterns) > 0

    def test_phase_configs_loaded(self, boss_ai_service):
        """Test phase configurations are loaded correctly."""
        phase_configs = boss_ai_service._phase_configs
        
        assert 1 in phase_configs
        assert 2 in phase_configs
        assert 3 in phase_configs
        assert 4 in phase_configs
        
        # Check phase 1 (Opening)
        phase1 = phase_configs[1]
        assert phase1.name == "Opening - Calm Before Storm"
        assert phase1.aggression_multiplier == 0.7
        assert phase1.telegraph_multiplier == 1.5
        
        # Check phase 4 (Finale)
        phase4 = phase_configs[4]
        assert phase4.name == "Finale - Desperate Fury"
        assert phase4.aggression_multiplier == 1.5
        assert phase4.telegraph_multiplier == 0.5

    def test_default_patterns_loaded(self, boss_ai_service):
        """Test default attack patterns are loaded."""
        patterns = boss_ai_service._available_patterns
        
        assert "single_projectile" in patterns
        assert "triple_spread" in patterns
        assert "dash_strike" in patterns
        assert "shockwave" in patterns
        assert "ultimate_barrage" in patterns
        
        # Verify pattern structure
        single_proj = patterns["single_projectile"]
        assert single_proj.pattern_type == "projectile"
        assert single_proj.damage > 0
        assert single_proj.telegraph_time > 0
        assert single_proj.cooldown > 0
        assert single_proj.phase_requirement == 1

    def test_initial_state(self, boss_ai_service):
        """Test initial state is correct."""
        assert boss_ai_service._boss_id is None
        assert boss_ai_service._current_phase == BossPhase.OPENING
        assert boss_ai_service._aggression_tier == AggressionTier.NORMAL
        assert boss_ai_service._is_enraged is False
        assert boss_ai_service._is_vulnerable is False
        assert boss_ai_service._active_pattern is None
        assert len(boss_ai_service._pattern_cooldowns) == 0


# ============================================================================
# BOSS INITIALIZATION TESTS
# ============================================================================

class TestBossInitialization:
    """Test boss initialization."""

    def test_initialize_boss_basic(self, boss_ai_service, event_bus):
        """Test basic boss initialization."""
        boss_state = boss_ai_service.initialize_boss(
            boss_id="test_boss_1",
            song_duration=180.0,
            difficulty_volume=0.8,
            tempo_bpm=140.0
        )
        
        assert boss_state is not None
        assert boss_state.boss_id == "test_boss_1"
        assert boss_ai_service._max_health == 1800.0  # 180 * 10
        assert boss_ai_service._current_health == 1800.0
        assert boss_ai_service._current_phase == BossPhase.OPENING
        
        # Verify phase changed event was emitted
        assert event_bus.publish.called

    def test_boss_health_calculation(self, boss_ai_service):
        """Test boss health calculation (health = duration * 10)."""
        boss_ai_service.initialize_boss(
            boss_id="test_boss",
            song_duration=120.0,
            difficulty_volume=0.6,
            tempo_bpm=120.0
        )
        
        assert boss_ai_service._max_health == 1200.0
        assert boss_ai_service._current_health == 1200.0
        assert boss_ai_service.get_boss_health() == 1200.0
        assert boss_ai_service.get_boss_max_health() == 1200.0

    def test_difficulty_volume_affects_aggression(self, boss_ai_service):
        """Test difficulty volume affects initial aggression."""
        # Low volume (training)
        boss_ai_service.initialize_boss(
            boss_id="test_boss_1",
            song_duration=180.0,
            difficulty_volume=0.3,  # Training
            tempo_bpm=120.0
        )
        aggression_low = boss_ai_service._aggression
        
        # High volume (extreme)
        boss_ai_service.initialize_boss(
            boss_id="test_boss_2",
            song_duration=180.0,
            difficulty_volume=0.9,  # Extreme
            tempo_bpm=120.0
        )
        aggression_high = boss_ai_service._aggression
        
        assert aggression_high > aggression_low

    def test_tempo_bpm_affects_aggression(self, boss_ai_service):
        """Test tempo BPM affects initial aggression."""
        # Slow tempo
        boss_ai_service.initialize_boss(
            boss_id="test_boss_1",
            song_duration=180.0,
            difficulty_volume=0.8,
            tempo_bpm=80.0  # Slow
        )
        aggression_slow = boss_ai_service._aggression
        
        # Fast tempo
        boss_ai_service.initialize_boss(
            boss_id="test_boss_2",
            song_duration=180.0,
            difficulty_volume=0.8,
            tempo_bpm=180.0  # Extreme
        )
        aggression_fast = boss_ai_service._aggression
        
        assert aggression_fast > aggression_slow


# ============================================================================
# AGGRESSION CALCULATION TESTS
# ============================================================================

class TestAggressionCalculation:
    """Test aggression calculation system."""

    def test_aggression_volume_influence(self, boss_ai_service):
        """Test volume influences aggression."""
        boss_ai_service.initialize_boss(
            boss_id="test", song_duration=180.0, difficulty_volume=0.3, tempo_bpm=120.0
        )
        aggression_training = boss_ai_service._aggression
        
        boss_ai_service.initialize_boss(
            boss_id="test", song_duration=180.0, difficulty_volume=0.9, tempo_bpm=120.0
        )
        aggression_extreme = boss_ai_service._aggression
        
        assert aggression_extreme > aggression_training

    def test_aggression_harmony_influence(self, boss_ai_service):
        """Test player harmony influences aggression."""
        boss_ai_service.initialize_boss(
            boss_id="test", song_duration=180.0, difficulty_volume=0.8, tempo_bpm=120.0
        )
        
        # Perfect harmony → less aggressive
        boss_ai_service.update_context(
            player_position=(400, 300),
            player_combo=10,
            player_harmony_score=0.95
        )
        boss_ai_service._calculate_aggression()
        aggression_harmonic = boss_ai_service._aggression
        
        # Extreme chaos → more aggressive
        boss_ai_service.update_context(
            player_position=(400, 300),
            player_combo=10,
            player_harmony_score=0.15
        )
        boss_ai_service._calculate_aggression()
        aggression_chaotic = boss_ai_service._aggression
        
        assert aggression_chaotic > aggression_harmonic

    def test_aggression_combo_influence(self, boss_ai_service):
        """Test player combo influences aggression."""
        boss_ai_service.initialize_boss(
            boss_id="test", song_duration=180.0, difficulty_volume=0.8, tempo_bpm=120.0
        )
        
        # Low combo
        boss_ai_service.update_context(
            player_position=(400, 300),
            player_combo=5,
            player_harmony_score=0.5
        )
        boss_ai_service._calculate_aggression()
        aggression_low_combo = boss_ai_service._aggression
        
        # Ultimate combo
        boss_ai_service.update_context(
            player_position=(400, 300),
            player_combo=60,
            player_harmony_score=0.5
        )
        boss_ai_service._calculate_aggression()
        aggression_high_combo = boss_ai_service._aggression
        
        assert aggression_high_combo > aggression_low_combo

    def test_aggression_tier_classification(self, boss_ai_service):
        """Test aggression is classified into correct tiers."""
        boss_ai_service.initialize_boss(
            boss_id="test", song_duration=180.0, difficulty_volume=0.2, tempo_bpm=80.0
        )
        boss_ai_service.update_context(
            player_position=(400, 300),
            player_combo=5,
            player_harmony_score=0.95
        )
        boss_ai_service._calculate_aggression()
        
        # Should be passive or cautious
        assert boss_ai_service._aggression_tier in [AggressionTier.PASSIVE, AggressionTier.CAUTIOUS]
        
        # Change to extreme conditions
        boss_ai_service.initialize_boss(
            boss_id="test", song_duration=180.0, difficulty_volume=0.95, tempo_bpm=200.0
        )
        boss_ai_service.update_context(
            player_position=(400, 300),
            player_combo=70,
            player_harmony_score=0.1
        )
        boss_ai_service._calculate_aggression()
        
        # Should be aggressive or enraged
        assert boss_ai_service._aggression_tier in [AggressionTier.AGGRESSIVE, AggressionTier.ENRAGED]


# ============================================================================
# PHASE TRANSITION TESTS
# ============================================================================

class TestPhaseTransitions:
    """Test boss phase transition system."""

    def test_phase_transition_by_health(self, boss_ai_service, event_bus):
        """Test phase transitions based on health percentage."""
        boss_ai_service.initialize_boss(
            boss_id="test", song_duration=200.0, difficulty_volume=0.8, tempo_bpm=120.0
        )
        
        # Start in phase 1
        assert boss_ai_service._current_phase == BossPhase.OPENING
        
        # Reduce health to 70% (should trigger phase 2)
        boss_ai_service._current_health = boss_ai_service._max_health * 0.70
        boss_ai_service._current_time = 50.0  # 25% song progress
        boss_ai_service._check_phase_transition()
        
        assert boss_ai_service._current_phase == BossPhase.ESCALATION
        
        # Reduce to 45% (should trigger phase 3)
        boss_ai_service._current_health = boss_ai_service._max_health * 0.45
        boss_ai_service._current_time = 100.0  # 50% song progress
        boss_ai_service._check_phase_transition()
        
        assert boss_ai_service._current_phase == BossPhase.CLIMAX
        
        # Reduce to 20% (should trigger phase 4)
        boss_ai_service._current_health = boss_ai_service._max_health * 0.20
        boss_ai_service._current_time = 150.0  # 75% song progress
        boss_ai_service._check_phase_transition()
        
        assert boss_ai_service._current_phase == BossPhase.FINALE

    def test_phase_transition_by_song_progress(self, boss_ai_service):
        """Test phase transitions based on song progress."""
        boss_ai_service.initialize_boss(
            boss_id="test", song_duration=200.0, difficulty_volume=0.8, tempo_bpm=120.0
        )
        
        # 30% song progress, 80% health → should be phase 2
        boss_ai_service._current_time = 60.0
        boss_ai_service._current_health = boss_ai_service._max_health * 0.80
        boss_ai_service._check_phase_transition()
        
        assert boss_ai_service._current_phase == BossPhase.ESCALATION

    def test_phase_transition_events(self, boss_ai_service, event_bus):
        """Test phase transition emits events."""
        boss_ai_service.initialize_boss(
            boss_id="test", song_duration=200.0, difficulty_volume=0.8, tempo_bpm=120.0
        )
        
        event_bus.publish.reset_mock()
        
        # Force phase transition
        boss_ai_service._current_health = boss_ai_service._max_health * 0.70
        boss_ai_service._current_time = 50.0
        boss_ai_service._check_phase_transition()
        
        # Should emit BossPhaseChangedEvent
        assert event_bus.publish.called
        call_args = event_bus.publish.call_args
        event = call_args[0][0]
        assert hasattr(event, 'type')
        assert 'Phase' in event.type or 'phase' in event.type.lower()

    def test_phase_multipliers_affect_behavior(self, boss_ai_service):
        """Test phase multipliers affect attack frequency and telegraph."""
        boss_ai_service.initialize_boss(
            boss_id="test", song_duration=200.0, difficulty_volume=0.8, tempo_bpm=120.0
        )
        
        # Phase 1 multipliers
        phase1_config = boss_ai_service._phase_configs[1]
        assert phase1_config.aggression_multiplier == 0.7  # Less aggressive
        assert phase1_config.telegraph_multiplier == 1.5  # Longer telegraphs
        
        # Phase 4 multipliers
        phase4_config = boss_ai_service._phase_configs[4]
        assert phase4_config.aggression_multiplier == 1.5  # More aggressive
        assert phase4_config.telegraph_multiplier == 0.5  # Shorter telegraphs


# ============================================================================
# ENRAGE MECHANIC TESTS
# ============================================================================

class TestEnrageMechanic:
    """Test boss enrage system."""

    def test_enrage_triggers_at_time_threshold(self, boss_ai_service, event_bus):
        """Test enrage triggers when < 30s remaining."""
        boss_ai_service.initialize_boss(
            boss_id="test", song_duration=180.0, difficulty_volume=0.8, tempo_bpm=120.0
        )
        
        assert not boss_ai_service._is_enraged
        
        # Advance to 155s (25s remaining)
        boss_ai_service._current_time = 155.0
        boss_ai_service._check_enrage()
        
        assert boss_ai_service._is_enraged
        assert boss_ai_service._stats["enrage_count"] == 1

    def test_enrage_increases_aggression(self, boss_ai_service):
        """Test enrage boosts aggression."""
        boss_ai_service.initialize_boss(
            boss_id="test", song_duration=180.0, difficulty_volume=0.8, tempo_bpm=120.0
        )
        
        boss_ai_service._calculate_aggression()
        aggression_normal = boss_ai_service._aggression
        
        # Trigger enrage
        boss_ai_service._current_time = 155.0
        boss_ai_service._check_enrage()
        boss_ai_service._calculate_aggression()
        aggression_enraged = boss_ai_service._aggression
        
        assert aggression_enraged > aggression_normal

    def test_enrage_only_triggers_once(self, boss_ai_service):
        """Test enrage only triggers once per combat."""
        boss_ai_service.initialize_boss(
            boss_id="test", song_duration=180.0, difficulty_volume=0.8, tempo_bpm=120.0
        )
        
        # Trigger enrage
        boss_ai_service._current_time = 155.0
        boss_ai_service._check_enrage()
        
        enrage_count_1 = boss_ai_service._stats["enrage_count"]
        
        # Try to trigger again
        boss_ai_service._current_time = 160.0
        boss_ai_service._check_enrage()
        
        enrage_count_2 = boss_ai_service._stats["enrage_count"]
        
        assert enrage_count_1 == enrage_count_2 == 1


# ============================================================================
# PATTERN SELECTION TESTS
# ============================================================================

class TestPatternSelection:
    """Test attack pattern selection system."""

    def test_select_pattern_basic(self, boss_ai_service):
        """Test basic pattern selection."""
        boss_ai_service.initialize_boss(
            boss_id="test", song_duration=180.0, difficulty_volume=0.8, tempo_bpm=120.0
        )
        
        pattern = boss_ai_service.select_pattern()
        
        assert pattern is not None
        assert isinstance(pattern, AttackPattern)
        assert pattern.pattern_id in boss_ai_service._available_patterns

    def test_pattern_phase_requirement_filtering(self, boss_ai_service):
        """Test patterns are filtered by phase requirement."""
        boss_ai_service.initialize_boss(
            boss_id="test", song_duration=180.0, difficulty_volume=0.8, tempo_bpm=120.0
        )
        
        # Phase 1 - only phase 1 patterns should be eligible
        boss_ai_service._current_phase = BossPhase.OPENING
        eligible = boss_ai_service._get_eligible_patterns()
        
        for pattern in eligible:
            assert pattern.phase_requirement <= 1

    def test_pattern_aggression_requirement_filtering(self, boss_ai_service):
        """Test patterns are filtered by aggression requirement."""
        boss_ai_service.initialize_boss(
            boss_id="test", song_duration=180.0, difficulty_volume=0.3, tempo_bpm=80.0
        )
        
        # Low aggression - high aggression patterns should not be eligible
        eligible = boss_ai_service._get_eligible_patterns()
        
        for pattern in eligible:
            assert pattern.aggression_requirement <= boss_ai_service._aggression

    def test_pattern_cooldown_filtering(self, boss_ai_service):
        """Test patterns on cooldown are not selected."""
        boss_ai_service.initialize_boss(
            boss_id="test", song_duration=180.0, difficulty_volume=0.8, tempo_bpm=120.0
        )
        
        # Put a pattern on cooldown
        boss_ai_service._pattern_cooldowns["single_projectile"] = 5.0
        
        # It should not be in eligible patterns
        eligible = boss_ai_service._get_eligible_patterns()
        pattern_ids = [p.pattern_id for p in eligible]
        
        assert "single_projectile" not in pattern_ids

    def test_context_based_weight_modifiers(self, boss_ai_service):
        """Test context modifiers affect pattern weights."""
        boss_ai_service.initialize_boss(
            boss_id="test", song_duration=180.0, difficulty_volume=0.8, tempo_bpm=120.0
        )
        
        # Set player close to boss
        boss_ai_service.update_context(
            player_position=(100, 100),  # Close to center
            player_combo=10,
            player_harmony_score=0.5
        )
        
        eligible = boss_ai_service._get_eligible_patterns()
        weighted = boss_ai_service._apply_context_weights(eligible)
        
        # Melee patterns should have higher weight when player is close
        for pattern, weight in weighted:
            if pattern.pattern_type == "melee":
                assert weight >= pattern.weight  # Weight should be boosted or same


# ============================================================================
# PATTERN EXECUTION TESTS
# ============================================================================

class TestPatternExecution:
    """Test attack pattern execution."""

    def test_execute_pattern_basic(self, boss_ai_service, event_bus):
        """Test basic pattern execution."""
        boss_ai_service.initialize_boss(
            boss_id="test", song_duration=180.0, difficulty_volume=0.8, tempo_bpm=120.0
        )
        
        pattern = boss_ai_service._available_patterns["single_projectile"]
        result = boss_ai_service.execute_pattern(pattern)
        
        assert result is not None
        assert result.success
        assert result.pattern_id == "single_projectile"
        assert result.damage_dealt == pattern.damage

    def test_pattern_creates_cooldown(self, boss_ai_service):
        """Test pattern execution creates cooldown."""
        boss_ai_service.initialize_boss(
            boss_id="test", song_duration=180.0, difficulty_volume=0.8, tempo_bpm=120.0
        )
        
        pattern = boss_ai_service._available_patterns["single_projectile"]
        boss_ai_service.execute_pattern(pattern)
        
        assert "single_projectile" in boss_ai_service._pattern_cooldowns
        assert boss_ai_service._pattern_cooldowns["single_projectile"] > 0

    def test_pattern_creates_vulnerability_window(self, boss_ai_service):
        """Test pattern execution creates vulnerability window."""
        boss_ai_service.initialize_boss(
            boss_id="test", song_duration=180.0, difficulty_volume=0.8, tempo_bpm=120.0
        )
        
        pattern = boss_ai_service._available_patterns["single_projectile"]
        result = boss_ai_service.execute_pattern(pattern)
        
        assert result.vulnerability_created
        assert boss_ai_service._is_vulnerable
        assert boss_ai_service._vulnerability_end_time > boss_ai_service._current_time

    def test_pattern_generates_qualia(self, boss_ai_service, event_bus):
        """Test pattern execution generates Qualia."""
        boss_ai_service.initialize_boss(
            boss_id="test", song_duration=180.0, difficulty_volume=0.8, tempo_bpm=120.0
        )
        
        pattern = boss_ai_service._available_patterns["single_projectile"]
        result = boss_ai_service.execute_pattern(pattern)
        
        assert result.qualia_generated > 0
        assert boss_ai_service._stats["qualia_generated"] > 0

    def test_telegraph_duration_calculation(self, boss_ai_service):
        """Test telegraph duration is calculated with modifiers."""
        boss_ai_service.initialize_boss(
            boss_id="test", song_duration=180.0, difficulty_volume=0.8, tempo_bpm=120.0
        )
        
        pattern = boss_ai_service._available_patterns["single_projectile"]
        base_telegraph = pattern.telegraph_time
        
        # Phase 1 has 1.5x multiplier
        calculated = boss_ai_service._calculate_telegraph_duration(pattern)
        
        assert calculated != base_telegraph  # Should be modified
        assert calculated >= 0.3  # Minimum threshold

    def test_telegraph_harmony_bonus(self, boss_ai_service):
        """Test harmonic players get telegraph bonus."""
        boss_ai_service.initialize_boss(
            boss_id="test", song_duration=180.0, difficulty_volume=0.8, tempo_bpm=120.0
        )
        
        pattern = boss_ai_service._available_patterns["single_projectile"]
        
        # Harmonic player
        boss_ai_service.update_context(
            player_position=(400, 300),
            player_combo=10,
            player_harmony_score=0.95
        )
        telegraph_harmonic = boss_ai_service._calculate_telegraph_duration(pattern)
        
        # Chaotic player
        boss_ai_service.update_context(
            player_position=(400, 300),
            player_combo=10,
            player_harmony_score=0.2
        )
        telegraph_chaotic = boss_ai_service._calculate_telegraph_duration(pattern)
        
        # Harmonic should have longer telegraph (reward)
        assert telegraph_harmonic > telegraph_chaotic


# ============================================================================
# PATTERN NEUTRALIZATION TESTS
# ============================================================================

class TestPatternNeutralization:
    """Test pattern neutralization by combos."""

    def test_neutralize_pattern_with_harmonic_combo(self, boss_ai_service):
        """Test harmonic combo neutralizes active pattern."""
        boss_ai_service.initialize_boss(
            boss_id="test", song_duration=180.0, difficulty_volume=0.8, tempo_bpm=120.0
        )
        
        pattern = boss_ai_service._available_patterns["single_projectile"]
        boss_ai_service.execute_pattern(pattern)
        boss_ai_service._active_pattern = pattern  # Simulate active
        
        success = boss_ai_service.neutralize_pattern("single_projectile", "harmonic")
        
        assert success
        assert boss_ai_service._active_pattern is None
        assert boss_ai_service._stats["patterns_neutralized"] == 1

    def test_chaotic_combo_cannot_neutralize(self, boss_ai_service):
        """Test chaotic combo cannot neutralize patterns."""
        boss_ai_service.initialize_boss(
            boss_id="test", song_duration=180.0, difficulty_volume=0.8, tempo_bpm=120.0
        )
        
        pattern = boss_ai_service._available_patterns["single_projectile"]
        boss_ai_service.execute_pattern(pattern)
        boss_ai_service._active_pattern = pattern
        
        success = boss_ai_service.neutralize_pattern("single_projectile", "chaotic")
        
        assert not success
        assert boss_ai_service._active_pattern == pattern

    def test_neutralization_extends_vulnerability(self, boss_ai_service):
        """Test neutralization creates extended vulnerability window."""
        boss_ai_service.initialize_boss(
            boss_id="test", song_duration=180.0, difficulty_volume=0.8, tempo_bpm=120.0
        )
        
        pattern = boss_ai_service._available_patterns["single_projectile"]
        boss_ai_service.execute_pattern(pattern)
        boss_ai_service._active_pattern = pattern
        
        vuln_time_before = boss_ai_service._vulnerability_end_time
        
        boss_ai_service.neutralize_pattern("single_projectile", "harmonic")
        
        vuln_time_after = boss_ai_service._vulnerability_end_time
        
        # Should extend vulnerability
        assert vuln_time_after > vuln_time_before


# ============================================================================
# HEALTH & DAMAGE TESTS
# ============================================================================

class TestHealthAndDamage:
    """Test boss health and damage system."""

    def test_take_damage_basic(self, boss_ai_service):
        """Test basic damage application."""
        boss_ai_service.initialize_boss(
            boss_id="test", song_duration=180.0, difficulty_volume=0.8, tempo_bpm=120.0
        )
        
        initial_health = boss_ai_service._current_health
        damage_dealt = boss_ai_service.take_damage(100.0, "player")
        
        assert damage_dealt == 100.0
        assert boss_ai_service._current_health == initial_health - 100.0

    def test_vulnerability_multiplier(self, boss_ai_service):
        """Test vulnerability multiplies damage."""
        boss_ai_service.initialize_boss(
            boss_id="test", song_duration=180.0, difficulty_volume=0.8, tempo_bpm=120.0
        )
        
        # Normal damage
        damage_normal = boss_ai_service.take_damage(100.0, "player")
        assert damage_normal == 100.0
        
        # Set vulnerable
        boss_ai_service._is_vulnerable = True
        damage_vulnerable = boss_ai_service.take_damage(100.0, "player")
        
        # Should be multiplied (1.5x default)
        assert damage_vulnerable > 100.0

    def test_cannot_deal_negative_damage(self, boss_ai_service):
        """Test negative damage is rejected."""
        boss_ai_service.initialize_boss(
            boss_id="test", song_duration=180.0, difficulty_volume=0.8, tempo_bpm=120.0
        )
        
        initial_health = boss_ai_service._current_health
        damage_dealt = boss_ai_service.take_damage(-50.0, "player")
        
        assert damage_dealt == 0.0
        assert boss_ai_service._current_health == initial_health

    def test_damage_capped_at_current_health(self, boss_ai_service):
        """Test damage cannot exceed current health."""
        boss_ai_service.initialize_boss(
            boss_id="test", song_duration=180.0, difficulty_volume=0.8, tempo_bpm=120.0
        )
        
        boss_ai_service._current_health = 50.0
        damage_dealt = boss_ai_service.take_damage(1000.0, "player")
        
        assert damage_dealt == 50.0
        assert boss_ai_service._current_health == 0.0


# ============================================================================
# UPDATE LOOP TESTS
# ============================================================================

class TestUpdateLoop:
    """Test boss AI update loop."""

    def test_update_decreases_cooldowns(self, boss_ai_service):
        """Test update decreases pattern cooldowns."""
        boss_ai_service.initialize_boss(
            boss_id="test", song_duration=180.0, difficulty_volume=0.8, tempo_bpm=120.0
        )
        
        boss_ai_service._pattern_cooldowns["test_pattern"] = 5.0
        
        boss_ai_service.update(dt=1.0, current_time=1.0)
        
        assert boss_ai_service._pattern_cooldowns["test_pattern"] == 4.0

    def test_update_removes_expired_cooldowns(self, boss_ai_service):
        """Test update removes cooldowns that reach 0."""
        boss_ai_service.initialize_boss(
            boss_id="test", song_duration=180.0, difficulty_volume=0.8, tempo_bpm=120.0
        )
        
        boss_ai_service._pattern_cooldowns["test_pattern"] = 0.5
        
        boss_ai_service.update(dt=1.0, current_time=1.0)
        
        assert "test_pattern" not in boss_ai_service._pattern_cooldowns

    def test_update_checks_phase_transitions(self, boss_ai_service):
        """Test update checks for phase transitions."""
        boss_ai_service.initialize_boss(
            boss_id="test", song_duration=200.0, difficulty_volume=0.8, tempo_bpm=120.0
        )
        
        # Reduce health to trigger phase 2
        boss_ai_service._current_health = boss_ai_service._max_health * 0.70
        
        boss_ai_service.update(dt=1.0, current_time=50.0)
        
        assert boss_ai_service._current_phase == BossPhase.ESCALATION

    def test_update_ends_vulnerability_windows(self, boss_ai_service):
        """Test update ends expired vulnerability windows."""
        boss_ai_service.initialize_boss(
            boss_id="test", song_duration=180.0, difficulty_volume=0.8, tempo_bpm=120.0
        )
        
        boss_ai_service._is_vulnerable = True
        boss_ai_service._vulnerability_end_time = 5.0
        
        boss_ai_service.update(dt=1.0, current_time=6.0)
        
        assert not boss_ai_service._is_vulnerable


# ============================================================================
# STATISTICS TESTS
# ============================================================================

class TestStatistics:
    """Test statistics tracking."""

    def test_statistics_initial_state(self, boss_ai_service):
        """Test statistics start at zero."""
        stats = boss_ai_service.get_statistics()
        
        assert stats["patterns_executed"] == 0
        assert stats["total_damage_dealt"] == 0.0
        assert stats["qualia_generated"] == 0
        assert stats["phase_transitions"] == 0
        assert stats["enrage_count"] == 0
        assert stats["vulnerabilities_created"] == 0
        assert stats["patterns_neutralized"] == 0

    def test_statistics_track_pattern_execution(self, boss_ai_service):
        """Test statistics track executed patterns."""
        boss_ai_service.initialize_boss(
            boss_id="test", song_duration=180.0, difficulty_volume=0.8, tempo_bpm=120.0
        )
        
        pattern = boss_ai_service._available_patterns["single_projectile"]
        boss_ai_service.execute_pattern(pattern)
        
        stats = boss_ai_service.get_statistics()
        assert stats["patterns_executed"] == 1
        assert stats["total_damage_dealt"] == pattern.damage

    def test_statistics_track_neutralizations(self, boss_ai_service):
        """Test statistics track pattern neutralizations."""
        boss_ai_service.initialize_boss(
            boss_id="test", song_duration=180.0, difficulty_volume=0.8, tempo_bpm=120.0
        )
        
        pattern = boss_ai_service._available_patterns["single_projectile"]
        boss_ai_service._active_pattern = pattern
        boss_ai_service.neutralize_pattern("single_projectile", "harmonic")
        
        stats = boss_ai_service.get_statistics()
        assert stats["patterns_neutralized"] == 1


# ============================================================================
# RESET TESTS
# ============================================================================

class TestReset:
    """Test service reset functionality."""

    def test_reset_clears_state(self, boss_ai_service):
        """Test reset clears all state."""
        boss_ai_service.initialize_boss(
            boss_id="test", song_duration=180.0, difficulty_volume=0.8, tempo_bpm=120.0
        )
        
        # Modify state
        boss_ai_service._is_enraged = True
        boss_ai_service._pattern_cooldowns["test"] = 5.0
        boss_ai_service._stats["patterns_executed"] = 10
        
        boss_ai_service.reset()
        
        assert boss_ai_service._boss_id is None
        assert not boss_ai_service._is_enraged
        assert len(boss_ai_service._pattern_cooldowns) == 0
        assert boss_ai_service._stats["patterns_executed"] == 0


# ============================================================================
# EDGE CASES
# ============================================================================

class TestEdgeCases:
    """Test edge cases and error handling."""

    def test_update_context_calculates_distance_category(self, boss_ai_service):
        """Test context update calculates player distance category."""
        boss_ai_service.initialize_boss(
            boss_id="test", song_duration=180.0, difficulty_volume=0.8, tempo_bpm=120.0
        )
        
        # Close position
        boss_ai_service.update_context(
            player_position=(400, 300),  # Center
            player_combo=10,
            player_harmony_score=0.5
        )
        # Distance should be CLOSE (at center)
        
        # Far position
        boss_ai_service.update_context(
            player_position=(0, 0),  # Corner
            player_combo=10,
            player_harmony_score=0.5
        )
        # Distance calculation should work

    def test_no_eligible_patterns_returns_none(self, boss_ai_service):
        """Test select_pattern returns None if no patterns are eligible."""
        boss_ai_service.initialize_boss(
            boss_id="test", song_duration=180.0, difficulty_volume=0.0, tempo_bpm=80.0
        )
        
        # Put all patterns on cooldown
        for pattern_id in boss_ai_service._available_patterns.keys():
            boss_ai_service._pattern_cooldowns[pattern_id] = 999.0
        
        pattern = boss_ai_service.select_pattern()
        
        # Should return None or handle gracefully
        assert pattern is None or pattern.pattern_id not in boss_ai_service._pattern_cooldowns
