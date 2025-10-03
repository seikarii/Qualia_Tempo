import React, { useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useViewLogicService } from '../../services/hooks';
import { NoteVisualData } from '../../services/contracts/IViewLogicService.contracts';
import { NOTE_GEOMETRY_TYPES } from '../../services/contracts/constants';

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
 * Convert Note[] to NoteData[] for ViewLogicService
 */
const convertNotesToNoteData = (notes: Note[]) => {
  return notes.map(note => ({
    id: note.id,
    timestamp: note.timing,
    position: { x: note.position[0], y: note.position[1] },
    duration: 1.0, // Default duration
    qualia_signature: note.qualia_signature,
    state: 'active' as const,
  }));
};

/**
 * Individual note renderer component
 */
const NoteRenderer: React.FC<{ visual: NoteVisualData }> = ({ visual }) => {
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
};

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
    const noteDataArray = convertNotesToNoteData(notes);
    const visuals = viewLogicService.getMusicalNoteVisuals(noteDataArray, currentTime);
    setNoteVisuals(visuals);
  });

  return (
    <group>
      {noteVisuals.map((visual) => (
        <NoteRenderer key={visual.id} visual={visual} />
      ))}
    </group>
  );
};

export default MusicalNotesRenderer;

/**
 * QUALIA.CODE v1.1 Compliant: Geometry Factory
 * Maps geometry type constants to Three.js geometries
 * NO BUSINESS LOGIC - Pure rendering concern
 */
function getGeometryForType(geometryType: string): THREE.BufferGeometry {
  switch (geometryType) {
    case NOTE_GEOMETRY_TYPES.HARMONY:
      return new THREE.OctahedronGeometry(0.5);
    case NOTE_GEOMETRY_TYPES.CHAOS:
      return new THREE.IcosahedronGeometry(0.5);
    case NOTE_GEOMETRY_TYPES.POWER:
      return new THREE.BoxGeometry(0.8, 0.8, 0.8);
    case NOTE_GEOMETRY_TYPES.GRACE:
      return new THREE.SphereGeometry(0.5, 16, 16);
    case NOTE_GEOMETRY_TYPES.DEFAULT:
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
