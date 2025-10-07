# QUALIA.CODE v1.1 - Boss AI Service Interface
# Defines contract for boss AI behavior and pattern execution

from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Tuple, Any
from backend.services.contracts.IBossAIService_contracts import (
    BossAIState,
    AttackPattern,
    PatternSelectionContext,
    PatternExecutionResult,
    BossStateSnapshot,
    AggressionFactors,
    BossPhase,
    AggressionTier
)


class IBossAIService(ABC):
    """
    Interface for Boss AI Service.
    
    RESPONSIBILITIES:
    1. Boss phase management (4 phases tied to song progress)
    2. Aggression calculation (volume + tempo + harmony)
    3. Attack pattern selection (context-aware AI)
    4. Pattern execution and lifecycle
    5. Vulnerability windows
    6. Enrage mechanics
    7. Boss health management
    
    ARCHITECTURE COMPLIANCE:
    - Event-driven communication (QUALIA.CODE)
    - State calculation only, NO rendering (ARCHITECTURE.GOLD.CODE)
    - Configuration-driven behavior (QUALIA.CODE)
    """
    
    @abstractmethod
    def initialize_boss(
        self,
        boss_id: str,
        song_duration: float,
        difficulty_volume: float,
        tempo_bpm: float,
        combat_data: Optional[Dict[str, Any]] = None
    ) -> BossAIState:
        """
        Initialize a new boss for combat.
        
        Args:
            boss_id: Unique identifier for this boss instance
            song_duration: Duration of the song in seconds (boss health = duration * 10)
            difficulty_volume: Song volume 0.0-1.0 (affects aggression)
            tempo_bpm: Song tempo in BPM (affects aggression and cooldowns)
            combat_data: Optional CombatData with custom patterns
            
        Returns:
            Initial BossAIState
            
        Events Emitted:
            - BossPhaseChangedEvent (phase 1)
        """
        pass
    
    @abstractmethod
    def update(self, dt: float, current_time: float) -> None:
        """
        Update boss AI state (called every frame).
        
        Args:
            dt: Delta time since last update
            current_time: Current game time in seconds
            
        Events Emitted:
            - BossPatternSelectedEvent (when new pattern selected)
            - BossAttackEvent (when pattern executes)
            - BossAggressionChangedEvent (when aggression changes)
            - BossPhaseChangedEvent (when phase transitions)
            - BossEnragedEvent (when enrage triggers)
            - BossVulnerableEvent (when vulnerability window opens)
        """
        pass
    
    @abstractmethod
    def take_damage(self, damage: float, source: str) -> float:
        """
        Apply damage to boss.
        
        Args:
            damage: Amount of damage to apply
            source: Source of damage (player_id or 'environment')
            
        Returns:
            Actual damage dealt (after modifiers)
            
        Events Emitted:
            - HealthChangedEvent
            - BossPhaseChangedEvent (if phase transition occurs)
        """
        pass
    
    @abstractmethod
    def update_context(
        self,
        player_position: Tuple[float, float],
        player_combo: int,
        player_harmony_score: float,
        player_qualia_state: Optional[Dict[str, float]] = None
    ) -> None:
        """
        Update AI decision context with player information.
        
        Args:
            player_position: Player (x, y) position in arena
            player_combo: Current player combo count
            player_harmony_score: Player harmony score 0.0-1.0 from HarmonyAnalysisService
            player_qualia_state: Optional QualiaState data
        """
        pass
    
    @abstractmethod
    def select_pattern(self) -> Optional[AttackPattern]:
        """
        Select the next attack pattern based on current context.
        
        Returns:
            Selected AttackPattern or None if no valid pattern available
            
        Events Emitted:
            - BossPatternSelectedEvent
        """
        pass
    
    @abstractmethod
    def execute_pattern(self, pattern: AttackPattern) -> PatternExecutionResult:
        """
        Execute a boss attack pattern.
        
        Args:
            pattern: The AttackPattern to execute
            
        Returns:
            PatternExecutionResult with outcome details
            
        Events Emitted:
            - BossAttackEvent
            - QualiaGeneratedEvent (if qualia generation enabled)
            - BossVulnerableEvent (if vulnerability window created)
        """
        pass
    
    @abstractmethod
    def neutralize_pattern(self, pattern_id: str, combo_type: str) -> bool:
        """
        Attempt to neutralize an active attack pattern with a harmonic combo.
        
        Args:
            pattern_id: ID of the pattern to neutralize
            combo_type: Type of combo used ('harmonic' or 'chaotic')
            
        Returns:
            True if pattern was successfully neutralized
            
        Events Emitted:
            - BossVulnerableEvent (if neutralization successful)
        """
        pass
    
    @abstractmethod
    def get_current_phase(self) -> BossPhase:
        """Get current boss phase."""
        pass
    
    @abstractmethod
    def get_current_aggression(self) -> float:
        """Get current aggression level 0.0-1.0."""
        pass
    
    @abstractmethod
    def get_aggression_tier(self) -> AggressionTier:
        """Get current aggression classification tier."""
        pass
    
    @abstractmethod
    def is_enraged(self) -> bool:
        """Check if boss is currently enraged."""
        pass
    
    @abstractmethod
    def is_vulnerable(self) -> bool:
        """Check if boss is currently vulnerable."""
        pass
    
    @abstractmethod
    def get_active_pattern(self) -> Optional[AttackPattern]:
        """Get currently executing attack pattern."""
        pass
    
    @abstractmethod
    def get_pattern_cooldowns(self) -> Dict[str, float]:
        """Get remaining cooldowns for all patterns."""
        pass
    
    @abstractmethod
    def get_boss_health(self) -> float:
        """Get current boss health."""
        pass
    
    @abstractmethod
    def get_boss_max_health(self) -> float:
        """Get maximum boss health."""
        pass
    
    @abstractmethod
    def get_state_snapshot(self) -> BossStateSnapshot:
        """Get complete snapshot of current boss state."""
        pass
    
    @abstractmethod
    def reset(self) -> None:
        """Reset boss AI to initial state."""
        pass
    
    @abstractmethod
    def get_statistics(self) -> Dict[str, Any]:
        """
        Get boss AI statistics.
        
        Returns:
            Dictionary containing:
            - patterns_executed: Total patterns executed
            - total_damage_dealt: Total damage to player
            - qualia_generated: Total Qualia generated
            - phase_transitions: Number of phase changes
            - enrage_count: Times boss entered enrage
            - vulnerabilities_created: Times boss became vulnerable
            - patterns_neutralized: Patterns canceled by combos
        """
        pass


class IPatternSystemService(ABC):
    """
    Interface for Pattern System Service.
    
    RESPONSIBILITIES:
    1. Pattern library management
    2. Pattern loading from CombatData
    3. Pattern validation
    4. Pattern lifecycle tracking
    
    ARCHITECTURE COMPLIANCE:
    - Decoupled from BossAI (can be used independently)
    - Configuration-driven pattern definitions
    - Event-driven pattern state changes
    """
    
    @abstractmethod
    def load_patterns(self, combat_data: Dict[str, Any]) -> List[AttackPattern]:
        """
        Load attack patterns from CombatData.
        
        Args:
            combat_data: CombatData dictionary with pattern definitions
            
        Returns:
            List of AttackPattern objects
        """
        pass
    
    @abstractmethod
    def get_pattern(self, pattern_id: str) -> Optional[AttackPattern]:
        """Get pattern by ID."""
        pass
    
    @abstractmethod
    def get_patterns_by_type(self, pattern_type: str) -> List[AttackPattern]:
        """Get all patterns of a specific type."""
        pass
    
    @abstractmethod
    def get_patterns_by_phase(self, phase: int) -> List[AttackPattern]:
        """Get all patterns available in a specific phase."""
        pass
    
    @abstractmethod
    def get_patterns_by_aggression(self, min_aggression: float) -> List[AttackPattern]:
        """Get all patterns requiring minimum aggression level."""
        pass
    
    @abstractmethod
    def validate_pattern(self, pattern: AttackPattern) -> bool:
        """Validate pattern configuration."""
        pass
    
    @abstractmethod
    def get_pattern_count(self) -> int:
        """Get total number of loaded patterns."""
        pass
    
    @abstractmethod
    def reset(self) -> None:
        """Clear all loaded patterns."""
        pass
