# QUALIA.CODE v1.1 - BossAIService Implementation
# Boss AI orchestrator with context-aware pattern selection

import time
import uuid
import math
import random
from typing import Dict, List, Optional, Tuple, Any

from backend.services.interfaces.IBossAIService import IBossAIService
from backend.services.interfaces.ILogger import ILogger
from backend.services.interfaces.IEventBus import IEventBus
from backend.services.interfaces.IBaseService import IBaseService
from backend.services.contracts.IBossAIService_contracts import BossAIServiceConfig
from backend.services.contracts.IBossAIService_contracts import (
    BossAIState,
    AttackPattern,
    PatternSelectionContext,
    PatternExecutionResult,
    BossStateSnapshot,
    AggressionFactors,
    BossPhase,
    AggressionTier,
    BossPhaseConfig,
    PlayerDistanceCategory,
    PlayerHarmonyCategory,
    BossHealthCategory,
    PatternType,
)
from backend.services.contracts.events import (
    BossPhaseChangedEvent,
    BossAttackEvent,
    BossAggressionChangedEvent,
    BossPatternSelectedEvent,
    BossEnragedEvent,
    BossVulnerableEvent,
    HealthChangedEvent,
    QualiaGeneratedEvent,
)
from backend.utils.decorators import log_execution, handle_errors, OnEvent


class BossAIService(IBossAIService, IBaseService):
    """
    Boss AI Service - Context-aware attack pattern orchestration.
    
    ARCHITECTURE COMPLIANCE:
    - Event-driven via EventBus (QUALIA.CODE)
    - State calculation only, NO rendering (ARCHITECTURE.GOLD.CODE)
    - Configuration externalized to YAML (QUALIA.CODE)
    - Decorators for logging/error handling (QUALIA.CODE)
    
    GAME DESIGN (GDD.md):
    - Boss = the song (health = song_duration * 10)
    - 4 phases tied to song progress (0-25%, 25-50%, 50-75%, 75-100%)
    - Aggression based on: volume + tempo + harmony + combo
    - Telegraph times vary by phase and harmony
    - Patterns can be neutralized by harmonic combos
    - Enrage when <30s remaining in song
    
    RESPONSIBILITIES:
    1. Phase management (song progress-based)
    2. Aggression calculation (multi-factor)
    3. Pattern selection (context-aware AI)
    4. Pattern execution lifecycle
    5. Vulnerability windows
    6. Enrage mechanics
    7. Health management
    """

    def __init__(self, config: BossAIServiceConfig, logger: ILogger, event_bus: IEventBus):
        """
        Initialize BossAIService with dependency injection.
        
        Args:
            config: BossAIServiceConfig loaded from YAML via container
            logger: ILogger instance for structured logging
            event_bus: IEventBus instance for event publishing
            
        ARCHITECTURE COMPLIANCE:
        - Direct Configuration Injection (QUALIA.CODE §II)
        - Logger injection (QUALIA.CODE §V)
        - EventBus interface injection (QUALIA.CODE §IV)
        """
        self._config = config
        self._logger = logger
        self._event_bus = event_bus
        
        self._logger.info("BossAIService initialized with IoC container")
        
        # Boss state
        self._boss_id: Optional[str] = None
        self._song_duration: float = 0.0
        self._difficulty_volume: float = 0.8
        self._tempo_bpm: float = 120.0
        self._current_time: float = 0.0
        self._max_health: float = 0.0
        self._current_health: float = 0.0
        
        # Phase management
        self._current_phase: BossPhase = BossPhase.OPENING
        self._phase_configs: Dict[int, BossPhaseConfig] = {}
        self._load_phase_configs()
        
        # Aggression system
        self._aggression: float = 0.5
        self._aggression_tier: AggressionTier = AggressionTier.NORMAL
        self._aggression_factors: AggressionFactors = AggressionFactors(
            base_volume=0.8,
            tempo_modifier=1.0,
            harmony_modifier=1.0,
            combo_modifier=1.0,
            phase_multiplier=1.0,
            enrage_boost=0.0
        )
        
        # Context tracking
        self._player_position: Tuple[float, float] = (0.0, 0.0)
        self._player_combo: int = 0
        self._player_harmony_score: float = 0.5
        self._player_distance_category: PlayerDistanceCategory = PlayerDistanceCategory.MEDIUM
        
        # Pattern system
        self._available_patterns: Dict[str, AttackPattern] = {}
        self._active_pattern: Optional[AttackPattern] = None
        self._pattern_cooldowns: Dict[str, float] = {}
        self._patterns_used_count: Dict[str, int] = {}
        self._time_since_last_attack: float = 0.0
        self._load_default_patterns()
        
        # Vulnerability system
        self._is_vulnerable: bool = False
        self._vulnerability_end_time: float = 0.0
        
        # Enrage system
        self._is_enraged: bool = False
        self._enrage_triggered_at: Optional[float] = None
        
        # Statistics
        self._stats: Dict[str, Any] = {
            "patterns_executed": 0,
            "total_damage_dealt": 0.0,
            "qualia_generated": 0,
            "phase_transitions": 0,
            "enrage_count": 0,
            "vulnerabilities_created": 0,
            "patterns_neutralized": 0,
        }
        
        self._logger.info("BossAIService initialization complete")

    def _load_phase_configs(self) -> None:
        """Load phase configurations from YAML."""
        phases_data = self._config.get("phases", {})
        phase_mapping = {
            "phase_1_opening": BossPhase.OPENING,
            "phase_2_escalation": BossPhase.ESCALATION,
            "phase_3_climax": BossPhase.CLIMAX,
            "phase_4_finale": BossPhase.FINALE,
        }
        
        for phase_key, phase_enum in phase_mapping.items():
            phase_data = phases_data.get(phase_key, {})
            self._phase_configs[phase_enum.value] = BossPhaseConfig(
                phase_number=phase_enum.value,
                name=phase_data.get("name", ""),
                health_range=tuple(phase_data.get("health_range", [0, 100])),
                song_progress_range=tuple(phase_data.get("song_progress_range", [0.0, 1.0])),
                aggression_multiplier=phase_data.get("aggression_multiplier", 1.0),
                telegraph_multiplier=phase_data.get("telegraph_multiplier", 1.0),
                pattern_frequency_multiplier=phase_data.get("pattern_frequency_multiplier", 1.0),
                allowed_pattern_types=phase_data.get("allowed_pattern_types", []),
                phase_transition_threshold=phase_data.get("phase_transition_threshold", 0.0),
            )
        
        self._logger.info(f"Loaded {len(self._phase_configs)} phase configurations")

    def _load_default_patterns(self) -> None:
        """Load default attack patterns from YAML."""
        patterns_data = self._config.get("default_patterns", {})
        
        for pattern_id, pattern_data in patterns_data.items():
            self._available_patterns[pattern_id] = AttackPattern(
                pattern_id=pattern_id,
                pattern_name=pattern_id.replace("_", " ").title(),
                pattern_type=pattern_data.get("type", "projectile"),
                weight=pattern_data.get("weight", 5.0),
                damage=pattern_data.get("damage", 10.0),
                telegraph_time=pattern_data.get("telegraph_time", 1.5),
                cooldown=pattern_data.get("cooldown", 5.0),
                phase_requirement=pattern_data.get("phase_requirement", 1),
                aggression_requirement=pattern_data.get("aggression_requirement", 0.0),
                radius=pattern_data.get("radius"),
                duration=pattern_data.get("duration"),
                metadata={}
            )
        
        self._logger.info(f"Loaded {len(self._available_patterns)} default attack patterns")

    @log_execution()
    @handle_errors()
    def initialize_boss(
        self,
        boss_id: str,
        song_duration: float,
        difficulty_volume: float,
        tempo_bpm: float,
        combat_data: Optional[Dict[str, Any]] = None
    ) -> BossAIState:
        """Initialize a new boss for combat."""
        self._boss_id = boss_id
        self._song_duration = song_duration
        self._difficulty_volume = difficulty_volume
        self._tempo_bpm = tempo_bpm
        self._current_time = 0.0
        
        # Boss health = song_duration * 10 (GDD.md)
        self._max_health = song_duration * 10.0
        self._current_health = self._max_health
        
        # Reset to phase 1
        self._current_phase = BossPhase.OPENING
        self._stats["phase_transitions"] = 0
        
        # Calculate initial aggression
        self._calculate_aggression()
        
        # Load custom patterns from combat_data if provided
        if combat_data and "patterns" in combat_data:
            self._load_custom_patterns(combat_data["patterns"])
        
        # Emit phase changed event
        self._emit_phase_changed_event()
        
        self._logger.info(
            f"Boss initialized: id={boss_id}, health={self._max_health}, "
            f"duration={song_duration}s, volume={difficulty_volume}, bpm={tempo_bpm}"
        )
        
        return self._get_boss_ai_state()

    def _load_custom_patterns(self, patterns_data: List[Dict[str, Any]]) -> None:
        """Load custom patterns from CombatData."""
        for pattern_data in patterns_data:
            pattern_id = pattern_data.get("id", str(uuid.uuid4()))
            self._available_patterns[pattern_id] = AttackPattern(
                pattern_id=pattern_id,
                pattern_name=pattern_data.get("name", "Custom Pattern"),
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
        
        self._logger.info(f"Loaded {len(patterns_data)} custom attack patterns")

    @log_execution()
    @handle_errors()
    def update(self, dt: float, current_time: float) -> None:
        """Update boss AI state (called every frame)."""
        self._current_time = current_time
        self._time_since_last_attack += dt
        
        # Update pattern cooldowns
        for pattern_id in list(self._pattern_cooldowns.keys()):
            self._pattern_cooldowns[pattern_id] -= dt
            if self._pattern_cooldowns[pattern_id] <= 0:
                del self._pattern_cooldowns[pattern_id]
        
        # Check for phase transitions
        self._check_phase_transition()
        
        # Check for enrage
        self._check_enrage()
        
        # Update vulnerability status
        if self._is_vulnerable and current_time >= self._vulnerability_end_time:
            self._is_vulnerable = False
            self._logger.debug("Boss vulnerability window ended")
        
        # Calculate current aggression
        self._calculate_aggression()
        
        # Pattern selection and execution
        if self._should_attack():
            pattern = self.select_pattern()
            if pattern:
                self.execute_pattern(pattern)

    def _should_attack(self) -> bool:
        """Determine if boss should attempt an attack."""
        if self._active_pattern:
            return False  # Already executing a pattern
        
        min_time = self._config.get("pattern_selection", {}).get("cooldowns", {}).get(
            "min_time_between_patterns", 2.0
        )
        
        if self._time_since_last_attack < min_time:
            return False
        
        # Apply phase frequency multiplier
        phase_config = self._phase_configs.get(self._current_phase.value)
        if phase_config:
            min_time /= phase_config.pattern_frequency_multiplier
        
        # Apply enrage multiplier
        if self._is_enraged:
            enrage_boost = self._config.get("behavior", {}).get("enrage", {}).get(
                "pattern_frequency_boost", 1.5
            )
            min_time /= enrage_boost
        
        return bool(self._time_since_last_attack >= min_time)

    def _check_phase_transition(self) -> None:
        """Check if boss should transition to next phase."""
        if not self._config.get("features", {}).get("enable_phase_transitions", True):
            return
        
        # Calculate health percentage
        health_pct = (self._current_health / self._max_health) * 100.0
        
        # Calculate song progress
        song_progress = self._current_time / self._song_duration if self._song_duration > 0 else 0.0
        
        # Determine target phase based on health and song progress
        new_phase = None
        for phase_num in [4, 3, 2, 1]:  # Check from highest to lowest
            phase_config = self._phase_configs.get(phase_num)
            if phase_config:
                health_min, health_max = phase_config.health_range
                progress_min, progress_max = phase_config.song_progress_range
                
                if (health_min <= health_pct <= health_max and 
                    progress_min <= song_progress <= progress_max):
                    new_phase = BossPhase(phase_num)
                    break
        
        if new_phase and new_phase != self._current_phase:
            old_phase = self._current_phase
            self._current_phase = new_phase
            self._stats["phase_transitions"] += 1
            self._emit_phase_changed_event()
            self._logger.info(f"Boss phase transition: {old_phase.name} → {new_phase.name}")

    def _check_enrage(self) -> None:
        """Check if boss should enter enrage state."""
        if not self._config.get("features", {}).get("enable_enrage_mechanic", True):
            return
        
        if self._is_enraged:
            return  # Already enraged
        
        trigger_time = self._config.get("behavior", {}).get("enrage", {}).get(
            "trigger_time_remaining", 30.0
        )
        
        time_remaining = self._song_duration - self._current_time
        
        if time_remaining <= trigger_time:
            self._is_enraged = True
            self._enrage_triggered_at = self._current_time
            self._stats["enrage_count"] += 1
            self._emit_enraged_event()
            self._logger.warning(f"Boss ENRAGED! {time_remaining:.1f}s remaining in song")

    @log_execution()
    @handle_errors()
    def take_damage(self, damage: float, source: str) -> float:
        """Apply damage to boss."""
        if damage <= 0:
            return 0.0
        
        # Apply vulnerability multiplier
        if self._is_vulnerable:
            vuln_mult = self._config.get("behavior", {}).get("vulnerability", {}).get(
                "damage_multiplier", 1.5
            )
            damage *= vuln_mult
            self._logger.debug(f"Vulnerability multiplier: {vuln_mult}x damage")
        
        # Apply damage
        actual_damage = min(damage, self._current_health)
        self._current_health -= actual_damage
        
        # Emit health changed event
        self._emit_health_changed_event(actual_damage, source)
        
        self._logger.debug(
            f"Boss took {actual_damage:.1f} damage from {source}. "
            f"Health: {self._current_health:.1f}/{self._max_health:.1f}"
        )
        
        return actual_damage

    @log_execution()
    def update_context(
        self,
        player_position: Tuple[float, float],
        player_combo: int,
        player_harmony_score: float,
        player_qualia_state: Optional[Dict[str, float]] = None
    ) -> None:
        """Update AI decision context with player information."""
        self._player_position = player_position
        self._player_combo = player_combo
        self._player_harmony_score = player_harmony_score
        
        # Calculate player distance category
        # Assuming arena is 800x600, center at (400, 300)
        center_x, center_y = 400.0, 300.0
        dist_from_center = math.sqrt(
            (player_position[0] - center_x) ** 2 + 
            (player_position[1] - center_y) ** 2
        )
        max_dist = math.sqrt(center_x ** 2 + center_y ** 2)  # Distance to corner
        dist_ratio = dist_from_center / max_dist
        
        if dist_ratio < 0.3:
            self._player_distance_category = PlayerDistanceCategory.CLOSE
        elif dist_ratio < 0.7:
            self._player_distance_category = PlayerDistanceCategory.MEDIUM
        else:
            self._player_distance_category = PlayerDistanceCategory.FAR
        
        self._logger.debug(
            f"Context updated: pos={player_position}, combo={player_combo}, "
            f"harmony={player_harmony_score:.2f}, distance={self._player_distance_category.value}"
        )

    def _calculate_aggression(self) -> None:
        """Calculate current boss aggression level."""
        if not self._config.get("features", {}).get("enable_aggression_system", True):
            self._aggression = 0.5
            self._aggression_tier = AggressionTier.NORMAL
            return
        
        aggression_config = self._config.get("aggression", {})
        
        # 1. Base volume influence
        volume_influence = aggression_config.get("volume_influence", {})
        if self._difficulty_volume < 0.4:
            base_aggression = volume_influence.get("training", 0.3)
        elif self._difficulty_volume < 0.6:
            base_aggression = volume_influence.get("normal", 0.6)
        elif self._difficulty_volume < 0.8:
            base_aggression = volume_influence.get("hard", 0.8)
        else:
            base_aggression = volume_influence.get("extreme", 1.0)
        
        # 2. Tempo modifier
        tempo_mods = aggression_config.get("tempo_modifiers", {})
        if self._tempo_bpm < 100:
            tempo_mod = tempo_mods.get("slow", 0.8)
        elif self._tempo_bpm < 140:
            tempo_mod = tempo_mods.get("normal", 1.0)
        elif self._tempo_bpm < 180:
            tempo_mod = tempo_mods.get("fast", 1.2)
        else:
            tempo_mod = tempo_mods.get("extreme", 1.4)
        
        # 3. Harmony modifier
        harmony_mods = aggression_config.get("harmony_modifiers", {})
        if self._player_harmony_score >= 0.90:
            harmony_mod = harmony_mods.get("perfect_harmony", 0.7)
        elif self._player_harmony_score >= 0.60:
            harmony_mod = harmony_mods.get("harmonic", 0.85)
        elif self._player_harmony_score >= 0.40:
            harmony_mod = harmony_mods.get("neutral", 1.0)
        elif self._player_harmony_score >= 0.20:
            harmony_mod = harmony_mods.get("chaotic", 1.15)
        else:
            harmony_mod = harmony_mods.get("extreme_chaos", 1.3)
        
        # 4. Combo modifier
        combo_mods = aggression_config.get("combo_modifiers", {})
        if self._player_combo < 10:
            combo_mod = combo_mods.get("low_combo", 0.9)
        elif self._player_combo < 30:
            combo_mod = combo_mods.get("medium_combo", 1.0)
        elif self._player_combo < 50:
            combo_mod = combo_mods.get("high_combo", 1.1)
        else:
            combo_mod = combo_mods.get("ultimate_combo", 1.2)
        
        # 5. Phase multiplier
        phase_config = self._phase_configs.get(self._current_phase.value)
        phase_mult = phase_config.aggression_multiplier if phase_config else 1.0
        
        # 6. Enrage boost
        enrage_boost = 0.0
        if self._is_enraged:
            enrage_boost = self._config.get("behavior", {}).get("enrage", {}).get(
                "aggression_boost", 0.3
            )
        
        # Store factors
        self._aggression_factors = AggressionFactors(
            base_volume=base_aggression,
            tempo_modifier=tempo_mod,
            harmony_modifier=harmony_mod,
            combo_modifier=combo_mod,
            phase_multiplier=phase_mult,
            enrage_boost=enrage_boost
        )
        
        # Calculate final aggression
        self._aggression = (
            base_aggression * tempo_mod * harmony_mod * combo_mod * phase_mult + enrage_boost
        )
        self._aggression = max(0.0, min(1.0, self._aggression))  # Clamp to [0, 1]
        
        # Determine aggression tier
        thresholds = aggression_config.get("thresholds", {})
        if self._aggression < thresholds.get("passive", 0.3):
            new_tier = AggressionTier.PASSIVE
        elif self._aggression < thresholds.get("cautious", 0.5):
            new_tier = AggressionTier.CAUTIOUS
        elif self._aggression < thresholds.get("normal", 0.7):
            new_tier = AggressionTier.NORMAL
        elif self._aggression < thresholds.get("aggressive", 0.85):
            new_tier = AggressionTier.AGGRESSIVE
        else:
            new_tier = AggressionTier.ENRAGED
        
        # Emit event if tier changed
        if new_tier != self._aggression_tier:
            old_tier = self._aggression_tier
            self._aggression_tier = new_tier
            self._emit_aggression_changed_event()
            self._logger.debug(f"Aggression tier changed: {old_tier.value} → {new_tier.value}")

    @log_execution()
    @handle_errors()
    def select_pattern(self) -> Optional[AttackPattern]:
        """Select the next attack pattern based on current context."""
        # Get eligible patterns
        eligible_patterns = self._get_eligible_patterns()
        
        if not eligible_patterns:
            self._logger.warning("No eligible patterns available for selection")
            return None
        
        # Apply context-based weights
        weighted_patterns = self._apply_context_weights(eligible_patterns)
        
        # Select pattern using weighted random selection
        selected_pattern = self._weighted_random_selection(weighted_patterns)
        
        if selected_pattern:
            # Emit pattern selected event
            self._emit_pattern_selected_event(selected_pattern)
            self._logger.info(f"Pattern selected: {selected_pattern.pattern_name}")
        
        return selected_pattern

    def _get_eligible_patterns(self) -> List[AttackPattern]:
        """Get patterns eligible for selection based on current state."""
        eligible = []
        phase_config = self._phase_configs.get(self._current_phase.value)
        
        for pattern in self._available_patterns.values():
            # Check phase requirement
            if pattern.phase_requirement > self._current_phase.value:
                continue
            
            # Check aggression requirement
            if pattern.aggression_requirement > self._aggression:
                continue
            
            # Check cooldown
            if pattern.pattern_id in self._pattern_cooldowns:
                continue
            
            # Check allowed pattern types for current phase
            if phase_config and pattern.pattern_type not in phase_config.allowed_pattern_types:
                continue
            
            eligible.append(pattern)
        
        return eligible

    def _apply_context_weights(
        self, patterns: List[AttackPattern]
    ) -> List[Tuple[AttackPattern, float]]:
        """Apply context-based weight modifiers to patterns."""
        weighted = []
        context_weights = self._config.get("pattern_selection", {}).get("context_weights", {})
        
        for pattern in patterns:
            weight = pattern.weight
            
            # Player distance modifier
            distance_prefs = context_weights.get("player_distance", {}).get(
                self._player_distance_category.value, []
            )
            if pattern.pattern_type in distance_prefs:
                weight *= 1.5
            
            # Player harmony modifier
            if self._player_harmony_score >= 0.60:
                harmony_cat = "harmonic"
            elif self._player_harmony_score >= 0.40:
                harmony_cat = "neutral"
            else:
                harmony_cat = "chaotic"
            
            harmony_prefs = context_weights.get("player_harmony", {}).get(harmony_cat, [])
            if pattern.pattern_type in harmony_prefs:
                weight *= 1.3
            
            # Boss health modifier
            health_pct = (self._current_health / self._max_health) * 100.0
            if health_pct > 75:
                health_cat = "healthy"
            elif health_pct > 25:
                health_cat = "wounded"
            else:
                health_cat = "critical"
            
            health_prefs = context_weights.get("boss_health", {}).get(health_cat, [])
            if pattern.pattern_type in health_prefs:
                weight *= 1.4
            
            weighted.append((pattern, weight))
        
        return weighted

    def _weighted_random_selection(
        self, weighted_patterns: List[Tuple[AttackPattern, float]]
    ) -> Optional[AttackPattern]:
        """Select a pattern using weighted random selection."""
        if not weighted_patterns:
            return None
        
        patterns = [p for p, w in weighted_patterns]
        weights = [w for p, w in weighted_patterns]
        total_weight = sum(weights)
        
        if total_weight <= 0:
            return random.choice(patterns)
        
        # Normalize weights to probabilities
        probabilities = [w / total_weight for w in weights]
        
        # Select using random.choices
        selected = random.choices(patterns, weights=probabilities, k=1)[0]
        return selected

    @log_execution()
    @handle_errors()
    def execute_pattern(self, pattern: AttackPattern) -> PatternExecutionResult:
        """Execute a boss attack pattern."""
        self._active_pattern = pattern
        self._time_since_last_attack = 0.0
        
        # Calculate telegraph duration
        telegraph_duration = self._calculate_telegraph_duration(pattern)
        
        # Set cooldown
        self._pattern_cooldowns[pattern.pattern_id] = pattern.cooldown
        
        # Track usage
        self._patterns_used_count[pattern.pattern_id] = (
            self._patterns_used_count.get(pattern.pattern_id, 0) + 1
        )
        
        # Generate Qualia if enabled
        qualia_generated = 0
        if self._config.get("qualia_generation", {}).get("enabled", True):
            qualia_generated = self._generate_qualia_for_pattern(pattern)
        
        # Check for vulnerability window
        vulnerability_created = False
        if self._config.get("behavior", {}).get("vulnerability", {}).get("enabled", True):
            vuln_duration = self._config.get("behavior", {}).get("vulnerability", {}).get(
                "duration_after_pattern", 1.5
            )
            self._is_vulnerable = True
            self._vulnerability_end_time = self._current_time + telegraph_duration + vuln_duration
            vulnerability_created = True
            self._stats["vulnerabilities_created"] += 1
            self._emit_vulnerable_event(vuln_duration)
        
        # Check if pattern can be neutralized (will be handled by combo system)
        neutralized = False
        
        # Update statistics
        self._stats["patterns_executed"] += 1
        self._stats["total_damage_dealt"] += pattern.damage
        self._stats["qualia_generated"] += qualia_generated
        
        # Emit attack event
        self._emit_attack_event(pattern, telegraph_duration)
        
        # Create result
        result = PatternExecutionResult(
            pattern_id=pattern.pattern_id,
            success=True,
            damage_dealt=pattern.damage,
            qualia_generated=qualia_generated,
            telegraph_duration=telegraph_duration,
            vulnerability_created=vulnerability_created,
            neutralized_by_combo=neutralized,
            timestamp=self._current_time,
            metadata={"phase": self._current_phase.value, "aggression": self._aggression}
        )
        
        # Clear active pattern after execution
        self._active_pattern = None
        
        self._logger.info(
            f"Pattern executed: {pattern.pattern_name}, "
            f"damage={pattern.damage}, telegraph={telegraph_duration:.2f}s, "
            f"qualia={qualia_generated}, vulnerable={vulnerability_created}"
        )
        
        return result

    def _calculate_telegraph_duration(self, pattern: AttackPattern) -> float:
        """Calculate adjusted telegraph duration for pattern."""
        base_duration = pattern.telegraph_time
        
        # Apply phase multiplier
        phase_config = self._phase_configs.get(self._current_phase.value)
        if phase_config:
            base_duration *= phase_config.telegraph_multiplier
        
        # Apply enrage reduction
        if self._is_enraged:
            enrage_reduction = self._config.get("behavior", {}).get("enrage", {}).get(
                "telegraph_reduction", 0.5
            )
            base_duration *= (1.0 - enrage_reduction)
        
        # Apply harmony bonus/penalty
        if self._player_harmony_score >= 0.60:
            bonus = self._config.get("pattern_selection", {}).get("telegraph", {}).get(
                "harmony_bonus", 0.3
            )
            base_duration += bonus
        elif self._player_harmony_score < 0.40:
            penalty = self._config.get("pattern_selection", {}).get("telegraph", {}).get(
                "chaos_penalty", -0.2
            )
            base_duration += penalty  # penalty is negative
        
        # Clamp to minimum
        min_duration = self._config.get("pattern_selection", {}).get("telegraph", {}).get(
            "min_duration", 0.3
        )
        
        return float(max(min_duration, base_duration))

    def _generate_qualia_for_pattern(self, pattern: AttackPattern) -> int:
        """Generate Qualia entities for attack pattern."""
        qualia_config = self._config.get("qualia_generation", {})
        base_amount = qualia_config.get("generation_per_attack", 5)
        
        # Apply phase multiplier
        phase_mult = qualia_config.get("generation_multiplier_by_phase", {}).get(
            self._current_phase.value, 1.0
        )
        
        qualia_amount = int(base_amount * phase_mult)
        
        # Emit Qualia generation events
        color_dist = qualia_config.get("color_distribution", {})
        colors = ["purple", "black", "red"]
        weights = [color_dist.get(c, 0.33) for c in colors]
        
        for _ in range(qualia_amount):
            color = random.choices(colors, weights=weights, k=1)[0]
            self._emit_qualia_generated_event(color, pattern.pattern_id)
        
        return qualia_amount

    @log_execution()
    @handle_errors()
    def neutralize_pattern(self, pattern_id: str, combo_type: str) -> bool:
        """Attempt to neutralize an active attack pattern with a harmonic combo."""
        if not self._config.get("behavior", {}).get("vulnerability", {}).get(
            "harmonic_combo_neutralizes", True
        ):
            return False
        
        # Only harmonic combos can neutralize
        if combo_type != "harmonic":
            return False
        
        # Check if pattern is currently active
        if not self._active_pattern or self._active_pattern.pattern_id != pattern_id:
            return False
        
        # Neutralize pattern
        self._active_pattern = None
        self._stats["patterns_neutralized"] += 1
        
        # Create extended vulnerability window
        vuln_duration = self._config.get("behavior", {}).get("vulnerability", {}).get(
            "duration_after_pattern", 1.5
        )
        extended_duration = vuln_duration * 2.0  # 2x duration for neutralization
        
        self._is_vulnerable = True
        self._vulnerability_end_time = self._current_time + extended_duration
        self._emit_vulnerable_event(extended_duration)
        
        self._logger.info(f"Pattern {pattern_id} NEUTRALIZED by harmonic combo!")
        
        return True

    # Event emission methods
    def _emit_phase_changed_event(self) -> None:
        """Emit BossPhaseChangedEvent."""
        phase_config = self._phase_configs.get(self._current_phase.value)
        event = BossPhaseChangedEvent(
            boss_id=self._boss_id or "unknown",
            new_phase=self._current_phase.value,
            phase_description=phase_config.name if phase_config else "Unknown",
            timestamp=time.time(),
            source="BossAIService"
        )
        self._event_bus.publish(event)

    def _emit_attack_event(self, pattern: AttackPattern, telegraph_duration: float) -> None:
        """Emit BossAttackEvent."""
        event = BossAttackEvent(
            boss_id=self._boss_id or "unknown",
            attack_id=str(uuid.uuid4()),
            pattern_id=pattern.pattern_id,
            telegraph_duration=telegraph_duration,
            timestamp=time.time(),
            source="BossAIService",
            metadata={
                "pattern_name": pattern.pattern_name,
                "pattern_type": pattern.pattern_type,
                "damage": pattern.damage,
                "phase": self._current_phase.value,
                "aggression": self._aggression,
                "radius": pattern.radius,
                "duration": pattern.duration
            }
        )
        self._event_bus.publish(event)

    def _emit_aggression_changed_event(self) -> None:
        """Emit BossAggressionChangedEvent."""
        event = BossAggressionChangedEvent(
            boss_id=self._boss_id or "unknown",
            old_aggression=0.5,  # Simplified
            new_aggression=self._aggression,
            aggression_tier=self._aggression_tier.value,
            factors={
                "base_volume": self._aggression_factors.base_volume,
                "tempo_modifier": self._aggression_factors.tempo_modifier,
                "harmony_modifier": self._aggression_factors.harmony_modifier,
                "combo_modifier": self._aggression_factors.combo_modifier,
                "phase_multiplier": self._aggression_factors.phase_multiplier,
                "enrage_boost": self._aggression_factors.enrage_boost,
            },
            timestamp=time.time(),
            source="BossAIService"
        )
        self._event_bus.publish(event)

    def _emit_pattern_selected_event(self, pattern: AttackPattern) -> None:
        """Emit BossPatternSelectedEvent."""
        event = BossPatternSelectedEvent(
            boss_id=self._boss_id or "unknown",
            pattern_id=pattern.pattern_id,
            pattern_type=pattern.pattern_type,
            pattern_name=pattern.pattern_name,
            selection_context={
                "distance_category": self._player_distance_category.value,
                "harmony_score": self._player_harmony_score,
                "aggression": self._aggression,
                "phase": self._current_phase.value,
                "player_combo": self._player_combo
            },
            timestamp=time.time(),
            source="BossAIService"
        )
        self._event_bus.publish(event)

    def _emit_enraged_event(self) -> None:
        """Emit BossEnragedEvent."""
        event = BossEnragedEvent(
            boss_id=self._boss_id or "unknown",
            time_remaining=self._song_duration - self._current_time,
            enrage_multipliers={
                "aggression_boost": self._aggression_factors.enrage_boost,
                "telegraph_reduction": self._config.get("behavior", {}).get("enrage", {}).get("telegraph_reduction", 0.5),
                "pattern_frequency_boost": self._config.get("behavior", {}).get("enrage", {}).get("pattern_frequency_boost", 1.5)
            },
            timestamp=time.time(),
            source="BossAIService"
        )
        self._event_bus.publish(event)

    def _emit_vulnerable_event(self, duration: float) -> None:
        """Emit BossVulnerableEvent."""
        event = BossVulnerableEvent(
            boss_id=self._boss_id or "unknown",
            vulnerability_duration=duration,
            damage_multiplier=self._config.get("behavior", {}).get("vulnerability", {}).get(
                "damage_multiplier", 1.5
            ),
            can_be_neutralized=self._config.get("behavior", {}).get("vulnerability", {}).get(
                "harmonic_combo_neutralizes", True
            ),
            timestamp=time.time(),
            source="BossAIService"
        )
        self._event_bus.publish(event)

    def _emit_health_changed_event(self, damage: float, source: str) -> None:
        """Emit HealthChangedEvent."""
        event = HealthChangedEvent(
            entity_id=self._boss_id or "unknown",
            entity_type="boss",
            new_health=self._current_health,
            health_delta=-damage,
            reason="damage",
            timestamp=time.time(),
            source="BossAIService"
        )
        self._event_bus.publish(event)

    def _emit_qualia_generated_event(self, color_name: str, source_pattern: str) -> None:
        """Emit QualiaGeneratedEvent."""
        qualia_id = str(uuid.uuid4())
        
        # Map color name to RGB
        color_map = {
            "purple": {"r": 0.5, "g": 0.0, "b": 0.5},
            "black": {"r": 0.0, "g": 0.0, "b": 0.0},
            "red": {"r": 1.0, "g": 0.0, "b": 0.0}
        }
        color_rgb = color_map.get(color_name, {"r": 0.5, "g": 0.0, "b": 0.5})
        
        event = QualiaGeneratedEvent(
            qualia_id=qualia_id,
            position={"x": random.uniform(100, 700), "y": random.uniform(100, 500)},
            color=color_rgb,
            source_type="boss_attack",
            value=5.0,
            timestamp=time.time(),
            source="BossAIService",
            metadata={"source_pattern": source_pattern}
        )
        self._event_bus.publish(event)

    # Getter methods
    @log_execution()
    def get_current_phase(self) -> BossPhase:
        return self._current_phase

    @log_execution()
    def get_current_aggression(self) -> float:
        return self._aggression

    @log_execution()
    def get_aggression_tier(self) -> AggressionTier:
        return self._aggression_tier

    @log_execution()
    def is_enraged(self) -> bool:
        return self._is_enraged

    @log_execution()
    def is_vulnerable(self) -> bool:
        return self._is_vulnerable

    @log_execution()
    def get_active_pattern(self) -> Optional[AttackPattern]:
        return self._active_pattern

    @log_execution()
    def get_pattern_cooldowns(self) -> Dict[str, float]:
        return self._pattern_cooldowns.copy()

    @log_execution()
    def get_boss_health(self) -> float:
        return self._current_health

    @log_execution()
    def get_boss_max_health(self) -> float:
        return self._max_health

    @log_execution()
    def get_state_snapshot(self) -> BossStateSnapshot:
        return BossStateSnapshot(
            boss_id=self._boss_id or "unknown",
            health=self._current_health,
            phase=self._current_phase.value,
            aggression=self._aggression,
            aggression_tier=self._aggression_tier.value,
            is_enraged=self._is_enraged,
            is_vulnerable=self._is_vulnerable,
            patterns_executed=self._stats["patterns_executed"],
            total_damage_dealt=self._stats["total_damage_dealt"],
            qualia_generated=self._stats["qualia_generated"],
            timestamp=self._current_time
        )

    def _get_boss_ai_state(self) -> BossAIState:
        """Get complete BossAIState."""
        return BossAIState(
            boss_id=self._boss_id or "unknown",
            current_phase=self._current_phase,
            current_aggression=self._aggression,
            aggression_tier=self._aggression_tier,
            aggression_factors=self._aggression_factors,
            is_enraged=self._is_enraged,
            is_vulnerable=self._is_vulnerable,
            vulnerability_end_time=self._vulnerability_end_time,
            time_since_last_attack=self._time_since_last_attack,
            active_pattern=self._active_pattern,
            pattern_cooldowns=self._pattern_cooldowns.copy(),
            patterns_used_count=self._patterns_used_count.copy(),
            timestamp=self._current_time
        )

    # ==================== @OnEvent Handlers (PHASE 3.3 Rollout) ====================

    @handle_errors(fallback_return_value=None)
    @OnEvent("PlayerAction")
    async def _on_player_action(self, event_data: Dict[str, Any]) -> None:
        """
        Handle PlayerAction event to update boss aggression factors.
        
        PHASE 3.3: @OnEvent decorator usage for automatic event subscription.
        ApplicationInitializerService will scan and register this handler.
        
        Args:
            event_data: Event payload with player action information
        """
        try:
            action_type = event_data.get('action_type')
            if action_type in ['dash', 'ability_cast', 'combo_complete']:
                # Player aggressive actions should slightly increase boss caution
                # This could influence next pattern selection
                self._logger.debug(
                    f"Boss AI registered player action: {action_type}",
                    extra={'boss_id': self._boss_id, 'current_phase': self._current_phase}
                )
                # Could update internal factors here for more dynamic AI
                # For now, just log the action for future enhancement
        except Exception as e:
            self._logger.error(f"Error handling PlayerAction event: {e}")

    @handle_errors(fallback_return_value=None)
    @OnEvent("HealthChanged")
    async def _on_health_changed(self, event_data: Dict[str, Any]) -> None:
        """
        Handle HealthChanged event to track boss health updates.
        
        PHASE 3.3: @OnEvent decorator usage for automatic event subscription.
        ApplicationInitializerService will scan and register this handler.
        
        Args:
            event_data: Event payload with health change information
        """
        try:
            entity_id = event_data.get('entity_id')
            if entity_id == self._boss_id:
                new_health = event_data.get('new_health', self._current_health)
                old_health = self._current_health
                self._current_health = new_health
                
                # Check if this triggers enrage (health < 30% and not already enraged)
                health_percent = self._current_health / self._max_health if self._max_health > 0 else 0
                if health_percent < 0.3 and not self._is_enraged:
                    self._is_enraged = True
                    self._logger.warning(
                        f"Boss enraged at {health_percent:.1%} health",
                        extra={'boss_id': self._boss_id, 'health': self._current_health}
                    )
                    # Emit enrage event
                    enrage_event = BossEnragedEvent(
                        boss_id=self._boss_id,
                        health_percent=health_percent,
                        timestamp=self._current_time
                    )
                    self._event_bus.publish(enrage_event)
                    self._stats['enrage_count'] += 1
                
                self._logger.debug(
                    f"Boss health updated: {old_health:.1f} → {new_health:.1f}",
                    extra={'boss_id': self._boss_id, 'health_percent': health_percent}
                )
        except Exception as e:
            self._logger.error(f"Error handling HealthChanged event: {e}")

    # ==================== IBaseService Lifecycle Methods (PHASE 3.3) ====================

    async def initialize(self) -> None:
        """
        Initialize BossAIService lifecycle (IBaseService implementation).
        
        PHASE 3.3: IBaseService implementation.
        ApplicationInitializerService will automatically scan for @OnEvent
        decorators and register event handlers during this initialization.
        
        This method is called automatically during system startup.
        """
        self._logger.info("BossAIService lifecycle initialized (IBaseService)")

    async def cleanup(self) -> None:
        """
        Cleanup BossAIService resources (IBaseService implementation).
        
        PHASE 3.3: IBaseService implementation.
        ApplicationInitializerService will automatically unregister all
        @OnEvent handlers during cleanup.
        
        This method MUST NOT raise exceptions (per IBaseService contract).
        """
        try:
            self._logger.info("BossAIService lifecycle cleanup (IBaseService)")
            # Reset AI state
            self.reset()
        except Exception as e:
            # Log but don't raise (IBaseService contract requirement)
            self._logger.error(f"Error during BossAIService cleanup: {e}")

    def get_health_status(self) -> Dict[str, Any]:
        """
        Get comprehensive health status for diagnostics (IBaseService implementation).
        
        PHASE 3.3: IBaseService implementation.
        Returns comprehensive diagnostic information about service state.
        
        Returns:
            Dict with health metrics including:
            - service: Service name
            - status: "healthy", "degraded", or "error"
            - boss_initialized: Whether boss_id is set
            - boss_id: Current boss ID
            - current_phase: Current boss phase
            - current_aggression: Current aggression level
            - aggression_tier: Current aggression tier
            - is_enraged: Whether boss is enraged
            - is_vulnerable: Whether boss is vulnerable
            - current_health: Current boss health
            - max_health: Maximum boss health
            - health_percent: Health percentage
            - active_pattern: Current active pattern (if any)
            - patterns_executed: Total patterns executed
            - phase_transitions: Total phase transitions
            - enrage_count: Number of times boss has enraged
        """
        health_percent = self._current_health / self._max_health if self._max_health > 0 else 0.0
        
        # Determine status
        if not self._boss_id:
            status = "degraded"
        elif self._current_health <= 0:
            status = "error"
        else:
            status = "healthy"
        
        return {
            'service': 'BossAIService',
            'status': status,
            'boss_initialized': self._boss_id is not None,
            'boss_id': self._boss_id,
            'current_phase': self._current_phase,
            'current_aggression': self._aggression,
            'aggression_tier': self._aggression_tier,
            'is_enraged': self._is_enraged,
            'is_vulnerable': self._is_vulnerable,
            'current_health': self._current_health,
            'max_health': self._max_health,
            'health_percent': health_percent,
            'active_pattern': self._active_pattern.pattern_id if self._active_pattern else None,
            'patterns_executed': self._stats.get('patterns_executed', 0),
            'phase_transitions': self._stats.get('phase_transitions', 0),
            'enrage_count': self._stats.get('enrage_count', 0)
        }

    @log_execution()
    def reset(self) -> None:
        """Reset boss AI to initial state."""
        self._boss_id = None
        self._song_duration = 0.0
        self._current_time = 0.0
        self._current_health = 0.0
        self._max_health = 0.0
        self._current_phase = BossPhase.OPENING
        self._aggression = 0.5
        self._aggression_tier = AggressionTier.NORMAL
        self._is_enraged = False
        self._is_vulnerable = False
        self._active_pattern = None
        self._pattern_cooldowns.clear()
        self._patterns_used_count.clear()
        self._stats = {
            "patterns_executed": 0,
            "total_damage_dealt": 0.0,
            "qualia_generated": 0,
            "phase_transitions": 0,
            "enrage_count": 0,
            "vulnerabilities_created": 0,
            "patterns_neutralized": 0,
        }
        self._logger.info("BossAIService reset to initial state")

    @log_execution()
    def get_statistics(self) -> Dict[str, Any]:
        return self._stats.copy()
