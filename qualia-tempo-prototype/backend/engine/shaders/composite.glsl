#version 330 core
out vec4 fragColor;
in vec2 uv;
uniform sampler2D sceneTexture;
uniform sampler2D bloomTexture;
uniform float bloomStrength;

void main() {
    vec3 scene = texture(sceneTexture, uv).rgb;
    vec3 bloom = texture(bloomTexture, uv).rgb;
    
    // Additive blending with bloom strength control
    vec3 result = scene + bloom * bloomStrength;
    
    // Tone mapping to prevent oversaturation
    result = result / (result + vec3(1.0));
    
    fragColor = vec4(result, 1.0);
}