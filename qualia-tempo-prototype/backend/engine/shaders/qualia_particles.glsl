#version 430

// QUALIA.CODE v1.0 - Enhanced Qualia Particles Compute Shader
// Real-time particle simulation driven by QualiaState with resonance system
// Features: Weighted force blending, resonance evolution, intelligent respawning, breathing effects

layout(local_size_x = 64, local_size_y = 1, local_size_z = 1) in;

// Enhanced QualiaParticle structure with additional physics properties
struct QualiaParticle {
    vec3 position;          // x, y, z coordinates
    vec3 velocity;          // velocity vector
    vec3 acceleration;      // acceleration vector for advanced physics
    vec4 color;             // RGBA color
    float lifetime;         // remaining lifetime
    float size;             // particle size
    float resonance;        // accumulated player performance resonance (0-1)
    float mass;             // particle mass for gravitational effects
    float charge;           // particle charge for electromagnetic effects
    vec3 force_accumulator; // accumulated forces for integration
};

// Input and output buffers for ping-pong operation
layout(std430, binding = 0) restrict readonly buffer ParticleInputBuffer {
    QualiaParticle particles_input[];
};

layout(std430, binding = 1) restrict writeonly buffer ParticleOutputBuffer {
    QualiaParticle particles_output[];
};

// Force field structure for advanced physics simulation
struct ForceField {
    vec3 position;
    vec3 force_direction;
    float strength;
    float radius;
    int field_type; // 0=gravitational, 1=electromagnetic, 2=vortex, 3=repulsor
};

// Force fields buffer for advanced physics
layout(std430, binding = 2) restrict readonly buffer ForceFieldsBuffer {
    ForceField force_fields[];
};

// QualiaState uniform buffer with enhanced parameters
layout(std140, binding = 1) uniform QualiaState {
    float intensity;        // Overall energy level (0-1)
    float accuracy;         // Accuracy and focus (0-1) (renamed from precision to avoid GLSL keyword conflict)
    float aggression;       // Fast, aggressive actions (0-1)
    float flow;            // Rhythmic consistency (0-1)
    float chaos;           // Chaotic, unpredictable actions (0-1)
    float recovery;        // Recovery and healing (0-1)
    float transcendence;   // Ultimate state (0-1)
    float time;            // Global time for animations
    uint max_particles;    // Total number of particles for physics calculations
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
    qualia_force += vec3(sin(time), cos(time), sin(time*0.5)) * accuracy * 0.05;
    
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

// Enhanced dynamic force field calculations for combat and musical interactions
vec3 calculateForceFieldEffect(vec3 position, QualiaParticle particle) {
    vec3 total_force = vec3(0.0);
    
    // Iterate through all possible force fields (increased from 4 to 16)
    for(int i = 0; i < 16; i++) {
        // Skip inactive force fields (zero strength)
        if(abs(force_fields[i].strength) < 0.001) {
            continue;
        }
        
        // Calculate direction vector from particle to force field center
        vec3 force_dir = force_fields[i].position - position;
        float distance = length(force_dir);
        
        // Apply force only within radius and avoid singularities
        if(distance < force_fields[i].radius && distance > 0.1) {
            vec3 normalized_dir = normalize(force_dir);
            
            // Inverse square law with smoothing to prevent singularities
            float distance_sq = distance * distance + 0.5; // Smoothing factor
            float force_magnitude = force_fields[i].strength / distance_sq;
            
            // Limit maximum force to prevent extreme accelerations
            force_magnitude = clamp(force_magnitude, -50.0, 50.0);
            
            // Apply force type: 0=attractor, 1=repulsor
            if(force_fields[i].field_type == 0) {
                // Attractor: pull towards center, weighted by mass
                total_force += normalized_dir * force_magnitude * particle.mass;
            } else if(force_fields[i].field_type == 1) {
                // Repulsor: push away from center, weighted by mass
                total_force -= normalized_dir * force_magnitude * particle.mass;
            }
        }
    }
    
    return total_force;
}

// Particle-to-particle interactions for emergent behavior
vec3 calculateParticleInteractions(vec3 position, vec3 velocity, int self_index) {
    vec3 interaction_force = vec3(0.0);
    float interaction_radius = 5.0;
    
    // Sample a subset of particles for performance
    for(int i = 0; i < int(max_particles); i += 8) {
        if(i == self_index) continue;
        
        vec3 other_pos = particles_input[i].position;
        vec3 direction = position - other_pos;
        float distance = length(direction);
        
        if(distance < interaction_radius && distance > 0.01) {
            vec3 normalized_dir = normalize(direction);
            
            // Repulsion at close range
            if(distance < 2.0) {
                interaction_force += normalized_dir * (2.0 - distance) * 0.1;
            }
            // Weak attraction at medium range for clustering
            else if(distance < 4.0) {
                interaction_force -= normalized_dir * (distance - 2.0) * 0.02;
            }
        }
    }
    
    return interaction_force;
}

// Advanced physics integration using Verlet integration
void integrateParticlePhysics(inout QualiaParticle particle, vec3 total_force, float dt) {
    // Update acceleration based on forces and mass
    particle.acceleration = total_force / max(particle.mass, 0.1);
    
    // Verlet integration for more stable physics
    vec3 new_velocity = particle.velocity + particle.acceleration * dt;
    particle.position += new_velocity * dt;
    particle.velocity = new_velocity;
    
    // Apply damping based on chaos level
    float damping = 0.98 - chaos * 0.05;
    particle.velocity *= damping;
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

    // --- ADVANCED PHYSICS SIMULATION ---
    vec3 total_force = vec3(0.0);

    // Calculate force field effects using advanced physics
    total_force += calculateForceFieldEffect(particle.position, particle);

    // Calculate particle interactions for emergent behavior
    total_force += calculateParticleInteractions(particle.position, particle.velocity, int(index));

    // Apply enhanced velocity calculation from existing function
    particle.velocity = calculate_enhanced_velocity(particle.position, particle.velocity, particle.resonance);

    // Integrate physics using advanced method
    integrateParticlePhysics(particle, total_force, TIME_DELTA);

    // Apply space distortion during transcendence
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
