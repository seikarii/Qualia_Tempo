"""
PerformanceService Configuration Contract
QUALIA.CODE v1.1 Compliance - Phase 6.1

Configuration dataclass for PerformanceService.
"""

from dataclasses import dataclass, field
from typing import List, Dict


@dataclass
class PerformanceServiceConfig:
    """Configuration for PerformanceService"""
    
    # Measurement settings
    max_measurements: int = 10000
    """Maximum number of measurements to keep in memory"""
    
    measurement_retention_seconds: int = 3600
    """How long to retain measurements (1 hour default)"""
    
    # Performance thresholds
    slow_operation_threshold_ms: float = 100.0
    """Threshold in ms to flag operation as slow"""
    
    critical_operation_threshold_ms: float = 1000.0
    """Threshold in ms to flag operation as critical"""
    
    # Resource monitoring
    enable_cpu_monitoring: bool = True
    """Enable CPU usage monitoring"""
    
    enable_memory_monitoring: bool = True
    """Enable memory usage monitoring"""
    
    resource_check_interval_seconds: int = 60
    """Interval for resource usage checks"""
    
    # Metrics aggregation
    aggregation_window_seconds: int = 60
    """Time window for metric aggregation"""
    
    percentiles: List[float] = field(default_factory=lambda: [50.0, 90.0, 95.0, 99.0])
    """Percentiles to calculate for timing metrics"""
    
    # Export settings
    export_formats: List[str] = field(default_factory=lambda: ["json", "prometheus"])
    """Supported export formats"""
    
    prometheus_prefix: str = "qualia_tempo"
    """Prefix for Prometheus metric names"""
    
    # Feature flags
    enable_alerting: bool = False
    """Enable performance degradation alerting"""
    
    alert_threshold_multiplier: float = 2.0
    """Alert when operation exceeds baseline by this multiplier"""
