#version 330 core
out vec4 fragColor;
in vec2 uv;

uniform sampler2D sceneColor;
uniform sampler2D normalTexture;
uniform sampler2D depthTexture;
uniform sampler2D roughnessTexture;
uniform mat4 projection;
uniform mat4 invProjection;
uniform mat4 view;
uniform vec2 resolution;
uniform int maxSteps; // 64-128 típico
uniform float stride; // 1.0-2.0
uniform float maxDistance; // 50.0-100.0
uniform float thickness; // 0.1-0.5

vec3 getViewPosition(vec2 texCoord, float depth) {
    vec4 clipSpace = vec4(texCoord * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
    vec4 viewSpace = invProjection * clipSpace;
    return viewSpace.xyz / viewSpace.w;
}

vec3 getViewNormal(vec2 texCoord) {
    vec3 worldNormal = texture(normalTexture, texCoord).xyz * 2.0 - 1.0;
    return normalize((view * vec4(worldNormal, 0.0)).xyz);
}

bool traceRay(vec3 origin, vec3 direction, out vec2 hitUV, out float hitDepth) {
    vec3 rayPos = origin;
    float stepSize = stride / float(maxSteps);
    
    for (int i = 0; i < maxSteps; i++) {
        rayPos += direction * stepSize;
        
        // Proyectar a espacio de pantalla
        vec4 projPos = projection * vec4(rayPos, 1.0);
        projPos.xyz /= projPos.w;
        
        vec2 screenUV = projPos.xy * 0.5 + 0.5;
        
        // Bounds check
        if (any(lessThan(screenUV, vec2(0.0))) || any(greaterThan(screenUV, vec2(1.0)))) {
            return false;
        }
        
        float sampledDepth = texture(depthTexture, screenUV).r;
        vec3 sampledPos = getViewPosition(screenUV, sampledDepth);
        
        float delta = rayPos.z - sampledPos.z;
        
        if (delta > 0.0 && delta < thickness) {
            hitUV = screenUV;
            hitDepth = sampledDepth;
            return true;
        }
        
        if (rayPos.z > sampledPos.z + maxDistance) {
            return false;
        }
    }
    
    return false;
}

void main() {
    float depth = texture(depthTexture, uv).r;
    
    // Skip skybox
    if (depth >= 0.9999) {
        fragColor = vec4(0.0);
        return;
    }
    
    vec3 viewPos = getViewPosition(uv, depth);
    vec3 viewNormal = getViewNormal(uv);
    vec3 viewDir = normalize(viewPos);
    vec3 reflectDir = reflect(viewDir, viewNormal);
    
    float roughness = texture(roughnessTexture, uv).r;
    
    // Fade en base a roughness
    if (roughness > 0.7) {
        fragColor = vec4(0.0);
        return;
    }
    
    vec2 hitUV;
    float hitDepth;
    
    if (traceRay(viewPos, reflectDir, hitUV, hitDepth)) {
        vec3 reflectionColor = texture(sceneColor, hitUV).rgb;
        
        // Fade en bordes de pantalla
        vec2 screenFade = smoothstep(0.0, 0.1, hitUV) * smoothstep(1.0, 0.9, hitUV);
        float edgeFade = screenFade.x * screenFade.y;
        
        // Fade con roughness
        float roughnessFade = 1.0 - smoothstep(0.3, 0.7, roughness);
        
        float finalStrength = edgeFade * roughnessFade;
        
        fragColor = vec4(reflectionColor, finalStrength);
    } else {
        fragColor = vec4(0.0);
    }
}