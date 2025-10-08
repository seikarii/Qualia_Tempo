# QUALIA.CODE v1.1 - IConfigurationService Contracts
from dataclasses import dataclass

@dataclass
class ConfigurationServiceConfig:
    """Configuration contract for ConfigurationService."""
    config_directory: str = "config"
    enable_hot_reload: bool = False
    cache_configs: bool = True
    validate_on_load: bool = True
