# QUALIA.CODE v1.1 - FileSystemService Implementation
# Platform abstraction for file system operations

import logging
import os
from pathlib import Path
from typing import Union
from .interfaces.IFileSystemService import IFileSystemService
from ..utils.decorators import log_execution, handle_errors

logger = logging.getLogger(__name__)


class FileSystemService(IFileSystemService):
    """
    Production implementation of IFileSystemService.
    
    Provides platform-abstracted file system operations with comprehensive
    error handling and logging per QUALIA.CODE architectural mandates.
    """

    def __init__(self) -> None:
        """Initialize FileSystemService."""
        logger.info("FileSystemService initialized")

    @log_execution(level="DEBUG")
    @handle_errors(fallback_return_value="")
    def read_file(self, file_path: Union[str, Path], mode: str = 'r', encoding: str = 'utf-8') -> str:
        """
        Read content from a file.
        
        Args:
            file_path: Path to the file to read
            mode: File opening mode ('r' for text)
            encoding: Text encoding
            
        Returns:
            str: File content
            
        Raises:
            FileNotFoundError: If file does not exist
            IOError: If read operation fails
        """
        path = Path(file_path)
        
        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        if not path.is_file():
            raise IOError(f"Path is not a file: {file_path}")
        
        with open(path, mode=mode, encoding=encoding) as f:
            content: str = f.read()
            return content

    @log_execution(level="DEBUG")
    @handle_errors(fallback_return_value=b"")
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
        path = Path(file_path)
        
        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        if not path.is_file():
            raise IOError(f"Path is not a file: {file_path}")
        
        with open(path, mode='rb') as f:
            return f.read()

    @log_execution(level="DEBUG")
    @handle_errors(fallback_return_value=None)
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
        path = Path(file_path)
        
        # Create parent directories if they don't exist
        path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(path, mode=mode, encoding=encoding) as f:
            f.write(content)

    @log_execution(level="DEBUG")
    @handle_errors(fallback_return_value=None)
    def write_binary(self, file_path: Union[str, Path], content: bytes) -> None:
        """
        Write binary content to a file.
        
        Args:
            file_path: Path to the file to write
            content: Binary content to write
            
        Raises:
            IOError: If write operation fails
        """
        path = Path(file_path)
        
        # Create parent directories if they don't exist
        path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(path, mode='wb') as f:
            f.write(content)

    @log_execution(level="DEBUG")
    def exists(self, file_path: Union[str, Path]) -> bool:
        """
        Check if a file or directory exists.
        
        Args:
            file_path: Path to check
            
        Returns:
            bool: True if path exists, False otherwise
        """
        return Path(file_path).exists()

    @log_execution(level="DEBUG")
    def is_file(self, file_path: Union[str, Path]) -> bool:
        """
        Check if path is a file.
        
        Args:
            file_path: Path to check
            
        Returns:
            bool: True if path is a file, False otherwise
        """
        return Path(file_path).is_file()

    @log_execution(level="DEBUG")
    def is_directory(self, file_path: Union[str, Path]) -> bool:
        """
        Check if path is a directory.
        
        Args:
            file_path: Path to check
            
        Returns:
            bool: True if path is a directory, False otherwise
        """
        return Path(file_path).is_dir()

    @log_execution(level="DEBUG")
    def join_path(self, *parts: str) -> str:
        """
        Join path components into a complete path.
        
        Args:
            *parts: Path components to join
            
        Returns:
            str: Joined path
        """
        return str(Path(*parts))

    @log_execution(level="DEBUG")
    def get_absolute_path(self, file_path: Union[str, Path]) -> str:
        """
        Get absolute path from relative path.
        
        Args:
            file_path: Path to convert
            
        Returns:
            str: Absolute path
        """
        return str(Path(file_path).resolve())
