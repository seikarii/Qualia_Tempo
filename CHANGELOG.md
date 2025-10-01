# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- **GameStateStoreService**: Remediated QUALIA.CODE architectural violation by externalizing hardcoded configuration values in the "Menu" case of `handleGameStateChange` method. All reset values now use `this.config.resetValues` instead of hardcoded literals, ensuring compliance with configuration sovereignty principle.
  - Added `position` property to `GameStateStoreConfig.resetValues.player` interface
  - Updated `game-state-store.yaml` to include `position: { x: 4, y: 4 }` in reset values
  - Refactored "Menu" case to use configuration-driven values for all state resets