import { injectable, inject } from 'inversify';
import { TYPES } from './inversify.types';
import { IInputStateService } from './interfaces/IInputStateService';
import type { ILogger } from './interfaces/ILogger';
import { logMethod } from '../utils/decorators';

/**
 * InputStateService - Gestión de estado de teclas para movimiento simultáneo
 * QUALIA.CODE Compliance: Implementa sondeo de estado en lugar de eventos discretos
 *
 * CRITICAL: Este servicio es la nueva fuente de verdad para el estado de entrada.
 * Permite detectar múltiples teclas pulsadas simultáneamente, solucionando el
 * problema arquitectónico del movimiento diagonal.
 */
@injectable()
export class InputStateService implements IInputStateService {
  private readonly pressedKeys = new Set<string>();
  private readonly justPressedKeys = new Set<string>();
  // @ts-expect-error - Used by @logMethod decorator
  private readonly logger: ILogger;

  constructor(@inject(TYPES.ILogger) logger: ILogger) {
    this.logger = logger;
  }

  @logMethod
  public pressKey(key: string): void {
    const lowerKey = key.toLowerCase();
    if (!this.pressedKeys.has(lowerKey)) {
      this.justPressedKeys.add(lowerKey);
    }
    this.pressedKeys.add(lowerKey);
  }

  @logMethod
  public releaseKey(key: string): void {
    const lowerKey = key.toLowerCase();
    this.pressedKeys.delete(lowerKey);
    this.justPressedKeys.delete(lowerKey);
  }

  @logMethod
  public isKeyPressed(key: string): boolean {
    return this.pressedKeys.has(key.toLowerCase());
  }

  @logMethod
  public wasActionJustPressed(actionKey: string): boolean {
    const lowerKey = actionKey.toLowerCase();
    if (this.justPressedKeys.has(lowerKey)) {
      this.justPressedKeys.delete(lowerKey); // Clear after checking
      return true;
    }
    return false;
  }

  @logMethod
  public getDirectionVector(): { x: number; z: number } {
    const vector = { x: 0, z: 0 };

    // CORRECTO: W/S controla el eje Z (adelante/atrás)
    if (this.isKeyPressed('w') || this.isKeyPressed('arrowup'))    vector.z -= 1;
    if (this.isKeyPressed('s') || this.isKeyPressed('arrowdown'))  vector.z += 1;

    // CORRECTO: A/D controla el eje X (izquierda/derecha)
    if (this.isKeyPressed('a') || this.isKeyPressed('arrowleft'))  vector.x -= 1;
    if (this.isKeyPressed('d') || this.isKeyPressed('arrowright')) vector.x += 1;

    return vector;
  }
}