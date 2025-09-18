import React from "react";

const BossRenderer = React.forwardRef<HTMLDivElement, any>((props, ref) => {
  return (
    <div 
      data-testid="boss-renderer" 
      ref={ref}
      {...props}
    >
      Mocked BossRenderer
    </div>
  );
});

BossRenderer.displayName = 'BossRenderer';

export default BossRenderer;
