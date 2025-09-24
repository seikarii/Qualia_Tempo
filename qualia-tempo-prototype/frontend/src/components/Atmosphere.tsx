// 🎯 QUALIA.CODE v1.2 - Atmosphere Component (Architecturally Pure)
// Este componente ha sido purgado de todo posicionamiento.
// Su única responsabilidad es renderizar los efectos.
// El layout es controlado EXCLUSIVAMENTE por su padre, MainLayout.tsx.

import React from 'react';

export const Atmosphere: React.FC = () => {
  return (
    <>
      {/* Capa de Grid Procedural - SIN POSICIONAMIENTO */}
      <div className="cyber-grid absolute inset-0" />

      {/* Capa de Bloom y Degradado Global - SIN POSICIONAMIENTO */}
      <div
        className="absolute inset-0 qualia-bloom-extreme mix-blend-screen opacity-70"
        style={{
          background: `radial-gradient(ellipse at center, 
            rgba(0, 255, 255, 0.15) 0%,
            rgba(128, 0, 255, 0.1) 40%,
            rgba(0, 0, 0, 0.8) 80%
          )`,
        }}
      />
    </>
  );
};