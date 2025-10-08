# QUALIA.CODE v1.1 - Container Configuration
# Service registration and container setup

from typing import Dict, Any
from .container import ServiceContainer, get_container
from .interfaces.ILogger import ILogger
from .interfaces.IEventBus import IEventBus
from .interfaces.IQualiaProcessor import IQualiaProcessor
from .interfaces.IFileSystemService import IFileSystemService
from .interfaces.ISystemEnvironmentService import ISystemEnvironmentService
from .interfaces.ISecurityService import ISecurityService
from .interfaces.IShaderIntrospectionService import IShaderIntrospectionService

# Import implementations
from .QualiaLogger import QualiaLogger
from .EventBus import EventBus
from .QualiaProcessor import QualiaProcessor
from .FileSystemService import FileSystemService
from .SystemEnvironmentService import SystemEnvironmentService
from .SecurityService import SecurityService
from .ShaderIntrospectionService import ShaderIntrospectionService

# Import contracts
from .contracts.ILogger_contracts import LoggerConfig
from .contracts.IEventBus_contracts import EventBusConfig
from .contracts.IQualiaProcessor_contracts import QualiaProcessorConfig
from .contracts.IFileSystemService_contracts import FileSystemConfig
from .contracts.ISystemEnvironmentService_contracts import SystemEnvironmentConfig
from .contracts.ISecurityService_contracts import SecurityConfig
from .contracts.IShaderIntrospectionService_contracts import ShaderIntrospectionConfig


def configure_container(container: ServiceContainer) -> None:
    """
    Configure the service container with all service registrations.
    
    This function:
    1. Registers all configuration objects
    2. Registers all service interfaces and implementations
    3. Sets up the dependency graph
    
    Args:
        container: Service container to configure
    """
    # Step 1: Register all configuration objects with default values
    # (In production, these should be loaded from YAML files)
    
    container.register_config(LoggerConfig, LoggerConfig(
        log_level="INFO",
        enable_file_logging=True,
        log_file_path="backend.log"
    ))
    
    container.register_config(EventBusConfig, EventBusConfig(
        max_handlers_per_event=100,
        enable_statistics=True,
        log_all_events=False
    ))
    
    container.register_config(QualiaProcessorConfig, QualiaProcessorConfig(
        processing_enabled=True,
        intensity_spike_threshold=0.3,
        transcendence_threshold=0.8,
        chaos_threshold=0.7
    ))
    
    container.register_config(FileSystemConfig, FileSystemConfig(
        base_path="/media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/backend",
        enable_caching=True
    ))
    
    container.register_config(SystemEnvironmentConfig, SystemEnvironmentConfig(
        environment="development",
        enable_debug_logging=True
    ))
    
    container.register_config(SecurityConfig, SecurityConfig(
        auth_enabled=True,
        token_expiration_minutes=60
    ))
    
    container.register_config(ShaderIntrospectionConfig, ShaderIntrospectionConfig(
        shader_directory="public/shaders",
        enable_caching=True
    ))
    
    # Step 2: Register all services as singletons
    # Dependencies will be automatically resolved by the container
    
    # Register services as singletons with their Protocol interfaces
    # The container will use the interface type as the key but the concrete class for instantiation
    container.register_singleton(ILogger, QualiaLogger)  # type: ignore[type-abstract]
    container.register_singleton(IEventBus, EventBus)  # type: ignore[type-abstract]
    container.register_singleton(IQualiaProcessor, QualiaProcessor)  # type: ignore[type-abstract]
    container.register_singleton(IFileSystemService, FileSystemService)  # type: ignore[type-abstract]
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
