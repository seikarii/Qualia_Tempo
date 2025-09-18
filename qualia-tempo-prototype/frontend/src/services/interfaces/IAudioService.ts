/**
 * QUALIA.CODE v1.1 - IAudioService Interface
 * Audio playback and management interface.
 */

export interface IAudioService {
  /**
   * Initialize the audio service and load audio assets.
   * @returns Promise that resolves when service is ready
   */
  start(): Promise<void>;

  /**
   * Stop the audio service and clean up resources.
   * @returns Promise that resolves when service is stopped
   */
  stop(): Promise<void>;

  /**
   * Play a specific sound by its identifier.
   * @param soundId The unique identifier for the sound
   * @param options Optional playback configuration
   */
  playSound(soundId: string, options?: {
    volume?: number;
    loop?: boolean;
    delay?: number;
  }): void;

  /**
   * Stop a currently playing sound.
   * @param soundId The unique identifier for the sound
   */
  stopSound(soundId: string): void;

  /**
   * Set the master volume for all audio.
   * @param volume Volume level (0.0 to 1.0)
   */
  setMasterVolume(volume: number): void;

  /**
   * Get the current master volume.
   * @returns The current master volume (0.0 to 1.0)
   */
  getMasterVolume(): number;

  /**
   * Check if the audio service is currently running.
   * @returns True if the service is active
   */
  isRunning(): boolean;

  /**
   * Preload audio assets for faster playback.
   * @param soundIds Array of sound identifiers to preload
   * @returns Promise that resolves when preloading is complete
   */
  preloadSounds(soundIds: string[]): Promise<void>;
}