'use client'

import MainMenu from '@/components/MainMenu'

export default function Home() {
  const handleStartGame = () => {
    console.log('Starting Qualia Tempo...')
    // Here you would typically initialize the game state
    // and transition to the game interface
  }

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* This would be the BackendCanvas component mentioned in the requirements */}
      {/* For now, we'll create a placeholder background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-purple-900/20 to-black">
        {/* Animated background particles simulation */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
          <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-purple-400 rounded-full animate-pulse delay-75"></div>
          <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-pink-400 rounded-full animate-pulse delay-100"></div>
          <div className="absolute bottom-1/3 right-1/4 w-1 h-1 bg-cyan-400 rounded-full animate-pulse delay-150"></div>
          <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-purple-400 rounded-full animate-pulse delay-200"></div>
        </div>
      </div>
      
      {/* Main Menu Component */}
      <MainMenu handleStartGame={handleStartGame} />
    </div>
  )
}