/**
 * QUALIA.CODE v1.1 - Sharpening Shader (Adaptive Laplacian)
 * CRISALIDA.CODE v1.1 - Phase 1: Independent Effects
 *
 * Edge-aware sharpening using adaptive Laplacian kernel.
 * Rescued from _deprecated shaders - elite quality implementation.
 *
 * Key Features:
 * - 4-neighbor Laplacian kernel for edge detection
 * - Adaptive strength based on edge magnitude (prevents oversharpening)
 * - Smooth falloff using smoothstep
 * - Configurable sharpness intensity
 *
 * Uniforms:
 * - inputTexture: Source image to sharpen
 * - resolution: Screen resolution for pixel size calculation
 * - sharpness: Sharpening intensity (0.0-1.0, typical: 0.2-0.5)
 */

precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D inputTexture;
uniform vec2 resolution;
uniform float sharpness;

void main() {
    vec2 pixelSize = 1.0 / resolution;

    // Sample 5-point cross pattern (center + 4 neighbors)
    vec3 center = texture(inputTexture, vUv).rgb;
    vec3 left   = texture(inputTexture, vUv + vec2(-pixelSize.x, 0.0)).rgb;
    vec3 right  = texture(inputTexture, vUv + vec2( pixelSize.x, 0.0)).rgb;
    vec3 top    = texture(inputTexture, vUv + vec2(0.0,  pixelSize.y)).rgb;
    vec3 bottom = texture(inputTexture, vUv + vec2(0.0, -pixelSize.y)).rgb;

    // Laplacian operator: ∇²f = 4*center - sum(neighbors)
    vec3 laplacian = center * 4.0 - (left + right + top + bottom);

    // Edge detection: High laplacian magnitude indicates strong edge
    float edgeMagnitude = length(laplacian);

    // Adaptive sharpening: Reduce strength on strong edges to prevent halos
    // smoothstep(0.5, 0.0, x) = 1.0 when x=0 (flat), 0.0 when x>=0.5 (edge)
    float adaptiveStrength = sharpness * smoothstep(0.5, 0.0, edgeMagnitude);

    // Apply sharpening
    vec3 sharpened = center + laplacian * adaptiveStrength;

    // Output clamped result
    fragColor = vec4(clamp(sharpened, 0.0, 1.0), 1.0);
}
