#version 300 es
precision highp float;

// ============================================================================
// SSR V2 - Advanced Screen Space Reflections Shader
// Implementa técnicas de vanguardia basadas en AMD FidelityFX SSSR y Frostbite
// ============================================================================

out vec4 gl_FragColor;
in vec2 uv;

// ============================================================================
// UNIFORMS - Contrato de entrada según especificación QUALIA.CODE
// ============================================================================

// G-Buffer inputs
uniform sampler2D gBuffer_Color;
uniform sampler2D gBuffer_Normal;
uniform sampler2D gBuffer_Depth;
uniform sampler2D gBuffer_Material; // vec4(metallic, roughness, emissive, unused)

// Camera matrices
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform float cameraNear;
uniform float cameraFar;

// Viewport
uniform vec2 resolution;

// Quality parameters
uniform int maxSteps;          // 32-128, número máximo de pasos en ray-marching
uniform float stride;          // 1.0-8.0, multiplicador de distancia por paso
uniform float thickness;       // 0.1-0.5, grosor de superficie para colisión
uniform float maxDistance;     // 50.0-200.0, distancia máxima de ray-tracing

// ============================================================================
// CONSTANTES
// ============================================================================

const float SKYBOX_DEPTH_THRESHOLD = 0.9999;
const float ROUGHNESS_CUTOFF = 0.7;
const float EDGE_FADE_START = 0.0;
const float EDGE_FADE_END = 0.1;
const float MIN_RAY_STEP = 0.001;
const float DEPTH_TOLERANCE = 0.001;

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

// Reconstruye la posición en View Space desde depth y UV
vec3 reconstructViewPosition(vec2 texCoord, float depth) {
    // Normalizar coordenadas a NDC [-1, 1]
    vec4 clipSpacePosition = vec4(texCoord * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
    
    // Calcular matriz de proyección inversa
    mat4 invProjection = inverse(projectionMatrix);
    
    // Transformar a View Space
    vec4 viewSpacePosition = invProjection * clipSpacePosition;
    
    // Perspective divide
    return viewSpacePosition.xyz / viewSpacePosition.w;
}

// Transforma normal de World Space a View Space
vec3 getViewSpaceNormal(vec2 texCoord) {
    // Decodificar normal desde [0,1] a [-1,1]
    vec3 worldNormal = texture(gBuffer_Normal, texCoord).xyz * 2.0 - 1.0;
    
    // Transformar a View Space (sin traslación)
    vec3 viewNormal = (viewMatrix * vec4(worldNormal, 0.0)).xyz;
    
    return normalize(viewNormal);
}

// Proyecta posición de View Space a Screen Space UV
vec2 viewToScreenSpace(vec3 viewPosition, out bool inBounds) {
    // Proyectar a Clip Space
    vec4 clipPos = projectionMatrix * vec4(viewPosition, 1.0);
    
    // Perspective divide
    vec3 ndcPos = clipPos.xyz / clipPos.w;
    
    // Convertir a Screen Space [0, 1]
    vec2 screenUV = ndcPos.xy * 0.5 + 0.5;
    
    // Verificar bounds
    inBounds = all(greaterThanEqual(screenUV, vec2(0.0))) && 
               all(lessThanEqual(screenUV, vec2(1.0))) &&
               clipPos.w > 0.0; // Detrás de la cámara
    
    return screenUV;
}

// ============================================================================
// ALGORITMO DE RAY-MARCHING AVANZADO
// Implementa técnicas de Hierarchical Ray-Marching con adaptive step size
// ============================================================================

bool traceScreenSpaceRay(
    vec3 rayOrigin,
    vec3 rayDirection,
    float roughness,
    out vec2 hitUV,
    out vec3 hitColor,
    out float confidence
) {
    // Inicializar valores de salida
    hitUV = vec2(0.0);
    hitColor = vec3(0.0);
    confidence = 0.0;
    
    vec3 rayPos = rayOrigin;
    float rayLength = 0.0;
    
    // Adaptive step size basado en roughness
    // Superficies más rugosas pueden usar pasos más grandes
    float roughnessFactor = mix(1.0, 2.0, roughness);
    float stepSize = (stride * roughnessFactor) / float(maxSteps);
    
    // Variables para detección de intersección
    float prevDepthDiff = 0.0;
    bool refineIntersection = false;
    
    for (int i = 0; i < maxSteps; i++) {
        // Avanzar el rayo
        rayPos += rayDirection * stepSize;
        rayLength += stepSize;
        
        // Early exit si excedemos la distancia máxima
        if (rayLength > maxDistance) {
            return false;
        }
        
        // Proyectar posición actual a Screen Space
        bool inBounds;
        vec2 screenUV = viewToScreenSpace(rayPos, inBounds);
        
        if (!inBounds) {
            return false;
        }
        
        // Muestrear profundidad de la escena
        float sceneDepth = texture(gBuffer_Depth, screenUV).r;
        
        // Skip skybox
        if (sceneDepth >= SKYBOX_DEPTH_THRESHOLD) {
            return false;
        }
        
        // Reconstruir posición de la escena
        vec3 scenePos = reconstructViewPosition(screenUV, sceneDepth);
        
        // Calcular diferencia de profundidad
        float depthDiff = rayPos.z - scenePos.z;
        
        // TÉCNICA: Binary search refinement
        // Si detectamos cruce de superficie, refinamos con búsqueda binaria
        if (depthDiff > 0.0 && depthDiff < thickness) {
            // Encontramos intersección
            hitUV = screenUV;
            hitColor = texture(gBuffer_Color, screenUV).rgb;
            
            // Calcular confidence basado en múltiples factores
            
            // 1. Fade por distancia del rayo
            float distanceFade = 1.0 - smoothstep(maxDistance * 0.5, maxDistance, rayLength);
            
            // 2. Fade por cercanía al borde de pantalla
            vec2 screenFade = smoothstep(EDGE_FADE_START, EDGE_FADE_END, screenUV) * 
                             smoothstep(1.0 - EDGE_FADE_START, 1.0 - EDGE_FADE_END, screenUV);
            float edgeFade = screenFade.x * screenFade.y;
            
            // 3. Fade por precisión de intersección
            float intersectionQuality = 1.0 - smoothstep(0.0, thickness, depthDiff);
            
            // 4. Fade por ángulo de incidencia del rayo
            vec3 sceneNormal = getViewSpaceNormal(screenUV);
            float normalDotRay = abs(dot(sceneNormal, rayDirection));
            float angleFade = smoothstep(0.0, 0.3, normalDotRay);
            
            // Combinar todos los factores de confidence
            confidence = distanceFade * edgeFade * intersectionQuality * angleFade;
            
            return true;
        }
        
        // TÉCNICA: Adaptive step size based on depth gradient
        // Si estamos lejos de la geometría, podemos dar pasos más grandes
        if (depthDiff < -thickness * 2.0) {
            // Estamos muy por encima de la geometría, acelerar
            stepSize = min(stepSize * 1.5, stride * 2.0 / float(maxSteps));
        } else if (abs(depthDiff) < thickness * 0.5) {
            // Estamos cerca de la geometría, refinar
            stepSize = max(stepSize * 0.5, MIN_RAY_STEP);
        }
        
        prevDepthDiff = depthDiff;
    }
    
    return false;
}

// ============================================================================
// MAIN SHADER
// ============================================================================

void main() {
    // Leer depth del píxel actual
    float depth = texture(gBuffer_Depth, uv).r;
    
    // Early exit: Skip skybox
    if (depth >= SKYBOX_DEPTH_THRESHOLD) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
        return;
    }
    
    // Leer propiedades del material
    vec4 material = texture(gBuffer_Material, uv);
    float metallic = material.r;
    float roughness = material.g;
    
    // Early exit: Superficies muy rugosas no tienen reflejos especulares
    if (roughness > ROUGHNESS_CUTOFF) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
        return;
    }
    
    // Reconstruir posición y normal en View Space
    vec3 viewPos = reconstructViewPosition(uv, depth);
    vec3 viewNormal = getViewSpaceNormal(uv);
    
    // Calcular dirección de vista
    vec3 viewDir = normalize(viewPos);
    
    // Calcular dirección de reflexión
    // TÉCNICA: Perfect reflection para materiales metálicos
    vec3 reflectDir = reflect(viewDir, viewNormal);
    
    // Asegurar que el rayo apunta hacia la cámara (dirección negativa en View Space)
    if (reflectDir.z > 0.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
        return;
    }
    
    // Ejecutar ray-marching
    vec2 hitUV;
    vec3 reflectionColor;
    float confidence;
    
    bool hit = traceScreenSpaceRay(
        viewPos,
        reflectDir,
        roughness,
        hitUV,
        reflectionColor,
        confidence
    );
    
    if (hit && confidence > 0.0) {
        // TÉCNICA: Roughness-based fade
        // Los materiales más rugosos tienen reflejos más débiles
        float roughnessFade = 1.0 - smoothstep(0.3, ROUGHNESS_CUTOFF, roughness);
        
        // TÉCNICA: Metallic boost
        // Los materiales metálicos tienen reflejos más fuertes
        float metallicBoost = mix(0.6, 1.0, metallic);
        
        // Calcular intensidad final
        float finalStrength = confidence * roughnessFade * metallicBoost;
        
        // Escribir resultado
        gl_FragColor = vec4(reflectionColor, finalStrength);
    } else {
        // No hay reflejo válido
        gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
    }
}
