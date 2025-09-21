#version 330 core

// QUALIA.CODE v1.3 - Enhanced Particle Vertex Shader
// Advanced particle rendering with animation curves, billboard rotation, and motion blur

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
uniform mat4 view_matrix;
uniform mat4 model_matrix;
uniform float time;
uniform float intensity_multiplier;
uniform vec2 screen_resolution;
uniform float global_particle_scale;
uniform float animation_speed;
uniform float billboard_rotation_speed;
uniform float size_pulse_frequency;
uniform float motion_blur_strength;

// Enhanced animation curve functions
float easeInOutCubic(float t) {
    return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
}

float easeOutElastic(float t) {
    const float c4 = (2.0 * 3.14159) / 3.0;
    return t == 0.0 ? 0.0 : t == 1.0 ? 1.0 : pow(2.0, -10.0 * t) * sin((t * 10.0 - 0.75) * c4) + 1.0;
}

float easeInOutBounce(float t) {
    const float n1 = 7.5625;
    const float d1 = 2.75;

    if (t < 1.0 / d1) {
        return n1 * t * t;
    } else if (t < 2.0 / d1) {
        return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
        return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
        return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
}

// Billboard matrix calculation for camera-facing particles
mat4 calculateBillboardMatrix(vec3 particlePos, vec3 cameraPos) {
    vec3 forward = normalize(cameraPos - particlePos);
    vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), forward));
    vec3 up = normalize(cross(forward, right));

    return mat4(
        vec4(right, 0.0),
        vec4(up, 0.0),
        vec4(forward, 0.0),
        vec4(particlePos, 1.0)
    );
}

// Enhanced motion blur calculation
vec3 calculateMotionBlurOffset(vec3 pos, vec3 vel, float strength) {
    // Calculate motion vector based on velocity and time
    vec3 motionVector = vel * strength * 0.016; // 60fps motion prediction

    // Apply easing curve to motion blur for more natural effect
    float motionLength = length(motionVector);
    if (motionLength > 0.0) {
        float normalizedMotion = min(motionLength / 2.0, 1.0);
        float easedMotion = easeOutElastic(normalizedMotion);
        motionVector = normalize(motionVector) * motionLength * easedMotion;
    }

    return motionVector;
}

void main() {
    // Enhanced position with advanced motion blur
    vec3 motionOffset = calculateMotionBlurOffset(position, velocity, motion_blur_strength);
    vec3 enhanced_position = position + motionOffset;

    // Apply billboard rotation for camera-facing particles
    mat4 billboardMatrix = calculateBillboardMatrix(enhanced_position, vec3(0.0)); // Camera at origin for simplicity

    // Add rotational animation based on time and position
    float rotationAngle = time * billboard_rotation_speed + position.x * 0.1 + position.y * 0.15;
    mat4 rotationMatrix = mat4(
        cos(rotationAngle), 0.0, sin(rotationAngle), 0.0,
        0.0, 1.0, 0.0, 0.0,
        -sin(rotationAngle), 0.0, cos(rotationAngle), 0.0,
        0.0, 0.0, 0.0, 1.0
    );

    // Combine billboard and rotation matrices
    mat4 finalTransform = billboardMatrix * rotationMatrix;

    // Project particle position to screen space with enhanced transformation
    gl_Position = mvp_matrix * finalTransform * vec4(enhanced_position, 1.0);

    // Advanced size calculation with multiple animation curves
    float life_factor = clamp(lifetime, 0.0, 1.0);
    float velocity_magnitude = length(velocity);

    // Apply different easing curves based on particle state
    float size_curve = 1.0;
    if (lifetime > 0.7) {
        // Elastic easing for dying particles
        size_curve = easeOutElastic(life_factor);
    } else if (lifetime < 0.3) {
        // Cubic easing for spawning particles
        size_curve = easeInOutCubic(life_factor);
    } else {
        // Bounce easing for middle lifetime
        size_curve = easeInOutBounce(life_factor);
    }

    // Size pulsing effect with multiple frequencies
    float pulse1 = 0.8 + 0.2 * sin(time * size_pulse_frequency + position.x * 0.1);
    float pulse2 = 0.9 + 0.1 * sin(time * size_pulse_frequency * 2.3 + position.y * 0.15);
    float pulse3 = 0.95 + 0.05 * sin(time * size_pulse_frequency * 4.7 + position.z * 0.08);

    float dynamic_size = size * global_particle_scale * size_curve * pulse1 * pulse2 * pulse3;

    // Enhanced velocity-based scaling with smooth transitions
    float velocity_scale = 1.0 + smoothstep(0.0, 5.0, velocity_magnitude) * 0.8;
    dynamic_size *= velocity_scale;

    // Perspective-aware point size with enhanced distance falloff
    float distance_factor = max(0.3, 3.0 / (gl_Position.w + 1.5));
    gl_PointSize = dynamic_size * distance_factor * 25.0;

    // Enhanced color with HDR intensity and advanced lifetime modulation
    vec3 enhanced_color = color.rgb * intensity_multiplier;

    // Apply color animation based on particle state
    float color_animation = sin(time * animation_speed + lifetime * 6.28) * 0.5 + 0.5;
    enhanced_color *= (0.8 + 0.4 * color_animation);

    // Advanced alpha calculation with smooth transitions
    float alpha_fade = color.a * life_factor;
    alpha_fade *= smoothstep(0.0, 0.2, lifetime) * (1.0 - smoothstep(0.8, 1.0, lifetime));

    // Pass enhanced attributes to fragment shader
    particleColor = vec4(enhanced_color, alpha_fade);
    particleVelocity = velocity.xy * 0.15; // Enhanced for fragment effects
    particleLife = lifetime;
    particleSize = dynamic_size;
}