#version 330 core

// QUALIA.CODE v1.2 - Professional Gaussian Blur Shader
// Enhanced 9-tap separable convolution with configurable intensity

out vec4 fragColor;
in vec2 uv;

uniform sampler2D image;
uniform bool horizontal;
uniform float blurIntensity; // 0.0 = no blur, 1.0 = full blur
uniform float kernelSize;    // Adjustable kernel size (1.0 = standard, 2.0 = double)

// Enhanced 9-tap Gaussian weights for professional quality
uniform float weight[9] = float[](
    0.13298,  // Center weight
    0.23227, 0.1353,   // ±1, ±2  
    0.0511, 0.01253,   // ±3, ±4
    0.00057, 0.00006,  // ±5, ±6
    0.000002, 0.000001 // ±7, ±8
);

void main() {
    // Dynamic texture offset based on intensity and kernel size
    vec2 tex_offset = (1.0 / textureSize(image, 0)) * blurIntensity * kernelSize;
    
    // Sample center pixel
    vec3 result = texture(image, uv).rgb * weight[0];
    
    // Separable convolution - horizontal or vertical pass
    vec2 direction = horizontal ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    
    // Enhanced 9-tap sampling with edge preservation
    for (int i = 1; i < 9; ++i) {
        vec2 offset = direction * tex_offset * float(i);
        
        // Bilateral sampling for edge preservation
        vec3 sample1 = texture(image, uv + offset).rgb;
        vec3 sample2 = texture(image, uv - offset).rgb;
        
        // Apply weights with intensity modulation
        float currentWeight = weight[i] * blurIntensity;
        result += (sample1 + sample2) * currentWeight;
    }
    
    // Preserve alpha and apply intensity control
    vec4 originalColor = texture(image, uv);
    result = mix(originalColor.rgb, result, blurIntensity);
    
    fragColor = vec4(result, originalColor.a);
}