// src/shaders/fire.frag
uniform float u_time;
varying vec2 vUv;

// Función de ruido 2D simple
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

// Ruido de valor
float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);

    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));

    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.y * u.x;
}

// Movimiento browniano fraccional (para un ruido más "natural")
float fbm(vec2 st) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 0.0;

    for (int i = 0; i < 6; i++) {
        value += amplitude * noise(st);
        st *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

void main() {
    vec2 uv = vUv;
    float q = fbm(uv + u_time * 0.1);
    
    // Distorsión para el efecto de "olas de calor"
    vec2 q_distorted = vec2(q, q);
    float q2 = fbm(uv + q_distorted + u_time * 0.2);

    // Paleta de colores para el fuego
    vec3 yellow = vec3(1.0, 1.0, 0.0);
    vec3 orange = vec3(1.0, 0.5, 0.0);
    vec3 red = vec3(1.0, 0.0, 0.0);
    vec3 darkRed = vec3(0.5, 0.0, 0.0);
    vec3 black = vec3(0.0, 0.0, 0.0);

    // Mezclamos los colores basándonos en el ruido
    vec3 color = mix(yellow, orange, smoothstep(0.4, 0.6, q2));
    color = mix(color, red, smoothstep(0.6, 0.8, q2));
    color = mix(color, darkRed, smoothstep(0.8, 0.9, q2));
    color = mix(color, black, smoothstep(0.9, 1.0, q2));

    // Hacemos que los bordes sean más oscuros/transparentes
    float edge = smoothstep(0.0, 1.0, length(uv * 2.0 - 1.0));
    
    gl_FragColor = vec4(color, 1.0 - edge);
}
