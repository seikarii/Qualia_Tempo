# QUALIA.CODE v1.1 - Caching Decorator
# Phase 3.5: Decorator Modularization

import functools
import logging
import time
from typing import Any, Callable, Dict, Optional


def cache_result(ttl_seconds: Optional[int] = None) -> Callable[[Callable], Callable]:
    """
    Decorator to cache function results with optional TTL.

    Args:
        ttl_seconds: Time to live for cached results. None means cache forever.
    
    Usage:
        @cache_result(ttl_seconds=300)
        def get_expensive_data(self, key: str) -> Dict[str, Any]:
            # Expensive operation
            pass
    
    Benefits:
        - Automatic result caching
        - TTL-based cache invalidation
        - Performance optimization
        - Reduced redundant computations
    
    Example:
        # Cache forever (until process restart)
        @cache_result(ttl_seconds=None)
        def get_static_config(self) -> Dict[str, Any]:
            return self._load_config()
        
        # Cache for 5 minutes
        @cache_result(ttl_seconds=300)
        def get_boss_patterns(self, phase: str) -> List[Pattern]:
            return self._load_patterns(phase)
    """
    cache: Dict[str, Dict[str, Any]] = {}

    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            # Create cache key from function name and arguments
            cache_key = f"{func.__module__}.{func.__qualname__}:{hash(str(args) + str(sorted(kwargs.items())))}"

            current_time = time.time()

            # Check if we have a cached result
            if cache_key in cache:
                cached_data = cache[cache_key]

                # Check TTL if specified
                if (
                    ttl_seconds is None
                    or (current_time - cached_data["timestamp"]) < ttl_seconds
                ):
                    logger = logging.getLogger(func.__module__)
                    logger.debug(f"💾 Cache HIT for {func.__qualname__}")
                    return cached_data["result"]
                else:
                    # TTL expired, remove from cache
                    del cache[cache_key]

            # Execute function and cache result
            result = func(*args, **kwargs)
            cache[cache_key] = {"result": result, "timestamp": current_time}

            logger = logging.getLogger(func.__module__)
            logger.debug(f"🔄 Cache MISS for {func.__qualname__}")

            return result

        return wrapper

    return decorator
