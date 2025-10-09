"""
MetricsService Configuration Contract
QUALIA.CODE v1.1 Compliance - Phase 6.3

Configuration dataclass for MetricsService.
"""

from dataclasses import dataclass, field
from typing import List, Dict


@dataclass
class MetricsServiceConfig:
    """Configuration for MetricsService"""
    
    # Storage settings
    max_metrics_per_type: int = 1000
    """Maximum number of metrics to store per type (counter/gauge/histogram)"""
    
    enable_metric_persistence: bool = False
    """Enable persistence of metrics to disk"""
    
    # Export settings
    enabled_backends: List[str] = field(default_factory=lambda: ["prometheus", "json"])
    """List of enabled export backends"""
    
    prometheus_port: int = 9090
    """Port for Prometheus metrics endpoint"""
    
    statsd_host: str = "localhost"
    """StatsD server host"""
    
    statsd_port: int = 8125
    """StatsD server port"""
    
    cloudwatch_region: str = "us-east-1"
    """AWS CloudWatch region"""
    
    cloudwatch_namespace: str = "QualiaTempo"
    """AWS CloudWatch namespace for metrics"""
    
    # Aggregation settings
    histogram_buckets: List[float] = field(default_factory=lambda: [0.1, 0.5, 1.0, 2.5, 5.0, 10.0])
    """Bucket boundaries for histogram metrics (in seconds)"""
    
    enable_aggregation: bool = True
    """Enable automatic aggregation of metrics"""
    
    aggregation_interval_seconds: int = 60
    """Interval for metric aggregation in seconds"""
    
    # Streaming settings
    enable_streaming: bool = True
    """Enable real-time metric streaming to subscribers"""
    
    max_subscribers: int = 100
    """Maximum number of concurrent subscribers"""
    
    # Performance settings
    enable_metric_caching: bool = True
    """Enable caching of frequently accessed metrics"""
    
    cache_ttl_seconds: int = 300
    """TTL for cached metric values"""
