# QUALIA.CODE v1.1 - IFileSystemService Contracts
from dataclasses import dataclass, field

@dataclass
class FileSystemConfig:
    """Configuration contract for FileSystemService."""
    base_path: str = "/media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/backend"
    enable_caching: bool = True
    max_file_size_mb: int = 100
    allowed_extensions: list[str] = field(default_factory=lambda: ['.yaml', '.json', '.txt', '.py'])
