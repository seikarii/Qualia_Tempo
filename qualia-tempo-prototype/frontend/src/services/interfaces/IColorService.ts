/**
 * IColorService - Color Conversion Service Interface
 * 
 * Provides robust, production-grade color space conversion utilities.
 * Centralizes color conversion logic to eliminate ad-hoc implementations.
 * 
 * ARCHITECTURAL RATIONALE:
 * - Single Responsibility: Dedicated to color space transformations
 * - Testability: Pure function interface enables isolated unit testing
 * - Consistency: Guarantees uniform color conversions across the application
 * - Extensibility: Easy to add new color space conversions (RGB, CMYK, etc.)
 * 
 * @interface IColorService
 */
export interface IColorService {
  /**
   * Converts HSL (Hue, Saturation, Lightness) color to RGB (Red, Green, Blue).
   * 
   * This method uses the industry-standard color-convert library to ensure
   * mathematically accurate color space transformations, replacing the
   * previous "simplified" approximation.
   * 
   * @param h - Hue value in the range [0, 1], where 0 and 1 represent red
   * @param s - Saturation value in the range [0, 1], where 0 is grayscale and 1 is fully saturated
   * @param l - Lightness value in the range [0, 1], where 0 is black and 1 is white
   * @returns A tuple [r, g, b] where each component is in the range [0, 1]
   * 
   * @example
   * ```typescript
   * const colorService = container.get<IColorService>(TYPES.IColorService);
   * const [r, g, b] = colorService.hslToRgb(0.5, 0.7, 0.5); // Cyan-ish color
   * ```
   */
  hslToRgb(h: number, s: number, l: number): [number, number, number];
}
