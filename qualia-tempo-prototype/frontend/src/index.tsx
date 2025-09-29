import "reflect-metadata"; // MUST be first import for InversifyJS decorators
/**
 * QUALIA.CODE v1.1 - Application Entry Point (GOLD.CODE STANDARD)
 * InversifyJS IoC Bootstrap - PURE DEPENDENCY INJECTION
 */
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

// Import the InversifyJS configuration which sets up the container.
import "./services/inversify.config";
import { container } from "./services/inversify.config";
// Import ApplicationCompositionRoot for proper bootstrap
import { ApplicationCompositionRoot } from "./services/ApplicationCompositionRoot";
// Import ServiceProvider for context-based container provision
import { ServiceProvider } from "./services/ServiceContext";
// Import types for the Composition Root pattern implementation
import type { IGameStateStoreService } from "./services/interfaces/IGameStateStoreService";
import { TYPES } from "./services/inversify.types";
// Import useGameStore - safe after React context is established
import { useGameStore } from "./state/useGameStore";

import App from "./App";

/**
 * Bootstrap logger for critical failures before IoC container is available
 * QUALIA.CODE COMPLIANT: Minimal logging for pre-container critical errors only
 */
class BootstrapLogger {
  static error(message: string, error?: any): void {
    // QUALIA.CODE EXCEPTION: Critical bootstrap failures require direct console access
    // This is the ONLY allowed use of console methods outside the Logger service
    console.error(`[BOOTSTRAP ERROR] ${message}`, error);
  }
}

/**
 * QUALIA.CODE COMPLIANT: Application initialization via Composition Root
 * NO direct container access - delegates to ApplicationCompositionRoot
 */
const initializeApplication = async (): Promise<boolean> => {
  try {
    const compositionRoot = new ApplicationCompositionRoot();
    await compositionRoot.initializeApplication();
    return true;
  } catch (error) {
    BootstrapLogger.error(
      "Application Bootstrap: CRITICAL FAILURE during initialization.",
      error,
    );
    return false;
  }
};

/**
 * AppBootstrap Component - Manages application lifecycle
 */
const AppBootstrap: React.FC = () => {
  const [isInitialized, setIsInitialized] = React.useState(false);
  const [initError, setInitError] = React.useState(false);

  React.useEffect(() => {
    const initialized = React.useRef(false);

    const init = async () => {
      if (initialized.current) return;
      initialized.current = true;

      const success = await initializeApplication();
      if (success) {
        setIsInitialized(true);
      } else {
        setInitError(true);
      }
    };

    init();
  }, []);

  if (initError) {
    return (
      <div
        style={{
          backgroundColor: "black",
          color: "red",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "monospace",
          fontSize: "24px",
          border: "2px solid red",
          margin: "20px",
        }}
      >
        FATAL: NEURAL CORE OFFLINE. CHECK CONSOLE.
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div
        style={{
          backgroundColor: "black",
          color: "cyan",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "monospace",
          fontSize: "18px",
        }}
      >
        INITIALIZING NEURAL CORE...
      </div>
    );
  }

  // CRITICAL: After services are initialized, manually connect UI layer to service layer
  // This is the Composition Root pattern - wiring dependencies at the application's true root
  const gameStateStoreService = container.get<IGameStateStoreService>(TYPES.IGameStateStoreService);
  
  // Connect the UI layer to the service layer - safe after React context is established
  gameStateStoreService.setStoreSetter(useGameStore.setState);

  return (
    <ServiceProvider container={container}>
      <App />
    </ServiceProvider>
  );
};

// Bootstrap the application
const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("CRITICAL: Root element not found in DOM.");

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <AppBootstrap />
  </React.StrictMode>,
);
