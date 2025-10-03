import { vi } from 'vitest';
import type { IEventBus } from '../../services/interfaces/IEventBus';

class TestEventBus implements IEventBus {
  private listeners = new Map<string, Map<string, (event: any) => void | Promise<void>>>();
  private nextId = 0;

  // --- MÉTODOS FUNCIONALES ENVUELTOS EN ESPÍAS ---

  subscribe = vi.fn((eventType: string, callback: (event: any) => void | Promise<void>): string => {
    const id = `test-listener-${this.nextId++}`;
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Map());
    }
    this.listeners.get(eventType)!.set(id, callback);
    return id;
  });

  unsubscribe = vi.fn((id: string): boolean => {
    for (const eventType of this.listeners.keys()) {
      if (this.listeners.get(eventType)!.delete(id)) {
        return true;
      }
    }
    return false;
  });

  emit = vi.fn(async (event: { type: string }): Promise<void> => {
    const eventWithTimestamp = { ...event, timestamp: new Date() };
    const handlers = this.listeners.get(event.type);
    if (handlers) {
      for (const handler of handlers.values()) {
        await handler(eventWithTimestamp);
      }
    }
  });

  // Implementa los demás métodos de IEventBus con vi.fn() y un comportamiento por defecto razonable.
  initialize = vi.fn().mockResolvedValue(undefined);
  cleanup = vi.fn().mockResolvedValue(undefined);
  destroy = vi.fn().mockResolvedValue(undefined);
  clear = vi.fn(() => this.listeners.clear());
  getStats = vi.fn().mockReturnValue({
    totalListeners: this.listeners.size,
    eventTypes: Array.from(this.listeners.keys()),
    historySize: 0,
    isDestroyed: false,
  });
}

export const mockEventBus = new TestEventBus();