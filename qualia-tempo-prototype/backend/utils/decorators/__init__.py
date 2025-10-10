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
- Resilience: @circuit_breaker, @retry, @timeout
- Concurrency: @mutex, @rate_limit
- Security: @authorize
- Database: @transaction
- Deprecation: @deprecated

All decorators follow QUALIA.CODE v1.1 architectural principles.
"""

# Import all decorators
from .log_method import log_execution
from .catch_error import handle_errors
from .validate import validate_schema
from .time_measure import time_execution
from .cache import cache_result
from .on_event import OnEvent
from .circuit_breaker import circuit_breaker, CircuitBreakerOpenError
from .retry import retry, RetryExhaustedError
from .timeout import timeout, TimeoutError
from .rate_limit import rate_limit, RateLimitExceededError
from .mutex import mutex, MutexTimeoutError
from .deprecated import deprecated
from .authorize import authorize, AuthorizationError, UnauthorizedError
from .transaction import transaction, TransactionError

# Export all decorators
__all__ = [
    "log_execution",
    "handle_errors",
    "validate_schema",
    "time_execution",
    "cache_result",
    "OnEvent",
    "circuit_breaker",
    "CircuitBreakerOpenError",
    "retry",
    "RetryExhaustedError",
    "timeout",
    "TimeoutError",
    "rate_limit",
    "RateLimitExceededError",
    "mutex",
    "MutexTimeoutError",
    "deprecated",
    "authorize",
    "AuthorizationError",
    "UnauthorizedError",
    "transaction",
    "TransactionError",
]

# Version
__version__ = "1.1.0"

# Phase information
__phase__ = "3.5"
__description__ = "Modularized decorator architecture for QUALIA.CODE compliance"
