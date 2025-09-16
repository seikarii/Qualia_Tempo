import * as THREE from 'three';

/**
 * Crea un ShaderMaterial avanzado para partículas ontológicas.
 * Incluye efectos de coherencia, resonancia, evolución y actividad noosférica.
 * Optimizado para renderizado de estados emergentes y transiciones narrativas.
 */
export const createOntologicalShader = (
  renderMode: 'COHERENT' | 'CHAOTIC' | 'NARRATIVE' | 'EMERGENT'
) => {
  const vertexShader = `
    attribute float customSize;
    attribute float coherenceLevel;
    attribute float resonanceFreq;
    attribute vec3 evolutionVector;
    attribute vec3 color;
    attribute float narrativeWeight;
    attribute float entropy;
    
    uniform float time;
    uniform float globalCoherence;
    uniform float noosphereActivity;
    uniform float narrativePulse;
    
    varying vec3 vColor;
    varying float vCoherence;
    varying float vResonance;
    varying float vLifeforce;
    varying float vNarrativeWeight;
    varying float vEntropy;
    
    void main() {
      vColor = color;
      vCoherence = coherenceLevel;
      vResonance = resonanceFreq;
      vNarrativeWeight = narrativeWeight;
      vEntropy = entropy;
      
      // Fuerza vital combinada: coherencia, narrativa y entropía
      vLifeforce = coherenceLevel * globalCoherence * (1.0 + sin(time * resonanceFreq) * 0.2)
        * (0.8 + narrativeWeight * 0.4) * (1.0 - entropy * 0.3);
      
      // Posición evolutiva: tendencia hacia el vector de evolución + pulso narrativo
      vec3 evolutivePosition = position + evolutionVector * sin(time * 0.5 + narrativePulse) * 0.1;
      
      // Breathing effect y pulso narrativo
      float breathingScale = 1.0 + sin(time * 2.0 + noosphereActivity * 10.0 + narrativePulse * 2.0) * 0.07;
      
      vec4 mvPosition = modelViewMatrix * vec4(evolutivePosition, 1.0);
      
      // Tamaño dinámico: coherencia, narrativa y breathing
      float dynamicSize = customSize * vLifeforce * breathingScale * (0.8 + vNarrativeWeight * 0.5);
      gl_PointSize = dynamicSize * (320.0 / -mvPosition.z);
      
      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  const fragmentShader = (() => {
    if (renderMode === 'COHERENT') {
      return `
        varying vec3 vColor;
        varying float vCoherence;
        varying float vResonance;
        varying float vLifeforce;
        varying float vNarrativeWeight;
        varying float vEntropy;
        
        void main() {
          float distance = length(gl_PointCoord - vec2(0.5));
          if (distance > 0.5) discard;
          
          // Glow central y borde suave
          float centerGlow = 1.0 - smoothstep(0.0, 0.18, distance);
          float outerGlow = 1.0 - smoothstep(0.18, 0.5, distance);
          
          float alpha = centerGlow * vCoherence + outerGlow * (1.0 - vCoherence) * 0.35;
          alpha *= vLifeforce * (0.9 + vNarrativeWeight * 0.3) * (1.0 - vEntropy * 0.2);
          
          // Pulsación de vida y narrativa
          float lifePulse = 0.85 + 0.15 * sin(vLifeforce * 9.0 + vNarrativeWeight * 5.0);
          
          gl_FragColor = vec4(vColor * lifePulse, alpha);
        }
      `;
    }
    if (renderMode === 'CHAOTIC') {
      return `
        varying vec3 vColor;
        varying float vCoherence;
        varying float vResonance;
        varying float vLifeforce;
        varying float vNarrativeWeight;
        varying float vEntropy;
        
        void main() {
          float distance = length(gl_PointCoord - vec2(0.5));
          if (distance > 0.5) discard;
          
          // Caos: bordes difusos y variación de color
          float chaos = sin(vResonance * 47.0 + vEntropy * 13.0) * 0.35;
          float alpha = (1.0 - distance * 2.0) * (0.6 + chaos) * (0.8 + vEntropy * 0.4);
          
          // Color caótico y pulsación narrativa
          vec3 chaoticColor = vColor + vec3(
            sin(vResonance * 21.0 + vNarrativeWeight * 3.0) * 0.22,
            sin(vResonance * 29.0 + vNarrativeWeight * 2.0) * 0.22,
            sin(vResonance * 37.0 + vNarrativeWeight * 4.0) * 0.22
          );
          
          gl_FragColor = vec4(chaoticColor, alpha);
        }
      `;
    }
    if (renderMode === 'NARRATIVE') {
      return `
        varying vec3 vColor;
        varying float vCoherence;
        varying float vResonance;
        varying float vLifeforce;
        varying float vNarrativeWeight;
        varying float vEntropy;
        
        void main() {
          float distance = length(gl_PointCoord - vec2(0.5));
          if (distance > 0.5) discard;
          
          // Narrativa: centro dorado y borde azul
          vec3 narrativeColor = mix(
            vec3(1.0, 0.85, 0.2) * vNarrativeWeight,
            vColor,
            0.5 + 0.5 * vCoherence
          );
          float alpha = (1.0 - distance * 1.7) * (0.7 + vNarrativeWeight * 0.5);
          alpha *= vLifeforce * (0.9 + vNarrativeWeight * 0.4);
          
          gl_FragColor = vec4(narrativeColor, alpha);
        }
      `;
    }
    // EMERGENT (default/fallback)
    return `
      varying vec3 vColor;
      varying float vCoherence;
      varying float vResonance;
      varying float vLifeforce;
      varying float vNarrativeWeight;
      varying float vEntropy;
      
      void main() {
        float distance = length(gl_PointCoord - vec2(0.5));
        if (distance > 0.5) discard;
        
        // Emergencia: color verde-azul y pulsación de entropía
        vec3 emergentColor = mix(
          vColor,
          vec3(0.2, 0.9, 0.7) * (1.0 - vEntropy),
          0.4 + 0.4 * vCoherence
        );
        float alpha = (1.0 - distance * 1.3) * (0.6 + vLifeforce * 0.3);
        alpha *= (1.0 - vEntropy * 0.3);
        
        gl_FragColor = vec4(emergentColor, alpha);
      }
    `;
  })();

  return new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      globalCoherence: { value: 1.0 },
      noosphereActivity: { value: 0.0 },
      narrativePulse: { value: 0.0 }
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
};