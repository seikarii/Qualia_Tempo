"""
ErrorReportingService Implementation
QUALIA.CODE v1.1 Compliance - Phase 6.4

Centralized error reporting with multi-backend support and deduplication.
"""

import uuid
import json
import hashlib
import traceback
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List, Callable
from collections import deque

from .interfaces.IErrorReportingService import IErrorReportingService
from .interfaces.ILogger import ILogger
from .contracts.IErrorReportingService_contracts import ErrorReportingServiceConfig


class ErrorReportingService(IErrorReportingService):
    """
    Centralized error reporting service.
    
    Features:
    - Error aggregation with full context capture
    - Automatic deduplication within configurable time window
    - Stack trace enrichment and formatting
    - Multi-backend export (Sentry, Rollbar, CloudWatch, local)
    - Breadcrumb trail for debugging
    - User context tracking
    - Rate limiting to prevent error flooding
    - Real-time error subscriptions
    """
    
    def __init__(self, config: ErrorReportingServiceConfig, logger: ILogger):
        """
        Initialize ErrorReportingService.
        
        Args:
            config: Service configuration
            logger: Injected logger instance
        """
        self._config = config
        self._logger = logger
        
        # Error storage
        self._errors: deque = deque(maxlen=config.max_errors_stored)
        self._error_hashes: Dict[str, datetime] = {}  # For deduplication
        
        # Context tracking
        self._user_context: Dict[str, Any] = {}
        self._tags: Dict[str, str] = {}
        self._breadcrumbs: deque = deque(maxlen=config.max_breadcrumbs)
        
        # Subscribers for real-time monitoring
        self._subscribers: Dict[str, Dict[str, Any]] = {}
        
        # Rate limiting
        self._error_timestamps: deque = deque(maxlen=config.max_errors_per_minute)
        
        self._logger.info(
            "ErrorReportingService initialized",
            extra={
                "enabled_backends": config.enabled_backends,
                "max_errors_stored": config.max_errors_stored,
                "deduplication_enabled": config.enable_deduplication
            }
        )
    
    def report_error(
        self,
        error_message: str,
        error_type: str,
        stack_trace: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        severity: str = "error"
    ) -> str:
        """Report an error with full context."""
        # Rate limiting check
        if self._config.enable_rate_limiting and not self._check_rate_limit():
            self._logger.warning(
                "Error rate limit exceeded, dropping error",
                extra={"error_message": error_message[:100]}
            )
            return ""
        
        # Generate error fingerprint for deduplication
        error_fingerprint = self._generate_fingerprint(error_message, error_type, stack_trace)
        
        # Check deduplication
        if self._config.enable_deduplication and self._is_duplicate(error_fingerprint):
            self._logger.debug(f"Duplicate error detected, skipping: {error_message[:50]}...")
            return ""
        
        # Generate error ID
        error_id = str(uuid.uuid4())
        
        # Enrich stack trace if enabled
        if self._config.enable_stack_trace_enrichment and stack_trace:
            stack_trace = self._enrich_stack_trace(stack_trace)
        
        # Build error report
        error_report = {
            "error_id": error_id,
            "timestamp": datetime.utcnow().isoformat(),
            "error_message": error_message,
            "error_type": error_type,
            "severity": severity,
            "stack_trace": stack_trace,
            "context": context or {},
            "user_context": self._user_context.copy(),
            "tags": self._tags.copy(),
            "breadcrumbs": list(self._breadcrumbs)
        }
        
        # Store error
        self._errors.append(error_report)
        
        # Update deduplication tracking
        if self._config.enable_deduplication:
            self._error_hashes[error_fingerprint] = datetime.utcnow()
        
        # Export to backends
        for backend in self._config.enabled_backends:
            try:
                self._export_to_backend(backend, error_report)
            except Exception as e:
                self._logger.error(f"Failed to export error to {backend}: {str(e)}")
        
        # Notify subscribers
        self._notify_subscribers(error_report)
        
        # Log error based on severity
        log_message = f"Error reported: {error_message}"
        log_context = {"error_id": error_id, "error_type": error_type}
        
        if severity == "critical":
            self._logger.error(log_message, log_context)
        elif severity == "error":
            self._logger.error(log_message, log_context)
        elif severity == "warning":
            self._logger.warning(log_message, log_context)
        else:  # info, debug
            self._logger.info(log_message, log_context)
        
        return error_id
    
    def report_exception(
        self,
        exception: Exception,
        context: Optional[Dict[str, Any]] = None,
        severity: str = "error"
    ) -> str:
        """Report a caught exception with automatic stack extraction."""
        error_message = str(exception)
        error_type = type(exception).__name__
        stack_trace = traceback.format_exc()
        
        return self.report_error(
            error_message=error_message,
            error_type=error_type,
            stack_trace=stack_trace,
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
        """Set user context for all subsequent error reports."""
        self._user_context = {
            "user_id": user_id,
            "username": username,
            "email": email,
            "metadata": metadata or {}
        }
        self._logger.debug(f"User context set for user_id: {user_id}")
    
    def set_tags(self, tags: Dict[str, str]) -> None:
        """Set custom tags for error categorization."""
        self._tags.update(tags)
        self._logger.debug(f"Tags updated: {list(tags.keys())}")
    
    def add_breadcrumb(
        self,
        message: str,
        category: str = "default",
        level: str = "info",
        data: Optional[Dict[str, Any]] = None
    ) -> None:
        """Add breadcrumb trail for debugging."""
        breadcrumb = {
            "timestamp": datetime.utcnow().isoformat(),
            "message": message,
            "category": category,
            "level": level,
            "data": data or {}
        }
        self._breadcrumbs.append(breadcrumb)
    
    def get_error_count(
        self,
        severity: Optional[str] = None,
        error_type: Optional[str] = None,
        since: Optional[datetime] = None
    ) -> int:
        """Get count of errors matching filter criteria."""
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
        """Retrieve recent error reports."""
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
        """Export errors to specified backend."""
        try:
            errors_to_export = []
            for error in self._errors:
                if since:
                    error_time = datetime.fromisoformat(error["timestamp"])
                    if error_time < since:
                        continue
                errors_to_export.append(error)
            
            if not errors_to_export:
                self._logger.info(f"No errors to export to {backend}")
                return True
            
            # Export based on backend
            if backend == "sentry":
                return self._export_to_sentry_batch(errors_to_export)
            elif backend == "rollbar":
                return self._export_to_rollbar_batch(errors_to_export)
            elif backend == "cloudwatch":
                return self._export_to_cloudwatch_batch(errors_to_export)
            elif backend == "local":
                return self._export_to_local_batch(errors_to_export)
            else:
                self._logger.error(f"Unknown backend: {backend}")
                return False
        except Exception as e:
            self._logger.error(f"Failed to export errors: {str(e)}")
            return False
    
    def clear_context(self) -> None:
        """Clear user context and tags."""
        self._user_context = {}
        self._tags = {}
        self._logger.debug("Context cleared")
    
    def subscribe_to_errors(
        self,
        callback: Callable[[Dict[str, Any]], None],
        severity_filter: Optional[str] = None
    ) -> str:
        """Subscribe to error events for real-time monitoring."""
        subscription_id = str(uuid.uuid4())
        self._subscribers[subscription_id] = {
            "callback": callback,
            "severity_filter": severity_filter
        }
        self._logger.debug(f"Error subscriber added: {subscription_id}")
        return subscription_id
    
    # --- Private Helper Methods ---
    
    def _check_rate_limit(self) -> bool:
        """Check if we're within rate limits."""
        now = datetime.utcnow()
        one_minute_ago = now - timedelta(minutes=1)
        
        # Remove old timestamps
        while self._error_timestamps and self._error_timestamps[0] < one_minute_ago:
            self._error_timestamps.popleft()
        
        # Check if under limit
        if len(self._error_timestamps) >= self._config.max_errors_per_minute:
            return False
        
        # Add current timestamp
        self._error_timestamps.append(now)
        return True
    
    def _generate_fingerprint(
        self,
        error_message: str,
        error_type: str,
        stack_trace: Optional[str]
    ) -> str:
        """Generate error fingerprint for deduplication."""
        fingerprint_data = f"{error_type}:{error_message[:100]}"
        if stack_trace:
            # Use first 3 stack frames for fingerprinting
            stack_lines = stack_trace.split('\n')[:3]
            fingerprint_data += ":" + "".join(stack_lines)
        return hashlib.md5(fingerprint_data.encode()).hexdigest()
    
    def _is_duplicate(self, fingerprint: str) -> bool:
        """Check if error is duplicate within time window."""
        if fingerprint not in self._error_hashes:
            return False
        
        last_seen = self._error_hashes[fingerprint]
        time_since = (datetime.utcnow() - last_seen).total_seconds()
        
        return time_since < self._config.deduplication_window_seconds
    
    def _enrich_stack_trace(self, stack_trace: str) -> str:
        """Enrich stack trace with additional formatting."""
        lines = stack_trace.split('\n')
        # Limit stack depth
        max_depth = self._config.max_stack_trace_depth
        if len(lines) > max_depth:
            lines = lines[:max_depth] + [f"... ({len(lines) - max_depth} more frames)"]
        return '\n'.join(lines)
    
    def _severity_to_log_level(self, severity: str) -> int:
        """Convert severity string to logging level."""
        severity_map = {
            "debug": 10,    # logging.DEBUG
            "info": 20,     # logging.INFO
            "warning": 30,  # logging.WARNING
            "error": 40,    # logging.ERROR
            "critical": 50  # logging.CRITICAL
        }
        return severity_map.get(severity, 40)
    
    def _export_to_backend(self, backend: str, error_report: Dict[str, Any]) -> None:
        """Export single error to backend."""
        if backend == "sentry":
            self._export_to_sentry(error_report)
        elif backend == "rollbar":
            self._export_to_rollbar(error_report)
        elif backend == "cloudwatch":
            self._export_to_cloudwatch(error_report)
        elif backend == "local":
            self._export_to_local(error_report)
    
    def _export_to_sentry(self, error_report: Dict[str, Any]) -> None:
        """Export error to Sentry."""
        if not self._config.sentry_dsn:
            return
        
        # Format for Sentry SDK
        # In production, this would use sentry_sdk
        sentry_event = {
            "message": error_report["error_message"],
            "level": error_report["severity"],
            "exception": {
                "type": error_report["error_type"],
                "value": error_report["error_message"],
                "stacktrace": {"frames": self._parse_stack_trace(error_report.get("stack_trace", ""))}
            },
            "user": error_report.get("user_context", {}),
            "tags": error_report.get("tags", {}),
            "contexts": {
                "custom": error_report.get("context", {})
            },
            "breadcrumbs": error_report.get("breadcrumbs", [])
        }
        
        self._logger.debug(
            f"Sentry export (simulated): {error_report['error_id']}",
            extra={"sentry_event": sentry_event}
        )
    
    def _export_to_rollbar(self, error_report: Dict[str, Any]) -> None:
        """Export error to Rollbar."""
        if not self._config.rollbar_access_token:
            return
        
        # Format for Rollbar API
        rollbar_payload = {
            "access_token": self._config.rollbar_access_token,
            "data": {
                "environment": self._tags.get("environment", "production"),
                "level": error_report["severity"],
                "timestamp": error_report["timestamp"],
                "body": {
                    "message": {
                        "body": error_report["error_message"]
                    }
                },
                "custom": error_report.get("context", {}),
                "person": error_report.get("user_context", {})
            }
        }
        
        self._logger.debug(
            f"Rollbar export (simulated): {error_report['error_id']}",
            extra={"rollbar_payload": rollbar_payload}
        )
    
    def _export_to_cloudwatch(self, error_report: Dict[str, Any]) -> None:
        """Export error to CloudWatch Logs."""
        # Format for CloudWatch Logs API
        log_event = {
            "message": json.dumps(error_report),
            "timestamp": int(datetime.utcnow().timestamp() * 1000)
        }
        
        self._logger.debug(
            f"CloudWatch export (simulated): {error_report['error_id']}",
            extra={
                "log_group": self._config.cloudwatch_log_group,
                "log_stream": "error-stream",
                "region": self._config.cloudwatch_region
            }
        )
    
    def _export_to_local(self, error_report: Dict[str, Any]) -> None:
        """Export error to local logging."""
        self._logger.error(
            f"Error Report: {error_report['error_message']}",
            extra={
                "error_id": error_report["error_id"],
                "error_type": error_report["error_type"],
                "severity": error_report["severity"],
                "full_report": error_report
            }
        )
    
    def _export_to_sentry_batch(self, errors: List[Dict[str, Any]]) -> bool:
        """Batch export to Sentry."""
        for error in errors:
            self._export_to_sentry(error)
        self._logger.info(f"Exported {len(errors)} errors to Sentry")
        return True
    
    def _export_to_rollbar_batch(self, errors: List[Dict[str, Any]]) -> bool:
        """Batch export to Rollbar."""
        for error in errors:
            self._export_to_rollbar(error)
        self._logger.info(f"Exported {len(errors)} errors to Rollbar")
        return True
    
    def _export_to_cloudwatch_batch(self, errors: List[Dict[str, Any]]) -> bool:
        """Batch export to CloudWatch."""
        for error in errors:
            self._export_to_cloudwatch(error)
        self._logger.info(f"Exported {len(errors)} errors to CloudWatch")
        return True
    
    def _export_to_local_batch(self, errors: List[Dict[str, Any]]) -> bool:
        """Batch export to local logging."""
        for error in errors:
            self._export_to_local(error)
        self._logger.info(f"Exported {len(errors)} errors to local logs")
        return True
    
    def _parse_stack_trace(self, stack_trace: str) -> List[Dict[str, Any]]:
        """Parse stack trace string into structured frames."""
        if not stack_trace:
            return []
        
        frames = []
        lines = stack_trace.split('\n')
        
        for line in lines:
            line = line.strip()
            if not line or line.startswith('Traceback'):
                continue
            
            # Simple parsing (could be enhanced)
            frame = {
                "filename": "unknown",
                "lineno": 0,
                "function": "unknown",
                "code": line
            }
            frames.append(frame)
        
        return frames
    
    def _notify_subscribers(self, error_report: Dict[str, Any]) -> None:
        """Notify subscribers of new error."""
        for subscription_id, subscriber in self._subscribers.items():
            try:
                severity_filter = subscriber.get("severity_filter")
                if severity_filter and error_report["severity"] != severity_filter:
                    continue
                
                callback = subscriber["callback"]
                callback(error_report)
            except Exception as e:
                self._logger.error(
                    f"Error notifying subscriber {subscription_id}: {str(e)}"
                )
