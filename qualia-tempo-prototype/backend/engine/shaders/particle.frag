#version 330 core

// QUALIA.CODE v1.3 - Enhanced Particle Fragment Shader
// Advanced particle rendering with HDR bloom, chromatic aberration, and atmospheric effects

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
uniform vec3 camera_position;
uniform float camera_near;
uniform float camera_far;
uniform vec3 fog_color;
uniform float fog_density;
uniform float chromatic_aberration_strength;
uniform vec3 color_temperature;
uniform float saturation_boost;
uniform float contrast_enhance;

// Enhanced noise functions for procedural effects
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

// Fractal noise for more complex patterns
float fractalNoise(vec2 p, int octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;

    for(int i = 0; i < octaves; i++) {
        value += noise(p * frequency) * amplitude;
        amplitude *= 0.5;
        frequency *= 2.0;
    }
    return value;
}

// Color temperature adjustment
vec3 adjustColorTemperature(vec3 color, vec3 temperature) {
    // Temperature-based color correction matrix
    mat3 temperatureMatrix = mat3(
        1.0, 0.0, 0.0,
        0.0, 1.0, 0.0,
        0.0, 0.0, 1.0
    );

    // Cool to warm temperature shift
    if(temperature.r > 0.5) {
        temperatureMatrix = mat3(
            1.2, -0.1, 0.0,
            -0.1, 1.1, 0.0,
            0.0, -0.1, 1.2
        );
    } else {
        temperatureMatrix = mat3(
            1.1, 0.1, 0.0,
            0.1, 1.2, 0.0,
            0.0, 0.1, 1.1
        );
    }

    return color * temperatureMatrix;
}

// Enhanced color grading function
vec3 applyColorGrading(vec3 color) {
    // Contrast enhancement
    color = (color - 0.5) * (1.0 + contrast_enhance * 0.5) + 0.5;

    // Saturation boost
    float luminance = dot(color, vec3(0.299, 0.587, 0.114));
    color = mix(vec3(luminance), color, 1.0 + saturation_boost * 0.5);

    // Color temperature adjustment
    color = adjustColorTemperature(color, color_temperature);

    return color;
}

// Depth-based fog calculation
float calculateFogFactor(float depth) {
    float fog_start = camera_near;
    float fog_end = camera_far;
    return clamp((depth - fog_start) / (fog_end - fog_start), 0.0, 1.0);
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

    // Enhanced procedural noise patterns
    vec2 noise_coord = coord * 12.0 + particleVelocity * 2.0 + time * 3.0;
    float energy_noise = fractalNoise(noise_coord, 4) * 0.4;

    // Multiple noise layers for complex patterns
    vec2 turbulence_coord = coord * 8.0 + time * 1.5;
    float turbulence = fractalNoise(turbulence_coord, 3) * 0.3;

    // Pulsing effect based on particle lifetime with multiple harmonics
    float pulse = 0.7 + 0.3 * sin(time * 4.0 + particleLife * 8.0);
    pulse += 0.2 * sin(time * 8.0 + particleLife * 16.0);
    pulse += 0.1 * sin(time * 12.0 + particleLife * 24.0);

    // Calculate final intensity with multiple contribution layers
    float base_intensity = core_falloff + outer_glow * 0.6;
    float enhanced_intensity = base_intensity * pulse * (1.0 + energy_noise + turbulence);

    // Apply velocity-based stretching effect
    float velocity_magnitude = length(particleVelocity);
    float stretch_factor = 1.0 + velocity_magnitude * 0.8;
    enhanced_intensity *= stretch_factor;

    // Enhanced HDR color calculation with bloom contribution
    vec3 base_color = particleColor.rgb * enhanced_intensity;

    // Apply color grading
    base_color = applyColorGrading(base_color);

    // Enhance bright particles for bloom effect
    float luminance = dot(base_color, vec3(0.299, 0.587, 0.114));
    if (luminance > bloom_threshold) {
        base_color *= (1.0 + particle_glow_intensity * (luminance - bloom_threshold));
    }

    // Calculate depth for fog effects
    float depth = gl_FragCoord.z / gl_FragCoord.w;
    float fog_factor = calculateFogFactor(depth);

    // Apply depth-based fog
    if(fog_density > 0.0) {
        base_color = mix(base_color, fog_color, fog_factor * fog_density);
    }

    // Final alpha calculation with edge smoothing
    float final_alpha = particleColor.a * enhanced_intensity;
    final_alpha *= 1.0 - smoothstep(0.4, 0.5, dist); // Smooth edges

    // Output HDR color for post-processing pipeline
    fragColor = vec4(base_color, final_alpha);

    // Ensure minimum brightness for bloom particles
    if (particleLife > 0.8) {
        fragColor.rgb = max(fragColor.rgb, vec3(0.15)); // Keep some glow for dying particles
    }

    // Add atmospheric glow effect
    if (fog_factor > 0.5) {
        fragColor.rgb += fog_color * 0.1 * (fog_factor - 0.5) / 0.5;
    }
}