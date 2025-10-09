"""
IHealthCheckService - Health Check Interface
QUALIA.CODE v1.1 Compliance - Phase 6.5

Protocol interface for centralized health checking and monitoring.
"""

from typing import Protocol, Callable, Awaitable, Dict, Any, Optional
from datetime import datetime
from enum import Enum
from dataclasses import dataclass


class HealthStatus(Enum):
    """Overall health status of the service."""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    STARTING = "starting"


class CheckStatus(Enum):
    """Individual check result status."""
    PASS = "pass"
    FAIL = "fail"
    TIMEOUT = "timeout"
    SKIP = "skip"


@dataclass
class DependencyCheckResult:
    """Result of an individual dependency health check."""
    name: str
    status: CheckStatus
    is_critical: bool
    last_check_time: datetime
    error_message: Optional[str]
    duration_ms: float


@dataclass
class HealthCheckResult:
    """Complete health check result with all dependency checks."""
    status: HealthStatus
    checks: Dict[str, DependencyCheckResult]
    timestamp: datetime
    degraded_reason: Optional[str]


class IHealthCheckService(Protocol):
    """
    Health Check Service Protocol.
    
    Provides centralized health checking with:
    - Dependency registration and monitoring
    - Kubernetes readiness/liveness probes
    - Graceful degradation support
    - Async health checks with timeouts
    """
    
    def register_dependency_check(
        self,
        name: str,
        check_function: Callable[[], Awaitable[bool]],
        is_critical: bool = True,
        timeout_seconds: float = 5.0
    ) -> None:
        """
        Register a dependency health check.
        
        Args:
            name: Unique name for this dependency
            check_function: Async function that returns True if healthy
            is_critical: If True, failure marks service as UNHEALTHY.
                        If False, failure marks service as DEGRADED.
            timeout_seconds: Maximum time to wait for check
        """
        ...
    
    async def check_health(self) -> HealthCheckResult:
        """
        Run all registered health checks.
        
        Returns:
            HealthCheckResult with overall status and individual check results
        """
        ...
    
    async def check_readiness(self) -> bool:
        """
        Kubernetes readiness probe.
        
        Returns True if service is ready to accept traffic.
        Returns False during startup grace period or if critical checks fail.
        
        Returns:
            bool: True if ready, False otherwise
        """
        ...
    
    async def check_liveness(self) -> bool:
        """
        Kubernetes liveness probe.
        
        Returns True if service process is alive and responsive.
        Returns False only if service is completely unresponsive.
        
        Returns:
            bool: True if alive, False otherwise
        """
        ...
    
    async def get_health_report(self) -> Dict[str, Any]:
        """
        Get detailed health report with all check results.
        
        Returns:
            Dict with keys: status, checks, timestamp, degraded_reason,
            startup_time, uptime_seconds
        """
        ...
    
    async def get_dependency_status(self, name: str) -> Optional[DependencyCheckResult]:
        """
        Get status of a specific dependency.
        
        Args:
            name: Dependency name
            
        Returns:
            DependencyCheckResult if dependency exists, None otherwise
        """
        ...
    
    def set_degraded_mode(
        self,
        reason: str,
        until: Optional[datetime] = None
    ) -> None:
        """
        Manually set service to degraded mode.
        
        Useful for maintenance windows or known issues.
        
        Args:
            reason: Why service is degraded
            until: When to auto-clear degraded mode (None = manual clear)
        """
        ...
    
    def clear_degraded_mode(self) -> None:
        """Clear manually-set degraded mode."""
        ...
