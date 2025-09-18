import React from "react";

const QualiaFieldRenderer = React.forwardRef<HTMLDivElement, any>((props, ref) => {
  return (
    <div 
      data-testid="qualia-field-renderer" 
      ref={ref}
      {...props}
    >
      Mocked QualiaFieldRenderer
    </div>
  );
});

QualiaFieldRenderer.displayName = 'QualiaFieldRenderer';

export default QualiaFieldRenderer;
