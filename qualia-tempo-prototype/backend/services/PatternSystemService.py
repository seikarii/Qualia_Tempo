# QUALIA.CODE v1.1 - PatternSystemService Implementation
# Pattern library management and validation

import logging
from typing import Dict, List, Optional, Any

from backend.services.interfaces.IBossAIService import IPatternSystemService
from backend.services.contracts.IBossAIService_contracts import AttackPattern
from backend.utils.decorators import log_execution, handle_errors


class PatternSystemService(IPatternSystemService):
    """
    Pattern System Service - Pattern library management.
    
    RESPONSIBILITIES:
    1. Pattern library management
    2. Pattern loading from CombatData
    3. Pattern validation
    4. Pattern querying and filtering
    
    ARCHITECTURE COMPLIANCE:
    - Decoupled from BossAI (QUALIA.CODE)
    - Can be used independently or by BossAIService
    """

    def __init__(self) -> None:
        """Initialize PatternSystemService."""
        self._logger = logging.getLogger(__name__)
        self._patterns: Dict[str, AttackPattern] = {}
        self._logger.info("PatternSystemService initialized")

    @log_execution()
    @handle_errors()
    def load_patterns(self, combat_data: Dict[str, Any]) -> List[AttackPattern]:
        """Load attack patterns from CombatData."""
        patterns_data = combat_data.get("patterns", [])
        loaded_patterns = []
        
        for pattern_data in patterns_data:
            pattern = AttackPattern(
                pattern_id=pattern_data.get("id", ""),
                pattern_name=pattern_data.get("name", ""),
                pattern_type=pattern_data.get("type", "projectile"),
                weight=pattern_data.get("weight", 5.0),
                damage=pattern_data.get("damage", 10.0),
                telegraph_time=pattern_data.get("telegraph_time", 1.5),
                cooldown=pattern_data.get("cooldown", 5.0),
                phase_requirement=pattern_data.get("phase_requirement", 1),
                aggression_requirement=pattern_data.get("aggression_requirement", 0.0),
                radius=pattern_data.get("radius"),
                duration=pattern_data.get("duration"),
                metadata=pattern_data.get("metadata", {})
            )
            
            if self.validate_pattern(pattern):
                self._patterns[pattern.pattern_id] = pattern
                loaded_patterns.append(pattern)
            else:
                self._logger.warning(f"Invalid pattern skipped: {pattern.pattern_id}")
        
        self._logger.info(f"Loaded {len(loaded_patterns)} patterns from CombatData")
        return loaded_patterns

    @log_execution()
    def get_pattern(self, pattern_id: str) -> Optional[AttackPattern]:
        """Get pattern by ID."""
        return self._patterns.get(pattern_id)

    @log_execution()
    def get_patterns_by_type(self, pattern_type: str) -> List[AttackPattern]:
        """Get all patterns of a specific type."""
        return [p for p in self._patterns.values() if p.pattern_type == pattern_type]

    @log_execution()
    def get_patterns_by_phase(self, phase: int) -> List[AttackPattern]:
        """Get all patterns available in a specific phase."""
        return [p for p in self._patterns.values() if p.phase_requirement <= phase]

    @log_execution()
    def get_patterns_by_aggression(self, min_aggression: float) -> List[AttackPattern]:
        """Get all patterns requiring minimum aggression level."""
        return [p for p in self._patterns.values() if p.aggression_requirement <= min_aggression]

    @log_execution()
    @handle_errors()
    def validate_pattern(self, pattern: AttackPattern) -> bool:
        """Validate pattern configuration."""
        # Check required fields
        if not pattern.pattern_id:
            self._logger.error("Pattern missing pattern_id")
            return False
        
        if not pattern.pattern_name:
            self._logger.error(f"Pattern {pattern.pattern_id} missing pattern_name")
            return False
        
        # Validate numeric ranges
        if pattern.damage < 0:
            self._logger.error(f"Pattern {pattern.pattern_id} has negative damage")
            return False
        
        if pattern.telegraph_time < 0:
            self._logger.error(f"Pattern {pattern.pattern_id} has negative telegraph_time")
            return False
        
        if pattern.cooldown < 0:
            self._logger.error(f"Pattern {pattern.pattern_id} has negative cooldown")
            return False
        
        if pattern.weight < 0:
            self._logger.error(f"Pattern {pattern.pattern_id} has negative weight")
            return False
        
        # Validate phase requirement
        if pattern.phase_requirement < 1 or pattern.phase_requirement > 4:
            self._logger.error(
                f"Pattern {pattern.pattern_id} has invalid phase_requirement: "
                f"{pattern.phase_requirement} (must be 1-4)"
            )
            return False
        
        # Validate aggression requirement
        if pattern.aggression_requirement < 0.0 or pattern.aggression_requirement > 1.0:
            self._logger.error(
                f"Pattern {pattern.pattern_id} has invalid aggression_requirement: "
                f"{pattern.aggression_requirement} (must be 0.0-1.0)"
            )
            return False
        
        # Validate pattern type
        valid_types = ["projectile", "melee", "aoe", "movement", "special"]
        if pattern.pattern_type not in valid_types:
            self._logger.error(
                f"Pattern {pattern.pattern_id} has invalid pattern_type: "
                f"{pattern.pattern_type} (must be one of {valid_types})"
            )
            return False
        
        return True

    @log_execution()
    def get_pattern_count(self) -> int:
        """Get total number of loaded patterns."""
        return len(self._patterns)

    @log_execution()
    def reset(self) -> None:
        """Clear all loaded patterns."""
        self._patterns.clear()
        self._logger.info("PatternSystemService reset - all patterns cleared")
