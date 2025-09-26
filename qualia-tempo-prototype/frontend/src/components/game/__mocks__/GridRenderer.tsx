import React from "react";

const GridRenderer = React.forwardRef<HTMLDivElement, any>((props, ref) => {
  return (
    <div data-testid="grid-renderer" ref={ref} {...props}>
      Mocked GridRenderer
    </div>
  );
});

GridRenderer.displayName = "GridRenderer";

export default GridRenderer;
