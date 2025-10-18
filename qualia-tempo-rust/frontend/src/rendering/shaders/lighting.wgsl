// # Responsibility
// Deferred lighting shader (VISUALS.RUST.md §2)
//
// Reads G-Buffer textures and applies lighting calculations:
// - Directional light
// - Point lights
// - Ambient occlusion
// - Screen-space reflections (placeholder)

@group(0) @binding(0) var g_position: texture_2d<f32>;
@group(0) @binding(1) var g_normal: texture_2d<f32>;
@group(0) @binding(2) var g_albedo: texture_2d<f32>;
@group(0) @binding(3) var g_sampler: sampler;

struct VertexOutput {
    @builtin(position) clip_position: vec4<f32>,
    @location(0) uv: vec2<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) vertex_index: u32) -> VertexOutput {
    var output: VertexOutput;
    
    // Fullscreen triangle
    let x = f32(i32(vertex_index) - 1);
    let y = f32(i32(vertex_index & 1u) * 2 - 1);
    
    output.clip_position = vec4<f32>(x, y, 0.0, 1.0);
    output.uv = vec2<f32>((x + 1.0) * 0.5, (1.0 - y) * 0.5);
    
    return output;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
    // Sample G-Buffer textures
    let position = textureSample(g_position, g_sampler, input.uv);
    let normal = textureSample(g_normal, g_sampler, input.uv);
    let albedo = textureSample(g_albedo, g_sampler, input.uv);
    
    // Extract material properties
    let world_pos = position.xyz;
    let world_normal = normalize(normal.xyz);
    let base_color = albedo.rgb;
    let metallic = position.w;
    let roughness = normal.w;
    let opacity = albedo.a;
    
    // Phase 8: Basic directional lighting
    // Full PBR lighting (multiple lights, HBAO, SSR) in subsequent phases
    let light_dir = normalize(vec3<f32>(0.5, 0.8, 0.3));
    let light_color = vec3<f32>(1.0, 0.95, 0.9);
    let ambient = vec3<f32>(0.1, 0.1, 0.15);
    
    // Lambertian diffuse
    let n_dot_l = max(dot(world_normal, light_dir), 0.0);
    let diffuse = base_color * light_color * n_dot_l;
    
    // Combine lighting
    let final_color = diffuse + base_color * ambient;
    
    return vec4<f32>(final_color, opacity);
}
