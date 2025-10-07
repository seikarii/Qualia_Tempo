// SDF Raymarching Player Avatar Shader
// Crystalline geometric forms driven by precision and flow

// Uniforms
uniform vec2 u_resolution;
uniform float u_time;
uniform vec3 u_player_shape_params; // x=precision, y=flow, z=complexity
uniform vec3 u_player_position;
uniform vec3 u_camera_position;
uniform vec3 u_base_color;
uniform float u_metallic;
uniform float u_roughness;
uniform float u_emissive_strength;

// Lighting uniforms
uniform vec3 u_ambient_color;
uniform float u_ambient_intensity;
uniform vec3 u_light_direction;
uniform vec3 u_light_color;
uniform float u_light_intensity;

// Raymarching parameters
uniform int u_max_steps;
uniform float u_max_distance;
uniform float u_epsilon;
uniform float u_step_multiplier;

// Fog parameters
uniform bool u_fog_enabled;
uniform vec3 u_fog_color;
uniform float u_fog_near;
uniform float u_fog_far;

varying vec2 vUv;

// ===== SDF Primitives =====

float sdSphere(vec3 p, float r) {
    return length(p) - r;
}

float sdBox(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float sdTorus(vec3 p, vec2 t) {
    vec2 q = vec2(length(p.xz) - t.x, p.y);
    return length(q) - t.y;
}

float sdOctahedron(vec3 p, float s) {
    p = abs(p);
    return (p.x + p.y + p.z - s) * 0.57735027;
}

// ===== SDF Operations =====

float smin(float a, float b, float k) {
    float h = max(k - abs(a - b), 0.0) / k;
    return min(a, b) - h * h * k * 0.25;
}

float smax(float a, float b, float k) {
    return -smin(-a, -b, k);
}

vec3 opRepeat(vec3 p, vec3 c) {
    return mod(p + 0.5 * c, c) - 0.5 * c;
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

// ===== Player SDF Scene =====

float mapPlayer(vec3 p) {
    // Extract shape parameters
    float precision = u_player_shape_params.x;
    float flow = u_player_shape_params.y;
    float complexity = u_player_shape_params.z;
    
    // Animate based on time and flow
    float pulse = sin(u_time * (1.0 + flow)) * 0.05 * (1.0 - precision);
    float rotation = u_time * 0.3;
    
    // Apply rotation
    p *= rotateY(rotation);
    
    // Core shape: blend between sphere (low precision) and octahedron (high precision)
    float sphere = sdSphere(p, 1.0 + pulse);
    float octa = sdOctahedron(p, 1.4 + pulse);
    float core = mix(sphere, octa, precision);
    
    // Add geometric details based on complexity
    if (complexity > 0.2) {
        // Add torus rings
        vec3 torusP = p;
        torusP *= rotateX(u_time * 0.2);
        float torus1 = sdTorus(torusP, vec2(1.2, 0.15));
        torusP *= rotateY(1.5708); // 90 degrees
        float torus2 = sdTorus(torusP, vec2(1.2, 0.15));
        
        float rings = min(torus1, torus2);
        core = smin(core, rings, 0.1 + (1.0 - precision) * 0.3);
    }
    
    // Add crystalline facets at high precision
    if (precision > 0.6 && complexity > 0.4) {
        vec3 facetP = p;
        facetP *= rotateY(u_time * 0.5);
        float facets = sdBox(facetP, vec3(0.8, 0.8, 0.8));
        core = smax(core, -facets, 0.05);
    }
    
    // Smooth blending based on flow
    float smoothness = 0.05 + flow * 0.2;
    
    return core;
}

// ===== Normal Calculation =====

vec3 calcNormal(vec3 p) {
    const float h = 0.001;
    const vec2 k = vec2(1, -1);
    return normalize(
        k.xyy * mapPlayer(p + k.xyy * h) +
        k.yyx * mapPlayer(p + k.yyx * h) +
        k.yxy * mapPlayer(p + k.yxy * h) +
        k.xxx * mapPlayer(p + k.xxx * h)
    );
}

// ===== Raymarching =====

float raymarch(vec3 ro, vec3 rd) {
    float t = 0.0;
    
    for (int i = 0; i < u_max_steps; i++) {
        vec3 p = ro + rd * t;
        float d = mapPlayer(p - u_player_position);
        
        if (d < u_epsilon) {
            return t;
        }
        
        if (t > u_max_distance) {
            return -1.0;
        }
        
        t += d * u_step_multiplier;
    }
    
    return -1.0;
}

// ===== Lighting =====

vec3 calculateLighting(vec3 p, vec3 n, vec3 viewDir) {
    // Ambient
    vec3 ambient = u_ambient_color * u_ambient_intensity;
    
    // Directional light
    vec3 lightDir = normalize(-u_light_direction);
    float diff = max(dot(n, lightDir), 0.0);
    vec3 diffuse = u_light_color * u_light_intensity * diff;
    
    // Specular (Blinn-Phong)
    vec3 halfDir = normalize(lightDir + viewDir);
    float spec = pow(max(dot(n, halfDir), 0.0), 32.0);
    vec3 specular = u_light_color * spec * (1.0 - u_roughness);
    
    // Combine
    vec3 lighting = ambient + diffuse + specular * u_metallic;
    
    // Apply material properties
    vec3 color = u_base_color * lighting;
    color += u_base_color * u_emissive_strength;
    
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
    float t = raymarch(ro, rd);
    
    vec3 color = vec3(0.0);
    
    if (t > 0.0) {
        // Hit
        vec3 p = ro + rd * t;
        vec3 n = calcNormal(p - u_player_position);
        vec3 viewDir = normalize(ro - p);
        
        // Lighting
        color = calculateLighting(p, n, viewDir);
        
        // Fog
        color = applyFog(color, t);
    } else {
        // Miss - transparent or background
        discard;
    }
    
    gl_FragColor = vec4(color, 1.0);
}
