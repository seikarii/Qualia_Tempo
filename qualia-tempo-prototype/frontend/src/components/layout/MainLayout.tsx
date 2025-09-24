/**
 * QUALIA.CODE v1.1 - MainLayout Component
 * Architectural orchestrator for the definitive visual layering system.
 * 
 * This component establishes the sacred hierarchy of visual layers:
 * Layer 0: BackendCanvas (z-0) - GPU-rendered backend engine visuals
 * Layer 1: Atmosphere (z-10) - CSS complementary effects (grid, bloom)  
 * Layer 2: UI (z-20) - Interactive menu elements
 * 
 * Eliminates DOM-based particle violations and establishes backend engine
 * as the single source of visual truth.
 */

import React from 'react';
import { Atmosphere } from '../Atmosphere';
import BackendCanvas from '../BackendCanvas';
import QualiaMainMenu from '../QualiaMainMenu';

const MainLayout: React.FC = () => {
  return (
    <div className="h-screen w-screen relative overflow-hidden">
      {/* 
        LAYER 0: BACKEND CANVAS (Z-0)
        La fuente de verdad para los visuales del motor.
        Debe llenar toda la pantalla.
      */}
      <div className="absolute inset-0 z-0">
        <BackendCanvas showStatus={true} />
      </div>

      {/* 
        LAYER 1: ATMOSPHERE (Z-10)
        Para efectos CSS complementarios como grids y bloom global.
      */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <Atmosphere />
      </div>

      {/* 
        LAYER 2: UI (Z-20)
        El menú principal y otros elementos de UI interactivos.
        CORRECTED FIX: Absolute center positioning with proper pointer events
      */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
        <QualiaMainMenu />
      </div>
    </div>
  );
};

export default MainLayout;