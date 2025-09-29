/**
 * QUALIA.CODE v1.1 - QualiaMainMenu Component
 * Purified UI-only menu component following architectural purity principles.
 *
 * ARCHITECTURAL COMPLIANCE:
 * - ELIMINATED: All DOM-based particle simulation logic
 * - ELIMINATED: Local visual effects (qualiaParticles, audioWaves)
 * - RETAINED: Pure UI elements (title, button, event emission)
 *
 * Visual effects are now the exclusive domain of FrontendRenderer.
 */

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useEventBus } from "../services/hooks";

export default function QualiaMainMenu() {
  // Services
  const eventBus = useEventBus();

  // Local state for UI interactions only
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  /**
   * Handle background clicks for visual impact effects
   * QUALIA.CODE v1.1 Compliance: Architecture-pure visual event emission
   */
  const handleBackgroundClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    eventBus.emit({
      type: "VisualImpactRequested",
      payload: { x, y, intensity: 0.8 },
    } as any); // Type assertion for event system compatibility
  };

  return (
    <div
      className="relative w-full h-full flex items-center justify-center"
      onClick={handleBackgroundClick}
    >
      <div className="flex flex-col items-center justify-center gap-12 p-8 pointer-events-auto">
        {/* PURIFIED: All particle and visual effects removed - now handled by FrontendRenderer */}

        {/* Main Title */}
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="text-center pointer-events-auto"
        >
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-orbitron font-black tracking-wider">
            <span className="relative">
              {/* QUALIA */}
              <span className="bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent animate-gradient-x">
                QUALIA
              </span>
              {/* Holographic glitch effect */}
              <span className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 via-purple-500/20 to-pink-500/20 bg-clip-text text-transparent animate-gradient-x opacity-50 blur-sm"></span>
              <span
                className="absolute inset-0 bg-gradient-to-r from-pink-500/10 via-cyan-400/10 to-purple-500/10 bg-clip-text text-transparent animate-gradient-x opacity-30 blur-md"
                style={{ animationDelay: "0.5s" }}
              ></span>
            </span>
            <br />
            <span className="relative">
              {/* TEMPO */}
              <span
                className="bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent animate-gradient-x"
                style={{ animationDelay: "0.25s" }}
              >
                TEMPO
              </span>
              {/* Holographic glitch effect */}
              <span
                className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 via-purple-500/20 to-pink-500/20 bg-clip-text text-transparent animate-gradient-x opacity-50 blur-sm"
                style={{ animationDelay: "0.25s" }}
              ></span>
              <span
                className="absolute inset-0 bg-gradient-to-r from-pink-500/10 via-cyan-400/10 to-purple-500/10 bg-clip-text text-transparent animate-gradient-x opacity-30 blur-md"
                style={{ animationDelay: "0.75s" }}
              ></span>
            </span>
          </h1>

          {/* Enhanced glow effect */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-cyan-400/20 via-purple-500/20 to-pink-500/20 rounded-full blur-3xl animate-pulse"></div>
          </div>
        </motion.div>

        {/* Subtitle */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
          className="text-center relative pointer-events-auto"
        >
          <h2 className="text-xl md:text-2xl lg:text-3xl font-orbitron font-medium tracking-widest text-cyan-300/90">
            A CHARLIE HELLSINGER STORY
          </h2>
          {/* Subtitle glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-8 bg-cyan-400/30 rounded-full blur-lg"></div>
          </div>
        </motion.div>

        {/* Interactive Instructions */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1.2 }}
          className="text-lg text-white/60 mb-12 font-light tracking-wide text-center"
        >
          IMMERSE IN GPU-RENDERED QUALIA
        </motion.p>

        {/* Start Button */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.5, delay: 1, ease: "easeOut" }}
          className="relative pointer-events-auto"
        >
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              // Emit StartGame event via EventBus following QUALIA.CODE architecture
              eventBus.emit({
                type: "PlayerAction",
                action: "StartGame",
                source: "QualiaMainMenu",
              } as any);
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onMouseDown={() => setIsPressed(true)}
            onMouseUp={() => setIsPressed(false)}
            onTouchStart={() => setIsPressed(true)}
            onTouchEnd={() => setIsPressed(false)}
            className={`
              relative px-12 py-6 font-orbitron font-bold text-lg md:text-xl tracking-wider
              border-2 border-transparent rounded-lg
              bg-gradient-to-r from-gray-900 to-black
              text-cyan-300
              overflow-hidden
              transition-all duration-300
              ${isPressed ? "scale-95" : ""}
            `}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {/* Animated border gradient */}
            <motion.div
              className="absolute inset-0 rounded-lg p-0.5 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500"
              animate={{
                backgroundPosition: isHovered
                  ? ["0% 50%", "100% 50%", "0% 50%"]
                  : "0% 50%",
                opacity: isHovered ? 1 : 0.8,
              }}
              transition={{
                duration: isHovered ? 2 : 0,
                repeat: isHovered ? Infinity : 0,
                ease: "linear",
              }}
              style={{ backgroundSize: "200% 200%" }}
            />

            {/* Inner border */}
            <div className="absolute inset-[3px] rounded-lg bg-gradient-to-br from-gray-900 to-black" />

            {/* Shimmer effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              style={{ width: "100%" }}
              animate={{
                x: isHovered ? ["-100%", "100%"] : "-100%",
              }}
              transition={{
                duration: isHovered ? 1.5 : 0,
                repeat: isHovered ? Infinity : 0,
                ease: "linear",
              }}
            />

            {/* Button text */}
            <span className="relative z-10 text-cyan-300 drop-shadow-[0_0_10px_rgba(56,189,248,0.8)]">
              INITIATE NEURAL SYNC
            </span>

            {/* Hover glow effects */}
            <motion.div
              className="absolute inset-0 rounded-lg bg-cyan-400/20 blur-xl"
              animate={{
                opacity: isHovered ? 0.8 : 0.3,
                scale: isHovered ? 1.2 : 1,
              }}
              transition={{ duration: 0.3 }}
            />

            {/* Additional hover glow */}
            <motion.div
              className="absolute inset-0 rounded-lg bg-purple-500/15 blur-2xl"
              animate={{
                opacity: isHovered ? 0.6 : 0.2,
                scale: isHovered ? 1.3 : 1,
              }}
              transition={{ duration: 0.4, delay: 0.1 }}
            />

            {/* Press effect */}
            <motion.div
              className="absolute inset-0 rounded-lg bg-black/40"
              animate={{
                opacity: isPressed ? 0.4 : 0,
              }}
              transition={{ duration: 0.1 }}
            />
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
