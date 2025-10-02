# ERROR LOG - QUALIA TEMPO
*Última actualización: 3 de enero de 2025*

Este archivo documenta errores encontrados durante el desarrollo que requieren atención futura.

## [2025-01-03] - ESLint Remediation: TypeScript Compilation Errors Blocking Lint Execution

### Error Context
Durante la remediación de ESLint QUALIA.CODE, se encontraron 31 errores de TypeScript que impiden la ejecución completa del lint arquitectónico.

### Errors Found

#### Frontend TypeScript Compilation Errors (31 total)

**AudioService.ts (2 errors):**
- `IEventBus` interface mismatch - EventBus implementation missing required properties
- `ILogger` interface mismatch - QualiaLogger missing expected properties

**ApplicationInitializerService.ts (2 errors):**
- Unknown type casting in error logging
- ConfigLoadedStateUpdate type mismatch with GameState

**AudioService.ts (2 errors):**
- Duplicate from above

**DebugService.ts (4 errors):**
- Unused eventBus property
- Unused _eventListeners property
- SystemSnapshot.config property not in DebugStats interface
- Unused handleGenericEvent method

**ErrorReportingService.ts (6 errors):**
- Unused eventListenerIds property
- Unused _eventListeners property
- exportErrorData return type mismatch (ErrorReportingExportData vs ExportedErrorData)
- Unused handleErrorEvent method
- userAgent/url default values type issues

**FrontendRenderingService.ts (2 errors):**
- Unused _eventListeners property
- Unused handleParticleDataReceived method

**GameStateStoreService.ts (1 error):**
- GameStateChangedEvent type casting issue

**NotificationService.ts (1 error):**
- NotificationLogData type casting issue

**PostProcessingService.ts (1 error):**
- Pass config strength type issue

**RhythmicMovementController.ts (2 errors):**
- IEventTransformer vs IMessageAdapter interface mismatch
- gameState.combatData possibly null

**StateStreamingService.ts (1 error):**
- WebSocket message data type mismatch

**inversify.config.ts (1 error):**
- ErrorReportingService constructor signature mismatch

**OntologicalAudioEngine.ts (3 errors):**
- Unused eventBus property
- Unused _eventListeners property
- Unused initializeEngine method

**QualiaFieldRenderer.tsx (2 errors):**
- Mock QualiaState missing properties for viewLogicService calls

**MusicalNotesRenderer.tsx (1 error):**
- Note[] vs NoteData[] type mismatch

**main.ts (2 errors):**
- globalThis.process.env type issues

### Impact
- ESLint no puede ejecutar completamente debido a errores de compilación TypeScript
- Lint arquitectónico falla en Phase 1A (Frontend TypeScript Type Checking)
- Violaciones QUALIA.CODE no pueden ser detectadas hasta que se resuelvan los errores de tipos

### Resolution Required
- Fix TypeScript compilation errors to enable full architectural linting
- Address legitimate QUALIA.CODE violations now detectable
- Ensure type safety across the codebase

### Priority: HIGH
These errors prevent the architectural enforcement system from functioning properly.