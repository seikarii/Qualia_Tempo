import { injectable, inject } from "inversify";
import { TYPES } from "./inversify.types";
import { logMethod, BrowserOnly } from "../utils/decorators";
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
  @BrowserOnly
  public addWindowEventListener<K extends keyof WindowEventMap>(
    type: K,
    listener: (_event: WindowEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions
  ): void {
    window.addEventListener(type, listener, options);
    this.logger.debug("Window event listener added", { type });
  }

  @logMethod
  @BrowserOnly
  public removeWindowEventListener<K extends keyof WindowEventMap>(
    type: K,
    listener: (_event: WindowEventMap[K]) => void,
    options?: boolean | EventListenerOptions
  ): void {
    window.removeEventListener(type, listener, options);
    this.logger.debug("Window event listener removed", { type });
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
  @BrowserOnly
  public getWindowDimensions(): { width: number; height: number } {
    return {
      width: window.innerWidth,
      height: window.innerHeight
    };
  }

  @logMethod
  @BrowserOnly
  public getViewportDimensions(): { width: number; height: number } {
    return {
      width: window.innerWidth,
      height: window.innerHeight
    };
  }
}