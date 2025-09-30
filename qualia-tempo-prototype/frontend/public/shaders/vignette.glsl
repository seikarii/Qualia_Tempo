uniform sampler2D tDiffuse;
uniform float darkness;
uniform float offset;
varying vec2 vUv;

void main() {
    vec4 color = texture2D(tDiffuse, vUv);

    vec2 center = vec2(0.5, 0.5);
    float dist = distance(vUv, center);
    float vignette = 1.0 - smoothstep(0.0, 1.0, dist * (1.0 + offset));
    vignette = pow(vignette, darkness);

    gl_FragColor = color * vignette;
}