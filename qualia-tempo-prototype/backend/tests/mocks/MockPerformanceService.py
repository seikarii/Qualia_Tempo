"""
MockPerformanceService - High-Fidelity Mock for IPerformanceService
QUALIA.CODE v1.1 Testing Compliance - Phase 6.1

High-fidelity mock matching interface behavior.
Tracks method calls for test assertions.
"""

from typing import Dict, Any, Optional, List
from backend.services.interfaces.IPerformanceService import IPerformanceService


class MockPerformanceService(IPerformanceService):
    """
    High-fidelity mock for IPerformanceService.
    
    Tracks all method calls and provides realistic defaults.
    """
    
    def __init__(self) -> None:
        """Initialize mock with tracking state."""
        # Call tracking
        self.start_measurement_calls: List[Dict[str, Any]] = []
        self.end_measurement_calls: List[str] = []
        self.record_metric_calls: List[Dict[str, Any]] = []
        self.get_metrics_calls: List[Optional[str]] = []
        self.get_slow_operations_calls: List[Dict[str, Any]] = []
        self.get_resource_usage_calls: int = 0
        self.reset_metrics_calls: int = 0
        self.export_metrics_calls: List[str] = []
        
        # Internal state for realistic behavior
        self._active_measurements: Dict[str, Dict[str, Any]] = {}
        self._measurements: List[Dict[str, Any]] = []
        self._metrics: Dict[str, List[float]] = {}
        self._measurement_counter = 0
    
    def start_measurement(self, operation_name: str, metadata: Optional[Dict[str, Any]] = None) -> str:
        """Track start_measurement calls and return ID."""
        self._measurement_counter += 1
        measurement_id = f"mock_measurement_{self._measurement_counter}"
        
        self.start_measurement_calls.append({
            "operation_name": operation_name,
            "metadata": metadata,
            "measurement_id": measurement_id
        })
        
        # Store for end_measurement
        self._active_measurements[measurement_id] = {
            "operation_name": operation_name,
            "metadata": metadata
        }
        
        return measurement_id
    
    def end_measurement(self, measurement_id: str) -> float:
        """Track end_measurement calls and return mock duration."""
        self.end_measurement_calls.append(measurement_id)
        
        # Return realistic mock duration
        if measurement_id in self._active_measurements:
            measurement = self._active_measurements.pop(measurement_id)
            duration_ms = 50.0  # Mock duration
            
            self._measurements.append({
                "operation_name": measurement["operation_name"],
                "duration_ms": duration_ms,
                "metadata": measurement["metadata"]
            })
            
            return duration_ms
        
        return 0.0
    
    def record_metric(self, metric_name: str, value: float, tags: Optional[Dict[str, str]] = None) -> None:
        """Track record_metric calls."""
        self.record_metric_calls.append({
            "metric_name": metric_name,
            "value": value,
            "tags": tags
        })
        
        # Store metric
        if metric_name not in self._metrics:
            self._metrics[metric_name] = []
        self._metrics[metric_name].append(value)
    
    def get_metrics(self, metric_name: Optional[str] = None) -> Dict[str, Any]:
        """Track get_metrics calls and return mock data."""
        self.get_metrics_calls.append(metric_name)
        
        if metric_name:
            values = self._metrics.get(metric_name, [])
            if not values:
                return {"name": metric_name, "count": 0}
            
            return {
                "name": metric_name,
                "count": len(values),
                "min": min(values),
                "max": max(values),
                "mean": sum(values) / len(values),
                "p50": values[len(values) // 2],
                "p90": values[int(len(values) * 0.9)],
                "p95": values[int(len(values) * 0.95)],
                "p99": values[int(len(values) * 0.99)]
            }
        
        # Return all metrics
        return {
            name: {
                "name": name,
                "count": len(values),
                "min": min(values) if values else 0,
                "max": max(values) if values else 0,
                "mean": sum(values) / len(values) if values else 0
            }
            for name, values in self._metrics.items()
        }
    
    def get_slow_operations(self, threshold_ms: float = 100.0, limit: int = 10) -> List[Dict[str, Any]]:
        """Track get_slow_operations calls and return mock data."""
        self.get_slow_operations_calls.append({
            "threshold_ms": threshold_ms,
            "limit": limit
        })
        
        # Filter slow operations
        slow_ops = [
            m for m in self._measurements
            if m["duration_ms"] >= threshold_ms
        ]
        
        return slow_ops[:limit]
    
    def get_resource_usage(self) -> Dict[str, Any]:
        """Track get_resource_usage calls and return mock data."""
        self.get_resource_usage_calls += 1
        
        return {
            "cpu_percent": 25.5,
            "memory_rss_mb": 512.0,
            "memory_vms_mb": 1024.0,
            "timestamp": "2024-01-01T00:00:00"
        }
    
    def reset_metrics(self) -> None:
        """Track reset_metrics calls and clear state."""
        self.reset_metrics_calls += 1
        self._measurements.clear()
        self._metrics.clear()
        self._active_measurements.clear()
    
    def export_metrics(self, format: str = "json") -> str:
        """Track export_metrics calls and return mock data."""
        self.export_metrics_calls.append(format)
        
        if format == "json":
            return '{"metrics": {}, "slow_operations": [], "resource_usage": []}'
        elif format == "prometheus":
            return "# TYPE qualia_tempo_mock gauge\nqualia_tempo_mock 1.0"
        else:
            raise ValueError(f"Unsupported format: {format}")
    
    # Test helper methods
    def was_measurement_started(self, operation_name: str) -> bool:
        """Check if a measurement was started for given operation."""
        return any(
            call["operation_name"] == operation_name
            for call in self.start_measurement_calls
        )
    
    def was_measurement_ended(self, measurement_id: str) -> bool:
        """Check if a measurement was ended."""
        return measurement_id in self.end_measurement_calls
    
    def was_metric_recorded(self, metric_name: str) -> bool:
        """Check if a metric was recorded."""
        return any(
            call["metric_name"] == metric_name
            for call in self.record_metric_calls
        )
    
    def get_recorded_metric_values(self, metric_name: str) -> List[float]:
        """Get all recorded values for a metric."""
        return [
            call["value"]
            for call in self.record_metric_calls
            if call["metric_name"] == metric_name
        ]
    
    def reset(self) -> None:
        """Reset all tracking state for test isolation."""
        self.start_measurement_calls.clear()
        self.end_measurement_calls.clear()
        self.record_metric_calls.clear()
        self.get_metrics_calls.clear()
        self.get_slow_operations_calls.clear()
        self.get_resource_usage_calls = 0
        self.reset_metrics_calls = 0
        self.export_metrics_calls.clear()
        self._active_measurements.clear()
        self._measurements.clear()
        self._metrics.clear()
        self._measurement_counter = 0
