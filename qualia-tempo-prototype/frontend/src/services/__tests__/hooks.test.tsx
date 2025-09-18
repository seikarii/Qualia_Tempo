/**
 * Tests for Service Hooks
 * React hooks for accessing services from CompositionRoot
 */

import { renderHook } from '@testing-library/react';
import React from 'react';
import {
  useService,
  useEventBus,
  useQualiaCalculator,
  useBackendSync,
  useGameController,
  useConfiguration,
} from '../hooks';
import { ServiceContext } from '../CompositionRoot.contexts';

// Mock service container with proper typing
const mockServiceContainer: any = {
  eventBus: { emit: jest.fn(), subscribe: jest.fn() },
  qualiaCalculator: { calculate: jest.fn() },
  backendSync: { sync: jest.fn() },
  gameController: { start: jest.fn() },
  configService: { getConfig: jest.fn() },
  gameStateStore: { getStatus: jest.fn() },
  errorReporting: { reportError: jest.fn() },
  debugService: { log: jest.fn() },
  rhythmicMovement: { move: jest.fn() },
  audioService: { play: jest.fn() },
};

// Provider wrapper for testing hooks with context
const createWrapper = (services: any) => {
  return ({ children }: { children: React.ReactNode }) => (
    <ServiceContext.Provider value={services}>
      {children}
    </ServiceContext.Provider>
  );
};

describe('Service Hooks', () => {
  describe('useServices', () => {
    it('should return all services when context is provided', () => {
      const { result } = renderHook(() => useServices(), {
        wrapper: createWrapper(mockServiceContainer),
      });

      expect(result.current).toBe(mockServiceContainer);
      expect(result.current.eventBus).toBeDefined();
      expect(result.current.qualiaCalculator).toBeDefined();
      expect(result.current.backendSync).toBeDefined();
      expect(result.current.gameController).toBeDefined();
      expect(result.current.configService).toBeDefined();
    });

    it('should throw error when used outside of provider', () => {
      // Suppress console.error for expected error
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        renderHook(() => useServices());
      }).toThrow('useServices must be used within a CompositionRootProvider');
      
      consoleError.mockRestore();
    });

    it('should throw error when context value is null', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        renderHook(() => useServices(), {
          wrapper: createWrapper(null),
        });
      }).toThrow('useServices must be used within a CompositionRootProvider');
      
      consoleError.mockRestore();
    });

    it('should throw error when context value is undefined', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        renderHook(() => useServices(), {
          wrapper: createWrapper(undefined),
        });
      }).toThrow('useServices must be used within a CompositionRootProvider');
      
      consoleError.mockRestore();
    });
  });

  describe('useEventBus', () => {
    it('should return eventBus service', () => {
      const { result } = renderHook(() => useEventBus(), {
        wrapper: createWrapper(mockServiceContainer),
      });

      expect(result.current).toBe(mockServiceContainer.eventBus);
    });

    it('should throw error when used outside of provider', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        renderHook(() => useEventBus());
      }).toThrow('useServices must be used within a CompositionRootProvider');
      
      consoleError.mockRestore();
    });
  });

  describe('useQualiaCalculator', () => {
    it('should return qualiaCalculator service', () => {
      const { result } = renderHook(() => useQualiaCalculator(), {
        wrapper: createWrapper(mockServiceContainer),
      });

      expect(result.current).toBe(mockServiceContainer.qualiaCalculator);
    });

    it('should throw error when used outside of provider', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        renderHook(() => useQualiaCalculator());
      }).toThrow('useServices must be used within a CompositionRootProvider');
      
      consoleError.mockRestore();
    });
  });

  describe('useBackendSync', () => {
    it('should return backendSync service', () => {
      const { result } = renderHook(() => useBackendSync(), {
        wrapper: createWrapper(mockServiceContainer),
      });

      expect(result.current).toBe(mockServiceContainer.backendSync);
    });

    it('should throw error when used outside of provider', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        renderHook(() => useBackendSync());
      }).toThrow('useServices must be used within a CompositionRootProvider');
      
      consoleError.mockRestore();
    });
  });

  describe('useGameController', () => {
    it('should return gameController service', () => {
      const { result } = renderHook(() => useGameController(), {
        wrapper: createWrapper(mockServiceContainer),
      });

      expect(result.current).toBe(mockServiceContainer.gameController);
    });

    it('should throw error when used outside of provider', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        renderHook(() => useGameController());
      }).toThrow('useServices must be used within a CompositionRootProvider');
      
      consoleError.mockRestore();
    });
  });

  describe('useConfiguration', () => {
    it('should return configService', () => {
      const { result } = renderHook(() => useConfiguration(), {
        wrapper: createWrapper(mockServiceContainer),
      });

      expect(result.current).toBe(mockServiceContainer.configService);
    });

    it('should throw error when used outside of provider', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        renderHook(() => useConfiguration());
      }).toThrow('useServices must be used within a CompositionRootProvider');
      
      consoleError.mockRestore();
    });
  });

  describe('Integration Tests', () => {
    it('should allow multiple hooks to be used together', () => {
      const { result: servicesResult } = renderHook(() => useServices(), {
        wrapper: createWrapper(mockServiceContainer),
      });
      const { result: eventBusResult } = renderHook(() => useEventBus(), {
        wrapper: createWrapper(mockServiceContainer),
      });
      const { result: configResult } = renderHook(() => useConfiguration(), {
        wrapper: createWrapper(mockServiceContainer),
      });

      expect(servicesResult.current).toBe(mockServiceContainer);
      expect(eventBusResult.current).toBe(mockServiceContainer.eventBus);
      expect(configResult.current).toBe(mockServiceContainer.configService);
    });

    it('should maintain referential equality across multiple renders', () => {
      const { result, rerender } = renderHook(() => useEventBus(), {
        wrapper: createWrapper(mockServiceContainer),
      });

      const firstResult = result.current;
      rerender();
      const secondResult = result.current;

      expect(firstResult).toBe(secondResult);
      expect(firstResult).toBe(mockServiceContainer.eventBus);
    });

    it('should handle service container updates', () => {
      // Test that hooks respond to context changes
      let currentServices = mockServiceContainer;
      
      const DynamicWrapper = ({ children }: { children: React.ReactNode }) => (
        <ServiceContext.Provider value={currentServices}>
          {children}
        </ServiceContext.Provider>
      );

      const { result, rerender } = renderHook(() => useEventBus(), {
        wrapper: DynamicWrapper,
      });

      expect(result.current).toBe(mockServiceContainer.eventBus);

      // Update the services reference
      const updatedServices = {
        ...mockServiceContainer,
        eventBus: { emit: jest.fn(), subscribe: jest.fn() },
      };
      
      currentServices = updatedServices;
      
      // Force a re-render to pick up the new context value
      rerender();

      expect(result.current).toBe(updatedServices.eventBus);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle partial service container', () => {
      const partialServices = {
        eventBus: mockServiceContainer.eventBus,
        // Missing other services
      };

      const { result } = renderHook(() => useEventBus(), {
        wrapper: createWrapper(partialServices),
      });

      expect(result.current).toBe(partialServices.eventBus);

      // This should throw since qualiaCalculator is missing
      const { result: errorResult } = renderHook(() => useQualiaCalculator(), {
        wrapper: createWrapper(partialServices),
      });

      expect(errorResult.current).toBeUndefined();
    });

    it('should handle empty service container', () => {
      const { result } = renderHook(() => useServices(), {
        wrapper: createWrapper({}),
      });

      expect(result.current).toEqual({});
    });
  });
});
