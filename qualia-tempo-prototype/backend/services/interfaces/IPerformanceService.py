# QUALIA.CODE v1.1 - IPerformanceService Interface
from typing import Protocol, Any, Dict

class IPerformanceService(Protocol):
    """Interface for performance monitoring service."""
    
    def record_metric(self, metric_name: str, value: float) -> None:
        """Record a performance metric."""
        ...
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get all recorded metrics."""
        ...
