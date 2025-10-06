#version 300 es

// QUALIA.CODE v1.3 - Optimized Fullscreen Quad (No VBO)
// Genera un triángulo a pantalla completa sin necesidad de buffers.
// Compatible with WebGL 2 / GLSL ES 3.0

out vec2 vUv;

// Vértices de un triángulo que cubre toda la pantalla en clip-space
const vec2 positions[3] = vec2[](
    vec2(-1.0, -1.0),
    vec2( 3.0, -1.0),
    vec2(-1.0,  3.0)
);

// UVs correspondientes para el triángulo
const vec2 uvs[3] = vec2[](
    vec2(0.0, 0.0),
    vec2(2.0, 0.0),
    vec2(0.0, 2.0)
);

void main() {
    // Asigna la posición y UV basándose en el índice del vértice
    gl_Position = vec4(positions[gl_VertexID], 0.0, 1.0);
    vUv = uvs[gl_VertexID];
}