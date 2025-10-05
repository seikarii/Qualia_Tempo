#version 300 es
/**
 * QUALIA.CODE v1.1 - Separable Gaussian Blur (WebGL 2.0)
 * Phase 2: Bloom System - 9-Tap Gaussian Kernel
 * Purpose: High-quality separable blur for bloom diffusion
 * Performance: ~0.5ms per pass (horizontal + vertical = 1ms total)
 */

precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D sourceTexture;
uniform vec2 direction;        // (1,0) for horizontal, (0,1) for vertical
uniform float kernelSize;      // Blur radius in pixels
uniform vec2 resolution;       // Texture resolution

// 9-tap Gaussian kernel weights (sigma = 2.0)
const float weights[5] = float[5](
  0.227027,  // Center
  0.1945946, // +/- 1
  0.1216216, // +/- 2
  0.054054,  // +/- 3
  0.016216   // +/- 4
);

void main() {
  vec2 texelSize = 1.0 / resolution;
  vec2 offset = direction * texelSize * kernelSize;
  
  // Sample center pixel
  vec3 result = texture(sourceTexture, vUv).rgb * weights[0];
  
  // Sample neighbors symmetrically
  for (int i = 1; i < 5; i++) {
    vec2 sampleOffset = offset * float(i);
    result += texture(sourceTexture, vUv + sampleOffset).rgb * weights[i];
    result += texture(sourceTexture, vUv - sampleOffset).rgb * weights[i];
  }
  
  fragColor = vec4(result, 1.0);
}
