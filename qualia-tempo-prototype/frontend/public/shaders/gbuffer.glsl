#pragma VERTEX
varying vec3 vNormal;
varying vec2 vUv;
varying vec3 vViewPosition;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;

  gl_Position = projectionMatrix * mvPosition;
}

#pragma FRAGMENT
#extension GL_EXT_draw_buffers : require

uniform sampler2D tDiffuse;
uniform sampler2D tNormal;
uniform sampler2D tDepth;

varying vec3 vNormal;
varying vec2 vUv;
varying vec3 vViewPosition;

void main() {
  // Output 0: Diffuse color
  vec4 diffuseColor = texture2D(tDiffuse, vUv);
  gl_FragData[0] = diffuseColor;

  // Output 1: Normal in view space (normalized to 0-1 range)
  vec3 normal = normalize(vNormal) * 0.5 + 0.5;
  gl_FragData[1] = vec4(normal, 1.0);

  // Output 2: Linear depth
  float depth = length(vViewPosition) / 1000.0; // Normalize depth
  gl_FragData[2] = vec4(vec3(depth), 1.0);

  // Output 3: Material properties (placeholder)
  gl_FragData[3] = vec4(0.5, 0.5, 0.5, 1.0);
}