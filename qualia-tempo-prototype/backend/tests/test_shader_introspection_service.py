# QUALIA.CODE v1.1 - Shader Introspection Service Tests
# Unit tests for ShaderIntrospectionService

import pytest
from backend.services.ShaderIntrospectionService import ShaderIntrospectionService


class TestShaderIntrospectionService:
    """Tests for ShaderIntrospectionService."""

    def test_introspect_simple_uniforms(self):
        """Test introspection of simple uniform types."""
        service = ShaderIntrospectionService()
        
        shader_source = """
        #version 430
        uniform ParticleUniforms {
            float time;
            int particle_count;
        };
        void main() {}
        """
        
        result = service.introspect(shader_source)
        
        assert 'uniforms' in result
        assert 'struct_format' in result
        assert 'total_size' in result
        
        uniforms = result['uniforms']
        assert len(uniforms) == 2
        assert uniforms[0] == ('time', 'float', 0)
        assert uniforms[1] == ('particle_count', 'int', 4)
        
        assert result['struct_format'] == 'fi'
        assert result['total_size'] == 8

    def test_introspect_vec3_uniform(self):
        """Test introspection with vec3 uniform."""
        service = ShaderIntrospectionService()
        
        shader_source = """
        #version 430
        uniform ParticleUniforms {
            vec3 position;
            float time;
        };
        void main() {}
        """
        
        result = service.introspect(shader_source)
        
        uniforms = result['uniforms']
        assert len(uniforms) == 2
        assert uniforms[0] == ('position', 'vec3', 0)
        assert uniforms[1] == ('time', 'float', 12)
        
        assert result['struct_format'] == '3ff'
        assert result['total_size'] == 16

    def test_introspect_no_uniform_block(self):
        """Test introspection when no uniform block is found."""
        service = ShaderIntrospectionService()
        
        shader_source = """
        #version 430
        void main() {}
        """
        
        result = service.introspect(shader_source)
        
        assert result['uniforms'] == []
        assert result['struct_format'] == ''
        assert result['total_size'] == 0

    def test_introspect_malformed_uniforms(self):
        """Test introspection with malformed uniform declarations."""
        service = ShaderIntrospectionService()
        
        shader_source = """
        #version 430
        uniform ParticleUniforms {
            float;
            invalid_type var;
            vec2 position;
        };
        void main() {}
        """
        
        result = service.introspect(shader_source)
        
        # Should only parse valid uniforms
        uniforms = result['uniforms']
        assert len(uniforms) == 1
        assert uniforms[0] == ('position', 'vec2', 0)