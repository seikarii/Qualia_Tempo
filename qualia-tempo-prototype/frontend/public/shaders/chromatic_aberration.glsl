#version 300 es
/**
 * QUALIA.CODE v1.1 - Chromatic Aberration Shader
 * CRISALIDA.CODE v1.1 - Phase 1: Independent Effects
 *
 * Simulates lens chromatic aberration with radial RGB channel separation.
 * Rescued from _deprecated shaders - physically-inspired implementation.
 *
 * Key Features:
 * - Radial distortion from screen center
 * - Distance-based channel offset
 * - Red shifts outward, blue shifts inward (realistic)
 * - Resolution-independent effect
 *
 * Uniforms:
 * - inputTexture: Source image
 * - strength: Distortion intensity (0.001-0.005)
 *
 * Recommended Presets:
 * - Very Subtle: 0.001 (barely noticeable)
 * - Subtle: 0.002 (default, physically plausible)
 * - Noticeable: 0.003 (stylized)
 * - Strong: 0.005+ (artistic effect)
 */

precision highp float;

precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D inputTexture;
uniform float strength;

void main() {
    // Calculate direction and distance from screen center
    vec2 dir = vUv - 0.5;
    float dist = length(dir);
    
    // Normalize direction and scale by distance for radial effect
    vec2 offset = normalize(dir) * dist * strength;
    
    // Sample RGB channels with offset
    // Red shifts outward (negative offset)
    // Green stays centered (no offset)
    // Blue shifts inward (positive offset)
    float r = texture(inputTexture, vUv - offset).r;
    float g = texture(inputTexture, vUv).g;
    float b = texture(inputTexture, vUv + offset).b;
    
    fragColor = vec4(r, g, b, 1.0);
}
