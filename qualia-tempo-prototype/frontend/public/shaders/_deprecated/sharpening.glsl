#version 330 core
out vec4 fragColor;
in vec2 uv;

uniform sampler2D inputTexture;
uniform vec2 resolution;
uniform float sharpness; // 0.2-0.5 típico

void main() {
    vec2 pixelSize = 1.0 / resolution;

    vec3 center = texture(inputTexture, uv).rgb;
    vec3 left = texture(inputTexture, uv + vec2(-pixelSize.x, 0)).rgb;
    vec3 right = texture(inputTexture, uv + vec2(pixelSize.x, 0)).rgb;
    vec3 top = texture(inputTexture, uv + vec2(0, pixelSize.y)).rgb;
    vec3 bottom = texture(inputTexture, uv + vec2(0, -pixelSize.y)).rgb;

    vec3 laplacian = center * 4.0 - (left + right + top + bottom);

    // Detectar bordes para evitar oversharpening
    float edgeDetection = length(laplacian);
    float adaptiveStrength = sharpness * smoothstep(0.5, 0.0, edgeDetection);

    vec3 sharpened = center + laplacian * adaptiveStrength;

    fragColor = vec4(clamp(sharpened, 0.0, 1.0), 1.0);
}