/**
 * @profile Decorator Test Suite
 * 
 * Comprehensive tests for performance profiling decorator
 * QUALIA.CODE v1.1: Performance Monitoring Pattern Testing
 * Session 30: Frontend implementation tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  profile, 
  getProfilingStats, 
  getAllProfilingStats, 
  clearProfilingStats, 
  exportProfilingStats,
  ProfileOptions 
} from '../profile.decorator';

// Test service class with profiling
class DataService {
  @profile()
  public syncMethod(input: number): number {
    return input * 2;
  }
  
  @profile({ trackMemory: true, logToConsole: false })
  public async asyncMethod(input: string): Promise<string> {
    // Remove setTimeout to avoid Vitest timer issues
    return input.toUpperCase();
  }
  
  @profile({ enabled: false })
  public disabledProfiling(input: number): number {
    return input + 1;
  }
  
  @profile({ label: 'custom-label', logToConsole: false })
  public customLabelMethod(): void {
    // Method implementation
  }
  
  @profile({ thresholdMs: 100, logToConsole: false })
  public thresholdMethod(): void {
    // Fast method (< 100ms threshold)
  }
  
  @profile({ logToConsole: false })
  public throwingMethod(): void {
    throw new Error('Test error');
  }
  
  @profile({ label: 'heavy-calculation', logToConsole: false })
  public heavyCalculation(size: number): number[] {
    const result: number[] = [];
    for (let i = 0; i < size; i++) {
      result.push(Math.random());
    }
    return result;
  }
}

describe('@profile Decorator', () => {
  let service: DataService;
  
  beforeEach(() => {
    service = new DataService();
    clearProfilingStats();  // Clean slate for each test
  });
  
  afterEach(() => {
    clearProfilingStats();
  });
  
  describe('Basic Profiling', () => {
    it('should profile synchronous method execution', () => {
      const result = service.syncMethod(5);
      
      expect(result).toBe(10);  // Method works correctly
      
      const stats = getProfilingStats('DataService.syncMethod');
      expect(stats).toBeDefined();
      expect(stats!.totalCalls).toBe(1);
      expect(stats!.totalDuration).toBeGreaterThanOrEqual(0);  // Fast operations may have 0ms duration
      expect(stats!.avgDuration).toBeGreaterThanOrEqual(0);
    });
    
    it('should profile asynchronous method execution', async () => {
      const result = await service.asyncMethod('test');
      
      expect(result).toBe('TEST');  // Method works correctly
      
      const stats = getProfilingStats('DataService.asyncMethod');
      expect(stats).toBeDefined();
      expect(stats!.totalCalls).toBe(1);
      expect(stats!.totalDuration).toBeGreaterThanOrEqual(0);  // Any duration is fine
    });
    
    it('should not profile when disabled', () => {
      const result = service.disabledProfiling(10);
      
      expect(result).toBe(11);  // Method works correctly
      
      const stats = getProfilingStats('DataService.disabledProfiling');
      expect(stats).toBeUndefined();  // No profiling stats recorded
    });
  });
  
  describe('Custom Labels', () => {
    it('should use custom label instead of method name', () => {
      service.customLabelMethod();
      
      const statsWithCustomLabel = getProfilingStats('custom-label');
      const statsWithMethodName = getProfilingStats('DataService.customLabelMethod');
      
      expect(statsWithCustomLabel).toBeDefined();
      expect(statsWithMethodName).toBeUndefined();
    });
  });
  
  describe('Call Count Tracking', () => {
    it('should track multiple calls', () => {
      service.syncMethod(1);
      service.syncMethod(2);
      service.syncMethod(3);
      
      const stats = getProfilingStats('DataService.syncMethod');
      expect(stats!.totalCalls).toBe(3);
    });
    
    it('should update average duration with each call', () => {
      service.syncMethod(1);
      const stats1 = getProfilingStats('DataService.syncMethod');
      const firstAvg = stats1!.avgDuration;
      
      service.syncMethod(2);
      const stats2 = getProfilingStats('DataService.syncMethod');
      const secondAvg = stats2!.avgDuration;
      
      expect(stats2!.totalCalls).toBe(2);
      expect(secondAvg).toBeDefined();
      // Average should be recalculated
    });
  });
  
  describe('Duration Statistics', () => {
    it('should track min/max duration', () => {
      // Call method multiple times
      for (let i = 0; i < 5; i++) {
        service.syncMethod(i);
      }
      
      const stats = getProfilingStats('DataService.syncMethod');
      expect(stats!.minDuration).toBeDefined();
      expect(stats!.maxDuration).toBeDefined();
      expect(stats!.minDuration).toBeLessThanOrEqual(stats!.maxDuration);
      expect(stats!.avgDuration).toBeGreaterThanOrEqual(stats!.minDuration);
      expect(stats!.avgDuration).toBeLessThanOrEqual(stats!.maxDuration);
    });
  });
  
  describe('Error Handling', () => {
    it('should record profiling data even when method throws', () => {
      try {
        service.throwingMethod();
      } catch (error) {
        // Error expected
      }
      
      const stats = getProfilingStats('DataService.throwingMethod');
      expect(stats).toBeDefined();
      expect(stats!.totalCalls).toBe(1);
      expect(stats!.results[0].error).toBeDefined();
      expect(stats!.results[0].error!.message).toBe('Test error');
    });
    
    it('should re-throw errors without swallowing them', () => {
      expect(() => service.throwingMethod()).toThrow('Test error');
    });
    
    it('should handle async method errors', async () => {
      class AsyncErrorService {
        @profile({ logToConsole: false })
        public async failingMethod(): Promise<void> {
          // Remove setTimeout to avoid Vitest timer issues
          throw new Error('Async error');
        }
      }
      
      const asyncService = new AsyncErrorService();
      
      await expect(asyncService.failingMethod()).rejects.toThrow('Async error');
      
      const stats = getProfilingStats('AsyncErrorService.failingMethod');
      expect(stats!.totalCalls).toBe(1);
      expect(stats!.results[0].error).toBeDefined();
    });
  });
  
  describe('Memory Tracking', () => {
    it('should track memory when enabled (if performance.memory available)', () => {
      // Memory tracking only works in Chrome/Edge
      const hasMemoryAPI = !!(performance as any).memory;
      
      service.heavyCalculation(1000);
      
      const stats = getProfilingStats('heavy-calculation');
      
      if (hasMemoryAPI) {
        expect(stats!.results[0].memoryBefore).toBeDefined();
        expect(stats!.results[0].memoryAfter).toBeDefined();
        expect(stats!.results[0].memoryDelta).toBeDefined();
      } else {
        expect(stats!.results[0].memoryBefore).toBeUndefined();
        expect(stats!.results[0].memoryAfter).toBeUndefined();
        expect(stats!.results[0].memoryDelta).toBeUndefined();
      }
    });
  });
  
  describe('Threshold Filtering', () => {
    it('should not log when duration below threshold', () => {
      const consoleSpy = vi.spyOn(console, 'group');
      
      service.thresholdMethod();  // Should be fast (< 100ms threshold)
      
      expect(consoleSpy).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });
  
  describe('Statistics Retrieval', () => {
    it('should retrieve stats for specific method', () => {
      service.syncMethod(1);
      service.asyncMethod('test');
      
      const syncStats = getProfilingStats('DataService.syncMethod');
      expect(syncStats).toBeDefined();
      expect(syncStats!.totalCalls).toBe(1);
    });
    
    it('should retrieve all profiling stats', () => {
      service.syncMethod(1);
      service.customLabelMethod();
      
      const allStats = getAllProfilingStats();
      expect(allStats.size).toBeGreaterThanOrEqual(2);
      expect(allStats.has('DataService.syncMethod')).toBe(true);
      expect(allStats.has('custom-label')).toBe(true);
    });
    
    it('should return undefined for non-existent stats', () => {
      const stats = getProfilingStats('NonExistentMethod');
      expect(stats).toBeUndefined();
    });
  });
  
  describe('Statistics Clearing', () => {
    it('should clear stats for specific method', () => {
      service.syncMethod(1);
      service.customLabelMethod();
      
      expect(getProfilingStats('DataService.syncMethod')).toBeDefined();
      
      clearProfilingStats('DataService.syncMethod');
      
      expect(getProfilingStats('DataService.syncMethod')).toBeUndefined();
      expect(getProfilingStats('custom-label')).toBeDefined();  // Other stats remain
    });
    
    it('should clear all stats when no parameter provided', () => {
      service.syncMethod(1);
      service.customLabelMethod();
      
      clearProfilingStats();
      
      expect(getAllProfilingStats().size).toBe(0);
    });
  });
  
  describe('Statistics Export', () => {
    it('should export profiling stats as JSON', () => {
      service.syncMethod(1);
      service.syncMethod(2);
      service.customLabelMethod();
      
      const exported = exportProfilingStats();
      
      expect(exported).toBeDefined();
      expect(exported['DataService.syncMethod']).toBeDefined();
      expect(exported['DataService.syncMethod'].totalCalls).toBe(2);
      expect(exported['custom-label']).toBeDefined();
    });
    
    it('should include recent results in export (last 10)', () => {
      // Generate 15 calls
      for (let i = 0; i < 15; i++) {
        service.syncMethod(i);
      }
      
      const exported = exportProfilingStats();
      const recentResults = exported['DataService.syncMethod'].recentResults;
      
      expect(recentResults.length).toBe(10);  // Only last 10
    });
    
    it('should export serializable data', () => {
      service.syncMethod(1);
      
      const exported = exportProfilingStats();
      const json = JSON.stringify(exported);
      const parsed = JSON.parse(json);
      
      expect(parsed['DataService.syncMethod']).toBeDefined();
      expect(parsed['DataService.syncMethod'].totalCalls).toBe(1);
    });
  });
  
  describe('Results Buffer Management', () => {
    it('should limit results buffer to 100 entries', () => {
      // Generate 150 calls
      for (let i = 0; i < 150; i++) {
        service.syncMethod(i);
      }
      
      const stats = getProfilingStats('DataService.syncMethod');
      expect(stats!.results.length).toBeLessThanOrEqual(100);
      expect(stats!.totalCalls).toBe(150);  // Total count still accurate
    });
  });
  
  describe('Metadata Attachment', () => {
    it('should attach profiling metadata to method', () => {
      const metadata = (service.syncMethod as any);
      
      expect(metadata.__profiled__).toBe(true);
      expect(metadata.__profileLabel__).toBe('DataService.syncMethod');
    });
    
    it('should attach custom label metadata', () => {
      const metadata = (service.customLabelMethod as any);
      
      expect(metadata.__profiled__).toBe(true);
      expect(metadata.__profileLabel__).toBe('custom-label');
    });
  });
  
  describe('Performance API Integration', () => {
    it('should use performance.mark and performance.measure', () => {
      const markSpy = vi.spyOn(performance, 'mark');
      const measureSpy = vi.spyOn(performance, 'measure');
      
      service.syncMethod(1);
      
      expect(markSpy).toHaveBeenCalled();
      expect(measureSpy).toHaveBeenCalled();
      
      markSpy.mockRestore();
      measureSpy.mockRestore();
    });
  });
});
