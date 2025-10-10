# QUALIA.CODE v1.1 - Retry Pattern Decorator
# Implements automatic retry logic with exponential backoff

import functools
import logging
import time
import asyncio
from typing import Any, Callable, Optional, Type, Tuple
from datetime import datetime


class RetryExhaustedError(Exception):
    """Raised when all retry attempts have been exhausted"""
    pass


def retry(
    max_attempts: int = 3,
    backoff_factor: float = 2.0,
    initial_delay: float = 1.0,
    max_delay: float = 60.0,
    exceptions: Tuple[Type[Exception], ...] = (Exception,),
    on_retry: Optional[Callable[[int, Exception], None]] = None
) -> Callable[[Callable], Callable]:
    """
    Decorator to automatically retry failed operations with exponential backoff.
    
    Usage:
        @retry(max_attempts=5, backoff_factor=2.0, initial_delay=1.0)
        async def call_external_api(self, endpoint: str) -> dict:
            response = await self.http_service.get(endpoint)
            return response
    
        @retry(max_attempts=3, exceptions=(ConnectionError, TimeoutError))
        def connect_to_database(self):
            return db.connect()
    
    Args:
        max_attempts: Maximum number of attempts (including first try)
        backoff_factor: Multiplier for exponential backoff (delay *= backoff_factor)
        initial_delay: Initial delay in seconds before first retry
        max_delay: Maximum delay cap in seconds
        exceptions: Tuple of exception types to catch and retry
        on_retry: Optional callback function called on each retry: (attempt_num, exception) -> None
    
    Behavior:
        - Attempt 1: No delay (first try)
        - Attempt 2: initial_delay seconds
        - Attempt 3: initial_delay * backoff_factor seconds
        - Attempt N: min(initial_delay * backoff_factor^(N-2), max_delay)
    
    Raises:
        RetryExhaustedError: If all attempts fail
        Original exception: If exception type not in exceptions tuple
    
    Benefits:
        - Automatic resilience for transient failures
        - Exponential backoff prevents overwhelming failing services
        - Configurable retry strategy per operation
        - Detailed logging of retry attempts
    
    QUALIA.CODE Compliance:
        - Implements §9.2 Retry Pattern
        - Required for I/O operations (HTTP, WebSocket, Database)
        - Enforced by QLA009 linter rule
    """
    
    logger = logging.getLogger(__name__)
    
    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        
        @functools.wraps(func)
        async def async_wrapper(*args: Any, **kwargs: Any) -> Any:
            last_exception: Optional[Exception] = None
            func_name = f"{func.__module__}.{func.__qualname__}"
            
            for attempt in range(1, max_attempts + 1):
                try:
                    logger.debug(f"🔄 Attempt {attempt}/{max_attempts} for {func_name}")
                    result = await func(*args, **kwargs)
                    
                    if attempt > 1:
                        logger.info(
                            f"✅ {func_name} succeeded on attempt {attempt}/{max_attempts}"
                        )
                    
                    return result
                    
                except exceptions as e:
                    last_exception = e
                    
                    if attempt < max_attempts:
                        # Calculate delay with exponential backoff
                        delay = min(
                            initial_delay * (backoff_factor ** (attempt - 1)),
                            max_delay
                        )
                        
                        logger.warning(
                            f"⚠️ {func_name} failed on attempt {attempt}/{max_attempts}: "
                            f"{type(e).__name__}: {str(e)}. Retrying in {delay:.2f}s..."
                        )
                        
                        # Call custom retry callback if provided
                        if on_retry:
                            try:
                                on_retry(attempt, e)
                            except Exception as callback_error:
                                logger.error(
                                    f"🚨 Retry callback failed: {callback_error}"
                                )
                        
                        await asyncio.sleep(delay)
                    else:
                        logger.error(
                            f"🚨 {func_name} exhausted all {max_attempts} attempts. "
                            f"Final error: {type(e).__name__}: {str(e)}"
                        )
            
            # All attempts exhausted
            raise RetryExhaustedError(
                f"Failed after {max_attempts} attempts. Last error: {last_exception}"
            ) from last_exception
        
        @functools.wraps(func)
        def sync_wrapper(*args: Any, **kwargs: Any) -> Any:
            last_exception: Optional[Exception] = None
            func_name = f"{func.__module__}.{func.__qualname__}"
            
            for attempt in range(1, max_attempts + 1):
                try:
                    logger.debug(f"🔄 Attempt {attempt}/{max_attempts} for {func_name}")
                    result = func(*args, **kwargs)
                    
                    if attempt > 1:
                        logger.info(
                            f"✅ {func_name} succeeded on attempt {attempt}/{max_attempts}"
                        )
                    
                    return result
                    
                except exceptions as e:
                    last_exception = e
                    
                    if attempt < max_attempts:
                        # Calculate delay with exponential backoff
                        delay = min(
                            initial_delay * (backoff_factor ** (attempt - 1)),
                            max_delay
                        )
                        
                        logger.warning(
                            f"⚠️ {func_name} failed on attempt {attempt}/{max_attempts}: "
                            f"{type(e).__name__}: {str(e)}. Retrying in {delay:.2f}s..."
                        )
                        
                        # Call custom retry callback if provided
                        if on_retry:
                            try:
                                on_retry(attempt, e)
                            except Exception as callback_error:
                                logger.error(
                                    f"🚨 Retry callback failed: {callback_error}"
                                )
                        
                        time.sleep(delay)
                    else:
                        logger.error(
                            f"🚨 {func_name} exhausted all {max_attempts} attempts. "
                            f"Final error: {type(e).__name__}: {str(e)}"
                        )
            
            # All attempts exhausted
            raise RetryExhaustedError(
                f"Failed after {max_attempts} attempts. Last error: {last_exception}"
            ) from last_exception
        
        # Detect if function is async
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator
