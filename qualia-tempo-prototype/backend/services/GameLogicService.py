# QUALIA.CODE v1.1 - GameLogicService Implementation
# Core game mechanics and rules from GDD.md

import logging
import time
import uuid
import yaml
from typing import Dict, List, Optional, Tuple, Any
from pathlib import Path

from backend.services.interfaces.IGameLogicService import (
    IGameLogicService,
    QualiaEntity,
    ComboEffect
)
from backend.services.EventBus import EventBus
from backend.services.contracts.events import (
    PlayerDashEvent,
    PlayerKeyPressEvent,
    PlayerAbilityActivatedEvent,
    QualiaGeneratedEvent,
    QualiaCollectedEvent,
    QualiaExpiredEvent,
    MetronomeTickEvent,
    ComboActivatedEvent,
    ScoreUpdatedEvent,
    HealthChangedEvent,
    UltimateActivatedEvent,
    CooldownUpdatedEvent,
)
from backend.utils.decorators import log_execution, handle_errors


class GameLogicService(IGameLogicService):
    """
    Core game logic service implementing GDD.md mechanics.
    
    ARCHITECTURE COMPLIANCE:
    - Backend calculates STATE only (ARCHITECTURE.GOLD.CODE)
    - Event-driven via EventBus (QUALIA.CODE)
    - Configuration externalized to YAML (QUALIA.CODE)
    - Decorators for logging/error handling (QUALIA.CODE)
    
    RESPONSIBILITIES:
    1. Qualia generation (dash, ability, metronome)
    2. Emergent combo system (harmonic/chaotic)
    3. Score calculation with multipliers
    4. Health management (player/boss)
    5. Ultimate ability (x40 combo threshold)
    6. Difficulty scaling (volume-based)
    7. Tempo-aware cooldowns
    """

    def __init__(self, event_bus: EventBus, config_path: Optional[str] = None):
        """
        Initialize GameLogicService.
        
        Args:
            event_bus: EventBus instance for event publishing
            config_path: Path to game-logic.yaml configuration
        """
        self._logger = logging.getLogger(__name__)
        self._event_bus = event_bus
        
        # Load configuration
        if config_path is None:
            config_path_final: Path = Path(__file__).parent.parent / "config" / "game-logic.yaml"
        else:
            config_path_final = Path(config_path) if not isinstance(config_path, Path) else config_path
        
        with open(config_path_final, 'r') as f:
            self._config = yaml.safe_load(f)
        
        # Game state
        self._player_id: Optional[str] = None
        self._boss_id: Optional[str] = None
        self._song_duration: float = 0.0
        self._current_time: float = 0.0
        
        # Player state
        self._player_health: float = 0.0
        self._player_combo: int = 0
        self._player_score: int = 0
        self._player_position: Dict[str, float] = {"x": 0.0, "y": 0.0}
        self._last_action_time: float = 0.0
        
        # Boss state
        self._boss_health: float = 0.0
        self._boss_phase: int = 1
        self._boss_aggression: float = 1.0
        
        # Qualia tracking
        self._active_qualia: Dict[str, QualiaEntity] = {}
        self._qualia_generated_count: int = 0
        self._qualia_collected_count: int = 0
        
        # Combo tracking
        self._recent_keys: List[Tuple[str, float]] = []  # (key, timestamp)
        self._active_effects: List[ComboEffect] = []
        self._harmonic_combos_activated: int = 0
        self._chaotic_combos_activated: int = 0
        
        # Cooldowns
        self._ability_cooldowns: Dict[str, float] = {}  # key -> cooldown_end_timestamp
        self._ultimate_active: bool = False
        self._ultimate_end_time: float = 0.0
        self._ultimate_cooldown_end: float = 0.0
        
        # Tempo and difficulty
        self._current_bpm: float = 120.0
        self._current_volume: float = 0.8
        self._difficulty_level: str = "normal"
        self._difficulty_multipliers: Dict[str, float] = {}
        
        # Statistics
        self._stats = {
            "total_qualia_generated": 0,
            "total_qualia_collected": 0,
            "total_qualia_expired": 0,
            "total_dashes": 0,
            "total_abilities_used": 0,
            "total_harmonic_combos": 0,
            "total_chaotic_combos": 0,
            "max_combo": 0,
            "perfect_collections": 0,
            "total_damage_dealt": 0,
            "total_damage_taken": 0,
        }
        
        self._logger.info("GameLogicService initialized")

    @log_execution(level="INFO")
    @handle_errors(fallback_return_value=None)
    def initialize(self, player_id: str, boss_id: str, song_duration_sec: float) -> None:
        """Initialize game session."""
        self._player_id = player_id
        self._boss_id = boss_id
        self._song_duration = song_duration_sec
        self._current_time = 0.0
        
        # Initialize player
        health_config = self._config['health_system']
        self._player_health = health_config['player_starting_health']
        self._player_combo = 0
        self._player_score = 0
        self._player_position = {"x": 0.0, "y": 0.0}
        
        # Initialize boss
        self._boss_health = song_duration_sec * health_config['boss_health_per_second']
        self._boss_phase = 1
        
        # Set difficulty
        self.set_difficulty(self._current_volume)
        
        # Reset tracking
        self._active_qualia.clear()
        self._active_effects.clear()
        self._recent_keys.clear()
        self._ability_cooldowns.clear()
        self._ultimate_active = False
        
        self._logger.info(
            f"Game initialized: player={player_id}, boss={boss_id}, "
            f"duration={song_duration_sec}s, boss_health={self._boss_health}"
        )

    @log_execution(level="DEBUG")
    @handle_errors(fallback_return_value=[])
    def process_player_dash(
        self, 
        player_id: str, 
        position: Dict[str, float], 
        direction: Dict[str, float],
        on_beat: bool,
        timestamp: float
    ) -> List[QualiaEntity]:
        """Process player dash and generate Qualia."""
        if player_id != self._player_id:
            self._logger.warning(f"Dash from unknown player: {player_id}")
            return []
        
        qualia_config = self._config['qualia_generation']
        base_value = qualia_config['dash_base_value']
        
        # Apply on-beat multiplier
        if on_beat:
            base_value *= qualia_config['on_beat_multiplier']
        
        # Apply ultimate multiplier
        if self._ultimate_active:
            combo_config = self._config['combo_system']
            base_value *= combo_config['ultimate_qualia_multiplier']
        
        # Generate Qualia
        qualia = self._generate_qualia(
            position=position,
            source_type='dash',
            value=base_value,
            timestamp=timestamp
        )
        
        self._stats['total_dashes'] += 1
        self._last_action_time = timestamp
        
        # Emit dash event
        self._event_bus.publish(PlayerDashEvent(
            player_id=player_id,
            position=position,
            direction=direction,
            on_beat=on_beat,
            timestamp=timestamp
        ))
        
        return [qualia]

    @log_execution(level="DEBUG")
    @handle_errors(fallback_return_value=(False, None, "Internal error"))
    def process_ability_use(
        self,
        player_id: str,
        ability_key: str,
        position: Dict[str, float],
        on_beat: bool,
        timestamp: float
    ) -> Tuple[bool, Optional[QualiaEntity], Optional[str]]:
        """Process ability use (musical key press)."""
        if player_id != self._player_id:
            return False, None, f"Unknown player: {player_id}"
        
        # Check if key is valid
        valid_keys = ['Q', 'E', 'R', 'T', 'F', 'G', 'C']
        if ability_key not in valid_keys:
            return False, None, f"Invalid ability key: {ability_key}"
        
        # Check cooldown
        if ability_key in self._ability_cooldowns:
            cooldown_remaining = self._ability_cooldowns[ability_key] - timestamp
            if cooldown_remaining > 0:
                return False, None, f"Ability on cooldown: {cooldown_remaining:.2f}s remaining"
        
        # Calculate cooldown with tempo modifier
        base_cooldown = self._config['cooldowns']['ability_base_cooldown']
        actual_cooldown = self._calculate_tempo_modified_cooldown(base_cooldown)
        self._ability_cooldowns[ability_key] = timestamp + actual_cooldown
        
        # Generate Qualia
        qualia_config = self._config['qualia_generation']
        base_value = qualia_config['ability_base_value']
        
        if on_beat:
            base_value *= qualia_config['on_beat_multiplier']
        
        if self._ultimate_active:
            combo_config = self._config['combo_system']
            base_value *= combo_config['ultimate_qualia_multiplier']
        
        qualia = self._generate_qualia(
            position=position,
            source_type='ability',
            value=base_value,
            timestamp=timestamp
        )
        
        # Track key for combo detection
        self._recent_keys.append((ability_key, timestamp))
        # Keep only recent keys (last 5 seconds)
        self._recent_keys = [(k, t) for k, t in self._recent_keys if timestamp - t < 5.0]
        
        # Check for combo activation
        recent_key_list = [k for k, t in self._recent_keys]
        combo_effect = self.check_combo_activation(player_id, recent_key_list)
        
        self._stats['total_abilities_used'] += 1
        self._last_action_time = timestamp
        
        # Map key to musical note (simplified, could be more complex)
        key_to_note = {'Q': 'C', 'E': 'D', 'R': 'E', 'T': 'F', 'F': 'G', 'G': 'A', 'C': 'B'}
        note = key_to_note.get(ability_key, 'C')
        
        # Emit key press event
        self._event_bus.publish(PlayerKeyPressEvent(
            player_id=player_id,
            key=ability_key,
            note=note,
            timestamp=timestamp,
            on_beat=on_beat
        ))
        
        # Emit cooldown event
        self._event_bus.publish(CooldownUpdatedEvent(
            player_id=player_id,
            ability_key=ability_key,
            cooldown_remaining=actual_cooldown,
            timestamp=timestamp
        ))
        
        return True, qualia, None

    @log_execution(level="DEBUG")
    @handle_errors(fallback_return_value=[])
    def process_metronome_tick(
        self,
        beat_number: int,
        bpm: float,
        timestamp: float
    ) -> List[QualiaEntity]:
        """Process metronome tick and generate Qualia."""
        qualia_config = self._config['qualia_generation']
        base_value = qualia_config['metronome_base_value']
        
        if self._ultimate_active:
            combo_config = self._config['combo_system']
            base_value *= combo_config['ultimate_qualia_multiplier']
        
        # Generate Qualia at a random position near player
        import random
        offset_x = random.uniform(-2.0, 2.0)
        offset_y = random.uniform(-2.0, 2.0)
        position = {
            'x': self._player_position['x'] + offset_x,
            'y': self._player_position['y'] + offset_y
        }
        
        qualia = self._generate_qualia(
            position=position,
            source_type='metronome',
            value=base_value,
            timestamp=timestamp
        )
        
        # Emit metronome tick event
        self._event_bus.publish(MetronomeTickEvent(
            beat_number=beat_number,
            bpm=bpm,
            timestamp=timestamp
        ))
        
        return [qualia]

    def _generate_qualia(
        self,
        position: Dict[str, float],
        source_type: str,
        value: float,
        timestamp: float
    ) -> QualiaEntity:
        """Generate a new Qualia entity."""
        qualia_id = str(uuid.uuid4())
        
        # Get color based on source type
        qualia_config = self._config['qualia_generation']
        if self._ultimate_active:
            color = qualia_config['colors']['ultimate']
        else:
            color = qualia_config['colors'].get(source_type, qualia_config['colors']['dash'])
        
        qualia = QualiaEntity(
            id=qualia_id,
            position=position.copy(),
            color=color.copy(),
            value=value,
            generated_timestamp=timestamp,
            source_type=source_type
        )
        
        self._active_qualia[qualia_id] = qualia
        self._qualia_generated_count += 1
        self._stats['total_qualia_generated'] += 1
        
        # Emit generation event
        self._event_bus.publish(QualiaGeneratedEvent(
            qualia_id=qualia_id,
            position=position,
            color=color,
            source_type=source_type,
            value=value,
            timestamp=timestamp
        ))
        
        return qualia

    @log_execution(level="DEBUG")
    @handle_errors(fallback_return_value=(False, 0.0, 0))
    def process_qualia_collection(
        self,
        player_id: str,
        qualia_id: str,
        collection_timestamp: float
    ) -> Tuple[bool, float, int]:
        """Process Qualia collection."""
        if player_id != self._player_id:
            return False, 0.0, self._player_combo
        
        if qualia_id not in self._active_qualia:
            return False, 0.0, self._player_combo
        
        qualia = self._active_qualia[qualia_id]
        
        # Check collection window
        qualia_config = self._config['qualia_generation']
        collection_time = (collection_timestamp - qualia.generated_timestamp) * 1000  # to ms
        max_window = qualia_config['collection_window_ms']
        
        if collection_time > max_window:
            # Expired
            del self._active_qualia[qualia_id]
            self._stats['total_qualia_expired'] += 1
            self._event_bus.publish(QualiaExpiredEvent(
                qualia_id=qualia_id,
                lifetime=collection_time,
                timestamp=collection_timestamp
            ))
            return False, 0.0, self._player_combo
        
        # Valid collection
        perfect_window = qualia_config['perfect_collection_window_ms']
        is_perfect = collection_time <= perfect_window
        
        # Update combo
        self._player_combo += 1
        if self._player_combo > self._stats['max_combo']:
            self._stats['max_combo'] = self._player_combo
        
        # Calculate score
        score_gained = self._calculate_score(qualia.value, is_perfect)
        self._player_score += int(score_gained)
        
        if is_perfect:
            self._stats['perfect_collections'] += 1
        
        # Remove from active
        del self._active_qualia[qualia_id]
        self._qualia_collected_count += 1
        self._stats['total_qualia_collected'] += 1
        
        # Emit events
        self._event_bus.publish(QualiaCollectedEvent(
            player_id=player_id,
            qualia_id=qualia_id,
            value=qualia.value,
            collection_time=collection_time,
            perfect_timing=is_perfect,
            timestamp=collection_timestamp
        ))
        
        self._event_bus.publish(ScoreUpdatedEvent(
            player_id=player_id,
            new_score=self._player_score,
            score_delta=int(score_gained),
            reason='qualia_collected_perfect' if is_perfect else 'qualia_collected',
            timestamp=collection_timestamp
        ))
        
        return True, score_gained, self._player_combo

    def _calculate_score(self, qualia_value: float, is_perfect: bool) -> float:
        """Calculate score for Qualia collection."""
        scoring_config = self._config['scoring']
        
        base_score = scoring_config['qualia_collection_base']
        
        # Combo multiplier
        combo_factor = scoring_config['combo_multiplier_factor']
        combo_multiplier = 1.0 + (self._player_combo * combo_factor)
        max_multiplier = self._config['combo_system']['max_combo_multiplier']
        combo_multiplier = min(combo_multiplier, max_multiplier)
        
        score = base_score * combo_multiplier * qualia_value
        
        # Perfect timing bonus
        if is_perfect:
            score += scoring_config['perfect_timing_bonus']
        
        return float(score)

    @log_execution(level="INFO")
    @handle_errors(fallback_return_value=None)
    def check_combo_activation(
        self,
        player_id: str,
        recent_keys: List[str]
    ) -> Optional[ComboEffect]:
        """Check for combo activation (harmonic or chaotic)."""
        if player_id != self._player_id:
            return None
        
        if not self._config['features']['enable_harmonic_combos'] and \
           not self._config['features']['enable_chaotic_combos']:
            return None
        
        combo_config = self._config['combo_system']
        
        # Check harmonic combos first
        if self._config['features']['enable_harmonic_combos']:
            for combo_def in combo_config['harmonic_combos']:
                sequence = combo_def['sequence']
                if self._sequence_matches(recent_keys, sequence):
                    effect = self._create_combo_effect(combo_def, 'harmonic')
                    self._apply_combo_effect(effect)
                    self._harmonic_combos_activated += 1
                    self._stats['total_harmonic_combos'] += 1
                    
                    # Add score bonus
                    score_bonus = self._config['scoring']['harmonic_combo_bonus']
                    self._player_score += score_bonus
                    
                    self._event_bus.publish(ComboActivatedEvent(
                        player_id=player_id,
                        combo_id=combo_def['id'],
                        combo_type='harmonic',
                        combo_sequence=sequence,
                        effect_id=combo_def['effect_type'],
                        effect_description=combo_def['effect_description'],
                        timestamp=time.time()
                    ))
                    
                    return effect
        
        # Check chaotic combos
        if self._config['features']['enable_chaotic_combos']:
            for combo_def in combo_config['chaotic_combos']:
                sequence = combo_def['sequence']
                if self._sequence_matches(recent_keys, sequence):
                    effect = self._create_combo_effect(combo_def, 'chaotic')
                    self._apply_combo_effect(effect)
                    self._chaotic_combos_activated += 1
                    self._stats['total_chaotic_combos'] += 1
                    
                    # Apply score penalty
                    score_penalty = self._config['scoring']['chaotic_combo_penalty']
                    self._player_score += score_penalty  # Negative value
                    
                    # Apply self damage
                    damage = self._config['health_system']['chaotic_combo_self_damage']
                    self.update_health(player_id, 'player', -damage, 'chaotic_combo')
                    
                    self._event_bus.publish(ComboActivatedEvent(
                        player_id=player_id,
                        combo_id=combo_def['id'],
                        combo_type='chaotic',
                        combo_sequence=sequence,
                        effect_id=combo_def['effect_type'],
                        effect_description=combo_def['effect_description'],
                        timestamp=time.time()
                    ))
                    
                    return effect
        
        return None

    def _sequence_matches(self, recent_keys: List[str], sequence: List[str]) -> bool:
        """Check if recent keys match a combo sequence."""
        if len(recent_keys) < len(sequence):
            return False
        
        # Check last N keys
        recent_subset = recent_keys[-len(sequence):]
        return recent_subset == sequence

    def _create_combo_effect(self, combo_def: Dict[str, Any], combo_type: str) -> ComboEffect:
        """Create a ComboEffect from configuration."""
        return ComboEffect(
            combo_id=combo_def['id'],
            combo_type=combo_type,
            effect_type=combo_def['effect_type'],
            effect_value=combo_def['effect_value'],
            start_time=time.time(),
            duration=combo_def.get('effect_duration'),
            active=True
        )

    def _apply_combo_effect(self, effect: ComboEffect) -> None:
        """Apply a combo effect."""
        self._active_effects.append(effect)
        
        # Special handling for healing effects
        if effect.effect_type == 'healing':
            self.update_health(self._player_id, 'player', effect.effect_value, 'harmonic_combo_heal')
        elif effect.effect_type == 'ultimate_heal':
            health_config = self._config['health_system']
            self.update_health(self._player_id, 'player', health_config['player_max_health'], 'full_scale_heal')

    @log_execution(level="INFO")
    @handle_errors(fallback_return_value=0.0)
    def update_health(
        self,
        entity_id: str,
        entity_type: str,
        health_delta: float,
        reason: str
    ) -> float:
        """Update entity health."""
        if entity_type == 'player' and entity_id == self._player_id:
            old_health = self._player_health
            self._player_health += health_delta
            
            # Clamp to valid range
            health_config = self._config['health_system']
            max_health = health_config['player_max_health']
            self._player_health = max(0.0, min(self._player_health, max_health))
            
            actual_delta = self._player_health - old_health
            
            if actual_delta < 0:
                self._stats['total_damage_taken'] += int(abs(actual_delta))
            
            self._event_bus.publish(HealthChangedEvent(
                entity_id=entity_id,
                entity_type='player',
                new_health=self._player_health,
                health_delta=actual_delta,
                reason=reason,
                timestamp=time.time()
            ))
            
            return self._player_health
            
        elif entity_type == 'boss' and entity_id == self._boss_id:
            old_health = self._boss_health
            self._boss_health += health_delta
            self._boss_health = max(0.0, self._boss_health)
            
            actual_delta = self._boss_health - old_health
            
            if actual_delta < 0:
                self._stats['total_damage_dealt'] += int(abs(actual_delta))
            
            self._event_bus.publish(HealthChangedEvent(
                entity_id=entity_id,
                entity_type='boss',
                new_health=self._boss_health,
                health_delta=actual_delta,
                reason=reason,
                timestamp=time.time()
            ))
            
            return self._boss_health
        
        return 0.0

    @log_execution(level="INFO")
    @handle_errors(fallback_return_value=False)
    def try_activate_ultimate(self, player_id: str, timestamp: float) -> bool:
        """Try to activate ultimate ability."""
        if player_id != self._player_id:
            return False
        
        if not self._config['features']['enable_ultimate_ability']:
            return False
        
        # Check if already active
        if self._ultimate_active:
            return False
        
        # Check cooldown
        if timestamp < self._ultimate_cooldown_end:
            return False
        
        # Check combo threshold
        combo_config = self._config['combo_system']
        threshold = combo_config['ultimate_threshold']
        
        if self._player_combo < threshold:
            self._logger.debug(f"Ultimate requires combo x{threshold}, current: x{self._player_combo}")
            return False
        
        # Activate ultimate
        duration = combo_config['ultimate_duration_sec']
        self._ultimate_active = True
        self._ultimate_end_time = timestamp + duration
        
        self._event_bus.publish(UltimateActivatedEvent(
            player_id=player_id,
            duration=duration,
            timestamp=timestamp
        ))
        
        self._logger.info(f"Ultimate ability activated for {duration}s")
        return True

    @log_execution(level="DEBUG")
    def update_game_state(self, delta_time: float, current_time: float) -> Dict[str, Any]:
        """
        Update game state and emit CombatState for frontend rendering.
        
        PHASE 6 TASK 6.1: Full System Integration
        Emits GameStateChanged event with complete CombatState for frontend consumption.
        """
        self._current_time = current_time
        
        # Update combo decay
        if self._config['features']['enable_combo_decay']:
            self._update_combo_decay(delta_time)
        
        # Update cooldowns
        self._update_cooldowns(current_time)
        
        # Update ultimate
        if self._ultimate_active and current_time >= self._ultimate_end_time:
            self._ultimate_active = False
            cooldown_duration = self._config['cooldowns']['ultimate_cooldown']
            self._ultimate_cooldown_end = current_time + cooldown_duration
            self._logger.info("Ultimate ability ended")
        
        # Update active effects
        self._update_active_effects(current_time)
        
        # Expire old Qualia
        self._expire_old_qualia(current_time)
        
        # PHASE 6.1: Emit complete CombatState for frontend rendering
        self._emit_combat_state_update(current_time)
        
        return {
            "current_time": current_time,
            "player_combo": self._player_combo,
            "ultimate_active": self._ultimate_active,
            "active_effects_count": len(self._active_effects),
            "active_qualia_count": len(self._active_qualia),
        }

    def _emit_combat_state_update(self, current_time: float) -> None:
        """
        Emit GameStateChanged event with complete CombatState.
        
        PHASE 6 TASK 6.1: Full System Integration
        Creates complete CombatState matching shared_contracts/CombatState.json
        and publishes it to EventBus for GameStateStreamingService to broadcast.
        """
        # Determine game state
        if self._player_health <= 0:
            game_state = "game_over"
        elif self._song_duration > 0 and current_time >= self._song_duration:
            game_state = "game_over"
        elif self._player_health > 0 and self._boss_health > 0:
            game_state = "playing"
        else:
            game_state = "idle"
        
        # Build CombatState matching contract
        combat_state = {
            "gameState": game_state,
            "isActive": game_state == "playing",
            "currentPhase": self._boss_phase,
            "elapsedTime": current_time,
            "songProgress": min(1.0, current_time / self._song_duration) if self._song_duration > 0 else 0.0,
            "player": {
                "health": self._player_health,
                "position": {
                    "x": self._player_position.get("x", 0.0),
                    "y": self._player_position.get("y", 0.0),
                    "z": 0.0  # 2D game, z always 0
                },
                "score": self._player_score,
                "combo": self._player_combo,
                "maxCombo": self._stats.get("max_combo", 0),
                "moveSpeed": 5.0,  # TODO: Make configurable
                "isInvulnerable": self._ultimate_active
            },
            "boss": {
                "health": self._boss_health,
                "position": {
                    "x": 0.0,  # TODO: Boss AI should provide position
                    "y": 0.0,
                    "z": 0.0
                },
                "currentPhase": self._boss_phase,
                "attackPattern": "default",  # TODO: BossAI should provide pattern
                "isVulnerable": True,  # TODO: Add vulnerability mechanics
                "nextPhaseThreshold": self._boss_health * 0.5  # TODO: Make configurable
            },
            "activeEffects": [effect.effect_type for effect in self._active_effects],
            "environmentEffects": [],  # TODO: Add environment effects system
            "qualiaEventHistory": [
                {
                    "id": str(qualia.id),
                    "timestamp": qualia.generated_timestamp,
                    "position": {"x": qualia.position["x"], "y": qualia.position["y"]},
                    "value": qualia.value
                }
                for qualia in list(self._active_qualia.values())[-10:]  # Last 10 qualia
            ]
        }
        
        # Emit event to EventBus
        try:
            from backend.services.contracts.events import GameStateChangedEvent
            event = GameStateChangedEvent(
                combat_state=combat_state,
                timestamp=time.time()
            )
            self._event_bus.publish(event)
        except Exception as e:
            self._logger.error(f"Failed to emit GameStateChanged event: {e}")

    def _update_combo_decay(self, delta_time: float) -> None:
        """Update combo decay."""
        combo_config = self._config['combo_system']
        decay_time = combo_config['combo_decay_time_sec']
        
        if self._player_combo > 0:
            time_since_action = self._current_time - self._last_action_time
            if time_since_action > decay_time:
                decay_rate = combo_config['combo_decay_rate']
                decay_amount = int(decay_rate * delta_time)
                self._player_combo = max(0, self._player_combo - decay_amount)

    def _update_cooldowns(self, current_time: float) -> None:
        """Update ability cooldowns."""
        expired_keys = [key for key, end_time in self._ability_cooldowns.items() if current_time >= end_time]
        for key in expired_keys:
            del self._ability_cooldowns[key]

    def _update_active_effects(self, current_time: float) -> None:
        """Update and remove expired effects."""
        self._active_effects = [
            effect for effect in self._active_effects
            if effect.duration is None or current_time < (effect.start_time + effect.duration)
        ]

    def _expire_old_qualia(self, current_time: float) -> None:
        """Remove expired Qualia entities."""
        qualia_config = self._config['qualia_generation']
        max_window = qualia_config['collection_window_ms'] / 1000.0  # to seconds
        
        expired_ids = [
            qid for qid, qualia in self._active_qualia.items()
            if (current_time - qualia.generated_timestamp) > max_window
        ]
        
        for qid in expired_ids:
            qualia = self._active_qualia[qid]
            lifetime = (current_time - qualia.generated_timestamp) * 1000
            del self._active_qualia[qid]
            self._stats['total_qualia_expired'] += 1
            
            self._event_bus.publish(QualiaExpiredEvent(
                qualia_id=qid,
                lifetime=lifetime,
                timestamp=current_time
            ))

    def _calculate_tempo_modified_cooldown(self, base_cooldown: float) -> float:
        """Calculate tempo-modified cooldown."""
        cooldown_config = self._config['cooldowns']
        
        if not cooldown_config['tempo_modifier_enabled']:
            return base_cooldown
        
        base_bpm = cooldown_config['tempo_base_bpm']
        modifier_factor = cooldown_config['tempo_modifier_factor']
        min_multiplier = cooldown_config['min_cooldown_multiplier']
        
        # Faster tempo = shorter cooldowns
        bpm_diff = self._current_bpm - base_bpm
        multiplier = 1.0 - (bpm_diff * modifier_factor)
        multiplier = max(min_multiplier, multiplier)
        
        return float(base_cooldown * multiplier)

    @log_execution(level="DEBUG")
    def get_player_state(self, player_id: str) -> Dict[str, Any]:
        """Get player state."""
        if player_id != self._player_id:
            return {}
        
        return {
            "id": self._player_id,
            "health": self._player_health,
            "max_health": self._config['health_system']['player_max_health'],
            "combo": self._player_combo,
            "score": self._player_score,
            "position": self._player_position.copy(),
            "ultimate_active": self._ultimate_active,
            "ultimate_cooldown": max(0.0, self._ultimate_cooldown_end - self._current_time),
            "ability_cooldowns": {
                key: max(0.0, end_time - self._current_time)
                for key, end_time in self._ability_cooldowns.items()
            },
            "active_effects": [
                {
                    "combo_id": effect.combo_id,
                    "combo_type": effect.combo_type,
                    "effect_type": effect.effect_type,
                    "remaining": effect.duration - (self._current_time - effect.start_time) if effect.duration else None
                }
                for effect in self._active_effects
            ]
        }

    @log_execution(level="DEBUG")
    def get_boss_state(self, boss_id: str) -> Dict[str, Any]:
        """Get boss state."""
        if boss_id != self._boss_id:
            return {}
        
        health_config = self._config['health_system']
        max_health = self._song_duration * health_config['boss_health_per_second']
        
        return {
            "id": self._boss_id,
            "health": self._boss_health,
            "max_health": max_health,
            "health_percentage": (self._boss_health / max_health) * 100 if max_health > 0 else 0,
            "phase": self._boss_phase,
            "aggression": self._boss_aggression,
        }

    def get_active_qualia(self) -> List[QualiaEntity]:
        """Get all active Qualia."""
        return list(self._active_qualia.values())

    def get_cooldown_remaining(self, player_id: str, ability_key: str) -> float:
        """Get remaining cooldown for an ability."""
        if player_id != self._player_id:
            return 0.0
        
        if ability_key == 'ultimate':
            return max(0.0, self._ultimate_cooldown_end - self._current_time)
        
        if ability_key in self._ability_cooldowns:
            return max(0.0, self._ability_cooldowns[ability_key] - self._current_time)
        
        return 0.0

    @log_execution(level="INFO")
    def set_difficulty(self, volume: float) -> str:
        """Set difficulty based on volume."""
        diff_config = self._config['difficulty']
        
        if volume <= diff_config['training_volume_max']:
            self._difficulty_level = 'training'
            damage_mult = diff_config['training_boss_damage_mult']
            speed_mult = diff_config['training_boss_speed_mult']
        elif volume <= diff_config['normal_volume_max']:
            self._difficulty_level = 'normal'
            damage_mult = diff_config['normal_boss_damage_mult']
            speed_mult = diff_config['normal_boss_speed_mult']
        elif volume <= diff_config['hard_volume_max']:
            self._difficulty_level = 'hard'
            damage_mult = diff_config['hard_boss_damage_mult']
            speed_mult = diff_config['hard_boss_speed_mult']
        else:
            self._difficulty_level = 'extreme'
            damage_mult = diff_config['extreme_boss_damage_mult']
            speed_mult = diff_config['extreme_boss_speed_mult']
        
        self._difficulty_multipliers = {
            'damage': damage_mult,
            'speed': speed_mult
        }
        
        self._current_volume = volume
        self._logger.info(f"Difficulty set to '{self._difficulty_level}' (volume={volume:.2f})")
        
        return self._difficulty_level

    def set_tempo(self, bpm: float) -> None:
        """Set current tempo."""
        self._current_bpm = bpm
        self._logger.debug(f"Tempo set to {bpm} BPM")

    @log_execution()
    def reset(self) -> None:
        """Reset game logic state."""
        self._player_id = None
        self._boss_id = None
        self._song_duration = 0.0
        self._current_time = 0.0
        
        self._player_health = 0.0
        self._player_combo = 0
        self._player_score = 0
        self._boss_health = 0.0
        
        self._active_qualia.clear()
        self._active_effects.clear()
        self._recent_keys.clear()
        self._ability_cooldowns.clear()
        
        self._ultimate_active = False
        self._ultimate_end_time = 0.0
        self._ultimate_cooldown_end = 0.0
        
        # Keep statistics (they're cumulative)
        self._logger.info("GameLogicService reset")

    @log_execution(level="DEBUG")
    def get_statistics(self) -> Dict[str, Any]:
        """Get game statistics."""
        return {
            **self._stats,
            "current_combo": self._player_combo,
            "current_score": self._player_score,
            "active_qualia_count": len(self._active_qualia),
            "active_effects_count": len(self._active_effects),
            "difficulty_level": self._difficulty_level,
            "player_health": self._player_health,
            "boss_health": self._boss_health,
        }
