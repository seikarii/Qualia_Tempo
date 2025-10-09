"""High-Fidelity Mock for IFileSystemService Interface"""
from typing import Dict, List, Union
from pathlib import Path
from backend.services.interfaces.IFileSystemService import IFileSystemService


class MockFileSystemService(IFileSystemService):
    """
    High-fidelity mock for IFileSystemService.
    Uses in-memory file system for deterministic testing.
    """
    
    def __init__(self):
        self.reset()
    
    def reset(self) -> None:
        """Reset in-memory file system."""
        self.files: Dict[str, str] = {}
        self.binary_files: Dict[str, bytes] = {}
        self.read_calls: List[str] = []
        self.write_calls: List[str] = []
    
    def read_file(self, file_path: Union[str, Path], mode: str = 'r', encoding: str = 'utf-8') -> str:
        """Read from in-memory file system."""
        path_str = str(file_path)
        self.read_calls.append(path_str)
        
        if path_str not in self.files:
            raise FileNotFoundError(f"File not found: {path_str}")
        
        return self.files[path_str]
    
    def read_binary(self, file_path: Union[str, Path]) -> bytes:
        """Read binary from in-memory file system."""
        path_str = str(file_path)
        self.read_calls.append(path_str)
        
        if path_str not in self.binary_files:
            raise FileNotFoundError(f"File not found: {path_str}")
        
        return self.binary_files[path_str]
    
    def write_file(self, file_path: Union[str, Path], content: str, mode: str = 'w', encoding: str = 'utf-8') -> None:
        """Write to in-memory file system."""
        path_str = str(file_path)
        self.write_calls.append(path_str)
        
        if mode == 'a' and path_str in self.files:
            self.files[path_str] += content
        else:
            self.files[path_str] = content
    
    def write_binary(self, file_path: Union[str, Path], content: bytes) -> None:
        """Write binary to in-memory file system."""
        path_str = str(file_path)
        self.write_calls.append(path_str)
        self.binary_files[path_str] = content
    
    def exists(self, file_path: Union[str, Path]) -> bool:
        """Check if file exists in memory."""
        path_str = str(file_path)
        return path_str in self.files or path_str in self.binary_files
    
    def is_file(self, file_path: Union[str, Path]) -> bool:
        """Check if path is a file."""
        return self.exists(file_path)
    
    def is_directory(self, file_path: Union[str, Path]) -> bool:
        """Check if path is a directory."""
        return False  # Simplified for mock
    
    def join_path(self, *parts: str) -> str:
        """Join path components."""
        return str(Path(*parts))
    
    def get_absolute_path(self, file_path: Union[str, Path]) -> str:
        """Get absolute path."""
        return str(Path(file_path).absolute())
    
    # Helper methods for testing
    def add_file(self, path: str, content: str) -> None:
        """Add a file to mock file system for test setup."""
        self.files[path] = content
    
    def add_binary_file(self, path: str, content: bytes) -> None:
        """Add a binary file to mock file system for test setup."""
        self.binary_files[path] = content
    
    def was_read(self, path: str) -> bool:
        """Check if file was read."""
        return path in self.read_calls
    
    def was_written(self, path: str) -> bool:
        """Check if file was written."""
        return path in self.write_calls
