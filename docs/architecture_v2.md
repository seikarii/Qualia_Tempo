# Qualia Tempo - Arquitectura Futura (v2.0)

## Visión General

Qualia Tempo evoluciona hacia una arquitectura más modular y escalable, aprovechando los componentes de Crisalida mientras se mantiene enfocado en la experiencia de juego rítmico inmersiva. La nueva arquitectura sigue un patrón ECS (Entity-Component-System) con un fuerte énfasis en la sincronización de audio y la generación procedural de contenido.

## Diagrama de Alto Nivel

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            FRONTEND (TypeScript/React)                  │
│  ┌─────────────┐    ┌─────────────┐    ┌───────────────────────────┐   │
│  │             │    │             │    │                           │   │
│  │  Game State │◄──►│  Audio      │◄──►│  Input Management         │   │
│  │  Manager    │    │  Engine     │    │                           │   │
│  │             │    │  (Tone.js)  │    └───────────────┬───────────┘   │
│  └──────┬──────┘    └──────┬──────┘                    │               │
│         │                  │                           ▼               │
│  ┌──────▼──────┐    ┌──────▼──────┐    ┌───────────────────────────┐   │
│  │             │    │             │    │                           │   │
│  │  Qualia     │    │  Visual     │    │  UI/UX Manager            │   │
│  │  State      │    │  Feedback   │    │  (React)                  │   │
│  │  Manager    │    │  System     │    │                           │   │
│  │             │    │             │    │                           │   │
│  └──────┬──────┘    └──────┬──────┘    └───────────────────────────┘   │
│         │                  │                                            │
└─────────┼──────────────────┼────────────────────────────────────────────┘
          │                  │
          ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            BACKEND (Python/Janus)                       │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                 │   │
│  │  Qualia Particle Engine (QPE)                                   │   │
│  │  ┌─────────────┐    ┌─────────────┐    ┌───────────────────┐   │   │
│  │  │  Physics    │    │  Rendering  │    │  Audio Analysis   │   │   │
│  │  │  System     │◄──►│  System     │◄──►│  & Synthesis     │   │   │
│  │  │             │    │  (GLSL)     │    │  (SuperCollider)  │   │   │
│  │  └─────────────┘    └─────────────┘    └───────────────────┘   │   │
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

#### Audio Engine (Tone.js + OntologicalAudioEngine)
- **Responsabilidad:** Gestión de audio y sincronización rítmica
- **Características:**
  - Sincronización precisa con el tempo del juego
  - Generación procedural de sonidos basada en QualiaState
  - Efectos de audio dinámicos que responden al rendimiento

#### Input Management
- **Responsabilidad:** Procesamiento de entradas del jugador
- **Características:**
  - Detección de ritmo para el Dash Rítmico
  - Gestión de habilidades (Pause, Fast Forward, Rewind, Ultimate)
  - Retroalimentación háptica

#### Visual Feedback System
- **Responsabilidad:** Efectos visuales en tiempo real
- **Características:**
  - Partículas y efectos de partículas
  - Shaders para efectos visuales avanzados
  - Transiciones y animaciones fluidas

### 2. Backend (Python/Janus)

#### Qualia Particle Engine (QPE)
- **Responsabilidad:** Simulación de partículas avanzada
- **Características:**
  - Física de partículas optimizada
  - Shaders personalizables para efectos visuales
  - Integración con el sistema de audio

#### Boss AI & Behavior System
- **Responsabilidad:** Comportamiento del jefe
- **Características:**
  - Generación procedural de patrones de ataque
  - Escalado de dificultad adaptativo
  - Animaciones y transiciones fluidas

## Flujo de Datos

1. **Ciclo de Juego Principal**
   - El jugador interactúa con el juego (input)
   - El Game State Manager actualiza el estado del juego
   - El Audio Engine y Visual Feedback System reciben actualizaciones
   - El Qualia State se calcula y envía al backend

2. **Procesamiento en Backend**
   - El Qualia Particle Engine recibe el estado actualizado
   - Se generan efectos visuales y de audio basados en el estado
   - La IA del jefe ajusta su comportamiento
   - Los datos renderizados se envían de vuelta al frontend

3. **Renderizado**
   - El frontend renderiza la interfaz de usuario
   - Los efectos visuales se muestran en tiempo real
   - El audio se reproduce sincronizado con los eventos del juego

## Integración con Crisalida

### Componentes Reutilizables

1. **OntologicalAudioEngine**
   - Adaptado para manejar la generación de audio basada en QualiaState
   - Integrado con Tone.js para sincronización rítmica

2. **OntologicalParticleSystem**
   - Mejorado para renderizado de partículas de alto rendimiento
   - Integrado con el sistema de shaders personalizados

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
