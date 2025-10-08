# QUALIA.CODE v1.1 - IConfigurationService Interface
# Interface for configuration management service

from typing import Protocol, Any, TypeVar, Type

T = TypeVar('T')


class IConfigurationService(Protocol):
    """Interface for configuration management service."""

    async def load_config(self, config_name: str) -> dict[str, Any]:
        """Load configuration from YAML file."""
        ...

    def get[T](self, key: str, config_type: Type[T]) -> T:
        """Get typed configuration value."""
        ...

    def get_raw(self, key: str, default: Any = None) -> Any:
        """Get raw configuration value."""
        ...

    def reload(self) -> None:
        """Reload all configurations."""
        ...
