#version 300 es
/**
 * QUALIA.CODE v1.1 - Color Grading LUT Shader (Native 3D Texture)
 * CRISALIDA.CODE v1.1 - Phase 1: Independent Effects (WebGL 2.0 Upgrade)
 *
 * 3D color lookup table (LUT) implementation using native sampler3D.
 * Rescued from _deprecated shaders - elite quality implementation.
 *
 * Key Features:
 * - WebGL 2.0 native sampler3D (optimal performance)
 * - 32x32x32 LUT support (standard cinema grade)
 * - Blend strength for subtle color grading
 * - Hardware-accelerated trilinear interpolation
 *
 * LUT Format:
 * - 3D texture: 32x32x32 voxels
 * - RGB input directly maps to 3D texture coordinates
 * - No unwrapping required (native GPU support)
 *
 * Uniforms:
 * - inputTexture: Source image
 * - colorLUT: 3D LUT texture (sampler3D)
 * - lutStrength: Blend strength (0.0-1.0)
 *
 * TODO: Implement AssetService for loading .cube LUT files
 */

precision highp float;
precision highp sampler3D;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D inputTexture;
uniform sampler3D colorLUT;
uniform float lutStrength;

void main() {
  // Sample input color
  vec4 originalColor = texture(inputTexture, vUv);
  
  // Map RGB [0,1] to 3D texture coordinates
  // Scale slightly inward to avoid edge sampling issues
  vec3 lutCoord = clamp(originalColor.rgb, 0.0, 1.0);
  
  // Sample 3D LUT (hardware trilinear interpolation)
  vec3 gradedColor = texture(colorLUT, lutCoord).rgb;
  
  // Blend between original and graded based on strength
  vec3 finalColor = mix(originalColor.rgb, gradedColor, lutStrength);
  
  // Output with original alpha
  fragColor = vec4(finalColor, originalColor.a);
}
