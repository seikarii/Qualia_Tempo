// IStateStreamingService.ts
import type { ConnectionStatus } from "../contracts/events.contracts";

export interface IStateStreamingService {
  start(): Promise<void>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getConnectionStatus(): ConnectionStatus;
}