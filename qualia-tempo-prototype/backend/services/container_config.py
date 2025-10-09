# QUALIA.CODE v1.1 - Container Configuration
# Service registration and container setup

import yaml
from pathlib import Path
from typing import Dict, Any
from .container import ServiceContainer, get_container
from .interfaces.ILogger import ILogger
from .interfaces.IEventBus import IEventBus
from .interfaces.IQualiaProcessor import IQualiaProcessor
from .interfaces.IFileSystemService import IFileSystemService
from .interfaces.ISystemEnvironmentService import ISystemEnvironmentService
from .interfaces.ISecurityService import ISecurityService
from .interfaces.IShaderIntrospectionService import IShaderIntrospectionService
from .interfaces.IConfigurationService import IConfigurationService
from .interfaces.IParticleEnginePoolManager import IParticleEnginePoolManager
from .interfaces.IGameLogicService import IGameLogicService
from .interfaces.IHarmonyAnalysisService import IHarmonyAnalysisService
from .interfaces.IBossAIService import IBossAIService, IPatternSystemService
from .interfaces.IApplicationInitializerService import IApplicationInitializerService
from .interfaces.IPerformanceService import IPerformanceService
from .interfaces.ITimerService import ITimerService
from .interfaces.IMetricsService import IMetricsService

# Import implementations
from .QualiaLogger import QualiaLogger
from .EventBus import EventBus
from .QualiaProcessor import QualiaProcessor
from .FileSystemService import FileSystemService
from .SystemEnvironmentService import SystemEnvironmentService
from .SecurityService import SecurityService
from .ShaderIntrospectionService import ShaderIntrospectionService
from .ConfigurationService import ConfigurationService
from .ParticleEnginePoolManager import ParticleEnginePoolManager
from .GameLogicService import GameLogicService
from .HarmonyAnalysisService import HarmonyAnalysisService
from .BossAIService import BossAIService
from .PatternSystemService import PatternSystemService
from .ApplicationInitializerService import ApplicationInitializerService
from .PerformanceService import PerformanceService
from .TimerService import TimerService

# Import contracts
from .contracts.ILogger_contracts import LoggerConfig
from .contracts.IEventBus_contracts import EventBusConfig
from .contracts.IQualiaProcessor_contracts import QualiaProcessorConfig
from .contracts.IFileSystemService_contracts import FileSystemConfig
from .contracts.ISystemEnvironmentService_contracts import SystemEnvironmentConfig
from .contracts.ISecurityService_contracts import SecurityConfig
from .contracts.IShaderIntrospectionService_contracts import ShaderIntrospectionConfig
from .contracts.IConfigurationService_contracts import ConfigurationServiceConfig
from .contracts.IParticleEnginePoolManager_contracts import ParticleEnginePoolManagerConfig
from .contracts.IGameLogicService_contracts import GameLogicConfig
from .contracts.IHarmonyAnalysisService_contracts import HarmonyAnalysisConfig
from .contracts.IBossAIService_contracts import BossAIServiceConfig
from .contracts.IPatternSystemService_contracts import PatternSystemConfig
from .contracts.IApplicationInitializerService_contracts import ApplicationInitializerServiceConfig
from .contracts.IPerformanceService_contracts import PerformanceServiceConfig
from .contracts.ITimerService_contracts import TimerServiceConfig


def _load_yaml_config(config_name: str, config_dir: str = "config") -> Dict[str, Any]:
    """
    Load YAML configuration file.
    
    Args:
        config_name: Name of config file (without .yaml extension)
        config_dir: Directory containing config files
        
    Returns:
        Dictionary with configuration data
    """
    config_path = Path(__file__).parent.parent / config_dir / f"{config_name}.yaml"
    
    if not config_path.exists():
        # Fallback to default empty config
        return {}
    
    with open(config_path, 'r') as f:
        return yaml.safe_load(f) or {}


def configure_container(container: ServiceContainer) -> None:
    """
    Configure the service container with all service registrations.
    
    This function:
    1. Loads configuration from YAML files
    2. Registers all configuration objects
    3. Registers all service interfaces and implementations
    4. Sets up the dependency graph
    
    Args:
        container: Service container to configure
    """
    # Step 1: Load configurations from YAML files
    # All configuration values now externalized per QUALIA.CODE v1.1
    
    # Load YAML configs
    logger_config_data = _load_yaml_config("logger")
    event_bus_config_data = _load_yaml_config("event-bus")
    qualia_processor_config_data = _load_yaml_config("qualia-processor")
    file_system_config_data = _load_yaml_config("file-system")
    system_env_config_data = _load_yaml_config("system-environment")
    security_config_data = _load_yaml_config("security")
    shader_config_data = _load_yaml_config("shader-introspection")
    config_service_config_data = _load_yaml_config("configuration-service")
    pool_config_data = _load_yaml_config("process-pool")
    game_logic_config_data = _load_yaml_config("game-logic")
    harmony_analysis_config_data = _load_yaml_config("harmony-analysis")
    boss_ai_config_data = _load_yaml_config("boss-ai")
    pattern_system_config_data = _load_yaml_config("pattern-system")
    app_initializer_config_data = _load_yaml_config("application-initializer")
    performance_config_data = _load_yaml_config("performance")
    timer_config_data = _load_yaml_config("timer")
    
    # Register typed configuration objects
    container.register_config(LoggerConfig, LoggerConfig(
        log_level=logger_config_data.get("log_level", "INFO"),
        enable_file_logging=logger_config_data.get("enable_file_logging", True),
        log_file_path=logger_config_data.get("log_file_path", "backend.log")
    ))
    
    container.register_config(EventBusConfig, EventBusConfig(
        max_handlers_per_event=event_bus_config_data.get("max_handlers_per_event", 100),
        enable_statistics=event_bus_config_data.get("enable_statistics", True),
        log_all_events=event_bus_config_data.get("log_all_events", False)
    ))
    
    container.register_config(QualiaProcessorConfig, QualiaProcessorConfig(
        processing_enabled=qualia_processor_config_data.get("processing_enabled", True),
        intensity_spike_threshold=qualia_processor_config_data.get("intensity_spike_threshold", 0.3),
        transcendence_threshold=qualia_processor_config_data.get("transcendence_threshold", 0.8),
        chaos_threshold=qualia_processor_config_data.get("chaos_threshold", 0.7)
    ))
    
    container.register_config(FileSystemConfig, FileSystemConfig(
        base_path=file_system_config_data.get("base_path", "/media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/backend"),
        enable_caching=file_system_config_data.get("enable_caching", True)
    ))
    
    container.register_config(SystemEnvironmentConfig, SystemEnvironmentConfig(
        environment=system_env_config_data.get("environment", "development"),
        enable_debug_logging=system_env_config_data.get("enable_debug_logging", True)
    ))
    
    container.register_config(SecurityConfig, SecurityConfig(
        auth_enabled=security_config_data.get("auth_enabled", True),
        token_expiration_minutes=security_config_data.get("token_expiration_minutes", 60)
    ))
    
    container.register_config(ShaderIntrospectionConfig, ShaderIntrospectionConfig(
        shader_directory=shader_config_data.get("shader_directory", "public/shaders"),
        enable_caching=shader_config_data.get("enable_caching", True)
    ))
    
    container.register_config(ConfigurationServiceConfig, ConfigurationServiceConfig(
        config_directory=config_service_config_data.get("config_directory", "config"),
        enable_hot_reload=config_service_config_data.get("enable_hot_reload", False),
        cache_configs=config_service_config_data.get("cache_configs", True),
        validate_on_load=config_service_config_data.get("validate_on_load", True)
    ))
    
    # Extract pool config sections
    pool_cfg = pool_config_data.get('pool', {})
    queue_cfg = pool_config_data.get('queue', {})
    error_cfg = pool_config_data.get('error_handling', {})
    perf_cfg = pool_config_data.get('performance', {})
    mon_cfg = pool_config_data.get('monitoring', {})
    shutdown_cfg = pool_config_data.get('shutdown', {})
    
    container.register_config(ParticleEnginePoolManagerConfig, ParticleEnginePoolManagerConfig(
        num_workers=pool_cfg.get('num_workers', 4),
        max_tasks_per_child=pool_cfg.get('max_tasks_per_child', 100),
        queue_max_size=queue_cfg.get('max_size', 50),
        queue_timeout_seconds=queue_cfg.get('timeout_seconds', 5.0),
        max_retries=error_cfg.get('max_retries', 3),
        retry_delay_seconds=error_cfg.get('retry_delay_seconds', 0.5),
        collect_metrics=perf_cfg.get('collect_metrics', True),
        health_check_interval_seconds=mon_cfg.get('health_check_interval_seconds', 10.0),
        grace_period_seconds=shutdown_cfg.get('grace_period_seconds', 5.0)
    ))
    
    container.register_config(GameLogicConfig, GameLogicConfig(
        qualia_generation=game_logic_config_data.get('qualia_generation', {}),
        combo_system=game_logic_config_data.get('combo_system', {}),
        scoring=game_logic_config_data.get('scoring', {}),
        health_system=game_logic_config_data.get('health_system', {}),
        cooldowns=game_logic_config_data.get('cooldowns', {}),
        difficulty=game_logic_config_data.get('difficulty', {}),
        game_state=game_logic_config_data.get('game_state', {}),
        features=game_logic_config_data.get('features', {})
    ))
    
    container.register_config(HarmonyAnalysisConfig, HarmonyAnalysisConfig(
        musical_notes=harmony_analysis_config_data.get('musical_notes', {}),
        harmonic_intervals=harmony_analysis_config_data.get('harmonic_intervals', {}),
        chaotic_intervals=harmony_analysis_config_data.get('chaotic_intervals', {}),
        chord_patterns=harmony_analysis_config_data.get('chord_patterns', {}),
        scoring_weights=harmony_analysis_config_data.get('scoring_weights', {}),
        thresholds=harmony_analysis_config_data.get('thresholds', {}),
        analysis_windows=harmony_analysis_config_data.get('analysis_windows', {}),
        qualia_color_to_note=harmony_analysis_config_data.get('qualia_color_to_note', {}),
        features=harmony_analysis_config_data.get('features', {})
    ))
    
    container.register_config(BossAIServiceConfig, BossAIServiceConfig(
        phases=boss_ai_config_data.get('phases', {}),
        aggression=boss_ai_config_data.get('aggression', {}),
        pattern_selection=boss_ai_config_data.get('pattern_selection', {}),
        default_patterns=boss_ai_config_data.get('default_patterns', {}),
        behavior=boss_ai_config_data.get('behavior', {}),
        qualia_generation=boss_ai_config_data.get('qualia_generation', {}),
        features=boss_ai_config_data.get('features', {})
    ))
    
    container.register_config(PatternSystemConfig, PatternSystemConfig(
        max_active_patterns=pattern_system_config_data.get('max_active_patterns', 10),
        pattern_cache_size=pattern_system_config_data.get('pattern_cache_size', 100),
        enable_pattern_prediction=pattern_system_config_data.get('enable_pattern_prediction', True),
        default_patterns=pattern_system_config_data.get('default_patterns', [])
    ))
    
    container.register_config(ApplicationInitializerServiceConfig, ApplicationInitializerServiceConfig(
        enable_lifecycle_logging=app_initializer_config_data.get('enable_lifecycle_logging', True),
        initialization_timeout_seconds=app_initializer_config_data.get('initialization_timeout_seconds', 30),
        shutdown_timeout_seconds=app_initializer_config_data.get('shutdown_timeout_seconds', 10),
        fail_fast=app_initializer_config_data.get('fail_fast', True)
    ))
    
    container.register_config(PerformanceServiceConfig, PerformanceServiceConfig(
        max_measurements=performance_config_data.get('max_measurements', 10000),
        measurement_retention_seconds=performance_config_data.get('measurement_retention_seconds', 3600),
        slow_operation_threshold_ms=performance_config_data.get('slow_operation_threshold_ms', 100.0),
        critical_operation_threshold_ms=performance_config_data.get('critical_operation_threshold_ms', 1000.0),
        enable_cpu_monitoring=performance_config_data.get('enable_cpu_monitoring', True),
        enable_memory_monitoring=performance_config_data.get('enable_memory_monitoring', True),
        resource_check_interval_seconds=performance_config_data.get('resource_check_interval_seconds', 60),
        aggregation_window_seconds=performance_config_data.get('aggregation_window_seconds', 60),
        percentiles=performance_config_data.get('percentiles', [50, 90, 95, 99]),
        export_formats=performance_config_data.get('export_formats', ["json", "prometheus"]),
        prometheus_prefix=performance_config_data.get('prometheus_prefix', "qualia_tempo"),
        enable_alerting=performance_config_data.get('enable_alerting', False),
        alert_threshold_multiplier=performance_config_data.get('alert_threshold_multiplier', 2.0)
    ))
    
    container.register_config(TimerServiceConfig, TimerServiceConfig(
        max_concurrent_timers=timer_config_data.get('max_concurrent_timers', 1000),
        enable_timer_tracking=timer_config_data.get('enable_timer_tracking', True),
        default_timeout_seconds=timer_config_data.get('default_timeout_seconds', 300.0),
        max_delay_seconds=timer_config_data.get('max_delay_seconds', 86400.0),
        auto_cleanup_completed=timer_config_data.get('auto_cleanup_completed', True),
        cleanup_interval_seconds=timer_config_data.get('cleanup_interval_seconds', 60.0),
        log_callback_errors=timer_config_data.get('log_callback_errors', True),
        retry_failed_callbacks=timer_config_data.get('retry_failed_callbacks', False),
        max_callback_retries=timer_config_data.get('max_callback_retries', 3),
        callback_timeout_seconds=timer_config_data.get('callback_timeout_seconds', 30.0),
        enable_callback_performance_tracking=timer_config_data.get('enable_callback_performance_tracking', True),
        enable_interval_timers=timer_config_data.get('enable_interval_timers', True),
        enable_wait_for_completion=timer_config_data.get('enable_wait_for_completion', True),
        enable_fast_forward=timer_config_data.get('enable_fast_forward', False)
    ))
    
    # Step 2: Register all services as singletons
    # Dependencies will be automatically resolved by the container
    
    # Register services as singletons with their Protocol interfaces
    # The container will use the interface type as the key but the concrete class for instantiation
    container.register_singleton(ILogger, QualiaLogger)  # type: ignore[type-abstract]
    container.register_singleton(IEventBus, EventBus)  # type: ignore[type-abstract]
    container.register_singleton(IFileSystemService, FileSystemService)  # type: ignore[type-abstract]
    container.register_singleton(IConfigurationService, ConfigurationService)  # type: ignore[type-abstract]
    container.register_singleton(IQualiaProcessor, QualiaProcessor)  # type: ignore[type-abstract]
    container.register_singleton(ISystemEnvironmentService, SystemEnvironmentService)  # type: ignore[type-abstract]
    container.register_singleton(ISecurityService, SecurityService)  # type: ignore[type-abstract]
    container.register_singleton(IShaderIntrospectionService, ShaderIntrospectionService)  # type: ignore[type-abstract]
    container.register_singleton(IParticleEnginePoolManager, ParticleEnginePoolManager)  # type: ignore[type-abstract]
    container.register_singleton(IGameLogicService, GameLogicService)  # type: ignore[type-abstract]
    container.register_singleton(IHarmonyAnalysisService, HarmonyAnalysisService)  # type: ignore[type-abstract]
    container.register_singleton(IBossAIService, BossAIService)  # type: ignore[type-abstract]
    container.register_singleton(IPatternSystemService, PatternSystemService)  # type: ignore[type-abstract]
    container.register_singleton(IApplicationInitializerService, ApplicationInitializerService)  # type: ignore[type-abstract]
    container.register_singleton(IPerformanceService, PerformanceService)  # type: ignore[type-abstract]
    container.register_singleton(ITimerService, TimerService)  # type: ignore[type-abstract]


def get_configured_container() -> ServiceContainer:
    """
    Get a fully configured container instance.
    
    Returns:
        Configured ServiceContainer
    """
    container = get_container()
    configure_container(container)
    return container
