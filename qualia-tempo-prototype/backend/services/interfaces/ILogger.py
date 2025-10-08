# QUALIA.CODE v1.1 - ILogger Interface
# Interface for logging service

from typing import Protocol, Any, Dict, Optional


class ILogger(Protocol):
    """Interface for logging service."""

    def debug(self, message: str, context: Optional[Dict[str, Any]] = None) -> None:
        """Log debug message."""
        ...

    def info(self, message: str, context: Optional[Dict[str, Any]] = None) -> None:
        """Log info message."""
        ...

    def warning(self, message: str, context: Optional[Dict[str, Any]] = None) -> None:
        """Log warning message."""
        ...

    def error(self, message: str, context: Optional[Dict[str, Any]] = None) -> None:
        """Log error message."""
        ...

    def critical(self, message: str, context: Optional[Dict[str, Any]] = None) -> None:
        """Log critical message."""
        ...
