"""High-Fidelity Mock for ISecurityService"""
from typing import List, Optional
from backend.services.interfaces.ISecurityService import ISecurityService


class MockSecurityService(ISecurityService):
    """High-fidelity mock for ISecurityService."""
    
    def __init__(self):
        self.reset()
    
    def reset(self) -> None:
        """Reset mock state."""
        self.validate_calls: List[str] = []
        self.sanitize_calls: List[str] = []
        self.allowed_paths = ["/safe/path", "/config"]
    
    def validate_path(self, path: str) -> bool:
        """Validate file path."""
        self.validate_calls.append(path)
        return any(path.startswith(allowed) for allowed in self.allowed_paths)
    
    def sanitize_input(self, input_data: str) -> str:
        """Sanitize user input."""
        self.sanitize_calls.append(input_data)
        return input_data.replace("<", "&lt;").replace(">", "&gt;")
    
    def check_permissions(self, user_id: str, resource: str) -> bool:
        """Check user permissions."""
        return user_id == "admin" or resource == "public"
