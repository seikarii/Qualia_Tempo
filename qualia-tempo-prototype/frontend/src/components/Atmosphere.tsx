import React from 'react';

export const Atmosphere: React.FC = () => {
  return (
    <>
      {/* Capa de Grid Procedural */}
      <div className="cyber-grid fixed inset-0 z-0" />

      {/* Capa de Bloom y Degradado Global */}
      <div
        className="fixed inset-0 z-0 qualia-bloom-extreme mix-blend-screen opacity-70"
        style={{
          background: `radial-gradient(ellipse at center, 
            rgba(0, 255, 255, 0.15) 0%,
            rgba(128, 0, 255, 0.1) 40%,
            rgba(0, 0, 0, 0.8) 80%
          )`
        }}
      />
    </>
  );
};