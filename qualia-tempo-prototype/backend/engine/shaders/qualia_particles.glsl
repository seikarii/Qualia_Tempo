#version 430

// QUALIA.CODE v1.0 - Enhanced Qualia Particles Compute Shader
// Real-time particle simulation driven by QualiaState with resonance system
// Features: Weighted force blending, resonance evolution, intelligent respawning, breathing effects

layout(local_size_x = 64, local_size_y = 1, local_size_z = 1) in;

// QualiaParticle structure optimized for visual effects
struct QualiaParticle {
    vec3 position;          // x, y, z coordinates
    vec3 velocity;          // velocity vector
    vec4 color;             // RGBA color
    float lifetime;         // remaining lifetime
    float size;             // particle size
    float resonance;        // accumulated player performance resonance (0-1)
};

// Input and output buffers for ping-pong operation
layout(std430, binding = 0) restrict readonly buffer ParticleInputBuffer {
    QualiaParticle particles_input[];
};

layout(std430, binding = 1) restrict writeonly buffer ParticleOutputBuffer {
    QualiaParticle particles_output[];
};

// QualiaState uniform buffer
layout(std140, binding = 1) uniform QualiaState {
    float intensity;        // Overall energy level (0-1)
    float focus_level;        // Accuracy and focus (0-1)  
    float aggression;       // Fast, aggressive actions (0-1)
    float flow;            // Rhythmic consistency (0-1)
    float chaos;           // Chaotic, unpredictable actions (0-1)
    float recovery;        // Recovery and healing (0-1)
    float transcendence;   // Ultimate state (0-1)
    float time;            // Global time for animations
    uint max_particles;    // Total number of particles for Fibonacci distribution
};

// Constants for particle physics and world boundaries
const float PI = 3.14159265359;
const float TWO_PI = 6.28318530718;
const float GOLDEN_RATIO = 1.618033988749;
const float PARTICLE_SPEED_BASE = 5.0;
const float LIFETIME_BASE = 1.0;
const float SIZE_BASE = 0.5;
const float WORLD_SIZE = 50.0;
const float TIME_DELTA = 0.016; // ~60 FPS assumption

// Enhanced utility functions for high-performance GPU compute
float hash(float n) {
    return fract(sin(n * 12.9898) * 43758.5453);
}

float smoothNoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f*f*(3.0-2.0*f);
    
    float n = i.x + i.y*57.0 + 113.0*i.z;
    return mix(
        mix(mix(hash(n+  0.0), hash(n+  1.0),f.x),
            mix(hash(n+ 57.0), hash(n+ 58.0),f.x),f.y),
        mix(mix(hash(n+113.0), hash(n+114.0),f.x),
            mix(hash(n+170.0), hash(n+171.0),f.x),f.y),f.z);
}

// Enhanced color calculation with improved transitions and transcendence effects
vec4 calculate_qualia_color_enhanced(vec3 position, float base_intensity, float particle_resonance) {
    // Color base que transita de azul (calma) a verde (recuperación)
    vec3 color = mix(vec3(0.0, 0.5, 0.8), vec3(0.0, 1.0, 0.3), smoothstep(0.0, 1.0, recovery));
    
    // Mezcla aditiva para agresión y fluidez con transiciones suaves
    color = mix(color, vec3(1.0, 0.2, 0.0), smoothstep(0.0, 0.7, aggression));
    color = mix(color, vec3(0.2, 0.4, 1.0), smoothstep(0.3, 0.8, flow));
    
    // Efecto de arcoíris para la trascendencia usando fórmula matemática optimizada
    if(transcendence > 0.1) {
        float hue = fract(time * 0.3 + position.x * 0.05 + particle_resonance * 1.5);
        vec3 rainbow = 0.5 + 0.5 * cos(6.28318 * (hue + vec3(0.0, 0.33, 0.67)));
        color = mix(color, rainbow, smoothstep(0.1, 0.5, transcendence));
    }
    
    // Brillo aditivo basado en la resonancia de la partícula
    color *= (1.0 + particle_resonance * 0.5);
    
    float alpha = clamp(0.3 + base_intensity * 0.5 + particle_resonance * 0.2, 0.1, 1.0);
    
    return vec4(color, alpha);
}

// Efecto de parpadeo y brillo por resonancia (sistema de recompensa visual)
vec4 applyResonanceGlow(vec4 color, vec3 position, float resonance) {
    if(resonance > 0.7) {
        // Brillo en los bordes para partículas de alta resonancia
        float edgeGlow = smoothstep(0.7, 1.0, resonance) * (0.5 + 0.5 * sin(time * 5.0 + position.x * 10.0));
        color.rgb += edgeGlow * vec3(1.0, 0.9, 0.3) * 0.3;
        
        // Parpadeo suave usando hash para variación orgánica
        float flicker = 0.9 + 0.1 * hash(position.x + position.y * 10.0 + time);
        color.rgb *= flicker;
    }
    return color;
}

// Aplicar efecto de vórtice para movimiento más dinámico durante alto flow
vec3 applyVortexEffect(vec3 position, vec3 velocity, float intensity) {
    float vortexRadius = 5.0;
    float distFromCenter = length(position.xz);
    if(distFromCenter < vortexRadius) {
        float vortexStrength = (1.0 - distFromCenter/vortexRadius) * intensity;
        // El ángulo se basa en la posición y el tiempo para crear rotación orgánica
        float angle = atan(position.z, position.x) + time * 2.0 * flow;
        vec3 vortexDirection = vec3(-sin(angle), 0.0, cos(angle));
        velocity += vortexDirection * vortexStrength * 3.0;
    }
    return velocity;
}

// Enhanced velocity calculation with vortex effects and smoother transitions
vec3 calculate_enhanced_velocity(vec3 position, vec3 current_velocity, float particle_resonance) {
    // Se mantiene una inercia base con mayor conservación de momentum
    vec3 velocity = current_velocity * 0.97;
    
    // Aplicar vórtice cuando el 'flow' es alto para crear movimiento espiral
    if(flow > 0.5) {
        velocity = applyVortexEffect(position, velocity, flow);
    }

    // Fuerzas adicionales basadas en QualiaState con física mejorada
    vec3 qualia_force = vec3(0.0);
    
    // Repulsión/atracción con agresión: crea dinámica hacia/desde el centro
    qualia_force += normalize(-position) * aggression * 0.1;
    
    // Movimiento orbital con precisión: patrones matemáticos elegantes
    qualia_force += vec3(sin(time), cos(time), sin(time*0.5)) * focus_level * 0.05;
    
    // Caos añade turbulencia usando smoothNoise mejorado
    if(chaos > 0.2) {
        vec3 turbulence = vec3(
            smoothNoise(position * 0.1 + time * 0.5),
            smoothNoise(position * 0.1 + time * 0.5 + vec3(100.0)),
            smoothNoise(position * 0.1 + time * 0.5 + vec3(200.0))
        ) - 0.5;
        qualia_force += turbulence * chaos * 0.3;
    }
    
    // Recovery crea elevación suave
    qualia_force += vec3(0.0, recovery * 0.02, 0.0);

    velocity += qualia_force;

    // Suavizar cambios bruscos para evitar movimientos erráticos
    vec3 direction_change = velocity - current_velocity;
    float max_change = 0.1 * (1.0 + particle_resonance);
    if(length(direction_change) > max_change) {
        velocity = current_velocity + normalize(direction_change) * max_change;
    }
    
    return velocity;
}

// Distorsión del espacio que afecta la posición durante transcendencia
vec3 applySpaceDistortion(vec3 position, float intensity) {
    if(transcendence > 0.3) {
        // Distorsión sinusoidal compleja que crea efectos de "realidad alterada"
        float distortion = sin(position.x * 0.5 + time) * cos(position.y * 0.5 + time * 1.3) * sin(position.z * 0.5 + time * 0.7);
        // La distorsión es proporcional a la intensidad de la trascendencia
        return position + normalize(position) * distortion * transcendence * 0.5;
    }
    return position;
}

// Optimized particle respawn using Fibonacci sphere distribution
void respawnParticle(inout QualiaParticle p, uint index) {
    // Distribución esférica uniforme usando la espiral dorada (Fibonacci sphere)
    float particle_count = float(max_particles); // Use actual particle count from uniform
    float phi = acos(1.0 - 2.0 * (float(index) + 0.5) / particle_count);
    float theta = PI * (1.0 + sqrt(5.0)) * float(index);
    
    float radius = 2.0 + hash(float(index) + time) * 5.0;
    p.position = vec3(
        radius * sin(phi) * cos(theta),
        (hash(float(index)) - 0.5) * 4.0,
        radius * sin(phi) * sin(theta)
    );
    
    p.velocity = normalize(p.position) * (0.1 + hash(float(index)) * 0.5) * PARTICLE_SPEED_BASE;
    p.lifetime = LIFETIME_BASE * (0.8 + hash(float(index) + 1.23) * 0.4);
    p.resonance = 0.0; // La resonancia se gana, no se nace con ella
}

// Enhanced main compute function with integrated improvements
void main() {
    uint index = gl_GlobalInvocationID.x;
    if (index >= particles_input.length()) return;
    
    QualiaParticle particle = particles_input[index];
    
    // --- Actualización de Estado ---
    // La resonancia aumenta con el 'flow' y decae de forma no lineal
    if (flow > 0.3) {
        particle.resonance = min(1.0, particle.resonance + flow * 0.01 * (1.0 - particle.resonance * 0.5));
    } else {
        particle.resonance *= 0.995; // Decaimiento suave
    }

    // --- Simulación de Físicas ---
    particle.velocity = calculate_enhanced_velocity(particle.position, particle.velocity, particle.resonance);
    
    // La posición se actualiza después de calcular la velocidad
    particle.position += particle.velocity * TIME_DELTA;
    
    // Aplicar distorsión espacial solo durante la trascendencia
    particle.position = applySpaceDistortion(particle.position, transcendence);
    
    // --- Colisiones y Límites del Mundo ---
    vec3 boundary = vec3(WORLD_SIZE, WORLD_SIZE * 0.5, WORLD_SIZE);
    for(int i = 0; i < 3; i++) {
        if(abs(particle.position[i]) > boundary[i]) {
            // Rebote con pérdida de energía
            particle.position[i] = sign(particle.position[i]) * boundary[i];
            particle.velocity[i] *= -0.7;
        }
    }
    
    // --- Actualización Visual ---
    float base_intensity = 0.5 + 0.5 * sin(time * 0.5 + particle.position.x * 0.1);
    particle.color = calculate_qualia_color_enhanced(particle.position, base_intensity, particle.resonance);
    particle.color = applyResonanceGlow(particle.color, particle.position, particle.resonance);
    
    // Tamaño con respiración orgánica y efectos de resonancia
    particle.size = SIZE_BASE * (0.8 + particle.resonance * 0.5 + sin(time * 2.0 + particle.position.x) * 0.1);
    
    // --- Ciclo de Vida ---
    particle.lifetime -= TIME_DELTA * (0.8 + chaos * 0.4);
    
    if(particle.lifetime <= 0.0 || length(particle.position) > WORLD_SIZE * 1.5) {
        respawnParticle(particle, index);
    }
    
    particles_output[index] = particle;
}
