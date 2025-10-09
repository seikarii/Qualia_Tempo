"""High-Fidelity Mock for ISystemEnvironmentService"""
from typing import Dict, List, Optional, Tuple
from backend.services.interfaces.ISystemEnvironmentService import ISystemEnvironmentService


class MockSystemEnvironmentService(ISystemEnvironmentService):
    """High-fidelity mock for ISystemEnvironmentService."""
    
    def __init__(self):
        self.reset()
    
    def reset(self) -> None:
        """Reset mock state."""
        self.env_vars: Dict[str, str] = {"ENV": "test", "DEBUG": "true"}
        self.get_calls: List[str] = []
        self.set_calls: List[Tuple[str, str]] = []
    
    def get_environment_variable(self, key: str, default: Optional[str] = None) -> Optional[str]:
        """Get environment variable."""
        self.get_calls.append(key)
        return self.env_vars.get(key, default)
    
    def set_environment_variable(self, key: str, value: str) -> None:
        """Set environment variable."""
        self.set_calls.append((key, value))
        self.env_vars[key] = value
    
    def get_system_info(self) -> Dict[str, str]:
        """Get system information."""
        return {"platform": "linux", "python_version": "3.12.0", "hostname": "test-host"}
    
    def is_development(self) -> bool:
        """Check if in development mode."""
        return self.env_vars.get("ENV") == "development"
    
    def is_production(self) -> bool:
        """Check if in production mode."""
        return self.env_vars.get("ENV") == "production"
