import React from "react";

const MusicalNotesRenderer = React.forwardRef<HTMLDivElement, any>((props, ref) => {
  return (
    <div 
      data-testid="musical-notes-renderer" 
      ref={ref}
      {...props}
    >
      Mocked MusicalNotesRenderer
    </div>
  );
});

MusicalNotesRenderer.displayName = 'MusicalNotesRenderer';

export default MusicalNotesRenderer;
