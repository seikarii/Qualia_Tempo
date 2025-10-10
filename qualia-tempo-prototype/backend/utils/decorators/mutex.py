# QUALIA.CODE v1.1 - Mutex Pattern Decorator
# Implements mutex lock for critical sections

import functools
import logging
import asyncio
import threading
from typing import Any, Callable, Dict, Optional


class MutexTimeoutError(Exception):
    """Raised when mutex acquisition times out"""
    pass


# Global locks registry (one per function)
_async_locks: Dict[str, asyncio.Lock] = {}
_thread_locks: Dict[str, threading.Lock] = {}


def mutex(timeout: Optional[float] = None) -> Callable[[Callable], Callable]:
    """
    Decorator to ensure exclusive execution of a function (critical section).
    
    Prevents concurrent execution by acquiring a lock before function execution.
    Supports both async and synchronous functions.
    
    Usage:
        @mutex(timeout=5.0)
        async def update_game_state(self, new_state: GameState):
            # Only one coroutine can execute this at a time
            self.game_state = new_state
            await self.notify_subscribers()
        
        @mutex()
        def write_to_shared_resource(self, data: dict):
            # Only one thread can execute this at a time
            self.shared_resource.update(data)
    
    Args:
        timeout: Maximum time to wait for lock acquisition (None = wait forever)
    
    Raises:
        MutexTimeoutError: If lock acquisition exceeds timeout
    
    Benefits:
        - Prevents race conditions
        - Ensures data consistency
        - Thread-safe and async-safe
        - Per-function isolation
    
    QUALIA.CODE Compliance:
        - Implements §9.5 Mutex Pattern
        - Required for state mutations in GameStateStoreService
        - Enforced by QLA011 linter rule (to be implemented)
    """
    
    logger = logging.getLogger(__name__)
    
    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        func_id = f"{func.__module__}.{func.__qualname__}"
        
        @functools.wraps(func)
        async def async_wrapper(*args: Any, **kwargs: Any) -> Any:
            # Get or create lock for this function
            if func_id not in _async_locks:
                _async_locks[func_id] = asyncio.Lock()
            
            lock = _async_locks[func_id]
            func_name = f"{func.__module__}.{func.__qualname__}"
            
            acquired = False
            try:
                if timeout is None:
                    logger.debug(f"🔒 Acquiring mutex for {func_name}...")
                    await lock.acquire()
                    acquired = True
                else:
                    logger.debug(
                        f"🔒 Acquiring mutex for {func_name} (timeout: {timeout}s)..."
                    )
                    try:
                        await asyncio.wait_for(lock.acquire(), timeout=timeout)
                        acquired = True
                    except asyncio.TimeoutError:
                        error_msg = (
                            f"🚨 Mutex acquisition timeout for {func_name} "
                            f"(waited {timeout}s)"
                        )
                        logger.error(error_msg)
                        raise MutexTimeoutError(error_msg) from None
                
                logger.debug(f"✅ Mutex acquired for {func_name}")
                result = await func(*args, **kwargs)
                return result
                
            finally:
                if acquired:
                    lock.release()
                    logger.debug(f"🔓 Mutex released for {func_name}")
        
        @functools.wraps(func)
        def sync_wrapper(*args: Any, **kwargs: Any) -> Any:
            # Get or create lock for this function
            if func_id not in _thread_locks:
                _thread_locks[func_id] = threading.Lock()
            
            lock = _thread_locks[func_id]
            func_name = f"{func.__module__}.{func.__qualname__}"
            
            acquired = False
            try:
                if timeout is None:
                    logger.debug(f"🔒 Acquiring mutex for {func_name}...")
                    lock.acquire()
                    acquired = True
                else:
                    logger.debug(
                        f"🔒 Acquiring mutex for {func_name} (timeout: {timeout}s)..."
                    )
                    acquired = lock.acquire(timeout=timeout)
                    if not acquired:
                        error_msg = (
                            f"🚨 Mutex acquisition timeout for {func_name} "
                            f"(waited {timeout}s)"
                        )
                        logger.error(error_msg)
                        raise MutexTimeoutError(error_msg)
                
                logger.debug(f"✅ Mutex acquired for {func_name}")
                result = func(*args, **kwargs)
                return result
                
            finally:
                if acquired:
                    lock.release()
                    logger.debug(f"🔓 Mutex released for {func_name}")
        
        # Detect if function is async
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator
