# QUALIA.CODE v1.1 - SystemEnvironmentService Implementation
# Platform abstraction for system environment operations

import logging
import os
from typing import Optional, Dict
from .interfaces.ISystemEnvironmentService import ISystemEnvironmentService
from ..utils.decorators import log_execution

logger = logging.getLogger(__name__)


class SystemEnvironmentService(ISystemEnvironmentService):
    """
    Production implementation of ISystemEnvironmentService.
    
    Provides platform-abstracted system environment operations with 
    comprehensive logging per QUALIA.CODE architectural mandates.
    """

    def __init__(self) -> None:
        """Initialize SystemEnvironmentService."""
        logger.info("SystemEnvironmentService initialized")

    @log_execution(level="DEBUG")
    def get_env(self, key: str, default: Optional[str] = None) -> Optional[str]:
        """
        Get an environment variable value.
        
        Args:
            key: Environment variable name
            default: Default value if variable is not set
            
        Returns:
            Optional[str]: Environment variable value or default
        """
        value = os.getenv(key, default)
        if value is None:
            logger.debug(f"Environment variable '{key}' not set, using default: {default}")
        return value

    @log_execution(level="DEBUG")
    def set_env(self, key: str, value: str) -> None:
        """
        Set an environment variable.
        
        Args:
            key: Environment variable name
            value: Value to set
        """
        os.environ[key] = value
        logger.debug(f"Environment variable '{key}' set")

    @log_execution(level="DEBUG")
    def get_all_env(self) -> Dict[str, str]:
        """
        Get all environment variables.
        
        Returns:
            Dict[str, str]: Dictionary of all environment variables
        """
        return dict(os.environ)

    @log_execution(level="DEBUG")
    def get_cwd(self) -> str:
        """
        Get current working directory.
        
        Returns:
            str: Current working directory path
        """
        return os.getcwd()

    @log_execution(level="DEBUG")
    def get_home_dir(self) -> str:
        """
        Get user's home directory.
        
        Returns:
            str: Home directory path
        """
        return os.path.expanduser("~")
