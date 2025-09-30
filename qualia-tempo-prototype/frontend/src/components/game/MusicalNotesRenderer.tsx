import React, { useState, useRef } from "react";
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
  onNoteHit: (_noteId: string, _accuracy: number) => void;
}

/**
 * MusicalNotesRenderer - Stateless 3D note renderer
 * Uses ViewLogicService for all calculations, renders absolute values
 */
const MusicalNotesRenderer: React.FC<MusicalNotesRendererProps> = ({
  notes,
  currentTime,
  onNoteHit,
}) => {
  const viewLogicService = useViewLogicService();
  const [noteVisuals, setNoteVisuals] = useState<NoteVisualData[]>([]);

  // Get visual data from ViewLogicService
  useFrame(() => {
    const visuals = viewLogicService.getMusicalNoteVisuals(notes, currentTime);
    setNoteVisuals(visuals);
  });

  const handleNoteClick = (noteId: string, visual: NoteVisualData) => {
    if (visual.isInHitWindow) {
      const accuracy = visual.isPerfectTiming ? 1.0 : 0.8;
      onNoteHit(noteId, accuracy);
    }
  };

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
            onClick={() => handleNoteClick(visual.id, visual)}
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
                signature={visual.geometryType}
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

// Trail effect component
interface TrailEffectProps {
  position: [number, number, number];
  color: THREE.Color;
  signature: string;
}

const TrailEffect: React.FC<TrailEffectProps> = ({
  position,
  color,
  signature,
}) => {
  const trailRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (trailRef.current) {
      const time = state.clock.getElapsedTime();

      // Create trailing effect based on signature
      const rotationSpeed = signature === 'chaos' ? 1.0 : 0.5;
      trailRef.current.rotation.z = time * rotationSpeed;
      trailRef.current.scale.setScalar(0.5 + Math.sin(time * 2) * 0.2);

      // Update opacity
      const material = trailRef.current.material as THREE.MeshBasicMaterial;
      if (material) {
        material.opacity = 0.3 + Math.sin(time * 3) * 0.2;
      }
    }
  });

  return (
    <mesh ref={trailRef} position={[position[0], position[1], position[2] + 1]}>
      <ringGeometry args={[0.8, 1.2, 16]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.5}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};
