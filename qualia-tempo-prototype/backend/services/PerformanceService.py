"""
PerformanceService Implementation
QUALIA.CODE v1.1 Compliance - Phase 6.1

Performance monitoring and metrics collection service.
Tracks execution times, bottlenecks, and resource usage.
"""

import time
import uuid
import psutil  # type: ignore[import-untyped]
import json
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List, Deque
from collections import defaultdict, deque

from .interfaces.IPerformanceService import IPerformanceService
from .interfaces.ILogger import ILogger
from .contracts.IPerformanceService_contracts import PerformanceServiceConfig
from ..utils.decorators import log_execution


class PerformanceService(IPerformanceService):
    """
    Performance monitoring service implementation.
    
    Features:
    - Operation timing measurements
    - Custom metric recording
    - Resource usage monitoring
    - Slow operation detection
    - Prometheus-compatible export
    """
    
    def __init__(self, config: PerformanceServiceConfig, logger: ILogger):
        """
        Initialize PerformanceService.
        
        Args:
            config: Service configuration
            logger: Injected logger instance
        """
        self._config = config
        self._logger = logger
        
        # Active measurements
        self._active_measurements: Dict[str, Dict[str, Any]] = {}
        
        # Completed measurements (FIFO with max size)
        self._measurements: Deque[Dict[str, Any]] = deque(maxlen=config.max_measurements)
        
        # Custom metrics storage
        self._metrics: Dict[str, List[float]] = defaultdict(list)
        
        # Resource usage history
        self._resource_history: Deque[Dict[str, Any]] = deque(maxlen=100)
        
        # Process for resource monitoring
        self._process = psutil.Process()
        
        self._logger.info(
            "PerformanceService initialized",
            extra={
                "max_measurements": config.max_measurements,
                "slow_threshold_ms": config.slow_operation_threshold_ms
            }
        )
    
    @log_execution(level="DEBUG")
    @log_execution(level="DEBUG")
    def start_measurement(self, operation_name: str, metadata: Optional[Dict[str, Any]] = None) -> str:
        """Start measuring execution time for an operation."""
        measurement_id = str(uuid.uuid4())
        
        self._active_measurements[measurement_id] = {
            "operation_name": operation_name,
            "start_time": time.perf_counter(),
            "timestamp": datetime.utcnow(),
            "metadata": metadata or {}
        }
        
        return measurement_id
    
    @log_execution(level="DEBUG")
    @log_execution(level="DEBUG")
    def end_measurement(self, measurement_id: str) -> float:
        """End measurement and record execution time."""
        if measurement_id not in self._active_measurements:
            self._logger.warning(f"Measurement ID not found: {measurement_id}")
            return 0.0
        
        measurement = self._active_measurements.pop(measurement_id)
        end_time = time.perf_counter()
        start_time: float = float(measurement["start_time"])
        duration_ms: float = (end_time - start_time) * 1000.0
        
        # Store completed measurement
        completed = {
            "operation_name": measurement["operation_name"],
            "duration_ms": duration_ms,
            "timestamp": measurement["timestamp"],
            "metadata": measurement["metadata"]
        }
        self._measurements.append(completed)
        
        # Log slow operations
        if duration_ms > self._config.slow_operation_threshold_ms:
            if duration_ms < self._config.critical_operation_threshold_ms:
                self._logger.warning(
                    f"Slow operation detected: {measurement['operation_name']}",
                    extra={"duration_ms": duration_ms}
                )
            else:
                self._logger.error(
                    f"Critical slow operation detected: {measurement['operation_name']}",
                    extra={"duration_ms": duration_ms}
                )
        
        return duration_ms
    
    @log_execution(level="DEBUG")
    @log_execution(level="DEBUG")
    def record_metric(self, metric_name: str, value: float, tags: Optional[Dict[str, str]] = None) -> None:
        """Record a custom metric value."""
        # Store metric with optional tags
        metric_key = metric_name
        if tags:
            tag_str = ",".join(f"{k}={v}" for k, v in sorted(tags.items()))
            metric_key = f"{metric_name}{{{tag_str}}}"
        
        self._metrics[metric_key].append(value)
        
        # Trim old values if needed
        max_values = self._config.max_measurements // 10
        if len(self._metrics[metric_key]) > max_values:
            self._metrics[metric_key] = self._metrics[metric_key][-max_values:]
    
    @log_execution(level="DEBUG")
    @log_execution(level="DEBUG")
    def get_metrics(self, metric_name: Optional[str] = None) -> Dict[str, Any]:
        """Get recorded metrics with statistics."""
        if metric_name:
            values = self._metrics.get(metric_name, [])
            return self._calculate_stats(metric_name, values)
        
        # Return all metrics
        return {
            name: self._calculate_stats(name, values)
            for name, values in self._metrics.items()
        }
    
    @log_execution(level="INFO")
    @log_execution(level="INFO")
    def get_slow_operations(self, threshold_ms: float = 100.0, limit: int = 10) -> List[Dict[str, Any]]:
        """Get slowest operations exceeding threshold."""
        slow_ops = [
            m for m in self._measurements
            if m["duration_ms"] >= threshold_ms
        ]
        
        # Sort by duration descending
        slow_ops.sort(key=lambda x: x["duration_ms"], reverse=True)
        
        return slow_ops[:limit]
    
    @log_execution(level="INFO")
    def get_resource_usage(self) -> Dict[str, Any]:
        """Get current resource usage statistics."""
        usage = {}
        
        if self._config.enable_cpu_monitoring:
            usage["cpu_percent"] = self._process.cpu_percent(interval=0.1)
        
        if self._config.enable_memory_monitoring:
            mem_info = self._process.memory_info()
            usage["memory_rss_mb"] = mem_info.rss / (1024 * 1024)
            usage["memory_vms_mb"] = mem_info.vms / (1024 * 1024)
        
        # Store in history
        usage["timestamp"] = datetime.utcnow().isoformat()
        self._resource_history.append(usage)
        
        return usage
    
    @log_execution(level="INFO")
    def reset_metrics(self) -> None:
        """Reset all collected metrics and measurements."""
        self._measurements.clear()
        self._metrics.clear()
        self._resource_history.clear()
        self._active_measurements.clear()
        self._logger.info("Performance metrics reset")
    
    @log_execution(level="INFO")
    def export_metrics(self, format: str = "json") -> str:
        """Export metrics in specified format."""
        if format == "json":
            return self._export_json()
        elif format == "prometheus":
            return self._export_prometheus()
        else:
            raise ValueError(f"Unsupported format: {format}")
    
    def _calculate_stats(self, name: str, values: List[float]) -> Dict[str, Any]:
        """Calculate statistics for a metric."""
        if not values:
            return {"name": name, "count": 0}
        
        sorted_values = sorted(values)
        count = len(sorted_values)
        
        stats = {
            "name": name,
            "count": count,
            "min": sorted_values[0],
            "max": sorted_values[-1],
            "mean": sum(values) / count,
        }
        
        # Calculate percentiles
        for p in self._config.percentiles:
            idx = int(count * p / 100.0)
            idx = min(idx, count - 1)
            stats[f"p{int(p)}"] = sorted_values[idx]
        
        return stats
    
    def _export_json(self) -> str:
        """Export metrics as JSON."""
        export_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "metrics": self.get_metrics(),
            "slow_operations": self.get_slow_operations(),
            "resource_usage": list(self._resource_history)[-10:],  # Last 10 samples
            "config": {
                "slow_threshold_ms": self._config.slow_operation_threshold_ms,
                "critical_threshold_ms": self._config.critical_operation_threshold_ms
            }
        }
        return json.dumps(export_data, indent=2)
    
    def _export_prometheus(self) -> str:
        """Export metrics in Prometheus format."""
        lines = []
        prefix = self._config.prometheus_prefix
        
        # Export custom metrics
        for metric_name, values in self._metrics.items():
            if not values:
                continue
            
            stats = self._calculate_stats(metric_name, values)
            metric_safe_name = metric_name.replace("-", "_").replace(".", "_")
            
            lines.append(f"# TYPE {prefix}_{metric_safe_name} gauge")
            lines.append(f"{prefix}_{metric_safe_name}_count {stats['count']}")
            lines.append(f"{prefix}_{metric_safe_name}_min {stats['min']}")
            lines.append(f"{prefix}_{metric_safe_name}_max {stats['max']}")
            lines.append(f"{prefix}_{metric_safe_name}_mean {stats['mean']}")
            
            for p in self._config.percentiles:
                lines.append(f"{prefix}_{metric_safe_name}_p{int(p)} {stats[f'p{int(p)}']}")
        
        # Export resource usage if available
        if self._resource_history:
            latest = self._resource_history[-1]
            if "cpu_percent" in latest:
                lines.append(f"# TYPE {prefix}_cpu_percent gauge")
                lines.append(f"{prefix}_cpu_percent {latest['cpu_percent']}")
            if "memory_rss_mb" in latest:
                lines.append(f"# TYPE {prefix}_memory_rss_mb gauge")
                lines.append(f"{prefix}_memory_rss_mb {latest['memory_rss_mb']}")
        
        return "\n".join(lines)
