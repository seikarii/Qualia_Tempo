"""
MockHealthCheckService - High-Fidelity Mock
QUALIA.CODE v1.1 Compliance - Phase 6.5

High-fidelity mock for testing health check scenarios.
"""

from typing import Callable, Awaitable, Dict, Any, Optional, List
from datetime import datetime

from backend.services.interfaces.IHealthCheckService import (
    HealthCheckResult,
    DependencyCheckResult,
    HealthStatus,
    CheckStatus
)


class MockHealthCheckService:
    """
    High-fidelity mock for IHealthCheckService.
    
    Features:
    - Full call tracking for all 8 methods
    - Stateful behavior (stores registered checks, simulates failures)
    - 10 test helper methods for assertions
    """
    
    def __init__(self, config: Any, logger: Any):
        """Initialize mock with config and logger."""
        self._config = config
        self._logger = logger
        
        # Call tracking
        self.register_dependency_check_calls: List[Dict[str, Any]] = []
        self.check_health_calls: int = 0
        self.check_readiness_calls: int = 0
        self.check_liveness_calls: int = 0
        self.get_health_report_calls: int = 0
        self.get_dependency_status_calls: List[str] = []
        self.set_degraded_mode_calls: List[Dict[str, Any]] = []
        self.clear_degraded_mode_calls: int = 0
        
        # Mock state
        self._registered_checks: Dict[str, Dict[str, Any]] = {}
        self._simulated_failures: set = set()
        self._degraded_mode_active = False
        self._degraded_reason: Optional[str] = None
        self._startup_time = datetime.utcnow()
    
    def register_dependency_check(
        self,
        name: str,
        check_function: Callable[[], Awaitable[bool]],
        is_critical: bool = True,
        timeout_seconds: float = 5.0
    ) -> None:
        """Mock register_dependency_check with registration tracking."""
        self.register_dependency_check_calls.append({
            "name": name,
            "is_critical": is_critical,
            "timeout_seconds": timeout_seconds,
            "timestamp": datetime.utcnow()
        })
        
        self._registered_checks[name] = {
            "check_function": check_function,
            "is_critical": is_critical,
            "timeout_seconds": timeout_seconds
        }
    
    async def check_health(self) -> HealthCheckResult:
        """Mock check_health with simulated check results."""
        self.check_health_calls += 1
        
        checks = {}
        for name, check_info in self._registered_checks.items():
            # Simulate failure if requested
            if name in self._simulated_failures:
                status = CheckStatus.FAIL
                error_message = "Simulated failure"
            else:
                status = CheckStatus.PASS
                error_message = None
            
            checks[name] = DependencyCheckResult(
                name=name,
                status=status,
                is_critical=check_info["is_critical"],
                last_check_time=datetime.utcnow(),
                error_message=error_message,
                duration_ms=10.0
            )
        
        # Determine overall status
        if self._degraded_mode_active:
            overall_status = HealthStatus.DEGRADED
        elif any(c.status == CheckStatus.FAIL and c.is_critical for c in checks.values()):
            overall_status = HealthStatus.UNHEALTHY
        elif any(c.status == CheckStatus.FAIL for c in checks.values()):
            overall_status = HealthStatus.DEGRADED
        else:
            overall_status = HealthStatus.HEALTHY
        
        return HealthCheckResult(
            status=overall_status,
            checks=checks,
            timestamp=datetime.utcnow(),
            degraded_reason=self._degraded_reason
        )
    
    async def check_readiness(self) -> bool:
        """Mock check_readiness."""
        self.check_readiness_calls += 1
        
        # Not ready if any critical check failed
        for name, check_info in self._registered_checks.items():
            if check_info["is_critical"] and name in self._simulated_failures:
                return False
        
        return True
    
    async def check_liveness(self) -> bool:
        """Mock check_liveness."""
        self.check_liveness_calls += 1
        
        # Always alive in mock unless explicitly simulated
        return True
    
    async def get_health_report(self) -> Dict[str, Any]:
        """Mock get_health_report with full report."""
        self.get_health_report_calls += 1
        
        health_result = await self.check_health()
        
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
            "uptime_seconds": (datetime.utcnow() - self._startup_time).total_seconds(),
            "registered_checks": len(self._registered_checks)
        }
    
    async def get_dependency_status(self, name: str) -> Optional[DependencyCheckResult]:
        """Mock get_dependency_status for specific dependency."""
        self.get_dependency_status_calls.append(name)
        
        if name not in self._registered_checks:
            return None
        
        check_info = self._registered_checks[name]
        
        if name in self._simulated_failures:
            status = CheckStatus.FAIL
            error_message = "Simulated failure"
        else:
            status = CheckStatus.PASS
            error_message = None
        
        return DependencyCheckResult(
            name=name,
            status=status,
            is_critical=check_info["is_critical"],
            last_check_time=datetime.utcnow(),
            error_message=error_message,
            duration_ms=10.0
        )
    
    def set_degraded_mode(
        self,
        reason: str,
        until: Optional[datetime] = None
    ) -> None:
        """Mock set_degraded_mode."""
        self.set_degraded_mode_calls.append({
            "reason": reason,
            "until": until,
            "timestamp": datetime.utcnow()
        })
        
        self._degraded_mode_active = True
        self._degraded_reason = reason
    
    def clear_degraded_mode(self) -> None:
        """Mock clear_degraded_mode."""
        self.clear_degraded_mode_calls += 1
        self._degraded_mode_active = False
        self._degraded_reason = None
    
    # --- Test Helper Methods ---
    
    def was_dependency_registered(self, name: str) -> bool:
        """Check if specific dependency was registered."""
        return name in self._registered_checks
    
    def get_registered_dependency_count(self) -> int:
        """Get count of registered dependencies."""
        return len(self._registered_checks)
    
    def simulate_dependency_failure(self, name: str) -> None:
        """Simulate a dependency check failure for testing."""
        if name in self._registered_checks:
            self._simulated_failures.add(name)
    
    def simulate_dependency_success(self, name: str) -> None:
        """Clear simulated failure for a dependency."""
        self._simulated_failures.discard(name)
    
    def was_health_checked(self) -> bool:
        """Check if health check was called."""
        return self.check_health_calls > 0
    
    def get_health_check_count(self) -> int:
        """Get number of health check calls."""
        return self.check_health_calls
    
    def get_current_health_status(self) -> str:
        """Get current mock health status."""
        if self._degraded_mode_active:
            return "degraded"
        elif any(
            name in self._simulated_failures and check["is_critical"]
            for name, check in self._registered_checks.items()
        ):
            return "unhealthy"
        elif self._simulated_failures:
            return "degraded"
        else:
            return "healthy"
    
    def is_degraded_mode_active(self) -> bool:
        """Check if degraded mode is active."""
        return self._degraded_mode_active
    
    def get_failed_dependencies(self) -> List[str]:
        """Get list of dependencies with simulated failures."""
        return list(self._simulated_failures)
    
    def reset(self) -> None:
        """Reset all call tracking and state for test isolation."""
        self.register_dependency_check_calls.clear()
        self.check_health_calls = 0
        self.check_readiness_calls = 0
        self.check_liveness_calls = 0
        self.get_health_report_calls = 0
        self.get_dependency_status_calls.clear()
        self.set_degraded_mode_calls.clear()
        self.clear_degraded_mode_calls = 0
        
        self._registered_checks.clear()
        self._simulated_failures.clear()
        self._degraded_mode_active = False
        self._degraded_reason = None
        self._startup_time = datetime.utcnow()
