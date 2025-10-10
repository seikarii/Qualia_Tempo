# QUALIA.CODE v1.1 - Circuit Breaker Pattern Decorator
# Implements resilience pattern for external service calls

import functools
import logging
import time
from enum import Enum
from typing import Any, Callable, Optional, Type
from datetime import datetime, timedelta


class CircuitState(Enum):
    """Circuit breaker states following the standard pattern"""
    CLOSED = "closed"  # Normal operation
    OPEN = "open"  # Failing, reject requests immediately
    HALF_OPEN = "half_open"  # Testing if service recovered


class CircuitBreaker:
    """
    Circuit breaker implementation for external service resilience.
    
    The circuit breaker pattern prevents cascading failures by:
    1. CLOSED: Normal operation, counting failures
    2. OPEN: After threshold failures, reject immediately (fail fast)
    3. HALF_OPEN: After timeout, test if service recovered
    
    QUALIA.CODE Reference: §12.3 Circuit Breaker Pattern
    """
    
    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: float = 60.0,
        expected_exception: Type[Exception] = Exception
    ):
        """
        Initialize circuit breaker.
        
        Args:
            failure_threshold: Number of failures before opening circuit
            recovery_timeout: Seconds to wait before testing recovery
            expected_exception: Exception type to catch (default: Exception)
        """
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exception = expected_exception
        
        self.failure_count = 0
        self.state = CircuitState.CLOSED
        self.last_failure_time: Optional[datetime] = None
        self.logger = logging.getLogger(__name__)
    
    def call(self, func: Callable, *args: Any, **kwargs: Any) -> Any:
        """
        Execute function call through circuit breaker.
        
        Raises:
            CircuitBreakerOpenError: If circuit is open
            Original exception: If circuit is closed/half-open and call fails
        """
        if self.state == CircuitState.OPEN:
            if self._should_attempt_reset():
                self.logger.info(f"🔄 Circuit breaker HALF_OPEN for {func.__qualname__}")
                self.state = CircuitState.HALF_OPEN
            else:
                error_msg = f"⚡ Circuit breaker OPEN for {func.__qualname__} (failures: {self.failure_count})"
                self.logger.warning(error_msg)
                raise CircuitBreakerOpenError(error_msg)
        
        try:
            result = func(*args, **kwargs)
            self._on_success(func)
            return result
        except self.expected_exception as e:
            self._on_failure(func, e)
            raise
    
    def _should_attempt_reset(self) -> bool:
        """Check if enough time has passed to test recovery"""
        if self.last_failure_time is None:
            return False
        return datetime.now() - self.last_failure_time >= timedelta(seconds=self.recovery_timeout)
    
    def _on_success(self, func: Callable) -> None:
        """Handle successful call - reset circuit"""
        if self.state == CircuitState.HALF_OPEN:
            self.logger.info(f"✅ Circuit breaker CLOSED for {func.__qualname__} (service recovered)")
        
        self.failure_count = 0
        self.state = CircuitState.CLOSED
        self.last_failure_time = None
    
    def _on_failure(self, func: Callable, exception: Exception) -> None:
        """Handle failed call - increment counter, possibly open circuit"""
        self.failure_count += 1
        self.last_failure_time = datetime.now()
        
        if self.state == CircuitState.HALF_OPEN:
            self.logger.warning(f"⚠️ Circuit breaker reopening for {func.__qualname__} (recovery test failed)")
            self.state = CircuitState.OPEN
        elif self.failure_count >= self.failure_threshold:
            self.logger.error(
                f"🚨 Circuit breaker OPENING for {func.__qualname__} "
                f"(threshold reached: {self.failure_count}/{self.failure_threshold})"
            )
            self.state = CircuitState.OPEN
        else:
            self.logger.warning(
                f"⚠️ Circuit breaker failure {self.failure_count}/{self.failure_threshold} "
                f"for {func.__qualname__}: {str(exception)}"
            )


class CircuitBreakerOpenError(Exception):
    """Raised when circuit breaker is open and rejects call"""
    pass


# Global circuit breakers registry (one per function)
_circuit_breakers: dict[str, CircuitBreaker] = {}


def circuit_breaker(
    failure_threshold: int = 5,
    recovery_timeout: float = 60.0,
    expected_exception: type = Exception
) -> Callable[[Callable], Callable]:
    """
    Decorator to apply circuit breaker pattern to a function.
    
    Usage:
        @circuit_breaker(failure_threshold=3, recovery_timeout=30.0)
        async def call_external_api(self, endpoint: str) -> dict:
            # HTTP call that might fail
            pass
    
    Args:
        failure_threshold: Number of consecutive failures before opening circuit
        recovery_timeout: Seconds to wait before testing recovery
        expected_exception: Exception type to catch (default: Exception)
    
    Benefits:
        - Prevents cascading failures
        - Fail-fast behavior when service is down
        - Automatic recovery testing
        - Detailed logging of circuit state
    
    QUALIA.CODE Compliance:
        - Implements §12.3 Circuit Breaker Pattern
        - Required for external HTTP/WebSocket/Database calls
        - Enforced by QLA008 linter rule
    """
    
    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        # Create circuit breaker for this function
        func_id = f"{func.__module__}.{func.__qualname__}"
        if func_id not in _circuit_breakers:
            _circuit_breakers[func_id] = CircuitBreaker(
                failure_threshold=failure_threshold,
                recovery_timeout=recovery_timeout,
                expected_exception=expected_exception
            )
        
        breaker = _circuit_breakers[func_id]
        
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            return breaker.call(func, *args, **kwargs)
        
        return wrapper
    
    return decorator
