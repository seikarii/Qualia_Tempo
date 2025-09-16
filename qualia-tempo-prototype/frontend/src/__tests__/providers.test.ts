/**
 * Test for providers.ts - Re-export module
 * 
 * This test verifies that the providers.ts module correctly re-exports
 * the CompositionRootProvider from the services module, following
 * QUALIA.CODE v1.0 patterns for avoiding direct service imports.
 */

// Mock the CompositionRoot.provider to avoid Tone.js import issues
jest.mock('../services/CompositionRoot.provider', () => ({
  CompositionRootProvider: jest.fn(({ children }) => children)
}));

describe('providers.ts - Re-export Module', () => {
  it('should re-export CompositionRootProvider', () => {
    // Import the re-exported provider
    const { CompositionRootProvider } = require('../providers');
    
    // Verify that the provider is properly re-exported
    expect(CompositionRootProvider).toBeDefined();
    expect(typeof CompositionRootProvider).toBe('function');
  });

  it('should provide the same reference as direct import', () => {
    // Import from both locations
    const { CompositionRootProvider: ReExported } = require('../providers');
    const { CompositionRootProvider: Direct } = require('../services/CompositionRoot.provider');
    
    // Verify they are the same reference
    expect(ReExported).toBe(Direct);
  });

  it('should follow QUALIA.CODE re-export pattern', () => {
    // Verify the module exports exist
    const providers = require('../providers');
    
    // Should have CompositionRootProvider export
    expect(providers).toHaveProperty('CompositionRootProvider');
    
    // Should be a React component (function)
    expect(typeof providers.CompositionRootProvider).toBe('function');
  });

  it('should only export expected components', () => {
    const providers = require('../providers');
    const keys = Object.keys(providers);
    
    // Should only export CompositionRootProvider
    expect(keys).toEqual(['CompositionRootProvider']);
  });
});
