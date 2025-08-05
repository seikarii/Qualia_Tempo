#version 430

// Workgroup size - optimize based on GPU architecture
layout(local_size_x = 64, local_size_y = 1, local_size_z = 1) in;

// Entity state structure
struct LivingEntity {
    vec3 position;
    float consciousness_level;
    vec3 velocity;
    float ontological_drift;
    float qualia_state_intensity;
    float qualia_state_precision;
    float qualia_state_aggression;
    float qualia_state_flow;
    float qualia_state_chaos;
    float qualia_state_recovery;
    float qualia_state_transcendence;
    float lifecycle_stage;
    float empathetic_resonance;
    float chaos_influence;
    uint entity_id;
    uint is_active; // 1 if active, 0 if dead/inactive
    float padding; // Align to 16-byte boundaries
};

// Particle structure
struct Particle {
    vec3 position;
    vec3 velocity;
    vec3 color;
    float lifetime;
    float max_lifetime;
    float size;
    uint type;
    uint active;
    vec2 padding;
};

// Lattice point structure
struct LatticePoint {
    vec3 position;
    float influence_strength;
    vec4 elemental_composition; // fire, earth, air, water
    vec4 metaphysical_state; // sephirot vs qliphoth influences
    float coherence_level;
    uint lattice_type; // 0=fire, 1=earth, 2=air, 3=water, 4=sephirot, 5=qliphoth
    vec2 padding;
};

// Input/Output buffers
layout(std430, binding = 0) restrict buffer EntityBuffer {
    LivingEntity entities[];
};

layout(std430, binding = 1) restrict buffer LatticeBuffer {
    LatticePoint lattices[];
};

layout(std430, binding = 3) restrict buffer ParticleBuffer {
    Particle particles[];
};

// Uniform parameters
layout(std430, binding = 2) restrict readonly buffer UniformBuffer {
    float delta_time;
    float reality_coherence;
    uint entity_count;
    uint lattice_count;
    uint particle_count;
    vec3 unified_field_center;
    float chaos_entropy_level;
    float time_dilation_factor;
    uint simulation_tick;
    float particle_multiplier;
};

uniform sampler2D particle_texture;

// Constants for ontological physics
const float CONSCIOUSNESS_DECAY_RATE = 0.98;
const float DRIFT_ACCUMULATION_RATE = 0.01;
const float EMPATHETIC_RANGE = 10.0;
const float LATTICE_INFLUENCE_RANGE = 5.0;
const float MAX_VELOCITY = 15.0;
const float QUALIA_RESONANCE_THRESHOLD = 0.7;

// Pseudo-random number generation for ontological chaos
uint hash(uint x) {
    x += (x << 10u);
    x ^= (x >> 6u);
    x += (x << 3u);
    x ^= (x >> 11u);
    x += (x << 15u);
    return x;
}

float random(uint seed) {
    return float(hash(seed)) / 4294967295.0;
}

// Calculate lattice influence on an entity
vec4 calculateLatticeInfluence(vec3 entity_pos, uint entity_id) {
    vec4 total_influence = vec4(0.0);
    
    for (uint i = 0; i < lattice_count; i++) {
        vec3 lattice_pos = lattices[i].position;
        float distance = length(entity_pos - lattice_pos);
        
        if (distance < LATTICE_INFLUENCE_RANGE) {
            float influence_factor = (LATTICE_INFLUENCE_RANGE - distance) / LATTICE_INFLUENCE_RANGE;
            influence_factor *= lattices[i].influence_strength;
            
            // Apply elemental influences
            if (lattices[i].lattice_type < 4) { // Elemental lattices
                total_influence += lattices[i].elemental_composition * influence_factor;
            } else if (lattices[i].lattice_type == 4) { // Sephirot (order)
                total_influence.w += influence_factor * 0.5; // Stabilizing influence
            } else { // Qliphoth (chaos)
                total_influence.xyz += vec3(influence_factor * chaos_entropy_level);
            }
        }
    }
    
    return total_influence;
}

// Calculate empathetic bonding between entities
float calculateEmpatheticResonance(uint entity_idx) {
    float total_resonance = 0.0;
    vec3 entity_pos = entities[entity_idx].position;
    float entity_qualia_intensity = entities[entity_idx].qualia_state_intensity;
    float entity_qualia_precision = entities[entity_idx].qualia_state_precision;
    float entity_qualia_aggression = entities[entity_idx].qualia_state_aggression;
    float entity_qualia_flow = entities[entity_idx].qualia_state_flow;
    float entity_qualia_chaos = entities[entity_idx].qualia_state_chaos;
    float entity_qualia_recovery = entities[entity_idx].qualia_state_recovery;
    float entity_qualia_transcendence = entities[entity_idx].qualia_state_transcendence;

    for (uint i = 0; i < entity_count; i++) {
        if (i == entity_idx || entities[i].is_active == 0) continue;
        
        vec3 other_pos = entities[i].position;
        float distance = length(entity_pos - other_pos);
        
        if (distance < EMPATHETIC_RANGE) {
            float other_qualia_intensity = entities[i].qualia_state_intensity;
            float other_qualia_precision = entities[i].qualia_state_precision;
            float other_qualia_aggression = entities[i].qualia_state_aggression;
            float other_qualia_flow = entities[i].qualia_state_flow;
            float other_qualia_chaos = entities[i].qualia_state_chaos;
            float other_qualia_recovery = entities[i].qualia_state_recovery;
            float other_qualia_transcendence = entities[i].qualia_state_transcendence;
            
            // Calculate qualia similarity based on all components
            float qualia_similarity = 1.0 -
                abs(entity_qualia_intensity - other_qualia_intensity) -
                abs(entity_qualia_precision - other_qualia_precision) -
                abs(entity_qualia_aggression - other_qualia_aggression) -
                abs(entity_qualia_flow - other_qualia_flow) -
                abs(entity_qualia_chaos - other_qualia_chaos) -
                abs(entity_qualia_recovery - other_qualia_recovery) -
                abs(entity_qualia_transcendence - other_qualia_transcendence);
            
            if (qualia_similarity > QUALIA_RESONANCE_THRESHOLD) {
                float proximity_factor = (EMPATHETIC_RANGE - distance) / EMPATHETIC_RANGE;
                total_resonance += qualia_similarity * proximity_factor;
            }
        }
    }
    
    return total_resonance;
}

// Update entity consciousness based on influences
void updateConsciousness(inout LivingEntity entity, vec4 lattice_influence, float empathetic_resonance) {
    // Consciousness naturally decays without stimulation
    entity.consciousness_level *= CONSCIOUSNESS_DECAY_RATE;
    
    // Lattice influences can enhance or diminish consciousness
    float consciousness_boost = dot(lattice_influence, vec4(0.25, 0.25, 0.25, 0.25));
    entity.consciousness_level += consciousness_boost * delta_time;
    
    // Empathetic connections enhance consciousness
    entity.consciousness_level += empathetic_resonance * 0.1 * delta_time;
    
    // Clamp consciousness levels
    entity.consciousness_level = clamp(entity.consciousness_level, 0.0, 2.0);
}

// Update ontological drift (the "madness" mechanic)
void updateOntologicalDrift(inout LivingEntity entity, vec4 lattice_influence) {
    // Chaos influences increase drift
    float chaos_factor = lattice_influence.x + lattice_influence.y + lattice_influence.z;
    entity.ontological_drift += chaos_factor * DRIFT_ACCUMULATION_RATE * delta_time;
    
    // High consciousness can resist drift
    float resistance = entity.consciousness_level * 0.5;
    entity.ontological_drift -= resistance * delta_time;
    
    // Random fluctuations
    uint seed = entity.entity_id + simulation_tick;
    float random_drift = (random(seed) - 0.5) * 0.01;
    entity.ontological_drift += random_drift;
    
    // Clamp drift
    entity.ontological_drift = clamp(entity.ontological_drift, 0.0, 1.0);
}

// Update qualia state based on experiences
void updateQualiaState(inout LivingEntity entity, vec4 lattice_influence, float empathetic_resonance) {
    // Lattice influences directly affect qualia
    entity.qualia_state_intensity += lattice_influence.x * delta_time * 0.1;
    entity.qualia_state_precision += lattice_influence.y * delta_time * 0.1;
    entity.qualia_state_aggression += lattice_influence.z * delta_time * 0.1;
    entity.qualia_state_flow += lattice_influence.w * delta_time * 0.1;
    
    // Empathetic resonance creates qualia harmonization
    if (empathetic_resonance > 0.5) {
        // Smooth out extreme qualia values when in resonance
        entity.qualia_state_intensity = mix(entity.qualia_state_intensity, 0.5, empathetic_resonance * 0.02 * delta_time);
        entity.qualia_state_precision = mix(entity.qualia_state_precision, 0.5, empathetic_resonance * 0.02 * delta_time);
        entity.qualia_state_aggression = mix(entity.qualia_state_aggression, 0.5, empathetic_resonance * 0.02 * delta_time);
        entity.qualia_state_flow = mix(entity.qualia_state_flow, 0.5, empathetic_resonance * 0.02 * delta_time);
        entity.qualia_state_chaos = mix(entity.qualia_state_chaos, 0.5, empathetic_resonance * 0.02 * delta_time);
        entity.qualia_state_recovery = mix(entity.qualia_state_recovery, 0.5, empathetic_resonance * 0.02 * delta_time);
        entity.qualia_state_transcendence = mix(entity.qualia_state_transcendence, 0.5, empathetic_resonance * 0.02 * delta_time);
    }
    
    // Ontological drift creates qualia instability
    if (entity.ontological_drift > 0.5) {
        uint seed = entity.entity_id + simulation_tick * 7;
        float random_shift_intensity = (random(seed) - 0.5) * entity.ontological_drift * 0.1;
        float random_shift_precision = (random(seed + 1) - 0.5) * entity.ontological_drift * 0.1;
        float random_shift_aggression = (random(seed + 2) - 0.5) * entity.ontological_drift * 0.1;
        float random_shift_flow = (random(seed + 3) - 0.5) * entity.ontological_drift * 0.1;
        float random_shift_chaos = (random(seed + 4) - 0.5) * entity.ontological_drift * 0.1;
        float random_shift_recovery = (random(seed + 5) - 0.5) * entity.ontological_drift * 0.1;
        float random_shift_transcendence = (random(seed + 6) - 0.5) * entity.ontological_drift * 0.1;

        entity.qualia_state_intensity += random_shift_intensity;
        entity.qualia_state_precision += random_shift_precision;
        entity.qualia_state_aggression += random_shift_aggression;
        entity.qualia_state_flow += random_shift_flow;
        entity.qualia_state_chaos += random_shift_chaos;
        entity.qualia_state_recovery += random_shift_recovery;
        entity.qualia_state_transcendence += random_shift_transcendence;
    }
    
    // Normalize and clamp qualia
    entity.qualia_state_intensity = clamp(entity.qualia_state_intensity, 0.0, 1.0);
    entity.qualia_state_precision = clamp(entity.qualia_state_precision, 0.0, 1.0);
    entity.qualia_state_aggression = clamp(entity.qualia_state_aggression, 0.0, 1.0);
    entity.qualia_state_flow = clamp(entity.qualia_state_flow, 0.0, 1.0);
    entity.qualia_state_chaos = clamp(entity.qualia_state_chaos, 0.0, 1.0);
    entity.qualia_state_recovery = clamp(entity.qualia_state_recovery, 0.0, 1.0);
    entity.qualia_state_transcendence = clamp(entity.qualia_state_transcendence, 0.0, 1.0);
}

// Update entity movement and velocity
void updateMovement(inout LivingEntity entity, vec4 lattice_influence, float empathetic_resonance) {
    vec3 acceleration = vec3(0.0);
    
    // Lattice influences create movement tendencies
    // Fire lattices create upward movement, earth downward, etc.
    if (length(lattice_influence.xyz) > 0.01) {
        vec3 lattice_force = vec3(
            lattice_influence.x * 2.0 - 1.0, // Fire: upward tendency
            lattice_influence.y * -1.0,      // Earth: downward tendency
            lattice_influence.z * 1.0        // Air: lateral movement
        );
        acceleration += lattice_force * 0.5;
    }
    
    // Consciousness affects movement intentionality
    acceleration *= entity.consciousness_level;
    
    // Ontological drift creates erratic movement
    if (entity.ontological_drift > 0.3) {
        uint seed = entity.entity_id + simulation_tick * 13;
        vec3 chaos_force = vec3(
            random(seed) - 0.5,
            random(seed + 1) - 0.5,
            random(seed + 2) - 0.5
        ) * entity.ontological_drift * 5.0;
        acceleration += chaos_force;
    }
    
    // Apply qualia state to movement (e.g., flow makes movement smoother, chaos makes it erratic)
    acceleration *= (1.0 + entity.qualia_state_flow * 0.5 - entity.qualia_state_chaos * 0.5);

    // Update velocity and position
    entity.velocity += acceleration * delta_time;
    entity.velocity = clamp(entity.velocity, vec3(-MAX_VELOCITY), vec3(MAX_VELOCITY));
    
    // Apply drag
    entity.velocity *= 0.95;
    
    // Update position
    entity.position += entity.velocity * delta_time * time_dilation_factor;
}

// Main compute shader function
void main() {
    uint entity_idx = gl_GlobalInvocationID.x;
    
    // Bounds check for entities
    if (entity_idx < entity_count) {
        // Skip inactive entities
        if (entities[entity_idx].is_active == 0) return;
        
        // Calculate influences
        vec4 lattice_influence = calculateLatticeInfluence(entities[entity_idx].position, entities[entity_idx].entity_id);
        float empathetic_resonance = calculateEmpatheticResonance(entity_idx);
        
        // Update entity state
        updateConsciousness(entities[entity_idx], lattice_influence, empathetic_resonance);
        updateOntologicalDrift(entities[entity_idx], lattice_influence);
        updateQualiaState(entities[entity_idx], lattice_influence, empathetic_resonance);
        updateMovement(entities[entity_idx], lattice_influence, empathetic_resonance);
        
        // Store empathetic resonance for use by other systems
        entities[entity_idx].empathetic_resonance = empathetic_resonance;
        
        // Update lifecycle stage based on consciousness and drift
        if (entities[entity_idx].consciousness_level < 0.1 && entities[entity_idx].ontological_drift > 0.8) {
            // Entity approaches death/transcendence
            entities[entity_idx].lifecycle_stage += delta_time * 0.1;
            if (entities[entity_idx].lifecycle_stage > 1.0) {
                entities[entity_idx].is_active = 0; // Mark for cleanup/transformation
            }
        } else if (entities[entity_idx].consciousness_level > 1.5 && empathetic_resonance > 1.0) {
            // Entity approaches transcendence through love/connection
            entities[entity_idx].lifecycle_stage += delta_time * 0.05;
        }
    }

    // Particle simulation
    uint particle_idx = gl_GlobalInvocationID.x;
    if (particle_idx < particle_count) {
        if (particles[particle_idx].active == 0) return;

        // Update position based on velocity, influenced by particle_multiplier
        particles[particle_idx].position += particles[particle_idx].velocity * delta_time * particle_multiplier;

        // Decrease lifetime
        particles[particle_idx].lifetime -= delta_time;

        // Deactivate if lifetime runs out
        if (particles[particle_idx].lifetime <= 0.0) {
            particles[particle_idx].active = 0;
        }

        // Example: particle color and size influenced by qualia state
        if (particles[particle_idx].type == 0u) { // Aura particles
            particles[particle_idx].color = vec3(qualia_state_aggression, qualia_state_flow, qualia_state_precision);
            particles[particle_idx].size = 5.0 + qualia_state_intensity * 10.0;
        }
    }
}
