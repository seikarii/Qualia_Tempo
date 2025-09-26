/**
 * QUALIA.CODE v1.1 - Application Entry Point (GOLD.CODE STANDARD)
 * InversifyJS IoC Bootstrap - PURE DEPENDENCY INJECTION
 */

import "reflect-metadata"; // MUST be first import for InversifyJS decorators
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

// Import the InversifyJS configuration which sets up the container.
import "./services/inversify.config";
import { container } from "./services/inversify.container";
import { TYPES } from "./services/inversify.types";
import type { IApplicationInitializerService } from "./services/interfaces/IApplicationInitializerService";
import type { ILogger } from "./services/interfaces/ILogger";
import { LoggerProvider, QualiaLogger } from "./services/Logger";

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
 * Factory function for application initialization (not a React component)
 * Keeps container access outside React component tree
 */
const initializeApplication = async (): Promise<boolean> => {
  try {
    const logger = container.get<ILogger>(TYPES.ILogger);
    const appInitializer = container.get<IApplicationInitializerService>(
      TYPES.IApplicationInitializerService,
    );

    // Register logger for decorator access
    LoggerProvider.register(logger as QualiaLogger);

    logger.info("Application Bootstrap: Initializing services...");
    await appInitializer.start();
    logger.info(
      "Application Bootstrap: Initialization complete. Rendering application.",
    );
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
    initializeApplication().then((success) => {
      if (success) {
        setIsInitialized(true);
      } else {
        setInitError(true);
      }
    });
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

  return <App />;
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
