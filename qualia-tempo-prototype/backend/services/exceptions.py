# QUALIA.CODE v1.1 - Custom Exceptions for Rendering Pipeline
# Specific, meaningful exceptions for transparent error handling

from typing import Dict, Any, Optional


class RenderingPipelineError(Exception):
    """Base exception for all rendering pipeline failures."""

    def __init__(
        self, message: str, error_code: str = "RENDER_ERROR", context: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message)
        self.error_code = error_code
        self.context = context or {}
        self.timestamp = __import__("time").time()


class ShaderCompilationError(RenderingPipelineError):
    """Raised when shader compilation fails."""

    def __init__(
        self, message: str, shader_type: str = "unknown", context: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message, "SHADER_COMPILATION_ERROR", context)
        self.shader_type = shader_type


class FramebufferError(RenderingPipelineError):
    """Raised when framebuffer operations fail."""

    def __init__(
        self,
        message: str,
        framebuffer_name: str = "unknown",
        context: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(message, "FRAMEBUFFER_ERROR", context)
        self.framebuffer_name = framebuffer_name


class GPUResourceError(RenderingPipelineError):
    """Raised when GPU resource allocation or management fails."""

    def __init__(
        self, message: str, resource_type: str = "unknown", context: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message, "GPU_RESOURCE_ERROR", context)
        self.resource_type = resource_type


class SecurityException(Exception):
    """Raised when security validation fails."""

    def __init__(
        self, message: str, security_context: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message)
        self.security_context = security_context or {}
        self.timestamp = __import__("time").time()


class OpenGLContextError(RenderingPipelineError):
    """Raised when OpenGL context operations fail."""

    def __init__(self, message: str, context: Optional[Dict[str, Any]] = None):
        super().__init__(message, "OPENGL_CONTEXT_ERROR", context)


class ParticleEngineError(RenderingPipelineError):
    """Raised when particle engine operations fail."""

    def __init__(
        self, message: str, operation: str = "unknown", context: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message, "PARTICLE_ENGINE_ERROR", context)
        self.operation = operation


class RenderingInitializationError(RenderingPipelineError):
    """Raised when rendering service initialization fails."""

    def __init__(
        self, message: str, component: str = "unknown", context: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message, "RENDERING_INIT_ERROR", context)
        self.component = component