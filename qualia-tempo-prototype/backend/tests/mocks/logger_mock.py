"""
High-Fidelity Mock for ILogger Interface
QUALIA.CODE v1.1 Compliance - Testing Infrastructure

This mock records all logging calls for test assertions while
maintaining full ILogger interface compliance.
"""
from typing import Any, Dict, Optional, List
from backend.services.interfaces.ILogger import ILogger


class MockLogger(ILogger):
    """
    High-fidelity mock for ILogger interface.
    Records all calls for test assertions and debugging.
    
    COMPLIANCE: QUALIA.MANUAL.md Section 10.3.1 (High-Fidelity Mocking)
    - Implements full ILogger Protocol interface
    - Records all method calls with arguments
    - Returns type-correct values (None for void methods)
    - Supports call history inspection
    - Stateless between tests (via reset())
    """
    
    def __init__(self):
        """Initialize empty call history."""
        self.reset()
    
    def reset(self) -> None:
        """Reset all call history (call between tests for isolation)."""
        self.debug_calls: List[Dict[str, Any]] = []
        self.info_calls: List[Dict[str, Any]] = []
        self.warning_calls: List[Dict[str, Any]] = []
        self.error_calls: List[Dict[str, Any]] = []
        self.critical_calls: List[Dict[str, Any]] = []
    
    # ILogger Protocol Implementation (Full Interface)
    
    def debug(
        self, 
        message: str, 
        context: Optional[Dict[str, Any]] = None,
        exc_info: bool = False,
        extra: Optional[Dict[str, Any]] = None
    ) -> None:
        """Record debug call."""
        self.debug_calls.append({
            "message": message,
            "context": context,
            "exc_info": exc_info,
            "extra": extra
        })
    
    def info(
        self, 
        message: str, 
        context: Optional[Dict[str, Any]] = None,
        exc_info: bool = False,
        extra: Optional[Dict[str, Any]] = None
    ) -> None:
        """Record info call."""
        self.info_calls.append({
            "message": message,
            "context": context,
            "exc_info": exc_info,
            "extra": extra
        })
    
    def warning(
        self, 
        message: str, 
        context: Optional[Dict[str, Any]] = None,
        exc_info: bool = False,
        extra: Optional[Dict[str, Any]] = None
    ) -> None:
        """Record warning call."""
        self.warning_calls.append({
            "message": message,
            "context": context,
            "exc_info": exc_info,
            "extra": extra
        })
    
    def error(
        self, 
        message: str, 
        context: Optional[Dict[str, Any]] = None,
        exc_info: bool = False,
        extra: Optional[Dict[str, Any]] = None
    ) -> None:
        """Record error call."""
        self.error_calls.append({
            "message": message,
            "context": context,
            "exc_info": exc_info,
            "extra": extra
        })
    
    def critical(
        self, 
        message: str, 
        context: Optional[Dict[str, Any]] = None,
        exc_info: bool = False,
        extra: Optional[Dict[str, Any]] = None
    ) -> None:
        """Record critical call."""
        self.critical_calls.append({
            "message": message,
            "context": context,
            "exc_info": exc_info,
            "extra": extra
        })
    
    # Assertion Helper Methods
    
    def get_all_calls(self) -> List[Dict[str, Any]]:
        """Get all calls across all log levels."""
        return (
            self.debug_calls + 
            self.info_calls + 
            self.warning_calls + 
            self.error_calls + 
            self.critical_calls
        )
    
    def get_call_count(self) -> int:
        """Get total number of calls."""
        return len(self.get_all_calls())
    
    def was_called_with(self, message_substring: str) -> bool:
        """Check if any call contains message substring."""
        return any(
            message_substring in call["message"]
            for call in self.get_all_calls()
        )
    
    def get_calls_with_message(self, message_substring: str) -> List[Dict[str, Any]]:
        """Get all calls containing message substring."""
        return [
            call for call in self.get_all_calls()
            if message_substring in call["message"]
        ]
