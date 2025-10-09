# QUALIA.CODE v1.1 - Decorator Module Exports
# Phase 3.5: Decorator Modularization
"""
Backend Decorators Package

This package provides QUALIA.CODE-compliant decorators for cross-cutting concerns:
- Logging: @log_execution
- Error Handling: @handle_errors
- Validation: @validate_schema
- Performance: @time_execution
- Caching: @cache_result
- Event Handling: @OnEvent

All decorators follow QUALIA.CODE v1.1 architectural principles.
"""

# Import all decorators
from .log_method import log_execution
from .catch_error import handle_errors
from .validate import validate_schema
from .time_measure import time_execution
from .cache import cache_result
from .on_event import OnEvent

# Export all decorators
__all__ = [
    "log_execution",
    "handle_errors",
    "validate_schema",
    "time_execution",
    "cache_result",
    "OnEvent",
]

# Version
__version__ = "1.1.0"

# Phase information
__phase__ = "3.5"
__description__ = "Modularized decorator architecture for QUALIA.CODE compliance"
