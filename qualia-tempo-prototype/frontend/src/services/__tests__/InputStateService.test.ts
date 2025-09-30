/**
 * InputStateService Tests
 * QUALIA.CODE Compliance: Verifica el nuevo modelo de sondeo de estado
 * que soluciona el problema del movimiento diagonal
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InputStateService } from '../InputStateService';

describe('InputStateService - State Polling Model', () => {
  let inputStateService: InputStateService;

  beforeEach(() => {
    inputStateService = new InputStateService();
  });

  describe('Basic Key Management', () => {
    it('should register pressed keys correctly', () => {
      inputStateService.pressKey('w');
      expect(inputStateService.isKeyPressed('w')).toBe(true);
      expect(inputStateService.isKeyPressed('a')).toBe(false);
    });

    it('should handle key release correctly', () => {
      inputStateService.pressKey('w');
      expect(inputStateService.isKeyPressed('w')).toBe(true);
      
      inputStateService.releaseKey('w');
      expect(inputStateService.isKeyPressed('w')).toBe(false);
    });

    it('should handle case insensitive keys', () => {
      inputStateService.pressKey('W');
      expect(inputStateService.isKeyPressed('w')).toBe(true);
      expect(inputStateService.isKeyPressed('W')).toBe(true);
    });
  });

  describe('Direction Vector Calculation - The Core Fix', () => {
    it('should return zero vector when no keys are pressed', () => {
      const vector = inputStateService.getDirectionVector();
      expect(vector).toEqual({ x: 0, z: 0 });
    });

    it('should handle single direction movements', () => {
      // North (W key)
      inputStateService.pressKey('w');
      expect(inputStateService.getDirectionVector()).toEqual({ x: 0, z: -1 });
      
      inputStateService.releaseKey('w');
      
      // South (S key)
      inputStateService.pressKey('s');
      expect(inputStateService.getDirectionVector()).toEqual({ x: 0, z: 1 });
      
      inputStateService.releaseKey('s');
      
      // East (D key)
      inputStateService.pressKey('d');
      expect(inputStateService.getDirectionVector()).toEqual({ x: 1, z: 0 });
      
      inputStateService.releaseKey('d');
      
      // West (A key)
      inputStateService.pressKey('a');
      expect(inputStateService.getDirectionVector()).toEqual({ x: -1, z: 0 });
    });

    it('should handle diagonal movements - THE CRITICAL TEST', () => {
      // Northeast (W + D)
      inputStateService.pressKey('w');
      inputStateService.pressKey('d');
      expect(inputStateService.getDirectionVector()).toEqual({ x: 1, z: -1 });
      
      inputStateService.releaseKey('w');
      inputStateService.releaseKey('d');
      
      // Southwest (S + A)
      inputStateService.pressKey('s');
      inputStateService.pressKey('a');
      expect(inputStateService.getDirectionVector()).toEqual({ x: -1, z: 1 });
      
      inputStateService.releaseKey('s');
      inputStateService.releaseKey('a');
      
      // Northwest (W + A)
      inputStateService.pressKey('w');
      inputStateService.pressKey('a');
      expect(inputStateService.getDirectionVector()).toEqual({ x: -1, z: -1 });
      
      inputStateService.releaseKey('w');
      inputStateService.releaseKey('a');
      
      // Southeast (S + D)
      inputStateService.pressKey('s');
      inputStateService.pressKey('d');
      expect(inputStateService.getDirectionVector()).toEqual({ x: 1, z: 1 });
    });

    it('should handle arrow keys equivalently', () => {
      // Arrow keys should work the same as WASD
      inputStateService.pressKey('arrowup');
      inputStateService.pressKey('arrowright');
      expect(inputStateService.getDirectionVector()).toEqual({ x: 1, z: -1 });
      
      inputStateService.releaseKey('arrowup');
      inputStateService.releaseKey('arrowright');
      
      // Mixed WASD and arrow keys
      inputStateService.pressKey('w');
      inputStateService.pressKey('arrowright');
      expect(inputStateService.getDirectionVector()).toEqual({ x: 1, z: -1 });
    });

    it('should handle complex simultaneous inputs', () => {
      // Press all four direction keys (should cancel out)
      inputStateService.pressKey('w');
      inputStateService.pressKey('s');
      inputStateService.pressKey('a');
      inputStateService.pressKey('d');
      expect(inputStateService.getDirectionVector()).toEqual({ x: 0, z: 0 });
      
      // Release opposing keys, should result in diagonal
      inputStateService.releaseKey('s'); // Release south, keep north
      inputStateService.releaseKey('a'); // Release west, keep east
      expect(inputStateService.getDirectionVector()).toEqual({ x: 1, z: -1 }); // Northeast
    });
  });

  describe('Architectural Compliance', () => {
    it('should maintain state between multiple calls', () => {
      inputStateService.pressKey('w');
      inputStateService.pressKey('d');
      
      // Multiple calls should return same result
      const vector1 = inputStateService.getDirectionVector();
      const vector2 = inputStateService.getDirectionVector();
      expect(vector1).toEqual(vector2);
      expect(vector1).toEqual({ x: 1, z: -1 });
    });

    it('should handle rapid key press/release cycles', () => {
      // Simulate rapid key presses like a real game scenario
      for (let i = 0; i < 10; i++) {
        inputStateService.pressKey('w');
        inputStateService.pressKey('d');
        expect(inputStateService.getDirectionVector()).toEqual({ x: 1, z: -1 });
        
        inputStateService.releaseKey('w');
        expect(inputStateService.getDirectionVector()).toEqual({ x: 1, z: 0 });
        
        inputStateService.releaseKey('d');
        expect(inputStateService.getDirectionVector()).toEqual({ x: 0, z: 0 });
      }
    });
  });
});