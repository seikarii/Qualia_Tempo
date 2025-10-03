import React, { useEffect, useRef } from "react";
import { ITimerService } from "../../../services/interfaces/ITimerService";

interface NeuralCanvasProps {
  flow: number;
  timerService: ITimerService;
}

/**
 * renderNeuralLines - Draw neural network visualization lines
 * QUALIA.CODE COMPLIANT: Extract Method Pattern
 */
const renderNeuralLines = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  flow: number,
  time: number
): void => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = `rgba(0, 255, 255, ${flow * 0.5})`;
  ctx.lineWidth = 1;

  for (let i = 0; i < 20; i++) {
    const x1 = Math.sin(time + i) * 50 + canvas.width / 2;
    const y1 = Math.cos(time + i) * 50 + canvas.height / 2;
    const x2 = Math.sin(time + i + 1) * 50 + canvas.width / 2;
    const y2 = Math.cos(time + i + 1) * 50 + canvas.height / 2;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
};

export const NeuralCanvas: React.FC<NeuralCanvasProps> = ({
  flow,
  timerService,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const animate = () => {
      const time = timerService.now() * 0.001;
      renderNeuralLines(ctx, canvas, flow, time);
      animationRef.current = timerService.requestAnimationFrame(() => animate());
    };

    animate();

    return () => {
      if (animationRef.current) {
        timerService.cancelAnimationFrame(animationRef.current);
      }
    };
  }, [flow, timerService]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-20 opacity-30"
      width={typeof window !== "undefined" ? window.innerWidth : 1920}
      height={typeof window !== "undefined" ? window.innerHeight : 1080}
    />
  );
};
