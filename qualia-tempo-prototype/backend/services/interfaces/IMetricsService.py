"""
IMetricsService Interface
QUALIA.CODE v1.1 Compliance - Phase 6.3

Protocol interface for centralized metrics aggregation service.
Provides multi-backend support (Prometheus, StatsD, CloudWatch).
"""

from typing import Protocol, Dict, Any, List, Optional, Callable
from datetime import datetime


class IMetricsService(Protocol):
    """
    Protocol interface for metrics aggregation and export.
    
    Supports multiple metric types:
    - Counter: Monotonically increasing value
    - Gauge: Instantaneous value that can go up or down
    - Histogram: Distribution of values over time
    """
    
    def record_counter(
        self,
        metric_name: str,
        increment: float = 1.0,
        tags: Optional[Dict[str, str]] = None
    ) -> None:
        """
        Record a counter metric (monotonically increasing).
        
        Args:
            metric_name: Name of the counter metric
            increment: Value to increment by (default 1.0)
            tags: Optional tags for metric dimensions
        """
        ...
    
    def record_gauge(
        self,
        metric_name: str,
        value: float,
        tags: Optional[Dict[str, str]] = None
    ) -> None:
        """
        Record a gauge metric (instantaneous value).
        
        Args:
            metric_name: Name of the gauge metric
            value: Current value
            tags: Optional tags for metric dimensions
        """
        ...
    
    def record_histogram(
        self,
        metric_name: str,
        value: float,
        tags: Optional[Dict[str, str]] = None
    ) -> None:
        """
        Record a histogram value (for distribution analysis).
        
        Args:
            metric_name: Name of the histogram metric
            value: Observed value
            tags: Optional tags for metric dimensions
        """
        ...
    
    def get_metric(
        self,
        metric_name: str,
        metric_type: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get current value and metadata for a specific metric.
        
        Args:
            metric_name: Name of the metric
            metric_type: Type of metric ('counter', 'gauge', 'histogram')
            
        Returns:
            Dictionary with metric data or None if not found
        """
        ...
    
    def get_all_metrics(self) -> Dict[str, Any]:
        """
        Get all metrics organized by type.
        
        Returns:
            Dictionary with keys: counters, gauges, histograms
        """
        ...
    
    def export_to_backend(self, backend_name: str) -> str:
        """
        Export metrics to specified backend format.
        
        Args:
            backend_name: Backend name ('prometheus', 'statsd', 'cloudwatch', 'json')
            
        Returns:
            Formatted metrics string for the backend
        """
        ...
    
    def reset_metrics(self, metric_type: Optional[str] = None) -> int:
        """
        Reset metrics (all or by type).
        
        Args:
            metric_type: Type to reset ('counter', 'gauge', 'histogram') or None for all
            
        Returns:
            Number of metrics reset
        """
        ...
    
    def subscribe_to_updates(
        self,
        callback: Callable[[str, str, float], None],
        metric_filter: Optional[str] = None
    ) -> str:
        """
        Subscribe to real-time metric updates.
        
        Args:
            callback: Function called when metrics update (metric_name, metric_type, value)
            metric_filter: Optional regex pattern to filter metrics
            
        Returns:
            Subscription ID for unsubscribing
        """
        ...
    
    def unsubscribe(self, subscription_id: str) -> bool:
        """
        Unsubscribe from metric updates.
        
        Args:
            subscription_id: ID returned from subscribe_to_updates
            
        Returns:
            True if unsubscribed successfully
        """
        ...
