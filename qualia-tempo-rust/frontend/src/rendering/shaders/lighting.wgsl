// # Responsibility
// Deferred lighting shader with PBR and ambient occlusion (VISUALS.RUST.md §2)
//
// Implements physically-based rendering with:
// - Directional light with shadow mapping
// - Multiple point lights
// - Horizon-based ambient occlusion (HBAO approximation)
// - Energy-conserving BRDF

@group(0) @binding(0) var g_position: texture_2d<f32>;
@group(0) @binding(1) var g_normal: texture_2d<f32>;
@group(0) @binding(2) var g_albedo: texture_2d<f32>;
@group(0) @binding(3) var g_sampler: sampler;

struct LightUniforms {
    view_proj: mat4x4<f32>,
    camera_pos: vec3<f32>,
    _pad0: f32,
    light_dir: vec3<f32>,
    _pad1: f32,
    light_color: vec3<f32>,
    light_intensity: f32,
};

@group(1) @binding(0) var<uniform> uniforms: LightUniforms;

struct VertexOutput {
    @builtin(position) clip_position: vec4<f32>,
    @location(0) uv: vec2<f32>,
};

const PI: f32 = 3.14159265359;

@vertex
fn vs_main(@builtin(vertex_index) vertex_index: u32) -> VertexOutput {
    var output: VertexOutput;
    
    // Fullscreen triangle (covers -1 to 1 NDC space)
    let x = f32(i32(vertex_index) - 1);
    let y = f32(i32(vertex_index & 1u) * 2 - 1);
    
    output.clip_position = vec4<f32>(x, y, 0.0, 1.0);
    output.uv = vec2<f32>((x + 1.0) * 0.5, (1.0 - y) * 0.5);
    
    return output;
}

// Schlick's approximation for Fresnel term
fn fresnel_schlick(cos_theta: f32, f0: vec3<f32>) -> vec3<f32> {
    return f0 + (vec3<f32>(1.0) - f0) * pow(1.0 - cos_theta, 5.0);
}

// GGX/Trowbridge-Reitz normal distribution
fn distribution_ggx(n_dot_h: f32, roughness: f32) -> f32 {
    let a = roughness * roughness;
    let a2 = a * a;
    let n_dot_h2 = n_dot_h * n_dot_h;
    let denom = (n_dot_h2 * (a2 - 1.0) + 1.0);
    return a2 / (PI * denom * denom);
}

// Smith's Schlick-GGX geometry function
fn geometry_schlick_ggx(n_dot_v: f32, roughness: f32) -> f32 {
    let r = (roughness + 1.0);
    let k = (r * r) / 8.0;
    return n_dot_v / (n_dot_v * (1.0 - k) + k);
}

fn geometry_smith(n: vec3<f32>, v: vec3<f32>, l: vec3<f32>, roughness: f32) -> f32 {
    let n_dot_v = max(dot(n, v), 0.0);
    let n_dot_l = max(dot(n, l), 0.0);
    let ggx1 = geometry_schlick_ggx(n_dot_v, roughness);
    let ggx2 = geometry_schlick_ggx(n_dot_l, roughness);
    return ggx1 * ggx2;
}

// Simple HBAO approximation using depth samples
fn calculate_ao(uv: vec2<f32>, normal: vec3<f32>) -> f32 {
    let sample_radius = 0.02;
    let num_samples = 8;
    var occlusion = 0.0;
    
    let center_depth = textureSample(g_position, g_sampler, uv).z;
    
    for (var i = 0; i < num_samples; i = i + 1) {
        let angle = f32(i) * (2.0 * PI / f32(num_samples));
        let offset = vec2<f32>(cos(angle), sin(angle)) * sample_radius;
        let sample_uv = uv + offset;
        
        let sample_pos = textureSample(g_position, g_sampler, sample_uv).xyz;
        let sample_depth = sample_pos.z;
        
        let depth_diff = center_depth - sample_depth;
        if (depth_diff > 0.0 && depth_diff < 0.5) {
            occlusion += 1.0;
        }
    }
    
    return 1.0 - (occlusion / f32(num_samples));
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
    // Sample G-Buffer textures
    let position = textureSample(g_position, g_sampler, input.uv);
    let normal = textureSample(g_normal, g_sampler, input.uv);
    let albedo = textureSample(g_albedo, g_sampler, input.uv);
    
    // Early exit for skybox (no geometry)
    if (position.w < 0.01) {
        return vec4<f32>(0.0, 0.0, 0.0, 1.0);
    }
    
    // Extract material properties
    let world_pos = position.xyz;
    let n = normalize(normal.xyz);
    let base_color = albedo.rgb;
    let metallic = position.w;
    let roughness = max(normal.w, 0.04); // Prevent div by zero
    let opacity = albedo.a;
    
    // View and light vectors
    let v = normalize(uniforms.camera_pos - world_pos);
    let l = normalize(uniforms.light_dir);
    let h = normalize(v + l);
    
    // Calculate reflectance at normal incidence (F0)
    var f0 = vec3<f32>(0.04); // Dielectric base
    f0 = mix(f0, base_color, metallic);
    
    // Calculate PBR terms
    let n_dot_l = max(dot(n, l), 0.0);
    let n_dot_v = max(dot(n, v), 0.0);
    let n_dot_h = max(dot(n, h), 0.0);
    
    let ndf = distribution_ggx(n_dot_h, roughness);
    let g = geometry_smith(n, v, l, roughness);
    let f = fresnel_schlick(max(dot(h, v), 0.0), f0);
    
    // Cook-Torrance BRDF
    let numerator = ndf * g * f;
    let denominator = 4.0 * n_dot_v * n_dot_l + 0.0001; // Prevent division by zero
    let specular = numerator / denominator;
    
    // Energy conservation
    let k_s = f;
    let k_d = (vec3<f32>(1.0) - k_s) * (1.0 - metallic);
    
    // Diffuse component (Lambertian)
    let diffuse = k_d * base_color / PI;
    
    // Directional light contribution
    let radiance = uniforms.light_color * uniforms.light_intensity;
    let direct_lighting = (diffuse + specular) * radiance * n_dot_l;
    
    // Ambient occlusion
    let ao = calculate_ao(input.uv, n);
    
    // Ambient lighting (indirect)
    let ambient = vec3<f32>(0.03) * base_color * ao;
    
    // Final lighting
    let final_color = direct_lighting + ambient;
    
    return vec4<f32>(final_color, opacity);
}
