# QUALIA.CODE v1.1 - IHarmonyAnalysisService Interface
# Musical harmony analysis for emergent combo system

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List, Dict, Optional, Tuple
from enum import Enum


# ============================================================================
# DATA CLASSES
# ============================================================================

@dataclass
class MusicalNote:
    """Represents a musical note with its properties."""
    note_name: str  # 'C', 'D', 'E', 'F', 'G', 'A', 'B'
    octave: int  # 0-8
    frequency: float  # Hz
    timestamp: float  # When the note was played
    source: str  # 'player', 'song', 'qualia'
    velocity: float = 1.0  # 0.0-1.0 (intensity/volume)


@dataclass
class HarmonyScore:
    """Complete harmony analysis result."""
    overall_score: float  # 0.0-1.0
    song_harmony: float  # Harmony with song notes
    qualia_harmony: float  # Harmony with collected qualia
    is_harmonic: bool  # True if score >= harmonic_threshold
    is_chaotic: bool  # True if score <= chaotic_threshold
    classification: str  # 'harmonic', 'neutral', 'chaotic', 'perfect', 'extreme_chaos'
    harmony_trend: float  # -1.0 to 1.0 (negative = getting worse, positive = improving)
    timestamp: float
    metadata: Dict = None


@dataclass
class IntervalAnalysis:
    """Analysis of a musical interval between two notes."""
    note1: str
    note2: str
    semitones: int  # Distance in semitones
    interval_name: str  # e.g., 'perfect_fifth', 'tritone'
    is_consonant: bool
    harmony_score: float  # 0.0-1.0


@dataclass
class ChordPattern:
    """Detected chord or multi-note pattern."""
    pattern_name: str  # e.g., 'major_triad', 'diminished_triad'
    notes: List[str]  # Notes in the pattern
    root_note: str  # Root of the chord
    is_harmonic: bool  # True if harmonic pattern, False if chaotic
    score: float  # Harmony or chaos score
    timestamp: float


class HarmonyClassification(Enum):
    """Classification categories for harmony analysis."""
    PERFECT_HARMONY = "perfect_harmony"
    HARMONIC = "harmonic"
    NEUTRAL = "neutral"
    CHAOTIC = "chaotic"
    EXTREME_CHAOS = "extreme_chaos"


# ============================================================================
# INTERFACE
# ============================================================================

class IHarmonyAnalysisService(ABC):
    """
    Service for analyzing musical harmony in player input.
    
    ARCHITECTURE COMPLIANCE:
    - Backend calculates STATE only (ARCHITECTURE.GOLD.CODE)
    - Event-driven via EventBus (QUALIA.CODE)
    - Configuration externalized to YAML (QUALIA.CODE)
    - Provides musical context for emergent combo system (GDD.md)
    
    RESPONSIBILITIES:
    1. Analyze player keyboard input as musical notes
    2. Compare player notes with current song notes
    3. Compare player notes with collected qualia colors/notes
    4. Calculate overall harmony scores (0-1 float)
    5. Detect harmonic vs chaotic patterns
    6. Track harmony trends over time
    7. Emit harmony events for game logic integration
    """

    @abstractmethod
    def initialize(self, player_id: str) -> None:
        """
        Initialize harmony analysis for a player.
        
        Args:
            player_id: Unique player identifier
        """
        pass

    @abstractmethod
    def analyze_player_input(
        self,
        player_notes: List[str],
        timestamp: float
    ) -> HarmonyScore:
        """
        Analyze player's recent musical input.
        
        Args:
            player_notes: List of note names recently played by player
            timestamp: Current timestamp
            
        Returns:
            HarmonyScore object with complete analysis
        """
        pass

    @abstractmethod
    def compare_with_song(
        self,
        player_notes: List[str],
        song_notes: List[str]
    ) -> float:
        """
        Compare player notes with current song notes.
        
        Args:
            player_notes: Notes played by player
            song_notes: Notes currently playing in song
            
        Returns:
            Harmony score (0.0-1.0) based on consonance
        """
        pass

    @abstractmethod
    def compare_with_qualia(
        self,
        player_notes: List[str],
        qualia_colors: List[Dict[str, int]]  # List of RGB dicts
    ) -> float:
        """
        Compare player notes with collected qualia colors.
        Qualia colors are mapped to musical notes via configuration.
        
        Args:
            player_notes: Notes played by player
            qualia_colors: List of RGB color dicts from collected qualia
            
        Returns:
            Harmony score (0.0-1.0)
        """
        pass

    @abstractmethod
    def calculate_interval_harmony(
        self,
        note1: str,
        note2: str
    ) -> IntervalAnalysis:
        """
        Calculate harmony of a two-note interval.
        
        Args:
            note1: First note name
            note2: Second note name
            
        Returns:
            IntervalAnalysis with detailed interval information
        """
        pass

    @abstractmethod
    def detect_chord_pattern(
        self,
        notes: List[str],
        timestamp: float
    ) -> Optional[ChordPattern]:
        """
        Detect if notes form a recognized chord pattern.
        
        Args:
            notes: List of note names
            timestamp: Current timestamp
            
        Returns:
            ChordPattern if detected, None otherwise
        """
        pass

    @abstractmethod
    def classify_harmony(
        self,
        harmony_score: float
    ) -> HarmonyClassification:
        """
        Classify a harmony score into a category.
        
        Args:
            harmony_score: Score from 0.0-1.0
            
        Returns:
            HarmonyClassification enum value
        """
        pass

    @abstractmethod
    def update_song_context(
        self,
        current_notes: List[str],
        tempo_bpm: float,
        timestamp: float
    ) -> None:
        """
        Update current song context for analysis.
        
        Args:
            current_notes: Notes currently playing in song
            tempo_bpm: Current tempo in beats per minute
            timestamp: Current timestamp
        """
        pass

    @abstractmethod
    def update_qualia_context(
        self,
        collected_qualia_colors: List[Dict[str, int]],
        timestamp: float
    ) -> None:
        """
        Update collected qualia context for analysis.
        
        Args:
            collected_qualia_colors: List of RGB color dicts
            timestamp: Current timestamp
        """
        pass

    @abstractmethod
    def get_harmony_trend(
        self,
        window_ms: float = 5000.0
    ) -> float:
        """
        Calculate harmony trend over time window.
        
        Args:
            window_ms: Time window in milliseconds
            
        Returns:
            Trend value (-1.0 to 1.0, negative = declining, positive = improving)
        """
        pass

    @abstractmethod
    def is_harmonic_combination(
        self,
        notes: List[str]
    ) -> bool:
        """
        Quick check if note combination is harmonic.
        
        Args:
            notes: List of note names
            
        Returns:
            True if combination is harmonic (above threshold)
        """
        pass

    @abstractmethod
    def is_chaotic_combination(
        self,
        notes: List[str]
    ) -> bool:
        """
        Quick check if note combination is chaotic/dissonant.
        
        Args:
            notes: List of note names
            
        Returns:
            True if combination is chaotic (below threshold)
        """
        pass

    @abstractmethod
    def get_consonance_score(
        self,
        notes: List[str]
    ) -> float:
        """
        Calculate overall consonance score for a group of notes.
        
        Args:
            notes: List of note names
            
        Returns:
            Consonance score (0.0-1.0)
        """
        pass

    @abstractmethod
    def reset(self) -> None:
        """Reset analysis state (for new game session)."""
        pass

    @abstractmethod
    def get_statistics(self) -> Dict:
        """
        Get harmony analysis statistics.
        
        Returns:
            Dictionary with analysis stats
        """
        pass
