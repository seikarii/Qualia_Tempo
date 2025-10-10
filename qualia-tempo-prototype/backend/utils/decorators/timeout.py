# QUALIA.CODE v1.1 - Timeout Pattern Decorator
# Implements automatic timeout for async operations

import functools
import logging
import asyncio
from typing import Any, Callable


class TimeoutError(Exception):
    """Raised when operation exceeds timeout limit"""
    pass


def timeout(seconds: float) -> Callable[[Callable], Callable]:
    """
    Decorator to enforce timeout on async operations.
    
    Usage:
        @timeout(5.0)
        async def fetch_data(self, url: str) -> dict:
            response = await self.http_client.get(url)
            return response.json()
        
        @timeout(30.0)
        async def process_heavy_computation(self, data: list) -> Any:
            # Long-running async operation
            result = await compute(data)
            return result
    
    Args:
        seconds: Timeout duration in seconds
    
    Raises:
        TimeoutError: If operation exceeds timeout
        TypeError: If applied to non-async function
    
    Benefits:
        - Prevents hanging operations
        - Guarantees response time SLA
        - Resource leak prevention
        - Detailed timeout logging
    
    QUALIA.CODE Compliance:
        - Implements §9.3 Timeout Pattern
        - Required for all async I/O operations
        - Enforced by QLA007 linter rule (to be implemented)
    """
    
    logger = logging.getLogger(__name__)
    
    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        if not asyncio.iscoroutinefunction(func):
            raise TypeError(
                f"@timeout can only be applied to async functions. "
                f"{func.__qualname__} is not async."
            )
        
        @functools.wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            func_name = f"{func.__module__}.{func.__qualname__}"
            
            try:
                logger.debug(f"⏱️ Starting {func_name} with {seconds}s timeout")
                result = await asyncio.wait_for(func(*args, **kwargs), timeout=seconds)
                logger.debug(f"✅ {func_name} completed within timeout")
                return result
                
            except asyncio.TimeoutError:
                error_msg = (
                    f"🚨 {func_name} exceeded timeout of {seconds}s"
                )
                logger.error(error_msg)
                raise TimeoutError(error_msg) from None
            except Exception as e:
                logger.error(
                    f"🚨 {func_name} failed with exception: "
                    f"{type(e).__name__}: {str(e)}"
                )
                raise
        
        return wrapper
    
    return decorator
