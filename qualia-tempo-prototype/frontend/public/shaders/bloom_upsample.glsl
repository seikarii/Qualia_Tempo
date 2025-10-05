#version 300 es
/**
 * QUALIA.CODE v1.1 - Bloom Upsample (WebGL 2.0)
 * CRISALIDA.CODE v1.1 - Phase 2: Complete Bloom System
 *
 * Professional tent filter upsampling with blending.
 * Converted from _deprecated shader with WebGL 2.0 compliance.
 *
 * Key Features:
 * - 4-tap tent filter (3x3 weighted average)
 * - Blends with higher resolution texture
 * - Progressive upsampling matches downsample chain
 * - Smooth bloom diffusion
 *
 * Uniforms:
 * - lowResTexture: Lower resolution texture to upsample
 * - highResTexture: Higher resolution texture to blend with
 * - texelSize: Size of one texel in UV space (1.0 / resolution)
 * - intensity: Bloom blend intensity (0.1-0.5 typical)
 */

precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D lowResTexture;
uniform sampler2D highResTexture;
uniform vec2 texelSize;
uniform float intensity;

void main() {
    // 4-tap tent filter sampling offsets
    vec4 d = texelSize.xyxy * vec4(-1.0, -1.0, 1.0, 1.0) * 0.5;

    // Sample low-res texture with tent filter
    vec3 bloom = texture(lowResTexture, vUv + d.xy).rgb;
    bloom += texture(lowResTexture, vUv + d.zy).rgb;
    bloom += texture(lowResTexture, vUv + d.xw).rgb;
    bloom += texture(lowResTexture, vUv + d.zw).rgb;
    bloom *= 0.25;  // Average of 4 samples

    // Sample high-res texture at center
    vec3 highRes = texture(highResTexture, vUv).rgb;

    // Blend upsampled bloom with high-res texture
    fragColor = vec4(highRes + bloom * intensity, 1.0);
}
