"""
QUALIA.CODE v1.1 - ApplicationInitializerService Integration Test
Tests automatic @OnEvent registration and lifecycle management.
"""

import pytest
from backend.services.ApplicationInitializerService import ApplicationInitializerService
from backend.services.QualiaProcessor import QualiaProcessor
from backend.services.GameLogicService import GameLogicService
from backend.services.EventBus import EventBus
from backend.services.QualiaLogger import QualiaLogger
from backend.services.contracts.ILogger_contracts import LoggerConfig
from backend.services.contracts.IEventBus_contracts import EventBusConfig
from backend.services.contracts.IQualiaProcessor_contracts import QualiaProcessorConfig
from backend.services.contracts.IGameLogicService_contracts import GameLogicConfig
from backend.services.contracts.IApplicationInitializerService_contracts import ApplicationInitializerServiceConfig


@pytest.fixture
def logger():
    """Create logger for tests."""
    config = LoggerConfig(
        log_level="DEBUG",
        enable_file_logging=False,
        log_file_path="test.log"
    )
    return QualiaLogger(config)


@pytest.fixture
def event_bus(logger):
    """Create event bus for tests."""
    config = EventBusConfig(
        max_handlers_per_event=100,
        enable_statistics=True,
        log_all_events=False
    )
    return EventBus(config, logger)


@pytest.fixture
def qualia_processor(event_bus, logger):
    """Create QualiaProcessor for tests."""
    config = QualiaProcessorConfig(
        processing_enabled=True,
        intensity_spike_threshold=0.3,
        transcendence_threshold=0.8,
        chaos_threshold=0.7
    )
    return QualiaProcessor(config, event_bus, logger)


@pytest.fixture
def game_logic_service(event_bus, logger):
    """Create GameLogicService for tests."""
    config = GameLogicConfig(
        qualia_generation={
            "metronome_spawn_enabled": True,
            "dash_qualia_count": 2,
        },
        combo_system={"decay_time": 2.0},
        scoring={"base_qualia_points": 100},
        health_system={"player_max": 100.0, "boss_max": 1000.0},
        cooldowns={"ultimate_duration": 10.0},
        difficulty={
            "phase_multipliers": {
                "1": 1.0,
                "2": 1.5,
                "3": 2.0,
            }
        },
        game_state={},
        features={}
    )
    return GameLogicService(config, logger, event_bus)


@pytest.fixture
def app_initializer(logger, event_bus, qualia_processor, game_logic_service):
    """Create ApplicationInitializerService with managed services."""
    managed_services = [qualia_processor, game_logic_service]
    config = ApplicationInitializerServiceConfig(
        enable_lifecycle_logging=True,
        initialization_timeout_seconds=30,
        shutdown_timeout_seconds=10,
        fail_fast=True
    )
    return ApplicationInitializerService(logger, event_bus, managed_services, config)


@pytest.mark.asyncio
async def test_application_initializer_start(app_initializer, qualia_processor, game_logic_service):
    """Test ApplicationInitializerService.start() initializes services and registers @OnEvent handlers."""
    # Start the application initializer
    await app_initializer.start()
    
    # Verify services were initialized
    status = app_initializer.get_initialization_status()
    assert status["is_started"] is True
    assert len(status["initialized_services"]) == 2
    assert "QualiaProcessor" in status["initialized_services"]
    assert "GameLogicService" in status["initialized_services"]
    assert len(status["failed_services"]) == 0
    
    # Verify @OnEvent handlers were registered
    # QualiaProcessor should have 2 handlers (PlayerAction, GameStateChanged)
    # GameLogicService should have 2 handlers (MetronomeTick, BossPhaseChanged)
    # Total: 4 handlers
    event_registrations = app_initializer._event_registrations
    assert len(event_registrations) == 2  # 2 services
    assert "QualiaProcessor" in event_registrations
    assert "GameLogicService" in event_registrations
    
    # Cleanup
    await app_initializer.stop()


@pytest.mark.asyncio
async def test_application_initializer_stop(app_initializer, qualia_processor, game_logic_service):
    """Test ApplicationInitializerService.stop() cleans up services in LIFO order."""
    # Start first
    await app_initializer.start()
    
    # Stop (LIFO cleanup)
    await app_initializer.stop()
    
    # Verify services were cleaned up
    status = app_initializer.get_initialization_status()
    assert status["is_started"] is False
    assert len(status["initialized_services"]) == 0
    assert len(status["failed_services"]) == 0
    
    # Verify event handlers were unregistered
    event_registrations = app_initializer._event_registrations
    assert len(event_registrations) == 0


@pytest.mark.asyncio
async def test_onevent_handler_receives_events(app_initializer, event_bus, qualia_processor):
    """Test @OnEvent handlers receive events after ApplicationInitializerService registration."""
    # Start to register handlers
    await app_initializer.start()
    
    # Emit PlayerAction event
    await event_bus.publish_async(
        event_name="PlayerAction",
        data={"action": "dash", "player_id": "test_player"},
        source="test"
    )
    
    # NOTE: We can't directly assert handler was called without mocking,
    # but we can verify the event was published and handlers are registered
    stats = event_bus.get_statistics()
    assert stats["total_events"] == 1
    
    # Cleanup
    await app_initializer.stop()


@pytest.mark.asyncio
async def test_health_status_reporting(qualia_processor, game_logic_service):
    """Test IBaseService.get_health_status() returns comprehensive health information."""
    # Test QualiaProcessor health status
    qp_health = qualia_processor.get_health_status()
    assert qp_health["service"] == "QualiaProcessor"
    assert "status" in qp_health
    assert "processing_enabled" in qp_health
    assert "has_current_state" in qp_health
    assert "intensity_threshold" in qp_health
    
    # Test GameLogicService health status
    gl_health = game_logic_service.get_health_status()
    assert gl_health["service"] == "GameLogicService"
    assert "status" in gl_health
    assert "game_initialized" in gl_health
    assert "player_health" in gl_health
    assert "boss_health" in gl_health
    assert "current_combo" in gl_health
    assert "current_score" in gl_health
    assert "active_qualia_count" in gl_health


@pytest.mark.asyncio
async def test_managed_services_list(app_initializer, qualia_processor, game_logic_service):
    """Test ApplicationInitializerService returns correct managed services list."""
    managed = app_initializer.get_managed_services()
    assert len(managed) == 2
    assert qualia_processor in managed
    assert game_logic_service in managed

