/**
 * Particle Background Component
 * 
 * Beautiful floating particle effects using Framer Motion.
 * Creates an ambient, ethereal atmosphere for the RavenAI chatbot.
 */

import React, { useMemo, useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================================
// Types
// ============================================================================

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
  opacity: number;
}

interface ParticleBackgroundProps {
  className?: string;
  particleCount?: number;
  colors?: string[];
  intensity?: 'subtle' | 'normal' | 'intense';
  pulse?: boolean;
  interactionPoint?: { x: number; y: number } | null;
}

// ============================================================================
// Color Palettes
// ============================================================================

const RAVEN_COLORS = [
  'rgba(251, 191, 36, 0.6)',   // Amber/Gold
  'rgba(245, 158, 11, 0.5)',   // Orange
  'rgba(139, 92, 246, 0.5)',   // Purple
  'rgba(59, 130, 246, 0.4)',   // Blue
  'rgba(236, 72, 153, 0.4)',   // Pink
  'rgba(34, 197, 94, 0.4)',    // Green
];

const INTENSITY_CONFIG = {
  subtle: { count: 15, opacity: 0.3, blur: 2 },
  normal: { count: 25, opacity: 0.5, blur: 3 },
  intense: { count: 40, opacity: 0.7, blur: 4 },
};

// ============================================================================
// Particle Generator
// ============================================================================

function generateParticles(
  count: number,
  colors: string[],
  baseOpacity: number
): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 40 + 10,
    color: colors[Math.floor(Math.random() * colors.length)],
    delay: Math.random() * 5,
    duration: Math.random() * 10 + 15,
    opacity: (Math.random() * 0.5 + 0.5) * baseOpacity,
  }));
}

// ============================================================================
// Individual Particle Component
// ============================================================================

const FloatingParticle: React.FC<{
  particle: Particle;
  pulse: boolean;
  blur: number;
}> = ({ particle, pulse, blur }) => {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: `${particle.x}%`,
        top: `${particle.y}%`,
        width: particle.size,
        height: particle.size,
        background: `radial-gradient(circle at 30% 30%, ${particle.color}, transparent 70%)`,
        filter: `blur(${blur}px)`,
      }}
      initial={{
        opacity: 0,
        scale: 0.5,
        x: 0,
        y: 0,
      }}
      animate={{
        opacity: [0, particle.opacity, particle.opacity * 0.7, particle.opacity, 0],
        scale: pulse ? [0.8, 1.2, 0.9, 1.1, 0.8] : [0.8, 1, 0.9, 1, 0.8],
        x: [0, Math.random() * 50 - 25, Math.random() * 30 - 15, 0],
        y: [0, Math.random() * -80, Math.random() * -40, Math.random() * 40],
      }}
      transition={{
        duration: particle.duration,
        delay: particle.delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
};

// ============================================================================
// Pulse Effect Component (triggered on interaction)
// ============================================================================

const PulseEffect: React.FC<{
  point: { x: number; y: number };
  onComplete: () => void;
}> = ({ point, onComplete }) => {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: point.x,
        top: point.y,
        width: 10,
        height: 10,
        background: 'radial-gradient(circle, rgba(251, 191, 36, 0.8), transparent 70%)',
        transform: 'translate(-50%, -50%)',
      }}
      initial={{ scale: 0, opacity: 1 }}
      animate={{ scale: 15, opacity: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      onAnimationComplete={onComplete}
    />
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const ParticleBackground: React.FC<ParticleBackgroundProps> = ({
  className = '',
  particleCount,
  colors = RAVEN_COLORS,
  intensity = 'normal',
  pulse = false,
  interactionPoint = null,
}) => {
  const config = INTENSITY_CONFIG[intensity];
  const count = particleCount ?? config.count;
  
  const particles = useMemo(
    () => generateParticles(count, colors, config.opacity),
    [count, colors, config.opacity]
  );
  
  const [pulseEffects, setPulseEffects] = useState<Array<{ id: number; point: { x: number; y: number } }>>([]);
  
  // Add pulse effect when interaction point changes
  useEffect(() => {
    if (interactionPoint) {
      const id = Date.now();
      setPulseEffects(prev => [...prev, { id, point: interactionPoint }]);
    }
  }, [interactionPoint]);
  
  const removePulseEffect = useCallback((id: number) => {
    setPulseEffects(prev => prev.filter(p => p.id !== id));
  }, []);
  
  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      aria-hidden="true"
    >
      {/* Gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/40" />
      
      {/* Floating particles */}
      {particles.map(particle => (
        <FloatingParticle
          key={particle.id}
          particle={particle}
          pulse={pulse}
          blur={config.blur}
        />
      ))}
      
      {/* Interaction pulse effects */}
      <AnimatePresence>
        {pulseEffects.map(effect => (
          <PulseEffect
            key={effect.id}
            point={effect.point}
            onComplete={() => removePulseEffect(effect.id)}
          />
        ))}
      </AnimatePresence>
      
      {/* Ambient glow spots */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-amber-500/10 blur-3xl animate-pulse" />
      <div className="absolute bottom-1/3 right-1/4 w-48 h-48 rounded-full bg-purple-500/10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 right-1/3 w-32 h-32 rounded-full bg-blue-500/10 blur-2xl animate-pulse" style={{ animationDelay: '2s' }} />
    </div>
  );
};

// ============================================================================
// Compact Version for Chatbot Header
// ============================================================================

export const ParticleHeader: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`relative h-16 overflow-hidden ${className}`}>
      <ParticleBackground intensity="subtle" particleCount={8} />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-900" />
    </div>
  );
};

// ============================================================================
// Animated Orb (Single decorative element)
// ============================================================================

export const AnimatedOrb: React.FC<{
  size?: number;
  color?: string;
  className?: string;
}> = ({ size = 60, color = 'amber', className = '' }) => {
  const colorClasses: Record<string, string> = {
    amber: 'from-amber-400/60 to-orange-500/40',
    purple: 'from-purple-400/60 to-pink-500/40',
    blue: 'from-blue-400/60 to-cyan-500/40',
    green: 'from-green-400/60 to-emerald-500/40',
  };
  
  return (
    <motion.div
      className={`rounded-full bg-gradient-to-br ${colorClasses[color] || colorClasses.amber} blur-xl ${className}`}
      style={{ width: size, height: size }}
      animate={{
        scale: [1, 1.2, 1],
        opacity: [0.5, 0.8, 0.5],
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
};

export default ParticleBackground;

