/**
 * QUALIA.CODE v1.1 - Reaction-Diffusion Compute Shader
 * VISUALS.GOLD.CODE Phase 3: El Mundo Viviente (The Living World)
 * 
 * PURPOSE: Generate Turing patterns on the combat arena floor
 * ALGORITHM: Gray-Scott Reaction-Diffusion model
 * 
 * REFERENCE: "Complex Patterns in a Simple System" - John E. Pearson (1993)
 * MAPPINGS: 
 *   - chaos → diffusion rate (frantic patterns)
 *   - flow → wind direction (flowing patterns)
 *   - recovery → kill rate (pattern stabilization)
 */

#version 300 es
precision highp float;

// Input/Output textures
uniform sampler2D u_state_texture; // Current state (chemical concentrations)
uniform vec2 u_resolution; // Texture resolution
uniform float u_delta_time; // Time step for simulation

// QualiaState-driven parameters (VISUALS.GOLD.CODE mappings)
uniform float u_chaos; // 0-1: QualiaState.chaos → diffusion rate
uniform vec2 u_flow_direction; // QualiaState.flow → wind vector
uniform float u_recovery; // 0-1: QualiaState.recovery → kill rate

// Gray-Scott model parameters
uniform float u_feed_rate; // Feed rate (F)
uniform float u_diffusion_a; // Diffusion rate for chemical A (Da)
uniform float u_diffusion_b; // Diffusion rate for chemical B (Db)

// Output
out vec4 fragColor;

// Laplacian kernel (for diffusion calculation)
// Uses 9-point stencil for better accuracy
vec2 laplacian(sampler2D tex, vec2 uv, vec2 texelSize) {
    vec2 sum = vec2(0.0);
    
    // Center weight: -1
    sum += texture(tex, uv).xy * -1.0;
    
    // Orthogonal neighbors: 0.2
    sum += texture(tex, uv + vec2(-texelSize.x, 0.0)).xy * 0.2;
    sum += texture(tex, uv + vec2(texelSize.x, 0.0)).xy * 0.2;
    sum += texture(tex, uv + vec2(0.0, -texelSize.y)).xy * 0.2;
    sum += texture(tex, uv + vec2(0.0, texelSize.y)).xy * 0.2;
    
    // Diagonal neighbors: 0.05
    sum += texture(tex, uv + vec2(-texelSize.x, -texelSize.y)).xy * 0.05;
    sum += texture(tex, uv + vec2(texelSize.x, -texelSize.y)).xy * 0.05;
    sum += texture(tex, uv + vec2(-texelSize.x, texelSize.y)).xy * 0.05;
    sum += texture(tex, uv + vec2(texelSize.x, texelSize.y)).xy * 0.05;
    
    return sum;
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    vec2 texelSize = 1.0 / u_resolution;
    
    // Sample current state
    // R channel = chemical A (substrate)
    // G channel = chemical B (catalyst)
    vec2 state = texture(u_state_texture, uv).xy;
    float a = state.x;
    float b = state.y;
    
    // Calculate Laplacian (diffusion)
    vec2 lap = laplacian(u_state_texture, uv, texelSize);
    
    // Map QualiaState.chaos to diffusion rate modulation
    // High chaos = higher diffusion = more chaotic patterns
    float chaosModifier = mix(0.8, 1.2, u_chaos);
    float Da = u_diffusion_a * chaosModifier;
    float Db = u_diffusion_b * chaosModifier;
    
    // Map QualiaState.recovery to kill rate
    // High recovery = higher kill rate = patterns calm down
    float killRate = mix(0.055, 0.065, u_recovery);
    
    // Gray-Scott reaction-diffusion equations:
    // dA/dt = Da * ∇²A - AB² + F(1-A)
    // dB/dt = Db * ∇²B + AB² - (k+F)B
    
    float feedRate = u_feed_rate;
    float reaction = a * b * b;
    
    float dA = Da * lap.x - reaction + feedRate * (1.0 - a);
    float dB = Db * lap.y + reaction - (killRate + feedRate) * b;
    
    // Apply flow direction (QualiaState.flow)
    // Creates directional bias in the pattern propagation
    if (length(u_flow_direction) > 0.01) {
        vec2 flowUV = uv - u_flow_direction * texelSize * 0.5;
        vec2 flowedState = texture(u_state_texture, flowUV).xy;
        
        // Blend current state with flowed state
        float flowStrength = length(u_flow_direction) * 0.3;
        a = mix(a, flowedState.x, flowStrength);
        b = mix(b, flowedState.y, flowStrength);
    }
    
    // Update state with time step
    float newA = clamp(a + dA * u_delta_time, 0.0, 1.0);
    float newB = clamp(b + dB * u_delta_time, 0.0, 1.0);
    
    // Output: RG = chemical concentrations, BA = unused (for future use)
    fragColor = vec4(newA, newB, 0.0, 1.0);
}
