import React from "react";

const QualiaTempoHUD = React.forwardRef<HTMLDivElement, any>((props, ref) => {
  return (
    <div 
      data-testid="qualia-tempo-hud" 
      ref={ref}
      {...props}
    >
      Mocked QualiaTempoHUD
    </div>
  );
});

QualiaTempoHUD.displayName = 'QualiaTempoHUD';

export default QualiaTempoHUD;
