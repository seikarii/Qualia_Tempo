"""
ErrorReportingService Configuration Contract
QUALIA.CODE v1.1 Compliance - Phase 6.4

Dataclass configuration for error reporting service.
"""

from dataclasses import dataclass, field
from typing import List, Dict, Any


@dataclass
class ErrorReportingServiceConfig:
    """
    Configuration contract for ErrorReportingService.
    
    Defines all configuration parameters for error reporting, aggregation,
    and backend integrations.
    """
    
    # --- Storage Configuration ---
    max_errors_stored: int = 1000
    """Maximum number of errors to store in memory."""
    
    max_breadcrumbs: int = 100
    """Maximum number of breadcrumbs to maintain."""
    
    enable_error_persistence: bool = False
    """Enable persisting errors to disk/database."""
    
    # --- Backend Integration ---
    enabled_backends: List[str] = field(default_factory=lambda: ["local"])
    """List of enabled backends: sentry, rollbar, cloudwatch, local."""
    
    sentry_dsn: str = ""
    """Sentry DSN for error reporting."""
    
    rollbar_access_token: str = ""
    """Rollbar access token."""
    
    cloudwatch_log_group: str = "qualia-tempo-errors"
    """CloudWatch log group name."""
    
    cloudwatch_region: str = "us-east-1"
    """CloudWatch AWS region."""
    
    # --- Error Processing ---
    enable_deduplication: bool = True
    """Enable error deduplication (same error within time window)."""
    
    deduplication_window_seconds: int = 300
    """Time window for error deduplication (5 minutes default)."""
    
    enable_stack_trace_enrichment: bool = True
    """Enable automatic stack trace enrichment and formatting."""
    
    max_stack_trace_depth: int = 50
    """Maximum stack trace depth to capture."""
    
    # --- Rate Limiting ---
    enable_rate_limiting: bool = True
    """Enable rate limiting to prevent error flooding."""
    
    max_errors_per_minute: int = 100
    """Maximum errors to report per minute."""
    
    # --- Monitoring ---
    enable_error_metrics: bool = True
    """Enable automatic error rate metrics."""
    
    enable_real_time_alerts: bool = False
    """Enable real-time alerting for critical errors."""
