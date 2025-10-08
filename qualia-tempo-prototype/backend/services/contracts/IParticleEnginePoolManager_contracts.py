# QUALIA.CODE v1.1 - IParticleEnginePoolManager Contracts
from dataclasses import dataclass

@dataclass
class ParticleEnginePoolManagerConfig:
    """
    Configuration contract for ParticleEnginePoolManager.
    
    Loaded from process-pool.yaml file by ConfigurationService.
    Defines process pool parameters, queue settings, error handling, and monitoring.
    """
    # Pool Settings
    num_workers: int = 4
    max_tasks_per_child: int = 100
    
    # Queue Management
    queue_max_size: int = 50
    queue_timeout_seconds: float = 5.0
    
    # Error Handling
    max_retries: int = 3
    retry_delay_seconds: float = 0.5
    
    # Performance
    collect_metrics: bool = True
    
    # Monitoring
    health_check_interval_seconds: float = 10.0
    
    # Shutdown
    grace_period_seconds: float = 5.0
