#version 300 es
/**
 * CRISALIDA.CODE v1.1 - Bloom Composite Shader
 * Phase 2: Final bloom composition with scene blending
 * 
 * Blends bloom result with original scene using configurable blend modes.
 * Supports additive and screen blending for natural HDR bloom effects.
 */

precision highp float;

// Inputs from vertex shader
in vec2 vUv;

// Uniforms
uniform sampler2D tScene;      // Original scene color
uniform sampler2D tBloom;      // Bloom result from upsample chain
uniform float uIntensity;      // Bloom intensity multiplier
uniform int uBlendMode;        // 0: additive, 1: screen

// Output
out vec4 fragColor;

void main() {
    vec4 sceneColor = texture(tScene, vUv);
    vec4 bloomColor = texture(tBloom, vUv);
    
    // Apply intensity
    bloomColor *= uIntensity;
    
    vec4 result;
    
    if (uBlendMode == 0) {
        // Additive blending
        result = sceneColor + bloomColor;
    } else {
        // Screen blending: 1 - (1 - A) * (1 - B)
        result = vec4(1.0) - (vec4(1.0) - sceneColor) * (vec4(1.0) - bloomColor);
    }
    
    // Preserve alpha
    result.a = sceneColor.a;
    
    fragColor = result;
}
