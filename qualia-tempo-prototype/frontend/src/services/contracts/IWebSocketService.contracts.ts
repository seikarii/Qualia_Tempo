/**
 * QUALIA.CODE v1.1 - WebSocketService Contracts
 * Centralized type definitions for WebSocket service
 *
 * Purpose: Single source of truth for all WebSocket service data structures
 * Architecture: Contract definitions extracted from service implementation for clarity and reusability
 */

import type { ILogger } from "../interfaces/ILogger";
import type { IWebSocketFactory } from "../interfaces/IWebSocketFactory";
import type { BackendSyncConfig } from "./IBackendSyncService.contracts";

// QUALIA.CODE v1.1: Constructor Parameter Object
// Consolidates constructor parameters into a single object to comply with IoC limits
export interface WebSocketServiceParams {
  logger: ILogger;
  webSocketFactory: IWebSocketFactory;
  config: BackendSyncConfig;
}