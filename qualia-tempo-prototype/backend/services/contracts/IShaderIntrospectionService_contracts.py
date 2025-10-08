# QUALIA.CODE v1.1 - IShaderIntrospectionService Contracts
from dataclasses import dataclass

@dataclass
class ShaderIntrospectionConfig:
    """Configuration contract for ShaderIntrospectionService."""
    shader_directory: str = "public/shaders"
    enable_caching: bool = True
    enable_validation: bool = True
    auto_reload: bool = False
