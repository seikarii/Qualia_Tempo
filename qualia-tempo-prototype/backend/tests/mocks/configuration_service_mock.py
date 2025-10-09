"""High-Fidelity Mock for IConfigurationService Interface"""
from typing import Any, Dict, List, Type, TypeVar
from backend.services.interfaces.IConfigurationService import IConfigurationService

T = TypeVar('T')


class MockConfigurationService(IConfigurationService):
    """
    High-fidelity mock for IConfigurationService.
    Stores configurations in memory for testing.
    """
    
    def __init__(self):
        self.reset()
    
    def reset(self) -> None:
        """Reset all configurations."""
        self.configs: Dict[str, Any] = {}
        self.load_calls: List[str] = []
        self.get_calls: List[str] = []
    
    async def load_config(self, config_file: str) -> Dict[str, Any]:
        """Load mock configuration."""
        self.load_calls.append(config_file)
        return self.configs.get(config_file, {})
    
    def get_config(self, service_name: str, config_type: Type[T]) -> T:
        """Get typed configuration."""
        self.get_calls.append(service_name)
        
        if service_name not in self.configs:
            # Return default constructed config
            return config_type()  # type: ignore[call-arg]
        
        return self.configs[service_name]
    
    async def reload_config(self, service_name: str) -> None:
        """Mock reload (no-op)."""
        pass
    
    def validate_config(self, config_data: Dict[str, Any], schema_name: str) -> bool:
        """Mock validation (always passes)."""
        return True
    
    # Helper methods for testing
    def add_config(self, service_name: str, config: Any) -> None:
        """Add configuration for testing."""
        self.configs[service_name] = config
    
    def was_loaded(self, config_file: str) -> bool:
        """Check if config was loaded."""
        return config_file in self.load_calls
    
    def was_accessed(self, service_name: str) -> bool:
        """Check if config was accessed."""
        return service_name in self.get_calls
