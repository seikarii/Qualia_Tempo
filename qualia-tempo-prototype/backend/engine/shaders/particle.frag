#version 330 core

// QUALIA.CODE v1.2 - Enhanced Particle Fragment Shader
// Advanced particle rendering with HDR bloom contribution and procedural effects

// INPUT: Enhanced data from vertex shader
in vec4 particleColor;
in vec2 particleVelocity;
in float particleLife;
in float particleSize;

// OUTPUT: HDR color with bloom contribution
out vec4 fragColor;

// UNIFORMS: Advanced rendering parameters
uniform float time;
uniform float bloom_threshold;
uniform float particle_glow_intensity;

// Enhanced noise function for procedural effects
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void main() {
    // Calculate distance from center for circular particle shape
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    
    // Discard fragments outside the circle
    if (dist > 0.5) {
        discard;
    }
    
    // Enhanced circular falloff with multiple layers
    float core_falloff = 1.0 - smoothstep(0.0, 0.25, dist);
    float outer_glow = 1.0 - smoothstep(0.25, 0.5, dist);
    
    // Procedural energy effect based on velocity and time
    vec2 noise_coord = coord * 8.0 + particleVelocity + time * 2.0;
    float energy_noise = noise(noise_coord) * 0.3;
    
    // Pulsing effect based on particle lifetime
    float pulse = 0.8 + 0.2 * sin(time * 6.0 + particleLife * 12.0);
    
    // Calculate final intensity with multiple contribution layers
    float base_intensity = core_falloff + outer_glow * 0.5;
    float enhanced_intensity = base_intensity * pulse * (1.0 + energy_noise);
    
    // Apply velocity-based stretching effect
    float velocity_magnitude = length(particleVelocity);
    float stretch_factor = 1.0 + velocity_magnitude * 0.5;
    enhanced_intensity *= stretch_factor;
    
    // HDR color calculation with bloom contribution
    vec3 base_color = particleColor.rgb * enhanced_intensity;
    
    // Enhance bright particles for bloom effect
    float luminance = dot(base_color, vec3(0.299, 0.587, 0.114));
    if (luminance > bloom_threshold) {
        base_color *= (1.0 + particle_glow_intensity * (luminance - bloom_threshold));
    }
    
    // Final alpha calculation with edge smoothing
    float final_alpha = particleColor.a * enhanced_intensity;
    final_alpha *= 1.0 - smoothstep(0.4, 0.5, dist); // Smooth edges
    
    // Output HDR color for post-processing pipeline
    fragColor = vec4(base_color, final_alpha);
    
    // Ensure minimum brightness for bloom particles
    if (particleLife > 0.8) {
        fragColor.rgb = max(fragColor.rgb, vec3(0.1)); // Keep some glow for dying particles
    }
}