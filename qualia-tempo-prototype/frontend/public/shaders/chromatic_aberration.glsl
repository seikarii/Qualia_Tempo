/**
 * QUALIA.CODE v1.1 - Chromatic Aberration Shader
 * CRISALIDA.CODE v1.1 - Phase 1: Independent Effects
 *
 * Radial chromatic aberration effect simulating lens distortion.
 * Rescued from _deprecated shaders - elite quality implementation.
 *
 * Key Features:
 * - Distance-based RGB channel separation
 * - Radial distortion from screen center
 * - Subtle, physically-plausible effect
 * - Configurable strength
 *
 * Uniforms:
 * - inputTexture: Source image
 * - strength: Aberration intensity (0.001-0.005, typical: 0.002)
 *
 * Visual Effect:
 * - Red channel shifts outward from center
 * - Blue channel shifts inward
 * - Green channel stays centered
 * - Effect intensity increases with distance from center
 */

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
