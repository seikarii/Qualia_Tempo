/**
 * QUALIA.CODE v1.1 - Audio System Bridge Configuration Contracts
 * Defines the configuration structure for audio session management in Electron.
 *
 * CRITICAL: This contract follows Direct Configuration Injection pattern.
 * Services consuming this configuration must inject AudioSessionConfig directly,
 * NOT IConfigurationService.
 */

/**
 * AudioSessionConfig: Configuration for Windows audio session management
 * 
 * This configuration is used to set up the audio session properties in Electron's
 * main process for optimal audio performance and prioritization.
 * 
 * @property category - The audio session category (e.g., 'game', 'media', 'communications')
 * @property mode - The audio session mode (e.g., 'default', 'voice', 'measurement')
 * @property options - Additional audio session options (e.g., 'mixWithOthers', 'duckOthers')
 * @property priority - Priority level for the audio session (0-100, higher = more important)
 * @property enabled - Whether audio session configuration is enabled
 */
export interface AudioSessionConfig {
  /**
   * The audio session category determines how the app's audio interacts with the system.
   * - 'game': Optimized for game audio with low latency
   * - 'media': For music/video playback
   * - 'communications': For voice chat/calls
   */
  category: 'game' | 'media' | 'communications' | 'ambient';
  
  /**
   * The audio session mode affects audio processing behavior.
   * - 'default': Standard audio processing
   * - 'voice': Optimized for voice with echo cancellation
   * - 'measurement': For audio analysis with minimal processing
   */
  mode: 'default' | 'voice' | 'measurement' | 'videoRecording';
  
  /**
   * Options that modify audio session behavior.
   */
  options: {
    /**
     * Whether to mix audio with other apps (true) or be exclusive (false)
     */
    mixWithOthers: boolean;
    
    /**
     * Whether to reduce volume of other apps when this app plays audio
     */
    duckOthers: boolean;
    
    /**
     * Whether audio continues when app is in background
     */
    allowBackgroundPlayback: boolean;
  };
  
  /**
   * Priority level (0-100). Higher values get preference in audio routing.
   * Game audio typically uses 80-90 for responsive feedback.
   */
  priority: number;
  
  /**
   * Master switch to enable/disable audio session configuration.
   * Useful for testing or platform-specific behavior.
   */
  enabled: boolean;
}
