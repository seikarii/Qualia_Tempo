/**
 * QUALIA.CODE v1.1 - GameStateStore
 * Concrete implementation of IGameStateStore interface.
 *
 * This class provides a bridge between the IoC container and the Zustand store,
 * allowing services to access store functionality in a decoupled manner.
 */

import { injectable, inject } from "inversify";
import { TYPES } from "./inversify.types";
import type { IGameStateStore } from "./interfaces/IGameStateStore";
import type { NotificationServiceConfig } from "./contracts/INotificationService.contracts";
import type { ExtendedNotification } from "./NotificationService";

// Define the type for the game store API
type GameStoreApi = {
  setState: (_fn: (state: any) => any) => void;
  getState: () => any;
};

// Define the Notification type locally to avoid direct dependency
type Notification = {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  timestamp: number;
  autoHide?: boolean;
  duration?: number;
};

@injectable()
export class GameStateStore implements IGameStateStore {
  private readonly config: NotificationServiceConfig;
  private storeApi!: GameStoreApi;

  constructor(
    @inject(TYPES.NotificationServiceConfig) config: NotificationServiceConfig
  ) {
    this.config = config;
  }

  public setStoreApi(api: GameStoreApi): void {
    this.storeApi = api;
  }
  /**
   * Set notifications in the store.
   * Used by NotificationService to update the UI with current notifications.
   */
  setNotifications(notifications: ExtendedNotification[]): void {
    // Convert ExtendedNotification to store-compatible Notification format
    const storeNotifications: Notification[] = notifications
      .filter((notification) =>
        ["info", "success", "warning", "error"].includes(notification.type),
      )
      .map((notification) => ({
        id: notification.id,
        type: notification.type as "info" | "success" | "warning" | "error",
        title: notification.message, // Use message as title since ExtendedNotification doesn't have title
        message: notification.message,
        timestamp: notification.timestamp.getTime(),
        autoHide: notification.metadata?.autoHide ?? true,
        duration: notification.metadata?.duration ?? this.config.display.notificationDuration,
      }));

    this.storeApi.setState((state) => ({
      ...state,
      notifications: storeNotifications,
    }));
  }

  /**
   * Get current notifications from the store.
   */
  getNotifications(): ExtendedNotification[] {
    const state = this.storeApi.getState();
    return state.notifications.map((notification: Notification) => ({
      id: notification.id,
      type: notification.type,
      message: notification.message,
      timestamp: new Date(notification.timestamp),
      priority: "normal" as const,
      category: "general",
      source: "GameStateStore",
      displayed: true,
      dismissed: false,
      retryCount: 0,
    }));
  }

  /**
   * Update game state in the store.
   */
  updateGameState(state: any): void {
    this.storeApi.setState((currentState) => ({
      ...currentState,
      ...state,
    }));
  }

  /**
   * Get current game state from the store.
   */
  getGameState(): any {
    return this.storeApi.getState();
  }

  /**
   * Update qualia state in the store.
   */
  updateQualiaState(state: any): void {
    this.storeApi.setState((currentState) => ({
      ...currentState,
      qualiaState: { ...state },
    }));
  }

  /**
   * Get current qualia state from the store.
   */
  getQualiaState(): any {
    const state = this.storeApi.getState();
    return state.qualiaState;
  }
}
