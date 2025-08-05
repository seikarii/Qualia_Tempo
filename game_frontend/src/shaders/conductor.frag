// conductor.frag
precision mediump float;
uniform vec4 u_color;
uniform float u_time;

void main() {
    float pulse = (sin(u_time * 10.0) + 1.0) * 0.5; // Pulso rítmico rápido
    vec3 finalColor = u_color.rgb * (0.8 + pulse * 0.2);
    gl_FragColor = vec4(finalColor, u_color.a);
}
