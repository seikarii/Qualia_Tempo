"""
ITimerService Interface
QUALIA.CODE v1.1 Compliance - Phase 6.2

Platform abstraction for async timers and time control.
Provides testable, deterministic time operations.
"""

from typing import Protocol, Optional, Dict, Any, List, Callable, Awaitable


class ITimerService(Protocol):
    """
    Timer service interface for platform-abstracted time operations.
    
    Provides async sleep, scheduled callbacks, and interval timers.
    Enables deterministic testing through time control abstraction.
    """
    
    async def sleep(self, seconds: float) -> None:
        """
        Async sleep for specified duration.
        
        Platform abstraction over asyncio.sleep().
        
        Args:
            seconds: Duration to sleep in seconds
        """
        ...
    
    def schedule_callback(
        self,
        callback: Callable[[], Awaitable[None]],
        delay_seconds: float,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Schedule async callback to execute after delay.
        
        Equivalent to setTimeout in JavaScript.
        
        Args:
            callback: Async function to execute
            delay_seconds: Delay before execution in seconds
            metadata: Optional metadata for tracking
            
        Returns:
            timer_id: Unique identifier for this timer
        """
        ...
    
    def schedule_interval(
        self,
        callback: Callable[[], Awaitable[None]],
        interval_seconds: float,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Schedule async callback to execute repeatedly at interval.
        
        Equivalent to setInterval in JavaScript.
        
        Args:
            callback: Async function to execute repeatedly
            interval_seconds: Interval between executions in seconds
            metadata: Optional metadata for tracking
            
        Returns:
            timer_id: Unique identifier for this timer
        """
        ...
    
    def cancel_timer(self, timer_id: str) -> bool:
        """
        Cancel scheduled timer.
        
        Args:
            timer_id: Unique identifier of timer to cancel
            
        Returns:
            True if timer was cancelled, False if not found
        """
        ...
    
    def get_active_timers(self) -> List[Dict[str, Any]]:
        """
        Get list of all active timers.
        
        Returns:
            List of timer info dictionaries with id, type, delay, metadata
        """
        ...
    
    def cancel_all_timers(self) -> int:
        """
        Cancel all active timers.
        
        Useful for cleanup on service shutdown.
        
        Returns:
            Number of timers cancelled
        """
        ...
    
    async def wait_for_completion(self, timer_id: str, timeout_seconds: Optional[float] = None) -> bool:
        """
        Wait for specific timer to complete.
        
        Args:
            timer_id: Timer to wait for
            timeout_seconds: Maximum time to wait (None = wait forever)
            
        Returns:
            True if timer completed, False if timeout or cancelled
        """
        ...
