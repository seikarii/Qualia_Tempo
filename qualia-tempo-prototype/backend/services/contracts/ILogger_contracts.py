# QUALIA.CODE v1.1 - ILogger Contracts
from dataclasses import dataclass

@dataclass
class LoggerConfig:
    """Configuration contract for Logger."""
    log_level: str = "INFO"
    log_format: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    enable_file_logging: bool = True
    log_file_path: str = "backend.log"
    max_file_size_mb: int = 10
    backup_count: int = 5
