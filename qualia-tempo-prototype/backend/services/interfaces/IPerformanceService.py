"""
IPerformanceService Interface
QUALIA.CODE v1.1 Compliance - Phase 6.1

Performance monitoring and metrics collection service interface.
Tracks execution times, bottlenecks, and resource usage.
"""

from typing import Protocol, Dict, Any, Optional, List
from datetime import datetime


class IPerformanceService(Protocol):
    """
    Interface for performance monitoring and metrics collection.
    
    Responsibilities:
    - Track method execution times
    - Monitor resource usage (CPU, memory)
    - Detect performance bottlenecks
    - Provide performance reports
    - Alert on performance degradation
    """
    
    def start_measurement(self, operation_name: str, metadata: Optional[Dict[str, Any]] = None) -> str:
        """
        Start measuring execution time for an operation.
        
        Args:
            operation_name: Name of operation being measured
            metadata: Optional metadata about the operation
            
        Returns:
            measurement_id: Unique identifier for this measurement
        """
        ...
    
    def end_measurement(self, measurement_id: str) -> float:
        """
        End measurement and record execution time.
        
        Args:
            measurement_id: ID returned from start_measurement
            
        Returns:
            duration_ms: Execution time in milliseconds
        """
        ...
    
    def record_metric(self, metric_name: str, value: float, tags: Optional[Dict[str, str]] = None) -> None:
        """
        Record a custom metric value.
        
        Args:
            metric_name: Name of the metric
            value: Metric value
            tags: Optional tags for metric categorization
        """
        ...
    
    def get_metrics(self, metric_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Get recorded metrics.
        
        Args:
            metric_name: Optional specific metric to retrieve
            
        Returns:
            Dictionary of metrics and their statistics
        """
        ...
    
    def get_slow_operations(self, threshold_ms: float = 100.0, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get slowest operations exceeding threshold.
        
        Args:
            threshold_ms: Minimum duration in ms to be considered slow
            limit: Maximum number of results
            
        Returns:
            List of slow operations with details
        """
        ...
    
    def get_resource_usage(self) -> Dict[str, Any]:
        """
        Get current resource usage statistics.
        
        Returns:
            Dictionary with CPU, memory, and other resource metrics
        """
        ...
    
    def reset_metrics(self) -> None:
        """Reset all collected metrics and measurements."""
        ...
    
    def export_metrics(self, format: str = "json") -> str:
        """
        Export metrics in specified format.
        
        Args:
            format: Output format ("json", "prometheus", "csv")
            
        Returns:
            Formatted metrics string
        """
        ...
