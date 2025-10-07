"""
Boss AI Service Contracts
Data structures and configuration for boss AI behavior system
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from enum import Enum


# ============================================================================
# ENUMS
# ============================================================================

class AggressionTier(Enum):
    """Boss aggression classification tiers."""
    PASSIVE = "passive"
    CAUTIOUS = "cautious"
    NORMAL = "normal"
    AGGRESSIVE = "aggressive"
    ENRAGED = "enraged"


class PatternType(Enum):
    """Boss attack pattern types."""
    PROJECTILE = "projectile"
    MELEE = "melee"
    AOE = "aoe"
    MOVEMENT = "movement"
    SPECIAL = "special"


class BossPhase(Enum):
    """Boss combat phases."""
    OPENING = 1
    ESCALATION = 2
    CLIMAX = 3
    FINALE = 4


class PlayerDistanceCategory(Enum):
    """Player distance categories for pattern selection."""
    CLOSE = "close"      # < 30% of arena
    MEDIUM = "medium"    # 30-70% of arena
    FAR = "far"          # > 70% of arena


class PlayerHarmonyCategory(Enum):
    """Player harmony categories from HarmonyAnalysisService."""
    HARMONIC = "harmonic"      # Score ≥ 0.60
    NEUTRAL = "neutral"        # Score 0.40-0.60
    CHAOTIC = "chaotic"        # Score ≤ 0.40


class BossHealthCategory(Enum):
    """Boss health categories for behavior."""
    HEALTHY = "healthy"    # > 75% health
    WOUNDED = "wounded"    # 25-75% health
    CRITICAL = "critical"  # < 25% health


# ============================================================================
# DATA CLASSES
# ============================================================================

@dataclass
class BossPhaseConfig:
    """Configuration for a single boss phase."""
    phase_number: int
    name: str
    health_range: tuple[float, float]  # (min_health, max_health)
    song_progress_range: tuple[float, float]  # (min_progress, max_progress)
    aggression_multiplier: float
    telegraph_multiplier: float
    pattern_frequency_multiplier: float
    allowed_pattern_types: List[str]
    phase_transition_threshold: float


@dataclass
class AggressionFactors:
    """Factors contributing to boss aggression calculation."""
    base_volume: float  # 0.0-1.0 from song volume
    tempo_modifier: float  # BPM-based modifier
    harmony_modifier: float  # Player harmony influence
    combo_modifier: float  # Player combo influence
    phase_multiplier: float  # Current phase multiplier
    enrage_boost: float  # Enrage mechanic boost (0.0 if not enraged)


@dataclass
class AttackPattern:
    """Definition of a boss attack pattern."""
    pattern_id: str
    pattern_name: str
    pattern_type: str  # 'projectile', 'melee', 'aoe', 'movement', 'special'
    weight: float  # Selection weight (higher = more likely)
    damage: float
    telegraph_time: float  # Base telegraph duration in seconds
    cooldown: float  # Base cooldown in seconds
    phase_requirement: int  # Minimum phase to use this pattern
    aggression_requirement: float  # Minimum aggression to use (0.0-1.0)
    radius: Optional[float] = None  # For AoE patterns
    duration: Optional[float] = None  # For duration-based patterns
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class PatternSelectionContext:
    """Context information for pattern selection decision."""
    current_phase: int
    aggression_level: float
    player_distance: str  # 'close', 'medium', 'far'
    player_harmony: str  # 'harmonic', 'neutral', 'chaotic'
    boss_health_category: str  # 'healthy', 'wounded', 'critical'
    player_combo: int
    time_since_last_pattern: float
    available_patterns: List[str]
    cooldowns: Dict[str, float]  # pattern_id → remaining cooldown


@dataclass
class BossAIState:
    """Complete state of the Boss AI at a given moment."""
    boss_id: str
    current_phase: BossPhase
    current_aggression: float  # 0.0-1.0
    aggression_tier: AggressionTier
    aggression_factors: AggressionFactors
    is_enraged: bool
    is_vulnerable: bool
    vulnerability_end_time: float
    time_since_last_attack: float
    active_pattern: Optional[AttackPattern]
    pattern_cooldowns: Dict[str, float]  # pattern_id → remaining cooldown
    patterns_used_count: Dict[str, int]  # pattern_id → usage count
    timestamp: float


@dataclass
class PatternExecutionResult:
    """Result of executing a boss attack pattern."""
    pattern_id: str
    success: bool
    damage_dealt: float
    qualia_generated: int
    telegraph_duration: float
    vulnerability_created: bool
    neutralized_by_combo: bool
    timestamp: float
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class BossAIServiceConfig:
    """Complete configuration for Boss AI Service."""
    
    # Phase configurations
    phases: Dict[str, BossPhaseConfig]
    
    # Aggression system
    aggression: Dict[str, Any]
    
    # Pattern selection system
    pattern_selection: Dict[str, Any]
    
    # Default attack patterns
    default_patterns: Dict[str, Dict[str, Any]]
    
    # Behavior modifiers
    behavior: Dict[str, Any]
    
    # Qualia generation
    qualia_generation: Dict[str, Any]
    
    # Feature flags
    features: Dict[str, bool]


@dataclass
class BossStateSnapshot:
    """Snapshot of boss state for statistics/debugging."""
    boss_id: str
    health: float
    phase: int
    aggression: float
    aggression_tier: str
    is_enraged: bool
    is_vulnerable: bool
    patterns_executed: int
    total_damage_dealt: float
    qualia_generated: int
    timestamp: float
