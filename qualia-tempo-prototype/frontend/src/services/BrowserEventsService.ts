import { injectable, inject } from "inversify";
import { TYPES } from "./inversify.types";
import { logMethod, BrowserOnly } from "../utils/decorators";
import type { ILogger } from "./interfaces/ILogger";
import type { IBrowserEventsService } from "./interfaces/IBrowserEventsService";
import type { IEventBus } from "./interfaces/IEventBus";
import type { ErrorEvent } from "./contracts/events.contracts";

/**
 * QUALIA.CODE v1.1 Compliant BrowserEventsService
 * Active lifecycle service for browser global event handling
 * Manages global event listeners and emits domain events on EventBus.
 */
@injectable()
export class BrowserEventsService implements IBrowserEventsService {
  private readonly logger: ILogger;
  private readonly eventBus: IEventBus;

  constructor(
    @inject(TYPES.ILogger) logger: ILogger,
    @inject(TYPES.IEventBus) eventBus: IEventBus
  ) {
    this.logger = logger;
    this.eventBus = eventBus;
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
  // @validate-exempt: HTMLElement is browser DOM type (trusted API)
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

  @logMethod
  public initialize(): void {
    this.addWindowEventListener('unhandledrejection', this.handleUnhandledRejection);
    this.logger.info('BrowserEventsService initialized and listening for global events.');
  }

  @logMethod
  public cleanup(): void {
    this.removeWindowEventListener('unhandledrejection', this.handleUnhandledRejection);
    this.logger.info('BrowserEventsService cleaned up global event listeners.');
  }

  private handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
    this.logger.warn('Caught unhandled promise rejection at global level.', { reason: event.reason });
    const error = event.reason instanceof Error
      ? event.reason
      : new Error('Unhandled promise rejection: ' + String(event.reason));

    this.eventBus.emit<ErrorEvent>({
      type: 'Error',
      source: 'BrowserGlobal',
      error,
      severity: 'high'
    });
  };
}