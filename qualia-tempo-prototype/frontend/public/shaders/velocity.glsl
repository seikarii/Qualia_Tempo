#version 300 es
precision highp float;

// QUALIA.CODE v1.1 - Velocity Buffer Shader
// Purpose: Per-pixel motion vector calculation for temporal effects
// Dependencies: Current and previous frame MVP matrices
// Output: Screen-space velocity vectors (xy components)

// === VERTEX SHADER ===
#ifdef VERTEX_SHADER

in vec3 position;
in vec3 velocity;  // Particle velocity from vertex attributes

uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 prevViewMatrix;
uniform mat4 prevProjectionMatrix;

out vec2 vVelocity;
out vec3 vWorldPosition;

void main() {
    // Current frame position
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vec4 viewPosition = viewMatrix * worldPosition;
    vec4 clipPosition = projectionMatrix * viewPosition;
    
    // Previous frame position (using stored matrices)
    vec4 prevViewPosition = prevViewMatrix * worldPosition;
    vec4 prevClipPosition = prevProjectionMatrix * prevViewPosition;
    
    // Convert to NDC space
    vec2 currentNDC = clipPosition.xy / clipPosition.w;
    vec2 prevNDC = prevClipPosition.xy / prevClipPosition.w;
    
    // Calculate screen-space velocity (in NDC space, range [-1, 1])
    vVelocity = currentNDC - prevNDC;
    
    vWorldPosition = worldPosition.xyz;
    gl_Position = clipPosition;
}

#endif

// === FRAGMENT SHADER ===
#ifdef FRAGMENT_SHADER

in vec2 vVelocity;
in vec3 vWorldPosition;

out vec4 fragColor;

uniform float velocityScale;  // Amplification factor for visualization
uniform bool isDebugMode;

void main() {
    // Pack velocity into RG channels
    // Range: [-1, 1] in NDC space
    // For motion blur, we typically scale by deltaTime in the blur pass
    vec2 velocity = vVelocity;
    
    // Debug visualization mode (optional)
    if (isDebugMode) {
        // Map velocity to color for visualization
        // Red = horizontal motion, Green = vertical motion
        float speed = length(velocity);
        vec3 debugColor = vec3(
            abs(velocity.x),  // Horizontal motion in red
            abs(velocity.y),  // Vertical motion in green
            speed             // Total speed in blue
        );
        fragColor = vec4(debugColor * velocityScale, 1.0);
    } else {
        // Standard output: RG = velocity, B = speed, A = 1.0
        float speed = length(velocity);
        fragColor = vec4(velocity * velocityScale, speed, 1.0);
    }
}

#endif
