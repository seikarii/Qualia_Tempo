#version 330 core
out vec4 fragColor;
in vec2 uv;

uniform sampler2D inputTexture;
uniform vec2 texelSize;

void main() {
    vec4 d = texelSize.xyxy * vec4(-1, -1, 1, 1);

    vec3 s = texture(inputTexture, uv + d.xy).rgb;
    s += texture(inputTexture, uv + d.zy).rgb * 2.0;
    s += texture(inputTexture, uv + d.xw).rgb * 2.0;
    s += texture(inputTexture, uv + d.zw).rgb;
    s += texture(inputTexture, uv + vec2(-2.0, 0.0) * texelSize).rgb;
    s += texture(inputTexture, uv + vec2(2.0, 0.0) * texelSize).rgb;
    s += texture(inputTexture, uv + vec2(0.0, -2.0) * texelSize).rgb;
    s += texture(inputTexture, uv + vec2(0.0, 2.0) * texelSize).rgb;
    s += texture(inputTexture, uv).rgb * 4.0;

    fragColor = vec4(s / 16.0, 1.0);
}