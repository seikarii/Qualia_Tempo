#version 330 core
out vec4 fragColor;
in vec2 uv;

uniform sampler2D sceneTexture;
uniform sampler2D velocityTexture;
uniform int samples; // 8-16 típico
uniform float strength; // 0.5-1.0

void main() {
    vec2 velocity = texture(velocityTexture, uv).rg * strength;

    // Si velocidad muy baja, skip
    if (length(velocity) < 0.001) {
        fragColor = texture(sceneTexture, uv);
        return;
    }

    vec3 color = texture(sceneTexture, uv).rgb;

    for (int i = 1; i < samples; i++) {
        float t = float(i) / float(samples - 1);
        vec2 offset = velocity * (t - 0.5);
        color += texture(sceneTexture, uv + offset).rgb;
    }

    fragColor = vec4(color / float(samples), 1.0);
}