// src/shaders/ice.frag
uniform float u_time;
varying vec3 v_normal;

void main() {
    // El efecto Fresnel hace que los bordes del objeto brillen más
    float fresnel = 1.0 - dot(normalize(v_normal), vec3(0.0, 0.0, 1.0));
    fresnel = pow(fresnel, 3.0); // Potenciamos el efecto

    // Color base del hielo
    vec3 iceColor = vec3(0.6, 0.8, 1.0);
    
    // El color final es una mezcla del color base y un blanco brillante en los bordes
    vec3 finalColor = mix(iceColor, vec3(1.0), fresnel);

    // Añadimos un ligero parpadeo con el tiempo
    float flicker = sin(u_time * 10.0) * 0.1 + 0.9;

    gl_FragColor = vec4(finalColor * flicker, fresnel * 0.8);
}
