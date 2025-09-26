/**
 * QUALIA.CODE v1.1 - GameStateStore
 * Concrete implementation of IGameStateStore interface.
 *
 * This class provides a bridge between the IoC container and the Zustand store,
 * allowing services to access store functionality in a decoupled manner.
 */

import { injectable } from "inversify";
import type { IGameStateStore } from "./interfaces/IGameStateStore";
import type { ExtendedNotification } from "./NotificationService";
import { useGameStore, type Notification } from "../state/useGameStore";

@injectable()
export class GameStateStore implements IGameStateStore {
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
        duration: notification.metadata?.duration ?? 3000, // From notification-service.yaml
      }));

    useGameStore.setState((state) => ({
      ...state,
      notifications: storeNotifications,
    }));
  }

  /**
   * Get current notifications from the store.
   */
  getNotifications(): ExtendedNotification[] {
    const state = useGameStore.getState();
    return state.notifications.map((notification) => ({
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
    useGameStore.setState((currentState) => ({
      ...currentState,
      ...state,
    }));
  }

  /**
   * Get current game state from the store.
   */
  getGameState(): any {
    return useGameStore.getState();
  }

  /**
   * Update qualia state in the store.
   */
  updateQualiaState(state: any): void {
    useGameStore.setState((currentState) => ({
      ...currentState,
      qualiaState: { ...state },
    }));
  }

  /**
   * Get current qualia state from the store.
   */
  getQualiaState(): any {
    const state = useGameStore.getState();
    return state.qualiaState;
  }
}
