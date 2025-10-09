# QUALIA.CODE v1.1 - ILogger Interface
# Phase 3.6: Linter Violation Resolution - Added exc_info and extra parameters
# Interface for logging service

from typing import Protocol, Any, Dict, Optional


class ILogger(Protocol):
    """
    Interface for logging service.
    
    Phase 3.6 Enhancement: Added exc_info and extra parameters to all methods
    for Python standard logging compatibility.
    """

    def debug(
        self, 
        message: str, 
        context: Optional[Dict[str, Any]] = None,
        exc_info: bool = False,
        extra: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Log debug message.
        
        Args:
            message: The log message
            context: Optional context dictionary
            exc_info: Include exception information (default: False)
            extra: Extra fields for structured logging
        """
        ...

    def info(
        self, 
        message: str, 
        context: Optional[Dict[str, Any]] = None,
        exc_info: bool = False,
        extra: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Log info message.
        
        Args:
            message: The log message
            context: Optional context dictionary
            exc_info: Include exception information (default: False)
            extra: Extra fields for structured logging
        """
        ...

    def warning(
        self, 
        message: str, 
        context: Optional[Dict[str, Any]] = None,
        exc_info: bool = False,
        extra: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Log warning message.
        
        Args:
            message: The log message
            context: Optional context dictionary
            exc_info: Include exception information (default: False)
            extra: Extra fields for structured logging
        """
        ...

    def error(
        self, 
        message: str, 
        context: Optional[Dict[str, Any]] = None,
        exc_info: bool = False,
        extra: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Log error message.
        
        Args:
            message: The log message
            context: Optional context dictionary
            exc_info: Include exception information (default: False)
            extra: Extra fields for structured logging
        """
        ...

    def critical(
        self, 
        message: str, 
        context: Optional[Dict[str, Any]] = None,
        exc_info: bool = False,
        extra: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Log critical message.
        
        Args:
            message: The log message
            context: Optional context dictionary
            exc_info: Include exception information (default: False)
            extra: Extra fields for structured logging
        """
        ...
