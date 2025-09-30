import React, { useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useViewLogicService } from "../../services/hooks";
import { GridVisualData } from "../../services/contracts/IViewLogicService.contracts";

interface GridRendererProps {
  gridSize: number;
  tileSize: number;
  playerPosition: { x: number; y: number };
  activePositions?: [number, number][];
}

/**
 * GridRenderer - Stateless 2.5D game arena renderer
 * Uses ViewLogicService for all calculations, renders absolute values
 */
const GridRenderer: React.FC<GridRendererProps> = ({
  gridSize = 8,
  tileSize = 1,
  playerPosition,
  activePositions = [],
}) => {
  const viewLogicService = useViewLogicService();
  const [gridVisuals, setGridVisuals] = useState<GridVisualData>({ tiles: [], gridBorders: { size: 0, color: [0, 0, 0] } });

  // Get visual data from ViewLogicService
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const visuals = viewLogicService.getGridVisuals(gridSize, tileSize, playerPosition, activePositions, time);
    setGridVisuals(visuals);
  });

  return (
    <group>
      {/* Render tiles from visual data */}
      {gridVisuals.tiles.map((tile) => (
        <mesh
          key={tile.key}
          position={tile.position}
        >
          <boxGeometry args={[tileSize * 0.9, 0.1, tileSize * 0.9]} />
          <meshStandardMaterial
            color={new THREE.Color(...tile.baseColor)}
            emissive={new THREE.Color(...tile.emissiveColor)}
            roughness={0.7}
            metalness={0.3}
          />
        </mesh>
      ))}

      {/* Grid borders */}
      <lineSegments>
        <edgesGeometry
          args={[
            new THREE.PlaneGeometry(gridVisuals.gridBorders.size, gridVisuals.gridBorders.size),
          ]}
        />
        <lineBasicMaterial color={new THREE.Color(...gridVisuals.gridBorders.color)} />
      </lineSegments>
    </group>
  );
};

export default GridRenderer;
