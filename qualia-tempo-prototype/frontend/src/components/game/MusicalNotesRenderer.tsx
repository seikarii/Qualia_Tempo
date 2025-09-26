import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

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
 * MusicalNotesRenderer - Renders musical notes as interactive 3D objects
 * that players must hit in rhythm. Each note has visual effects based on
 * its qualia signature and timing.
 */
const MusicalNotesRenderer: React.FC<MusicalNotesRendererProps> = ({
  notes,
  currentTime,
  onNoteHit,
}) => {
  const notesGroupRef = useRef<THREE.Group>(null);

  // Calculate note states (approaching, hit window, missed)
  const noteStates = useMemo(() => {
    return notes.map((note) => {
      const timeDiff = note.timing - currentTime;
      const isActive = timeDiff > -1 && timeDiff < 5; // Show notes 5 seconds before and 1 second after
      const isInHitWindow = Math.abs(timeDiff) < 0.5; // 0.5 second hit window
      const isMissed = timeDiff < -0.5;
      const isPerfectTiming = Math.abs(timeDiff) < 0.1;

      return {
        ...note,
        timeDiff,
        isActive,
        isInHitWindow,
        isMissed,
        isPerfectTiming,
        scale: isInHitWindow ? 1.2 + Math.sin(Date.now() * 0.01) * 0.2 : 1,
        opacity: isMissed ? 0.3 : Math.max(0.1, 1 - Math.abs(timeDiff) / 5),
      };
    });
  }, [notes, currentTime]);

  // Note colors based on qualia signature
  const getNoteColor = (signature: string, timeDiff: number) => {
    const baseColors: Record<string, string> = {
      ORDER: "#4A90E2",
      CHAOS: "#E24A4A",
      HARMONY: "#50C878",
      DISCORD: "#FF6B6B",
      LIGHT: "#FFD700",
      SHADOW: "#8B5A8C",
    };

    const baseColor = baseColors[signature] || "#FFFFFF";
    const color = new THREE.Color(baseColor);

    // Pulse effect as note approaches hit window
    if (Math.abs(timeDiff) < 1) {
      const pulse = Math.sin(Date.now() * 0.01) * 0.3 + 0.7;
      color.multiplyScalar(pulse);
    }

    return color;
  };

  // Animate notes
  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    if (notesGroupRef.current) {
      notesGroupRef.current.children.forEach((child, index) => {
        const noteState = noteStates[index];
        if (!noteState || !noteState.isActive) return;

        const mesh = child as THREE.Mesh;

        // Animate position (notes move toward player)
        const progress = (5 - noteState.timeDiff) / 5; // 0 to 1 as note approaches
        mesh.position.z = noteState.position[2] - progress * 8;

        // Scale animation
        mesh.scale.setScalar(noteState.scale);

        // Rotation based on note type
        if (noteState.qualia_signature === "CHAOS") {
          mesh.rotation.x += 0.02;
          mesh.rotation.y += 0.03;
        } else if (noteState.qualia_signature === "ORDER") {
          mesh.rotation.y += 0.01;
        } else {
          mesh.rotation.x += Math.sin(time * 2) * 0.01;
          mesh.rotation.z += Math.cos(time * 1.5) * 0.01;
        }

        // Update material opacity and color
        if (mesh.material instanceof THREE.MeshStandardMaterial) {
          mesh.material.opacity = noteState.opacity;
          mesh.material.color = getNoteColor(
            noteState.qualia_signature,
            noteState.timeDiff,
          );

          // Perfect timing indicator
          if (noteState.isPerfectTiming) {
            mesh.material.emissive = new THREE.Color(0.2, 0.2, 0.2);
          } else {
            mesh.material.emissive = new THREE.Color(0, 0, 0);
          }
        }
      });
    }
  });

  return (
    <group ref={notesGroupRef}>
      {noteStates.map((noteState) => {
        if (!noteState.isActive) return null;

        const geometry = getGeometryForType(noteState.type);
        const color = getNoteColor(
          noteState.qualia_signature,
          noteState.timeDiff,
        );

        return (
          <mesh
            key={noteState.id}
            position={[
              noteState.position[0],
              noteState.position[1],
              noteState.position[2],
            ]}
            onClick={() => {
              if (noteState.isInHitWindow) {
                const accuracy = Math.max(
                  0,
                  1 - Math.abs(noteState.timeDiff) / 0.5,
                );
                onNoteHit(noteState.id, accuracy);
              }
            }}
          >
            <primitive object={geometry} />
            <meshStandardMaterial
              color={color}
              transparent={true}
              opacity={noteState.opacity}
              emissive={
                noteState.isPerfectTiming
                  ? new THREE.Color(0.2, 0.2, 0.2)
                  : new THREE.Color(0, 0, 0)
              }
            />

            {/* Hit Window Indicator */}
            {noteState.isInHitWindow && (
              <mesh>
                <ringGeometry args={[1.2, 1.5, 16]} />
                <meshBasicMaterial
                  color={color}
                  transparent={true}
                  opacity={0.5}
                  side={THREE.DoubleSide}
                />
              </mesh>
            )}

            {/* Perfect Timing Indicator */}
            {noteState.isPerfectTiming && (
              <mesh>
                <ringGeometry args={[0.8, 1.0, 8]} />
                <meshBasicMaterial
                  color="#FFD700"
                  transparent={true}
                  opacity={0.8}
                  side={THREE.DoubleSide}
                />
              </mesh>
            )}

            {/* Trail Effect */}
            <TrailEffect
              position={[
                noteState.position[0],
                noteState.position[1],
                noteState.position[2],
              ]}
              color={color}
              signature={noteState.qualia_signature}
            />
          </mesh>
        );
      })}
    </group>
  );
};

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
  position: _,
  color,
  signature,
}) => {
  const trailRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (trailRef.current) {
      // Simple trail effect - could be enhanced with more sophisticated particle system
      trailRef.current.rotation.z += 0.02;

      if (signature === "CHAOS") {
        trailRef.current.scale.x = 1 + Math.sin(Date.now() * 0.005) * 0.3;
        trailRef.current.scale.y = 1 + Math.cos(Date.now() * 0.007) * 0.3;
      }
    }
  });

  return (
    <mesh ref={trailRef} position={[0, 0, -0.5]}>
      <planeGeometry args={[2, 0.2]} />
      <meshBasicMaterial
        color={color}
        transparent={true}
        opacity={0.3}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
};

export default MusicalNotesRenderer;
