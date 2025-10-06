#pragma VERTEX
#version 300 es

in vec3 position;
in vec3 normal;
in vec2 uv;

out vec3 vNormal;
out vec2 vUv;
out vec3 vViewPosition;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;

  gl_Position = projectionMatrix * mvPosition;
}

#pragma FRAGMENT
#version 300 es
precision highp float;

in vec3 vNormal;
in vec2 vUv;
in vec3 vViewPosition;

uniform sampler2D tDiffuse;
uniform sampler2D tNormal;
uniform sampler2D tDepth;

layout(location = 0) out vec4 fragData0;
layout(location = 1) out vec4 fragData1;
layout(location = 2) out vec4 fragData2;
layout(location = 3) out vec4 fragData3;

void main() {
  // Output 0: Diffuse color
  vec4 diffuseColor = texture(tDiffuse, vUv);
  fragData0 = diffuseColor;

  // Output 1: Normal in view space (normalized to 0-1 range)
  vec3 normal = normalize(vNormal) * 0.5 + 0.5;
  fragData1 = vec4(normal, 1.0);

  // Output 2: Linear depth
  float depth = length(vViewPosition) / 1000.0; // Normalize depth
  fragData2 = vec4(vec3(depth), 1.0);

  // Output 3: Material properties (placeholder)
  fragData3 = vec4(0.5, 0.5, 0.5, 1.0);
}