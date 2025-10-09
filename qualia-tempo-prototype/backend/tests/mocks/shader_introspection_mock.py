"""High-Fidelity Mock for IShaderIntrospectionService"""
from typing import Dict, List, Any
from backend.services.interfaces.IShaderIntrospectionService import IShaderIntrospectionService


class MockShaderIntrospectionService(IShaderIntrospectionService):
    """High-fidelity mock for IShaderIntrospectionService."""
    
    def __init__(self):
        self.reset()
    
    def reset(self) -> None:
        """Reset mock state."""
        self.analyze_calls: List[str] = []
        self.shader_data: Dict[str, Dict[str, Any]] = {}
    
    def analyze_shader(self, shader_code: str) -> Dict[str, Any]:
        """Analyze shader code."""
        self.analyze_calls.append(shader_code)
        return {
            "uniforms": ["u_time", "u_resolution"],
            "attributes": ["a_position", "a_texcoord"],
            "complexity": "medium"
        }
    
    def get_shader_uniforms(self, shader_id: str) -> List[str]:
        """Get shader uniforms."""
        return ["u_time", "u_resolution", "u_color"]
    
    def validate_shader(self, shader_code: str) -> bool:
        """Validate shader code."""
        return len(shader_code) > 0 and "void main()" in shader_code
    
    def introspect(self, shader_source: str) -> Dict[str, Any]:
        """Parse GLSL shader source and extract UBO uniform information."""
        return {
            "uniforms": [("u_time", "float", 0), ("u_resolution", "vec2", 4)],
            "struct_format": "f2f",
            "total_size": 12
        }
