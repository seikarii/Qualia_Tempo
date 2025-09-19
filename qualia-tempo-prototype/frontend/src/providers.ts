/**
 * Providers Module - QUALIA.CODE Re-export Pattern
 * 
 * This module re-exports providers from the services layer to provide
 * a clean API boundary and avoid direct service imports in components.
 * 
 * Following QUALIA.CODE v1.1 architectural patterns.
 */

export { CompositionRootProvider } from './services/CompositionRoot.provider';
