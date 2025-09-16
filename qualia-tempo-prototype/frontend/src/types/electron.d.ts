/* eslint-disable no-unused-vars */
declare global {
  interface Window {
    electronAPI?: {
      toggleFullscreen: () => void;
    };
  }
}

export {};
/* eslint-enable no-unused-vars */
