// # Responsibility
// GPU reaction-diffusion simulation compute shader (Gray-Scott model).

// Storage textures
@group(0) @binding(0) var texture_in: texture_storage_2d<rg32float, read>;
@group(0) @binding(1) var texture_out: texture_storage_2d<rg32float, write>;

// Simulation parameters (TODO: add uniform buffer)
const DIFFUSION_A: f32 = 1.0;
const DIFFUSION_B: f32 = 0.5;
const FEED_RATE: f32 = 0.055;  // Classic "coral" pattern
const KILL_RATE: f32 = 0.062;
const TIMESTEP: f32 = 1.0;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let pos = vec2<i32>(global_id.xy);
    let dims = textureDimensions(texture_in);
    
    // Bounds check
    if (pos.x >= i32(dims.x) || pos.y >= i32(dims.y)) {
        return;
    }
    
    // TODO: Implement Gray-Scott reaction-diffusion
    // 1. Read current concentrations: (A, B) = textureLoad(texture_in, pos).rg
    // 2. Compute Laplacian (9-point stencil for diffusion):
    //    laplacian_A = (sum of 8 neighbors + center * -8) / cell_size²
    //    laplacian_B = (same for B)
    // 3. Apply Gray-Scott equations:
    //    dA/dt = DIFFUSION_A * laplacian_A - A*B² + FEED_RATE * (1 - A)
    //    dB/dt = DIFFUSION_B * laplacian_B + A*B² - (KILL_RATE + FEED_RATE) * B
    // 4. Update concentrations:
    //    new_A = A + dA/dt * TIMESTEP
    //    new_B = B + dB/dt * TIMESTEP
    // 5. Clamp to [0, 1]
    // 6. Write: textureStore(texture_out, pos, vec4<f32>(new_A, new_B, 0.0, 0.0))
    
    // Placeholder: copy unchanged
    let current = textureLoad(texture_in, pos);
    textureStore(texture_out, pos, current);
}
