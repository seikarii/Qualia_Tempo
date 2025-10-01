#version 330 core
out vec4 fragColor;
in vec2 uv;

uniform sampler2D hdrBuffer;
uniform sampler2D luminanceTexture; // Mipmap chain para auto-exposure
uniform float manualExposure;
uniform bool useAutoExposure;
uniform float exposureSpeed; // 0.05 típico para adaptación suave
uniform float minExposure;
uniform float maxExposure;

// Matriz ACES Input Transform (sRGB primaries)
const mat3 ACESInputMat = mat3(
    0.59719, 0.35458, 0.04823,
    0.07600, 0.90834, 0.01566,
    0.02840, 0.13383, 0.83777
);

// Matriz ACES Output Transform
const mat3 ACESOutputMat = mat3(
    1.60475, -0.53108, -0.07367,
    -0.10208,  1.10813, -0.00605,
    -0.00327, -0.07276,  1.07602
);

// RRT and ODT fit
vec3 RRTAndODTFit(vec3 v) {
    vec3 a = v * (v + 0.0245786) - 0.000090537;
    vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
    return a / b;
}

vec3 ACESFitted(vec3 color) {
    color = ACESInputMat * color;
    color = RRTAndODTFit(color);
    color = ACESOutputMat * color;
    return clamp(color, 0.0, 1.0);
}

float getLuminance(vec3 color) {
    return dot(color, vec3(0.2126, 0.7152, 0.0722));
}

void main() {
    vec3 hdrColor = texture(hdrBuffer, uv).rgb;
    
    float exposure = manualExposure;
    if (useAutoExposure) {
        // Lee luminancia promedio del nivel más bajo del mipmap
        float avgLuminance = texture(luminanceTexture, vec2(0.5)).r;
        float targetExposure = 0.18 / max(avgLuminance, 0.001); // Key value 0.18
        exposure = clamp(targetExposure, minExposure, maxExposure);
    }
    
    // Aplicar exposición
    vec3 exposed = hdrColor * exposure;
    
    // ACES tone mapping
    vec3 result = ACESFitted(exposed);
    
    // Gamma correction (ACES ya trabaja en linear, salida a sRGB)
    result = pow(result, vec3(1.0/2.2));
    
    fragColor = vec4(result, 1.0);
}