import { injectable, inject } from "inversify";
import { TYPES } from "./inversify.types";
import { logMethod } from "../utils/decorators";
import type { ILogger } from "./interfaces/ILogger";
import type { IBrowserEventsService } from "./interfaces/IBrowserEventsService";

/**
 * QUALIA.CODE v1.1 Compliant BrowserEventsService
 * Abstraction layer for browser global event handling
 * Provides a testable and mockable interface for window/document events.
 */
@injectable()
export class BrowserEventsService implements IBrowserEventsService {
  private readonly logger: ILogger;

  constructor(@inject(TYPES.ILogger) logger: ILogger) {
    this.logger = logger;
    this.logger.info("BrowserEventsService initialized");
  }

  @logMethod
  public addWindowEventListener<K extends keyof WindowEventMap>(
    type: K,
    listener: (_event: WindowEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions
  ): void {
    if (typeof window !== 'undefined') {
      window.addEventListener(type, listener, options); // eslint-disable-line @qualia-tempo/qualia-code/no-global-api-calls
      this.logger.debug("Window event listener added", { type });
    } else {
      this.logger.warn("Window object not available, cannot add event listener", { type });
    }
  }

  @logMethod
  public removeWindowEventListener<K extends keyof WindowEventMap>(
    type: K,
    listener: (_event: WindowEventMap[K]) => void,
    options?: boolean | EventListenerOptions
  ): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener(type, listener, options); // eslint-disable-line @qualia-tempo/qualia-code/no-global-api-calls
      this.logger.debug("Window event listener removed", { type });
    } else {
      this.logger.warn("Window object not available, cannot remove event listener", { type });
    }
  }

  @logMethod
  public addElementEventListener<K extends keyof HTMLElementEventMap>(
    element: HTMLElement,
    type: K,
    listener: (_event: HTMLElementEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions
  ): void {
    element.addEventListener(type, listener, options);
    this.logger.debug("Element event listener added", { type, elementTag: element.tagName });
  }

  @logMethod
  public removeElementEventListener<K extends keyof HTMLElementEventMap>(
    element: HTMLElement,
    type: K,
    listener: (_event: HTMLElementEventMap[K]) => void,
    options?: boolean | EventListenerOptions
  ): void {
    element.removeEventListener(type, listener, options);
    this.logger.debug("Element event listener removed", { type, elementTag: element.tagName });
  }

  @logMethod
  public getWindowDimensions(): { width: number; height: number } {
    if (typeof window !== 'undefined') {
      return {
        width: window.innerWidth, // eslint-disable-line @qualia-tempo/qualia-code/no-global-api-calls
        height: window.innerHeight // eslint-disable-line @qualia-tempo/qualia-code/no-global-api-calls
      };
    }
    return { width: 0, height: 0 };
  }

  @logMethod
  public getViewportDimensions(): { width: number; height: number } {
    if (typeof window !== 'undefined') {
      return {
        width: window.innerWidth, // eslint-disable-line @qualia-tempo/qualia-code/no-global-api-calls
        height: window.innerHeight // eslint-disable-line @qualia-tempo/qualia-code/no-global-api-calls
      };
    }
    return { width: 0, height: 0 };
  }
}