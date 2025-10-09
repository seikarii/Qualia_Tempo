# QUALIA.CODE v1.1 - QualiaLogger Service
# Centralized logging service with structured logging support

import logging
import json
from typing import Any, Dict, Optional
from datetime import datetime
from .interfaces.ILogger import ILogger
from .contracts.ILogger_contracts import LoggerConfig


class QualiaLogger(ILogger):
    """
    Centralized logging service for backend.
    
    Provides:
    - Structured logging with context
    - JSON formatting support
    - Configurable log levels
    - File and console output
    """
    
    def __init__(self, config: LoggerConfig):
        """
        Initialize QualiaLogger.
        
        Args:
            config: Logger configuration object
        """
        self._config = config
        self._logger = logging.getLogger("QualiaTempo")
        self._configure_logger()
        
    def _configure_logger(self) -> None:
        """Configure the internal logger with settings from config."""
        # Set log level
        level = getattr(logging, self._config.log_level.upper(), logging.INFO)
        self._logger.setLevel(level)
        
        # Clear existing handlers
        self._logger.handlers.clear()
        
        # Console handler
        console_handler = logging.StreamHandler()
        console_handler.setLevel(level)
        console_formatter = logging.Formatter(self._config.log_format)
        console_handler.setFormatter(console_formatter)
        self._logger.addHandler(console_handler)
        
        # File handler (if enabled)
        if self._config.enable_file_logging:
            from logging.handlers import RotatingFileHandler
            file_handler = RotatingFileHandler(
                self._config.log_file_path,
                maxBytes=self._config.max_file_size_mb * 1024 * 1024,
                backupCount=self._config.backup_count
            )
            file_handler.setLevel(level)
            file_formatter = logging.Formatter(self._config.log_format)
            file_handler.setFormatter(file_formatter)
            self._logger.addHandler(file_handler)
            
    def _format_message(self, message: str, context: Optional[Dict[str, Any]] = None) -> str:
        """
        Format message with context.
        
        Args:
            message: Log message
            context: Optional context dictionary
            
        Returns:
            Formatted message string
        """
        if context:
            context_str = json.dumps(context, default=str)
            return f"{message} | Context: {context_str}"
        return message
        
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
            exc_info: Include exception information
            extra: Extra fields for structured logging
        """
        self._logger.debug(
            self._format_message(message, context),
            exc_info=exc_info,
            extra=extra or {}
        )
        
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
            exc_info: Include exception information
            extra: Extra fields for structured logging
        """
        self._logger.info(
            self._format_message(message, context),
            exc_info=exc_info,
            extra=extra or {}
        )
        
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
            exc_info: Include exception information
            extra: Extra fields for structured logging
        """
        self._logger.warning(
            self._format_message(message, context),
            exc_info=exc_info,
            extra=extra or {}
        )
        
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
            exc_info: Include exception information
            extra: Extra fields for structured logging
        """
        self._logger.error(
            self._format_message(message, context),
            exc_info=exc_info,
            extra=extra or {}
        )
        
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
            exc_info: Include exception information
            extra: Extra fields for structured logging
        """
        self._logger.critical(
            self._format_message(message, context),
            exc_info=exc_info,
            extra=extra or {}
        )
