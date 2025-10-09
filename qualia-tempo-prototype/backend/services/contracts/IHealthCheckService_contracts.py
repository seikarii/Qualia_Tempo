"""
IHealthCheckService Contracts - Configuration Dataclass
QUALIA.CODE v1.1 Compliance - Phase 6.5

Configuration contract for HealthCheckService.
"""

from dataclasses import dataclass


@dataclass
class HealthCheckServiceConfig:
    """
    Configuration for HealthCheckService.
    
    Organized into 4 categories:
    1. Health Check Settings - Core check behavior
    2. Dependency Management - Failure tracking and caching
    3. Probe Configuration - Kubernetes readiness/liveness
    4. Monitoring & Degradation - Metrics and graceful degradation
    """
    
    # --- Health Check Settings ---
    enable_health_checks: bool = True
    check_interval_seconds: float = 30.0
    check_timeout_seconds: float = 5.0
    
    # --- Dependency Management ---
    max_consecutive_failures: int = 3
    failure_reset_interval_seconds: float = 300.0
    enable_dependency_caching: bool = True
    
    # --- Probe Configuration ---
    enable_readiness_probe: bool = True
    enable_liveness_probe: bool = True
    startup_grace_period_seconds: float = 60.0
    
    # --- Monitoring & Degradation ---
    enable_graceful_degradation: bool = True
    degraded_mode_timeout_seconds: float = 3600.0
    enable_health_metrics: bool = True
