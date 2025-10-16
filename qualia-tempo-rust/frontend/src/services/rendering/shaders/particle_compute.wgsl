// # Responsibility
// GPU particle simulation compute shader.

// Particle structure matching ParticleGPU in Rust
struct Particle {
    position: vec4<f32>,    // (x, y, z, _)
    velocity: vec4<f32>,    // (vx, vy, vz, _)
    lifetime: vec4<f32>,    // (current, max, _, _)
    color: vec4<f32>,       // (r, g, b, a)
};

// Storage buffers
@group(0) @binding(0) var<storage, read> particles_in: array<Particle>;
@group(0) @binding(1) var<storage, read_write> particles_out: array<Particle>;

// Simulation parameters (TODO: add uniform buffer)
const TIMESTEP: f32 = 0.016; // ~60 FPS
const GRAVITY: vec3<f32> = vec3<f32>(0.0, -9.8, 0.0);
const DAMPING: f32 = 0.98;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let index = global_id.x;
    
    // TODO: Implement particle physics
    // 1. Read particle from particles_in[index]
    // 2. Update lifetime: current += TIMESTEP
    // 3. If lifetime.current > lifetime.max, reset particle (respawn at origin)
    // 4. Apply gravity: velocity += GRAVITY * TIMESTEP
    // 5. Apply damping: velocity *= DAMPING
    // 6. Update position: position += velocity * TIMESTEP
    // 7. (Optional) Check collisions with other particles
    // 8. Write updated particle to particles_out[index]
    
    // Placeholder: copy particle unchanged
    if (index < arrayLength(&particles_in)) {
        particles_out[index] = particles_in[index];
    }
}
