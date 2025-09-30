#version 330 core
out vec4 fragColor;
in vec2 uv;

uniform sampler2D lowResTexture;
uniform sampler2D highResTexture;
uniform vec2 texelSize;
uniform float intensity; // 0.1-0.5 típico

void main() {
    vec4 d = texelSize.xyxy * vec4(-1, -1, 1, 1) * 0.5;

    vec3 bloom = texture(lowResTexture, uv + d.xy).rgb;
    bloom += texture(lowResTexture, uv + d.zy).rgb;
    bloom += texture(lowResTexture, uv + d.xw).rgb;
    bloom += texture(lowResTexture, uv + d.zw).rgb;
    bloom *= 0.25;

    vec3 highRes = texture(highResTexture, uv).rgb;

    fragColor = vec4(highRes + bloom * intensity, 1.0);
}