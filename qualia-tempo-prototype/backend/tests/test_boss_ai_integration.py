"""
Integration test for BossAIService and PatternSystemService in CompositionRoot.
PHASE 2 TASK 2.3 - Verification test.
"""

import pytest
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from backend.CompositionRoot import CompositionRoot


@pytest.mark.asyncio
async def test_composition_root_boss_ai_integration():
    """Test that BossAI and PatternSystem services can be retrieved from CompositionRoot."""
    root = CompositionRoot()
    
    try:
        # Initialize the composition root
        await root.initialize()
        
        # Test BossAIService retrieval
        boss_ai = root.get_boss_ai_service()
        assert boss_ai is not None, "BossAIService should not be None"
        assert type(boss_ai).__name__ == "BossAIService", f"Expected BossAIService, got {type(boss_ai).__name__}"
        
        # Test PatternSystemService retrieval
        pattern_sys = root.get_pattern_system_service()
        assert pattern_sys is not None, "PatternSystemService should not be None"
        assert type(pattern_sys).__name__ == "PatternSystemService", f"Expected PatternSystemService, got {type(pattern_sys).__name__}"
        
        # Verify services are functional
        stats = boss_ai.get_statistics()
        assert "patterns_executed" in stats, "BossAIService should have statistics"
        assert "total_damage_dealt" in stats, "BossAIService should track damage"
        
        pattern_count = pattern_sys.get_pattern_count()
        assert isinstance(pattern_count, int), "PatternSystemService should return pattern count"
        assert pattern_count >= 0, "Pattern count should be non-negative"
        
    finally:
        await root.shutdown()


@pytest.mark.asyncio
async def test_boss_ai_service_initialization():
    """Test that BossAIService initializes with correct dependencies."""
    root = CompositionRoot()
    
    try:
        await root.initialize()
        
        boss_ai = root.get_boss_ai_service()
        event_bus = root.get_event_bus()
        
        # Verify BossAI has EventBus reference (through dependency injection)
        assert boss_ai is not None
        assert event_bus is not None
        
        # Test basic boss initialization
        result = boss_ai.initialize_boss(
            boss_id="boss_test_001",
            song_duration=180.0,
            difficulty_volume=1.0,
            tempo_bpm=140.0,
            combat_data=None
        )
        
        assert result is not None, "Boss initialization should return BossAIState"
        assert result.boss_id == "boss_test_001", "Boss ID should match"
        
        # Verify boss was initialized
        phase = boss_ai.get_current_phase()
        assert phase is not None, "Boss should have a current phase after initialization"
        
    finally:
        await root.shutdown()


if __name__ == "__main__":
    import asyncio
    asyncio.run(test_composition_root_boss_ai_integration())
    asyncio.run(test_boss_ai_service_initialization())
    print("✅ All integration tests passed!")
