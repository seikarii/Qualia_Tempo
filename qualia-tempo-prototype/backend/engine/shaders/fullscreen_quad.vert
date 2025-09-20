#version 330 core

// QUALIA.CODE v1.2 - Optimized Fullscreen Quad Vertex Shader
// Memory-efficient approach without vertex buffer for UV coordinates

layout (location = 0) in vec2 position;

out vec2 uv;

void main() {
    // Calculate UV coordinates directly from vertex position
    // This eliminates the need for a separate UV vertex buffer
    uv = position * 0.5 + 0.5;
    
    // Flip Y coordinate for proper texture sampling
    uv.y = 1.0 - uv.y;
    
    gl_Position = vec4(position, 0.0, 1.0);
}