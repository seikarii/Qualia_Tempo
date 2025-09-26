/**
 * QUALIA.CODE v1.1 - MainLayout Component
 * Architectural orchestrator for the definitive visual layering system.
 *
 * This component establishes the sacred hierarchy of visual layers:
 * Layer 0: BackendCanvas (z-0) - GPU-rendered backend engine visuals
 * Layer 1: Atmosphere (z-10) - CSS complementary effects (grid, bloom)
 * Layer 2: UI (z-20) - Interactive menu/game elements based on game state
 *
 * QUALIA.CODE Compliance:
 * - Uses Zustand store for state-driven UI rendering
 * - Conditionally renders Menu vs Game based on isPlaying state
 * - Maintains proper visual layer separation
 */

import React from "react";
import { Atmosphere } from "../Atmosphere";
import BackendCanvas from "../BackendCanvas";
import QualiaMainMenu from "../QualiaMainMenu";
import QualiaTempoGame from "../game/QualiaTempoGame";
import { useGameStore } from "../../state/useGameStore";

const MainLayout: React.FC = () => {
  // QUALIA.CODE: State-driven UI rendering via Zustand store
  const isPlaying = useGameStore((state) => state.isPlaying);

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
        State-driven conditional rendering: Menu OR Game view
        QUALIA.CODE: Pure UI layer that reacts to service-managed state
      */}
      <div className="absolute inset-0 z-20">
        {isPlaying ? (
          <QualiaTempoGame isActive={true} />
        ) : (
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <QualiaMainMenu />
          </div>
        )}
      </div>
    </div>
  );
};

export default MainLayout;
