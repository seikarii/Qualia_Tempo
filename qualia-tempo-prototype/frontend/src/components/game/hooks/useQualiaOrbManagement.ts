import { useState, useMemo } from "react";
import { useTimerService } from "../../../services/hooks";

interface QualiaOrbData {
  id: string;
  x: number;
  y: number;
  intensity: number;
  color: string;
}

/**
 * useQualiaOrbManagement Hook
 * 
 * QUALIA.CODE COMPLIANT: Custom hook for stateful orb management
 * Encapsulates orb state and lifecycle logic
 */
export const useQualiaOrbManagement = () => {
  const timerService = useTimerService();
  const [qualiaOrbsData, setQualiaOrbsData] = useState<string>("[]");

  const qualiaOrbs: QualiaOrbData[] = useMemo(() => {
    try {
      return JSON.parse(qualiaOrbsData);
    } catch {
      return [];
    }
  }, [qualiaOrbsData]);

  const addOrb = (change: number) => {
    const newOrb = {
      id: `orb-${timerService.now()}-${Math.random()}`,
      x: 20 + Math.random() * 60,
      y: 20 + Math.random() * 60,
      intensity: Math.min(change / 1000, 1),
      color: change > 500 ? "#ff00ff" : change > 200 ? "#00ffff" : "#ffff00",
    };

    setQualiaOrbsData((prevData) => {
      const prev = JSON.parse(prevData);
      return JSON.stringify([...prev, newOrb]);
    });

    timerService.setTimeout(() => {
      setQualiaOrbsData((prevData) => {
        const prev = JSON.parse(prevData);
        return JSON.stringify(prev.filter((orb: QualiaOrbData) => orb.id !== newOrb.id));
      });
    }, 2000);
  };

  return { qualiaOrbs, addOrb };
};
