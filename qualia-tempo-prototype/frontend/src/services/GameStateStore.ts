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
import type { GameState } from "./contracts/IGameControllerService.contracts";
import type { QualiaState } from "../types/contracts";
import { NOTIFICATION_DEFAULTS } from "./contracts/constants";

// Define the type for the game store API
type GameStoreApi = {
  setState: (_fn: (_state: Record<string, unknown>) => Record<string, unknown>) => void;
  getState: () => Record<string, unknown>;
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
   * @validate-exempt ExtendedNotification is internal type, already validated by NotificationService
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
        autoHide: typeof notification.metadata?.autoHide === 'boolean' ? notification.metadata.autoHide : true,
        duration: typeof notification.metadata?.duration === 'number' ? notification.metadata.duration : this.config.display.notificationDuration,
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
    const state = this.storeApi.getState() as { notifications?: Notification[] };
    const notifications = state.notifications ?? [];
    return notifications.map((notification: Notification) => ({
      id: notification.id,
      type: notification.type,
      message: notification.message,
      timestamp: new Date(notification.timestamp),
      priority: NOTIFICATION_DEFAULTS.PRIORITY,
      category: NOTIFICATION_DEFAULTS.CATEGORY,
      source: NOTIFICATION_DEFAULTS.SOURCE,
      displayed: true,
      dismissed: false,
      retryCount: 0,
    }));
  }

  /**
   * Update game state in the store.
   * @validate-exempt GameState is internal type, validated at service boundaries
   */
  updateGameState(state: Partial<GameState>): void {
    this.storeApi.setState((currentState) => ({
      ...currentState,
      ...state,
    }));
  }

    /**
   * Get current game state from the store.
   */
  getGameState(): GameState {
    const state = this.storeApi.getState();
    return (state as { gameState?: GameState }).gameState ?? ({} as GameState);
  }

  /**
   * Update qualia state in the store.
   * @validate-exempt QualiaState is internal type, validated at service boundaries
   */
  updateQualiaState(state: Partial<QualiaState>): void {
    this.storeApi.setState((currentState) => ({
      ...currentState,
      qualiaState: {
        ...((currentState as { qualiaState?: QualiaState }).qualiaState ?? {}),
        ...state,
      },
    }));
  }

  /**
   * Get current qualia state from the store.
   */
  getQualiaState(): QualiaState {
    const state = this.storeApi.getState();
    return (state as { qualiaState?: QualiaState }).qualiaState ?? ({} as QualiaState);
  }
}
