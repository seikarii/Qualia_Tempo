# Qualia Tempo - Arquitectura Futura (v2.0) - DEPRECATED

**DEPRECATED: Este documento ha sido reemplazado por `ARCHITECTURE.GOLD.CODE.md`. No usar para nuevas implementaciones.**

## Visión General

Qualia Tempo evoluciona hacia una arquitectura más modular y escalable, aprovechando los componentes de Crisalida mientras se mantiene enfocado en la experiencia de juego rítmico inmersiva. La nueva arquitectura sigue un patrón ECS (Entity-Component-System) con un fuerte énfasis en la sincronización de audio y la generación procedural de contenido.

## Diagrama de Alto Nivel

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            FRONTEND (TypeScript/React)                  │
│  ┌─────────────┐    ┌─────────────────────────────┐    ┌───────────────────────────┐   │
│  │             │    │                             │    │                           │   │
│  │  Game State │◄──►│  Ontological & 8D Audio     │◄──►│  Musical Input & Combo    │   │
│  │  Manager    │    │  Engine (Tone.js)           │    │  System                   │   │
│  │             │    │                             │    └───────────────┬───────────┘   │
│  └──────┬──────┘    └──────┬──────┘                                    │               │
│         │                  │                                           ▼               │
│  ┌──────▼──────┐    ┌──────▼──────┐    ┌───────────────────────────┐   │
│  │             │    │             │    │                           │   │
│  │  Qualia     │    │  Audio      │    │  UI/HUD Manager           │   │
│  │  State      │    │  Analysis   │    │  (React)                  │   │
│  │  Manager    │    │  Service    │    │                           │   │
│  │             │    │  (FFT)      │    │                           │   │
│  └──────┬──────┘    └──────┬──────┘    └───────────────────────────┘   │
│         │                  │                                            │
└─────────┼──────────────────┼────────────────────────────────────────────┘
          │                  │
          ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            BACKEND (Python/Janus)                       │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                 │   │
│  │  Kairos Visual Engine                                           │   │
│  │  ┌─────────────────────────────┐    ┌───────────────────────┐   │   │
│  │  │  Atmosphere Shaders         │    │  FFT Data Processor   │   │   │
│  │  │  (Fase 1: Bloom, God Rays)  │◄──►│  (Fase 2)             │   │   │
│  │  └─────────────────────────────┘    └───────────────────────┘   │   │
│  │                                                                 │   │
│  │  ┌─────────────────────────────┐    ┌───────────────────────┐   │   │
│  │  │  Reaction-Diffusion Compute │    │  SDF & Raymarching    │   │   │
│  │  │  (Fase 3)                   │◄──►│  Renderer (Fase 4)    │   │   │
│  │  └─────────────────────────────┘    └───────────────────────┘   │   │
│  │                                                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                 │   │
│  │  Boss AI & Behavior System                                      │   │
│  │  ┌─────────────┐    ┌─────────────────────┐    ┌─────────────┐  │   │
│  │  │  Pattern    │    │  Difficulty         │    │  Animation  │  │   │
│  │  │  Generator  │◄──►│  Scaling System     │◄──►│  Controller │  │   │
│  │  │             │    │                     │    │             │  │   │
│  │  └─────────────┘    └─────────────────────┘    └─────────────┘  │   │
│  │                                                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

## Componentes Clave

### 1. Frontend (TypeScript/React)

#### Game State Manager
- **Responsabilidad:** Mantener el estado global del juego
- **Características:**
  - Sincronización de estado entre componentes
  - Gestión del ciclo de vida del juego
  - Comunicación con el backend

#### Ontological & 8D Audio Engine (Tone.js)
- **Responsabilidad:** Gestión de audio ontológico y efectos 8D
- **Características:**
  - Generación procedural de sonidos basada en QualiaState
  - Efectos de audio 8D para inmersión espacial
  - Sincronización precisa con el tempo del juego

#### Musical Input & Combo System
- **Responsabilidad:** Procesamiento de entradas musicales y detección de combos
- **Características:**
  - Detección de teclas musicales (Q, E, R...)
  - Identificación de macro-combos para efectos emergentes
  - Triggering de eventos de juego basados en secuencias musicales

#### Audio Analysis Service (FFT)
- **Responsabilidad:** Análisis de audio en tiempo real usando FFT
- **Características:**
  - Procesamiento FFT usando Web Audio API
  - Envío de datos de frecuencia procesados al backend
  - Análisis de espectro para efectos visuales dinámicos

#### UI/HUD Manager (React)
- **Responsabilidad:** Renderizado de la interfaz de usuario y elementos HUD
- **Características:**
  - Componentes React para UI responsiva
  - Gestión de elementos HUD en tiempo real
  - Integración con el estado del juego

### 2. Backend (Python/Janus)

#### Kairos Visual Engine
- **Responsabilidad:** Motor visual central para efectos avanzados
- **Características:**
  - Atmosphere Shaders (Fase 1: Bloom, God Rays)
  - FFT Data Processor (Fase 2)
  - Reaction-Diffusion Compute (Fase 3)
  - SDF & Raymarching Renderer (Fase 4)
  - Integración con datos FFT del frontend

#### Boss AI & Behavior System
- **Responsabilidad:** Comportamiento del jefe
- **Características:**
  - Generación procedural de patrones de ataque
  - Escalado de dificultad adaptativo
  - Animaciones y transiciones fluidas

## Flujo de Datos

1. **Ciclo de Juego Principal**
   - El jugador interactúa con el juego (input musical)
   - El Musical Input & Combo System procesa las entradas
   - El Audio Analysis Service (FFT) realiza análisis en tiempo real
   - El Qualia State se calcula y envía al backend junto con datos FFT

2. **Procesamiento en Backend**
   - El Kairos Visual Engine recibe el estado y datos FFT
   - Se procesan las 4 fases del Proyecto Kairos
   - La IA del jefe ajusta su comportamiento
   - Los datos renderizados se envían de vuelta al frontend

3. **Renderizado**
   - El frontend renderiza la interfaz de usuario
   - Los efectos visuales se muestran en tiempo real
   - El audio se reproduce sincronizado con los eventos del juego

## Integración con Crisalida

### Componentes Reutilizables

1. **OntologicalAudioEngine** (Frontend)
   - Ubicado en el Frontend para análisis de audio en tiempo real
   - Integrado con Web Audio API para procesamiento FFT
   - Envía datos procesados al backend Kairos Visual Engine

2. **OntologicalParticleSystem** (Backend)
   - Evolucionado en el Kairos Visual Engine
   - Implementa las 4 fases del Proyecto Kairos
   - Procesamiento avanzado de shaders y efectos visuales

3. **QualiaTempoGame**
   - Base para el bucle de juego principal
   - Integración con React para la interfaz de usuario

## Escalabilidad y Mantenibilidad

- **Arquitectura Modular:** Cada componente es independiente y puede ser actualizado sin afectar a los demás
- **API Clara:** Interfaces bien definidas entre componentes
- **Documentación Completa:** Código documentado con ejemplos de uso
- **Pruebas Automatizadas:** Cobertura de pruebas unitarias y de integración

## Próximos Pasos

1. Implementar la integración con los componentes de Crisalida
2. Desarrollar el sistema de partículas avanzado
3. Mejorar la generación procedural de niveles
4. Optimizar el rendimiento para diferentes dispositivos
