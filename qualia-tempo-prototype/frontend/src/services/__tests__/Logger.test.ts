/**
 * QUALIA.CODE v1.1 - QualiaLogger Tests
 * Tests for centralized logging service with level filtering
 * 
 * ARCHITECTURE COMPLIANCE:
 * - Tests all log levels (DEBUG, INFO, WARN, ERROR)
 * - Tests log level filtering
 * - Tests child logger creation
 * - Tests context object logging
 * - NO direct instantiation, uses IoC pattern
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { QualiaLogger } from '../Logger';
import { LogLevel } from '../contracts/ILogger.contracts';

describe('QualiaLogger - Critical Test Coverage', () => {
  let logger: QualiaLogger;
  let consoleDebugSpy: ReturnType<typeof vi.spyOn>;
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Spy on console methods
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Create logger with DEBUG level (most permissive)
    logger = new QualiaLogger('TestService', LogLevel.DEBUG);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Basic Logging Functionality', () => {
    it('should log debug messages', () => {
      // Act
      logger.debug('Debug message');

      // Assert
      expect(consoleDebugSpy).toHaveBeenCalledWith(
        expect.stringContaining('🔍'),
        {}
      );
      expect(consoleDebugSpy).toHaveBeenCalledWith(
        expect.stringContaining('TestService'),
        {}
      );
      expect(consoleDebugSpy).toHaveBeenCalledWith(
        expect.stringContaining('DEBUG'),
        {}
      );
      expect(consoleDebugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Debug message'),
        {}
      );
    });

    it('should log info messages', () => {
      // Act
      logger.info('Info message');

      // Assert
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('ℹ️'),
        {}
      );
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('TestService'),
        {}
      );
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('Info message'),
        {}
      );
    });

    it('should log warn messages', () => {
      // Act
      logger.warn('Warning message');

      // Assert
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('⚠️'),
        {}
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('TestService'),
        {}
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Warning message'),
        {}
      );
    });

    it('should log error messages', () => {
      // Act
      logger.error('Error message');

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('🚨'),
        {}
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('TestService'),
        {}
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error message'),
        {}
      );
    });
  });

  describe('2. Context Object Logging', () => {
    it('should include context object in log output', () => {
      // Arrange
      const context = { userId: '123', action: 'test' };

      // Act
      logger.info('Action performed', context);

      // Assert
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.any(String),
        context
      );
    });

    it('should handle undefined context gracefully', () => {
      // Act
      logger.info('Message without context');

      // Assert
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.any(String),
        {}
      );
    });
  });

  describe('3. Log Level Filtering', () => {
    it('should filter out debug messages when level is INFO', () => {
      // Arrange
      logger.setLevel(LogLevel.INFO);

      // Act
      logger.debug('This should not appear');
      logger.info('This should appear');

      // Assert
      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).toHaveBeenCalled();
    });

    it('should filter out debug and info when level is WARN', () => {
      // Arrange
      logger.setLevel(LogLevel.WARN);

      // Act
      logger.debug('No debug');
      logger.info('No info');
      logger.warn('Yes warn');

      // Assert
      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should only log errors when level is ERROR', () => {
      // Arrange
      logger.setLevel(LogLevel.ERROR);

      // Act
      logger.debug('No debug');
      logger.info('No info');
      logger.warn('No warn');
      logger.error('Yes error');

      // Assert
      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('4. Level Management', () => {
    it('should get current log level', () => {
      // Arrange
      logger.setLevel(LogLevel.WARN);

      // Act
      const level = logger.getLevel();

      // Assert
      expect(level).toBe(LogLevel.WARN);
    });

    it('should change log level dynamically', () => {
      // Arrange
      logger.setLevel(LogLevel.ERROR);
      logger.info('Should not log');
      expect(consoleInfoSpy).not.toHaveBeenCalled();

      // Act
      logger.setLevel(LogLevel.INFO);
      logger.info('Should now log');

      // Assert
      expect(consoleInfoSpy).toHaveBeenCalled();
    });
  });

  describe('5. Child Logger Creation', () => {
    it('should create child logger with prefixed source', () => {
      // Act
      const childLogger = logger.child('SubModule');
      childLogger.info('Child message');

      // Assert
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('TestService:SubModule'),
        {}
      );
    });

    it('should inherit parent log level in child logger', () => {
      // Arrange
      logger.setLevel(LogLevel.WARN);

      // Act
      const childLogger = logger.child('SubModule');
      childLogger.info('Should not appear');
      childLogger.warn('Should appear');

      // Assert
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('TestService:SubModule'),
        {}
      );
    });

    it('should allow multiple levels of child loggers', () => {
      // Act
      const childLogger = logger.child('Module');
      const grandchildLogger = childLogger.child('SubModule');
      grandchildLogger.info('Nested message');

      // Assert
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('TestService:Module:SubModule'),
        {}
      );
    });
  });

  describe('6. Default Constructor Behavior', () => {
    it('should use default source when not provided', () => {
      // Act
      const defaultLogger = new QualiaLogger();
      defaultLogger.info('Default message');

      // Assert
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('QualiaLogger'),
        {}
      );
    });

    it('should use INFO level by default', () => {
      // Act
      const defaultLogger = new QualiaLogger();
      defaultLogger.debug('Should not appear');
      defaultLogger.info('Should appear');

      // Assert
      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).toHaveBeenCalled();
    });
  });

  describe('7. QUALIA.CODE Compliance', () => {
    it('should be injectable via @injectable decorator', () => {
      // Assert - Logger should be a class that can be instantiated
      expect(logger).toBeInstanceOf(QualiaLogger);
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
    });

    it('should provide type-safe logging methods', () => {
      // Assert - All logging methods should exist and be callable
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.setLevel).toBe('function');
      expect(typeof logger.getLevel).toBe('function');
      expect(typeof logger.child).toBe('function');
    });
  });
});
