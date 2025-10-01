#version 330 core
out vec4 fragColor;
in vec2 uv;

uniform sampler2D inputTexture;
uniform float strength; // 0.001-0.003 MUY sutil

void main() {
    vec2 dir = uv - 0.5;
    float dist = length(dir);

    vec2 offset = normalize(dir) * dist * strength;

    float r = texture(inputTexture, uv - offset).r;
    float g = texture(inputTexture, uv).g;
    float b = texture(inputTexture, uv + offset).b;

    fragColor = vec4(r, g, b, 1.0);
}