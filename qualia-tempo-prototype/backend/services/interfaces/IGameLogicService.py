# QUALIA.CODE v1.1 - IGameLogicService Interface
# Core game mechanics and rules implementation

from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass


@dataclass
class QualiaEntity:
    """Represents a Qualia entity in the game world."""
    id: str
    position: Dict[str, float]  # {'x': float, 'y': float}
    color: Dict[str, float]  # {'r': float, 'g': float, 'b': float}
    value: float
    generated_timestamp: float
    source_type: str  # 'dash', 'ability', 'metronome', 'boss'


@dataclass
class ComboEffect:
    """Represents an active combo effect."""
    combo_id: str
    combo_type: str  # 'harmonic' or 'chaotic'
    effect_type: str
    effect_value: float
    start_time: float
    duration: Optional[float]
    active: bool


class IGameLogicService(ABC):
    """
    Interface for core game logic service.
    
    RESPONSIBILITY: Implements all game mechanics defined in GDD.md:
    - Qualia generation and collection
    - Emergent combo system (harmonic/chaotic)
    - Score calculation
    - Health management
    - Ultimate ability
    - Difficulty scaling (volume-based)
    - Cooldown management (tempo-aware)
    
    RATIONALE: Per ARCHITECTURE.GOLD.CODE, backend is the authority for
    game state. GameLogicService is the "cerebro" that processes player
    actions and determines game outcomes.
    """

    @abstractmethod
    def initialize_game(self, player_id: str, boss_id: str, song_duration_sec: float) -> None:
        """
        Initialize the game logic service for a new game session.
        
        Args:
            player_id: Unique identifier for the player
            boss_id: Unique identifier for the boss
            song_duration_sec: Duration of the song in seconds
        """
        pass

    @abstractmethod
    def process_player_dash(
        self, 
        player_id: str, 
        position: Dict[str, float], 
        direction: Dict[str, float],
        on_beat: bool,
        timestamp: float
    ) -> List[QualiaEntity]:
        """
        Process a player dash action and generate Qualia.
        
        Args:
            player_id: Player identifier
            position: Dash position {'x': float, 'y': float}
            direction: Dash direction vector
            on_beat: True if dash was on metronome beat
            timestamp: Action timestamp
            
        Returns:
            List of generated Qualia entities
        """
        pass

    @abstractmethod
    def process_ability_use(
        self,
        player_id: str,
        ability_key: str,  # 'Q', 'E', 'R', 'T', 'F', 'G', 'C'
        position: Dict[str, float],
        on_beat: bool,
        timestamp: float
    ) -> Tuple[bool, Optional[QualiaEntity], Optional[str]]:
        """
        Process an ability use (musical key press).
        
        Args:
            player_id: Player identifier
            ability_key: Key pressed ('Q'-'G', 'C')
            position: Ability use position
            on_beat: True if used on metronome beat
            timestamp: Action timestamp
            
        Returns:
            Tuple of (success: bool, generated_qualia: Optional[QualiaEntity], error_message: Optional[str])
        """
        pass

    @abstractmethod
    def process_metronome_tick(
        self,
        beat_number: int,
        bpm: float,
        timestamp: float
    ) -> List[QualiaEntity]:
        """
        Process a metronome tick and generate Qualia.
        
        Args:
            beat_number: Sequential beat number
            bpm: Current beats per minute
            timestamp: Tick timestamp
            
        Returns:
            List of generated Qualia entities
        """
        pass

    @abstractmethod
    def process_qualia_collection(
        self,
        player_id: str,
        qualia_id: str,
        collection_timestamp: float
    ) -> Tuple[bool, float, int]:
        """
        Process Qualia collection by player.
        
        Args:
            player_id: Player identifier
            qualia_id: Qualia entity identifier
            collection_timestamp: Collection timestamp
            
        Returns:
            Tuple of (success: bool, score_gained: float, new_combo: int)
        """
        pass

    @abstractmethod
    def check_combo_activation(
        self,
        player_id: str,
        recent_keys: List[str]
    ) -> Optional[ComboEffect]:
        """
        Check if recent key presses form a combo (harmonic or chaotic).
        
        Args:
            player_id: Player identifier
            recent_keys: List of recently pressed keys
            
        Returns:
            ComboEffect if combo detected, None otherwise
        """
        pass

    @abstractmethod
    def update_health(
        self,
        entity_id: str,
        entity_type: str,  # 'player' or 'boss'
        health_delta: float,
        reason: str
    ) -> float:
        """
        Update entity health.
        
        Args:
            entity_id: Player or boss identifier
            entity_type: 'player' or 'boss'
            health_delta: Amount to change (positive = heal, negative = damage)
            reason: Reason for health change
            
        Returns:
            New health value
        """
        pass

    @abstractmethod
    def try_activate_ultimate(self, player_id: str, timestamp: float) -> bool:
        """
        Try to activate ultimate ability (requires x40 combo).
        
        Args:
            player_id: Player identifier
            timestamp: Activation timestamp
            
        Returns:
            True if ultimate activated, False otherwise
        """
        pass

    @abstractmethod
    def update_game_state(self, delta_time: float, current_time: float) -> Dict[str, Any]:
        """
        Update game state (combos, cooldowns, effects, etc.).
        
        Args:
            delta_time: Time since last update (seconds)
            current_time: Current game time (seconds)
            
        Returns:
            Dict containing updated game state
        """
        pass

    @abstractmethod
    def get_player_state(self, player_id: str) -> Dict[str, Any]:
        """
        Get current player state.
        
        Args:
            player_id: Player identifier
            
        Returns:
            Dict containing player state (health, combo, score, abilities, etc.)
        """
        pass

    @abstractmethod
    def get_boss_state(self, boss_id: str) -> Dict[str, Any]:
        """
        Get current boss state.
        
        Args:
            boss_id: Boss identifier
            
        Returns:
            Dict containing boss state (health, phase, aggression, etc.)
        """
        pass

    @abstractmethod
    def get_active_qualia(self) -> List[QualiaEntity]:
        """
        Get list of all active (uncollected) Qualia in the game world.
        
        Returns:
            List of active Qualia entities
        """
        pass

    @abstractmethod
    def get_cooldown_remaining(self, player_id: str, ability_key: str) -> float:
        """
        Get remaining cooldown for an ability.
        
        Args:
            player_id: Player identifier
            ability_key: Ability key ('Q'-'G', 'C', 'ultimate')
            
        Returns:
            Remaining cooldown in seconds (0.0 if ready)
        """
        pass

    @abstractmethod
    def set_difficulty(self, volume: float) -> str:
        """
        Set game difficulty based on volume (GDD requirement).
        
        Args:
            volume: Volume level (0.0 to 1.0)
            
        Returns:
            Difficulty level name ('training', 'normal', 'hard', 'extreme')
        """
        pass

    @abstractmethod
    def set_tempo(self, bpm: float) -> None:
        """
        Set current song tempo (affects cooldowns per GDD).
        
        Args:
            bpm: Beats per minute
        """
        pass

    @abstractmethod
    def reset(self) -> None:
        """Reset game logic state (for new game or restart)."""
        pass

    @abstractmethod
    def get_statistics(self) -> Dict[str, Any]:
        """
        Get game statistics.
        
        Returns:
            Dict containing game stats (total qualia generated, collected, combos, etc.)
        """
        pass
