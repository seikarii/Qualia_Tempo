/**
 * QUALIA.CODE v1.1 - Application Entry Point
 *
 * ARCHITECTURAL COMPLIANCE:
 * - MainLayout orchestrates all visual layers (FrontendRenderer, Atmosphere, UI)
 * - Single source of visual truth via FrontendRenderer (z-index: 0)
 * - Proper layer separation following QUALIA.CODE principles
 */

import React from "react";
import MainLayout from "./components/layout/MainLayout";

const App: React.FC = () => {
  return <MainLayout />;
};

export default App;
