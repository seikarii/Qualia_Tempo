"""
Centralized High-Fidelity Mocks for Testing
QUALIA.CODE v1.1 Compliance - Testing Infrastructure

This module provides high-fidelity mocks for all service interfaces.
All mocks record calls for assertions and implement full Protocol interfaces.

COMPLIANCE: QUALIA.MANUAL.md Section 10.3.1 (High-Fidelity Mocking)
"""

# Phase 4.1 Mocks (Core Infrastructure)
from .logger_mock import MockLogger
from .event_bus_mock import MockEventBus
from .file_system_mock import MockFileSystemService
from .configuration_service_mock import MockConfigurationService

# Phase 4.2 Mocks (All Services)
from .system_environment_mock import MockSystemEnvironmentService
from .security_service_mock import MockSecurityService
from .shader_introspection_mock import MockShaderIntrospectionService
from .qualia_processor_mock import MockQualiaProcessor
from .game_logic_service_mock import MockGameLogicService
from .harmony_analysis_mock import MockHarmonyAnalysisService
from .boss_ai_service_mock import MockBossAIService
from .particle_pool_manager_mock import MockParticleEnginePoolManager
from .pattern_system_mock import MockPatternSystemService
from .application_initializer_mock import MockApplicationInitializerService
from .state_streaming_mock import MockStateStreamingService
from .MockPerformanceService import MockPerformanceService
from .MockTimerService import MockTimerService

__all__ = [
    # Phase 4.1 (Core Infrastructure)
    "MockLogger",
    "MockEventBus",
    "MockFileSystemService",
    "MockConfigurationService",
    # Phase 4.2 (All Services)
    "MockSystemEnvironmentService",
    "MockSecurityService",
    "MockShaderIntrospectionService",
    "MockQualiaProcessor",
    "MockGameLogicService",
    "MockHarmonyAnalysisService",
    "MockBossAIService",
    "MockParticleEnginePoolManager",
    "MockPatternSystemService",
    "MockApplicationInitializerService",
    "MockStateStreamingService",
    # Phase 6.1 (Performance Monitoring)
    "MockPerformanceService",
    # Phase 6.2 (Timer Service)
    "MockTimerService",
]
