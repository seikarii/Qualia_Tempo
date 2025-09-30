// QUALIA.CODE v1.1 - Browser Timer Provider
// Concrete implementation of ITimerProvider for browser environments

import { injectable } from "inversify";
import { ITimerProvider } from "../interfaces/ITimerProvider";

/**
 * Browser-specific implementation of ITimerProvider
 * Provides access to native browser timer APIs
 */
@injectable()
export class BrowserTimerProvider implements ITimerProvider {
  setTimeout(callback: () => void, ms: number): number {
    return window.setTimeout(callback, ms);
  }

  clearTimeout(id: number): void {
    window.clearTimeout(id);
  }

  setInterval(callback: () => void, ms: number): number {
    return window.setInterval(callback, ms);
  }

  clearInterval(id: number): void {
    window.clearInterval(id);
  }

  requestAnimationFrame(callback: (time: number) => void): number {
    return window.requestAnimationFrame(callback);
  }

  cancelAnimationFrame(id: number): void {
    window.cancelAnimationFrame(id);
  }

  performanceNow(): number {
    if (typeof performance !== 'undefined' && performance.now) {
      return performance.now();
    }
    // Fallback to Date.now() if performance.now() is not available
    return Date.now();
  }
}