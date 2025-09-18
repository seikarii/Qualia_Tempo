/**
 * QUALIA.CODE v1.1 - Application Entry Point
 * InversifyJS IoC Bootstrap - PURE DEPENDENCY INJECTION
 * 
 * CRITICAL: This imports InversifyJS configuration which sets up the container.
 * NO manual service instantiation happens here.
 */

import 'reflect-metadata'; // MUST be first import for InversifyJS decorators
import React from 'react';
import ReactDOM from "react-dom/client";
import "./index.css";

// Import the InversifyJS configuration (executes container bindings)
import './services/inversify.config';
import { container } from './services/inversify.container';
import { TYPES } from './services/inversify.types';
import type { IApplicationInitializerService } from './services/interfaces/IApplicationInitializerService';

import App from "./App";

// Initialize application before rendering
const initializeApplication = async () => {
  try {
    // Get ApplicationInitializerService from container
    const applicationInitializer = container.get<IApplicationInitializerService>(TYPES.IApplicationInitializerService);
    
    // Start application initialization sequence
    await applicationInitializer.start();
    
    console.log('🎯 Application initialization completed successfully');
  } catch (error) {
    console.error('❌ Application initialization failed:', error);
    // Continue with rendering even if initialization fails
  }
};

// Get root element and create React root
const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");
const root = ReactDOM.createRoot(rootElement);

// Initialize application and then render
initializeApplication().then(() => {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});