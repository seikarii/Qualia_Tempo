"""
QUALIA.CODE v1.1 - Application Initializer Service Contracts
Configuration and data structures for ApplicationInitializerService.
"""

from dataclasses import dataclass
from typing import List


@dataclass
class ApplicationInitializerServiceConfig:
    """
    Configuration for ApplicationInitializerService.
    
    Fields:
        enable_lifecycle_logging: Enable detailed lifecycle logging
        initialization_timeout_seconds: Maximum time for service initialization
        shutdown_timeout_seconds: Maximum time for service cleanup
        fail_fast: Stop initialization on first service failure
    """
    enable_lifecycle_logging: bool = True
    initialization_timeout_seconds: int = 30
    shutdown_timeout_seconds: int = 10
    fail_fast: bool = True
