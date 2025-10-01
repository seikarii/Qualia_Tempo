#version 330 core

// QUALIA.CODE v1.2 - Temporal Anti-Aliasing (TAA)
// High-quality temporal supersampling with conservative sharpening

out vec4 fragColor;
in vec2 uv;

uniform sampler2D currentFrame;     // Current frame jittered sample
uniform sampler2D historyFrame;     // Previous frame accumulation
uniform sampler2D velocityTexture;  // Motion vectors (RG: velocity XY)
uniform sampler2D depthTexture;     // Depth buffer for disocclusion
uniform vec2 resolution;
uniform float historyBlend;         // Temporal blend factor (0.9-0.95 typical)
uniform float sharpness;            // Sharpening strength (0.0-1.0)
uniform bool useYCoCg;              // YCoCg color space for better quality

// Convert RGB to YCoCg for better temporal stability
vec3 RGBtoYCoCg(vec3 rgb) {
    float Y  = dot(rgb, vec3(0.25, 0.5, 0.25));
    float Co = dot(rgb, vec3(0.5, 0.0, -0.5));
    float Cg = dot(rgb, vec3(-0.25, 0.5, -0.25));
    return vec3(Y, Co, Cg);
}

vec3 YCoCgtoRGB(vec3 yCoCg) {
    float Y  = yCoCg.x;
    float Co = yCoCg.y;
    float Cg = yCoCg.z;
    float tmp = Y - Cg;
    float r = tmp + Co;
    float g = Y + Cg;
    float b = tmp - Co;
    return vec3(r, g, b);
}

// Catmull-Rom bicubic filtering for history sample
vec3 sampleHistoryCatmullRom(sampler2D tex, vec2 coords) {
    vec2 position = coords * resolution;
    vec2 centerPosition = floor(position - 0.5) + 0.5;
    vec2 f = position - centerPosition;
    vec2 f2 = f * f;
    vec2 f3 = f2 * f;
    
    vec2 w0 = f2 - 0.5 * (f3 + f);
    vec2 w1 = 1.5 * f3 - 2.5 * f2 + 1.0;
    vec2 w3 = 0.5 * (f3 - f2);
    vec2 w2 = 1.0 - w0 - w1 - w3;
    
    vec2 s0 = w0 + w1;
    vec2 s1 = w2 + w3;
    vec2 f0 = w1 / s0;
    vec2 f1 = w3 / s1;
    
    vec2 t0 = (centerPosition - 1.0 + f0) / resolution;
    vec2 t1 = (centerPosition + 1.0 + f1) / resolution;
    
    vec3 result = texture(tex, vec2(t0.x, t0.y)).rgb * s0.x * s0.y;
    result += texture(tex, vec2(t1.x, t0.y)).rgb * s1.x * s0.y;
    result += texture(tex, vec2(t0.x, t1.y)).rgb * s0.x * s1.y;
    result += texture(tex, vec2(t1.x, t1.y)).rgb * s1.x * s1.y;
    
    return result;
}

// 3x3 neighborhood clipping (variance clipping) for ghosting reduction
vec3 clipAABB(vec3 history, vec3 current, vec3 minimum, vec3 maximum) {
    vec3 center = 0.5 * (maximum + minimum);
    vec3 halfSize = 0.5 * (maximum - minimum);
    
    vec3 clip = history - center;
    vec3 unit = clip / halfSize;
    vec3 absUnit = abs(unit);
    float maxUnit = max(absUnit.x, max(absUnit.y, absUnit.z));
    
    if (maxUnit > 1.0) {
        return center + clip / maxUnit;
    }
    return history;
}

// Conservative sharpening (local contrast enhancement)
vec3 sharpen(sampler2D tex, vec2 coords, float strength) {
    vec3 center = texture(tex, coords).rgb;
    vec3 sum = vec3(0.0);
    
    vec2 pixelSize = 1.0 / resolution;
    sum += texture(tex, coords + vec2(-pixelSize.x, 0.0)).rgb;
    sum += texture(tex, coords + vec2(pixelSize.x, 0.0)).rgb;
    sum += texture(tex, coords + vec2(0.0, -pixelSize.y)).rgb;
    sum += texture(tex, coords + vec2(0.0, pixelSize.y)).rgb;
    
    vec3 average = sum * 0.25;
    vec3 sharpened = center + (center - average) * strength;
    
    return max(vec3(0.0), sharpened);
}

void main() {
    vec2 velocity = texture(velocityTexture, uv).rg;
    vec2 historyUV = uv - velocity;
    
    // Check if history sample is valid (within screen bounds)
    bool validHistory = all(greaterThanEqual(historyUV, vec2(0.0))) && 
                       all(lessThanEqual(historyUV, vec2(1.0)));
    
    // Sample current frame
    vec3 current = texture(currentFrame, uv).rgb;
    
    if (!validHistory) {
        // No valid history, use current frame with sharpening
        fragColor = vec4(sharpen(currentFrame, uv, sharpness), 1.0);
        return;
    }
    
    // Sample history with high-quality filtering
    vec3 history = sampleHistoryCatmullRom(historyFrame, historyUV);
    
    // Convert to YCoCg if enabled (better temporal stability)
    if (useYCoCg) {
        current = RGBtoYCoCg(current);
        history = RGBtoYCoCg(history);
    }
    
    // 3x3 neighborhood for variance clipping
    vec2 pixelSize = 1.0 / resolution;
    vec3 colorMin = current;
    vec3 colorMax = current;
    vec3 m1 = vec3(0.0);
    vec3 m2 = vec3(0.0);
    
    for (int x = -1; x <= 1; x++) {
        for (int y = -1; y <= 1; y++) {
            vec2 offset = vec2(float(x), float(y)) * pixelSize;
            vec3 neighbor = texture(currentFrame, uv + offset).rgb;
            
            if (useYCoCg) {
                neighbor = RGBtoYCoCg(neighbor);
            }
            
            colorMin = min(colorMin, neighbor);
            colorMax = max(colorMax, neighbor);
            m1 += neighbor;
            m2 += neighbor * neighbor;
        }
    }
    
    // Variance-based clipping
    m1 /= 9.0;
    m2 /= 9.0;
    vec3 variance = sqrt(max(vec3(0.0), m2 - m1 * m1));
    vec3 boxMin = m1 - 1.25 * variance;
    vec3 boxMax = m1 + 1.25 * variance;
    
    history = clipAABB(history, current, boxMin, boxMax);
    
    // Adaptive blend based on velocity magnitude
    float velocityMag = length(velocity * resolution);
    float adaptiveBlend = mix(historyBlend, 0.5, clamp(velocityMag / 50.0, 0.0, 1.0));
    
    // Temporal accumulation
    vec3 result = mix(current, history, adaptiveBlend);
    
    // Convert back from YCoCg
    if (useYCoCg) {
        result = YCoCgtoRGB(result);
    }
    
    // Apply conservative sharpening
    vec3 final = result + (result - texture(currentFrame, uv).rgb) * sharpness * 0.5;
    
    fragColor = vec4(clamp(final, 0.0, 1.0), 1.0);
}