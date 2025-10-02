/**
 * IBrowserEventsService interface
 * Abstraction layer for browser global event handling
 * Provides a testable and mockable interface for window/document events.
 */

import type { IBaseService } from './IBaseService';

export interface IBrowserEventsService extends IBaseService {
  /**
   * Add an event listener to the window object
   */
  addWindowEventListener<K extends keyof WindowEventMap>(
    type: K,
    listener: (event: WindowEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions
  ): void;

  /**
   * Remove an event listener from the window object
   */
  removeWindowEventListener<K extends keyof WindowEventMap>(
    type: K,
    listener: (event: WindowEventMap[K]) => void,
    options?: boolean | EventListenerOptions
  ): void;

  /**
   * Add an event listener to a specific element
   */
  addElementEventListener<K extends keyof HTMLElementEventMap>(
    element: HTMLElement,
    type: K,
    listener: (event: HTMLElementEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions
  ): void;

  /**
   * Remove an event listener from a specific element
   */
  removeElementEventListener<K extends keyof HTMLElementEventMap>(
    element: HTMLElement,
    type: K,
    listener: (event: HTMLElementEventMap[K]) => void,
    options?: boolean | EventListenerOptions
  ): void;

  /**
   * Get current window dimensions
   */
  getWindowDimensions(): { width: number; height: number };

  /**
   * Get current viewport dimensions
   */
  getViewportDimensions(): { width: number; height: number };
}