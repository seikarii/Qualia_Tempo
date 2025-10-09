"""
HealthCheckService - Health Check Implementation
QUALIA.CODE v1.1 Compliance - Phase 6.5

Centralized health checking with dependency monitoring, Kubernetes probes,
and graceful degradation support.
"""

from typing import Callable, Awaitable, Dict, Any, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass
import asyncio
import time

from .interfaces.IHealthCheckService import (
    IHealthCheckService,
    HealthCheckResult,
    DependencyCheckResult,
    HealthStatus,
    CheckStatus
)
from .contracts.IHealthCheckService_contracts import HealthCheckServiceConfig
from .interfaces.ILogger import ILogger
from ..utils.decorators import log_execution


@dataclass
class DependencyCheck:
    """Internal representation of a registered dependency check."""
    name: str
    check_function: Callable[[], Awaitable[bool]]
    is_critical: bool
    timeout_seconds: float
    consecutive_failures: int = 0
    last_failure_time: Optional[datetime] = None


@dataclass
class DegradedModeState:
    """State for manually-set degraded mode."""
    reason: str
    since: datetime
    until: Optional[datetime]


class HealthCheckService:
    """
    Health Check Service Implementation.
    
    Features:
    - Async dependency checks with timeouts
    - Failure tracking with consecutive failure limits
    - Result caching with TTL
    - Startup grace period
    - Graceful degradation support
    - Kubernetes readiness/liveness probes
    """
    
    def __init__(
        self,
        config: HealthCheckServiceConfig,
        logger: ILogger
    ):
        """Initialize HealthCheckService."""
        self._config = config
        self._logger = logger
        
        # Dependency registry
        self._dependency_checks: Dict[str, DependencyCheck] = {}
        
        # Check result cache
        self._check_results_cache: Dict[str, DependencyCheckResult] = {}
        self._cache_timestamp: Optional[datetime] = None
        
        # Degraded mode state
        self._degraded_mode: Optional[DegradedModeState] = None
        
        # Startup tracking
        self._startup_time = datetime.utcnow()
        
        # Last full check
        self._last_full_check: Optional[datetime] = None
        
        self._logger.info(
            "HealthCheckService initialized",
            {
                "check_interval": self._config.check_interval_seconds,
                "startup_grace_period": self._config.startup_grace_period_seconds,
                "enable_graceful_degradation": self._config.enable_graceful_degradation
            }
        )
    
    @log_execution(level="INFO")
    @log_execution(level="INFO")
    def register_dependency_check(
        self,
        name: str,
        check_function: Callable[[], Awaitable[bool]],
        is_critical: bool = True,
        timeout_seconds: float = 5.0
    ) -> None:
        """Register a dependency health check."""
        if name in self._dependency_checks:
            self._logger.warning(
                f"Dependency check '{name}' already registered, overwriting",
                {"name": name}
            )
        
        self._dependency_checks[name] = DependencyCheck(
            name=name,
            check_function=check_function,
            is_critical=is_critical,
            timeout_seconds=timeout_seconds
        )
        
        self._logger.info(
            f"Registered dependency check: {name}",
            {"name": name, "is_critical": is_critical, "timeout": timeout_seconds}
        )
    
    async def check_health(self) -> HealthCheckResult:
        """Run all registered health checks."""
        if not self._config.enable_health_checks:
            return HealthCheckResult(
                status=HealthStatus.HEALTHY,
                checks={},
                timestamp=datetime.utcnow(),
                degraded_reason=None
            )
        
        # Check if in startup grace period
        if self._is_in_grace_period():
            return HealthCheckResult(
                status=HealthStatus.STARTING,
                checks={},
                timestamp=datetime.utcnow(),
                degraded_reason=None
            )
        
        # Check cache
        if self._config.enable_dependency_caching and self._is_cache_valid():
            return self._build_health_result_from_cache()
        
        # Run all checks in parallel
        check_results = await self._run_all_checks()
        
        # Update cache
        self._check_results_cache = check_results
        self._cache_timestamp = datetime.utcnow()
        self._last_full_check = datetime.utcnow()
        
        # Determine overall status
        status = self._determine_health_status(check_results)
        
        return HealthCheckResult(
            status=status,
            checks=check_results,
            timestamp=datetime.utcnow(),
            degraded_reason=self._degraded_mode.reason if self._degraded_mode else None
        )
    
    async def check_readiness(self) -> bool:
        """Kubernetes readiness probe."""
        if not self._config.enable_readiness_probe:
            return True
        
        # Not ready during grace period
        if self._is_in_grace_period():
            return False
        
        # Not ready if unhealthy
        health_result = await self.check_health()
        return health_result.status != HealthStatus.UNHEALTHY
    
    async def check_liveness(self) -> bool:
        """Kubernetes liveness probe."""
        if not self._config.enable_liveness_probe:
            return True
        
        # Liveness only fails if process is completely unresponsive
        # We're responsive if we can return this value
        return True
    
    async def get_health_report(self) -> Dict[str, Any]:
        """Get detailed health report."""
        health_result = await self.check_health()
        
        uptime = (datetime.utcnow() - self._startup_time).total_seconds()
        
        return {
            "status": health_result.status.value,
            "checks": {
                name: {
                    "status": check.status.value,
                    "is_critical": check.is_critical,
                    "last_check_time": check.last_check_time.isoformat(),
                    "error_message": check.error_message,
                    "duration_ms": check.duration_ms
                }
                for name, check in health_result.checks.items()
            },
            "timestamp": health_result.timestamp.isoformat(),
            "degraded_reason": health_result.degraded_reason,
            "startup_time": self._startup_time.isoformat(),
            "uptime_seconds": uptime,
            "registered_checks": len(self._dependency_checks)
        }
    
    async def get_dependency_status(self, name: str) -> Optional[DependencyCheckResult]:
        """Get status of a specific dependency."""
        if name not in self._dependency_checks:
            return None
        
        # Return cached result if available
        if name in self._check_results_cache and self._is_cache_valid():
            return self._check_results_cache[name]
        
        # Run specific check
        dependency = self._dependency_checks[name]
        result = await self._run_single_check(dependency)
        
        # Update cache
        self._check_results_cache[name] = result
        
        return result
    
    @log_execution(level="INFO")
    @log_execution(level="INFO")
    def set_degraded_mode(
        self,
        reason: str,
        until: Optional[datetime] = None
    ) -> None:
        """Manually set service to degraded mode."""
        self._degraded_mode = DegradedModeState(
            reason=reason,
            since=datetime.utcnow(),
            until=until
        )
        
        self._logger.warning(
            f"Service set to degraded mode: {reason}",
            {"reason": reason, "until": until.isoformat() if until else None}
        )
    @log_execution(level="INFO")
    
    @log_execution(level="INFO")
    def clear_degraded_mode(self) -> None:
        """Clear manually-set degraded mode."""
        if self._degraded_mode:
            self._logger.info(
                "Degraded mode cleared",
                {"previous_reason": self._degraded_mode.reason}
            )
            self._degraded_mode = None
    
    # --- Helper Methods ---
    
    def _is_in_grace_period(self) -> bool:
        """Check if still in startup grace period."""
        uptime = (datetime.utcnow() - self._startup_time).total_seconds()
        return uptime < self._config.startup_grace_period_seconds
    
    def _is_cache_valid(self) -> bool:
        """Check if cached results are still valid."""
        if not self._cache_timestamp:
            return False
        
        age = (datetime.utcnow() - self._cache_timestamp).total_seconds()
        return age < self._config.check_interval_seconds
    
    def _build_health_result_from_cache(self) -> HealthCheckResult:
        """Build HealthCheckResult from cached data."""
        status = self._determine_health_status(self._check_results_cache)
        
        return HealthCheckResult(
            status=status,
            checks=self._check_results_cache.copy(),
            timestamp=datetime.utcnow(),
            degraded_reason=self._degraded_mode.reason if self._degraded_mode else None
        )
    
    async def _run_all_checks(self) -> Dict[str, DependencyCheckResult]:
        """Run all registered dependency checks in parallel."""
        if not self._dependency_checks:
            return {}
        
        # Create tasks for all checks
        tasks = [
            self._run_single_check(dependency)
            for dependency in self._dependency_checks.values()
        ]
        
        # Run in parallel
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Build results dict
        check_results: Dict[str, DependencyCheckResult] = {}
        for i, dependency in enumerate(self._dependency_checks.values()):
            result = results[i]
            if isinstance(result, BaseException):
                # Unexpected error during check execution
                check_results[dependency.name] = DependencyCheckResult(
                    name=dependency.name,
                    status=CheckStatus.FAIL,
                    is_critical=dependency.is_critical,
                    last_check_time=datetime.utcnow(),
                    error_message=f"Check execution error: {str(result)}",
                    duration_ms=0.0
                )
            elif isinstance(result, DependencyCheckResult):
                check_results[dependency.name] = result
            else:
                # Should never happen, but handle gracefully
                check_results[dependency.name] = DependencyCheckResult(
                    name=dependency.name,
                    status=CheckStatus.FAIL,
                    is_critical=dependency.is_critical,
                    last_check_time=datetime.utcnow(),
                    error_message=f"Unexpected result type: {type(result)}",
                    duration_ms=0.0
                )
        
        return check_results
    
    async def _run_single_check(self, dependency: DependencyCheck) -> DependencyCheckResult:
        """Run a single dependency check with timeout."""
        start_time = time.perf_counter()
        
        try:
            # Run check with timeout
            is_healthy = await asyncio.wait_for(
                dependency.check_function(),
                timeout=dependency.timeout_seconds
            )
            
            duration_ms = (time.perf_counter() - start_time) * 1000
            
            if is_healthy:
                # Success - reset failure counter
                dependency.consecutive_failures = 0
                dependency.last_failure_time = None
                
                return DependencyCheckResult(
                    name=dependency.name,
                    status=CheckStatus.PASS,
                    is_critical=dependency.is_critical,
                    last_check_time=datetime.utcnow(),
                    error_message=None,
                    duration_ms=duration_ms
                )
            else:
                # Check returned False
                return self._handle_check_failure(
                    dependency,
                    "Check returned False",
                    duration_ms
                )
        
        except asyncio.TimeoutError:
            # Timeout
            duration_ms = dependency.timeout_seconds * 1000
            return self._handle_check_failure(
                dependency,
                f"Check timed out after {dependency.timeout_seconds}s",
                duration_ms,
                CheckStatus.TIMEOUT
            )
        
        except Exception as e:
            # Unexpected error
            duration_ms = (time.perf_counter() - start_time) * 1000
            return self._handle_check_failure(
                dependency,
                f"Check failed with exception: {str(e)}",
                duration_ms
            )
    
    def _handle_check_failure(
        self,
        dependency: DependencyCheck,
        error_message: str,
        duration_ms: float,
        status: CheckStatus = CheckStatus.FAIL
    ) -> DependencyCheckResult:
        """Handle a failed dependency check."""
        # Increment failure counter
        dependency.consecutive_failures += 1
        dependency.last_failure_time = datetime.utcnow()
        
        # Log failure
        self._logger.warning(
            f"Dependency check failed: {dependency.name}",
            {
                "dependency": dependency.name,
                "is_critical": dependency.is_critical,
                "consecutive_failures": dependency.consecutive_failures,
                "error": error_message
            }
        )
        
        return DependencyCheckResult(
            name=dependency.name,
            status=status,
            is_critical=dependency.is_critical,
            last_check_time=datetime.utcnow(),
            error_message=error_message,
            duration_ms=duration_ms
        )
    
    def _determine_health_status(
        self,
        check_results: Dict[str, DependencyCheckResult]
    ) -> HealthStatus:
        """Determine overall health status from check results."""
        # Check manual degraded mode
        if self._degraded_mode:
            # Check if degraded mode has expired
            if self._degraded_mode.until:
                if datetime.utcnow() > self._degraded_mode.until:
                    self.clear_degraded_mode()
                else:
                    return HealthStatus.DEGRADED
            else:
                return HealthStatus.DEGRADED
        
        if not check_results:
            return HealthStatus.HEALTHY
        
        # Check for critical failures
        critical_failures = [
            check for check in check_results.values()
            if check.is_critical and check.status != CheckStatus.PASS
        ]
        
        if critical_failures:
            # Check if failures exceed threshold
            for check in critical_failures:
                dependency = self._dependency_checks.get(check.name)
                if dependency and dependency.consecutive_failures >= self._config.max_consecutive_failures:
                    return HealthStatus.UNHEALTHY
        
        # Check for non-critical failures (degraded)
        if self._config.enable_graceful_degradation:
            non_critical_failures = [
                check for check in check_results.values()
                if not check.is_critical and check.status != CheckStatus.PASS
            ]
            
            if non_critical_failures:
                return HealthStatus.DEGRADED
        
        return HealthStatus.HEALTHY
