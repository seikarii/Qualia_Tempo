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

// Get root element and create React root
const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");
const root = ReactDOM.createRoot(rootElement);

// Show initial loading screen
root.render(
  <React.StrictMode>
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      flexDirection: 'column',
      fontFamily: 'monospace',
      color: '#00ffff',
      backgroundColor: '#000'
    }}>
      <h1>🎵 Loading Qualia Tempo...</h1>
      <div style={{ 
        width: '300px', 
        height: '4px', 
        background: '#333', 
        borderRadius: '2px',
        overflow: 'hidden',
        marginTop: '20px'
      }}>
        <div style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(90deg, #00ffff, #ff00ff)',
          animation: 'loading 2s ease-in-out infinite'
        }}></div>
      </div>
      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
      <p style={{ marginTop: '20px', opacity: 0.7 }}>Initializing services...</p>
    </div>
  </React.StrictMode>
);

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
    root.render(
      <React.StrictMode>
        <CompositionRootProvider container={compositionRoot}>
          <App />
        </CompositionRootProvider>
      </React.StrictMode>
    );

    compositionRoot.getServices().logger.info("Qualia Tempo Frontend Ready!");
  } catch (error) {
    // Handle initialization errors outside of React
    console.error("FATAL: Application failed to initialize", error);
    
    // Render a detailed error page
    root.render(
      <React.StrictMode>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          flexDirection: 'column',
          fontFamily: 'monospace',
          color: '#ff4444',
          backgroundColor: '#000',
          padding: '20px'
        }}>
          <h1>🚨 Application Initialization Failed</h1>
          <div style={{ 
            background: '#222', 
            padding: '20px', 
            borderRadius: '8px',
            marginTop: '20px',
            maxWidth: '80%',
            overflow: 'auto'
          }}>
            <h3>Error Details:</h3>
            <pre style={{ color: '#ff6666', wordWrap: 'break-word' }}>
              {error instanceof Error ? error.message : String(error)}
            </pre>
            {error instanceof Error && error.stack && (
              <details style={{ marginTop: '10px' }}>
                <summary style={{ cursor: 'pointer', color: '#ffaa00' }}>Stack Trace</summary>
                <pre style={{ color: '#888', fontSize: '12px', marginTop: '10px' }}>
                  {error.stack}
                </pre>
              </details>
            )}
          </div>
          <p style={{ marginTop: '20px', color: '#aaa' }}>
            Please check the browser console for more details.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              background: '#444',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Reload Application
          </button>
        </div>
      </React.StrictMode>
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
