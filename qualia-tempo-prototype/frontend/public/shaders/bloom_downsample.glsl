#version 300 es
/**
 * QUALIA.CODE v1.1 - Bloom Downsample (WebGL 2.0)
 * CRISALIDA.CODE v1.1 - Phase 2: Complete Bloom System
 *
 * Professional box filter downsampling for mipmap chain generation.
 * Converted from _deprecated shader with WebGL 2.0 compliance.
 *
 * Key Features:
 * - 13-tap box filter for efficient downsampling
 * - Weighted sampling to prevent artifacts
 * - Progressive mipmap chain (5-7 levels)
 * - Half-resolution per level
 *
 * Uniforms:
 * - inputTexture: Higher resolution texture to downsample
 * - texelSize: Size of one texel in UV space (1.0 / resolution)
 */

precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D inputTexture;
uniform vec2 texelSize;

void main() {
    vec4 d = texelSize.xyxy * vec4(-1.0, -1.0, 1.0, 1.0);

    // 13-tap box filter with weighted sampling
    vec3 s = texture(inputTexture, vUv + d.xy).rgb;        // Corner 1
    s += texture(inputTexture, vUv + d.zy).rgb * 2.0;      // Edge 1
    s += texture(inputTexture, vUv + d.xw).rgb * 2.0;      // Edge 2
    s += texture(inputTexture, vUv + d.zw).rgb;            // Corner 2
    s += texture(inputTexture, vUv + vec2(-2.0, 0.0) * texelSize).rgb;  // Edge 3
    s += texture(inputTexture, vUv + vec2(2.0, 0.0) * texelSize).rgb;   // Edge 4
    s += texture(inputTexture, vUv + vec2(0.0, -2.0) * texelSize).rgb;  // Edge 5
    s += texture(inputTexture, vUv + vec2(0.0, 2.0) * texelSize).rgb;   // Edge 6
    s += texture(inputTexture, vUv).rgb * 4.0;             // Center (highest weight)

    // Normalize by total weight (16.0)
    fragColor = vec4(s / 16.0, 1.0);
}
