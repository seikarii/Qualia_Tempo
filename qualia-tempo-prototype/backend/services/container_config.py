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

# Import implementations
from .QualiaLogger import QualiaLogger
from .EventBus import EventBus
from .QualiaProcessor import QualiaProcessor
from .FileSystemService import FileSystemService
from .SystemEnvironmentService import SystemEnvironmentService
from .SecurityService import SecurityService
from .ShaderIntrospectionService import ShaderIntrospectionService
from .ConfigurationService import ConfigurationService

# Import contracts
from .contracts.ILogger_contracts import LoggerConfig
from .contracts.IEventBus_contracts import EventBusConfig
from .contracts.IQualiaProcessor_contracts import QualiaProcessorConfig
from .contracts.IFileSystemService_contracts import FileSystemConfig
from .contracts.ISystemEnvironmentService_contracts import SystemEnvironmentConfig
from .contracts.ISecurityService_contracts import SecurityConfig
from .contracts.IShaderIntrospectionService_contracts import ShaderIntrospectionConfig
from .contracts.IConfigurationService_contracts import ConfigurationServiceConfig


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


def get_configured_container() -> ServiceContainer:
    """
    Get a fully configured container instance.
    
    Returns:
        Configured ServiceContainer
    """
    container = get_container()
    configure_container(container)
    return container
