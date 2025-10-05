/**
 * QUALIA.CODE v1.1 - Color Grading LUT Shader (2D Unwrapped)
 * CRISALIDA.CODE v1.1 - Phase 1: Independent Effects
 *
 * 3D color lookup table (LUT) implementation using 2D unwrapped texture.
 * Rescued from _deprecated shaders - elite quality implementation.
 *
 * Key Features:
 * - WebGL 1.0 compatible (uses 2D texture instead of 3D)
 * - 32x32x32 LUT support (standard cinema grade)
 * - Blend strength for subtle color grading
 * - Edge-safe sampling to prevent bleeding
 *
 * LUT Format:
 * - 2D texture: 1024x32 pixels (32 slices of 32x32)
 * - Each horizontal strip is one Z-slice of the 3D LUT
 * - RGB input maps to (X, Y, Z) in LUT space
 *
 * Uniforms:
 * - inputTexture: Source image
 * - colorLUT: 2D unwrapped LUT texture (1024x32)
 * - lutStrength: Blend strength (0.0-1.0)
 *
 * TODO: Implement AssetService for loading .cube LUT files
 */

precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D inputTexture;
uniform sampler2D colorLUT;  // 2D unwrapped LUT (1024x32 for 32x32x32 cube)
uniform float lutStrength;

const float LUT_SIZE = 32.0;
const float LUT_SCALE = (LUT_SIZE - 1.0) / LUT_SIZE;
const float LUT_OFFSET = 1.0 / (2.0 * LUT_SIZE);

/**
 * Sample 3D LUT from 2D unwrapped texture
 * @param lut 2D texture containing unwrapped 3D LUT
 * @param color RGB color to look up
 * @return Graded RGB color
 */
vec3 sampleLUT(sampler2D lut, vec3 color) {
    // Scale and offset to avoid edge bleeding
    vec3 scaledColor = clamp(color, 0.0, 1.0) * LUT_SCALE + LUT_OFFSET;
    
    // Calculate 3D LUT coordinates
    float blueSlice = scaledColor.b * (LUT_SIZE - 1.0);
    float blueSliceFloor = floor(blueSlice);
    float blueSliceFrac = blueSlice - blueSliceFloor;
    
    // Calculate 2D texture coordinates for two Z-slices
    vec2 uv1, uv2;
    uv1.x = (blueSliceFloor + scaledColor.r) / LUT_SIZE;
    uv1.y = scaledColor.g;
    uv2.x = (blueSliceFloor + 1.0 + scaledColor.r) / LUT_SIZE;
    uv2.y = scaledColor.g;
    
    // Sample and interpolate between Z-slices
    vec3 color1 = texture(lut, uv1).rgb;
    vec3 color2 = texture(lut, uv2).rgb;
    
    return mix(color1, color2, blueSliceFrac);
}

void main() {
    vec3 originalColor = texture(inputTexture, vUv).rgb;
    vec3 gradedColor = sampleLUT(colorLUT, originalColor);
    
    // Blend between original and graded based on strength
    vec3 result = mix(originalColor, gradedColor, lutStrength);
    
    fragColor = vec4(result, 1.0);
}
