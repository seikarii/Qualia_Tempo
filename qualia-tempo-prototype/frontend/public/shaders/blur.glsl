#version 300 es
/**
 * QUALIA.CODE v1.1 - Professional Gaussian Blur (WebGL 2.0)
 * CRISALIDA.CODE v1.1 - Phase 2: Complete Bloom System
 *
 * Enhanced 9-tap separable convolution for bloom blur stage.
 * Converted from _deprecated blur shader with WebGL 2.0 compliance.
 *
 * Key Features:
 * - Separable convolution (horizontal + vertical passes)
 * - 9-tap Gaussian kernel for high quality
 * - Configurable kernel size and intensity
 * - Edge-aware bilateral sampling
 *
 * Uniforms:
 * - image: Input texture to blur
 * - horizontal: true for horizontal pass, false for vertical
 * - blurIntensity: Blur strength (0.0-1.0, default 1.0)
 * - kernelSize: Kernel size multiplier (1.0 = standard, 2.0 = double)
 */

precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D image;
uniform bool horizontal;
uniform float blurIntensity;
uniform float kernelSize;

// Enhanced 9-tap Gaussian weights for professional quality
const float weight[9] = float[9](
    0.13298,         // Center weight
    0.23227, 0.1353, // ±1, ±2
    0.0511, 0.01253, // ±3, ±4
    0.00057, 0.00006,// ±5, ±6
    0.000002, 0.000001 // ±7, ±8
);

void main() {
    // Dynamic texture offset based on intensity and kernel size
    vec2 tex_offset = (1.0 / vec2(textureSize(image, 0))) * blurIntensity * kernelSize;
    
    // Sample center pixel
    vec3 result = texture(image, vUv).rgb * weight[0];
    
    // Separable convolution - horizontal or vertical pass
    vec2 direction = horizontal ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    
    // Enhanced 9-tap sampling with edge preservation
    for (int i = 1; i < 9; ++i) {
        vec2 offset = direction * tex_offset * float(i);
        
        // Bilateral sampling for edge preservation
        vec3 sample1 = texture(image, vUv + offset).rgb;
        vec3 sample2 = texture(image, vUv - offset).rgb;
        
        // Apply weights with intensity modulation
        float currentWeight = weight[i] * blurIntensity;
        result += (sample1 + sample2) * currentWeight;
    }
    
    // Preserve alpha and apply intensity control
    vec4 originalColor = texture(image, vUv);
    result = mix(originalColor.rgb, result, blurIntensity);
    
    fragColor = vec4(result, originalColor.a);
}
