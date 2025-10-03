/**
 * ARCHITECTURAL DIRECTIVE 001: SMOKE TEST DE INTEGRACIÓN DEL CONTENEDOR
 * 
 * PROPÓSITO: Primera línea de defensa arquitectónica.
 * Verifica que el contenedor de InversifyJS puede ser construido y que todos los servicios
 * registrados en el ApplicationCompositionRoot pueden ser resueltos sin errores de inyección.
 * 
 * MANDATO: Un fallo en este test es un fallo catastrófico de la arquitectura.
 * 
 * COMPLIANCE: QUALIA.CODE v1.1 - Isolated Container Pattern
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createTestContainer, resetAllMocks } from '../testing/test-container-factory';
import { TYPES } from '../services/inversify.types';
import type { IApplicationInitializerService } from '../services/interfaces/IApplicationInitializerService';
import type { Container } from 'inversify';

describe('ApplicationCompositionRoot Integration Smoke Test', () => {
  let container: Container;
  
  beforeEach(() => {
    resetAllMocks();
    // MANDATE: Use Isolated Container Pattern - create new container for each test
    container = createTestContainer();
  });

  it('should resolve ApplicationInitializerService from container without throwing', () => {
    // CRITICAL ASSERTION: Container resolution must not throw
    expect(() => {
      container.get<IApplicationInitializerService>(TYPES.IApplicationInitializerService);
    }).not.toThrow();
  });

  it('should initialize application without throwing errors', async () => {
    // STEP 1: Resolve the entry point service
    const appInitializer = container.get<IApplicationInitializerService>(
      TYPES.IApplicationInitializerService
    );

    // STEP 2: Execute the initialization sequence
    // CRITICAL ASSERTION: The only assertion - initialization must not throw
    await expect(appInitializer.start()).resolves.not.toThrow();
  });

  it('should handle multiple initialization calls gracefully', async () => {
    const appInitializer = container.get<IApplicationInitializerService>(
      TYPES.IApplicationInitializerService
    );

    // First initialization
    await expect(appInitializer.start()).resolves.not.toThrow();
    
    // Second initialization should be handled gracefully (idempotent)
    await expect(appInitializer.start()).resolves.not.toThrow();
  });
});
