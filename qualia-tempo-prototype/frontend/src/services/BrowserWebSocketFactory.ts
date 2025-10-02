/**
 * QUALIA.CODE v1.1 - BrowserWebSocketFactory
 * 
 * Browser-specific implementation of IWebSocketFactory.
 * Encapsulates the native WebSocket API for dependency injection.
 * 
 * ARCHITECTURE PATTERN: Factory Pattern + Dependency Injection
 * This factory is the ONLY place where native WebSocket is instantiated.
 */

import { injectable } from 'inversify';
import { IWebSocketFactory } from './interfaces/IWebSocketFactory';
import { BrowserOnly } from '../utils/decorators';

@injectable()
export class BrowserWebSocketFactory implements IWebSocketFactory {
  /**
   * Create a new WebSocket instance
   * @param url - WebSocket server URL
   * @returns WebSocket instance
   * 
   * @BrowserOnly ensures this method only executes in browser environments,
   * preventing crashes in SSR or Node.js test environments.
   */
  @BrowserOnly
  public create(url: string): WebSocket {
    return new WebSocket(url);
  }
}
