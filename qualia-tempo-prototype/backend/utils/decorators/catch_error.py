# QUALIA.CODE v1.1 - Error Handling Decorator
# Phase 3.5: Decorator Modularization

import functools
import logging
import traceback
from typing import Any, Callable


def handle_errors(fallback_return_value: Any = None) -> Callable[[Callable], Callable]:
    """
    Decorator to wrap function in try/except block and log errors.

    Args:
        fallback_return_value: Value to return if an error occurs
    
    Usage:
        @handle_errors(fallback_return_value=None)
        def my_method(self, data: Dict[str, Any]) -> Optional[Result]:
            # Method implementation that might fail
            pass
    
    Benefits:
        - Automatic error logging with full traceback
        - Graceful degradation with fallback values
        - Prevents unhandled exceptions in critical code
        - Detailed error context (args, kwargs)
    """

    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            logger = logging.getLogger(func.__module__)
            func_name = f"{func.__module__}.{func.__qualname__}"

            try:
                return func(*args, **kwargs)
            except Exception as e:
                logger.error(f"🚨 ERROR in {func_name}: {str(e)}")
                logger.error(f"📍 Traceback: {traceback.format_exc()}")
                logger.error(f"📋 Args: {args}")
                logger.error(f"📋 Kwargs: {kwargs}")

                if fallback_return_value is not None:
                    logger.warning(
                        f"🔄 Returning fallback value: {fallback_return_value}"
                    )
                    return fallback_return_value
                else:
                    logger.error("💥 Re-raising exception")
                    raise

        return wrapper

    return decorator
