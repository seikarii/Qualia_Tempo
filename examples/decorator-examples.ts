// QUALIA.CODE v1.0 - Decorator Usage Examples
// Demonstration of the universal decorator system

import { logMethod, catchError, validate } from '../qualia-tempo-prototype/frontend/src/utils/decorators';
import type { QualiaState } from '../qualia-tempo-prototype/frontend/src/schemas';

export class ExampleService {
  constructor(_logger: any) {}

  /**
   * Example using individual decorators
   */
  @logMethod()
  @validate('QualiaState')
  @catchError({ intensity: 0, precision: 0, aggression: 0, flow: 0, chaos: 0, recovery: 0, transcendence: 0 })
  async processQualiaState(_state: QualiaState): Promise<void> {
    // Simulate async processing
    await new Promise(resolve => setTimeout(resolve, 10));
  }


  /**
   * Example with custom validation and error handling
   */
  @validate('QualiaState')
  @catchError()
  validateAndProcess(state: any): QualiaState {
    // This will throw if validation fails
    return state;
  }
}