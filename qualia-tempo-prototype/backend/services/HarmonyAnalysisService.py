# QUALIA.CODE v1.1 - HarmonyAnalysisService Implementation
# Musical harmony analysis for emergent combo system

import logging
import time
import yaml
from typing import Dict, List, Optional, Tuple
from pathlib import Path
from collections import deque

from backend.services.interfaces.IHarmonyAnalysisService import (
    IHarmonyAnalysisService,
    MusicalNote,
    HarmonyScore,
    IntervalAnalysis,
    ChordPattern,
    HarmonyClassification
)
from backend.services.EventBus import EventBus
from backend.services.contracts.events import (
    HarmonyScoreCalculatedEvent,
    HarmonicPatternDetectedEvent,
    ChaoticPatternDetectedEvent,
)
from backend.utils.decorators import log_execution, handle_errors


class HarmonyAnalysisService(IHarmonyAnalysisService):
    """
    Musical harmony analysis service.
    
    ARCHITECTURE COMPLIANCE:
    - Backend calculates STATE only (ARCHITECTURE.GOLD.CODE)
    - Event-driven via EventBus (QUALIA.CODE)
    - Configuration externalized to YAML (QUALIA.CODE)
    - Decorators for logging/error handling (QUALIA.CODE)
    
    RESPONSIBILITIES:
    1. Musical interval analysis (consonance/dissonance)
    2. Chord pattern detection
    3. Player input vs song harmony scoring
    4. Player input vs qualia harmony scoring
    5. Harmony trend tracking
    6. Event emission for game logic integration
    """

    def __init__(self, event_bus: EventBus, config_path: Optional[str] = None):
        """
        Initialize HarmonyAnalysisService.
        
        Args:
            event_bus: EventBus instance for event publishing
            config_path: Path to harmony-analysis.yaml configuration
        """
        self._logger = logging.getLogger(__name__)
        self._event_bus = event_bus
        
        # Load configuration
        if config_path is None:
            config_path_final: Path = Path(__file__).parent.parent / "config" / "harmony-analysis.yaml"
        else:
            config_path_final = Path(config_path) if not isinstance(config_path, Path) else config_path
        
        with open(config_path_final, 'r') as f:
            self._config = yaml.safe_load(f)
        
        # Player state
        self._player_id: Optional[str] = None
        
        # Musical context
        self._current_song_notes: List[str] = []
        self._current_tempo_bpm: float = 120.0
        self._collected_qualia_notes: List[str] = []
        
        # Harmony history for trend calculation
        self._harmony_history: deque = deque(maxlen=self._config['analysis_windows']['harmony_history_length'])
        
        # Statistics
        self._total_analyses: int = 0
        self._harmonic_count: int = 0
        self._chaotic_count: int = 0
        self._perfect_harmony_count: int = 0
        
        # Build interval lookup table for fast access
        self._interval_lookup: Dict[int, Dict] = self._build_interval_lookup()
        
        # Build chromatic scale index for interval calculation
        self._note_to_index: Dict[str, int] = {
            note: idx for idx, note in enumerate(self._config['musical_notes']['chromatic_scale'])
        }
        
        self._logger.info("HarmonyAnalysisService initialized with config: %s", config_path)

    def _build_interval_lookup(self) -> Dict[int, Dict]:
        """Build lookup table for interval types by semitone distance."""
        lookup = {}
        
        # Add harmonic intervals
        for interval in self._config['harmonic_intervals']['perfect']:
            semitones = interval['semitones']
            lookup[semitones] = {
                'name': interval['name'],
                'score': interval['harmony_score'],
                'is_consonant': True,
                'description': interval['description']
            }
        
        for interval in self._config['harmonic_intervals']['imperfect']:
            semitones = interval['semitones']
            lookup[semitones] = {
                'name': interval['name'],
                'score': interval['harmony_score'],
                'is_consonant': True,
                'description': interval['description']
            }
        
        # Add chaotic intervals
        for interval in self._config['chaotic_intervals']['strong']:
            semitones = interval['semitones']
            lookup[semitones] = {
                'name': interval['name'],
                'score': 1.0 - interval['chaos_score'],  # Convert chaos to harmony
                'is_consonant': False,
                'description': interval['description']
            }
        
        for interval in self._config['chaotic_intervals']['moderate']:
            semitones = interval['semitones']
            lookup[semitones] = {
                'name': interval['name'],
                'score': 1.0 - interval['chaos_score'],
                'is_consonant': False,
                'description': interval['description']
            }
        
        return lookup

    @log_execution(level="INFO")
    def initialize(self, player_id: str) -> None:
        """Initialize harmony analysis for a player."""
        self._player_id = player_id
        self._harmony_history.clear()
        self._total_analyses = 0
        self._harmonic_count = 0
        self._chaotic_count = 0
        self._perfect_harmony_count = 0
        self._logger.info(f"Harmony analysis initialized for player: {player_id}")

    @log_execution(level="DEBUG")
    @handle_errors()
    def analyze_player_input(
        self,
        player_notes: List[str],
        timestamp: float
    ) -> HarmonyScore:
        """
        Analyze player's recent musical input.
        
        Combines song harmony, qualia harmony, and applies modifiers
        to produce overall harmony score.
        """
        self._total_analyses += 1
        
        # Calculate individual harmony components
        song_harmony = self.compare_with_song(player_notes, self._current_song_notes)
        
        # Convert qualia colors to notes if we have any
        qualia_harmony = 0.5  # Default to neutral
        if self._collected_qualia_notes:
            qualia_harmony = self._calculate_note_set_harmony(player_notes, self._collected_qualia_notes)
        
        # Apply weights from configuration
        # If no qualia, only use song harmony
        weights = self._config['scoring_weights']
        if self._collected_qualia_notes:
            overall_score = (
                song_harmony * weights['song_harmony_weight'] +
                qualia_harmony * weights['qualia_harmony_weight']
            )
        else:
            # No qualia - use only song harmony
            overall_score = song_harmony
        
        # Apply context modifiers
        if self._config['features']['enable_context_modifiers']:
            overall_score = self._apply_context_modifiers(overall_score)
        
        # Classify the harmony
        classification = self.classify_harmony(overall_score)
        is_harmonic = classification in [HarmonyClassification.PERFECT_HARMONY, HarmonyClassification.HARMONIC]
        is_chaotic = classification in [HarmonyClassification.CHAOTIC, HarmonyClassification.EXTREME_CHAOS]
        
        # Update statistics
        if is_harmonic:
            self._harmonic_count += 1
        if is_chaotic:
            self._chaotic_count += 1
        if classification == HarmonyClassification.PERFECT_HARMONY:
            self._perfect_harmony_count += 1
        
        # Calculate trend
        harmony_trend = self.get_harmony_trend()
        
        # Store in history
        self._harmony_history.append({
            'score': overall_score,
            'timestamp': timestamp
        })
        
        # Create result
        harmony_score = HarmonyScore(
            overall_score=overall_score,
            song_harmony=song_harmony,
            qualia_harmony=qualia_harmony,
            is_harmonic=is_harmonic,
            is_chaotic=is_chaotic,
            classification=classification.value,
            harmony_trend=harmony_trend,
            timestamp=timestamp,
            metadata={
                'player_notes': player_notes,
                'song_notes': self._current_song_notes,
                'qualia_notes': self._collected_qualia_notes
            }
        )
        
        # Emit event
        self._event_bus.publish(HarmonyScoreCalculatedEvent(
            player_id=self._player_id or "unknown",
            harmony_score=overall_score,
            is_harmonic=is_harmonic,
            song_harmony=song_harmony,
            qualia_harmony=qualia_harmony,
            player_notes=player_notes,
            song_notes=self._current_song_notes,
            qualia_notes=self._collected_qualia_notes,
            timestamp=timestamp
        ))
        
        return harmony_score

    @log_execution(level="DEBUG")
    def compare_with_song(
        self,
        player_notes: List[str],
        song_notes: List[str]
    ) -> float:
        """Compare player notes with current song notes."""
        if not player_notes or not song_notes:
            return 0.5  # Neutral score if no notes
        
        return self._calculate_note_set_harmony(player_notes, song_notes)

    @log_execution(level="DEBUG")
    def compare_with_qualia(
        self,
        player_notes: List[str],
        qualia_colors: List[Dict[str, int]]
    ) -> float:
        """Compare player notes with collected qualia colors."""
        if not player_notes or not qualia_colors:
            return 0.5
        
        # Convert qualia colors to notes
        qualia_notes_raw = [self._color_to_note(color) for color in qualia_colors if color]
        qualia_notes: List[str] = [note for note in qualia_notes_raw if note is not None]
        
        if not qualia_notes:
            return 0.5
        
        return self._calculate_note_set_harmony(player_notes, qualia_notes)

    def _calculate_note_set_harmony(
        self,
        notes1: List[str],
        notes2: List[str]
    ) -> float:
        """
        Calculate harmony between two sets of notes.
        
        Compares all pairs of notes and averages their harmony scores.
        """
        if not notes1 or not notes2:
            return 0.5
        
        harmony_scores = []
        
        for note1 in notes1:
            for note2 in notes2:
                interval = self.calculate_interval_harmony(note1, note2)
                harmony_scores.append(interval.harmony_score)
        
        # Average all pairwise harmonies
        return sum(harmony_scores) / len(harmony_scores) if harmony_scores else 0.5

    @log_execution(level="DEBUG")
    def calculate_interval_harmony(
        self,
        note1: str,
        note2: str
    ) -> IntervalAnalysis:
        """Calculate harmony of a two-note interval."""
        # Calculate semitone distance
        semitones = self._calculate_semitones(note1, note2)
        
        # Normalize to 0-11 range (within one octave)
        semitones_normalized = semitones % 12
        
        # Lookup interval properties
        interval_info = self._interval_lookup.get(semitones_normalized, {
            'name': 'unclassified',
            'score': 0.5,  # Neutral for unknown intervals
            'is_consonant': False,
            'description': 'Unknown interval'
        })
        
        return IntervalAnalysis(
            note1=note1,
            note2=note2,
            semitones=semitones_normalized,
            interval_name=interval_info['name'],
            is_consonant=interval_info['is_consonant'],
            harmony_score=interval_info['score']
        )

    def _calculate_semitones(self, note1: str, note2: str) -> int:
        """Calculate semitone distance between two notes."""
        idx1 = self._note_to_index.get(note1, 0)
        idx2 = self._note_to_index.get(note2, 0)
        return abs(idx2 - idx1)

    @log_execution(level="DEBUG")
    @handle_errors()
    def detect_chord_pattern(
        self,
        notes: List[str],
        timestamp: float
    ) -> Optional[ChordPattern]:
        """Detect if notes form a recognized chord pattern."""
        if not self._config['features']['enable_chord_detection']:
            return None
        
        if len(notes) < self._config['thresholds']['min_notes_for_chord']:
            return None
        
        # Sort notes to normalize ordering
        notes_sorted = sorted(notes, key=lambda n: self._note_to_index.get(n, 0))
        
        # Calculate intervals from root
        root = notes_sorted[0]
        intervals = [self._calculate_semitones(root, note) % 12 for note in notes_sorted]
        intervals.sort()
        
        # Check harmonic patterns
        for pattern in self._config['chord_patterns']['harmonic']:
            if intervals == pattern['intervals']:
                return ChordPattern(
                    pattern_name=pattern['name'],
                    notes=notes_sorted,
                    root_note=root,
                    is_harmonic=True,
                    score=pattern['harmony_score'],
                    timestamp=timestamp
                )
        
        # Check chaotic patterns
        for pattern in self._config['chord_patterns']['chaotic']:
            if intervals == pattern['intervals']:
                return ChordPattern(
                    pattern_name=pattern['name'],
                    notes=notes_sorted,
                    root_note=root,
                    is_harmonic=False,
                    score=pattern['chaos_score'],
                    timestamp=timestamp
                )
        
        return None

    @log_execution(level="DEBUG")
    def classify_harmony(
        self,
        harmony_score: float
    ) -> HarmonyClassification:
        """Classify a harmony score into a category."""
        thresholds = self._config['thresholds']
        
        if harmony_score >= thresholds['perfect_harmony']:
            return HarmonyClassification.PERFECT_HARMONY
        elif harmony_score >= thresholds['harmonic_threshold']:
            return HarmonyClassification.HARMONIC
        elif harmony_score <= thresholds['extreme_chaos']:
            return HarmonyClassification.EXTREME_CHAOS
        elif harmony_score <= thresholds['chaotic_threshold']:
            return HarmonyClassification.CHAOTIC
        else:
            return HarmonyClassification.NEUTRAL

    @log_execution(level="DEBUG")
    def update_song_context(
        self,
        current_notes: List[str],
        tempo_bpm: float,
        timestamp: float
    ) -> None:
        """Update current song context for analysis."""
        self._current_song_notes = current_notes
        self._current_tempo_bpm = tempo_bpm

    @log_execution(level="DEBUG")
    def update_qualia_context(
        self,
        collected_qualia_colors: List[Dict[str, int]],
        timestamp: float
    ) -> None:
        """Update collected qualia context for analysis."""
        # Convert colors to notes
        self._collected_qualia_notes = []
        for color in collected_qualia_colors:
            note = self._color_to_note(color)
            if note:
                self._collected_qualia_notes.append(note)

    def _color_to_note(self, color: Dict[str, int]) -> Optional[str]:
        """Convert RGB color to musical note based on configuration."""
        r, g, b = color.get('r', 0), color.get('g', 0), color.get('b', 0)
        
        color_mapping = self._config['qualia_color_to_note']
        
        for note, ranges in color_mapping.items():
            r_range = ranges['r']
            g_range = ranges['g']
            b_range = ranges['b']
            
            if (r_range[0] <= r <= r_range[1] and
                g_range[0] <= g <= g_range[1] and
                b_range[0] <= b <= b_range[1]):
                return str(note)
        
        return None

    @log_execution(level="DEBUG")
    def get_harmony_trend(
        self,
        window_ms: float = 5000.0
    ) -> float:
        """Calculate harmony trend over time window."""
        if not self._config['features']['enable_trend_tracking']:
            return 0.0
        
        if len(self._harmony_history) < 2:
            return 0.0
        
        # Get all scores (they're already chronologically ordered)
        all_scores = [h['score'] for h in self._harmony_history]
        
        if len(all_scores) < 2:
            return 0.0
        
        # Calculate linear trend
        # Positive = improving, Negative = declining
        mid_point = len(all_scores) // 2
        if mid_point == 0:
            return 0.0
            
        first_half_avg = sum(all_scores[:mid_point]) / mid_point
        second_half_avg = sum(all_scores[mid_point:]) / (len(all_scores) - mid_point)
        
        trend = (second_half_avg - first_half_avg)
        
        # Normalize to -1.0 to 1.0
        return float(max(-1.0, min(1.0, trend * 2.0)))

    @log_execution(level="DEBUG")
    def is_harmonic_combination(
        self,
        notes: List[str]
    ) -> bool:
        """Quick check if note combination is harmonic."""
        score = self.get_consonance_score(notes)
        return bool(score >= float(self._config['thresholds']['harmonic_threshold']))

    @log_execution(level="DEBUG")
    def is_chaotic_combination(
        self,
        notes: List[str]
    ) -> bool:
        """Quick check if note combination is chaotic/dissonant."""
        score = self.get_consonance_score(notes)
        return bool(score <= float(self._config['thresholds']['chaotic_threshold']))

    @log_execution(level="DEBUG")
    def get_consonance_score(
        self,
        notes: List[str]
    ) -> float:
        """Calculate overall consonance score for a group of notes."""
        if len(notes) < 2:
            return 0.5  # Neutral for single note
        
        # Calculate all pairwise intervals
        harmony_scores = []
        for i in range(len(notes)):
            for j in range(i + 1, len(notes)):
                interval = self.calculate_interval_harmony(notes[i], notes[j])
                harmony_scores.append(interval.harmony_score)
        
        return sum(harmony_scores) / len(harmony_scores) if harmony_scores else 0.5

    def _apply_context_modifiers(self, base_score: float) -> float:
        """Apply tempo and combo modifiers to harmony score."""
        modified_score = base_score
        
        # Tempo modifier - faster tempo = slightly more forgiving
        if self._current_tempo_bpm > 120:
            tempo_bonus = (self._current_tempo_bpm - 120) * self._config['scoring_weights']['tempo_modifier']
            modified_score += tempo_bonus
        
        # Clamp to valid range
        return max(0.0, min(1.0, modified_score))

    @log_execution(level="INFO")
    def reset(self) -> None:
        """Reset analysis state."""
        self._player_id = None
        self._current_song_notes = []
        self._current_tempo_bpm = 120.0
        self._collected_qualia_notes = []
        self._harmony_history.clear()
        self._total_analyses = 0
        self._harmonic_count = 0
        self._chaotic_count = 0
        self._perfect_harmony_count = 0
        self._logger.info("Harmony analysis state reset")

    @log_execution(level="DEBUG")
    def get_statistics(self) -> Dict:
        """Get harmony analysis statistics."""
        return {
            'player_id': self._player_id,
            'total_analyses': self._total_analyses,
            'harmonic_count': self._harmonic_count,
            'chaotic_count': self._chaotic_count,
            'perfect_harmony_count': self._perfect_harmony_count,
            'current_tempo_bpm': self._current_tempo_bpm,
            'current_song_notes': self._current_song_notes,
            'collected_qualia_notes': self._collected_qualia_notes,
            'harmony_history_length': len(self._harmony_history),
            'average_harmony': sum(h['score'] for h in self._harmony_history) / len(self._harmony_history) if self._harmony_history else 0.0,
            'current_trend': self.get_harmony_trend()
        }
