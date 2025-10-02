# QUALIA.CODE v1.1 - IFileSystemService Interface
# Platform abstraction for file system operations

from abc import ABC, abstractmethod
from typing import Optional, Union
from pathlib import Path


class IFileSystemService(ABC):
    """
    Interface for file system operations abstraction.
    
    RATIONALE: Per QUALIA.CODE §4 (Platform Abstraction is Mandatory), 
    direct use of platform-specific APIs like open(), Path.read_text(), etc. 
    must be channeled through injectable services to enable testability 
    and prevent platform coupling.
    """

    @abstractmethod
    def read_file(self, file_path: Union[str, Path], mode: str = 'r', encoding: str = 'utf-8') -> str:
        """
        Read content from a file.
        
        Args:
            file_path: Path to the file to read
            mode: File opening mode ('r' for text, 'rb' for binary)
            encoding: Text encoding (used when mode is text)
            
        Returns:
            str: File content
            
        Raises:
            FileNotFoundError: If file does not exist
            IOError: If read operation fails
        """
        pass

    @abstractmethod
    def read_binary(self, file_path: Union[str, Path]) -> bytes:
        """
        Read binary content from a file.
        
        Args:
            file_path: Path to the file to read
            
        Returns:
            bytes: Binary file content
            
        Raises:
            FileNotFoundError: If file does not exist
            IOError: If read operation fails
        """
        pass

    @abstractmethod
    def write_file(self, file_path: Union[str, Path], content: str, mode: str = 'w', encoding: str = 'utf-8') -> None:
        """
        Write content to a file.
        
        Args:
            file_path: Path to the file to write
            content: Content to write
            mode: File opening mode ('w' to overwrite, 'a' to append)
            encoding: Text encoding
            
        Raises:
            IOError: If write operation fails
        """
        pass

    @abstractmethod
    def write_binary(self, file_path: Union[str, Path], content: bytes) -> None:
        """
        Write binary content to a file.
        
        Args:
            file_path: Path to the file to write
            content: Binary content to write
            
        Raises:
            IOError: If write operation fails
        """
        pass

    @abstractmethod
    def exists(self, file_path: Union[str, Path]) -> bool:
        """
        Check if a file or directory exists.
        
        Args:
            file_path: Path to check
            
        Returns:
            bool: True if path exists, False otherwise
        """
        pass

    @abstractmethod
    def is_file(self, file_path: Union[str, Path]) -> bool:
        """
        Check if path is a file.
        
        Args:
            file_path: Path to check
            
        Returns:
            bool: True if path is a file, False otherwise
        """
        pass

    @abstractmethod
    def is_directory(self, file_path: Union[str, Path]) -> bool:
        """
        Check if path is a directory.
        
        Args:
            file_path: Path to check
            
        Returns:
            bool: True if path is a directory, False otherwise
        """
        pass

    @abstractmethod
    def join_path(self, *parts: str) -> str:
        """
        Join path components into a complete path.
        
        Args:
            *parts: Path components to join
            
        Returns:
            str: Joined path
        """
        pass

    @abstractmethod
    def get_absolute_path(self, file_path: Union[str, Path]) -> str:
        """
        Get absolute path from relative path.
        
        Args:
            file_path: Path to convert
            
        Returns:
            str: Absolute path
        """
        pass
