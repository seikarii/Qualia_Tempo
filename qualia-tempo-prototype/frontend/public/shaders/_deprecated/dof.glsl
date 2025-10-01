#version 330 core
out vec4 fragColor;
in vec2 uv;

uniform sampler2D sceneTexture;
uniform sampler2D depthTexture;
uniform float focusDistance; // Distancia de enfoque
uniform float focusRange; // Rango de enfoque nítido
uniform float bokehRadius; // Radio máximo de blur
uniform vec2 resolution;

const int SAMPLES = 64; // Reducir si hay problemas de performance
const float GOLDEN_ANGLE = 2.39996323;

float getBlurRadius(float depth) {
    float distance = depth * 100.0; // Escalar según tu rango de profundidad
    float coc = abs(distance - focusDistance) / focusRange;
    return clamp(coc * bokehRadius, 0.0, bokehRadius);
}

void main() {
    float centerDepth = texture(depthTexture, uv).r;
    float radius = getBlurRadius(centerDepth);

    if (radius < 0.5) {
        fragColor = texture(sceneTexture, uv);
        return;
    }

    vec3 color = vec3(0.0);
    float totalWeight = 0.0;

    for (int i = 0; i < SAMPLES; i++) {
        float angle = float(i) * GOLDEN_ANGLE;
        float dist = sqrt(float(i) / float(SAMPLES));
        vec2 offset = vec2(cos(angle), sin(angle)) * dist * radius / resolution;

        vec3 sampleColor = texture(sceneTexture, uv + offset).rgb;
        float weight = 1.0;

        color += sampleColor * weight;
        totalWeight += weight;
    }

    fragColor = vec4(color / totalWeight, 1.0);
}