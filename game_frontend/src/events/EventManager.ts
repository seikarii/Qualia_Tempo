
import { System } from '../ecs/System.js';
import { GameEventData } from './GameEvents.js';

export interface IEventManager {
  on<K extends keyof GameEventData>(eventName: K, listener: (data: GameEventData[K]) => void): void;
  off<K extends keyof GameEventData>(eventName: K, listener: (data: GameEventData[K]) => void): void;
  emit<K extends keyof GameEventData>(eventName: K, data: GameEventData[K]): void;
  update(): void;
  clear(): void;
}

export class EventManager extends System implements IEventManager {
  private listeners = new Map<keyof GameEventData, ((data: GameEventData[keyof GameEventData]) => void)[]>();

  public update(): void {}

  public on<K extends keyof GameEventData>(eventName: K, listener: (data: GameEventData[K]) => void): void {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    this.listeners.get(eventName)!.push(listener);
  }

  public off<K extends keyof GameEventData>(eventName: K, listener: (data: GameEventData[K]) => void): void {
    const eventListeners = this.listeners.get(eventName);
    if (eventListeners) {
      this.listeners.set(
        eventName,
        eventListeners.filter((l) => l !== listener)
      );
    }
  }

  public emit<K extends keyof GameEventData>(eventName: K, data: GameEventData[K]): void {
    const eventListeners = this.listeners.get(eventName);
    if (eventListeners) {
      for (const listener of [...eventListeners]) {
        listener(data);
      }
    }
  }

  public clear(): void {
    this.listeners.clear();
  }
}
