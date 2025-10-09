# QUALIA.CODE v1.1 - Time Measurement Decorator
# Phase 3.5: Decorator Modularization

import functools
import logging
import time
from typing import Any, Callable


def time_execution() -> Callable[[Callable], Callable]:
    """
    Decorator to measure and log execution time with performance categorization.
    
    Usage:
        @time_execution()
        def expensive_operation(self) -> Result:
            # Method implementation
            pass
    
    Benefits:
        - Automatic execution time measurement
        - Performance categorization (FAST/GOOD/OK/SLOW/VERY SLOW)
        - Adaptive log levels (DEBUG for fast, ERROR for very slow)
        - Performance monitoring
    
    Performance Categories:
        - 🚀 FAST: < 1ms (DEBUG)
        - ⚡ GOOD: < 10ms (DEBUG)
        - ⏱️  OK: < 100ms (INFO)
        - 🐌 SLOW: < 1s (WARNING)
        - 🚨 VERY SLOW: >= 1s (ERROR)
    """

    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            logger = logging.getLogger(func.__module__)
            func_name = f"{func.__module__}.{func.__qualname__}"

            start_time = time.time()
            result = func(*args, **kwargs)
            execution_time = time.time() - start_time

            # Performance categorization
            if execution_time < 0.001:
                perf_category = "🚀 FAST"
                log_level = logging.DEBUG
            elif execution_time < 0.01:
                perf_category = "⚡ GOOD"
                log_level = logging.DEBUG
            elif execution_time < 0.1:
                perf_category = "⏱️  OK"
                log_level = logging.INFO
            elif execution_time < 1.0:
                perf_category = "🐌 SLOW"
                log_level = logging.WARNING
            else:
                perf_category = "🚨 VERY SLOW"
                log_level = logging.ERROR

            logger.log(log_level, f"{perf_category} {func_name}: {execution_time:.4f}s")

            return result

        return wrapper

    return decorator
