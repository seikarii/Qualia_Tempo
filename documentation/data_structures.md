# Estructuras de Datos Principales

Estas interfaces de TypeScript definen la forma de los datos clave del juego.

## `QualiaState.ts`
Representa el estado de maestría del jugador. Este objeto es el que se envía al backend para generar los visuales.

```typescript
export interface QualiaState {
  /** Nivel general de Qualia, de 0 a 1. El valor principal. */
  intensity: number;
  /** Representa la precisión, aumenta con rachas de aciertos. */
  precision: number;
  /** Representa la agresividad, aumenta con el uso de Fast Forward y combos altos. */
  aggression: number;
  /** Representa la fluidez, aumenta con el movimiento rítmico constante. */
  flow: number;
  /** Representa el caos, aumenta al fallar el ritmo. */
  chaos: number;
  /** Representa la recuperación, aumenta al usar Rewind. */
  recovery: number;
  /** Estado del Ultimate, 0 o 1. */
  transcendence: number;
}
```

## `CombatData.ts`
Define la estructura de un archivo de combate, permitiendo la creación de contenido por parte de modders.

```typescript
export interface NoteData {
  /** Tiempo en segundos desde el inicio de la canción. */
  timestamp: number;
  /** Posición en el escenario (ej. x, y). */
  position: { x: number; y: number };
  /** Duración que la nota permanece activa. */
  duration: number;
}

export interface LyricData {
  /** Tiempo en segundos desde el inicio de la canción. */
  timestamp: number;
  /** Texto de la letra. */
  text: string;
}

export interface CombatData {
  id: string;
  title: string;
  artist: string;
  /** Ruta al archivo de audio (mp3, ogg). */
  audioPath: string;
  /** Beats Por Minuto inicial de la canción. */
  bpm: number;
  /** Array con todas las notas del mapa. */
  noteMap: NoteData[];
  /** Array con todas las letras de la canción. */
  lyrics: LyricData[];
}
```
