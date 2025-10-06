/**
 * CRISALIDA.CODE v2.0 - MainLayout Component
 * Unified rendering pipeline orchestrator with single-canvas architecture.
 *
 * ARCHITECTURAL BREAKTHROUGH:
 * ✅ Single WebGL canvas for ALL rendering (menu particles + game 3D objects)
 * ✅ FrontendRenderer ALWAYS visible - renders both menu and game scenes
 * ✅ QualiaTempoGame provides scene content to FrontendRenderingService
 * ✅ PostProcessingService applies effects to unified scene
 * ✅ No more double canvas issue - eliminated second WebGL context
 *
 * Visual Layer Hierarchy:
 * Layer 0: FrontendRenderer (z-0) - ALWAYS ACTIVE - Unified rendering pipeline
 * Layer 1: Atmosphere (z-10) - CSS complementary effects
 * Layer 2: UI (z-20) - Interactive menu/game UI overlays
 *
 * QUALIA.CODE Compliance:
 * - Uses Zustand store for state-driven UI rendering
 * - Conditionally renders Menu vs Game UI overlays
 * - Maintains proper visual layer separation
 * - FrontendRenderingService owns the canvas exclusively
 */

import React from "react";
import { useGameStore } from "../../state/useGameStore";
import type { GameState } from "../../state/useGameStore";
import { Atmosphere } from "../Atmosphere";
import QualiaMainMenu from "../QualiaMainMenu";
import QualiaTempoGame from "../game/QualiaTempoGame";
import FrontendRenderer from "../FrontendRenderer";

const MainLayout: React.FC = () => {
  // QUALIA.CODE: State-driven UI rendering via Zustand store
  const isPlaying = useGameStore((state: GameState) => state.isPlaying);

  return (
    <div className="h-screen w-screen relative overflow-hidden">
      {/*
        LAYER 0: FRONTEND RENDERER (Z-0)
        CRISALIDA.CODE v2.0: ALWAYS RENDERED - Single source of truth for all 3D rendering
        - In menu mode: renders particle effects
        - In game mode: renders particle effects + game 3D scene (player, boss, notes, etc.)
        - Uses FrontendRenderingService with React Three Fiber integration
        - PostProcessingService applies unified effects (Bloom, ChromaticAberration, TAA, etc.)
      */}
      <div className="absolute inset-0 z-0">
        <FrontendRenderer />
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
        State-driven conditional rendering: Menu OR Game UI overlays
        QUALIA.CODE: Pure UI layer that reacts to service-managed state
        CRISALIDA.CODE v2.0: Game component provides 3D content to FrontendRenderingService
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
