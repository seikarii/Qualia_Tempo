// SDF Raymarching Boss Avatar Shader
// Organic distorted forms driven by chaos and aggression

// Uniforms
uniform vec2 u_resolution;
uniform float u_time;
uniform vec3 u_boss_shape_params; // x=chaos, y=aggression, z=distortion
uniform vec3 u_boss_position;
uniform vec3 u_camera_position;
uniform vec3 u_base_color;
uniform float u_metallic;
uniform float u_roughness;
uniform float u_emissive_strength;

// Distortion parameters
uniform float u_distortion_frequency;
uniform float u_distortion_amplitude;
uniform int u_distortion_octaves;

// Lighting uniforms
uniform vec3 u_ambient_color;
uniform float u_ambient_intensity;
uniform vec3 u_light_direction;
uniform vec3 u_light_color;
uniform float u_light_intensity;
uniform float u_subsurface;

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

// ===== Noise Functions =====

float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise(vec3 x) {
    vec3 p = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    
    return mix(
        mix(
            mix(hash(p + vec3(0, 0, 0)), hash(p + vec3(1, 0, 0)), f.x),
            mix(hash(p + vec3(0, 1, 0)), hash(p + vec3(1, 1, 0)), f.x),
            f.y
        ),
        mix(
            mix(hash(p + vec3(0, 0, 1)), hash(p + vec3(1, 0, 1)), f.x),
            mix(hash(p + vec3(0, 1, 1)), hash(p + vec3(1, 1, 1)), f.x),
            f.y
        ),
        f.z
    );
}

float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    
    for (int i = 0; i < u_distortion_octaves; i++) {
        value += amplitude * noise(p * frequency);
        frequency *= 2.0;
        amplitude *= 0.5;
    }
    
    return value;
}

// ===== SDF Primitives =====

float sdSphere(vec3 p, float r) {
    return length(p) - r;
}

float sdEllipsoid(vec3 p, vec3 r) {
    float k0 = length(p / r);
    float k1 = length(p / (r * r));
    return k0 * (k0 - 1.0) / k1;
}

float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
    vec3 pa = p - a;
    vec3 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h) - r;
}

// ===== SDF Operations =====

float smin(float a, float b, float k) {
    float h = max(k - abs(a - b), 0.0) / k;
    return min(a, b) - h * h * k * 0.25;
}

vec3 opTwist(vec3 p, float k) {
    float c = cos(k * p.y);
    float s = sin(k * p.y);
    mat2 m = mat2(c, -s, s, c);
    return vec3(m * p.xz, p.y);
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

mat3 rotateZ(float theta) {
    float c = cos(theta);
    float s = sin(theta);
    return mat3(
        c, -s, 0,
        s, c, 0,
        0, 0, 1
    );
}

// ===== Domain Warping =====

vec3 domainWarp(vec3 p, float amount) {
    float n1 = fbm(p * u_distortion_frequency + u_time * 0.3);
    float n2 = fbm(p * u_distortion_frequency * 1.5 + u_time * 0.4);
    float n3 = fbm(p * u_distortion_frequency * 2.0 + u_time * 0.5);
    
    return p + vec3(n1, n2, n3) * amount * u_distortion_amplitude;
}

// ===== Boss SDF Scene =====

float mapBoss(vec3 p) {
    // Extract shape parameters
    float chaos = u_boss_shape_params.x;
    float aggression = u_boss_shape_params.y;
    float distortion = u_boss_shape_params.z;
    
    // Apply domain warping based on chaos
    vec3 warpedP = domainWarp(p, chaos * distortion);
    
    // Animate writhing motion
    float writheTime = u_time * (0.5 + aggression * 0.5);
    vec3 twistedP = opTwist(warpedP, sin(writheTime) * chaos * 0.5);
    
    // Core body: ellipsoid that becomes more distorted with chaos
    vec3 bodyRadii = vec3(1.2, 1.5 + chaos * 0.5, 1.2);
    float body = sdEllipsoid(twistedP, bodyRadii);
    
    // Add tendrils/limbs based on aggression
    if (aggression > 0.3) {
        vec3 tendrilP = warpedP;
        tendrilP *= rotateY(writheTime);
        
        for (int i = 0; i < 4; i++) {
            float angle = float(i) * 1.5708; // 90 degrees
            vec3 offset = vec3(cos(angle), 0.0, sin(angle)) * 1.5;
            vec3 tendrilDir = vec3(cos(angle), 0.5, sin(angle)) * 2.0;
            
            float tendril = sdCapsule(tendrilP, offset, offset + tendrilDir, 0.2 * (1.0 - chaos * 0.3));
            body = smin(body, tendril, 0.3);
        }
    }
    
    // Add chaotic protrusions
    if (chaos > 0.5) {
        float protrusions = fbm(warpedP * 3.0 + u_time * 0.8) * 0.3;
        body -= protrusions * chaos;
    }
    
    // Pulsing effect based on aggression
    float pulse = sin(u_time * (2.0 + aggression * 2.0)) * 0.1 * aggression;
    body += pulse;
    
    return body;
}

// ===== Normal Calculation =====

vec3 calcNormal(vec3 p) {
    const float h = 0.001;
    const vec2 k = vec2(1, -1);
    return normalize(
        k.xyy * mapBoss(p + k.xyy * h) +
        k.yyx * mapBoss(p + k.yyx * h) +
        k.yxy * mapBoss(p + k.yxy * h) +
        k.xxx * mapBoss(p + k.xxx * h)
    );
}

// ===== Raymarching =====

float raymarch(vec3 ro, vec3 rd) {
    float t = 0.0;
    
    for (int i = 0; i < u_max_steps; i++) {
        vec3 p = ro + rd * t;
        float d = mapBoss(p - u_boss_position);
        
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
    
    // Subsurface scattering approximation
    float backLight = max(0.0, dot(-n, lightDir));
    vec3 subsurface = u_light_color * backLight * u_subsurface;
    
    // Specular (Blinn-Phong) - reduced for organic feel
    vec3 halfDir = normalize(lightDir + viewDir);
    float spec = pow(max(dot(n, halfDir), 0.0), 16.0);
    vec3 specular = u_light_color * spec * (1.0 - u_roughness) * 0.5;
    
    // Combine
    vec3 lighting = ambient + diffuse + subsurface + specular * u_metallic;
    
    // Apply material properties
    vec3 color = u_base_color * lighting;
    color += u_base_color * u_emissive_strength;
    
    // Add organic pulsing glow
    float pulse = sin(u_time * 2.0) * 0.5 + 0.5;
    color += u_base_color * pulse * 0.2 * u_boss_shape_params.y; // aggression-based glow
    
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
        vec3 n = calcNormal(p - u_boss_position);
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
