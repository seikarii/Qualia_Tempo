# QUALIA.CODE v1.1 - Shader Introspection Service
# Dynamically parses GLSL shaders to extract uniform information

import re
from typing import Dict, List, Tuple, Any
from backend.services.interfaces.IShaderIntrospectionService import (
    IShaderIntrospectionService,
)
from backend.utils.decorators import log_execution, handle_errors


class ShaderIntrospectionService(IShaderIntrospectionService):
    """
    Service for introspecting GLSL shader source code.

    Parses uniform buffer objects (UBOs) to extract uniform names, types,
    and compute proper struct packing format for Python.
    """

    # GLSL type to Python struct format mapping
    TYPE_MAPPING = {
        "float": "f",
        "int": "i",
        "uint": "I",
        "vec2": "2f",
        "vec3": "3f",
        "vec4": "4f",
        "mat4": "16f",
    }

    def __init__(self) -> None:
        """Initialize the shader introspection service."""
        self._type_sizes = {
            "float": 4,
            "int": 4,
            "uint": 4,
            "vec2": 8,
            "vec3": 12,
            "vec4": 16,
            "mat4": 64,
        }

    @log_execution(level="DEBUG")
    @handle_errors(fallback_return_value={})
    def introspect(self, shader_source: str) -> Dict[str, Any]:
        """
        Parse GLSL shader source and extract UBO uniform information.

        Uses regex to find uniform declarations within uniform blocks.
        Computes proper struct format and offsets.

        Args:
            shader_source: The GLSL shader source code

        Returns:
            Dictionary with uniform information
        """
        uniforms = self._extract_uniforms(shader_source)
        struct_format = self._build_struct_format(uniforms)
        total_size = self._calculate_total_size(uniforms)

        return {
            "uniforms": uniforms,
            "struct_format": struct_format,
            "total_size": total_size,
        }

    def _extract_uniforms(self, shader_source: str) -> List[Tuple[str, str, int]]:
        """
        Extract uniform declarations from shader source.

        Looks for patterns like:
        uniform SomeBlock {
            float time;
            vec3 position;
        };

        Returns list of (name, type, offset) tuples.
        """
        # Regex to match uniform block contents
        uniform_pattern = r"uniform\s+\w+\s*\{([^}]+)\}"
        block_match = re.search(uniform_pattern, shader_source, re.DOTALL)

        if not block_match:
            return []

        block_content = block_match.group(1)

        # Extract individual uniform declarations
        uniforms = []
        offset = 0

        for line in block_content.split(";"):
            line = line.strip()
            if not line:
                continue

            # Match type and name
            match = re.match(r"(\w+)\s+(\w+)", line.strip())
            if match:
                type_name, var_name = match.groups()
                if type_name in self._type_sizes:
                    size = self._type_sizes[type_name]
                    uniforms.append((var_name, type_name, offset))
                    offset += size

        return uniforms

    def _build_struct_format(self, uniforms: List[Tuple[str, str, int]]) -> str:
        """Build Python struct format string from uniforms."""
        format_parts = []
        for name, type_name, offset in uniforms:
            if type_name in self.TYPE_MAPPING:
                format_parts.append(self.TYPE_MAPPING[type_name])

        return "".join(format_parts)

    def _calculate_total_size(self, uniforms: List[Tuple[str, str, int]]) -> int:
        """Calculate total size of uniform block."""
        if not uniforms:
            return 0
        last_uniform = uniforms[-1]
        return last_uniform[2] + self._type_sizes[last_uniform[1]]
