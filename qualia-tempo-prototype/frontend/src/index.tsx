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
// Main application component
import App from "./App";
// Import gameStoreApi for UI-Service bridge
import { gameStoreApi } from "./state/useGameStore";

/**
 * Bootstrap logger for critical failures before IoC container is available
 * QUALIA.CODE COMPLIANT: Minimal logging for pre-container critical errors only
 */
class BootstrapLogger {
  static error(message: string, error?: unknown): void {
    // QUALIA.CODE EXCEPTION: Critical bootstrap failures require direct console access
    // This is the ONLY allowed use of console methods outside the Logger service
    console.error(`[BOOTSTRAP ERROR] ${message}`, error);
  }
}

/**
 * QUALIA.CODE COMPLIANT: Application initialization via Composition Root
 * NO direct container access - delegates to ApplicationCompositionRoot
 * RESPECTS LAYER BOUNDARIES: Services first, then UI-Service bridge, then application start
 */
const initializeApplication = async (): Promise<boolean> => {
  try {
    // Step 1: Initialize service layer (WITHOUT UI dependencies)
    const compositionRoot = new ApplicationCompositionRoot();
    await compositionRoot.initializeServices();

    // Step 2: Establish UI-Service bridge with pre-imported gameStoreApi
    await compositionRoot.bridgeUi(gameStoreApi);

    // Step 3: Start the application now that UI bridge is established
    await compositionRoot.startApplication();

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
  const initialized = React.useRef(false);

  React.useEffect(() => {

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
