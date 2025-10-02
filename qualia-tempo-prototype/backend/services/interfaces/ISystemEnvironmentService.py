# QUALIA.CODE v1.1 - ISystemEnvironmentService Interface
# Platform abstraction for system environment operations

from abc import ABC, abstractmethod
from typing import Optional, Dict


class ISystemEnvironmentService(ABC):
    """
    Interface for system environment operations abstraction.
    
    RATIONALE: Per QUALIA.CODE §4 (Platform Abstraction is Mandatory), 
    direct use of platform-specific APIs like os.getenv(), os.getcwd(), etc. 
    must be channeled through injectable services to enable testability 
    and prevent platform coupling.
    """

    @abstractmethod
    def get_env(self, key: str, default: Optional[str] = None) -> Optional[str]:
        """
        Get an environment variable value.
        
        Args:
            key: Environment variable name
            default: Default value if variable is not set
            
        Returns:
            Optional[str]: Environment variable value or default
        """
        pass

    @abstractmethod
    def set_env(self, key: str, value: str) -> None:
        """
        Set an environment variable.
        
        Args:
            key: Environment variable name
            value: Value to set
        """
        pass

    @abstractmethod
    def get_all_env(self) -> Dict[str, str]:
        """
        Get all environment variables.
        
        Returns:
            Dict[str, str]: Dictionary of all environment variables
        """
        pass

    @abstractmethod
    def get_cwd(self) -> str:
        """
        Get current working directory.
        
        Returns:
            str: Current working directory path
        """
        pass

    @abstractmethod
    def get_home_dir(self) -> str:
        """
        Get user's home directory.
        
        Returns:
            str: Home directory path
        """
        pass
