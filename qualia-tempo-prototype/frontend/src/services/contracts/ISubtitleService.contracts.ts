/**
 * QUALIA.CODE v1.1 - ISubtitleService Contracts
 * Type definitions for subtitle service configuration.
 */

export interface SubtitleConfig {
  displayDuration: number; // Default display duration in seconds
  fadeInTime: number;      // Fade in animation time in seconds
  fadeOutTime: number;     // Fade out animation time in seconds
  maxLines: number;        // Maximum number of lines to display
  wordWrapLength: number;  // Character limit for word wrapping
  positioning: {
    bottom: number;        // Distance from bottom in pixels
    maxWidth: string;      // Max width CSS value
  };
  styling: {
    fontSize: string;      // Font size CSS value
    fontWeight: string;    // Font weight CSS value
    textAlign: string;     // Text alignment CSS value
    color: string;         // Text color
    backgroundColor: string; // Background color with opacity
    borderRadius: string;  // Border radius CSS value
    padding: string;       // Padding CSS value
  };
}
