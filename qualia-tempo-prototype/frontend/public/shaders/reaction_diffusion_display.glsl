/**
 * QUALIA.CODE v1.1 - Reaction-Diffusion Display Shader
 * VISUALS.GOLD.CODE Phase 3: El Mundo Viviente (The Living World)
 * 
 * PURPOSE: Visualize reaction-diffusion simulation on the ground plane
 * INPUT: Simulation texture from compute shader
 * OUTPUT: Beautiful, organic patterns with color mapping
 */

#version 300 es
precision highp float;

uniform sampler2D u_simulation_texture; // RD simulation state
uniform float u_time; // Animation time
uniform float u_intensity; // QualiaState.intensity (color saturation)
uniform float u_aggression; // QualiaState.aggression (color tint)
uniform float u_transcendence; // QualiaState.transcendence (golden glow)

in vec2 vUv;
out vec4 fragColor;

// Color palette for pattern visualization
vec3 getPatternColor(float concentration, float aggression, float intensity) {
    // Base colors: Cool (blue/cyan) for low aggression, Warm (red/orange) for high
    vec3 coolColor = vec3(0.1, 0.4, 0.8); // Deep blue
    vec3 warmColor = vec3(0.9, 0.3, 0.2); // Orange-red
    
    vec3 baseColor = mix(coolColor, warmColor, aggression);
    
    // Apply concentration (from chemical B)
    vec3 color = baseColor * concentration;
    
    // Modulate by intensity (higher intensity = more saturated)
    float saturation = mix(0.5, 1.5, intensity);
    color *= saturation;
    
    return color;
}

void main() {
    // Sample simulation state
    vec4 state = texture(u_simulation_texture, vUv);
    float chemicalA = state.x; // Substrate
    float chemicalB = state.y; // Catalyst (creates visible patterns)
    
    // Use chemical B for visualization (it creates the interesting patterns)
    float concentration = chemicalB;
    
    // Map concentration to color
    vec3 patternColor = getPatternColor(concentration, u_aggression, u_intensity);
    
    // Add subtle animation
    float pulse = sin(u_time * 2.0 + concentration * 10.0) * 0.1 + 0.9;
    patternColor *= pulse;
    
    // Transcendence effect: Golden glow overlay
    if (u_transcendence > 0.5) {
        vec3 goldenGlow = vec3(1.0, 0.9, 0.5);
        float glowStrength = (u_transcendence - 0.5) * 2.0;
        patternColor = mix(patternColor, patternColor * goldenGlow, glowStrength * 0.6);
    }
    
    // Add emissive quality
    float emissive = concentration * 0.5;
    patternColor += vec3(emissive);
    
    // Output with slight transparency for layering
    fragColor = vec4(patternColor, 0.9);
}
