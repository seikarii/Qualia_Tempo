/**
 * Tests for NotificationService
 * Bridge service between EventBus and UI notifications
 */

import { NotificationService } from '../NotificationService';
import { EventBus, ErrorEvent, BackendSyncEvent } from '../EventBus';
import { QualiaLogger } from '../Logger';
import { ConfigurationService } from '../ConfigurationService';

// Mock decorators
jest.mock('../../utils/decorators', () => ({
  logMethod: () => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
  catchError: () => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
}));

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let mockEventBus: jest.Mocked<EventBus>;
  let mockLogger: jest.Mocked<QualiaLogger>;
  let mockSetStore: jest.Mock;
  let mockConfigService: jest.Mocked<ConfigurationService>;

  beforeEach(() => {
    // Create comprehensive EventBus mock
    mockEventBus = {
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
      emit: jest.fn(),
      clear: jest.fn(),
      getListeners: jest.fn(),
      getEventHistory: jest.fn(),
    } as any;

    // Create mock Logger
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    } as any;

    // Create mock store setter
    mockSetStore = jest.fn();

    // Create mock ConfigurationService
    mockConfigService = {
      getLoggingConfig: jest.fn().mockReturnValue({
        messages: {
          notificationService: {
            initialized: '🔔 [NotificationService] Service initialized',
            alreadyStarted: '⚠️ [NotificationService] Service already started',
            startingListeners: '👂 [NotificationService] Starting event listeners...',
            listenersActive: '✅ [NotificationService] Event listeners active',
            notStarted: '⚠️ [NotificationService] Service not started',
            stoppingListeners: '🔇 [NotificationService] Stopping event listeners...',
            listenersStopped: '✅ [NotificationService] Event listeners stopped',
            processingErrorEvent: '🚨 [NotificationService] Processing ErrorEvent:',
            errorNotificationGenerated: '🔔 [NotificationService] Error notification generated',
            processingBackendSyncEvent: '🔄 [NotificationService] Processing BackendSyncEvent:',
            configSyncNotificationGenerated: '🔔 [NotificationService] Config sync notification generated',
          },
        },
      }),
    } as any;

    // Spy on console methods
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();

    notificationService = new NotificationService(
      mockEventBus,
      mockLogger,
      mockSetStore,
      mockConfigService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with all required dependencies', () => {
      expect(notificationService).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith(
        '🔔 [NotificationService] Service initialized'
      );
    });
  });

  describe('start()', () => {
    it('should subscribe to Error and BackendSync events when started', async () => {
      mockEventBus.subscribe.mockReturnValueOnce('error-listener-id');
      mockEventBus.subscribe.mockReturnValueOnce('backend-sync-listener-id');

      await notificationService.start();

      expect(mockEventBus.subscribe).toHaveBeenCalledTimes(2);
      expect(mockEventBus.subscribe).toHaveBeenCalledWith('Error', expect.any(Function));
      expect(mockEventBus.subscribe).toHaveBeenCalledWith('BackendSync', expect.any(Function));
      expect(mockLogger.info).toHaveBeenCalledWith(
        '👂 [NotificationService] Starting event listeners...'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        '✅ [NotificationService] Event listeners active'
      );
    });

    it('should not start if already started', async () => {
      mockEventBus.subscribe.mockReturnValue('listener-id');

      await notificationService.start();
      await notificationService.start(); // Second call

      expect(mockEventBus.subscribe).toHaveBeenCalledTimes(2); // Only first call should subscribe
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '⚠️ [NotificationService] Service already started'
      );
    });
  });

  describe('stop()', () => {
    beforeEach(async () => {
      mockEventBus.subscribe.mockReturnValue('listener-id');
      await notificationService.start();
    });

    it('should unsubscribe from all events when stopped', async () => {
      const service = notificationService as any;
      service.listenerIds = ['listener-1', 'listener-2'];

      await notificationService.stop();

      expect(mockEventBus.unsubscribe).toHaveBeenCalledTimes(2);
      expect(mockEventBus.unsubscribe).toHaveBeenCalledWith('listener-1');
      expect(mockEventBus.unsubscribe).toHaveBeenCalledWith('listener-2');
      expect(mockLogger.info).toHaveBeenCalledWith(
        '🔇 [NotificationService] Stopping event listeners...'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        '✅ [NotificationService] Event listeners stopped'
      );
    });

    it('should not stop if not started', async () => {
      // Create a new service that hasn't been started
      const newService = new NotificationService(
        mockEventBus,
        mockLogger,
        mockSetStore,
        mockConfigService
      );

      await newService.stop();

      expect(mockEventBus.unsubscribe).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '⚠️ [NotificationService] Service not started'
      );
    });
  });

  describe('Event Handling', () => {
    let capturedErrorHandler: Function;
    let capturedBackendSyncHandler: Function;

    beforeEach(async () => {
      mockEventBus.subscribe.mockImplementation((eventType: string, handler: Function) => {
        if (eventType === 'Error') {
          capturedErrorHandler = handler;
        } else if (eventType === 'BackendSync') {
          capturedBackendSyncHandler = handler;
        }
        return 'listener-id';
      });

      await notificationService.start();
    });

    it('should generate notification for high severity error', () => {
      const mockErrorEvent: ErrorEvent = {
        type: 'Error',
        severity: 'high',
        error: new Error('Test error message'),
        timestamp: new Date(),
        source: 'TestService',
      };

      // Call the captured error handler directly
      capturedErrorHandler(mockErrorEvent);

      expect(mockLogger.info).toHaveBeenCalledWith(
        '🚨 [NotificationService] Processing ErrorEvent:',
        { severity: 'high', error: 'Test error message' }
      );
      expect(mockSetStore).toHaveBeenCalledWith(expect.any(Function));
      expect(mockLogger.info).toHaveBeenCalledWith(
        '🔔 [NotificationService] Error notification generated'
      );
    });

    it('should generate notification for critical severity error', () => {
      const mockErrorEvent: ErrorEvent = {
        type: 'Error',
        severity: 'critical',
        error: new Error('Critical error message'),
        timestamp: new Date(),
        source: 'TestService',
      };

      capturedErrorHandler(mockErrorEvent);

      expect(mockSetStore).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should not generate notification for low severity error', () => {
      const mockErrorEvent: ErrorEvent = {
        type: 'Error',
        severity: 'low',
        error: new Error('Low severity error'),
        timestamp: new Date(),
        source: 'TestService',
      };

      capturedErrorHandler(mockErrorEvent);

      expect(mockSetStore).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        '🚨 [NotificationService] Processing ErrorEvent:',
        { severity: 'low', error: 'Low severity error' }
      );
    });

    it('should generate notification for config sync', () => {
      const mockBackendSyncEvent: BackendSyncEvent = {
        type: 'BackendSync',
        syncType: 'config',
        data: { success: true },
        timestamp: new Date(),
      };

      capturedBackendSyncHandler(mockBackendSyncEvent);

      expect(mockLogger.info).toHaveBeenCalledWith(
        '🔄 [NotificationService] Processing BackendSyncEvent:',
        { syncType: 'config' }
      );
      expect(mockSetStore).toHaveBeenCalledWith(expect.any(Function));
      expect(mockLogger.info).toHaveBeenCalledWith(
        '🔔 [NotificationService] Config sync notification generated'
      );
    });

    it('should not generate notification for non-config sync', () => {
      const mockBackendSyncEvent: BackendSyncEvent = {
        type: 'BackendSync',
        syncType: 'qualiaState',
        data: { success: true },
        timestamp: new Date(),
      };

      capturedBackendSyncHandler(mockBackendSyncEvent);

      expect(mockSetStore).not.toHaveBeenCalled();
    });

    it('should create notification for high severity error events', () => {
      const mockErrorEvent: ErrorEvent = {
        type: 'Error',
        severity: 'high',
        error: new Error('Test error'),
        timestamp: new Date(),
        source: 'TestService',
      };

      // Reset mock to track calls
      mockSetStore.mockClear();

      capturedErrorHandler(mockErrorEvent);

      // Verify that setStore was called (notification was created)
      expect(mockSetStore).toHaveBeenCalledTimes(1);
    });

    it('should create notification for config sync events', () => {
      const mockBackendSyncEvent: BackendSyncEvent = {
        type: 'BackendSync',
        syncType: 'config',
        data: { success: true },
        timestamp: new Date(),
      };

      // Reset mock to track calls
      mockSetStore.mockClear();

      capturedBackendSyncHandler(mockBackendSyncEvent);

      // Verify that setStore was called (notification was created)
      expect(mockSetStore).toHaveBeenCalledTimes(1);
    });
  });

  describe('getStatus()', () => {
    it('should return "stopped" when service is not started', () => {
      const status = notificationService.getStatus();
      expect(status).toBe('stopped');
    });

    it('should return "running" when service is started', async () => {
      mockEventBus.subscribe.mockReturnValue('listener-id');
      await notificationService.start();

      const status = notificationService.getStatus();
      expect(status).toBe('running');
    });

    it('should return "stopped" after service is stopped', async () => {
      mockEventBus.subscribe.mockReturnValue('listener-id');
      await notificationService.start();
      await notificationService.stop();

      const status = notificationService.getStatus();
      expect(status).toBe('stopped');
    });
  });
});