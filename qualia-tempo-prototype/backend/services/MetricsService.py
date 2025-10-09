"""
MetricsService Implementation
QUALIA.CODE v1.1 Compliance - Phase 6.3

Centralized metrics aggregation with multi-backend support.
"""

import uuid
import json
import re
from datetime import datetime
from typing import Dict, Any, Optional, List, Callable
from collections import defaultdict

from .interfaces.IMetricsService import IMetricsService
from .interfaces.ILogger import ILogger
from .contracts.IMetricsService_contracts import MetricsServiceConfig


class MetricsService(IMetricsService):
    """
    Metrics aggregation service with multi-backend export.
    
    Features:
    - Counter metrics (monotonically increasing)
    - Gauge metrics (instantaneous values)
    - Histogram metrics (value distributions)
    - Multi-backend export (Prometheus, StatsD, CloudWatch, JSON)
    - Real-time metric streaming
    - Metric caching for performance
    """
    
    def __init__(self, config: MetricsServiceConfig, logger: ILogger):
        """
        Initialize MetricsService.
        
        Args:
            config: Service configuration
            logger: Injected logger instance
        """
        self._config = config
        self._logger = logger
        
        # Metric storage
        self._counters: Dict[str, Dict[str, Any]] = {}
        self._gauges: Dict[str, Dict[str, Any]] = {}
        self._histograms: Dict[str, Dict[str, Any]] = {}
        
        # Subscribers for real-time updates
        self._subscribers: Dict[str, Dict[str, Any]] = {}
        
        # Cache for frequently accessed metrics
        self._cache: Dict[str, tuple[Any, datetime]] = {}
        
        self._logger.info(
            "MetricsService initialized",
            extra={
                "enabled_backends": config.enabled_backends,
                "max_metrics_per_type": config.max_metrics_per_type
            }
        )
    
    def record_counter(
        self,
        metric_name: str,
        increment: float = 1.0,
        tags: Optional[Dict[str, str]] = None
    ) -> None:
        """Record a counter metric."""
        # Validate storage limits
        if len(self._counters) >= self._config.max_metrics_per_type:
            if metric_name not in self._counters:
                self._logger.warning(
                    f"Max counters ({self._config.max_metrics_per_type}) reached, ignoring {metric_name}"
                )
                return
        
        # Initialize or increment counter
        if metric_name not in self._counters:
            self._counters[metric_name] = {
                "value": 0.0,
                "tags": tags or {},
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        
        self._counters[metric_name]["value"] += increment
        self._counters[metric_name]["updated_at"] = datetime.utcnow()
        
        # Invalidate cache
        if self._config.enable_metric_caching:
            cache_key = f"counter:{metric_name}"
            if cache_key in self._cache:
                del self._cache[cache_key]
        
        # Notify subscribers
        if self._config.enable_streaming:
            self._notify_subscribers(metric_name, "counter", self._counters[metric_name]["value"])
        
        self._logger.debug(f"Counter {metric_name} incremented by {increment}")
    
    def record_gauge(
        self,
        metric_name: str,
        value: float,
        tags: Optional[Dict[str, str]] = None
    ) -> None:
        """Record a gauge metric."""
        # Validate storage limits
        if len(self._gauges) >= self._config.max_metrics_per_type:
            if metric_name not in self._gauges:
                self._logger.warning(
                    f"Max gauges ({self._config.max_metrics_per_type}) reached, ignoring {metric_name}"
                )
                return
        
        # Set gauge value
        if metric_name not in self._gauges:
            self._gauges[metric_name] = {
                "value": value,
                "tags": tags or {},
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        else:
            self._gauges[metric_name]["value"] = value
            self._gauges[metric_name]["updated_at"] = datetime.utcnow()
        
        # Invalidate cache
        if self._config.enable_metric_caching:
            cache_key = f"gauge:{metric_name}"
            if cache_key in self._cache:
                del self._cache[cache_key]
        
        # Notify subscribers
        if self._config.enable_streaming:
            self._notify_subscribers(metric_name, "gauge", value)
        
        self._logger.debug(f"Gauge {metric_name} set to {value}")
    
    def record_histogram(
        self,
        metric_name: str,
        value: float,
        tags: Optional[Dict[str, str]] = None
    ) -> None:
        """Record a histogram value."""
        # Validate storage limits
        if len(self._histograms) >= self._config.max_metrics_per_type:
            if metric_name not in self._histograms:
                self._logger.warning(
                    f"Max histograms ({self._config.max_metrics_per_type}) reached, ignoring {metric_name}"
                )
                return
        
        # Initialize histogram
        if metric_name not in self._histograms:
            self._histograms[metric_name] = {
                "values": [],
                "buckets": {str(bucket): 0 for bucket in self._config.histogram_buckets},
                "count": 0,
                "sum": 0.0,
                "tags": tags or {},
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        
        # Record value
        histogram = self._histograms[metric_name]
        histogram["values"].append(value)
        histogram["count"] += 1
        histogram["sum"] += value
        histogram["updated_at"] = datetime.utcnow()
        
        # Update buckets
        for bucket in self._config.histogram_buckets:
            if value <= bucket:
                histogram["buckets"][str(bucket)] += 1
        
        # Invalidate cache
        if self._config.enable_metric_caching:
            cache_key = f"histogram:{metric_name}"
            if cache_key in self._cache:
                del self._cache[cache_key]
        
        # Notify subscribers
        if self._config.enable_streaming:
            self._notify_subscribers(metric_name, "histogram", value)
        
        self._logger.debug(f"Histogram {metric_name} recorded value {value}")
    
    def get_metric(
        self,
        metric_name: str,
        metric_type: str
    ) -> Optional[Dict[str, Any]]:
        """Get current value and metadata for a specific metric."""
        # Check cache first
        if self._config.enable_metric_caching:
            cache_key = f"{metric_type}:{metric_name}"
            if cache_key in self._cache:
                cached_value, cached_time = self._cache[cache_key]
                age_seconds = (datetime.utcnow() - cached_time).total_seconds()
                if age_seconds < self._config.cache_ttl_seconds:
                    return cached_value  # type: ignore[no-any-return]
        
        # Get from storage
        storage: Dict[str, Dict[str, Any]]
        if metric_type == "counter":
            storage = self._counters
        elif metric_type == "gauge":
            storage = self._gauges
        elif metric_type == "histogram":
            storage = self._histograms
        else:
            self._logger.warning(f"Unknown metric type: {metric_type}")
            return None
        
        if metric_name not in storage:
            return None
        
        metric_data: Dict[str, Any] = storage[metric_name].copy()
        
        # Update cache
        if self._config.enable_metric_caching:
            cache_key = f"{metric_type}:{metric_name}"
            self._cache[cache_key] = (metric_data, datetime.utcnow())
        
        return metric_data
    
    def get_all_metrics(self) -> Dict[str, Any]:
        """Get all metrics organized by type."""
        return {
            "counters": {name: data.copy() for name, data in self._counters.items()},
            "gauges": {name: data.copy() for name, data in self._gauges.items()},
            "histograms": {name: data.copy() for name, data in self._histograms.items()},
            "summary": {
                "total_counters": len(self._counters),
                "total_gauges": len(self._gauges),
                "total_histograms": len(self._histograms),
                "total_subscribers": len(self._subscribers)
            }
        }
    
    def export_to_backend(self, backend_name: str) -> str:
        """Export metrics to specified backend format."""
        if backend_name == "prometheus":
            return self._export_prometheus()
        elif backend_name == "statsd":
            return self._export_statsd()
        elif backend_name == "cloudwatch":
            return self._export_cloudwatch()
        elif backend_name == "json":
            return self._export_json()
        else:
            self._logger.error(f"Unknown backend: {backend_name}")
            return ""
    
    def reset_metrics(self, metric_type: Optional[str] = None) -> int:
        """Reset metrics (all or by type)."""
        count = 0
        
        if metric_type is None or metric_type == "counter":
            count += len(self._counters)
            self._counters.clear()
        
        if metric_type is None or metric_type == "gauge":
            count += len(self._gauges)
            self._gauges.clear()
        
        if metric_type is None or metric_type == "histogram":
            count += len(self._histograms)
            self._histograms.clear()
        
        # Clear cache
        if self._config.enable_metric_caching:
            self._cache.clear()
        
        self._logger.info(f"Reset {count} metrics (type: {metric_type or 'all'})")
        return count
    
    def subscribe_to_updates(
        self,
        callback: Callable[[str, str, float], None],
        metric_filter: Optional[str] = None
    ) -> str:
        """Subscribe to real-time metric updates."""
        if not self._config.enable_streaming:
            self._logger.warning("Streaming is disabled in configuration")
            return ""
        
        if len(self._subscribers) >= self._config.max_subscribers:
            self._logger.error(f"Max subscribers ({self._config.max_subscribers}) reached")
            return ""
        
        subscription_id = str(uuid.uuid4())
        
        self._subscribers[subscription_id] = {
            "callback": callback,
            "filter": metric_filter,
            "created_at": datetime.utcnow()
        }
        
        self._logger.debug(f"New subscription: {subscription_id} (filter: {metric_filter})")
        return subscription_id
    
    def unsubscribe(self, subscription_id: str) -> bool:
        """Unsubscribe from metric updates."""
        if subscription_id in self._subscribers:
            del self._subscribers[subscription_id]
            self._logger.debug(f"Unsubscribed: {subscription_id}")
            return True
        return False
    
    # === INTERNAL HELPERS ===
    
    def _notify_subscribers(self, metric_name: str, metric_type: str, value: float) -> None:
        """Notify all subscribers of metric update."""
        for sub_id, sub_data in list(self._subscribers.items()):
            # Apply filter if set
            if sub_data["filter"]:
                if not re.match(sub_data["filter"], metric_name):
                    continue
            
            # Call callback
            try:
                sub_data["callback"](metric_name, metric_type, value)
            except Exception as e:
                self._logger.error(f"Subscriber {sub_id} callback error: {e}")
    
    def _export_prometheus(self) -> str:
        """Export metrics in Prometheus format."""
        lines: List[str] = []
        
        # Export counters
        for name, data in self._counters.items():
            sanitized_name = self._sanitize_prometheus_name(name)
            lines.append(f"# TYPE {sanitized_name} counter")
            tags = self._format_prometheus_tags(data["tags"])
            lines.append(f"{sanitized_name}{tags} {data['value']}")
        
        # Export gauges
        for name, data in self._gauges.items():
            sanitized_name = self._sanitize_prometheus_name(name)
            lines.append(f"# TYPE {sanitized_name} gauge")
            tags = self._format_prometheus_tags(data["tags"])
            lines.append(f"{sanitized_name}{tags} {data['value']}")
        
        # Export histograms
        for name, data in self._histograms.items():
            sanitized_name = self._sanitize_prometheus_name(name)
            lines.append(f"# TYPE {sanitized_name} histogram")
            tags = self._format_prometheus_tags(data["tags"])
            
            # Bucket counts
            for bucket, count in data["buckets"].items():
                lines.append(f"{sanitized_name}_bucket{{le=\"{bucket}\"{tags[1:-1]}}} {count}")
            
            # Count and sum
            lines.append(f"{sanitized_name}_count{tags} {data['count']}")
            lines.append(f"{sanitized_name}_sum{tags} {data['sum']}")
        
        return "\n".join(lines)
    
    def _export_statsd(self) -> str:
        """Export metrics in StatsD format."""
        lines: List[str] = []
        
        # Export counters
        for name, data in self._counters.items():
            lines.append(f"{name}:{data['value']}|c")
        
        # Export gauges
        for name, data in self._gauges.items():
            lines.append(f"{name}:{data['value']}|g")
        
        # Export histograms (as timing metrics)
        for name, data in self._histograms.items():
            if data['count'] > 0:
                avg_value = data['sum'] / data['count']
                lines.append(f"{name}:{avg_value}|ms")
        
        return "\n".join(lines)
    
    def _export_cloudwatch(self) -> str:
        """Export metrics in AWS CloudWatch format (JSON)."""
        metrics: List[Dict[str, Any]] = []
        
        # Export counters
        for name, data in self._counters.items():
            metrics.append({
                "MetricName": name,
                "Value": data["value"],
                "Unit": "Count",
                "Timestamp": data["updated_at"].isoformat(),
                "Dimensions": [
                    {"Name": k, "Value": v} for k, v in data["tags"].items()
                ]
            })
        
        # Export gauges
        for name, data in self._gauges.items():
            metrics.append({
                "MetricName": name,
                "Value": data["value"],
                "Unit": "None",
                "Timestamp": data["updated_at"].isoformat(),
                "Dimensions": [
                    {"Name": k, "Value": v} for k, v in data["tags"].items()
                ]
            })
        
        # Export histograms
        for name, data in self._histograms.items():
            if data["count"] > 0:
                metrics.append({
                    "MetricName": name,
                    "StatisticValues": {
                        "SampleCount": data["count"],
                        "Sum": data["sum"],
                        "Minimum": min(data["values"]) if data["values"] else 0,
                        "Maximum": max(data["values"]) if data["values"] else 0
                    },
                    "Unit": "None",
                    "Timestamp": data["updated_at"].isoformat(),
                    "Dimensions": [
                        {"Name": k, "Value": v} for k, v in data["tags"].items()
                    ]
                })
        
        return json.dumps({
            "Namespace": self._config.cloudwatch_namespace,
            "MetricData": metrics
        }, indent=2)
    
    def _export_json(self) -> str:
        """Export all metrics as JSON."""
        return json.dumps(self.get_all_metrics(), indent=2, default=str)
    
    def _sanitize_prometheus_name(self, name: str) -> str:
        """Sanitize metric name for Prometheus format."""
        # Replace invalid characters with underscores
        return re.sub(r'[^a-zA-Z0-9_]', '_', name)
    
    def _format_prometheus_tags(self, tags: Dict[str, str]) -> str:
        """Format tags for Prometheus format."""
        if not tags:
            return ""
        
        tag_pairs = [f'{k}="{v}"' for k, v in tags.items()]
        return "{" + ",".join(tag_pairs) + "}"
