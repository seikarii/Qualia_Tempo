import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useCoordinateSystemService } from "../../services/hooks";

interface GridRendererProps {
  gridSize: number;
  tileSize: number;
  playerPosition: { x: number; y: number };
  activePositions?: [number, number][];
}

/**
 * GridRenderer - Renders the 2.5D game arena with interactive tiles
 * Core component for the rhythm game playfield
 */
const GridRenderer: React.FC<GridRendererProps> = ({
  gridSize = 8,
  tileSize = 1,
  playerPosition,
  activePositions = [],
}) => {
  const gridRef = useRef<THREE.Group>(null);
  const coordinateSystemService = useCoordinateSystemService();

  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    // QUALIA.CODE: Use player position directly from GameStateStore via props
    // This eliminates coupling to PlayerRenderer's visual state
    const playerGridPos = playerPosition;

    // Gentle pulsing animation for the grid
    if (gridRef.current) {
      gridRef.current.children.forEach((tile, index) => {
        // DELEGAR A SERVICIO: Obtener coordenadas de la baldosa desde el servicio centralizado
        const tileCoords = coordinateSystemService.indexToGrid(index);

        // Check if this tile is active (player position or combo positions)
        const isPlayerTile = playerGridPos.x === tileCoords.x && playerGridPos.y === tileCoords.y;
        const isActiveTile = activePositions.some(
          (pos) => pos[0] === tileCoords.x && pos[1] === tileCoords.y,
        );

        if (
          tile instanceof THREE.Mesh &&
          tile.material instanceof THREE.MeshStandardMaterial
        ) {
          if (isPlayerTile) {
            // Player tile glows
            tile.material.emissive.setHSL(
              0.6,
              1,
              0.3 + Math.sin(time * 4) * 0.2,
            );
            tile.position.y = Math.sin(time * 3) * 0.05;
          } else if (isActiveTile) {
            // Active tiles pulse
            tile.material.emissive.setHSL(
              0.1,
              0.8,
              0.2 + Math.sin(time * 2 + index * 0.5) * 0.1,
            );
            tile.position.y = Math.sin(time * 2 + index * 0.5) * 0.02;
          } else {
            // Default tiles
            tile.material.emissive.setHSL(0, 0, 0.05);
            tile.position.y = 0;
          }
        }
      });
    }
  });

  // Generate grid tiles
  const tiles = [];
  for (let x = 0; x < gridSize; x++) {
    for (let z = 0; z < gridSize; z++) {
      tiles.push(
        <mesh
          key={`tile-${x}-${z}`}
          position={[
            (x - gridSize / 2 + 0.5) * tileSize,
            0,
            (z - gridSize / 2 + 0.5) * tileSize,
          ]}
        >
          <boxGeometry args={[tileSize * 0.9, 0.1, tileSize * 0.9]} />
          <meshStandardMaterial
            color={new THREE.Color(0.2, 0.2, 0.3)}
            roughness={0.7}
            metalness={0.3}
          />
        </mesh>,
      );
    }
  }

  return (
    <group ref={gridRef}>
      {tiles}

      {/* Grid borders */}
      <lineSegments>
        <edgesGeometry
          args={[
            new THREE.PlaneGeometry(gridSize * tileSize, gridSize * tileSize),
          ]}
        />
        <lineBasicMaterial color={0x444444} />
      </lineSegments>
    </group>
  );
};

export default GridRenderer;
