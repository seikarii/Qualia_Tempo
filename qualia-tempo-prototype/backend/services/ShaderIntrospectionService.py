# QUALIA.CODE v1.1 - Shader Introspection Service
# Dynamically parses GLSL shaders to extract uniform information

from __future__ import annotations
from typing import Dict as TypingDict, List, Tuple, Any
from pyparsing import *
from backend.services.interfaces.IShaderIntrospectionService import (
    IShaderIntrospectionService,
)
from backend.services.interfaces.ILogger import ILogger
from backend.services.contracts.IShaderIntrospectionService_contracts import ShaderIntrospectionConfig
from backend.utils.decorators import log_execution, handle_errors


class ShaderIntrospectionService(IShaderIntrospectionService):
    """
    Service for introspecting GLSL shader source code.

    Parses uniform buffer objects (UBOs) to extract uniform names, types,
    and compute proper struct packing format for Python.
    
    QUALIA.CODE v1.1: Now uses injected ILogger and ShaderIntrospectionConfig.
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

    def __init__(self, config: ShaderIntrospectionConfig, logger: ILogger) -> None:
        """
        Initialize the shader introspection service with dependency injection.
        
        Args:
            config: Service configuration
            logger: Injected logger service
        """
        self._config = config
        self._logger = logger
        self._type_sizes = {
            "float": 4,
            "int": 4,
            "uint": 4,
            "vec2": 8,
            "vec3": 12,
            "vec4": 16,
            "mat4": 64,
        }

        # Setup GLSL parser using pyparsing
        identifier = Word(alphas + "_", alphanums + "_")
        type_spec = oneOf("float int uint vec2 vec3 vec4 mat4")
        uniform_decl = Group(type_spec + identifier) + Suppress(";")
        uniform_block = Suppress("uniform") + identifier + Suppress("{") + Group(ZeroOrMore(uniform_decl)) + Suppress("};")
        
        # Parser for the entire shader that extracts uniform blocks
        self.uniform_block_parser = uniform_block

    @log_execution(level="DEBUG")
    def get_std140_size_and_alignment(self, type_name: str) -> Tuple[int, int]:
        """
        Get size and alignment for a GLSL type according to std140 layout rules.
        
        Args:
            type_name: The GLSL type name
            
        Returns:
            Tuple of (size, alignment) in bytes
        """
        std140_specs = {
            "float": (4, 4),
            "int": (4, 4),
            "uint": (4, 4),
            "vec2": (8, 8),
            "vec3": (12, 16),  # vec3 has vec4 alignment
            "vec4": (16, 16),
            "mat4": (64, 16),
        }
        
        if type_name in std140_specs:
            return std140_specs[type_name]
        else:
            raise ValueError(f"Unsupported GLSL type: {type_name}")

    @log_execution(level="DEBUG")
    def align_offset(self, offset: int, alignment: int) -> int:
        """Align offset to the specified alignment boundary."""
        return ((offset + alignment - 1) // alignment) * alignment

    @log_execution(level="DEBUG")
    @handle_errors(fallback_return_value={})
    def introspect(self, shader_source: str) -> dict[str, Any]:
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
        Extract uniform declarations from shader source using pyparsing.

        Parses the GLSL source to find uniform block declarations and extract
        uniform names, types, and compute proper std140 offset calculation.

        Args:
            shader_source: The GLSL shader source code

        Returns:
            List of (name, type, offset) tuples
        """
        # Find the uniform block in the shader source
        start = shader_source.find("uniform")
        if start == -1:
            return []
        
        # Find the end of the uniform block
        brace_count = 0
        end = start
        for i in range(start, len(shader_source)):
            if shader_source[i] == "{":
                brace_count += 1
            elif shader_source[i] == "}":
                brace_count -= 1
                if brace_count == 0:
                    # Include the semicolon after }
                    j = i + 1
                    while j < len(shader_source) and shader_source[j].isspace():
                        j += 1
                    if j < len(shader_source) and shader_source[j] == ";":
                        end = j + 1
                    else:
                        end = i + 1
                    break
        
        if brace_count != 0:
            return []
        
        uniform_block_text = shader_source[start:end]
        
        try:
            # Parse the uniform block
            parsed = self.uniform_block_parser.parseString(uniform_block_text, parseAll=True)
            
            # Extract declarations from the parsed result
            # parsed structure: [block_name, [declarations]]
            declarations = parsed[1]  # The Group of declarations
            
            uniforms = []
            offset = 0

            for decl in declarations:
                type_name = decl[0]
                var_name = decl[1]
                
                # Calculate offset using std140 rules
                size, alignment = self.get_std140_size_and_alignment(type_name)
                offset = self.align_offset(offset, alignment)

                uniforms.append((var_name, type_name, offset))
                offset += size

            return uniforms
            
        except ParseException:
            # If parsing fails, return empty list
            return []

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
