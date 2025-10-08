# QUALIA.CODE v1.1 - IQualiaProcessor Interface
# Interface for QualiaProcessor service

from typing import Protocol, Dict, Any, Optional


class IQualiaProcessor(Protocol):
    """Interface for QualiaProcessor service."""

    async def process_qualia_state(self, qualia_state: Dict[str, Any]) -> None:
        """Process incoming QualiaState and trigger visual updates."""
        ...

    def get_current_state(self) -> Optional[Dict[str, Any]]:
        """Get the current QualiaState."""
        ...

    def enable(self) -> None:
        """Enable qualia state processing."""
        ...

    def disable(self) -> None:
        """Disable qualia state processing."""
        ...

    def is_enabled(self) -> bool:
        """Check if processing is enabled."""
        ...
