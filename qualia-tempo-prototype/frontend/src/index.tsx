/**
 * QUALIA.CODE v6 - Application Entry Point
 * PURE DI: UI layer receives pre-initialized services, never creates them
 */

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { CompositionRootProvider } from "./services/CompositionRoot.provider";
import { ConfigurationService } from "./services/ConfigurationService";
import { CompositionRoot } from "./services/CompositionRoot";

// PURE DI: Business logic layer creates and initializes all services
async function initializeApplication() {
  try {
    // 1. Crear el servicio de configuración
    const configService = new ConfigurationService();

    // 2. Cargar la configuración unificada (game-config.yaml)
    await configService.loadUnifiedConfig();

    // 3. Instanciar CompositionRoot SOLO después de cargar la configuración
    const compositionRoot = new CompositionRoot(configService);

    // 4. Inicializar los servicios
    await compositionRoot.initialize();

    // 5. Usar el logger para mensajes informativos
    compositionRoot.getServices().logger.info("Qualia Tempo Frontend Starting...");
    compositionRoot.getServices().logger.info("CompositionRoot: Services initialized");
    compositionRoot.getServices().logger.info("Backend Connection: Checking...");

    // 6. Renderizar React solo tras inicialización exitosa
    const root = ReactDOM.createRoot(document.getElementById("root")!);
    root.render(
      <React.StrictMode>
        <CompositionRootProvider container={compositionRoot}>
          <App />
        </CompositionRootProvider>
      </React.StrictMode>
    );

    compositionRoot.getServices().logger.info("Qualia Tempo Frontend Ready!");
  } catch (error) {
    // 4. Handle initialization errors outside of React
    console.error("FATAL: Application failed to initialize", error);
    
    // Render a static error page
    const root = ReactDOM.createRoot(document.getElementById("root")!);
    root.render(
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        fontFamily: 'monospace',
        color: '#ff4444',
        backgroundColor: '#000'
      }}>
        <h1>🚨 Application Initialization Failed</h1>
        <pre style={{ background: '#222', padding: '20px', borderRadius: '8px' }}>
          {error instanceof Error ? error.message : String(error)}
        </pre>
        <p>Please check the browser console for more details.</p>
      </div>
    );
  }
}

// Error boundary for development
window.addEventListener("error", (event) => {
  console.error("Frontend Error:", event.error);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled Promise Rejection:", event.reason);
});

// Global keyboard shortcuts
document.addEventListener("keydown", (event) => {
  // ESC key - reset game
  if (event.key === "Escape") {
    console.log("ESC pressed - Game reset requested");
    // The actual reset will be handled by the game store
  }

  // F11 - toggle fullscreen (if in Electron)
  if (event.key === "F11") {
    event.preventDefault();
    if (window.electronAPI) {
      window.electronAPI.toggleFullscreen();
    }
  }
});

// Start the application
initializeApplication();
