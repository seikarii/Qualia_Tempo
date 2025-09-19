/**
 * QUALIA.CODE v1.1 - Application Entry Point (GOLD.CODE STANDARD)
 * InversifyJS IoC Bootstrap - PURE DEPENDENCY INJECTION
 */

import 'reflect-metadata'; // MUST be first import for InversifyJS decorators
import React from 'react';
import ReactDOM from "react-dom/client";
import "./index.css";

// Import the InversifyJS configuration which sets up the container.
import './services/inversify.config';
import { container } from './services/inversify.container';
import { TYPES } from './services/inversify.types';
import type { IApplicationInitializerService } from './services/interfaces/IApplicationInitializerService';
import type { ILogger } from './services/interfaces/ILogger';
import { LoggerProvider, QualiaLogger } from './services/Logger';

import App from "./App";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("CRITICAL: Root element not found in DOM.");
const root = ReactDOM.createRoot(rootElement);
const logger = container.get<ILogger>(TYPES.ILogger);

// CRITICAL: Register logger with LoggerProvider for decorator access
// This fixes the "[LoggerProvider] Logger not registered" warnings
LoggerProvider.register(logger as QualiaLogger);

// Application Bootstrap Sequence
const initializeAndRender = async () => {
  try {
    logger.info('Application Bootstrap: Initializing services...');
    const appInitializer = container.get<IApplicationInitializerService>(TYPES.IApplicationInitializerService);
    await appInitializer.start();
    logger.info('Application Bootstrap: Initialization complete. Rendering application.');

    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    logger.error('Application Bootstrap: CRITICAL FAILURE during initialization.', error);
    // Render a fallback UI in case of catastrophic failure
    root.render(
      <div style={{
        backgroundColor: 'black', color: 'red', height: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'monospace', fontSize: '24px', border: '2px solid red', margin: '20px'
      }}>
        FATAL: NEURAL CORE OFFLINE. CHECK CONSOLE.
      </div>
    );
  }
};

initializeAndRender();