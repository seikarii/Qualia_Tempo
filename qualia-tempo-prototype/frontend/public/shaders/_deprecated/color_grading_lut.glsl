#version 330 core
out vec4 fragColor;
in vec2 uv;

uniform sampler2D inputTexture;
uniform sampler3D colorLUT; // 32x32x32 LUT típica
uniform float lutStrength; // 0.0-1.0 para blend con original

vec3 applyLUT(sampler3D lut, vec3 color) {
    // Escala para evitar edge bleeding en la LUT
    vec3 scale = vec3((32.0 - 1.0) / 32.0);
    vec3 offset = vec3(1.0 / (2.0 * 32.0));
    
    return texture(lut, color * scale + offset).rgb;
}

void main() {
    vec3 color = texture(inputTexture, uv).rgb;
    vec3 graded = applyLUT(colorLUT, color);
    
    // Blend con original según strength
    vec3 result = mix(color, graded, lutStrength);
    
    fragColor = vec4(result, 1.0);
}