/**
 * IInputStateService - Interfaz para gestión de estado de entrada
 * QUALIA.CODE Compliance: Abstrae el estado de teclas para permitir movimiento simultáneo
 */
export interface IInputStateService {
  /** Registra una tecla como actualmente pulsada. */
  pressKey(key: string): void;
  /** Registra una tecla como liberada. */
  releaseKey(key: string): void;
  /** Verifica si una tecla específica está actualmente pulsada. */
  isKeyPressed(key: string): boolean;
  /** Obtiene el vector de dirección combinado de las teclas pulsadas. */
  getDirectionVector(): { x: number; z: number };
  /** Verifica si una tecla de acción fue pulsada justo en este frame (evita spam). */
  wasActionJustPressed(actionKey: string): boolean;
}