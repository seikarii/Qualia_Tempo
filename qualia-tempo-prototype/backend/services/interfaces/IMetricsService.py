# QUALIA.CODE v1.1 - IMetricsService Interface
from typing import Protocol, Dict, Any, List, Optional

class IMetricsService(Protocol):
    """Interface for metrics collection service."""
    
    def record_metric(self, name: str, value: float, tags: Optional[Dict[str, str]] = None) -> None:
        """Record a metric."""
        ...
    
    def get_metrics_summary(self) -> Dict[str, Any]:
        """Get summary of all metrics."""
        ...
