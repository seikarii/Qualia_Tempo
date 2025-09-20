#version 330 core

// QUALIA.CODE v1.2 - Enhanced Particle Vertex Shader
// Advanced particle rendering with HDR support and dynamic scaling

// INPUT: Attributes from particle compute buffer
layout(location = 0) in vec3 position;
layout(location = 1) in vec3 velocity;
layout(location = 2) in vec4 color;
layout(location = 3) in float lifetime;
layout(location = 4) in float size;

// OUTPUT: Enhanced data for fragment shader
out vec4 particleColor;
out vec2 particleVelocity;
out float particleLife;
out float particleSize;

// UNIFORMS: Enhanced transformation and rendering parameters
uniform mat4 mvp_matrix;
uniform float time;
uniform float intensity_multiplier;
uniform vec2 screen_resolution;
uniform float global_particle_scale;

void main() {
    // Enhanced position with slight velocity-based offset for motion blur effect
    vec3 enhanced_position = position + velocity * 0.016; // 60fps motion prediction
    
    // Project particle position to screen space
    gl_Position = mvp_matrix * vec4(enhanced_position, 1.0);
    
    // Dynamic size calculation based on lifetime and intensity
    float life_factor = clamp(lifetime, 0.1, 1.0);
    float velocity_magnitude = length(velocity);
    float dynamic_size = size * global_particle_scale * life_factor;
    
    // Size scaling based on velocity for dynamic effects
    dynamic_size *= (1.0 + velocity_magnitude * 0.5);
    
    // Perspective-aware point size with distance falloff
    float distance_factor = max(0.5, 2.0 / (gl_Position.w + 1.0));
    gl_PointSize = dynamic_size * distance_factor * 20.0;
    
    // Enhanced color with HDR intensity and lifetime modulation
    vec3 enhanced_color = color.rgb * intensity_multiplier;
    float alpha_fade = color.a * life_factor;
    
    // Pass enhanced attributes to fragment shader
    particleColor = vec4(enhanced_color, alpha_fade);
    particleVelocity = velocity.xy * 0.1; // Normalized for fragment effects
    particleLife = lifetime;
    particleSize = dynamic_size;
}