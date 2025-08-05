import { ECSManager } from './ECSManager.js';

/**
 * Clase base abstracta para todos los sistemas.
 * Un sistema contiene la lógica que opera sobre un conjunto de entidades
 * que poseen ciertos componentes.
 */
export abstract class System {
  /**
   * Referencia al ECSManager que gestiona este sistema.
   * Es inyectada por el propio ECSManager cuando el sistema es añadido.
   * El '!' indica que estamos seguros de que será asignada antes de su uso.
   */
  public ecs!: ECSManager;

  /**
   * Método abstracto que será llamado en cada fotograma del juego.
   * La lógica específica del sistema debe ser implementada aquí por las subclases.
   * @param deltaTime El tiempo transcurrido desde el último fotograma, en segundos.
   */
  abstract update(deltaTime: number, time: number): void;
}
