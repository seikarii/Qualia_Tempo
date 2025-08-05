// src/shaders/beam.frag
uniform float u_time;
uniform vec3 u_color;
varying vec2 vUv;

// Función de ruido simple
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void main() {
    // Hacemos que el ruido se mueva a lo largo del rayo (coordenada v)
    float noise = random(vec2(vUv.x, vUv.y + u_time * -2.0));
    
    // Creamos un patrón de "bandas" de energía
    float bands = sin(vUv.y * 20.0 - u_time * 10.0) * 0.5 + 0.5;
    
    // Combinamos el ruido y las bandas
    float energy = noise * bands;
    
    // Hacemos que los bordes del rayo sean más tenues
    float edge_fade = smoothstep(0.0, 0.5, vUv.x) * smoothstep(1.0, 0.5, vUv.x);
    
    float alpha = energy * edge_fade;

    gl_FragColor = vec4(u_color, alpha);
}
