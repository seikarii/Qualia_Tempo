"""High-Fidelity Mock for IBossAIService"""
from typing import Dict, List, Any, Optional
from backend.services.interfaces.IBossAIService import IBossAIService
from backend.services.contracts.IBossAIService_contracts import (
    BossPhase, BossAIState, AggressionTier, AggressionFactors, 
    AttackPattern, PatternExecutionResult, PatternSelectionContext
)


class MockBossAIService(IBossAIService):
    """High-fidelity mock for IBossAIService."""
    
    def __init__(self):
        self.reset()
    
    def reset(self) -> None:
        """Reset mock state."""
        self.current_phase = BossPhase.OPENING
        self.aggression_level = 0.5
        self.decision_calls: List[Dict[str, Any]] = []
    
    def initialize_boss(self, boss_id: str, song_duration: float, 
                       difficulty_volume: float, tempo_bpm: float,
                       combat_data: Optional[Dict[str, Any]] = None) -> BossAIState:
        """Initialize boss."""
        return BossAIState(
            boss_id=boss_id,
            current_phase=BossPhase.OPENING,
            current_aggression=0.5,
            aggression_tier=AggressionTier.NORMAL,
            aggression_factors=AggressionFactors(
                base_volume=difficulty_volume,
                tempo_modifier=1.0,
                harmony_modifier=0.0,
                combo_modifier=0.0,
                phase_multiplier=1.0,
                enrage_boost=0.0
            ),
            is_enraged=False,
            is_vulnerable=False,
            vulnerability_end_time=0.0,
            time_since_last_attack=0.0,
            active_pattern=None,
            pattern_cooldowns={},
            patterns_used_count={},
            timestamp=0.0
        )
    
    def update_ai(self, delta_time: float, game_state: Dict[str, Any]) -> Dict[str, Any]:
        """Update boss AI."""
        return {
            "action": "attack",
            "target": "player",
            "phase": self.current_phase.name,
            "aggression": self.aggression_level
        }
    
    def calculate_aggression(self, aggression_factors: AggressionFactors) -> float:
        """Calculate aggression level."""
        return 0.5
    
    def select_attack_pattern(self, context: PatternSelectionContext) -> Optional[AttackPattern]:
        """Select attack pattern."""
        return None
    
    def execute_pattern(self, pattern: AttackPattern) -> PatternExecutionResult:
        """Execute pattern."""
        return PatternExecutionResult(
            pattern_id=pattern.pattern_id,
            success=True,
            damage_dealt=pattern.damage,
            qualia_generated=0,
            telegraph_duration=pattern.telegraph_time,
            vulnerability_created=False,
            neutralized_by_combo=False,
            timestamp=0.0
        )
    
    def update_cooldowns(self, delta_time: float) -> None:
        """Update cooldowns."""
        pass
    
    def get_boss_state(self) -> BossAIState:
        """Get boss state."""
        return BossAIState(
            boss_id="test_boss",
            current_phase=self.current_phase,
            current_aggression=self.aggression_level,
            aggression_tier=AggressionTier.NORMAL,
            aggression_factors=AggressionFactors(
                base_volume=0.5,
                tempo_modifier=1.0,
                harmony_modifier=0.0,
                combo_modifier=0.0,
                phase_multiplier=1.0,
                enrage_boost=0.0
            ),
            is_enraged=False,
            is_vulnerable=False,
            vulnerability_end_time=0.0,
            time_since_last_attack=0.0,
            active_pattern=None,
            pattern_cooldowns={},
            patterns_used_count={},
            timestamp=0.0
        )
    
    def transition_to_phase(self, new_phase: BossPhase) -> None:
        """Transition to new phase."""
        self.current_phase = new_phase
    
    def check_enrage_conditions(self, time_remaining: float, health_percentage: float) -> bool:
        """Check enrage conditions."""
        return False
    
    def create_vulnerability_window(self, duration: float) -> None:
        """Create vulnerability window."""
        pass
