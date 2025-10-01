uniform sampler2D tDiffuse;
uniform float uAberrationAmount;
varying vec2 vUv;

void main() {
    vec2 redUv = vUv + vec2(uAberrationAmount, 0.0);
    vec2 blueUv = vUv - vec2(uAberrationAmount, 0.0);

    float red = texture2D(tDiffuse, redUv).r;
    float green = texture2D(tDiffuse, vUv).g;
    float blue = texture2D(tDiffuse, blueUv).b;
    float alpha = texture2D(tDiffuse, vUv).a;

    gl_FragColor = vec4(red, green, blue, alpha);
}
