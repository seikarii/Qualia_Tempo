import { injectable, inject } from 'inversify';
import { TYPES } from './inversify.types';
import type { IJitterService } from './interfaces/IJitterService';
import type { JitterServiceConfig, JitterOffset, HaltonState } from './contracts/IJitterService.contracts';
import type { ILogger } from './interfaces/ILogger';
import { logMethod, catchError } from '../utils/decorators';

/**
 * JitterService - Camera sub-pixel offset generator for TAA
 * 
 * Generates deterministic jitter sequences using Halton(2,3) for
 * Temporal Anti-Aliasing sub-pixel sampling.
 * 
 * @implements {IJitterService}
 */
@injectable()
export class JitterService implements IJitterService {
  private readonly config: JitterServiceConfig;
  private readonly logger: ILogger;
  private haltonState: HaltonState;

  constructor(
    @inject(TYPES.JitterServiceConfig) config: JitterServiceConfig,
    @inject(TYPES.ILogger) logger: ILogger
  ) {
    this.config = config;
    this.logger = logger;
    this.haltonState = {
      currentIndex: 0,
      totalSamples: config.sampleCount
    };
    
    this.logger.info('JitterService initialized', {
      sampleCount: config.sampleCount,
      strength: config.strength,
      resetOnMove: config.resetOnMove
    });
  }

  /**
   * Generate Halton sequence value for given index and base
   * @param index Sequence index
   * @param base Prime number base (2 or 3 for Halton(2,3))
   * @returns Halton value in [0, 1)
   */
  private halton(index: number, base: number): number {
    let result = 0;
    let f = 1;
    let i = index + 1; // Halton sequence starts at index 1
    
    while (i > 0) {
      f = f / base;
      result = result + f * (i % base);
      i = Math.floor(i / base);
    }
    
    return result;
  }

  @logMethod
  @catchError
  public getJitterOffset(): JitterOffset {
    if (!this.config.enabled) {
      return { x: 0, y: 0 };
    }

    // Generate Halton(2,3) sequence
    const haltonX = this.halton(this.haltonState.currentIndex, 2);
    const haltonY = this.halton(this.haltonState.currentIndex, 3);
    
    // Map from [0,1) to [-0.5, 0.5) and apply strength
    const x = (haltonX - 0.5) * this.config.strength;
    const y = (haltonY - 0.5) * this.config.strength;
    
    return { x, y };
  }

  @logMethod
  public advanceFrame(): void {
    if (!this.config.enabled) {
      return;
    }

    this.haltonState.currentIndex = 
      (this.haltonState.currentIndex + 1) % this.haltonState.totalSamples;
  }

  @logMethod
  public reset(): void {
    this.haltonState.currentIndex = 0;
    this.logger.debug('JitterService reset to frame 0');
  }

  @logMethod
  public getState(): HaltonState {
    return { ...this.haltonState };
  }

  @logMethod
  public isEnabled(): boolean {
    return this.config.enabled;
  }
}
