// 🎯 QUALIA.CODE v1.2 - Atmosphere Component (Architecturally Pure)
// Este componente ha sido purgado de todo posicionamiento.
// Su única responsabilidad es renderizar los efectos.
// El layout es controlado EXCLUSIVAMENTE por su padre, MainLayout.tsx.

import React from "react";

export const Atmosphere: React.FC = () => {
  return (
    <>
      {/* Capa de Grid Procedural - SIN POSICIONAMIENTO */}
      <div className="cyber-grid absolute inset-0" />

      {/* Capa de Bloom y Degradado Global - ENHANCED for GPU particle visibility */}
      <div
        className="absolute inset-0 qualia-bloom-extreme mix-blend-screen opacity-80"
        style={{
          background: `radial-gradient(ellipse at center, 
            rgba(0, 255, 255, 0.25) 0%,
            rgba(128, 0, 255, 0.18) 30%,
            rgba(255, 0, 128, 0.12) 50%,
            rgba(10, 10, 30, 0.9) 80%
          )`,
        }}
      />

      {/* Additional subtle base layer for particle contrast */}
      <div
        className="absolute inset-0 pointer-events-none opacity-60"
        style={{
          background: `linear-gradient(45deg, 
            rgba(2, 2, 12, 0.8) 0%,
            rgba(8, 4, 20, 0.6) 50%,
            rgba(2, 2, 12, 0.8) 100%
          )`,
        }}
      />
    </>
  );
};
