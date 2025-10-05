#version 300 es
/**
 * QUALIA.CODE v1.1 - Professional Bright Pass Extraction (WebGL 2.0)
 * CRISALIDA.CODE v1.1 - Phase 2: Complete Bloom System
 *
 * Soft threshold with color preservation and luminance analysis.
 * Rescued from _deprecated shaders - elite quality implementation.
 *
 * Key Features:
 * - Rec. 709 luminance calculation (broadcast standard)
 * - Soft threshold with smooth knee for natural transitions
 * - Color preservation for saturated highlights
 * - Intensity control for bloom strength
 *
 * Uniforms:
 * - sceneTexture: Input HDR scene
 * - threshold: Primary brightness threshold (0.8-1.2 typical)
 * - softThreshold: Soft knee range (0.0 = hard, 1.0 = very soft)
 * - intensity: Bloom strength multiplier (1.0-3.0)
 * - colorPreservation: Saturation preservation (0.7-1.0)
 */

precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D sceneTexture;
uniform float threshold;
uniform float softThreshold;
uniform float intensity;
uniform float colorPreservation;

// Professional luminance calculation (Rec. 709 broadcast standard)
float getLuminance(vec3 color) {
  return dot(color, vec3(0.2126, 0.7152, 0.0722));
}

// Soft threshold function with smooth knee
float softThresholdCurve(float brightness, float thresh, float knee) {
  float halfKnee = knee * 0.5;
  
  if (brightness < thresh - halfKnee) {
    return 0.0;
  } else if (brightness < thresh + halfKnee) {
    // Smooth transition in knee region
    float t = (brightness - thresh + halfKnee) / knee;
    return smoothstep(0.0, 1.0, t);
  } else {
    return 1.0;
  }
}

// Color preservation for saturated highlights
vec3 preserveColor(vec3 color, float factor) {
  float lum = getLuminance(color);
  if (lum > 0.001) {
    vec3 chromaticity = color / lum;
    return mix(vec3(lum), color, factor);
  }
  return color;
}

void main() {
  vec3 color = texture(sceneTexture, vUv).rgb;
  float brightness = getLuminance(color);
  
  // Calculate soft threshold factor
  float thresholdFactor = softThresholdCurve(brightness, threshold, softThreshold);
  
  if (thresholdFactor > 0.0) {
    // Preserve color information in bright areas
    vec3 preservedColor = preserveColor(color, colorPreservation);
    
    // Apply threshold with intensity control
    vec3 bloomColor = preservedColor * thresholdFactor * intensity;
    
    // Enhance saturation for bloom effect
    float enhancement = 1.0 + (thresholdFactor * 0.5);
    bloomColor *= enhancement;
    
    fragColor = vec4(bloomColor, 1.0);
  } else {
    fragColor = vec4(0.0, 0.0, 0.0, 1.0);
  }
}
