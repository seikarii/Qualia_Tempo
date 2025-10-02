# QUALIA.CODE v1.1 - Shader Introspection Service Tests
# ARCHITECTURAL COMPLIANCE: IoC Container Resolution
# Unit tests for ShaderIntrospectionService

import pytest
from backend.services.ShaderIntrospectionService import ShaderIntrospectionService


class TestShaderIntrospectionService:
    """Tests for ShaderIntrospectionService using real implementation."""

    @pytest.fixture
    def shader_service(self):
        """Provides a real ShaderIntrospectionService instance."""
        return ShaderIntrospectionService()

    def test_introspect_simple_uniforms(self, shader_service):
        """Test introspection of simple uniform types."""

        shader_source = """
        #version 430
        uniform ParticleUniforms {
            float time;
            int particle_count;
        };
        void main() {}
        """

        result = shader_service.introspect(shader_source)

        assert "uniforms" in result
        assert "struct_format" in result
        assert "total_size" in result

        uniforms = result["uniforms"]
        assert len(uniforms) == 2
        assert uniforms[0] == ("time", "float", 0)
        assert uniforms[1] == ("particle_count", "int", 4)

        assert result["struct_format"] == "fi"
        assert result["total_size"] == 8

    def test_introspect_vec3_uniform(self, shader_service):
        """Test introspection with vec3 uniform (std140 alignment)."""
        shader_source = """
        #version 430
        uniform ParticleUniforms {
            vec3 position;
            float time;
        };
        void main() {}
        """

        result = shader_service.introspect(shader_source)

        assert "uniforms" in result
        uniforms = result["uniforms"]
        assert len(uniforms) == 2
        # vec3 should be at offset 0, float at offset 12 (vec3 size 12, float alignment 4)
        assert uniforms[0] == ("position", "vec3", 0)
        assert uniforms[1] == ("time", "float", 12)

        assert result["struct_format"] == "3ff"
        assert result["total_size"] == 16

    def test_introspect_no_uniform_block(self, shader_service):
        """Test introspection when no uniform block is found."""
        shader_source = """
        #version 430
        void main() {}
        """

        result = shader_service.introspect(shader_source)

        assert result["uniforms"] == []
        assert result["struct_format"] == ""
        assert result["total_size"] == 0

    def test_introspect_complex_uniforms(self, shader_service):
        """Test introspection with multiple types and std140 alignment."""
        shader_source = """
        #version 430
        uniform ComplexUniforms {
            float a;
            vec3 b;
            int c;
            vec4 d;
        };
        void main() {}
        """

        result = shader_service.introspect(shader_source)

        uniforms = result["uniforms"]
        assert len(uniforms) == 4
        # Check offsets with std140 alignment
        assert uniforms[0] == ("a", "float", 0)      # float at 0
        assert uniforms[1] == ("b", "vec3", 16)      # vec3 aligned to 16
        assert uniforms[2] == ("c", "int", 28)       # int at 28
        assert uniforms[3] == ("d", "vec4", 32)      # vec4 aligned to 32

        assert result["struct_format"] == "f3fi4f"
        assert result["total_size"] == 48

    def test_introspect_malformed_uniforms(self, shader_service):
        """Test introspection with malformed uniform declarations."""
        shader_source = """
        #version 430
        uniform ParticleUniforms {
            float time;
            
            vec2 position;
        };
        void main() {}
        """

        result = shader_service.introspect(shader_source)

        # Should only parse valid uniforms
        uniforms = result["uniforms"]
        assert len(uniforms) == 2
        assert uniforms[0] == ("time", "float", 0)
        assert uniforms[1] == ("position", "vec2", 8)
        assert result is not None

    def test_introspect_malformed_uniforms_with_extra_data(self, shader_service):
        """Test introspection with malformed uniform declarations."""
        shader_source = """
        #version 430
        uniform ParticleUniforms {
            float time;
            
            vec2 position;
        };
        void main() {}
        """

        result = shader_service.introspect(shader_source)

        # Should only parse valid uniforms
        uniforms = result["uniforms"]
        assert len(uniforms) == 2
        assert uniforms[0] == ("time", "float", 0)
        assert uniforms[1] == ("position", "vec2", 8)
