#version 300 es
/**
 * VISUALS.GOLD.CODE v1.0 - God Rays (Volumetric Lighting) Shader
 * Phase 1: Atmospheric Effects
 * 
 * TECHNIQUE: Occlusion-based raymarching from light source
 * REFERENCE: GPU Gems 3 - Volumetric Light Scattering as a Post-Process
 * 
 * QualiaState Mappings:
 * - precision → ray sharpness (0.3 blur to 1.0 sharp)
 * - aggression → color tint (cool blue to warm red/orange)
 */

precision highp float;

// Inputs from vertex shader
in vec2 vUv;

// Uniforms - Scene Data
uniform sampler2D tScene;           // Original scene color
uniform sampler2D tDepth;           // Depth buffer for occlusion
uniform vec2 uResolution;           // Screen resolution
uniform vec3 uLightPosition;        // Light source position in screen space (0-1)

// Uniforms - QualiaState Driven (VISUALS.GOLD.CODE)
uniform float uPrecision;           // 0-1: Controls ray sharpness
uniform float uAggression;          // 0-1: Controls color tint temperature
uniform float uTranscendence;       // 0-1: Ultimate mode enhancement

// Uniforms - Effect Parameters
uniform float uDecay;               // Ray decay factor (default: 0.95)
uniform float uWeight;              // Ray weight (default: 0.5)
uniform float uDensity;             // Ray density (default: 0.8)
uniform float uExposure;            // Exposure multiplier (default: 0.6)
uniform int uSamples;               // Number of raymarching samples (default: 100)

// Output
out vec4 fragColor;

/**
 * Calculate color tint based on aggression level
 * Low aggression: Cool blue (calm)
 * High aggression: Warm red/orange (intense)
 */
vec3 getAggressionTint(float aggression) {
    // Cool blue tint for low aggression
    vec3 coolColor = vec3(0.6, 0.8, 1.0); // Soft blue
    
    // Warm red/orange tint for high aggression
    vec3 warmColor = vec3(1.0, 0.7, 0.4); // Warm orange
    
    // Smooth interpolation
    return mix(coolColor, warmColor, aggression);
}

/**
 * Main God Rays calculation
 * Uses raymarching from pixel to light source
 */
void main() {
    vec4 sceneColor = texture(tScene, vUv);
    
    // Calculate ray direction from pixel to light source
    vec2 deltaTextCoord = vUv - uLightPosition.xy;
    
    // Apply sharpness based on precision
    // Higher precision = sharper rays (less spread)
    float sharpness = mix(0.3, 1.0, uPrecision);
    deltaTextCoord *= sharpness;
    
    // Calculate step size for raymarching
    deltaTextCoord *= (1.0 / float(uSamples)) * uDensity;
    
    // Initial sample position
    vec2 textCoo = vUv;
    
    // Illumination decay
    float illuminationDecay = 1.0;
    
    // Accumulate light samples
    vec3 godRayColor = vec3(0.0);
    
    // Raymarch towards light source
    for(int i = 0; i < 100; i++) {
        if(i >= uSamples) break;
        
        textCoo -= deltaTextCoord;
        
        // Sample scene at this point
        vec3 sample = texture(tScene, textCoo).rgb;
        
        // Apply decay
        sample *= illuminationDecay * uWeight;
        
        // Accumulate
        godRayColor += sample;
        
        // Update decay
        illuminationDecay *= uDecay;
    }
    
    // Apply exposure
    godRayColor *= uExposure;
    
    // Apply aggression-based color tint
    vec3 tintColor = getAggressionTint(uAggression);
    godRayColor *= tintColor;
    
    // Ultimate mode enhancement (transcendence > 0.9)
    if(uTranscendence > 0.9) {
        // Golden divine glow
        vec3 goldenTint = vec3(1.0, 0.9, 0.5);
        float ultimateStrength = (uTranscendence - 0.9) * 10.0; // 0-1 range
        godRayColor = mix(godRayColor, godRayColor * goldenTint, ultimateStrength * 0.5);
        
        // Increase intensity
        godRayColor *= (1.0 + ultimateStrength);
    }
    
    // Blend with scene
    vec3 finalColor = sceneColor.rgb + godRayColor;
    
    fragColor = vec4(finalColor, sceneColor.a);
}
