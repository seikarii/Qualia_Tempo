// virtuoso.frag
precision mediump float;
uniform vec4 u_color;
uniform float u_time;

void main() {
    float shimmer = (sin(u_time * 2.0) + 1.0) * 0.5; // Brillo lento y melódico
    float high_freq_shimmer = (cos(u_time * 25.0) + 1.0) * 0.5; // Pequeños destellos rápidos
    vec3 baseColor = u_color.rgb;
    vec3 finalColor = baseColor + (shimmer * 0.2) + (high_freq_shimmer * 0.05);
    gl_FragColor = vec4(finalColor, u_color.a);
}
