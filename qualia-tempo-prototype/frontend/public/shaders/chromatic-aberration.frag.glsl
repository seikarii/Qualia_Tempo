uniform sampler2D tDiffuse;
uniform vec2 resolution;
uniform float uAberrationAmount;

varying vec2 vUv;

void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec4 color = texture2D(tDiffuse, uv);

    vec2 redUv = vUv + vec2(uAberrationAmount, 0.0);
    vec2 greenUv = vUv;
    vec2 blueUv = vUv - vec2(uAberrationAmount, 0.0);

    vec4 red = texture2D(tDiffuse, redUv);
    vec4 green = texture2D(tDiffuse, greenUv);
    vec4 blue = texture2D(tDiffuse, blueUv);

    gl_FragColor = vec4(red.r, green.g, blue.b, color.a);
}
