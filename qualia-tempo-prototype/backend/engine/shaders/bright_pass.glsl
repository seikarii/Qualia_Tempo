#version 330 core

// QUALIA.CODE v1.2 - Professional Bright Pass Extraction
// Soft threshold with color preservation and luminance analysis

out vec4 fragColor;
in vec2 uv;

uniform sampler2D sceneTexture;
uniform float threshold;      // Primary brightness threshold
uniform float softThreshold; // Soft threshold range (0.0 = hard, 1.0 = very soft)
uniform float intensity;     // Bloom intensity multiplier
uniform float colorPreservation; // Color saturation preservation (0.0-1.0)

// Professional luminance calculation (Rec. 709)
float getLuminance(vec3 color) {
    return dot(color, vec3(0.2126, 0.7152, 0.0722));
}

// Soft threshold function with smooth knee
float softThresholdCurve(float brightness, float thresh, float knee) {
    float halfKnee = knee * 0.5;
    
    if (brightness < thresh - halfKnee) {
        return 0.0;
    } else if (brightness < thresh + halfKnee) {
        // Smooth transition in knee region
        float t = (brightness - thresh + halfKnee) / knee;
        return smoothstep(0.0, 1.0, t);
    } else {
        return 1.0;
    }
}

// Color preservation for saturated highlights
vec3 preserveColor(vec3 color, float factor) {
    float lum = getLuminance(color);
    if (lum > 0.001) {
        vec3 chromaticity = color / lum;
        return mix(vec3(lum), color, factor);
    }
    return color;
}

void main() {
    vec3 color = texture(sceneTexture, uv).rgb;
    float brightness = getLuminance(color);
    
    // Calculate soft threshold factor
    float thresholdFactor = softThresholdCurve(brightness, threshold, softThreshold);
    
    if (thresholdFactor > 0.0) {
        // Preserve color information in bright areas
        vec3 preservedColor = preserveColor(color, colorPreservation);
        
        // Apply threshold with intensity control
        vec3 bloomColor = preservedColor * thresholdFactor * intensity;
        
        // Enhance saturation for bloom effect
        float enhancement = 1.0 + (thresholdFactor * 0.5);
        bloomColor = mix(vec3(brightness), bloomColor, enhancement);
        
        fragColor = vec4(bloomColor, 1.0);
    } else {
        fragColor = vec4(0.0, 0.0, 0.0, 1.0);
    }
}