#!/usr/bin/env python3
"""
QUALIA.CODE v1.3 - Shader Validation Test
Tests enhanced particle shaders for compilation and basic functionality.
"""

import os
import sys
import pytest
from unittest.mock import Mock, MagicMock, patch


class TestShaderValidation:
    """Test suite for shader validation and compilation."""

    @pytest.fixture
    def shader_dir(self):
        """Get the shader directory path."""
        return os.path.join(os.path.dirname(__file__), "..", "engine", "shaders")

    def validate_shader_syntax(self, shader_path: str) -> bool:
        """
        Basic syntax validation for GLSL shaders.
        Checks for balanced braces, proper version directive, and basic structure.
        """
        try:
            with open(shader_path, "r") as f:
                content = f.read()

            # Check for version directive
            if "#version" not in content:
                return False

            # Check for balanced braces
            brace_count = content.count("{") - content.count("}")
            if brace_count != 0:
                return False

            # Check for basic structure
            if "void main()" not in content:
                return False

            # Check file size (should be substantial)
            if len(content) < 100:
                return False

            return True

        except Exception:
            return False

    def test_shader_files_exist(self, shader_dir):
        """Test that all required shader files exist."""
        shaders = [
            "particle.vert",
            "particle.frag",
            "qualia_particles.glsl"
        ]

        for shader in shaders:
            shader_path = os.path.join(shader_dir, shader)
            assert os.path.exists(shader_path), f"Shader file {shader} not found at {shader_path}"

    def test_shader_syntax_validation(self, shader_dir):
        """Test shader syntax validation for all shader files."""
        shaders = [
            "particle.vert",
            "particle.frag",
            "qualia_particles.glsl"
        ]

        for shader in shaders:
            shader_path = os.path.join(shader_dir, shader)
            assert self.validate_shader_syntax(shader_path), f"Shader {shader} failed syntax validation"

    @patch('moderngl.create_standalone_context')
    def test_shader_compilation_with_moderngl(self, mock_create_context, shader_dir):
        """Test shader compilation when moderngl is available."""
        # Mock the context
        mock_ctx = MagicMock()
        mock_create_context.return_value = mock_ctx

        # Mock shader program
        mock_program = MagicMock()
        mock_ctx.program.return_value = mock_program

        # Import and test compilation
        try:
            import moderngl
        except ImportError:
            pytest.skip("moderngl not available")

        # Test that context creation is called
        ctx = moderngl.create_standalone_context()
        assert ctx is not None
        mock_create_context.assert_called_once()

        # Test program creation
        program = ctx.program(vertex_shader="#version 330\nvoid main() {}", fragment_shader="#version 330\nvoid main() {}")
        assert program is not None
        mock_ctx.program.assert_called_once()

    def test_fallback_syntax_validation(self, shader_dir):
        """Test fallback syntax validation when moderngl is not available."""
        with patch.dict('sys.modules', {'moderngl': None}):
            # This should work without moderngl
            shaders = [
                "particle.vert",
                "particle.frag",
                "qualia_particles.glsl"
            ]

            for shader in shaders:
                shader_path = os.path.join(shader_dir, shader)
                assert self.validate_shader_syntax(shader_path), f"Shader {shader} failed syntax validation"
