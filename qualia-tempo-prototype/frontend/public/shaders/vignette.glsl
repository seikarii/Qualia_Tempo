uniform float darkness;
uniform float offset;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec2 center = vec2(0.5, 0.5);
    float dist = distance(uv, center);
    float vignette = 1.0 - smoothstep(0.0, 1.0, dist * (1.0 + offset));
    vignette = pow(vignette, darkness);

    outputColor = inputColor * vignette;
}
---FRAGMENT---
uniform float darkness;
uniform float offset;

void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec4 color = texture2D(tDiffuse, uv);

    vec2 center = vec2(0.5, 0.5);
    float dist = distance(uv, center);
    float vignette = 1.0 - smoothstep(0.0, 1.0, dist * (1.0 + offset));
    vignette = pow(vignette, darkness);

    gl_FragColor = color * vignette;
}