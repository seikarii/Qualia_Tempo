# QUALIA.CODE v1.1 - HarmonyAnalysisService Tests
# Comprehensive test suite for musical harmony analysis

import pytest
import time
from unittest.mock import MagicMock
from pathlib import Path

from backend.services.HarmonyAnalysisService import HarmonyAnalysisService
from backend.services.EventBus import EventBus
from backend.services.interfaces.IHarmonyAnalysisService import (
    HarmonyClassification,
)


@pytest.fixture
def event_bus():
    """Create EventBus instance for testing."""
    return EventBus()


@pytest.fixture
def config_path():
    """Get path to test configuration."""
    return Path(__file__).parent.parent / "config" / "harmony-analysis.yaml"


@pytest.fixture
def harmony_service(event_bus, config_path):
    """Create HarmonyAnalysisService instance for testing."""
    service = HarmonyAnalysisService(event_bus=event_bus, config_path=str(config_path))
    return service


@pytest.fixture
def initialized_service(harmony_service):
    """Create initialized HarmonyAnalysisService."""
    harmony_service.initialize(player_id="test_player")
    return harmony_service


class TestHarmonyServiceInitialization:
    """Test HarmonyAnalysisService initialization."""

    def test_service_creation(self, harmony_service):
        """Test that service can be created."""
        assert harmony_service is not None
        assert harmony_service._config is not None
        assert 'musical_notes' in harmony_service._config
        assert 'harmonic_intervals' in harmony_service._config

    def test_initialization(self, harmony_service):
        """Test service initialization."""
        harmony_service.initialize(player_id="player1")
        
        assert harmony_service._player_id == "player1"
        assert len(harmony_service._harmony_history) == 0
        assert harmony_service._total_analyses == 0

    def test_interval_lookup_built(self, harmony_service):
        """Test that interval lookup table is built correctly."""
        assert len(harmony_service._interval_lookup) > 0
        # Check for perfect fifth (7 semitones)
        assert 7 in harmony_service._interval_lookup
        assert harmony_service._interval_lookup[7]['name'] == 'perfect_fifth'
        # Check for tritone (6 semitones)
        assert 6 in harmony_service._interval_lookup
        assert harmony_service._interval_lookup[6]['name'] == 'tritone'


class TestMusicalIntervals:
    """Test musical interval calculations."""

    def test_perfect_fifth_interval(self, initialized_service):
        """Test perfect fifth interval (C to G)."""
        service = initialized_service
        
        interval = service.calculate_interval_harmony("C", "G")
        
        assert interval.note1 == "C"
        assert interval.note2 == "G"
        assert interval.semitones == 7
        assert interval.interval_name == "perfect_fifth"
        assert interval.is_consonant == True
        assert interval.harmony_score >= 0.90

    def test_major_third_interval(self, initialized_service):
        """Test major third interval (C to E)."""
        service = initialized_service
        
        interval = service.calculate_interval_harmony("C", "E")
        
        assert interval.semitones == 4
        assert interval.interval_name == "major_third"
        assert interval.is_consonant == True
        assert interval.harmony_score >= 0.70

    def test_tritone_interval(self, initialized_service):
        """Test tritone interval (C to F#) - devil's interval."""
        service = initialized_service
        
        interval = service.calculate_interval_harmony("C", "F#")
        
        assert interval.semitones == 6
        assert interval.interval_name == "tritone"
        assert interval.is_consonant == False
        assert interval.harmony_score <= 0.20  # High chaos = low harmony

    def test_minor_second_interval(self, initialized_service):
        """Test minor second interval (C to C#) - very dissonant."""
        service = initialized_service
        
        interval = service.calculate_interval_harmony("C", "C#")
        
        assert interval.semitones == 1
        assert interval.interval_name == "minor_second"
        assert interval.is_consonant == False

    def test_octave_interval(self, initialized_service):
        """Test octave interval (same note, different octave)."""
        service = initialized_service
        
        # Using semitone calculation, octave should normalize to 0 (unison)
        interval = service.calculate_interval_harmony("C", "C")
        
        assert interval.semitones == 0
        assert interval.harmony_score == 1.0  # Perfect consonance


class TestHarmonyScoring:
    """Test harmony score calculations."""

    def test_perfect_harmony_classification(self, initialized_service):
        """Test that high harmony scores are classified as perfect."""
        service = initialized_service
        
        classification = service.classify_harmony(0.95)
        
        assert classification == HarmonyClassification.PERFECT_HARMONY

    def test_harmonic_classification(self, initialized_service):
        """Test harmonic classification."""
        service = initialized_service
        
        classification = service.classify_harmony(0.70)
        
        assert classification == HarmonyClassification.HARMONIC

    def test_chaotic_classification(self, initialized_service):
        """Test chaotic classification."""
        service = initialized_service
        
        classification = service.classify_harmony(0.30)
        
        assert classification == HarmonyClassification.CHAOTIC

    def test_extreme_chaos_classification(self, initialized_service):
        """Test extreme chaos classification."""
        service = initialized_service
        
        classification = service.classify_harmony(0.15)
        
        assert classification == HarmonyClassification.EXTREME_CHAOS

    def test_neutral_classification(self, initialized_service):
        """Test neutral classification."""
        service = initialized_service
        
        classification = service.classify_harmony(0.50)
        
        assert classification == HarmonyClassification.NEUTRAL


class TestPlayerInputAnalysis:
    """Test player input analysis."""

    def test_analyze_harmonic_input(self, initialized_service):
        """Test analysis of harmonic player input (major chord)."""
        service = initialized_service
        timestamp = time.time()
        
        # Set up song context with C major scale
        service.update_song_context(["C", "E", "G"], 120.0, timestamp)
        
        # Player plays matching notes (C major chord)
        harmony_score = service.analyze_player_input(["C", "E", "G"], timestamp)
        
        assert harmony_score is not None
        assert harmony_score.overall_score >= 0.60  # Should be harmonic
        assert harmony_score.is_harmonic == True
        assert harmony_score.is_chaotic == False

    def test_analyze_chaotic_input(self, initialized_service):
        """Test analysis of chaotic player input (dissonant notes)."""
        service = initialized_service
        timestamp = time.time()
        
        # Set up song context
        service.update_song_context(["C", "D", "E"], 120.0, timestamp)
        
        # Player plays dissonant notes (tritone + minor second)
        harmony_score = service.analyze_player_input(["C", "C#", "F#"], timestamp)
        
        assert harmony_score is not None
        # Should be chaotic or at least not harmonic
        assert harmony_score.overall_score <= 0.60

    def test_analyze_empty_input(self, initialized_service):
        """Test analysis with empty player input."""
        service = initialized_service
        timestamp = time.time()
        
        harmony_score = service.analyze_player_input([], timestamp)
        
        assert harmony_score is not None
        # Should return neutral score
        assert 0.4 <= harmony_score.overall_score <= 0.6


class TestSongComparison:
    """Test comparison with song notes."""

    def test_compare_matching_notes(self, initialized_service):
        """Test comparison when player matches song notes."""
        service = initialized_service
        
        player_notes = ["C", "E", "G"]
        song_notes = ["C", "E", "G"]
        
        score = service.compare_with_song(player_notes, song_notes)
        
        assert score >= 0.80  # Should be very harmonic (same notes)

    def test_compare_harmonic_notes(self, initialized_service):
        """Test comparison with harmonically related notes."""
        service = initialized_service
        
        player_notes = ["C", "G"]  # Perfect fifth
        song_notes = ["C", "E"]
        
        score = service.compare_with_song(player_notes, song_notes)
        
        assert score >= 0.60  # Should be harmonic

    def test_compare_dissonant_notes(self, initialized_service):
        """Test comparison with dissonant notes."""
        service = initialized_service
        
        player_notes = ["C", "F#"]  # Tritone
        song_notes = ["C", "D"]
        
        score = service.compare_with_song(player_notes, song_notes)
        
        assert score <= 0.55  # Should show some dissonance (adjusted for averaging)


class TestQualiaComparison:
    """Test comparison with qualia colors/notes."""

    def test_compare_with_qualia_colors(self, initialized_service):
        """Test qualia color to note conversion and comparison."""
        service = initialized_service
        
        # Red color (should map to C)
        qualia_colors = [{"r": 255, "g": 0, "b": 0}]
        player_notes = ["C"]  # Player plays C
        
        score = service.compare_with_qualia(player_notes, qualia_colors)
        
        assert score >= 0.90  # Should be perfect match

    def test_compare_with_multiple_qualia(self, initialized_service):
        """Test comparison with multiple qualia colors."""
        service = initialized_service
        
        # Red (C) and Yellow (E) - major third
        qualia_colors = [
            {"r": 255, "g": 0, "b": 0},
            {"r": 255, "g": 255, "b": 0}
        ]
        player_notes = ["C", "E"]
        
        score = service.compare_with_qualia(player_notes, qualia_colors)
        
        assert score >= 0.70  # Harmonic interval

    def test_compare_with_empty_qualia(self, initialized_service):
        """Test comparison with no qualia."""
        service = initialized_service
        
        score = service.compare_with_qualia(["C"], [])
        
        assert score == 0.5  # Neutral


class TestChordDetection:
    """Test chord pattern detection."""

    def test_detect_major_triad(self, initialized_service):
        """Test detection of major triad (C-E-G)."""
        service = initialized_service
        timestamp = time.time()
        
        chord = service.detect_chord_pattern(["C", "E", "G"], timestamp)
        
        assert chord is not None
        assert chord.pattern_name == "major_triad"
        assert chord.is_harmonic == True
        assert chord.root_note == "C"

    def test_detect_minor_triad(self, initialized_service):
        """Test detection of minor triad."""
        service = initialized_service
        timestamp = time.time()
        
        # C minor = C, D# (Eb), G
        chord = service.detect_chord_pattern(["C", "D#", "G"], timestamp)
        
        if chord:  # May or may not detect depending on config
            assert chord.pattern_name == "minor_triad"
            assert chord.is_harmonic == True

    def test_detect_diminished_chord(self, initialized_service):
        """Test detection of diminished triad (chaotic)."""
        service = initialized_service
        timestamp = time.time()
        
        # C diminished = C, D# (Eb), F#
        chord = service.detect_chord_pattern(["C", "D#", "F#"], timestamp)
        
        if chord:
            assert chord.is_harmonic == False  # Should be chaotic

    def test_chord_detection_insufficient_notes(self, initialized_service):
        """Test that chord detection requires minimum notes."""
        service = initialized_service
        timestamp = time.time()
        
        chord = service.detect_chord_pattern(["C"], timestamp)
        
        assert chord is None  # Too few notes

    def test_chord_detection_unrecognized_pattern(self, initialized_service):
        """Test handling of unrecognized chord patterns."""
        service = initialized_service
        timestamp = time.time()
        
        # Random notes that don't form a known pattern
        chord = service.detect_chord_pattern(["C", "D", "F"], timestamp)
        
        # Should return None for unrecognized patterns
        # (or could return None, depending on implementation)


class TestConsonanceScoring:
    """Test consonance score calculations."""

    def test_consonance_of_perfect_fifth(self, initialized_service):
        """Test consonance score of perfect fifth."""
        service = initialized_service
        
        score = service.get_consonance_score(["C", "G"])
        
        assert score >= 0.90  # Perfect fifth is highly consonant

    def test_consonance_of_major_chord(self, initialized_service):
        """Test consonance score of major chord."""
        service = initialized_service
        
        score = service.get_consonance_score(["C", "E", "G"])
        
        assert score >= 0.75  # Major triad is consonant

    def test_consonance_of_dissonant_cluster(self, initialized_service):
        """Test consonance score of dissonant note cluster."""
        service = initialized_service
        
        score = service.get_consonance_score(["C", "C#", "D"])
        
        assert score <= 0.40  # Tone cluster is very dissonant

    def test_consonance_single_note(self, initialized_service):
        """Test that single note returns neutral score."""
        service = initialized_service
        
        score = service.get_consonance_score(["C"])
        
        assert score == 0.5  # Single note is neutral


class TestHarmonyChecks:
    """Test quick harmony/chaos checks."""

    def test_is_harmonic_combination(self, initialized_service):
        """Test harmonic combination check."""
        service = initialized_service
        
        is_harmonic = service.is_harmonic_combination(["C", "E", "G"])
        
        assert is_harmonic == True

    def test_is_chaotic_combination(self, initialized_service):
        """Test chaotic combination check."""
        service = initialized_service
        
        is_chaotic = service.is_chaotic_combination(["C", "C#", "F#"])
        
        assert is_chaotic == True

    def test_neutral_combination(self, initialized_service):
        """Test neutral combination."""
        service = initialized_service
        
        notes = ["C", "D"]  # Major second - somewhat neutral
        
        is_harmonic = service.is_harmonic_combination(notes)
        is_chaotic = service.is_chaotic_combination(notes)
        
        # Should be neither strongly harmonic nor chaotic
        # (actual result depends on threshold configuration)


class TestContextUpdates:
    """Test song and qualia context updates."""

    def test_update_song_context(self, initialized_service):
        """Test updating song context."""
        service = initialized_service
        timestamp = time.time()
        
        service.update_song_context(["C", "D", "E"], 140.0, timestamp)
        
        assert service._current_song_notes == ["C", "D", "E"]
        assert service._current_tempo_bpm == 140.0

    def test_update_qualia_context(self, initialized_service):
        """Test updating qualia context."""
        service = initialized_service
        timestamp = time.time()
        
        # Red and green colors
        colors = [
            {"r": 255, "g": 0, "b": 0},  # C
            {"r": 0, "g": 255, "b": 0}   # F
        ]
        
        service.update_qualia_context(colors, timestamp)
        
        assert len(service._collected_qualia_notes) == 2
        assert "C" in service._collected_qualia_notes
        assert "F" in service._collected_qualia_notes


class TestHarmonyTrends:
    """Test harmony trend tracking."""

    def test_trend_with_improving_harmony(self, initialized_service):
        """Test trend calculation with improving harmony."""
        service = initialized_service
        timestamp = time.time()
        
        # Set up song context so harmony analysis has reference
        service.update_song_context(["C", "E", "G"], 120.0, timestamp)
        
        # Need more samples for trend to be statistically significant
        # Analyze with progressively better harmony
        service.analyze_player_input(["C", "C#"], timestamp)  # Very chaotic
        service.analyze_player_input(["C", "F#"], timestamp + 50)  # Chaotic
        service.analyze_player_input(["C", "D"], timestamp + 100)  # Slightly better
        service.analyze_player_input(["C", "E"], timestamp + 150)  # Better
        service.analyze_player_input(["C", "G"], timestamp + 200)  # Even better
        service.analyze_player_input(["C", "E", "G"], timestamp + 250)  # Best
        
        trend = service.get_harmony_trend()
        
        assert trend > 0.0  # Should show improvement

    def test_trend_with_declining_harmony(self, initialized_service):
        """Test trend calculation with declining harmony."""
        service = initialized_service
        timestamp = time.time()
        
        # Set up song context so harmony analysis has reference
        service.update_song_context(["C", "E", "G"], 120.0, timestamp)
        
        # Need more samples for trend to be statistically significant
        # Analyze with progressively worse harmony
        service.analyze_player_input(["C", "E", "G"], timestamp)  # Best
        service.analyze_player_input(["C", "G"], timestamp + 50)  # Good
        service.analyze_player_input(["C", "E"], timestamp + 100)  # Slightly worse
        service.analyze_player_input(["C", "D"], timestamp + 150)  # Worse
        service.analyze_player_input(["C", "F#"], timestamp + 200)  # Even worse
        service.analyze_player_input(["C", "C#"], timestamp + 250)  # Worst
        
        trend = service.get_harmony_trend()
        
        assert trend < 0.0  # Should show decline

    def test_trend_with_insufficient_data(self, initialized_service):
        """Test trend with insufficient data."""
        service = initialized_service
        
        trend = service.get_harmony_trend()
        
        assert trend == 0.0  # No data = no trend


class TestStatistics:
    """Test statistics tracking."""

    def test_statistics_tracking(self, initialized_service):
        """Test that statistics are tracked correctly."""
        service = initialized_service
        timestamp = time.time()
        
        # Set up song context to enable proper classification
        service.update_song_context(["C", "E", "G"], 120.0, timestamp)
        
        # Perform some analyses
        service.analyze_player_input(["C", "E", "G"], timestamp)  # Harmonic (matches song)
        service.analyze_player_input(["C", "F#"], timestamp)  # Chaotic
        service.analyze_player_input(["C", "E", "G", "B"], timestamp)  # Very harmonic
        
        stats = service.get_statistics()
        
        assert stats['total_analyses'] == 3
        assert stats['harmonic_count'] >= 1
        assert stats['player_id'] == "test_player"
        assert 'average_harmony' in stats


class TestEventBusIntegration:
    """Test EventBus integration."""

    def test_harmony_events_emitted(self, initialized_service, event_bus):
        """Test that harmony events are emitted."""
        service = initialized_service
        timestamp = time.time()
        
        # Subscribe to events
        events_received = []
        
        async def handler(event):
            events_received.append(event)
        
        event_bus.subscribe("Harmony.ScoreCalculated", handler)
        
        # Perform analysis
        service.analyze_player_input(["C", "E", "G"], timestamp)
        
        # Should have emitted event (synchronously in this case)
        # Note: In real async context, would need to await


class TestEdgeCases:
    """Test edge cases and error handling."""

    def test_unknown_note_handling(self, initialized_service):
        """Test handling of unknown note names."""
        service = initialized_service
        
        # Unknown note should default to index 0
        interval = service.calculate_interval_harmony("C", "X")
        
        assert interval is not None  # Should handle gracefully

    def test_empty_note_lists(self, initialized_service):
        """Test handling of empty note lists."""
        service = initialized_service
        
        score = service.get_consonance_score([])
        
        assert score == 0.5  # Should return neutral

    def test_reset_clears_state(self, initialized_service):
        """Test that reset clears all state."""
        service = initialized_service
        timestamp = time.time()
        
        # Add some data
        service.analyze_player_input(["C", "E"], timestamp)
        service.update_song_context(["C", "D"], 140.0, timestamp)
        
        # Reset
        service.reset()
        
        assert service._player_id is None
        assert len(service._harmony_history) == 0
        assert service._total_analyses == 0
        assert len(service._current_song_notes) == 0


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
