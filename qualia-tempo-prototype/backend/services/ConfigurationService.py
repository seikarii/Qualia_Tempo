# QUALIA.CODE v1.1 - ConfigurationService Implementation
# Centralized configuration loading and management

import yaml
from pathlib import Path
from typing import Any, TypeVar, Type, Dict
from .interfaces.IConfigurationService import IConfigurationService
from .interfaces.ILogger import ILogger
from .interfaces.IFileSystemService import IFileSystemService
from .contracts.IConfigurationService_contracts import ConfigurationServiceConfig

T = TypeVar('T')


class ConfigurationService(IConfigurationService):
    """
    Centralized configuration management service.
    
    Responsibilities:
    - Load YAML configuration files from backend/config/
    - Parse YAML into typed dataclass instances
    - Provide type-safe configuration access
    - Cache configurations for performance
    - Support hot-reload in development
    
    QUALIA.CODE v1.1 Compliance:
    - Implements IConfigurationService interface
    - Uses ILogger for structured logging
    - Uses IFileSystemService for file operations (platform abstraction)
    - Configuration externalized via YAML files
    - No hardcoded configuration values
    """

    def __init__(
        self,
        config: ConfigurationServiceConfig,
        logger: ILogger,
        file_system_service: IFileSystemService
    ):
        """
        Initialize ConfigurationService.
        
        Args:
            config: Service configuration
            logger: Injected logger instance
            file_system_service: Injected file system service
        """
        self._config = config
        self._logger = logger
        self._file_system = file_system_service
        self._cache: Dict[str, Dict[str, Any]] = {}
        
        self._logger.info(
            "ConfigurationService initialized",
            {
                "config_directory": self._config.config_directory,
                "cache_enabled": self._config.cache_configs,
                "hot_reload_enabled": self._config.enable_hot_reload
            }
        )

    async def load_config(self, config_name: str) -> Dict[str, Any]:
        """
        Load configuration from YAML file.
        
        Args:
            config_name: Name of config file (without .yaml extension)
            
        Returns:
            Dictionary with configuration data
            
        Raises:
            FileNotFoundError: If config file doesn't exist
            yaml.YAMLError: If YAML parsing fails
        """
        # Check cache first
        if self._config.cache_configs and config_name in self._cache:
            self._logger.debug(f"Returning cached config: {config_name}")
            return self._cache[config_name]
        
        # Build file path
        config_file = f"{config_name}.yaml"
        config_path = Path(self._config.config_directory) / config_file
        
        self._logger.debug(f"Loading config from: {config_path}")
        
        # Read file content using FileSystemService
        try:
            file_content = self._file_system.read_file(str(config_path))
        except FileNotFoundError:
            self._logger.error(f"Config file not found: {config_path}")
            raise
        
        # Parse YAML
        try:
            config_data = yaml.safe_load(file_content)
        except yaml.YAMLError as e:
            self._logger.error(
                f"Failed to parse YAML config: {config_name}",
                {"error": str(e)}
            )
            raise
        
        # Validate if enabled
        if self._config.validate_on_load:
            self._validate_config(config_name, config_data)
        
        # Cache if enabled
        if self._config.cache_configs:
            self._cache[config_name] = config_data
            self._logger.debug(f"Cached config: {config_name}")
        
        self._logger.info(
            f"Successfully loaded config: {config_name}",
            {"keys": list(config_data.keys()) if isinstance(config_data, dict) else None}
        )
        
        return config_data

    def get(self, key: str, config_type: Type[T]) -> T:
        """
        Get typed configuration value.
        
        Args:
            key: Configuration key in format "config_name.section.key"
            config_type: Type to cast the value to
            
        Returns:
            Configuration value cast to specified type
            
        Raises:
            KeyError: If configuration key doesn't exist
            TypeError: If type casting fails
        """
        parts = key.split(".")
        if len(parts) < 2:
            raise KeyError(f"Invalid config key format: {key}. Expected 'config_name.key'")
        
        config_name = parts[0]
        value = self.get_raw(key)
        
        try:
            return config_type(value)
        except (TypeError, ValueError) as e:
            self._logger.error(
                f"Failed to cast config value to {config_type.__name__}",
                {"key": key, "value": value, "error": str(e)}
            )
            raise TypeError(f"Cannot cast {key} to {config_type.__name__}: {e}")

    def get_raw(self, key: str, default: Any = None) -> Any:
        """
        Get raw configuration value.
        
        Args:
            key: Configuration key in format "config_name.section.key"
            default: Default value if key doesn't exist
            
        Returns:
            Configuration value or default
        """
        parts = key.split(".")
        if len(parts) < 2:
            self._logger.warning(f"Invalid config key format: {key}")
            return default
        
        config_name = parts[0]
        
        # Load config if not cached
        if config_name not in self._cache:
            try:
                import asyncio
                loop = asyncio.get_event_loop()
                loop.run_until_complete(self.load_config(config_name))
            except Exception as e:
                self._logger.error(f"Failed to load config: {config_name}", {"error": str(e)})
                return default
        
        # Navigate nested keys
        value = self._cache[config_name]
        for part in parts[1:]:
            if isinstance(value, dict) and part in value:
                value = value[part]
            else:
                self._logger.debug(f"Config key not found: {key}, returning default")
                return default
        
        return value

    def reload(self) -> None:
        """
        Reload all configurations from disk.
        
        This method clears the cache and forces fresh load on next access.
        Useful for hot-reload in development.
        """
        self._logger.info("Reloading all configurations")
        self._cache.clear()
        self._logger.debug("Configuration cache cleared")

    def _validate_config(self, config_name: str, config_data: Any) -> None:
        """
        Validate configuration data.
        
        Args:
            config_name: Name of configuration
            config_data: Configuration data to validate
            
        Raises:
            ValueError: If validation fails
        """
        if not isinstance(config_data, dict):
            raise ValueError(f"Config {config_name} must be a dictionary, got {type(config_data)}")
        
        if not config_data:
            self._logger.warning(f"Config {config_name} is empty")
        
        self._logger.debug(f"Config validation passed: {config_name}")
