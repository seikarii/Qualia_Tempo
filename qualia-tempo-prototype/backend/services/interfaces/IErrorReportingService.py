"""
IErrorReportingService Interface
QUALIA.CODE v1.1 Compliance - Phase 6.4

Protocol interface for centralized error reporting and aggregation.
Supports multiple backends (Sentry, Rollbar, CloudWatch, local logging).
"""

from typing import Protocol, Dict, Any, Optional, List, Callable
from datetime import datetime


class IErrorReportingService(Protocol):
    """
    Protocol interface for error reporting service.
    
    Provides centralized error aggregation, deduplication, stack trace enrichment,
    and integration with external error tracking systems.
    
    Methods:
        report_error: Report an error with context and stack trace
        report_exception: Report a caught exception with automatic stack extraction
        set_user_context: Set user context for all subsequent error reports
        set_tags: Set custom tags for error categorization
        add_breadcrumb: Add breadcrumb trail for debugging
        get_error_count: Get count of errors by filter criteria
        get_recent_errors: Retrieve recent error reports
        export_errors: Export errors to specified backend
        clear_context: Clear user context and tags
        subscribe_to_errors: Subscribe to error events for real-time monitoring
    """
    
    def report_error(
        self,
        error_message: str,
        error_type: str,
        stack_trace: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        severity: str = "error"
    ) -> str:
        """
        Report an error with full context.
        
        Args:
            error_message: Human-readable error description
            error_type: Error type/category (e.g., "ValueError", "DatabaseError")
            stack_trace: Optional stack trace string
            context: Additional context data (request info, state, etc.)
            severity: Error severity ("debug", "info", "warning", "error", "critical")
        
        Returns:
            error_id: Unique identifier for the reported error
        """
        ...
    
    def report_exception(
        self,
        exception: Exception,
        context: Optional[Dict[str, Any]] = None,
        severity: str = "error"
    ) -> str:
        """
        Report a caught exception with automatic stack trace extraction.
        
        Args:
            exception: The caught exception object
            context: Additional context data
            severity: Error severity level
        
        Returns:
            error_id: Unique identifier for the reported error
        """
        ...
    
    def set_user_context(
        self,
        user_id: Optional[str] = None,
        username: Optional[str] = None,
        email: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Set user context for all subsequent error reports.
        
        Args:
            user_id: User identifier
            username: Username
            email: User email
            metadata: Additional user metadata
        """
        ...
    
    def set_tags(self, tags: Dict[str, str]) -> None:
        """
        Set custom tags for error categorization.
        
        Args:
            tags: Key-value pairs for tagging errors (e.g., {"environment": "production"})
        """
        ...
    
    def add_breadcrumb(
        self,
        message: str,
        category: str = "default",
        level: str = "info",
        data: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Add breadcrumb trail for debugging.
        
        Breadcrumbs are chronological events leading up to an error.
        
        Args:
            message: Breadcrumb message
            category: Event category (e.g., "navigation", "http", "user_action")
            level: Event level ("debug", "info", "warning", "error")
            data: Additional event data
        """
        ...
    
    def get_error_count(
        self,
        severity: Optional[str] = None,
        error_type: Optional[str] = None,
        since: Optional[datetime] = None
    ) -> int:
        """
        Get count of errors matching filter criteria.
        
        Args:
            severity: Filter by severity level
            error_type: Filter by error type
            since: Filter by timestamp (errors since this time)
        
        Returns:
            count: Number of matching errors
        """
        ...
    
    def get_recent_errors(
        self,
        limit: int = 50,
        severity: Optional[str] = None,
        error_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Retrieve recent error reports.
        
        Args:
            limit: Maximum number of errors to return
            severity: Filter by severity level
            error_type: Filter by error type
        
        Returns:
            errors: List of error dictionaries with full context
        """
        ...
    
    def export_errors(
        self,
        backend: str,
        since: Optional[datetime] = None
    ) -> bool:
        """
        Export errors to specified backend.
        
        Args:
            backend: Target backend ("sentry", "rollbar", "cloudwatch", "local")
            since: Export errors since this timestamp
        
        Returns:
            success: True if export succeeded
        """
        ...
    
    def clear_context(self) -> None:
        """
        Clear user context and tags.
        
        Useful for resetting context between requests or sessions.
        """
        ...
    
    def subscribe_to_errors(
        self,
        callback: Callable[[Dict[str, Any]], None],
        severity_filter: Optional[str] = None
    ) -> str:
        """
        Subscribe to error events for real-time monitoring.
        
        Args:
            callback: Function called when error occurs
            severity_filter: Only receive errors of this severity or higher
        
        Returns:
            subscription_id: Unique subscription identifier
        """
        ...
