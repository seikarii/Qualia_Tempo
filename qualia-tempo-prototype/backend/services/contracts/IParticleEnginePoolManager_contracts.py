# QUALIA.CODE v1.1 - IParticleEnginePoolManager Contracts
from dataclasses import dataclass

@dataclass
class ParticleEnginePoolConfig:
    """Configuration contract for ParticleEnginePoolManager."""
    pool_size: int = 4
    max_particles_per_engine: int = 10000
    enable_pool_statistics: bool = True
    auto_scale: bool = True
