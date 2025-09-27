declare global {
  interface Window {
    electronAPI?: {
      toggleFullscreen: () => void;
    };
  }
}

export {};
