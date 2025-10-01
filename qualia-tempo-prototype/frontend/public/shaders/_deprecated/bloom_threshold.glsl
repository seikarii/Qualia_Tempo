#version 330 core
out vec4 fragColor;
in vec2 uv;

uniform sampler2D hdrBuffer;
uniform float threshold; // 1.0-2.0 típico
uniform float softKnee; // 0.5 típico

vec3 prefilter(vec3 color) {
    float brightness = max(color.r, max(color.g, color.b));
    float knee = threshold * softKnee;
    float soft = brightness - threshold + knee;
    soft = clamp(soft, 0.0, 2.0 * knee);
    soft = soft * soft / (4.0 * knee + 0.00001);
    float contribution = max(soft, brightness - threshold);
    contribution /= max(brightness, 0.00001);
    return color * contribution;
}

void main() {
    vec3 color = texture(hdrBuffer, uv).rgb;
    fragColor = vec4(prefilter(color), 1.0);
}