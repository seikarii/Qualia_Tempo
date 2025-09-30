// QUALIA.CODE v1.2 - Professional HDR Composition Shader for Three.js
// ACES Filmic Tone Mapping + Advanced Color Grading (Industry Standard)

varying vec2 vUv;

uniform sampler2D tDiffuse;      // Scene texture (Three.js standard)
uniform sampler2D tBloom;        // Bloom texture
uniform float bloomStrength;    // Bloom intensity (0.0-2.0)
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

// Advanced blend modes for bloom composition
vec3 blendScreen(vec3 base, vec3 bloom) {
    return 1.0 - (1.0 - base) * (1.0 - bloom);
}

vec3 blendOverlay(vec3 base, vec3 bloom) {
    return mix(2.0 * base * bloom, 1.0 - 2.0 * (1.0 - base) * (1.0 - bloom), step(0.5, base));
}

vec3 blendSoftLight(vec3 base, vec3 bloom) {
    return mix(2.0 * base * bloom + base * base * (1.0 - 2.0 * bloom),
               sqrt(base) * (2.0 * bloom - 1.0) + 2.0 * base * (1.0 - bloom),
               step(0.5, bloom));
}

// Luminance calculation for exposure adjustment
float luminance(vec3 color) {
    return dot(color, vec3(0.2126, 0.7152, 0.0722));
}

void main() {
    // Sample base scene and bloom
    vec3 scene = texture2D(tDiffuse, vUv).rgb;
    vec3 bloom = texture2D(tBloom, vUv).rgb;

    // Apply exposure compensation to scene
    scene *= pow(2.0, exposure);

    // Blend bloom with scene using selected mode
    vec3 result;
    switch(blendMode) {
        case 1: // Screen blend
            result = blendScreen(scene, bloom * bloomStrength);
            break;
        case 2: // Overlay blend
            result = blendOverlay(scene, bloom * bloomStrength);
            break;
        case 3: // Soft light blend
            result = blendSoftLight(scene, bloom * bloomStrength);
            break;
        default: // Additive blend (0)
            result = scene + bloom * bloomStrength;
            break;
    }

    // Apply ACES filmic tone mapping (Industry standard)
    result = ACESFilm(result);

    // Color grading pipeline
    // 1. Contrast adjustment
    result = mix(vec3(0.5), result, contrast);

    // 2. Saturation control
    float lum = luminance(result);
    result = mix(vec3(lum), result, saturation);

    // 3. Gamma correction for display
    result = pow(result, vec3(1.0 / gamma));

    // 4. Final clamp to prevent artifacts
    result = clamp(result, 0.0, 1.0);

    gl_FragColor = vec4(result, 1.0);
}