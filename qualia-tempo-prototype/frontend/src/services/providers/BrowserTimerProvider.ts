// QUALIA.CODE v1.1 - Browser Timer Provider
// Concrete implementation of ITimerProvider for browser environments
// NOTE: This file is in providers/ directory which is whitelisted in .eslintrc.cjs
// for legitimate platform abstraction layer implementations

import { injectable } from "inversify";
import { BrowserOnly } from "../../utils/decorators";
import { ITimerProvider } from "../interfaces/ITimerProvider";

/**
 * Browser-specific implementation of ITimerProvider
 * Provides access to native browser timer APIs
 */
@injectable()
export class BrowserTimerProvider implements ITimerProvider {
  @BrowserOnly
  setTimeout(callback: () => void, ms: number): number {
    return window.setTimeout(callback, ms);
  }

  @BrowserOnly
  clearTimeout(id: number): void {
    window.clearTimeout(id);
  }

  @BrowserOnly
  setInterval(callback: () => void, ms: number): number {
    return window.setInterval(callback, ms);
  }

  @BrowserOnly
  clearInterval(id: number): void {
    window.clearInterval(id);
  }

  @BrowserOnly
  requestAnimationFrame(callback: (_time: number) => void): number {
    return window.requestAnimationFrame(callback);
  }

  @BrowserOnly
  cancelAnimationFrame(id: number): void {
    window.cancelAnimationFrame(id);
  }

  @BrowserOnly
  performanceNow(): number {
    if (typeof performance !== 'undefined' && performance.now) {
      return performance.now();
    }
    // Fallback to Date.now() if performance.now() is not available
    return Date.now();
  }

  public now(): number {
    return Date.now();
  }

  public getCurrentDate(): Date {
    return new Date();
  }
}