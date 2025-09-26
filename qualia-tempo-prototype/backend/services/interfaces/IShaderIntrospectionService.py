# QUALIA.CODE v1.1 - Shader Introspection Service Interface
# Defines the contract for GLSL shader introspection

from abc import ABC, abstractmethod
from typing import Dict, List, Tuple, Optional


class IShaderIntrospectionService(ABC):
    """
    Interface for shader introspection service.
    
    This service dynamically parses GLSL shader source code to extract
    uniform buffer object (UBO) information, including uniform names,
    types, and their order for proper struct packing.
    """

    @abstractmethod
    def introspect(self, shader_source: str) -> Dict[str, any]:
        """
        Parse GLSL shader source and extract UBO uniform information.
        
        Args:
            shader_source: The GLSL shader source code as a string
            
        Returns:
            Dictionary containing:
            - 'uniforms': List of (name, type, offset) tuples
            - 'struct_format': Python struct format string
            - 'total_size': Total size in bytes
        """
        pass