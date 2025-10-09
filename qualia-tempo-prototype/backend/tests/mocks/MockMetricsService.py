"""
MockMetricsService - High-Fidelity Mock
QUALIA.CODE v1.1 Compliance - Phase 6.3

High-fidelity mock for IMetricsService with call tracking and test helpers.
"""

import uuid
from typing import Dict, Any, Optional, List, Callable
from datetime import datetime

from backend.services.interfaces.IMetricsService import IMetricsService


class MockMetricsService(IMetricsService):
    """High-fidelity mock for MetricsService with comprehensive call tracking."""
    
    def __init__(self):
        """Initialize MockMetricsService."""
        # Call tracking
        self.record_counter_calls: List[Dict[str, Any]] = []
        self.record_gauge_calls: List[Dict[str, Any]] = []
        self.record_histogram_calls: List[Dict[str, Any]] = []
        self.get_metric_calls: List[Dict[str, Any]] = []
        self.export_calls: List[Dict[str, Any]] = []
        self.reset_calls: List[Optional[str]] = []
        self.subscribe_calls: List[Dict[str, Any]] = []
        self.unsubscribe_calls: List[str] = []
        
        # Mock storage
        self._counters: Dict[str, float] = {}
        self._gauges: Dict[str, float] = {}
        self._histograms: Dict[str, List[float]] = {}
        self._subscribers: Dict[str, Callable] = {}
        
        # Statistics
        self.total_metrics_recorded = 0
        self.total_exports = 0
    
    def record_counter(
        self,
        metric_name: str,
        increment: float = 1.0,
        tags: Optional[Dict[str, str]] = None
    ) -> None:
        """Mock record_counter."""
        self.record_counter_calls.append({
            "metric_name": metric_name,
            "increment": increment,
            "tags": tags,
            "timestamp": datetime.utcnow()
        })
        
        # Update mock storage
        if metric_name not in self._counters:
            self._counters[metric_name] = 0.0
        self._counters[metric_name] += increment
        self.total_metrics_recorded += 1
    
    def record_gauge(
        self,
        metric_name: str,
        value: float,
        tags: Optional[Dict[str, str]] = None
    ) -> None:
        """Mock record_gauge."""
        self.record_gauge_calls.append({
            "metric_name": metric_name,
            "value": value,
            "tags": tags,
            "timestamp": datetime.utcnow()
        })
        
        self._gauges[metric_name] = value
        self.total_metrics_recorded += 1
    
    def record_histogram(
        self,
        metric_name: str,
        value: float,
        tags: Optional[Dict[str, str]] = None
    ) -> None:
        """Mock record_histogram."""
        self.record_histogram_calls.append({
            "metric_name": metric_name,
            "value": value,
            "tags": tags,
            "timestamp": datetime.utcnow()
        })
        
        if metric_name not in self._histograms:
            self._histograms[metric_name] = []
        self._histograms[metric_name].append(value)
        self.total_metrics_recorded += 1
    
    def get_metric(
        self,
        metric_name: str,
        metric_type: str
    ) -> Optional[Dict[str, Any]]:
        """Mock get_metric."""
        self.get_metric_calls.append({
            "metric_name": metric_name,
            "metric_type": metric_type,
            "timestamp": datetime.utcnow()
        })
        
        if metric_type == "counter" and metric_name in self._counters:
            return {"value": self._counters[metric_name], "type": "counter"}
        elif metric_type == "gauge" and metric_name in self._gauges:
            return {"value": self._gauges[metric_name], "type": "gauge"}
        elif metric_type == "histogram" and metric_name in self._histograms:
            values = self._histograms[metric_name]
            return {
                "values": values,
                "count": len(values),
                "sum": sum(values),
                "type": "histogram"
            }
        return None
    
    def get_all_metrics(self) -> Dict[str, Any]:
        """Mock get_all_metrics."""
        return {
            "counters": {name: {"value": val} for name, val in self._counters.items()},
            "gauges": {name: {"value": val} for name, val in self._gauges.items()},
            "histograms": {name: {"values": vals} for name, vals in self._histograms.items()},
            "summary": {
                "total_counters": len(self._counters),
                "total_gauges": len(self._gauges),
                "total_histograms": len(self._histograms)
            }
        }
    
    def export_to_backend(self, backend_name: str) -> str:
        """Mock export_to_backend."""
        self.export_calls.append({
            "backend_name": backend_name,
            "timestamp": datetime.utcnow()
        })
        self.total_exports += 1
        
        # Return simple mock export
        return f"Mock export to {backend_name}: {len(self._counters)} counters, {len(self._gauges)} gauges"
    
    def reset_metrics(self, metric_type: Optional[str] = None) -> int:
        """Mock reset_metrics."""
        self.reset_calls.append(metric_type)
        
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
        
        return count
    
    def subscribe_to_updates(
        self,
        callback: Callable[[str, str, float], None],
        metric_filter: Optional[str] = None
    ) -> str:
        """Mock subscribe_to_updates."""
        sub_id = str(uuid.uuid4())
        
        self.subscribe_calls.append({
            "subscription_id": sub_id,
            "metric_filter": metric_filter,
            "timestamp": datetime.utcnow()
        })
        
        self._subscribers[sub_id] = callback
        return sub_id
    
    def unsubscribe(self, subscription_id: str) -> bool:
        """Mock unsubscribe."""
        self.unsubscribe_calls.append(subscription_id)
        
        if subscription_id in self._subscribers:
            del self._subscribers[subscription_id]
            return True
        return False
    
    # === TEST HELPERS ===
    
    def was_counter_recorded(self, metric_name: str) -> bool:
        """Check if counter was recorded."""
        return any(call["metric_name"] == metric_name for call in self.record_counter_calls)
    
    def was_gauge_recorded(self, metric_name: str) -> bool:
        """Check if gauge was recorded."""
        return any(call["metric_name"] == metric_name for call in self.record_gauge_calls)
    
    def was_histogram_recorded(self, metric_name: str) -> bool:
        """Check if histogram was recorded."""
        return any(call["metric_name"] == metric_name for call in self.record_histogram_calls)
    
    def get_counter_value(self, metric_name: str) -> float:
        """Get current counter value."""
        return self._counters.get(metric_name, 0.0)
    
    def get_gauge_value(self, metric_name: str) -> Optional[float]:
        """Get current gauge value."""
        return self._gauges.get(metric_name)
    
    def get_histogram_values(self, metric_name: str) -> List[float]:
        """Get histogram values."""
        return self._histograms.get(metric_name, [])
    
    def was_exported_to(self, backend_name: str) -> bool:
        """Check if metrics were exported to backend."""
        return any(call["backend_name"] == backend_name for call in self.export_calls)
    
    def get_subscriber_count(self) -> int:
        """Get number of active subscribers."""
        return len(self._subscribers)
    
    def reset(self) -> None:
        """Reset mock state for test isolation."""
        self.record_counter_calls.clear()
        self.record_gauge_calls.clear()
        self.record_histogram_calls.clear()
        self.get_metric_calls.clear()
        self.export_calls.clear()
        self.reset_calls.clear()
        self.subscribe_calls.clear()
        self.unsubscribe_calls.clear()
        
        self._counters.clear()
        self._gauges.clear()
        self._histograms.clear()
        self._subscribers.clear()
        
        self.total_metrics_recorded = 0
        self.total_exports = 0
