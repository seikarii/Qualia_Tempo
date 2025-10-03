import { useState, useEffect } from "react";
import { useEventBus, useTimerService } from "../../../services/hooks";
import type { PlayerActionEvent } from "../../../services/contracts/events.contracts";

/**
 * useScoreChangeAnimation Hook
 * 
 * QUALIA.CODE COMPLIANT: Custom hook for score change tracking
 * Manages score change animations and event emissions
 */
export const useScoreChangeAnimation = (score: number) => {
  const eventBus = useEventBus();
  const timerService = useTimerService();
  const [scoreChange, setScoreChange] = useState(0);
  const [lastScore, setLastScore] = useState(score);

  useEffect(() => {
    if (score !== lastScore) {
      const change = score - lastScore;
      setScoreChange(change);
      setLastScore(score);

      if (change > 0) {
        eventBus.emit<PlayerActionEvent>({
          type: "PlayerAction",
          action: "scoreIncrease",
          value: change,
          source: "QualiaTempoHUD",
        });
      }

      timerService.setTimeout(() => setScoreChange(0), 400);
    }
  }, [score, lastScore, eventBus, timerService]);

  return { scoreChange };
};
