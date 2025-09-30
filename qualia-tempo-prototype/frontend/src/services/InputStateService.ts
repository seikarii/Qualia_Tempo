import { injectable } from 'inversify';
import { IInputStateService } from './interfaces/IInputStateService';
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

  @logMethod
  public pressKey(key: string): void {
    this.pressedKeys.add(key.toLowerCase());
  }

  @logMethod
  public releaseKey(key: string): void {
    this.pressedKeys.delete(key.toLowerCase());
  }

  @logMethod
  public isKeyPressed(key: string): boolean {
    return this.pressedKeys.has(key.toLowerCase());
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