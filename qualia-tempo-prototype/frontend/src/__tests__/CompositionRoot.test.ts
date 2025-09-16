/**
 * QUALIA.CODE v1.0 - CompositionRoot.test.ts
 * Comprehensive test suite for CompositionRoot IoC container
 * 
 * Test Coverage:
 * - Constructor and service instantiation
 * - Service initialization phases and dependency order
 * - Error handling and retry mechanisms
 * - Health monitoring and service status
 * - Graceful shutdown and cleanup
 * - Configuration management
 */

// Mock external dependencies that cause import issues
jest.mock('tone', () => ({}));
jest.mock('../audio/OntologicalAudioEngine', () => ({
  OntologicalAudioEngine: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    updateQualia: jest.fn(),
  })),
}));

// Mock ConfigurationService with pre-loaded config
jest.mock('../services/ConfigurationService', () => {
  return {
    ConfigurationService: jest.fn().mockImplementation(() => ({
      isLoaded: jest.fn().mockReturnValue(true),
      loadConfig: jest.fn().mockResolvedValue(undefined),
      getConfig: jest.fn().mockReturnValue({
        services: {
          rhythmicMovement: {
            bpm: 120,
            perfectTiming: 100,
            goodTiming: 200,
            gridSize: 8,
            slowdownFactor: 0.5,
          },
          backend: {
            baseURL: 'http://localhost:8000',
            healthCheckInterval: 30000,
            retryAttempts: 3,
            requestTimeout: 5000,
            throttleMs: 250,
            maxBatchSize: 10,
          },
          errorReporting: {
            rateLimitWindow: 60000,
            maxErrorsPerWindow: 10,
            batchSize: 5,
            batchTimeout: 30000,
            maxRetentionTime: 3600000,
            externalServiceUrl: 'https://api.error-reporting.service/reports',
            retryAttempts: 3,
          },
          debug: {
            maxSessionHistory: 10,
            maxEventHistory: 500,
            performanceMonitoringInterval: 5000,
            aiAnalysisInterval: 30000,
            enableAIAnalysis: true,
            enablePerformanceMonitoring: true,
            enableGlobalInterface: true,
            memoryCleanupThreshold: 1000,
          },
        },
        game: {
          defaultMode: 'rhythm',
          enableSlowMotion: true,
          pauseOnVisibilityChange: true,
        },
        qualiaCalculation: {
          baseDecay: 0.95,
          intensityWeight: 0.3,
          precisionWeight: 0.4,
          flowWeight: 0.2,
          chaosWeight: 0.1,
        },
      }),
      getGameConfig: jest.fn().mockReturnValue({
        defaultMode: 'rhythm',
        enableSlowMotion: true,
        pauseOnVisibilityChange: true,
      }),
      getQualiaConfig: jest.fn().mockReturnValue({
        baseDecay: 0.95,
        intensityWeight: 0.3,
        precisionWeight: 0.4,
        flowWeight: 0.2,
        chaosWeight: 0.1,
      }),
      getBackendConfig: jest.fn().mockReturnValue({
        baseURL: 'http://localhost:8000',
        healthCheckInterval: 30000,
        retryAttempts: 3,
        requestTimeout: 5000,
        throttleMs: 250,
        maxBatchSize: 10,
      }),
      getServicesConfig: jest.fn().mockReturnValue({
        rhythmicMovement: {
          bpm: 120,
          perfectTiming: 100,
          goodTiming: 200,
          gridSize: 8,
          slowdownFactor: 0.5,
        },
        backend: {
          baseURL: 'http://localhost:8000',
          healthCheckInterval: 30000,
          retryAttempts: 3,
          requestTimeout: 5000,
          throttleMs: 250,
          maxBatchSize: 10,
        },
        backendSync: {
          maxRetries: 3,
          retryDelay: 1000,
          connectionTimeout: 5000,
        },
        errorReporting: {
          rateLimitWindow: 60000,
          maxErrorsPerWindow: 10,
          batchSize: 5,
          batchTimeout: 30000,
          maxRetentionTime: 3600000,
          externalServiceUrl: 'https://api.error-reporting.service/reports',
          retryAttempts: 3,
        },
        debug: {
          maxSessionHistory: 10,
          maxEventHistory: 500,
          performanceMonitoringInterval: 5000,
          aiAnalysisInterval: 30000,
          enableAIAnalysis: true,
          enablePerformanceMonitoring: true,
          enableGlobalInterface: true,
          memoryCleanupThreshold: 1000,
        },
      }),
    })),
  };
});

// Mock useGameStore
jest.mock('../state/useGameStore', () => ({
  useGameStore: {
    setState: jest.fn(),
  },
}));

import { CompositionRoot, CompositionRootConfig } from '../services/CompositionRoot';

// Mock performance.now for timing tests
const mockPerformanceNow = jest.fn();
Object.defineProperty(window, 'performance', {
  writable: true,
  value: {
    now: mockPerformanceNow,
  },
});

// Mock console methods
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});

// Mock window.setInterval and clearInterval
const mockSetInterval = jest.spyOn(window, 'setInterval').mockImplementation((_callback, _delay) => {
  return 123 as any; // Return fake interval ID
});
const mockClearInterval = jest.spyOn(window, 'clearInterval').mockImplementation(() => {});

describe('CompositionRoot', () => {
  let compositionRoot: CompositionRoot;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    mockPerformanceNow.mockReturnValue(1000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with default configuration', () => {
      compositionRoot = new CompositionRoot();

      const config = compositionRoot.getConfig();
      expect(config.autoStart).toBe(true);
      expect(config.enableBackendSync).toBe(true);
      expect(config.enableHealthMonitoring).toBe(true);
      expect(config.healthCheckIntervalMs).toBe(10000);
      expect(config.retryInitializationOnError).toBe(true);
      expect(config.maxInitializationRetries).toBe(3);

      expect(mockConsoleLog).toHaveBeenCalledWith('🏭 [CompositionRoot] IoC Container initialized with true DI');
    });

    it('should initialize with custom configuration', () => {
      const customConfig: Partial<CompositionRootConfig> = {
        autoStart: false,
        enableBackendSync: false,
        healthCheckIntervalMs: 5000,
        maxInitializationRetries: 5,
      };

      compositionRoot = new CompositionRoot(customConfig);

      const config = compositionRoot.getConfig();
      expect(config.autoStart).toBe(false);
      expect(config.enableBackendSync).toBe(false);
      expect(config.enableHealthMonitoring).toBe(true); // Default value
      expect(config.healthCheckIntervalMs).toBe(5000);
      expect(config.maxInitializationRetries).toBe(5);
    });

    it('should instantiate all services through dependency injection', () => {
      compositionRoot = new CompositionRoot();

      const services = compositionRoot.getServices();
      expect(services.eventBus).toBeDefined();
      expect(services.configService).toBeDefined();
      expect(services.qualiaCalculator).toBeDefined();
      expect(services.backendSync).toBeDefined();
      expect(services.errorReporting).toBeDefined();
      expect(services.debugService).toBeDefined();
      expect(services.gameController).toBeDefined();
      expect(services.gameStateStore).toBeDefined();
      expect(services.audioService).toBeDefined();
      expect(services.rhythmicMovement).toBeDefined();
    });

    it('should initialize all service statuses to "initializing"', () => {
      compositionRoot = new CompositionRoot();

      const status = compositionRoot.getServiceStatus();
      Object.values(status).forEach(serviceStatus => {
        expect(serviceStatus).toBe('initializing');
      });
    });
  });

  describe('Service Initialization', () => {
    beforeEach(() => {
      compositionRoot = new CompositionRoot();
    });

    it('should initialize all services successfully', async () => {
      await compositionRoot.initialize();

      const status = compositionRoot.getServiceStatus();
      expect(status.eventBus).toBe('running');
      expect(status.qualiaCalculator).toBe('running');
      expect(status.gameStateStore).toBe('running');
      expect(status.configService).toBe('running');
      expect(status.rhythmicMovement).toBe('running');

      expect(mockConsoleLog).toHaveBeenCalledWith('🚀 [CompositionRoot] Starting service initialization...');
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('✅ [CompositionRoot] All services initialized successfully')
      );
    });

    it('should start health monitoring when enabled', async () => {
      compositionRoot = new CompositionRoot({ enableHealthMonitoring: true });

      await compositionRoot.initialize();

      expect(mockSetInterval).toHaveBeenCalledWith(
        expect.any(Function),
        10000
      );
    });

    it('should not start health monitoring when disabled', async () => {
      compositionRoot = new CompositionRoot({ enableHealthMonitoring: false });

      await compositionRoot.initialize();

      expect(mockSetInterval).not.toHaveBeenCalled();
    });

    it('should log performance timing for successful initialization', async () => {
      mockPerformanceNow
        .mockReturnValueOnce(1000) // Start time
        .mockReturnValueOnce(1250); // End time

      await compositionRoot.initialize();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '✅ [CompositionRoot] All services initialized successfully - 250.00ms'
      );
    });

    it('should handle configuration service errors gracefully', async () => {
      // Spy on the private method by accessing it
      const initConfigSpy = jest.spyOn(compositionRoot as any, 'initializeConfiguration')
        .mockImplementation(async () => {
          throw new Error('Config load failed');
        });

      await compositionRoot.initialize();

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        '⚠️ [CompositionRoot] ConfigurationService failed to initialize, using defaults'
      );

      const status = compositionRoot.getServiceStatus();
      expect(status.configService).toBe('error');

      initConfigSpy.mockRestore();
    });
  });

  describe('Error Handling and Retry Logic', () => {
    beforeEach(() => {
      compositionRoot = new CompositionRoot();
    });

    it('should handle critical service initialization failures', async () => {
      // Mock GameStateStore initialization to fail
      const initGameStateSpy = jest.spyOn(compositionRoot as any, 'initializeGameStateStore')
        .mockImplementation(async () => {
          throw new Error('GameStateStore critical failure');
        });

      await expect(compositionRoot.initialize()).rejects.toThrow('GameStateStore critical failure');

      initGameStateSpy.mockRestore();
    });

    it('should continue initialization when non-critical services fail', async () => {
      // Mock non-critical services to fail
      const initBackendSpy = jest.spyOn(compositionRoot as any, 'initializeBackendSync')
        .mockImplementation(async () => {
          throw new Error('Backend not available');
        });

      const initErrorReportingSpy = jest.spyOn(compositionRoot as any, 'initializeErrorReporting')
        .mockImplementation(async () => {
          throw new Error('Error reporting failed');
        });

      await compositionRoot.initialize();

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        '⚠️ [CompositionRoot] BackendSync failed to initialize, continuing without backend sync'
      );
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        '⚠️ [CompositionRoot] ErrorReporting failed to initialize, continuing without error reporting'
      );

      initBackendSpy.mockRestore();
      initErrorReportingSpy.mockRestore();
    });

    it('should retry initialization on failure when retry is enabled', async () => {
      let attemptCount = 0;
      const initGameStateSpy = jest.spyOn(compositionRoot as any, 'initializeGameStateStore')
        .mockImplementation(async () => {
          attemptCount++;
          if (attemptCount <= 2) {
            throw new Error('Temporary failure');
          }
          // Success on third attempt
          (compositionRoot as any).serviceStatus.gameStateStore = 'running';
        });

      compositionRoot = new CompositionRoot({
        retryInitializationOnError: true,
        maxInitializationRetries: 3,
      });

      // Mock setTimeout to execute immediately
      jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        callback();
        return 123 as any;
      });

      await compositionRoot.initialize();

      expect(attemptCount).toBe(3);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '🔄 [CompositionRoot] Retrying initialization (attempt 1/3)'
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '�� [CompositionRoot] Retrying initialization (attempt 2/3)'
      );

      jest.spyOn(global, 'setTimeout').mockRestore();
      initGameStateSpy.mockRestore();
    });
  });

  describe('Service Shutdown', () => {
    beforeEach(async () => {
      compositionRoot = new CompositionRoot();
      await compositionRoot.initialize();
    });

    it('should shutdown all services gracefully', async () => {
      await compositionRoot.shutdown();

      expect(mockClearInterval).toHaveBeenCalledWith(123);
      expect(mockConsoleLog).toHaveBeenCalledWith('🛑 [CompositionRoot] Starting graceful shutdown...');
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('✅ [CompositionRoot] Graceful shutdown completed')
      );
    });

    it('should update service statuses to "stopped" during shutdown', async () => {
      await compositionRoot.shutdown();

      const status = compositionRoot.getServiceStatus();
      expect(status.eventBus).toBe('stopped');
      expect(status.qualiaCalculator).toBe('stopped');
      expect(status.gameStateStore).toBe('stopped');
    });

    it('should log performance timing for shutdown', async () => {
      mockPerformanceNow
        .mockReturnValueOnce(2000) // Start time
        .mockReturnValueOnce(2150); // End time

      await compositionRoot.shutdown();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '✅ [CompositionRoot] Graceful shutdown completed - 150.00ms'
      );
    });

    it('should handle shutdown errors', async () => {
      const shutdownBackendSpy = jest.spyOn(compositionRoot as any, 'shutdownBackendSync')
        .mockImplementation(async () => {
          throw new Error('Shutdown error');
        });

      mockPerformanceNow
        .mockReturnValueOnce(2000) // Start time
        .mockReturnValueOnce(2100); // End time

      await expect(compositionRoot.shutdown()).rejects.toThrow('Shutdown error');

      expect(mockConsoleError).toHaveBeenCalledWith(
        '❌ [CompositionRoot] Shutdown failed - 100.00ms:',
        expect.any(Error)
      );

      shutdownBackendSpy.mockRestore();
    });
  });

  describe('Service Destruction', () => {
    beforeEach(async () => {
      compositionRoot = new CompositionRoot();
      await compositionRoot.initialize();
    });

    it('should destroy all services and cleanup resources', () => {
      compositionRoot.destroy();

      expect(mockClearInterval).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith('💀 [CompositionRoot] Destroying services...');
      expect(mockConsoleLog).toHaveBeenCalledWith('💀 [CompositionRoot] Services destroyed');
    });
  });

  describe('Health Monitoring', () => {
    beforeEach(() => {
      compositionRoot = new CompositionRoot({ enableHealthMonitoring: true });
    });

    it('should perform health checks and detect healthy services', async () => {
      await compositionRoot.initialize();

      // Trigger health check manually
      const healthCheckCallback = mockSetInterval.mock.calls[0][0] as Function;
      healthCheckCallback();

      expect(mockConsoleLog).toHaveBeenCalledWith('💚 [CompositionRoot] Performing health check...');
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '✅ [CompositionRoot] Health check passed - all services healthy'
      );
    });

    it('should detect and report service health issues', async () => {
      await compositionRoot.initialize();
      
      // Simulate service errors by modifying internal state
      (compositionRoot as any).serviceStatus.eventBus = 'error';
      (compositionRoot as any).serviceStatus.qualiaCalculator = 'error';

      // Trigger health check
      const healthCheckCallback = mockSetInterval.mock.calls[0][0] as Function;
      healthCheckCallback();

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        '⚠️ [CompositionRoot] Health check detected issues:',
        ['EventBus in error state', 'QualiaCalculator in error state']
      );
    });
  });

  describe('Configuration Service Access', () => {
    beforeEach(() => {
      compositionRoot = new CompositionRoot();
    });

    it('should provide access to configuration service', () => {
      const configService = compositionRoot.getConfigurationService();
      expect(configService).toBeDefined();
    });
  });

  describe('Service Container Access', () => {
    beforeEach(() => {
      compositionRoot = new CompositionRoot();
    });

    it('should provide read-only access to service container', () => {
      const services = compositionRoot.getServices();
      expect(services).toBeDefined();
      expect(services.eventBus).toBeDefined();
      expect(services.configService).toBeDefined();
    });

    it('should provide read-only access to service status', () => {
      const status = compositionRoot.getServiceStatus();
      expect(status).toBeDefined();
      expect(Object.keys(status)).toContain('eventBus');
      expect(Object.keys(status)).toContain('qualiaCalculator');
    });

    it('should provide read-only access to configuration', () => {
      const config = compositionRoot.getConfig();
      expect(config).toBeDefined();
      expect(config.autoStart).toBeDefined();
      expect(config.enableBackendSync).toBeDefined();
    });
  });

  describe('Service Initialization Order', () => {
    beforeEach(() => {
      compositionRoot = new CompositionRoot();
    });

    it('should call each initialization phase in order', async () => {
      const initConfigSpy = jest.spyOn(compositionRoot as any, 'initializeConfiguration');
      const initEventBusSpy = jest.spyOn(compositionRoot as any, 'initializeEventBus');
      const initQualiaCalculatorSpy = jest.spyOn(compositionRoot as any, 'initializeQualiaCalculator');
      const initGameStateStoreSpy = jest.spyOn(compositionRoot as any, 'initializeGameStateStore');

      await compositionRoot.initialize();

      expect(initConfigSpy).toHaveBeenCalled();
      expect(initEventBusSpy).toHaveBeenCalled();
      expect(initQualiaCalculatorSpy).toHaveBeenCalled();
      expect(initGameStateStoreSpy).toHaveBeenCalled();

      initConfigSpy.mockRestore();
      initEventBusSpy.mockRestore();
      initQualiaCalculatorSpy.mockRestore();
      initGameStateStoreSpy.mockRestore();
    });

    it('should skip backend sync when disabled', async () => {
      compositionRoot = new CompositionRoot({ enableBackendSync: false });
      const initBackendSyncSpy = jest.spyOn(compositionRoot as any, 'initializeBackendSync');

      await compositionRoot.initialize();

      expect(initBackendSyncSpy).not.toHaveBeenCalled();

      initBackendSyncSpy.mockRestore();
    });
  });

  describe('Performance Monitoring', () => {
    beforeEach(() => {
      compositionRoot = new CompositionRoot();
    });

    it('should measure and log initialization performance', async () => {
      mockPerformanceNow
        .mockReturnValueOnce(1000) // Start time
        .mockReturnValueOnce(1500); // End time

      await compositionRoot.initialize();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '✅ [CompositionRoot] All services initialized successfully - 500.00ms'
      );
    });

    it('should measure and log shutdown performance', async () => {
      await compositionRoot.initialize();

      mockPerformanceNow
        .mockReturnValueOnce(2000) // Start time  
        .mockReturnValueOnce(2200); // End time

      await compositionRoot.shutdown();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '✅ [CompositionRoot] Graceful shutdown completed - 200.00ms'
      );
    });

    it('should measure and log error timing', async () => {
      const initGameStateSpy = jest.spyOn(compositionRoot as any, 'initializeGameStateStore')
        .mockImplementation(async () => {
          throw new Error('Critical failure');
        });

      mockPerformanceNow
        .mockReturnValueOnce(1000) // Start time
        .mockReturnValueOnce(1300); // End time

      await expect(compositionRoot.initialize()).rejects.toThrow('Critical failure');

      expect(mockConsoleError).toHaveBeenCalledWith(
        '❌ [CompositionRoot] Initialization failed - 300.00ms:',
        expect.any(Error)
      );

      initGameStateSpy.mockRestore();
    });
  });
});
