import React from "react";
import type { QualiaState } from "../../types/contracts";

interface PlayerAvatarProps {
  position: [number, number, number];
  qualiaState: QualiaState;
}

const PlayerAvatar: React.FC<PlayerAvatarProps> = ({
  position,
  qualiaState,
}) => {
  const [x, y, z] = position; // Extract position coordinates (x, y, z for 3D positioning)

  // Map QualiaState to visual properties
  const intensityHue = qualiaState.intensity * 360;
  // const flowOpacity = 0.3 + (qualiaState.flow * 0.7); // Reserved for future use
  const precisionSize = 30 + qualiaState.precision * 20;
  const chaosRotation = qualiaState.chaos * 180;
  const transcendenceGlow = qualiaState.transcendence * 20;

    // Avatar style based on QualiaState
  const avatarStyle: React.CSSProperties = {
    position: "fixed",
    left: `${400 + x * 80 + z * 20}px`, // X for horizontal, Z for depth offset
    top: `${300 + y * 80}px`, // Y for vertical positioning
    width: `${precisionSize}px`,
    height: `${precisionSize}px`,
    borderRadius: "50%",
    background: `radial-gradient(circle, 
      hsl(${intensityHue}, 80%, 60%) 0%, 
      hsl(${intensityHue + 60}, 70%, 50%) 40%,
      rgba(255,255,255,0.3) 70%)`,
    border: `4px solid hsl(${intensityHue}, 90%, 70%)`,
    opacity: 1,
    transform: `rotate(${chaosRotation}deg) scale(${1 + qualiaState.aggression * 0.5})`,
    boxShadow: `0 0 ${15 + transcendenceGlow}px hsl(${intensityHue}, 100%, 80%), 
                inset 0 0 15px rgba(255,255,255,0.4)`,
    transition: "all 0.2s ease-in-out",
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
    color: "#fff",
    fontWeight: "bold",
    textShadow: "2px 2px 4px rgba(0,0,0,1)",
  };

  // Recovery visual effect
  const recoveryStyle: React.CSSProperties =
    qualiaState.recovery > 0
      ? {
          position: "absolute",
          top: "50%",
          left: "50%",
          width: `${60 + qualiaState.recovery * 40}px`,
          height: `${60 + qualiaState.recovery * 40}px`,
          borderRadius: "50%",
          border: `3px dashed hsl(200, 80%, 60%)`,
          transform: "translate(-50%, -50%)",
          opacity: qualiaState.recovery * 0.8,
          animation: "spin 2s linear infinite",
        }
      : {};

  return (
    <div style={avatarStyle}>
      🔥
      {qualiaState.recovery > 0 && (
        <div style={recoveryStyle}>
          <style>{`
            @keyframes spin {
              from { transform: translate(-50%, -50%) rotate(0deg); }
              to { transform: translate(-50%, -50%) rotate(360deg); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
};

export default PlayerAvatar;
