/**
 * Voice Waveform Component
 * 
 * Canvas-based audio visualization for voice playback and microphone input.
 * Features smooth animated waveforms with customizable colors and styles.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, Mic, MicOff, Pause } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface VoiceWaveformProps {
  isActive: boolean;
  mode: 'speaking' | 'listening' | 'idle';
  className?: string;
  height?: number;
  barCount?: number;
  color?: 'amber' | 'blue' | 'purple' | 'green';
}

interface MicPulseProps {
  isListening: boolean;
  onClick?: () => void;
  className?: string;
}

// ============================================================================
// Color Configuration
// ============================================================================

const COLORS = {
  amber: {
    primary: '#fbbf24',
    secondary: '#f59e0b',
    glow: 'rgba(251, 191, 36, 0.3)',
  },
  blue: {
    primary: '#3b82f6',
    secondary: '#2563eb',
    glow: 'rgba(59, 130, 246, 0.3)',
  },
  purple: {
    primary: '#a855f7',
    secondary: '#9333ea',
    glow: 'rgba(168, 85, 247, 0.3)',
  },
  green: {
    primary: '#22c55e',
    secondary: '#16a34a',
    glow: 'rgba(34, 197, 94, 0.3)',
  },
};

// ============================================================================
// Canvas Waveform Component
// ============================================================================

export const VoiceWaveform: React.FC<VoiceWaveformProps> = ({
  isActive,
  mode,
  className = '',
  height = 40,
  barCount = 24,
  color = 'amber',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [bars, setBars] = useState<number[]>(() => Array(barCount).fill(0.1));
  
  const colorConfig = COLORS[color];
  
  // Animate the waveform
  useEffect(() => {
    if (!isActive) {
      // Reset bars when inactive
      setBars(Array(barCount).fill(0.1));
      return;
    }
    
    let phase = 0;
    
    const animate = () => {
      phase += 0.1;
      
      const newBars = Array.from({ length: barCount }, (_, i) => {
        if (mode === 'speaking') {
          // Speaking pattern: flowing waves
          const wave1 = Math.sin(phase + i * 0.3) * 0.3;
          const wave2 = Math.sin(phase * 1.5 + i * 0.5) * 0.2;
          const base = 0.3 + Math.random() * 0.15;
          return Math.max(0.1, Math.min(1, base + wave1 + wave2));
        } else if (mode === 'listening') {
          // Listening pattern: reactive pulses
          const pulse = Math.sin(phase * 2 + i * 0.2) * 0.4;
          const noise = Math.random() * 0.3;
          return Math.max(0.1, Math.min(1, 0.2 + pulse + noise));
        }
        return 0.1;
      });
      
      setBars(newBars);
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, mode, barCount]);
  
  // Draw the waveform on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw bars
    const barWidth = (width / barCount) * 0.6;
    const barGap = (width / barCount) * 0.4;
    
    bars.forEach((value, i) => {
      const x = i * (barWidth + barGap) + barGap / 2;
      const barHeight = value * (height - 4);
      const y = (height - barHeight) / 2;
      
      // Create gradient
      const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
      gradient.addColorStop(0, colorConfig.primary);
      gradient.addColorStop(1, colorConfig.secondary);
      
      // Draw rounded bar
      ctx.fillStyle = gradient;
      ctx.beginPath();
      const radius = Math.min(barWidth / 2, 3);
      ctx.roundRect(x, y, barWidth, barHeight, radius);
      ctx.fill();
      
      // Add glow effect when active
      if (isActive && value > 0.5) {
        ctx.shadowColor = colorConfig.glow;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });
  }, [bars, height, barCount, colorConfig, isActive]);
  
  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full"
        style={{ height }}
      />
      
      {/* Mode indicator */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-1.5"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
          >
            {mode === 'speaking' ? (
              <Volume2 className={`w-4 h-4 text-${color}-400`} />
            ) : mode === 'listening' ? (
              <Mic className={`w-4 h-4 text-${color}-400`} />
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// Microphone Pulse Button
// ============================================================================

export const MicPulse: React.FC<MicPulseProps> = ({
  isListening,
  onClick,
  className = '',
}) => {
  return (
    <motion.button
      onClick={onClick}
      className={`relative p-3 rounded-full transition-colors ${
        isListening
          ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
          : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600/50 hover:text-white'
      } ${className}`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Pulse rings when listening */}
      <AnimatePresence>
        {isListening && (
          <>
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-red-400"
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-red-400"
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
            />
          </>
        )}
      </AnimatePresence>
      
      {/* Icon */}
      <motion.div
        animate={isListening ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 0.5, repeat: isListening ? Infinity : 0 }}
      >
        {isListening ? (
          <MicOff className="w-5 h-5" />
        ) : (
          <Mic className="w-5 h-5" />
        )}
      </motion.div>
    </motion.button>
  );
};

// ============================================================================
// Speaking Indicator (inline)
// ============================================================================

export const SpeakingIndicator: React.FC<{
  isActive: boolean;
  onStop?: () => void;
  className?: string;
}> = ({ isActive, onStop, className = '' }) => {
  if (!isActive) return null;
  
  return (
    <motion.div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/30 ${className}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      <Volume2 className="w-4 h-4 text-amber-400" />
      
      {/* Mini waveform bars */}
      <div className="flex items-center gap-0.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            className="w-0.5 bg-amber-400 rounded-full"
            animate={{
              height: [4, 12, 6, 14, 4],
            }}
            transition={{
              duration: 0.8,
              delay: i * 0.1,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
      
      <span className="text-xs text-amber-300 font-medium">Speaking</span>
      
      {onStop && (
        <button
          onClick={onStop}
          className="ml-1 p-0.5 rounded hover:bg-amber-500/30 transition-colors"
        >
          <Pause className="w-3 h-3 text-amber-400" />
        </button>
      )}
    </motion.div>
  );
};

// ============================================================================
// Listening Indicator (inline)
// ============================================================================

export const ListeningIndicator: React.FC<{
  isActive: boolean;
  transcript?: string;
  className?: string;
}> = ({ isActive, transcript, className = '' }) => {
  if (!isActive) return null;
  
  return (
    <motion.div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 border border-blue-500/30 ${className}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      <motion.div
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 0.8, repeat: Infinity }}
      >
        <Mic className="w-4 h-4 text-blue-400" />
      </motion.div>
      
      <span className="text-xs text-blue-300 font-medium">
        {transcript || 'Listening...'}
      </span>
      
      {/* Audio level dots */}
      <div className="flex items-center gap-0.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-blue-400"
            animate={{
              opacity: [0.3, 1, 0.3],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: 0.6,
              delay: i * 0.2,
              repeat: Infinity,
            }}
          />
        ))}
      </div>
    </motion.div>
  );
};

export default VoiceWaveform;

