# QUALIA.CODE v1.1 - ISystemEnvironmentService Contracts
from dataclasses import dataclass

@dataclass
class SystemEnvironmentConfig:
    """Configuration contract for SystemEnvironmentService."""
    environment: str = "development"
    enable_debug_logging: bool = True
    enable_performance_monitoring: bool = True
