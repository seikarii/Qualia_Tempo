#version 430

// Workgroup size - optimize based on GPU architecture
layout(local_size_x = 64, local_size_y = 1, local_size_z = 1) in;

// Entity state structure
struct LivingEntity {
    vec3 position;
    float consciousness_level;
    vec3 velocity;
    float ontological_drift;
    vec4 qualia_state; // x=emotional_valence (mapped from -1 to 1 in Python), y=arousal, z=cognitive_complexity, w=consciousness_density
    float lifecycle_stage;
    float empathetic_resonance;
    float chaos_influence;
    uint entity_id;
    uint is_active; // 1 if active, 0 if dead/inactive
    vec2 padding; // Align to 16-byte boundaries
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

// Uniform parameters
layout(std430, binding = 2) restrict readonly buffer UniformBuffer {
    float delta_time;
    float reality_coherence;
    uint entity_count;
    uint lattice_count;
    vec3 unified_field_center;
    float chaos_entropy_level;
    float time_dilation_factor;
    uint simulation_tick;
};

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
    vec4 entity_qualia = entities[entity_idx].qualia_state;
    
    for (uint i = 0; i < entity_count; i++) {
        if (i == entity_idx || entities[i].is_active == 0) continue;
        
        vec3 other_pos = entities[i].position;
        float distance = length(entity_pos - other_pos);
        
        if (distance < EMPATHETIC_RANGE) {
            vec4 other_qualia = entities[i].qualia_state;
            
            // Calculate qualia similarity (dot product normalized)
            float qualia_similarity = dot(normalize(entity_qualia), normalize(other_qualia));
            
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
    entity.qualia_state += lattice_influence * delta_time * 0.1;
    
    // Empathetic resonance creates qualia harmonization
    if (empathetic_resonance > 0.5) {
        // Smooth out extreme qualia values when in resonance
        entity.qualia_state = mix(entity.qualia_state, vec4(0.5), empathetic_resonance * 0.02 * delta_time);
    }
    
    // Ontological drift creates qualia instability
    if (entity.ontological_drift > 0.5) {
        uint seed = entity.entity_id + simulation_tick * 7;
        vec4 random_shift = vec4(
            random(seed) - 0.5,
            random(seed + 1) - 0.5,
            random(seed + 2) - 0.5,
            random(seed + 3) - 0.5
        ) * entity.ontological_drift * 0.1;
        entity.qualia_state += random_shift;
    }
    
    // Normalize and clamp qualia
    entity.qualia_state = clamp(entity.qualia_state, vec4(0.0), vec4(1.0));
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
    
    // Bounds check
    if (entity_idx >= entity_count) return;
    
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
