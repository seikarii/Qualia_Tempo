'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'

interface MainMenuProps {
  handleStartGame: () => void
}

interface QualiaParticle {
  id: number
  x: number
  y: number
  size: number
  color: string
  vx: number
  vy: number
  life: number
  maxLife: number
  frequency: number
}

export default function MainMenu({ handleStartGame }: MainMenuProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isPressed, setIsPressed] = useState(false)
  const [qualiaParticles, setQualiaParticles] = useState<QualiaParticle[]>([])
  const [audioWaves, setAudioWaves] = useState<{id: number, x: number, y: number, radius: number, opacity: number}[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const particleId = useRef(0)
  const waveId = useRef(0)

  // Generate qualia particles
  useEffect(() => {
    const generateQualia = () => {
      if (!containerRef.current) return
      
      const container = containerRef.current
      const newParticle: QualiaParticle = {
        id: particleId.current++,
        x: Math.random() * container.clientWidth,
        y: Math.random() * container.clientHeight,
        size: Math.random() * 8 + 4,
        color: ['cyan', 'purple', 'pink'][Math.floor(Math.random() * 3)],
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        life: 1,
        maxLife: Math.random() * 3 + 2,
        frequency: Math.random() * 0.02 + 0.01
      }
      
      setQualiaParticles(prev => [...prev, newParticle])
    }

    const interval = setInterval(generateQualia, 800)
    return () => clearInterval(interval)
  }, [])

  // Update particles
  useEffect(() => {
    const updateParticles = () => {
      setQualiaParticles(prev => 
        prev
          .map(p => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            life: p.life - 0.01,
            size: p.size * (1 - p.frequency)
          }))
          .filter(p => p.life > 0 && p.size > 0.5)
      )
      
      setAudioWaves(prev => 
        prev
          .map(w => ({
            ...w,
            radius: w.radius + 3,
            opacity: w.opacity - 0.02
          }))
          .filter(w => w.opacity > 0)
      )
    }

    const animationId = requestAnimationFrame(function animate() {
      updateParticles()
      animationId = requestAnimationFrame(animate)
    })
    
    return () => cancelAnimationFrame(animationId)
  }, [])

  const handleQualiaClick = (particle: QualiaParticle, e: React.MouseEvent) => {
    // Create audio wave effect
    const rect = e.currentTarget.getBoundingClientRect()
    const newWave = {
      id: waveId.current++,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      radius: 0,
      opacity: 1
    }
    setAudioWaves(prev => [...prev, newWave])
    
    // Create burst of smaller particles
    const burstParticles: QualiaParticle[] = []
    for (let i = 0; i < 8; i++) {
      burstParticles.push({
        id: particleId.current++,
        x: particle.x,
        y: particle.y,
        size: Math.random() * 4 + 2,
        color: particle.color,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        life: 1,
        maxLife: 1,
        frequency: 0.05
      })
    }
    setQualiaParticles(prev => [...prev, ...burstParticles])
    
    // Remove the clicked particle
    setQualiaParticles(prev => prev.filter(p => p.id !== particle.id))
  }

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (!containerRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // Create larger qualia burst on background click
    const burstParticles: QualiaParticle[] = []
    for (let i = 0; i < 12; i++) {
      burstParticles.push({
        id: particleId.current++,
        x: x,
        y: y,
        size: Math.random() * 12 + 6,
        color: ['cyan', 'purple', 'pink'][Math.floor(Math.random() * 3)],
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 1,
        maxLife: Math.random() * 2 + 1,
        frequency: 0.03
      })
    }
    setQualiaParticles(prev => [...prev, ...burstParticles])
    
    // Create audio wave
    const newWave = {
      id: waveId.current++,
      x: x,
      y: y,
      radius: 0,
      opacity: 1
    }
    setAudioWaves(prev => [...prev, newWave])
  }

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 flex items-center justify-center z-50 cursor-crosshair"
      onClick={handleBackgroundClick}
    >
      {/* Background overlay with blur and radial gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/30 to-transparent backdrop-blur-sm" />
      
      {/* Interactive Qualia Particles */}
      <AnimatePresence>
        {qualiaParticles.map(particle => (
          <motion.div
            key={particle.id}
            className="absolute rounded-full cursor-pointer"
            style={{
              left: particle.x,
              top: particle.y,
              width: particle.size,
              height: particle.size,
              background: `radial-gradient(circle, ${particle.color === 'cyan' ? '#22d3ee' : particle.color === 'purple' ? '#a855f7' : '#ec4899'} 0%, transparent 70%)`,
              boxShadow: `0 0 ${particle.size * 2}px ${particle.color === 'cyan' ? '#22d3ee' : particle.color === 'purple' ? '#a855f7' : '#ec4899'}40`,
              opacity: particle.life,
            }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={(e) => {
              e.stopPropagation()
              handleQualiaClick(particle, e)
            }}
            whileHover={{ scale: 1.5 }}
            whileTap={{ scale: 0.8 }}
          />
        ))}
      </AnimatePresence>
      
      {/* Audio Wave Effects */}
      {audioWaves.map(wave => (
        <motion.div
          key={wave.id}
          className="absolute rounded-full border-2 pointer-events-none"
          style={{
            left: wave.x,
            top: wave.y,
            width: wave.radius * 2,
            height: wave.radius * 2,
            borderColor: wave.opacity > 0.5 ? '#22d3ee' : wave.opacity > 0.3 ? '#a855f7' : '#ec4899',
            opacity: wave.opacity,
            transform: 'translate(-50%, -50%)',
          }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
        />
      ))}
      
      {/* Floating Qualia Orbs */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: Math.random() * 20 + 10,
              height: Math.random() * 20 + 10,
              background: `radial-gradient(circle, ${['#22d3ee', '#a855f7', '#ec4899'][i % 3]}40 0%, transparent 70%)`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              x: [0, Math.random() * 100 - 50],
              y: [0, Math.random() * 100 - 50],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: Math.random() * 4 + 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
      
      {/* Menu container */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-12 p-8 pointer-events-none">
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
              <span className="absolute inset-0 bg-gradient-to-r from-pink-500/10 via-cyan-400/10 to-purple-500/10 bg-clip-text text-transparent animate-gradient-x opacity-30 blur-md" style={{ animationDelay: '0.5s' }}></span>
            </span>
            <br />
            <span className="relative">
              {/* TEMPO */}
              <span className="bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent animate-gradient-x" style={{ animationDelay: '0.25s' }}>
                TEMPO
              </span>
              {/* Holographic glitch effect */}
              <span className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 via-purple-500/20 to-pink-500/20 bg-clip-text text-transparent animate-gradient-x opacity-50 blur-sm" style={{ animationDelay: '0.25s' }}></span>
              <span className="absolute inset-0 bg-gradient-to-r from-pink-500/10 via-cyan-400/10 to-purple-500/10 bg-clip-text text-transparent animate-gradient-x opacity-30 blur-md" style={{ animationDelay: '0.75s' }}></span>
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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ duration: 1.5, delay: 1.5 }}
          className="text-center text-sm font-orbitron text-cyan-300/60 pointer-events-auto"
        >
          CLICK ANYWHERE TO GENERATE QUALIA
        </motion.div>

        {/* Start Button */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.5, delay: 1, ease: "easeOut" }}
          className="relative pointer-events-auto"
        >
          <motion.button
            onClick={(e) => {
              e.stopPropagation()
              handleStartGame()
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
              ${isPressed ? 'scale-95' : ''}
            `}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {/* Animated border gradient */}
            <motion.div
              className="absolute inset-0 rounded-lg p-0.5 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500"
              animate={{
                backgroundPosition: isHovered ? ['0% 50%', '100% 50%', '0% 50%'] : '0% 50%',
                opacity: isHovered ? 1 : 0.8,
              }}
              transition={{
                duration: isHovered ? 2 : 0,
                repeat: isHovered ? Infinity : 0,
                ease: "linear"
              }}
              style={{ backgroundSize: '200% 200%' }}
            />
            
            {/* Inner border */}
            <div className="absolute inset-[3px] rounded-lg bg-gradient-to-br from-gray-900 to-black" />
            
            {/* Shimmer effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              style={{ width: '100%' }}
              animate={{
                x: isHovered ? ['-100%', '100%'] : '-100%',
              }}
              transition={{
                duration: isHovered ? 1.5 : 0,
                repeat: isHovered ? Infinity : 0,
                ease: "linear"
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
  )
}