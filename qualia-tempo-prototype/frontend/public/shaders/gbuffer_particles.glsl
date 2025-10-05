/**
 * QUALIA.CODE v1.1 - G-Buffer Particles Shader
 * CRISALIDA.CODE v1.1 - Phase 2: G-Buffer Activation
 * 
 * Deferred rendering shader for particle system.
 * Writes particle properties to G-Buffer textures (Color, Normal, Depth, Material).
 * 
 * MRT Outputs:
 * - gl_FragData[0]: Color (RGB) + Alpha
 * - gl_FragData[1]: Normal (view space, encoded 0-1)
 * - gl_FragData[2]: Depth (linear, normalized)
 * - gl_FragData[3]: Material (metallic, roughness, ao, emission)
 */

#pragma VERTEX
#version 300 es

// Particle attributes
in vec3 position;
in vec3 color;
in float size;
in vec2 materialProps; // x: metallic, y: roughness

// Uniforms
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform float particleScale;

// Varyings
out vec3 vColor;
out vec3 vViewPosition;
out vec2 vMaterialProps;
out float vSize;

void main() {
  // Pass color to fragment shader
  vColor = color;
  
  // Pass material properties
  vMaterialProps = materialProps;
  
  // Calculate view space position
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = mvPosition.xyz;
  
  // Calculate point size with distance attenuation
  vSize = size;
  gl_PointSize = size * particleScale * (1000.0 / -mvPosition.z);
  
  // Output clip space position
  gl_Position = projectionMatrix * mvPosition;
}

#pragma FRAGMENT
#version 300 es
precision highp float;

// Extension for MRT (Multiple Render Targets)
#extension GL_EXT_draw_buffers : require

// Varyings from vertex shader
in vec3 vColor;
in vec3 vViewPosition;
in vec2 vMaterialProps;
in float vSize;

// Uniforms
uniform float cameraNear;
uniform float cameraFar;
uniform float time;

// G-Buffer outputs
layout(location = 0) out vec4 gColor;
layout(location = 1) out vec4 gNormal;
layout(location = 2) out vec4 gDepth;
layout(location = 3) out vec4 gMaterial;

/**
 * Generate spherical normal for point sprite
 * Creates illusion of 3D sphere from 2D point
 */
vec3 calculatePointSpriteNormal() {
  // Point coordinates in range [-1, 1]
  vec2 coord = gl_PointCoord * 2.0 - 1.0;
  
  // Calculate z coordinate for sphere
  float distSq = dot(coord, coord);
  
  // Discard fragments outside circle (creates round particles)
  if (distSq > 1.0) {
    discard;
  }
  
  // Calculate normal pointing outward from sphere surface
  float z = sqrt(1.0 - distSq);
  vec3 normal = normalize(vec3(coord, z));
  
  return normal;
}

/**
 * Calculate linear depth normalized to [0, 1] range
 */
float calculateLinearDepth(vec3 viewPosition) {
  float depth = -viewPosition.z;
  return (depth - cameraNear) / (cameraFar - cameraNear);
}

/**
 * Add subtle emission based on particle energy
 */
float calculateEmission() {
  // Particles glow more when they're brighter (energy-based emission)
  float luminance = dot(vColor, vec3(0.299, 0.587, 0.114));
  return luminance * 0.3; // Subtle emission
}

void main() {
  // Calculate spherical normal for point sprite
  vec3 normal = calculatePointSpriteNormal();
  
  // Output 0: Color with alpha based on distance from center
  vec2 coord = gl_PointCoord * 2.0 - 1.0;
  float distSq = dot(coord, coord);
  float alpha = 1.0 - smoothstep(0.7, 1.0, distSq);
  gColor = vec4(vColor, alpha);
  
  // Output 1: Normal in view space (encoded to 0-1 range for storage)
  vec3 viewSpaceNormal = normalize(normal);
  gNormal = vec4(viewSpaceNormal * 0.5 + 0.5, 1.0);
  
  // Output 2: Linear depth (normalized)
  float linearDepth = calculateLinearDepth(vViewPosition);
  gDepth = vec4(vec3(linearDepth), 1.0);
  
  // Output 3: Material properties
  // R: metallic, G: roughness, B: ambient occlusion, A: emission
  float metallic = vMaterialProps.x;
  float roughness = vMaterialProps.y;
  float ao = 1.0; // Full ambient occlusion (particles don't self-occlude)
  float emission = calculateEmission();
  gMaterial = vec4(metallic, roughness, ao, emission);
}
