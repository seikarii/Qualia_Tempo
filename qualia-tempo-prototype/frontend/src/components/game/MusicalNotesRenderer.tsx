import React, { useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useViewLogicService } from '../../services/hooks';
import { NoteVisualData } from '../../services/contracts/IViewLogicService.contracts';

interface Note {
  id: string;
  type: string;
  timing: number;
  position: [number, number, number];
  qualia_signature: string;
}

interface MusicalNotesRendererProps {
  notes: Note[];
  currentTime: number;
  onNoteHit?: (_noteId: string, _accuracy: number) => void;
}

/**
 * MusicalNotesRenderer - Stateless 3D note renderer
 * Uses ViewLogicService for all calculations, renders absolute values
 */
const MusicalNotesRenderer: React.FC<MusicalNotesRendererProps> = ({
  notes,
  currentTime,
}) => {
  const viewLogicService = useViewLogicService();
  const [noteVisuals, setNoteVisuals] = useState<NoteVisualData[]>([]);

  // Get visual data from ViewLogicService
  useFrame(() => {
    const visuals = viewLogicService.getMusicalNoteVisuals(notes, currentTime);
    setNoteVisuals(visuals);
  });

  return (
    <group>
      {noteVisuals.map((visual) => {
        if (!visual.isActive) return null;

        const geometry = getGeometryForType(visual.geometryType);

        return (
          <mesh
            key={visual.id}
            position={visual.position}
            scale={visual.scale}
            rotation={visual.rotation}
          >
            <primitive object={geometry} />
            <meshStandardMaterial
              color={visual.color}
              transparent
              opacity={visual.opacity}
              emissive={visual.isPerfectTiming ? [0.2, 0.2, 0.2] : [0, 0, 0]}
            />
            
            {/* Trail effect */}
            {visual.trail.visible && (
              <TrailEffect
                position={visual.position}
                color={new THREE.Color(...visual.trail.color)}
                scale={visual.trail.scale}
                opacity={visual.trail.opacity}
                rotation={0}
              />
            )}
          </mesh>
        );
      })}
    </group>
  );
};

export default MusicalNotesRenderer;

// Helper function to get geometry based on note type
function getGeometryForType(type: string): THREE.BufferGeometry {
  switch (type) {
    case "harmony":
      return new THREE.OctahedronGeometry(0.5);
    case "chaos":
      return new THREE.IcosahedronGeometry(0.5);
    case "power":
      return new THREE.BoxGeometry(0.8, 0.8, 0.8);
    case "grace":
      return new THREE.SphereGeometry(0.5, 16, 16);
    default:
      return new THREE.ConeGeometry(0.5, 1, 8);
  }
}

// Trail effect component - Now a pure component receiving calculated props
interface TrailEffectProps {
  position: [number, number, number];
  color: THREE.Color;
  scale: number;
  opacity: number;
  rotation: number;
}

const TrailEffect: React.FC<TrailEffectProps> = ({
  position,
  color,
  scale,
  opacity,
  rotation,
}) => {
  return (
    <mesh
      position={[position[0], position[1], position[2] + 1]}
      scale={[scale, scale, scale]}
      rotation={[0, 0, rotation]}
    >
      <ringGeometry args={[0.8, 1.2, 16]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};
