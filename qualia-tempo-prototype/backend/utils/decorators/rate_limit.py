# QUALIA.CODE v1.1 - Rate Limiting Pattern Decorator
# Implements token bucket algorithm for rate limiting

import functools
import logging
import time
import asyncio
from typing import Any, Callable, Dict, Optional
from datetime import datetime


class RateLimitExceededError(Exception):
    """Raised when rate limit is exceeded"""
    pass


class TokenBucket:
    """
    Token bucket implementation for rate limiting.
    
    The token bucket algorithm:
    1. Bucket has maximum capacity of tokens
    2. Tokens are added at a fixed rate
    3. Each operation consumes one token
    4. If no tokens available, operation is rejected or delayed
    """
    
    def __init__(self, rate: float, capacity: int):
        """
        Initialize token bucket.
        
        Args:
            rate: Tokens added per second
            capacity: Maximum tokens in bucket
        """
        self.rate = rate
        self.capacity = capacity
        self.tokens = float(capacity)
        self.last_update = time.time()
        self.logger = logging.getLogger(__name__)
    
    def consume(self, tokens: int = 1, block: bool = True) -> bool:
        """
        Attempt to consume tokens from bucket.
        
        Args:
            tokens: Number of tokens to consume
            block: If True, wait for tokens. If False, reject immediately.
        
        Returns:
            True if tokens consumed, False if rejected
        
        Raises:
            RateLimitExceededError: If block=False and tokens unavailable
        """
        # Refill bucket based on elapsed time
        now = time.time()
        elapsed = now - self.last_update
        self.tokens = min(self.capacity, self.tokens + elapsed * self.rate)
        self.last_update = now
        
        if self.tokens >= tokens:
            self.tokens -= tokens
            return True
        
        if block:
            # Calculate wait time needed
            deficit = tokens - self.tokens
            wait_time = deficit / self.rate
            
            self.logger.debug(
                f"⏳ Rate limit reached. Waiting {wait_time:.2f}s for tokens..."
            )
            time.sleep(wait_time)
            
            # After waiting, consume tokens
            self.tokens = 0  # Consumed waiting time worth of tokens
            return True
        else:
            return False
    
    async def consume_async(self, tokens: int = 1, block: bool = True) -> bool:
        """Async version of consume for async functions"""
        # Refill bucket based on elapsed time
        now = time.time()
        elapsed = now - self.last_update
        self.tokens = min(self.capacity, self.tokens + elapsed * self.rate)
        self.last_update = now
        
        if self.tokens >= tokens:
            self.tokens -= tokens
            return True
        
        if block:
            # Calculate wait time needed
            deficit = tokens - self.tokens
            wait_time = deficit / self.rate
            
            self.logger.debug(
                f"⏳ Rate limit reached. Waiting {wait_time:.2f}s for tokens..."
            )
            await asyncio.sleep(wait_time)
            
            # After waiting, consume tokens
            self.tokens = 0
            return True
        else:
            return False


# Global token buckets registry (one per function)
_token_buckets: Dict[str, TokenBucket] = {}


def rate_limit(
    calls_per_second: float,
    burst_size: Optional[int] = None,
    block: bool = True
) -> Callable[[Callable], Callable]:
    """
    Decorator to apply rate limiting to a function using token bucket algorithm.
    
    Usage:
        @rate_limit(calls_per_second=10, burst_size=20)
        async def api_call(self, endpoint: str) -> dict:
            # Limited to 10 calls/second with burst capacity of 20
            pass
        
        @rate_limit(calls_per_second=5, block=False)
        def send_email(self, recipient: str):
            # Limited to 5 calls/second, rejects excess calls immediately
            pass
    
    Args:
        calls_per_second: Maximum sustained rate (tokens per second)
        burst_size: Maximum burst capacity (default: calls_per_second * 2)
        block: If True, wait for tokens. If False, raise exception immediately.
    
    Raises:
        RateLimitExceededError: If block=False and rate limit exceeded
    
    Benefits:
        - Protects external APIs from overload
        - Prevents self-inflicted DDoS
        - Allows burst traffic within limits
        - Detailed rate limiting logs
    
    QUALIA.CODE Compliance:
        - Implements §9.4 Rate Limiting Pattern
        - Required for external API calls
        - Complements @retry and @circuit_breaker
    """
    
    if burst_size is None:
        burst_size = max(int(calls_per_second * 2), 1)
    
    logger = logging.getLogger(__name__)
    
    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        # Create token bucket for this function
        func_id = f"{func.__module__}.{func.__qualname__}"
        if func_id not in _token_buckets:
            _token_buckets[func_id] = TokenBucket(
                rate=calls_per_second,
                capacity=burst_size
            )
        
        bucket = _token_buckets[func_id]
        
        @functools.wraps(func)
        async def async_wrapper(*args: Any, **kwargs: Any) -> Any:
            func_name = f"{func.__module__}.{func.__qualname__}"
            
            # Try to consume token
            if not await bucket.consume_async(tokens=1, block=block):
                error_msg = (
                    f"🚫 Rate limit exceeded for {func_name} "
                    f"(limit: {calls_per_second} calls/second)"
                )
                logger.warning(error_msg)
                raise RateLimitExceededError(error_msg)
            
            return await func(*args, **kwargs)
        
        @functools.wraps(func)
        def sync_wrapper(*args: Any, **kwargs: Any) -> Any:
            func_name = f"{func.__module__}.{func.__qualname__}"
            
            # Try to consume token
            if not bucket.consume(tokens=1, block=block):
                error_msg = (
                    f"🚫 Rate limit exceeded for {func_name} "
                    f"(limit: {calls_per_second} calls/second)"
                )
                logger.warning(error_msg)
                raise RateLimitExceededError(error_msg)
            
            return func(*args, **kwargs)
        
        # Detect if function is async
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator
