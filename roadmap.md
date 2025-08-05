# Roadmap de Desarrollo - Qualia Tempo

## Fase 0: Fundación y Arquitectura (✓ Completada)
- **Tarea:** Definir la arquitectura híbrida (Frontend TS/React, Backend Python/Janus).
- **Tarea:** Crear la estructura de directorios del proyecto.
- **Tarea:** Definir las estructuras de datos principales (`QualiaState`, `CombatData`, etc.).
- **Tarea:** Establecer este roadmap inicial.

## Fase 1: El Bucle de Gameplay Central (✓ Completada)
- **Tarea:** Implementar el movimiento `Dash Rítmico` automático en el frontend.
- **Tarea:** Crear un mapa de notas de prueba (placeholder).
- **Tarea:** Detectar aciertos/fallos al pisar las notas según el ritmo (simulado).
- **Tarea:** Implementar la generación del recurso `Qualia` como una variable que aumenta con los aciertos.
- **Tarea:** Crear un HUD de depuración para visualizar el combo y el nivel de `Qualia` en tiempo real.

## Fase 2: El Puente Qualia y Sinergia Audiovisual (✓ Completada)
- **Tarea:** Crear el servidor Python/FastAPI en el backend.
- **Tarea:** Definir un endpoint `/update_qualia` que reciba el `QualiaState`.
- **Tarea:** Enviar el `QualiaState` desde el frontend al backend en cada frame.
- **Tarea:** Implementar el visualizador de Pygame/ModernGL en el backend que reacciona al `QualiaState`.
- **Tarea:** Implementar el motor de audio dinámico en el frontend que reacciona al `QualiaState` y combo.

## Fase 3: Mecánicas y Combate (Pendiente)
- **Tarea:** Implementar las 3 habilidades base: `Pause`, `Fast Forward`, `Rewind`.
- **Tarea:** Implementar la barra de vida del boss como la duración de la canción.
- **Tarea:** Hacer que el `Qualia` alto reduzca la duración restante de la canción (daño).
- **Placeholder:** Simular la escalada del boss aumentando la velocidad de las notas en el frontend.

## Fase 4: Flujo de Juego y UI (Pendiente)
- **Tarea:** Crear el menú principal con una lista de combates (leída desde los archivos de datos).
- **Tarea:** Crear la pantalla de resultados post-combate.
- **Tarea:** Implementar el autoguardado del progreso.

## Fase 5: Contenido y Pulido (Pendiente)
- **Tarea:** Implementar la habilidad `Ultimate (8D Mayhem)`.
- **Placeholder:** Integrar música y letras de `Charliethehellsinger` como prueba.
- **Placeholder:** Refinar los efectos visuales del backend con el motor de partículas completo de Janus.
- **Tarea:** Crear el primer archivo de combate `boss_the_conductor.json` completo.
