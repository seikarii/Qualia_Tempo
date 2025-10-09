"""
TimerService Implementation
QUALIA.CODE v1.1 Compliance - Phase 6.2

Platform abstraction for async timers and time control.
Provides testable, deterministic time operations.
"""

import asyncio
import uuid
import time
from datetime import datetime
from typing import Dict, Any, Optional, List, Callable, Awaitable

from .interfaces.ITimerService import ITimerService
from .interfaces.ILogger import ILogger
from .contracts.ITimerService_contracts import TimerServiceConfig
from ..utils.decorators import log_execution


class TimerService(ITimerService):
    """
    Timer service implementation providing platform-abstracted time operations.
    
    Features:
    - Async sleep abstraction
    - Scheduled callbacks (setTimeout equivalent)
    - Interval timers (setInterval equivalent)
    - Timer cancellation and management
    - Testable time control
    """
    
    def __init__(self, config: TimerServiceConfig, logger: ILogger):
        """
        Initialize TimerService.
        
        Args:
            config: Service configuration
            logger: Injected logger instance
        """
        self._config = config
        self._logger = logger
        
        # Active timers storage
        self._timers: Dict[str, Dict[str, Any]] = {}
        
        # Completion events for wait_for_completion
        self._completion_events: Dict[str, asyncio.Event] = {}
        
        # Cleanup task
        self._cleanup_task: Optional[asyncio.Task] = None
        
        self._logger.info(
            "TimerService initialized",
            extra={
                "max_concurrent_timers": config.max_concurrent_timers,
                "enable_interval_timers": config.enable_interval_timers
            }
        )
        
        # Start cleanup task if auto cleanup enabled
        if self._config.auto_cleanup_completed:
            self._start_cleanup_task()
    
    async def sleep(self, seconds: float) -> None:
        """Async sleep for specified duration."""
        if seconds < 0:
            self._logger.warning(f"Negative sleep duration: {seconds}, using 0")
            seconds = 0
        
        await asyncio.sleep(seconds)
    
    @log_execution(level="INFO")
    @log_execution(level="INFO")
    def schedule_callback(
        self,
        callback: Callable[[], Awaitable[None]],
        delay_seconds: float,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """Schedule async callback to execute after delay."""
        # Validate delay
        if delay_seconds < 0:
            raise ValueError(f"Delay must be >= 0, got {delay_seconds}")
        
        if delay_seconds > self._config.max_delay_seconds:
            self._logger.warning(
                f"Delay {delay_seconds}s exceeds max {self._config.max_delay_seconds}s, clamping"
            )
            delay_seconds = self._config.max_delay_seconds
        
        # Check concurrent limit
        if len(self._timers) >= self._config.max_concurrent_timers:
            raise RuntimeError(
                f"Max concurrent timers ({self._config.max_concurrent_timers}) reached"
            )
        
        # Generate timer ID
        timer_id = str(uuid.uuid4())
        
        # Create timer task
        task = asyncio.create_task(
            self._execute_delayed_callback(timer_id, callback, delay_seconds)
        )
        
        # Store timer info
        self._timers[timer_id] = {
            "id": timer_id,
            "type": "callback",
            "callback": callback,
            "delay_seconds": delay_seconds,
            "interval_seconds": None,
            "task": task,
            "metadata": metadata or {},
            "created_at": datetime.utcnow(),
            "status": "scheduled"
        }
        
        # Create completion event if feature enabled
        if self._config.enable_wait_for_completion:
            self._completion_events[timer_id] = asyncio.Event()
        
        self._logger.debug(f"Scheduled callback timer {timer_id} with delay {delay_seconds}s")
        
        return timer_id
    
    @log_execution(level="INFO")
    @log_execution(level="INFO")
    def schedule_interval(
        self,
        callback: Callable[[], Awaitable[None]],
        interval_seconds: float,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """Schedule async callback to execute repeatedly at interval."""
        if not self._config.enable_interval_timers:
            raise RuntimeError("Interval timers are disabled in configuration")
        
        # Validate interval
        if interval_seconds <= 0:
            raise ValueError(f"Interval must be > 0, got {interval_seconds}")
        
        if interval_seconds > self._config.max_delay_seconds:
            self._logger.warning(
                f"Interval {interval_seconds}s exceeds max {self._config.max_delay_seconds}s, clamping"
            )
            interval_seconds = self._config.max_delay_seconds
        
        # Check concurrent limit
        if len(self._timers) >= self._config.max_concurrent_timers:
            raise RuntimeError(
                f"Max concurrent timers ({self._config.max_concurrent_timers}) reached"
            )
        
        # Generate timer ID
        timer_id = str(uuid.uuid4())
        
        # Create interval task
        task = asyncio.create_task(
            self._execute_interval_callback(timer_id, callback, interval_seconds)
        )
        
        # Store timer info
        self._timers[timer_id] = {
            "id": timer_id,
            "type": "interval",
            "callback": callback,
            "delay_seconds": None,
            "interval_seconds": interval_seconds,
            "task": task,
            "metadata": metadata or {},
            "created_at": datetime.utcnow(),
            "status": "running",
            "execution_count": 0
        }
        
        self._logger.debug(f"Scheduled interval timer {timer_id} with interval {interval_seconds}s")
        
        return timer_id
    
    @log_execution(level="INFO")
    @log_execution(level="INFO")
    def cancel_timer(self, timer_id: str) -> bool:
        """Cancel scheduled timer."""
        if timer_id not in self._timers:
            self._logger.debug(f"Timer {timer_id} not found for cancellation")
            return False
        
        timer = self._timers[timer_id]
        task = timer["task"]
        
        if not task.done():
            task.cancel()
            timer["status"] = "cancelled"
            self._logger.debug(f"Cancelled timer {timer_id}")
        
        # Signal completion if someone is waiting
        if timer_id in self._completion_events:
            self._completion_events[timer_id].set()
        
        # Remove if auto cleanup enabled
        if self._config.auto_cleanup_completed:
            del self._timers[timer_id]
            if timer_id in self._completion_events:
                del self._completion_events[timer_id]
        
        return True
    
    @log_execution(level="INFO")
    @log_execution(level="INFO")
    def get_active_timers(self) -> List[Dict[str, Any]]:
        """Get list of all active timers."""
        return [
            {
                "id": timer["id"],
                "type": timer["type"],
                "delay_seconds": timer.get("delay_seconds"),
                "interval_seconds": timer.get("interval_seconds"),
                "metadata": timer.get("metadata", {}),
                "created_at": timer["created_at"].isoformat(),
                "status": timer["status"],
                "execution_count": timer.get("execution_count", 0)
            }
            for timer in self._timers.values()
        ]
    
    @log_execution(level="INFO")
    def cancel_all_timers(self) -> int:
        """Cancel all active timers."""
        count = 0
        timer_ids = list(self._timers.keys())
        
        for timer_id in timer_ids:
            if self.cancel_timer(timer_id):
                count += 1
        
        self._logger.info(f"Cancelled {count} timers")
        return count
    
    async def wait_for_completion(
        self,
        timer_id: str,
        timeout_seconds: Optional[float] = None
    ) -> bool:
        """Wait for specific timer to complete."""
        if not self._config.enable_wait_for_completion:
            raise RuntimeError("wait_for_completion is disabled in configuration")
        
        if timer_id not in self._timers:
            self._logger.warning(f"Timer {timer_id} not found for wait_for_completion")
            return False
        
        if timer_id not in self._completion_events:
            self._logger.warning(f"No completion event for timer {timer_id}")
            return False
        
        event = self._completion_events[timer_id]
        timeout = timeout_seconds or self._config.default_timeout_seconds
        
        try:
            await asyncio.wait_for(event.wait(), timeout=timeout)
            return True
        except asyncio.TimeoutError:
            self._logger.warning(f"Timeout waiting for timer {timer_id}")
            return False
    
    async def _execute_delayed_callback(
        self,
        timer_id: str,
        callback: Callable[[], Awaitable[None]],
        delay_seconds: float
    ) -> None:
        """Execute callback after delay."""
        try:
            # Wait for delay
            await asyncio.sleep(delay_seconds)
            
            # Update status
            if timer_id in self._timers:
                self._timers[timer_id]["status"] = "executing"
            
            # Execute callback with timeout
            start_time = time.perf_counter()
            
            try:
                await asyncio.wait_for(
                    callback(),
                    timeout=self._config.callback_timeout_seconds
                )
                
                # Track performance
                if self._config.enable_callback_performance_tracking:
                    duration_ms = (time.perf_counter() - start_time) * 1000.0
                    self._logger.debug(f"Timer {timer_id} callback executed in {duration_ms:.2f}ms")
                
                # Update status
                if timer_id in self._timers:
                    self._timers[timer_id]["status"] = "completed"
                
            except asyncio.TimeoutError:
                self._logger.error(f"Timer {timer_id} callback timed out after {self._config.callback_timeout_seconds}s")
                if timer_id in self._timers:
                    self._timers[timer_id]["status"] = "timeout"
            
            except Exception as e:
                if self._config.log_callback_errors:
                    self._logger.error(f"Timer {timer_id} callback error: {e}", exc_info=True)
                if timer_id in self._timers:
                    self._timers[timer_id]["status"] = "error"
        
        except asyncio.CancelledError:
            self._logger.debug(f"Timer {timer_id} was cancelled")
            raise
        
        finally:
            # Signal completion
            if timer_id in self._completion_events:
                self._completion_events[timer_id].set()
    
    async def _execute_interval_callback(
        self,
        timer_id: str,
        callback: Callable[[], Awaitable[None]],
        interval_seconds: float
    ) -> None:
        """Execute callback repeatedly at interval."""
        try:
            while True:
                # Wait for interval
                await asyncio.sleep(interval_seconds)
                
                # Execute callback with timeout
                start_time = time.perf_counter()
                
                try:
                    await asyncio.wait_for(
                        callback(),
                        timeout=self._config.callback_timeout_seconds
                    )
                    
                    # Track performance
                    if self._config.enable_callback_performance_tracking:
                        duration_ms = (time.perf_counter() - start_time) * 1000.0
                        self._logger.debug(f"Interval timer {timer_id} callback executed in {duration_ms:.2f}ms")
                    
                    # Update execution count
                    if timer_id in self._timers:
                        self._timers[timer_id]["execution_count"] += 1
                
                except asyncio.TimeoutError:
                    self._logger.error(f"Interval timer {timer_id} callback timed out after {self._config.callback_timeout_seconds}s")
                
                except Exception as e:
                    if self._config.log_callback_errors:
                        self._logger.error(f"Interval timer {timer_id} callback error: {e}", exc_info=True)
        
        except asyncio.CancelledError:
            self._logger.debug(f"Interval timer {timer_id} was cancelled")
            if timer_id in self._timers:
                self._timers[timer_id]["status"] = "cancelled"
            raise
    
    def _start_cleanup_task(self) -> None:
        """Start periodic cleanup task."""
        async def cleanup_loop() -> None:
            while True:
                await asyncio.sleep(self._config.cleanup_interval_seconds)
                self._cleanup_completed_timers()
        
        self._cleanup_task = asyncio.create_task(cleanup_loop())
    
    def _cleanup_completed_timers(self) -> None:
        """Remove completed timers from tracking."""
        completed: List[str] = [
            timer_id for timer_id, timer in self._timers.items()
            if timer["status"] in ("completed", "error", "timeout", "cancelled") and
            timer["task"].done()
        ]
        
        for timer_id in completed:
            del self._timers[timer_id]
            if timer_id in self._completion_events:
                del self._completion_events[timer_id]
        
        if completed:
            self._logger.debug(f"Cleaned up {len(completed)} completed timers")
    
    async def wait_for(self, coroutine: Awaitable[Any], timeout: float) -> Any:
        """
        Wait for coroutine with timeout.
        
        Platform abstraction over asyncio.wait_for().
        
        QUALIA.CODE v1.1 Compliance:
        - §4 Platform Abstraction: Wraps asyncio.wait_for()
        - Enables testable time control in health checks and async operations
        
        Args:
            coroutine: Async coroutine to await
            timeout: Maximum time to wait in seconds
            
        Returns:
            Result from coroutine
            
        Raises:
            asyncio.TimeoutError: If operation exceeds timeout
        """
        if timeout < 0:
            self._logger.warning(f"Negative timeout: {timeout}, using 0")
            timeout = 0
        
        return await asyncio.wait_for(coroutine, timeout=timeout)
