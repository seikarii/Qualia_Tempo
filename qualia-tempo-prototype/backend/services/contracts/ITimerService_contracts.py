"""
ITimerService Contracts
QUALIA.CODE v1.1 Compliance - Phase 6.2

Configuration contract for TimerService.
"""

from dataclasses import dataclass, field
from typing import List


@dataclass
class TimerServiceConfig:
    """Configuration for TimerService."""
    
    # Timer Management
    max_concurrent_timers: int = 1000
    """Maximum number of concurrent timers allowed"""
    
    enable_timer_tracking: bool = True
    """Enable tracking and reporting of active timers"""
    
    # Timeouts
    default_timeout_seconds: float = 300.0
    """Default timeout for wait_for_completion (5 minutes)"""
    
    max_delay_seconds: float = 86400.0
    """Maximum allowed delay for scheduled callbacks (24 hours)"""
    
    # Cleanup
    auto_cleanup_completed: bool = True
    """Automatically remove completed timers from tracking"""
    
    cleanup_interval_seconds: float = 60.0
    """Interval for periodic cleanup of completed timers"""
    
    # Error Handling
    log_callback_errors: bool = True
    """Log errors that occur in timer callbacks"""
    
    retry_failed_callbacks: bool = False
    """Retry callbacks that fail with exceptions"""
    
    max_callback_retries: int = 3
    """Maximum retries for failed callbacks (if retry_failed_callbacks=True)"""
    
    # Performance
    callback_timeout_seconds: float = 30.0
    """Timeout for individual callback execution"""
    
    enable_callback_performance_tracking: bool = True
    """Track execution time of callbacks"""
    
    # Features
    enable_interval_timers: bool = True
    """Enable interval timer functionality (setInterval equivalent)"""
    
    enable_wait_for_completion: bool = True
    """Enable wait_for_completion functionality"""
    
    # Testing
    enable_fast_forward: bool = False
    """Enable fast-forward mode for testing (mock time acceleration)"""
