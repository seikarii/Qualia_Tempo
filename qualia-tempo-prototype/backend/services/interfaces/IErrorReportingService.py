# QUALIA.CODE v1.1 - IErrorReportingService Interface
from typing import Protocol, Any, Dict, Optional

class IErrorReportingService(Protocol):
    """Interface for error reporting service."""
    
    def report_error(self, error: Exception, context: Optional[Dict[str, Any]] = None) -> None:
        """Report an error with context."""
        ...
    
    def get_error_stats(self) -> Dict[str, Any]:
        """Get error statistics."""
        ...
