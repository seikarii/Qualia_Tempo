import { describe, test, expect, beforeEach, afterEach, it, vi } from 'vitest';
/**
 * Test for providers.ts - Re-export module
 * 
 * This test verifies that the providers.ts module correctly re-exports
 * the CompositionRootProvider from the services module, following
 * QUALIA.CODE v1.0 patterns for avoiding direct service imports.
 */

// Mock the CompositionRoot.provider to avoid Tone.js import issues
vi.mock('../services/CompositionRoot.provider', () => ({
  CompositionRootProvider: vi.fn(({ children }) => children)
}));

describe('providers.ts - Re-export Module', () => {
  it('should re-export CompositionRootProvider', async () => {
    // Import the re-exported provider using dynamic import
    const { CompositionRootProvider } = await import('../providers');
    
    // Verify that the provider is properly re-exported
    expect(CompositionRootProvider).toBeDefined();
    expect(typeof CompositionRootProvider).toBe('function');
  });

  it('should provide the same reference as direct import', async () => {
    // Import from both locations using dynamic import
    const { CompositionRootProvider: ReExported } = await import('../providers');
    const { CompositionRootProvider: Direct } = await import('../services/CompositionRoot.provider');
    
    // Verify they are the same reference
    expect(ReExported).toBe(Direct);
  });

  it('should follow QUALIA.CODE re-export pattern', async () => {
    // Verify the module exports exist using dynamic import
    const providers = await import('../providers');
    
    // Should have CompositionRootProvider export
    expect(providers).toHaveProperty('CompositionRootProvider');
    
    // Should be a React component (function)
    expect(typeof providers.CompositionRootProvider).toBe('function');
  });

  it('should only export expected components', async () => {
    const providers = await import('../providers');
    const keys = Object.keys(providers);
    
    // Should only export CompositionRootProvider
    expect(keys).toEqual(['CompositionRootProvider']);
  });
});
