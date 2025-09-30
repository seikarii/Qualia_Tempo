// QUALIA.CODE v4.0 - Advanced HDR Composition Shader with G-Buffer, Bloom & SSR
// ACES Filmic Tone Mapping + Advanced Color Grading + Screen Space Reflections

varying vec2 vUv;

uniform sampler2D tDiffuse;      // G-Buffer color texture
uniform sampler2D tBloom;        // Bloom texture
uniform sampler2D tSSR;          // Screen Space Reflections texture
uniform float bloomStrength;    // Bloom intensity (0.0-2.0)
uniform float ssrStrength;      // SSR intensity (0.0-1.0)
uniform float exposure;         // HDR exposure compensation (-3.0 to +3.0)
uniform float contrast;         // Contrast adjustment (0.5-2.0)
uniform float saturation;       // Color saturation (0.0-2.0)
uniform float gamma;            // Gamma correction (1.8-2.4)
uniform int blendMode;          // 0=Additive, 1=Screen, 2=Overlay, 3=SoftLight

// ACES Filmic Tone Mapping (Used by major studios: ILM, Pixar, etc.)
vec3 ACESFilm(vec3 x) {
    const float a = 2.51;
    const float b = 0.03;
    const float c = 2.43;
    const float d = 0.59;
    const float e = 0.14;
    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

// Professional color temperature adjustment
vec3 colorTemperature(vec3 color, float temp) {
    // Simplified color temperature (2000K-12000K range)
    float normalizedTemp = (temp - 6500.0) / 3500.0;
    vec3 tempShift = vec3(1.0 + normalizedTemp * 0.1, 1.0, 1.0 - normalizedTemp * 0.1);
    return color * tempShift;
}

// Advanced blend modes for effect composition
vec3 blendScreen(vec3 base, vec3 effect) {
    return 1.0 - (1.0 - base) * (1.0 - effect);
}

vec3 blendOverlay(vec3 base, vec3 effect) {
    return mix(2.0 * base * effect, 1.0 - 2.0 * (1.0 - base) * (1.0 - effect), step(0.5, base));
}

vec3 blendSoftLight(vec3 base, vec3 effect) {
    return mix(2.0 * base * effect + base * base * (1.0 - 2.0 * effect),
               sqrt(base) * (2.0 * effect - 1.0) + 2.0 * base * (1.0 - effect),
               step(0.5, effect));
}

// Luminance calculation for exposure adjustment
float luminance(vec3 color) {
    return dot(color, vec3(0.2126, 0.7152, 0.0722));
}

// Contrast adjustment with proper gamma handling
vec3 adjustContrast(vec3 color, float contrast) {
    vec3 result = (color - 0.5) * contrast + 0.5;
    return clamp(result, 0.0, 1.0);
}

// Saturation adjustment in HSL color space
vec3 adjustSaturation(vec3 color, float saturation) {
    float lum = luminance(color);
    return mix(vec3(lum), color, saturation);
}

void main() {
    // Sample base color from G-Buffer
    vec3 baseColor = texture2D(tDiffuse, vUv).rgb;

    // Sample bloom effect
    vec3 bloomColor = texture2D(tBloom, vUv).rgb;

    // Sample SSR effect
    vec3 ssrColor = texture2D(tSSR, vUv).rgb;

    // Apply exposure compensation
    baseColor *= pow(2.0, exposure);

    // Compose effects based on blend mode
    vec3 finalColor = baseColor;

    // Add bloom effect
    if (bloomStrength > 0.0) {
        vec3 blendedBloom;
        if (blendMode == 0) {
            // Additive
            blendedBloom = baseColor + bloomColor * bloomStrength;
        } else if (blendMode == 1) {
            // Screen
            blendedBloom = blendScreen(baseColor, bloomColor * bloomStrength);
        } else if (blendMode == 2) {
            // Overlay
            blendedBloom = blendOverlay(baseColor, bloomColor * bloomStrength);
        } else {
            // Soft Light (default)
            blendedBloom = blendSoftLight(baseColor, bloomColor * bloomStrength);
        }
        finalColor = blendedBloom;
    }

    // Add SSR effect (typically screen blend for reflections)
    if (ssrStrength > 0.0) {
        finalColor = blendScreen(finalColor, ssrColor * ssrStrength);
    }

    // Apply color grading
    finalColor = adjustContrast(finalColor, contrast);
    finalColor = adjustSaturation(finalColor, saturation);

    // Apply ACES filmic tone mapping
    finalColor = ACESFilm(finalColor);

    // Apply gamma correction
    finalColor = pow(finalColor, vec3(1.0 / gamma));

    // Output final color
    gl_FragColor = vec4(finalColor, 1.0);
}