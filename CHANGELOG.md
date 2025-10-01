# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- **[Phase 3 Round 4] ErrorReportingService**: Externalized 10 hardcoded configuration values to achieve QUALIA.CODE compliance with configuration sovereignty principle. Violations reduced from 21 to 4 (17 violations fixed).
  - Added 10 new configuration properties to `error-reporting.yaml`: random ID generation settings (randomIdBase: 36, randomIdStart: 2, randomIdLength: 8), retry processing (retryDelayMultiplier: 2), time conversion (millisecondsToSecondsConversion: 1000), and advanced cleanup thresholds (oldHistoryCleanupRatio: 0.6, duplicateRegistryMaxSize: 500, duplicateCleanupCount: 250, completedBatchesCleanupCount: 10)
  - Updated `IErrorReportingService.contracts.ts` with 10 new typed properties for all externalized values
  - Refactored `ErrorReportingService.ts` to use configuration values in: `generateSessionId()`, `createErrorReport()`, `startRetryProcessing()`, `refillRateLimitTokens()`, and `performMemoryCleanup()` methods
  - Replaced all magic numbers and hardcoded constants with `this.config.*` references
  - Maintained backward compatibility with sensible defaults where applicable
- **GameStateStoreService**: Remediated QUALIA.CODE architectural violation by externalizing hardcoded configuration values in the "Menu" case of `handleGameStateChange` method. All reset values now use `this.config.resetValues` instead of hardcoded literals, ensuring compliance with configuration sovereignty principle.
  - Added `position` property to `GameStateStoreConfig.resetValues.player` interface
  - Updated `game-state-store.yaml` to include `position: { x: 4, y: 4 }` in reset values
  - Refactored "Menu" case to use configuration-driven values for all state resets