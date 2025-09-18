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

import App from "./App";

// Get root element and create React root
const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");
const root = ReactDOM.createRoot(rootElement);

// Render the application directly - InversifyJS container is ready
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);