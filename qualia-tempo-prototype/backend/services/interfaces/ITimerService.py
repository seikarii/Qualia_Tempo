# QUALIA.CODE v1.1 - ITimerService Interface
from typing import Protocol, Callable, Any
import asyncio

class ITimerService(Protocol):
    """Interface for timer service (async timer management)."""
    
    async def set_timeout(self, callback: Callable, delay: float) -> asyncio.Task:
        """Set a timeout."""
        ...
    
    async def set_interval(self, callback: Callable, interval: float) -> asyncio.Task:
        """Set an interval."""
        ...
    
    def cancel_timer(self, task: asyncio.Task) -> None:
        """Cancel a timer."""
        ...
