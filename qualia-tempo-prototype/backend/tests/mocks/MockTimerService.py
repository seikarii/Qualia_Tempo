"""
MockTimerService - High-Fidelity Mock
QUALIA.CODE v1.1 Compliance - Phase 6.2

High-fidelity mock for ITimerService with fast-forward time capability.
Enables deterministic testing of timer-dependent code.
"""

import asyncio
import uuid
from datetime import datetime
from typing import Dict, Any, Optional, List, Callable, Awaitable
from unittest.mock import AsyncMock

from backend.services.interfaces.ITimerService import ITimerService


class MockTimerService(ITimerService):
    """
    High-fidelity mock for TimerService with fast-forward time.
    
    Features:
    - Instant execution mode for tests
    - Fast-forward time capability
    - Full call tracking
    - Test helpers for assertions
    """
    
    def __init__(self, instant_mode: bool = True):
        """
        Initialize MockTimerService.
        
        Args:
            instant_mode: If True, timers execute instantly (no delay)
        """
        self._instant_mode = instant_mode
        self._current_time = 0.0  # Virtual time in seconds
        
        # Call tracking
        self.sleep_calls: List[Dict[str, Any]] = []
        self.scheduled_callbacks: List[Dict[str, Any]] = []
        self.scheduled_intervals: List[Dict[str, Any]] = []
        self.cancelled_timers: List[str] = []
        self.wait_calls: List[Dict[str, Any]] = []
        
        # Active timers
        self._timers: Dict[str, Dict[str, Any]] = {}
        self._completion_events: Dict[str, asyncio.Event] = {}
        
        # Performance tracking
        self.total_sleep_seconds = 0.0
        self.callback_execution_count = 0
        self.interval_execution_count = 0
    
    async def sleep(self, seconds: float) -> None:
        """Mock async sleep."""
        self.sleep_calls.append({
            "seconds": seconds,
            "timestamp": datetime.utcnow()
        })
        self.total_sleep_seconds += seconds
        
        if not self._instant_mode:
            await asyncio.sleep(0)  # Yield control
    
    def schedule_callback(
        self,
        callback: Callable[[], Awaitable[None]],
        delay_seconds: float,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """Mock schedule callback."""
        timer_id = str(uuid.uuid4())
        
        timer_info = {
            "id": timer_id,
            "type": "callback",
            "callback": callback,
            "delay_seconds": delay_seconds,
            "metadata": metadata or {},
            "created_at": datetime.utcnow(),
            "status": "scheduled",
            "execute_at": self._current_time + delay_seconds
        }
        
        self.scheduled_callbacks.append(timer_info.copy())
        self._timers[timer_id] = timer_info
        self._completion_events[timer_id] = asyncio.Event()
        
        # In instant mode, execute immediately
        if self._instant_mode:
            asyncio.create_task(self._execute_callback_instantly(timer_id, callback))
        
        return timer_id
    
    def schedule_interval(
        self,
        callback: Callable[[], Awaitable[None]],
        interval_seconds: float,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """Mock schedule interval."""
        timer_id = str(uuid.uuid4())
        
        timer_info = {
            "id": timer_id,
            "type": "interval",
            "callback": callback,
            "interval_seconds": interval_seconds,
            "metadata": metadata or {},
            "created_at": datetime.utcnow(),
            "status": "running",
            "next_execute_at": self._current_time + interval_seconds,
            "execution_count": 0
        }
        
        self.scheduled_intervals.append(timer_info.copy())
        self._timers[timer_id] = timer_info
        
        return timer_id
    
    def cancel_timer(self, timer_id: str) -> bool:
        """Mock cancel timer."""
        if timer_id not in self._timers:
            return False
        
        self.cancelled_timers.append(timer_id)
        self._timers[timer_id]["status"] = "cancelled"
        
        # Signal completion
        if timer_id in self._completion_events:
            self._completion_events[timer_id].set()
        
        return True
    
    def get_active_timers(self) -> List[Dict[str, Any]]:
        """Mock get active timers."""
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
    
    def cancel_all_timers(self) -> int:
        """Mock cancel all timers."""
        count = len(self._timers)
        
        for timer_id in list(self._timers.keys()):
            self.cancel_timer(timer_id)
        
        return count
    
    async def wait_for_completion(
        self,
        timer_id: str,
        timeout_seconds: Optional[float] = None
    ) -> bool:
        """Mock wait for completion."""
        self.wait_calls.append({
            "timer_id": timer_id,
            "timeout_seconds": timeout_seconds,
            "timestamp": datetime.utcnow()
        })
        
        if timer_id not in self._completion_events:
            return False
        
        if self._instant_mode:
            return True  # In instant mode, already completed
        
        try:
            await asyncio.wait_for(
                self._completion_events[timer_id].wait(),
                timeout=timeout_seconds or 300.0
            )
            return True
        except asyncio.TimeoutError:
            return False
    
    # === TEST HELPERS ===
    
    def advance_time(self, seconds: float) -> None:
        """
        Fast-forward virtual time.
        
        Args:
            seconds: Seconds to advance
        """
        self._current_time += seconds
    
    async def advance_time_and_execute(self, seconds: float) -> int:
        """
        Fast-forward time and execute any pending callbacks.
        
        Args:
            seconds: Seconds to advance
            
        Returns:
            Number of callbacks executed
        """
        self._current_time += seconds
        executed_count = 0
        
        # Execute pending one-shot callbacks
        for timer_id, timer in list(self._timers.items()):
            if timer["type"] == "callback" and timer["status"] == "scheduled":
                if timer["execute_at"] <= self._current_time:
                    await self._execute_callback(timer_id, timer["callback"])
                    executed_count += 1
        
        # Execute pending interval callbacks
        for timer_id, timer in list(self._timers.items()):
            if timer["type"] == "interval" and timer["status"] == "running":
                while timer["next_execute_at"] <= self._current_time:
                    await self._execute_callback(timer_id, timer["callback"])
                    timer["execution_count"] += 1
                    timer["next_execute_at"] += timer["interval_seconds"]
                    executed_count += 1
        
        return executed_count
    
    def get_current_time(self) -> float:
        """Get current virtual time."""
        return self._current_time
    
    def get_pending_timers(self) -> List[Dict[str, Any]]:
        """Get timers scheduled in the future."""
        return [
            {
                "id": timer["id"],
                "type": timer["type"],
                "delay_seconds": timer.get("delay_seconds"),
                "interval_seconds": timer.get("interval_seconds"),
                "execute_at": timer.get("execute_at"),
                "next_execute_at": timer.get("next_execute_at")
            }
            for timer in self._timers.values()
            if timer["status"] in ("scheduled", "running")
        ]
    
    def was_callback_scheduled(self, delay_seconds: float, tolerance: float = 0.01) -> bool:
        """
        Check if callback with specific delay was scheduled.
        
        Args:
            delay_seconds: Expected delay
            tolerance: Allowable difference
            
        Returns:
            True if matching callback found
        """
        return any(
            abs(cb["delay_seconds"] - delay_seconds) <= tolerance
            for cb in self.scheduled_callbacks
        )
    
    def was_interval_scheduled(self, interval_seconds: float, tolerance: float = 0.01) -> bool:
        """
        Check if interval with specific period was scheduled.
        
        Args:
            interval_seconds: Expected interval
            tolerance: Allowable difference
            
        Returns:
            True if matching interval found
        """
        return any(
            abs(iv["interval_seconds"] - interval_seconds) <= tolerance
            for iv in self.scheduled_intervals
        )
    
    def was_timer_cancelled(self, timer_id: str) -> bool:
        """Check if specific timer was cancelled."""
        return timer_id in self.cancelled_timers
    
    def get_total_sleep_time(self) -> float:
        """Get total time spent in sleep() calls."""
        return self.total_sleep_seconds
    
    def get_callback_count(self) -> int:
        """Get number of scheduled callbacks."""
        return len(self.scheduled_callbacks)
    
    def get_interval_count(self) -> int:
        """Get number of scheduled intervals."""
        return len(self.scheduled_intervals)
    
    def get_cancellation_count(self) -> int:
        """Get number of cancelled timers."""
        return len(self.cancelled_timers)
    
    def reset(self) -> None:
        """Reset mock state for test isolation."""
        self.sleep_calls.clear()
        self.scheduled_callbacks.clear()
        self.scheduled_intervals.clear()
        self.cancelled_timers.clear()
        self.wait_calls.clear()
        
        self._timers.clear()
        self._completion_events.clear()
        
        self._current_time = 0.0
        self.total_sleep_seconds = 0.0
        self.callback_execution_count = 0
        self.interval_execution_count = 0
    
    # === INTERNAL HELPERS ===
    
    async def _execute_callback_instantly(
        self,
        timer_id: str,
        callback: Callable[[], Awaitable[None]]
    ) -> None:
        """Execute callback instantly for instant mode."""
        try:
            await callback()
            self.callback_execution_count += 1
            
            if timer_id in self._timers:
                self._timers[timer_id]["status"] = "completed"
            
            # Signal completion
            if timer_id in self._completion_events:
                self._completion_events[timer_id].set()
        
        except Exception:
            if timer_id in self._timers:
                self._timers[timer_id]["status"] = "error"
    
    async def _execute_callback(
        self,
        timer_id: str,
        callback: Callable[[], Awaitable[None]]
    ) -> None:
        """Execute callback during fast-forward."""
        try:
            await callback()
            self.callback_execution_count += 1
            
            if timer_id in self._timers:
                timer = self._timers[timer_id]
                if timer["type"] == "callback":
                    timer["status"] = "completed"
                    # Signal completion
                    if timer_id in self._completion_events:
                        self._completion_events[timer_id].set()
        
        except Exception:
            if timer_id in self._timers:
                self._timers[timer_id]["status"] = "error"
