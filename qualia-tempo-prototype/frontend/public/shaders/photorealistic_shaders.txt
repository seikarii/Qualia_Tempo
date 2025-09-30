// ============================================================================
// QUALIA.CODE v2.0 - Pipeline Post-Procesado Fotorealista/Futurista
// ============================================================================
// Orden de renderizado recomendado:
// 1. SSR/Reflections → 2. AO → 3. TAA → 4. Bloom → 5. DoF → 6. Motion Blur
// 7. Tone Mapping (ACES) → 8. Color Grading (LUT) → 9. Sharpening Final

// ============================================================================
// SHADER 1: ACES TONE MAPPING + EXPOSURE AUTOMÁTICA
// ============================================================================
#version 330 core
out vec4 fragColor;
in vec2 uv;

uniform sampler2D hdrBuffer;
uniform sampler2D luminanceTexture; // Mipmap chain para auto-exposure
uniform float manualExposure;
uniform bool useAutoExposure;
uniform float exposureSpeed; // 0.05 típico para adaptación suave
uniform float minExposure;
uniform float maxExposure;

// Matriz ACES Input Transform (sRGB primaries)
const mat3 ACESInputMat = mat3(
    0.59719, 0.35458, 0.04823,
    0.07600, 0.90834, 0.01566,
    0.02840, 0.13383, 0.83777
);

// Matriz ACES Output Transform
const mat3 ACESOutputMat = mat3(
    1.60475, -0.53108, -0.07367,
    -0.10208,  1.10813, -0.00605,
    -0.00327, -0.07276,  1.07602
);

// RRT and ODT fit
vec3 RRTAndODTFit(vec3 v) {
    vec3 a = v * (v + 0.0245786) - 0.000090537;
    vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
    return a / b;
}

vec3 ACESFitted(vec3 color) {
    color = ACESInputMat * color;
    color = RRTAndODTFit(color);
    color = ACESOutputMat * color;
    return clamp(color, 0.0, 1.0);
}

float getLuminance(vec3 color) {
    return dot(color, vec3(0.2126, 0.7152, 0.0722));
}

void main() {
    vec3 hdrColor = texture(hdrBuffer, uv).rgb;
    
    float exposure = manualExposure;
    if (useAutoExposure) {
        // Lee luminancia promedio del nivel más bajo del mipmap
        float avgLuminance = texture(luminanceTexture, vec2(0.5)).r;
        float targetExposure = 0.18 / max(avgLuminance, 0.001); // Key value 0.18
        exposure = clamp(targetExposure, minExposure, maxExposure);
    }
    
    // Aplicar exposición
    vec3 exposed = hdrColor * exposure;
    
    // ACES tone mapping
    vec3 result = ACESFitted(exposed);
    
    // Gamma correction (ACES ya trabaja en linear, salida a sRGB)
    result = pow(result, vec3(1.0/2.2));
    
    fragColor = vec4(result, 1.0);
}

// ============================================================================
// SHADER 2: COLOR GRADING CON 3D LUT
// ============================================================================
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

// ============================================================================
// SHADER 3: SCREEN SPACE REFLECTIONS (SSR) - Alta Calidad
// ============================================================================
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

// ============================================================================
// SHADER 4: HORIZON-BASED AMBIENT OCCLUSION (HBAO)
// ============================================================================
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

// ============================================================================
// SHADER 5: BLOOM FÍSICO (THRESHOLD + DOWNSAMPLE + UPSAMPLE)
// ============================================================================
// Paso 1: Threshold y primera reducción
#version 330 core
out vec4 fragColor;
in vec2 uv;

uniform sampler2D hdrBuffer;
uniform float threshold; // 1.0-2.0 típico
uniform float softKnee; // 0.5 típico

vec3 prefilter(vec3 color) {
    float brightness = max(color.r, max(color.g, color.b));
    float knee = threshold * softKnee;
    float soft = brightness - threshold + knee;
    soft = clamp(soft, 0.0, 2.0 * knee);
    soft = soft * soft / (4.0 * knee + 0.00001);
    float contribution = max(soft, brightness - threshold);
    contribution /= max(brightness, 0.00001);
    return color * contribution;
}

void main() {
    vec3 color = texture(hdrBuffer, uv).rgb;
    fragColor = vec4(prefilter(color), 1.0);
}

// Paso 2: Downsample (13-tap tent filter)
#version 330 core
out vec4 fragColor;
in vec2 uv;

uniform sampler2D inputTexture;
uniform vec2 texelSize;

void main() {
    vec4 d = texelSize.xyxy * vec4(-1, -1, 1, 1);
    
    vec3 s = texture(inputTexture, uv + d.xy).rgb;
    s += texture(inputTexture, uv + d.zy).rgb * 2.0;
    s += texture(inputTexture, uv + d.xw).rgb * 2.0;
    s += texture(inputTexture, uv + d.zw).rgb;
    s += texture(inputTexture, uv + vec2(-2.0, 0.0) * texelSize).rgb;
    s += texture(inputTexture, uv + vec2(2.0, 0.0) * texelSize).rgb;
    s += texture(inputTexture, uv + vec2(0.0, -2.0) * texelSize).rgb;
    s += texture(inputTexture, uv + vec2(0.0, 2.0) * texelSize).rgb;
    s += texture(inputTexture, uv).rgb * 4.0;
    
    fragColor = vec4(s / 16.0, 1.0);
}

// Paso 3: Upsample y combinar
#version 330 core
out vec4 fragColor;
in vec2 uv;

uniform sampler2D lowResTexture;
uniform sampler2D highResTexture;
uniform vec2 texelSize;
uniform float intensity; // 0.1-0.5 típico

void main() {
    vec4 d = texelSize.xyxy * vec4(-1, -1, 1, 1) * 0.5;
    
    vec3 bloom = texture(lowResTexture, uv + d.xy).rgb;
    bloom += texture(lowResTexture, uv + d.zy).rgb;
    bloom += texture(lowResTexture, uv + d.xw).rgb;
    bloom += texture(lowResTexture, uv + d.zw).rgb;
    bloom *= 0.25;
    
    vec3 highRes = texture(highResTexture, uv).rgb;
    
    fragColor = vec4(highRes + bloom * intensity, 1.0);
}

// ============================================================================
// SHADER 6: DEPTH OF FIELD (DoF) CON BOKEH CIRCULAR
// ============================================================================
#version 330 core
out vec4 fragColor;
in vec2 uv;

uniform sampler2D sceneTexture;
uniform sampler2D depthTexture;
uniform float focusDistance; // Distancia de enfoque
uniform float focusRange; // Rango de enfoque nítido
uniform float bokehRadius; // Radio máximo de blur
uniform vec2 resolution;

const int SAMPLES = 64; // Reducir si hay problemas de performance
const float GOLDEN_ANGLE = 2.39996323;

float getBlurRadius(float depth) {
    float distance = depth * 100.0; // Escalar según tu rango de profundidad
    float coc = abs(distance - focusDistance) / focusRange;
    return clamp(coc * bokehRadius, 0.0, bokehRadius);
}

void main() {
    float centerDepth = texture(depthTexture, uv).r;
    float radius = getBlurRadius(centerDepth);
    
    if (radius < 0.5) {
        fragColor = texture(sceneTexture, uv);
        return;
    }
    
    vec3 color = vec3(0.0);
    float totalWeight = 0.0;
    
    for (int i = 0; i < SAMPLES; i++) {
        float angle = float(i) * GOLDEN_ANGLE;
        float dist = sqrt(float(i) / float(SAMPLES));
        vec2 offset = vec2(cos(angle), sin(angle)) * dist * radius / resolution;
        
        vec3 sampleColor = texture(sceneTexture, uv + offset).rgb;
        float weight = 1.0;
        
        color += sampleColor * weight;
        totalWeight += weight;
    }
    
    fragColor = vec4(color / totalWeight, 1.0);
}

// ============================================================================
// SHADER 7: MOTION BLUR PER-OBJECT
// ============================================================================
#version 330 core
out vec4 fragColor;
in vec2 uv;

uniform sampler2D sceneTexture;
uniform sampler2D velocityTexture;
uniform int samples; // 8-16 típico
uniform float strength; // 0.5-1.0

void main() {
    vec2 velocity = texture(velocityTexture, uv).rg * strength;
    
    // Si velocidad muy baja, skip
    if (length(velocity) < 0.001) {
        fragColor = texture(sceneTexture, uv);
        return;
    }
    
    vec3 color = texture(sceneTexture, uv).rgb;
    
    for (int i = 1; i < samples; i++) {
        float t = float(i) / float(samples - 1);
        vec2 offset = velocity * (t - 0.5);
        color += texture(sceneTexture, uv + offset).rgb;
    }
    
    fragColor = vec4(color / float(samples), 1.0);
}

// ============================================================================
// SHADER 8: SHARPENING ADAPTATIVO FINAL
// ============================================================================
#version 330 core
out vec4 fragColor;
in vec2 uv;

uniform sampler2D inputTexture;
uniform vec2 resolution;
uniform float sharpness; // 0.2-0.5 típico

void main() {
    vec2 pixelSize = 1.0 / resolution;
    
    vec3 center = texture(inputTexture, uv).rgb;
    vec3 left = texture(inputTexture, uv + vec2(-pixelSize.x, 0)).rgb;
    vec3 right = texture(inputTexture, uv + vec2(pixelSize.x, 0)).rgb;
    vec3 top = texture(inputTexture, uv + vec2(0, pixelSize.y)).rgb;
    vec3 bottom = texture(inputTexture, uv + vec2(0, -pixelSize.y)).rgb;
    
    vec3 laplacian = center * 4.0 - (left + right + top + bottom);
    
    // Detectar bordes para evitar oversharpening
    float edgeDetection = length(laplacian);
    float adaptiveStrength = sharpness * smoothstep(0.5, 0.0, edgeDetection);
    
    vec3 sharpened = center + laplacian * adaptiveStrength;
    
    fragColor = vec4(clamp(sharpened, 0.0, 1.0), 1.0);
}

// ============================================================================
// SHADER 9: CHROMATIC ABERRATION (OPCIONAL, SUTIL)
// ============================================================================
#version 330 core
out vec4 fragColor;
in vec2 uv;

uniform sampler2D inputTexture;
uniform float strength; // 0.001-0.003 MUY sutil

void main() {
    vec2 dir = uv - 0.5;
    float dist = length(dir);
    
    vec2 offset = normalize(dir) * dist * strength;
    
    float r = texture(inputTexture, uv - offset).r;
    float g = texture(inputTexture, uv).g;
    float b = texture(inputTexture, uv + offset).b;
    
    fragColor = vec4(r, g, b, 1.0);
}

// ============================================================================
// NOTAS DE IMPLEMENTACIÓN:
// ============================================================================
// 1. Renderiza tu escena a un framebuffer HDR (RGBA16F o RGBA32F)
// 2. Aplica SSR sobre el buffer HDR
// 3. Aplica AO y multiplica con el buffer HDR
// 4. Pasa por TAA (tu shader existente)
// 5. Bloom: threshold → downsample chain (5 niveles) → upsample chain
// 6. DoF si es necesario (costoso, usar solo cuando aporta)
// 7. Motion blur si hay movimiento rápido
// 8. ACES tone mapping (CRÍTICO)
// 9. Color grading con LUT
// 10. Sharpening final adaptativo
// 11. (Opcional) Chromatic aberration MUY sutil
// 12. Film grain (opcional, 0.01-0.02 strength máximo)
//
// Performance tips:
// - SSR: usa half-resolution para el trace, upscale con bilateral filter
// - AO: renderiza a half-res, blur y upscale
// - Bloom: limita a 5 niveles de downsampling
// - DoF: solo cuando focal distance != infinito
// - Motion blur: solo si velocity > threshold
//
// LUT generation:
// - Usa DaVinci Resolve o similar para crear LUTs neutras/futuristas
// - Exporta como .cube o .3dl, convierte a textura 3D 32x32x32
// - Looks recomendados: "Futuristic Teal/Orange", "Cool Cyberpunk", "Clean Neutral"