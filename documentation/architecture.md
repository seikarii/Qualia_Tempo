# Arquitectura de Qualia Tempo

El proyecto utiliza una arquitectura híbrida para maximizar la reutilización de código y la velocidad de desarrollo.

## Componentes

1.  **Game Frontend (TypeScript / React / Electron)**
    *   **Responsabilidad:** Toda la lógica de gameplay, interacción con el usuario, manejo de audio y la UI.
    *   **Motor:** Bucle de juego en TypeScript.
    *   **Renderizado:** React para la UI (HUD, menús).
    *   **Lógica Clave:**
        *   Calcula el `Dash Rítmico` y el movimiento.
        *   Gestiona el sistema de combos y notas.
        *   Calcula el `QualiaState` basado en el rendimiento del jugador.
        *   Se comunica con el Backend vía una API REST local.

2.  **Engine Backend (Python / Janus Engine)**
    *   **Responsabilidad:** Generación de todos los efectos visuales procedurales.
    *   **Motor:** Componentes del motor de partículas de Janus, expuestos a través de un servidor web ligero.
    *   **API:** Un único endpoint (ej. `/update_qualia`) que recibe el `QualiaState`.
    *   **Lógica Clave:**
        *   Interpreta el `QualiaState` entrante.
        *   Traduce los valores del `QualiaState` a parámetros para los shaders GLSL.
        *   Renderiza las partículas, el boss, el jugador y el entorno en una ventana.

## Flujo de Datos (Bucle Principal)

`[Frontend]` Player Action -> Calculate `QualiaState` -> HTTP POST `QualiaState`
                                                                   |
                                                                   v
`[Backend]` Receive `QualiaState` -> Update Shader Uniforms -> Render Visuals
