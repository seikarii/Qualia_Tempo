#version 300 es
/**
 * QUALIA.CODE v1.1 - Depth of Field Shader (WebGL 2.0)
 * Purpose: Golden Angle spiral sampling with bokeh effect
 * Features: Depth-based CoC, configurable focus, natural bokeh shape
 * Performance: ~2-3ms (expensive but high quality)
 */

precision highp float;
precision highp sampler2D;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D sceneTexture;
uniform sampler2D depthTexture;
uniform float focusDistance;    // Focus plane distance (meters)
uniform float focusRange;        // Range of sharp focus (meters)
uniform float bokehRadius;       // Maximum blur radius (pixels)
uniform vec2 resolution;         // Screen resolution
uniform int bokehSamples;        // Number of samples (16-64)

const float GOLDEN_ANGLE = 2.39996323;
const float DEPTH_SCALE = 100.0; // Convert depth [0,1] to world units

/**
 * Calculate Circle of Confusion (CoC) radius based on depth
 * CoC = (|depth - focusDistance| / focusRange) * bokehRadius
 */
float getCircleOfConfusion(float depth) {
    float distance = depth * DEPTH_SCALE;
    float coc = abs(distance - focusDistance) / focusRange;
    return clamp(coc * bokehRadius, 0.0, bokehRadius);
}

void main() {
    float centerDepth = texture(depthTexture, vUv).r;
    float radius = getCircleOfConfusion(centerDepth);

    // Early exit: pixel is in focus, no blur needed
    if (radius < 0.5) {
        fragColor = texture(sceneTexture, vUv);
        return;
    }

    vec3 color = vec3(0.0);
    float totalWeight = 0.0;

    // Golden Angle spiral sampling for natural bokeh shape
    for (int i = 0; i < bokehSamples; i++) {
        if (i >= bokehSamples) break; // Dynamic loop constraint
        
        float angle = float(i) * GOLDEN_ANGLE;
        float dist = sqrt(float(i) / float(bokehSamples));
        vec2 offset = vec2(cos(angle), sin(angle)) * dist * radius / resolution;
        
        vec2 sampleUV = vUv + offset;
        
        // Clamp UVs to prevent sampling outside texture bounds
        sampleUV = clamp(sampleUV, vec2(0.0), vec2(1.0));
        
        vec3 sampleColor = texture(sceneTexture, sampleUV).rgb;
        float sampleDepth = texture(depthTexture, sampleUV).r;
        float sampleCoC = getCircleOfConfusion(sampleDepth);
        
        // Weight by CoC - blurry background pixels contribute more to foreground blur
        float weight = smoothstep(0.0, radius, sampleCoC);
        weight = max(weight, 0.1); // Minimum weight to avoid division by zero
        
        color += sampleColor * weight;
        totalWeight += weight;
    }

    fragColor = vec4(color / totalWeight, 1.0);
}
