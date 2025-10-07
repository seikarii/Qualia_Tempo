// Mandelbulb Fractal Shader
// 3D fractal for transcendence state

// Uniforms
uniform vec2 u_resolution;
uniform float u_time;
uniform int u_fractal_iter; // Number of iterations (4-12)
uniform float u_fractal_power; // Mandelbulb power (typically 8.0)
uniform float u_bailout_radius;
uniform vec3 u_player_position;
uniform vec3 u_camera_position;

// Material
uniform vec3 u_base_color;
uniform float u_metallic;
uniform float u_roughness;
uniform float u_emissive_strength;

// Glow
uniform bool u_glow_enabled;
uniform float u_glow_strength;
uniform vec3 u_glow_color;

// Lighting
uniform vec3 u_ambient_color;
uniform float u_ambient_intensity;
uniform vec3 u_light_direction;
uniform vec3 u_light_color;
uniform float u_light_intensity;

// Raymarching
uniform int u_max_steps;
uniform float u_max_distance;
uniform float u_epsilon;
uniform float u_step_multiplier;

// Fog
uniform bool u_fog_enabled;
uniform vec3 u_fog_color;
uniform float u_fog_near;
uniform float u_fog_far;

varying vec2 vUv;

// ===== Mandelbulb Distance Estimator =====

float mandelbulbDE(vec3 pos) {
    vec3 z = pos;
    float dr = 1.0;
    float r = 0.0;
    float power = u_fractal_power;
    
    for (int i = 0; i < u_fractal_iter; i++) {
        r = length(z);
        
        // Bailout condition
        if (r > u_bailout_radius) break;
        
        // Convert to polar coordinates
        float theta = acos(z.z / r);
        float phi = atan(z.y, z.x);
        dr = pow(r, power - 1.0) * power * dr + 1.0;
        
        // Scale and rotate the point
        float zr = pow(r, power);
        theta = theta * power;
        phi = phi * power;
        
        // Convert back to cartesian coordinates
        z = zr * vec3(
            sin(theta) * cos(phi),
            sin(phi) * sin(theta),
            cos(theta)
        );
        z += pos;
    }
    
    return 0.5 * log(r) * r / dr;
}

// ===== Rotation Matrices =====

mat3 rotateY(float theta) {
    float c = cos(theta);
    float s = sin(theta);
    return mat3(
        c, 0, s,
        0, 1, 0,
        -s, 0, c
    );
}

mat3 rotateX(float theta) {
    float c = cos(theta);
    float s = sin(theta);
    return mat3(
        1, 0, 0,
        0, c, -s,
        0, s, c
    );
}

// ===== Scene Mapping =====

float map(vec3 p) {
    // Apply rotation animation
    p *= rotateY(u_time * 0.1);
    p *= rotateX(u_time * 0.07);
    
    // Center on player position
    p -= u_player_position;
    
    return mandelbulbDE(p);
}

// ===== Normal Calculation =====

vec3 calcNormal(vec3 p) {
    const float h = 0.0001;
    const vec2 k = vec2(1, -1);
    return normalize(
        k.xyy * map(p + k.xyy * h) +
        k.yyx * map(p + k.yyx * h) +
        k.yxy * map(p + k.yxy * h) +
        k.xxx * map(p + k.xxx * h)
    );
}

// ===== Raymarching =====

struct RaymarchResult {
    float t;
    int steps;
};

RaymarchResult raymarch(vec3 ro, vec3 rd) {
    float t = 0.0;
    int steps = 0;
    
    for (int i = 0; i < u_max_steps; i++) {
        vec3 p = ro + rd * t;
        float d = map(p);
        
        steps = i;
        
        if (d < u_epsilon) {
            return RaymarchResult(t, steps);
        }
        
        if (t > u_max_distance) {
            return RaymarchResult(-1.0, steps);
        }
        
        t += d * u_step_multiplier;
    }
    
    return RaymarchResult(-1.0, steps);
}

// ===== Lighting =====

vec3 calculateLighting(vec3 p, vec3 n, vec3 viewDir, int steps) {
    // Ambient
    vec3 ambient = u_ambient_color * u_ambient_intensity;
    
    // Directional light
    vec3 lightDir = normalize(-u_light_direction);
    float diff = max(dot(n, lightDir), 0.0);
    vec3 diffuse = u_light_color * u_light_intensity * diff;
    
    // Specular (Blinn-Phong with high shininess)
    vec3 halfDir = normalize(lightDir + viewDir);
    float spec = pow(max(dot(n, halfDir), 0.0), 64.0);
    vec3 specular = u_light_color * spec * (1.0 - u_roughness);
    
    // Rim lighting for transcendence feel
    float rim = 1.0 - max(dot(viewDir, n), 0.0);
    rim = pow(rim, 3.0);
    vec3 rimLight = u_base_color * rim * 0.5;
    
    // Combine
    vec3 lighting = ambient + diffuse + specular * u_metallic + rimLight;
    
    // Apply material
    vec3 color = u_base_color * lighting;
    color += u_base_color * u_emissive_strength;
    
    // Depth-based coloring (gradient effect)
    float depthGradient = float(steps) / float(u_max_steps);
    vec3 depthColor = mix(vec3(1.0, 0.95, 0.7), vec3(1.0, 0.8, 0.5), depthGradient);
    color *= depthColor;
    
    // Add glow
    if (u_glow_enabled) {
        float glowIntensity = pow(1.0 - depthGradient, 2.0);
        color += u_glow_color * u_glow_strength * glowIntensity;
    }
    
    return color;
}

// ===== Fog =====

vec3 applyFog(vec3 color, float dist) {
    if (!u_fog_enabled) return color;
    
    float fogAmount = smoothstep(u_fog_near, u_fog_far, dist);
    return mix(color, u_fog_color, fogAmount);
}

// ===== Main =====

void main() {
    // Ray setup
    vec2 uv = (vUv - 0.5) * 2.0;
    uv.x *= u_resolution.x / u_resolution.y;
    
    vec3 ro = u_camera_position;
    vec3 rd = normalize(vec3(uv, -2.0));
    
    // Raymarch
    RaymarchResult result = raymarch(ro, rd);
    
    vec3 color = vec3(0.0);
    
    if (result.t > 0.0) {
        // Hit
        vec3 p = ro + rd * result.t;
        vec3 n = calcNormal(p);
        vec3 viewDir = normalize(ro - p);
        
        // Lighting
        color = calculateLighting(p, n, viewDir, result.steps);
        
        // Fog
        color = applyFog(color, result.t);
        
        // Additional glow around the fractal
        if (u_glow_enabled) {
            float dist = length(p - u_player_position);
            float outerGlow = exp(-dist * 0.5) * u_glow_strength * 0.3;
            color += u_glow_color * outerGlow;
        }
    } else {
        // Miss - transparent or background
        discard;
    }
    
    // Tone mapping for bright fractals
    color = color / (color + vec3(1.0));
    color = pow(color, vec3(1.0 / 2.2)); // Gamma correction
    
    gl_FragColor = vec4(color, 1.0);
}
