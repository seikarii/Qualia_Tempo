import React from "react";

const PlayerAvatar = React.forwardRef<HTMLDivElement, any>((props, ref) => {
  return (
    <div data-testid="player-avatar" ref={ref} {...props}>
      Mocked PlayerAvatar
    </div>
  );
});

PlayerAvatar.displayName = "PlayerAvatar";

export default PlayerAvatar;
