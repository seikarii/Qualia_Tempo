#version 330 core
out vec4 fragColor;
in vec2 uv;

uniform sampler2D depthTexture;
uniform sampler2D normalTexture;
uniform sampler2D noiseTexture;
uniform mat4 projection;
uniform mat4 invProjection;
uniform vec2 resolution;
uniform float radius; // 0.5-2.0 en view space
uniform float bias; // 0.01-0.05
uniform int numDirections; // 6-8
uniform int numSteps; // 4-6

const float PI = 3.14159265359;

vec3 getViewPosition(vec2 texCoord, float depth) {
    vec4 clipSpace = vec4(texCoord * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
    vec4 viewSpace = invProjection * clipSpace;
    return viewSpace.xyz / viewSpace.w;
}

float tangent(vec3 p, vec3 s) {
    return (s.z - p.z) / length(s.xy - p.xy);
}

void main() {
    float depth = texture(depthTexture, uv).r;
    
    if (depth >= 0.9999) {
        fragColor = vec4(1.0);
        return;
    }
    
    vec3 viewPos = getViewPosition(uv, depth);
    vec3 viewNormal = normalize(texture(normalTexture, uv).xyz * 2.0 - 1.0);
    
    // Noise para rotar direcciones
    vec2 noise = texture(noiseTexture, uv * resolution / 4.0).xy * 2.0 - 1.0;
    float randomAngle = noise.x * 2.0 * PI;
    
    float occlusion = 0.0;
    float angleStep = (2.0 * PI) / float(numDirections);
    
    for (int d = 0; d < numDirections; d++) {
        float angle = angleStep * float(d) + randomAngle;
        vec2 direction = vec2(cos(angle), sin(angle));
        
        float maxHorizon = -1.0;
        
        for (int s = 1; s <= numSteps; s++) {
            vec2 offset = direction * (float(s) / float(numSteps)) * radius;
            vec2 sampleUV = uv + offset / resolution;
            
            float sampleDepth = texture(depthTexture, sampleUV).r;
            vec3 samplePos = getViewPosition(sampleUV, sampleDepth);
            
            float horizon = tangent(viewPos, samplePos);
            maxHorizon = max(maxHorizon, horizon);
        }
        
        float nx = dot(direction, viewNormal.xy);
        float ny = viewNormal.z;
        float horizonAngle = atan(maxHorizon);
        float normalAngle = asin(ny);
        
        occlusion += clamp((sin(horizonAngle) - sin(normalAngle - bias)), 0.0, 1.0);
    }
    
    occlusion = 1.0 - (occlusion / float(numDirections));
    
    fragColor = vec4(vec3(occlusion), 1.0);
}