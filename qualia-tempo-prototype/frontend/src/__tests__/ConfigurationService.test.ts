import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
/**
 * ConfigurationService.test.ts - Configuration Management Tests
 * Tests for YAML configuration loading, validation, and management
 */

import yaml from 'js-yaml';
import { QualiaLogger } from '../services/Logger';

// Mock js-yaml module
vi.mock('js-yaml', () => ({
  load: vi.fn()
}));

// Mock decorators
vi.mock('../utils/decorators', () => ({
  logMethod: () => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
  catchError: () => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor
}));

const mockYamlLoad = yaml.load as MockedFunction<typeof yaml.load>;

// Mock console methods
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

// Mock fetch with proper typing
const mockFetch = vi.fn() as MockedFunction<typeof fetch>;
global.fetch = mockFetch;

// Create mock logger
const mockLogger: Partial<QualiaLogger> = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
};

// Helper function to create mock Response objects
const createMockResponse = (options: { ok: boolean; text?: string; statusText?: string }): Response => {
  const textMock = vi.fn() as MockedFunction<() => Promise<string>>;
  textMock.mockResolvedValue(options.text || '');
  return {
    ok: options.ok,
    text: textMock,
    statusText: options.statusText || '',
  } as unknown as Response;
};

describe('ConfigurationService', () => {
  // Import after mocks are set up
  let ConfigurationService: any;
  let configService: any;
  let mockConfig: any;

  beforeAll(async () => {
    const module = await import('../services/ConfigurationService');
    ConfigurationService = module.ConfigurationService;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create instance for testing (bypassing QUALIA.CODE restrictions in tests)
    configService = new ConfigurationService('/test-config.yaml', mockLogger as QualiaLogger);
    
    // Create a valid mock configuration
    mockConfig = {
      audio: {
        volume: 0.8,
        enableSubtitles: true
      },
      gameplay: {
        rhythmTolerance: 0.2,
        comboResetTime: 2000,
        pauseCooldown: 1000
      },
      visual: {
        updateFrequency: 60,
        debugMode: false
      },
      qualia: {
        focus_level: {
          maxStreak: 50,
          decayRate: 0.95,
          pauseBonus: 0.1
        },
        flow: {
          rhythmWindow: 200,
          maxFlow: 1.0,
          decayRate: 0.99,
          buildRate: 0.02
        },
        chaos: {
          missMultiplier: 2.0,
          maxChaos: 1.0,
          decayRate: 0.98
        },
        aggression: {
          comboThreshold: 10,
          maxAggression: 1.0,
          comboMultiplier: 1.5
        },
        recovery: {
          duration: 1000,
          maxRecovery: 1.0,
          decayRate: 0.95
        },
        intensity: {
          baseMultiplier: 1.0,
          precisionWeight: 0.3,
          flowWeight: 0.3,
          aggressionWeight: 0.2,
          chaosWeight: 0.2
        }
      },
      backend: {
        throttleMs: 250,
        maxBatchSize: 10,
        baseUrl: 'http://localhost:8000',
        endpoints: {
          qualiaState: '/update_qualia',
          gameState: '/game_state',
          health: '/health'
        },
        maxRetries: 3,
        retryDelayMs: 1000,
        timeoutMs: 5000,
        logRequests: false,
        logResponses: false
      },
      services: {
        errorReporting: {
          rateLimitWindow: 60000,
          maxErrorsPerWindow: 10,
          batchSize: 5,
          batchTimeout: 2000,
          maxRetentionTime: 300000,
          externalServiceUrl: '',
          retryAttempts: 3,
          maxBatchSize: 50,
          batchInterval: 5000,
          maxRetries: 3,
          retryDelay: 1000,
          enableConsoleOutput: true
        },
        debug: {
          enableProfiling: false,
          maxEventHistory: 1000,
          logLevel: 'info',
          performanceThreshold: 100,
          performanceMonitoringInterval: 10000,
          aiAnalysisInterval: 30000,
          enableAIAnalysis: false,
          enablePerformanceMonitoring: true,
          enableGlobalInterface: false,
          sessionIdLength: 16,
          recentEventsLimit: 100,
          memoryCleanupInterval: 60000,
          defaultGameStateValue: 'default'
        },
        eventBus: {
          maxListeners: 100,
          enablePerformanceMonitoring: true,
          eventTypes: {
            playerAction: 'PlayerAction',
            qualiaStateUpdated: 'QualiaStateUpdated',
            error: 'Error',
            gameStateChanged: 'GameStateChanged',
            backendSync: 'BackendSync'
          }
        },
        gameController: {
          pauseCooldown: 1000
        },
        backendSync: {
          healthCheckInterval: 30000
        },
        rhythmicMovement: {
          bpm: 120,
          perfectTiming: 100,
          goodTiming: 200,
          gridSize: 8,
          slowdownFactor: 0.5,
          slowdownDuration: 2000,
          keyThrottleMs: 100
        }
      },
      test: {
        mockServices: false,
        enableDebugOutput: false,
        timeoutMs: 5000
      },
      logging: {
        messages: {
          debugService: {
            alreadyRunning: 'Debug service already running',
            starting: 'Starting debug service',
            started: 'Debug service started',
            failedToStart: 'Failed to start debug service',
            notRunning: 'Debug service not running',
            stopping: 'Stopping debug service',
            stopped: 'Debug service stopped',
            errorStopping: 'Error stopping debug service',
            configUpdated: 'Debug config updated',
            performingAI: 'Performing AI analysis',
            aiAnalysisFailed: 'AI analysis failed',
            unsubscribed: 'Unsubscribed from events',
            initialized: 'Debug service initialized'
          },
          errorReporting: {
            initialized: 'Error reporting initialized',
            started: 'Error reporting started',
            stopped: 'Error reporting stopped',
            configUpdated: 'Error reporting config updated',
            subscribed: 'Subscribed to error events',
            unsubscribed: 'Unsubscribed from error events',
            receivedWhileStopped: 'Received error while stopped',
            malformedEvent: 'Malformed error event',
            rateLimitExceeded: 'Rate limit exceeded',
            processingFailed: 'Error processing failed',
            batchProcessingFailed: 'Batch processing failed',
            noStackTrace: 'No stack trace available',
            unknownSource: 'Unknown error source',
            requiresEventBus: 'EventBus required for error reporting'
          },
          configurationService: {
            fileNotFound: 'Configuration file not found',
            parseError: 'Configuration parse error',
            loadSuccess: 'Configuration loaded successfully',
            validationError: 'Configuration validation error'
          }
        }
      },
      errorPatterns: {
        critical: ['TypeError', 'ReferenceError'],
        high: ['Network', 'Timeout'],
        medium: ['Validation', 'Parse'],
        low: ['Warning', 'Info']
      }
    };
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
  });

  describe('Constructor', () => {
    it('should create ConfigurationService instance', () => {
      expect(configService).toBeInstanceOf(ConfigurationService);
    });

    it('should accept custom configuration path', () => {
      const customService = new ConfigurationService('/custom/config.yaml');
      expect(customService).toBeInstanceOf(ConfigurationService);
    });
  });

  describe('loadConfig', () => {
    it('should successfully load and validate configuration', async () => {
      const mockYamlText = 'audio:\n  volume: 0.8';
      
      const mockResponse = createMockResponse({ ok: true, text: mockYamlText });
      mockFetch.mockResolvedValue(mockResponse);
      
      mockYamlLoad.mockReturnValue(mockConfig);

      const result = await configService.loadConfig();

      expect(mockFetch).toHaveBeenCalledWith('/test-config.yaml');
      expect(mockYamlLoad).toHaveBeenCalledWith(mockYamlText);
      expect(result).toEqual(mockConfig);
      expect(mockConsoleLog).toHaveBeenCalledWith('📄 [Config] Loading configuration from:', '/test-config.yaml');
      expect(mockConsoleLog).toHaveBeenCalledWith('✅ [Config] Configuration loaded successfully');
    });

    it('should handle fetch failure', async () => {
      const mockResponse = createMockResponse({ ok: false, statusText: 'Not Found' });
      mockFetch.mockResolvedValue(mockResponse);

      await expect(configService.loadConfig()).rejects.toThrow('Failed to load config: Not Found');
      expect(mockConsoleError).toHaveBeenCalledWith('❌ [Config] Failed to load configuration:', expect.any(Error));
    });

    it('should handle YAML parsing errors', async () => {
      const mockResponse = createMockResponse({ ok: true, text: 'invalid: yaml: content' });
      mockFetch.mockResolvedValue(mockResponse);

      mockYamlLoad.mockImplementation(() => {
        throw new Error('YAML parsing failed');
      });

      await expect(configService.loadConfig()).rejects.toThrow('YAML parsing failed');
      expect(mockConsoleError).toHaveBeenCalledWith('❌ [Config] Failed to load configuration:', expect.any(Error));
    });    it('should validate configuration structure', async () => {
      const invalidConfig = { invalidProperty: true };
      
      const mockResponse = createMockResponse({ ok: true, text: 'config: data' });
      mockFetch.mockResolvedValue(mockResponse);
      
      mockYamlLoad.mockReturnValue(invalidConfig);

      await expect(configService.loadConfig()).rejects.toThrow('Invalid audio configuration');
    });
  });

  describe('Configuration Access Methods', () => {
    beforeEach(async () => {
      const mockResponse = createMockResponse({ ok: true, text: 'config: data' });
      mockFetch.mockResolvedValue(mockResponse);
      mockYamlLoad.mockReturnValue(mockConfig);
      await configService.loadConfig();
    });

    describe('getConfig', () => {
      it('should return full configuration when loaded', () => {
        const result = configService.getConfig();
        expect(result).toEqual(mockConfig);
      });

      it('should throw error when configuration not loaded', () => {
        const newService = new ConfigurationService();
        expect(() => newService.getConfig()).toThrow('Configuration not loaded. Call loadConfig() first.');
      });
    });

    describe('getGameConfig', () => {
      it('should return game configuration section', () => {
        const result = configService.getGameConfig();
        
        const expected = {
          audio: mockConfig.audio,
          gameplay: mockConfig.gameplay,
          visual: mockConfig.visual
        };
        
        expect(result).toEqual(expected);
      });
    });

    describe('getQualiaConfig', () => {
      it('should return qualia configuration section', () => {
        const result = configService.getQualiaConfig();
        expect(result).toEqual(mockConfig.qualia);
      });
    });

    describe('getBackendConfig', () => {
      it('should return backend configuration section', () => {
        const result = configService.getBackendConfig();
        expect(result).toEqual(mockConfig.backend);
      });
    });

    describe('getServicesConfig', () => {
      it('should return services configuration section', () => {
        const result = configService.getServicesConfig();
        expect(result).toEqual(mockConfig.services);
      });
    });

    describe('getTestConfig', () => {
      it('should return test configuration section', () => {
        const result = configService.getTestConfig();
        expect(result).toEqual(mockConfig.test);
      });
    });

    describe('getLoggingConfig', () => {
      it('should return logging configuration section', () => {
        const result = configService.getLoggingConfig();
        expect(result).toEqual(mockConfig.logging);
      });
    });

    describe('getErrorPatternsConfig', () => {
      it('should return error patterns configuration section', () => {
        const result = configService.getErrorPatternsConfig();
        expect(result).toEqual(mockConfig.errorPatterns);
      });
    });
  });

  describe('isLoaded', () => {
    it('should return false when configuration not loaded', () => {
      expect(configService.isLoaded()).toBe(false);
    });

    it('should return true when configuration is loaded', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ ok: true, text: 'config: data' }));
      mockYamlLoad.mockReturnValue(mockConfig);
      
      await configService.loadConfig();
      expect(configService.isLoaded()).toBe(true);
    });
  });

  describe('Configuration Validation', () => {
    it('should validate audio configuration', async () => {
      const invalidConfig = { ...mockConfig };
      invalidConfig.audio = { volume: 'invalid' as any, enableSubtitles: true };

      mockFetch.mockResolvedValue(createMockResponse({ ok: true, text: 'config: data' }));
      mockYamlLoad.mockReturnValue(invalidConfig);

      await expect(configService.loadConfig()).rejects.toThrow('Invalid audio configuration');
    });

    it('should validate qualia configuration', async () => {
      const invalidConfig = { ...mockConfig };
      delete invalidConfig.qualia;

      mockFetch.mockResolvedValue(createMockResponse({ ok: true, text: 'config: data' }));
      mockYamlLoad.mockReturnValue(invalidConfig);

      await expect(configService.loadConfig()).rejects.toThrow('Invalid qualia configuration');
    });

    it('should validate backend configuration', async () => {
      const invalidConfig = { ...mockConfig };
      invalidConfig.backend = { ...mockConfig.backend, baseUrl: '' };

      mockFetch.mockResolvedValue(createMockResponse({ ok: true, text: 'config: data' }));
      mockYamlLoad.mockReturnValue(invalidConfig);

      await expect(configService.loadConfig()).rejects.toThrow('Invalid backend configuration');
    });

    it('should pass validation with valid configuration', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ ok: true, text: 'config: data' }));
      mockYamlLoad.mockReturnValue(mockConfig);

      await expect(configService.loadConfig()).resolves.toEqual(mockConfig);
      expect(mockConsoleLog).toHaveBeenCalledWith('✅ [Config] Configuration validation passed');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(configService.loadConfig()).rejects.toThrow('Network error');
      expect(mockConsoleError).toHaveBeenCalledWith('❌ [Config] Failed to load configuration:', expect.any(Error));
    });

    it('should handle malformed YAML gracefully', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ ok: true, text: 'invalid yaml content' }));
      
      mockYamlLoad.mockImplementation(() => {
        throw new Error('Malformed YAML');
      });

      await expect(configService.loadConfig()).rejects.toThrow('Malformed YAML');
    });

    it('should handle partial configuration objects', async () => {
      const partialConfig = {
        audio: mockConfig.audio,
        // Missing other required sections
      };

      mockFetch.mockResolvedValue(createMockResponse({ ok: true, text: 'partial: config' }));
      mockYamlLoad.mockReturnValue(partialConfig);

      await expect(configService.loadConfig()).rejects.toThrow();
    });
  });

  describe('Multiple Load Operations', () => {
    it('should handle multiple load calls correctly', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ ok: true, text: 'config: data' }));
      mockYamlLoad.mockReturnValue(mockConfig);

      // Load twice
      const result1 = await configService.loadConfig();
      const result2 = await configService.loadConfig();

      expect(result1).toEqual(mockConfig);
      expect(result2).toEqual(mockConfig);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should update configuration on reload', async () => {
      // Create fresh service for this test
      const freshService = new ConfigurationService('/fresh-config.yaml');
      
      const originalConfig = JSON.parse(JSON.stringify(mockConfig));
      originalConfig.audio.volume = 0.8; // Explicitly set original value
      
      const updatedConfig = JSON.parse(JSON.stringify(mockConfig));
      updatedConfig.audio.volume = 0.5; // Different value

      // First load
      mockFetch.mockResolvedValueOnce(createMockResponse({ ok: true, text: 'original: config' }));
      mockYamlLoad.mockReturnValueOnce(originalConfig);
      
      const result1 = await freshService.loadConfig();
      expect(result1.audio.volume).toBe(0.8);

      // Second load with updated config
      mockFetch.mockResolvedValueOnce(createMockResponse({ ok: true, text: 'updated: config' }));
      mockYamlLoad.mockReturnValueOnce(updatedConfig);
      
      const result2 = await freshService.loadConfig();
      expect(result2.audio.volume).toBe(0.5);
    });
  });
});
