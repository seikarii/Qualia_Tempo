// IStateStreamingService.ts
export interface IStateStreamingService {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getConnectionStatus(): ConnectionStatus;
}

export interface ConnectionStatus {
  connected: boolean;
  state: "IDLE" | "CONNECTING" | "CONNECTED" | "DISCONNECTED" | "ERROR";
  lastStateUpdate?: number;
}