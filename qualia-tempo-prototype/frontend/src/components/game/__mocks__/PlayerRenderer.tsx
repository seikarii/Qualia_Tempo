import React from "react";

const PlayerRenderer = React.forwardRef<HTMLDivElement, any>((props, ref) => {
  return (
    <div 
      data-testid="player-renderer" 
      ref={ref}
      {...props}
    >
      Mocked PlayerRenderer
    </div>
  );
});

PlayerRenderer.displayName = 'PlayerRenderer';

export default PlayerRenderer;
