"""
MockErrorReportingService - High-Fidelity Mock
QUALIA.CODE v1.1 Compliance - Phase 6.4

High-fidelity mock for testing error reporting scenarios.
"""

from typing import Dict, Any, Optional, List, Callable
from datetime import datetime
from collections import deque


class MockErrorReportingService:
    """
    High-fidelity mock for IErrorReportingService.
    
    Features:
    - Full call tracking for all 10 methods
    - Stateful behavior (stores errors, breadcrumbs, context)
    - 12 test helper methods for assertions
    """
    
    def __init__(self, config: Any, logger: Any):
        """Initialize mock with config and logger."""
        self._config = config
        self._logger = logger
        
        # Call tracking
        self.report_error_calls: List[Dict[str, Any]] = []
        self.report_exception_calls: List[Dict[str, Any]] = []
        self.set_user_context_calls: List[Dict[str, Any]] = []
        self.set_tags_calls: List[Dict[str, Any]] = []
        self.add_breadcrumb_calls: List[Dict[str, Any]] = []
        self.get_error_count_calls: List[Dict[str, Any]] = []
        self.get_recent_errors_calls: List[Dict[str, Any]] = []
        self.export_errors_calls: List[Dict[str, Any]] = []
        self.clear_context_calls: int = 0
        self.subscribe_to_errors_calls: List[Dict[str, Any]] = []
        
        # Mock storage (stateful behavior)
        self._errors: deque = deque(maxlen=config.max_errors_stored)
        self._user_context: Dict[str, Any] = {}
        self._tags: Dict[str, str] = {}
        self._breadcrumbs: deque = deque(maxlen=config.max_breadcrumbs)
        self._subscribers: Dict[str, Callable] = {}
        self._next_error_id = 1
    
    def report_error(
        self,
        error_message: str,
        error_type: str,
        stack_trace: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        severity: str = "error"
    ) -> str:
        """Mock report_error with full call tracking."""
        error_id = f"error-{self._next_error_id}"
        self._next_error_id += 1
        
        error_report = {
            "error_id": error_id,
            "timestamp": datetime.utcnow().isoformat(),
            "error_message": error_message,
            "error_type": error_type,
            "stack_trace": stack_trace,
            "context": context,
            "severity": severity,
            "user_context": self._user_context.copy(),
            "tags": self._tags.copy(),
            "breadcrumbs": list(self._breadcrumbs)
        }
        
        self.report_error_calls.append({
            "error_message": error_message,
            "error_type": error_type,
            "stack_trace": stack_trace,
            "context": context,
            "severity": severity,
            "timestamp": datetime.utcnow()
        })
        
        self._errors.append(error_report)
        return error_id
    
    def report_exception(
        self,
        exception: Exception,
        context: Optional[Dict[str, Any]] = None,
        severity: str = "error"
    ) -> str:
        """Mock report_exception with automatic error extraction."""
        self.report_exception_calls.append({
            "exception": exception,
            "exception_type": type(exception).__name__,
            "exception_message": str(exception),
            "context": context,
            "severity": severity,
            "timestamp": datetime.utcnow()
        })
        
        return self.report_error(
            error_message=str(exception),
            error_type=type(exception).__name__,
            stack_trace=None,  # Mock doesn't extract real stack trace
            context=context,
            severity=severity
        )
    
    def set_user_context(
        self,
        user_id: Optional[str] = None,
        username: Optional[str] = None,
        email: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """Mock set_user_context with state update."""
        self.set_user_context_calls.append({
            "user_id": user_id,
            "username": username,
            "email": email,
            "metadata": metadata,
            "timestamp": datetime.utcnow()
        })
        
        self._user_context = {
            "user_id": user_id,
            "username": username,
            "email": email,
            "metadata": metadata or {}
        }
    
    def set_tags(self, tags: Dict[str, str]) -> None:
        """Mock set_tags with state update."""
        self.set_tags_calls.append({
            "tags": tags.copy(),
            "timestamp": datetime.utcnow()
        })
        
        self._tags.update(tags)
    
    def add_breadcrumb(
        self,
        message: str,
        category: str = "default",
        level: str = "info",
        data: Optional[Dict[str, Any]] = None
    ) -> None:
        """Mock add_breadcrumb with state update."""
        breadcrumb = {
            "message": message,
            "category": category,
            "level": level,
            "data": data,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        self.add_breadcrumb_calls.append({
            "message": message,
            "category": category,
            "level": level,
            "data": data,
            "timestamp": datetime.utcnow()
        })
        
        self._breadcrumbs.append(breadcrumb)
    
    def get_error_count(
        self,
        severity: Optional[str] = None,
        error_type: Optional[str] = None,
        since: Optional[datetime] = None
    ) -> int:
        """Mock get_error_count with filtering."""
        self.get_error_count_calls.append({
            "severity": severity,
            "error_type": error_type,
            "since": since,
            "timestamp": datetime.utcnow()
        })
        
        count = 0
        for error in self._errors:
            if severity and error.get("severity") != severity:
                continue
            if error_type and error.get("error_type") != error_type:
                continue
            if since:
                error_time = datetime.fromisoformat(error["timestamp"])
                if error_time < since:
                    continue
            count += 1
        return count
    
    def get_recent_errors(
        self,
        limit: int = 50,
        severity: Optional[str] = None,
        error_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Mock get_recent_errors with filtering."""
        self.get_recent_errors_calls.append({
            "limit": limit,
            "severity": severity,
            "error_type": error_type,
            "timestamp": datetime.utcnow()
        })
        
        filtered_errors = []
        for error in reversed(self._errors):
            if severity and error.get("severity") != severity:
                continue
            if error_type and error.get("error_type") != error_type:
                continue
            filtered_errors.append(error.copy())
            if len(filtered_errors) >= limit:
                break
        return filtered_errors
    
    def export_errors(
        self,
        backend: str,
        since: Optional[datetime] = None
    ) -> bool:
        """Mock export_errors with call tracking."""
        self.export_errors_calls.append({
            "backend": backend,
            "since": since,
            "timestamp": datetime.utcnow()
        })
        return True
    
    def clear_context(self) -> None:
        """Mock clear_context with state reset."""
        self.clear_context_calls += 1
        self._user_context = {}
        self._tags = {}
    
    def subscribe_to_errors(
        self,
        callback: Callable[[Dict[str, Any]], None],
        severity_filter: Optional[str] = None
    ) -> str:
        """Mock subscribe_to_errors with subscriber tracking."""
        subscription_id = f"sub-{len(self._subscribers) + 1}"
        
        self.subscribe_to_errors_calls.append({
            "callback": callback,
            "severity_filter": severity_filter,
            "subscription_id": subscription_id,
            "timestamp": datetime.utcnow()
        })
        
        self._subscribers[subscription_id] = callback
        return subscription_id
    
    # --- Test Helper Methods ---
    
    def was_error_reported(self, error_message: str) -> bool:
        """Check if specific error was reported."""
        return any(
            call["error_message"] == error_message
            for call in self.report_error_calls
        )
    
    def was_exception_reported(self, exception_type: str) -> bool:
        """Check if specific exception type was reported."""
        return any(
            call["exception_type"] == exception_type
            for call in self.report_exception_calls
        )
    
    def get_error_count_by_severity(self, severity: str) -> int:
        """Get count of errors by severity level."""
        return sum(
            1 for error in self._errors
            if error.get("severity") == severity
        )
    
    def get_error_count_by_type(self, error_type: str) -> int:
        """Get count of errors by type."""
        return sum(
            1 for error in self._errors
            if error.get("error_type") == error_type
        )
    
    def get_all_stored_errors(self) -> List[Dict[str, Any]]:
        """Get all stored errors."""
        return list(self._errors)
    
    def get_breadcrumb_count(self) -> int:
        """Get current breadcrumb count."""
        return len(self._breadcrumbs)
    
    def get_current_user_context(self) -> Dict[str, Any]:
        """Get current user context."""
        return self._user_context.copy()
    
    def get_current_tags(self) -> Dict[str, str]:
        """Get current tags."""
        return self._tags.copy()
    
    def was_exported_to(self, backend: str) -> bool:
        """Check if errors were exported to specific backend."""
        return any(
            call["backend"] == backend
            for call in self.export_errors_calls
        )
    
    def get_subscriber_count(self) -> int:
        """Get current subscriber count."""
        return len(self._subscribers)
    
    def get_total_report_calls(self) -> int:
        """Get total error report calls (both methods)."""
        return len(self.report_error_calls) + len(self.report_exception_calls)
    
    def reset(self) -> None:
        """Reset all call tracking and state for test isolation."""
        self.report_error_calls.clear()
        self.report_exception_calls.clear()
        self.set_user_context_calls.clear()
        self.set_tags_calls.clear()
        self.add_breadcrumb_calls.clear()
        self.get_error_count_calls.clear()
        self.get_recent_errors_calls.clear()
        self.export_errors_calls.clear()
        self.clear_context_calls = 0
        self.subscribe_to_errors_calls.clear()
        
        self._errors.clear()
        self._user_context = {}
        self._tags = {}
        self._breadcrumbs.clear()
        self._subscribers = {}
        self._next_error_id = 1
