import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { CompositionRootProvider } from "./providers";

// Log startup
console.log("🎵 Qualia Tempo Frontend Starting...");
console.log("🏭 CompositionRoot: Initializing services...");
console.log("🔗 Backend Connection: Checking...");

// Error boundary for development
window.addEventListener("error", (event) => {
  console.error("🚨 Frontend Error:", event.error);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("🚨 Unhandled Promise Rejection:", event.reason);
});

// Mount React app with CompositionRoot
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <CompositionRootProvider>
      <App />
    </CompositionRootProvider>
  </React.StrictMode>,
);

// Global keyboard shortcuts
document.addEventListener("keydown", (event) => {
  // ESC key - reset game
  if (event.key === "Escape") {
    console.log("🔄 ESC pressed - Game reset requested");
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

console.log("✅ Qualia Tempo Frontend Ready!");
