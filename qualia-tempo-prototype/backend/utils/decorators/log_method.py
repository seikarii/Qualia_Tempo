# QUALIA.CODE v1.1 - Log Method Decorator
# Phase 3.5: Decorator Modularization

import functools
import logging
import time
from typing import Any, Callable


def log_execution(level: str = "INFO") -> Callable[[Callable], Callable]:
    """
    Decorator to log function entry, exit, and execution time.

    Args:
        level: Logging level (DEBUG, INFO, WARNING, ERROR)
    
    Usage:
        @log_execution(level="INFO")
        def my_method(self, data: Dict[str, Any]) -> None:
            # Method implementation
            pass
    
    Benefits:
        - Automatic entry/exit logging
        - Execution time measurement
        - Performance monitoring
        - Debugging support
    """

    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            logger = logging.getLogger(func.__module__)
            log_level = getattr(logging, level.upper())

            start_time = time.time()
            func_name = f"{func.__module__}.{func.__qualname__}"

            logger.log(log_level, f"→ ENTER {func_name}")

            try:
                result = func(*args, **kwargs)
                execution_time = time.time() - start_time
                logger.log(log_level, f"← EXIT {func_name} (⏱️ {execution_time:.3f}s)")
                return result
            except Exception as e:
                execution_time = time.time() - start_time
                logger.error(f"✗ ERROR {func_name} (⏱️ {execution_time:.3f}s): {str(e)}")
                raise

        return wrapper

    return decorator
