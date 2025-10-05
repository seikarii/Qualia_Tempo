/**
 * QUALIA.CODE v1.1 - Motion Blur Shader
 * CRISALIDA.CODE v1.1 - Phase 4: Temporal Effects
 * 
 * Velocity-based motion blur using G-Buffer velocity texture.
 * Samples along motion vectors for realistic per-pixel blur.
 * 
 * Features:
 * - Configurable sample count (4-16)
 * - Strength multiplier for artistic control
 * - Early exit for static pixels (optimization)
 * - Symmetric sampling along velocity vector
 * 
 * Performance: ~1-2ms (depends on sample count)
 */

#pragma VERTEX
#version 300 es

in vec3 position;
in vec2 uv;

out vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}

#pragma FRAGMENT
#version 300 es
precision highp float;

in vec2 vUv;

uniform sampler2D sceneTexture;
uniform sampler2D velocityTexture;
uniform int samples;        // 4-16 typical
uniform float strength;     // 0.5-1.0 typical
uniform float threshold;    // Minimum velocity to apply blur (0.001 default)

out vec4 fragColor;

/**
 * Sample scene texture along velocity vector
 * Uses symmetric sampling for balanced blur
 */
vec3 sampleAlongVelocity(vec2 uv, vec2 velocity, int sampleCount) {
  vec3 color = vec3(0.0);
  
  // Center sample (current pixel)
  color += texture(sceneTexture, uv).rgb;
  
  // Sample along velocity vector symmetrically
  for (int i = 1; i < sampleCount; i++) {
    float t = float(i) / float(sampleCount - 1);
    
    // Offset from [-0.5, 0.5] for symmetric blur
    float offset = (t - 0.5);
    vec2 sampleUV = uv + velocity * offset;
    
    // Clamp to valid texture coordinates
    sampleUV = clamp(sampleUV, vec2(0.0), vec2(1.0));
    
    color += texture(sceneTexture, sampleUV).rgb;
  }
  
  // Average all samples
  return color / float(sampleCount);
}

void main() {
  // Read velocity from G-Buffer (RG channels, NDC space)
  vec2 velocity = texture(velocityTexture, vUv).rg * strength;
  
  // Early exit for static pixels (optimization)
  if (length(velocity) < threshold) {
    fragColor = texture(sceneTexture, vUv);
    return;
  }
  
  // Apply motion blur along velocity vector
  vec3 blurredColor = sampleAlongVelocity(vUv, velocity, samples);
  
  fragColor = vec4(blurredColor, 1.0);
}
