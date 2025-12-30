/**
 * Ecosystem Showcase Component
 * 
 * Animated carousel showcasing all features of the Raven Ecosystem.
 * Shows previews of Raven News, HALO, IC SPICY, Sk8 Punks, etc.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Newspaper,
  Shield,
  Flame,
  Gamepad2,
  Puzzle,
  Bot,
  Truck,
  Coins,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface EcosystemApp {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  gradient: string;
  route: string;
  features: string[];
  preview?: string;
}

interface EcosystemShowcaseProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (route: string) => void;
}

// ============================================================================
// Ecosystem Apps Data
// ============================================================================

const ECOSYSTEM_APPS: EcosystemApp[] = [
  {
    id: 'raven-news',
    name: 'Raven News',
    tagline: 'AI-Powered Blockchain News',
    description: 'Get the latest crypto and blockchain news curated by our AI council. Read, react, and earn HARLEE tokens for engagement.',
    icon: <Newspaper className="w-8 h-8" />,
    color: 'text-rose-400',
    gradient: 'from-rose-500/20 to-pink-500/20',
    route: '/news',
    features: ['AI-generated articles', 'Daily digest', 'Comment & earn', 'Meme section'],
  },
  {
    id: 'halo',
    name: 'HALO',
    tagline: 'Academic Integrity Assistant',
    description: 'Ensure your documents maintain academic integrity with AI-powered plagiarism detection and citation formatting.',
    icon: <Shield className="w-8 h-8" />,
    color: 'text-blue-400',
    gradient: 'from-blue-500/20 to-cyan-500/20',
    route: '/halo',
    features: ['Plagiarism check', 'Citation format', 'Grammar analysis', 'Document scoring'],
  },
  {
    id: 'ic-spicy',
    name: 'IC SPICY',
    tagline: 'Real World Asset Co-op',
    description: 'Invest in real pepper farming operations in Texas. Track your farm stats, harvest yields, and CO2 offset.',
    icon: <Flame className="w-8 h-8" />,
    color: 'text-orange-400',
    gradient: 'from-orange-500/20 to-red-500/20',
    route: '/icspicy',
    features: ['RWA farming', 'Live farm stats', 'CO2 tracking', 'NFT membership'],
  },
  {
    id: 'axiom',
    name: 'AXIOM Genesis',
    tagline: 'AI Agent NFTs',
    description: 'Own unique AI agents with persistent memory. Only 300 will ever exist. Each has its own personality and learns from conversations.',
    icon: <Bot className="w-8 h-8" />,
    color: 'text-purple-400',
    gradient: 'from-purple-500/20 to-violet-500/20',
    route: '/axiom-collection',
    features: ['Persistent memory', 'Voice chat', 'Custom personality', 'Genesis rarity'],
  },
  {
    id: 'sk8-punks',
    name: 'Sk8 Punks',
    tagline: 'Staking & Gaming',
    description: 'Stake Sk8 Punks NFTs to earn 100 $HARLEE/week (with rarity multipliers up to 3x). Play the skateboarding game to compete on the leaderboard.',
    icon: <Gamepad2 className="w-8 h-8" />,
    color: 'text-green-400',
    gradient: 'from-green-500/20 to-emerald-500/20',
    route: '/sk8punks',
    features: ['100 $HARLEE/week', 'Rarity multipliers', 'Leaderboards', 'Trick combos'],
  },
  {
    id: 'crossword',
    name: 'Crossword Quest',
    tagline: 'Daily Puzzles',
    description: 'Challenge yourself with daily blockchain-themed crossword puzzles. Earn 1 $HARLEE per puzzle completed and climb the rankings.',
    icon: <Puzzle className="w-8 h-8" />,
    color: 'text-yellow-400',
    gradient: 'from-yellow-500/20 to-amber-500/20',
    route: '/crossword',
    features: ['Daily puzzles', '1 $HARLEE/puzzle', 'Streak bonuses', 'Global rankings'],
  },
  {
    id: 'expresso',
    name: 'eXpresso Logistics',
    tagline: 'On-Chain Shipping',
    description: 'Decentralized logistics platform connecting shippers with carriers. Track shipments on-chain with full transparency.',
    icon: <Truck className="w-8 h-8" />,
    color: 'text-cyan-400',
    gradient: 'from-cyan-500/20 to-teal-500/20',
    route: '/logistics',
    features: ['Load board', 'Real-time tracking', 'Smart contracts', 'Carrier matching'],
  },
  {
    id: 'forge',
    name: 'The Forge',
    tagline: 'NFT Minting Studio',
    description: 'Create and mint your own NFT collections on the Internet Computer. Layer-based generation with royalty support.',
    icon: <Coins className="w-8 h-8" />,
    color: 'text-amber-400',
    gradient: 'from-amber-500/20 to-orange-500/20',
    route: '/forge',
    features: ['Layer generator', 'Bulk minting', 'Royalties', 'Multi-chain'],
  },
];

// ============================================================================
// App Card Component
// ============================================================================

const AppCard: React.FC<{
  app: EcosystemApp;
  isActive: boolean;
  onNavigate: (route: string) => void;
}> = ({ app, isActive, onNavigate }) => {
  return (
    <motion.div
      className={`relative rounded-2xl bg-gradient-to-br ${app.gradient} border border-white/10 overflow-hidden`}
      animate={{
        scale: isActive ? 1 : 0.9,
        opacity: isActive ? 1 : 0.5,
      }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="p-6 pb-4">
        <div className={`inline-flex p-3 rounded-xl bg-gray-800/50 ${app.color} mb-4`}>
          {app.icon}
        </div>
        
        <h3 className="text-xl font-bold text-white mb-1">{app.name}</h3>
        <p className={`text-sm font-medium ${app.color}`}>{app.tagline}</p>
      </div>
      
      {/* Description */}
      <div className="px-6 pb-4">
        <p className="text-sm text-gray-400 leading-relaxed">
          {app.description}
        </p>
      </div>
      
      {/* Features */}
      <div className="px-6 pb-4">
        <div className="flex flex-wrap gap-2">
          {app.features.map((feature) => (
            <span
              key={feature}
              className="px-2 py-1 text-xs font-medium text-gray-300 bg-gray-800/50 rounded-md"
            >
              {feature}
            </span>
          ))}
        </div>
      </div>
      
      {/* CTA */}
      <div className="p-6 pt-2">
        <motion.button
          className={`w-full py-3 px-4 rounded-xl bg-gradient-to-r ${app.gradient.replace('/20', '/40')} border border-white/20 text-white font-medium flex items-center justify-center gap-2 hover:border-white/40 transition-colors`}
          onClick={() => onNavigate(app.route)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <span>Explore {app.name}</span>
          <ExternalLink className="w-4 h-4" />
        </motion.button>
      </div>
    </motion.div>
  );
};

// ============================================================================
// Carousel Navigation Dots
// ============================================================================

const CarouselDots: React.FC<{
  total: number;
  current: number;
  onChange: (index: number) => void;
}> = ({ total, current, onChange }) => {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }).map((_, index) => (
        <button
          key={index}
          onClick={() => onChange(index)}
          className={`w-2 h-2 rounded-full transition-all ${
            index === current
              ? 'w-6 bg-amber-400'
              : 'bg-gray-600 hover:bg-gray-500'
          }`}
        />
      ))}
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const EcosystemShowcase: React.FC<EcosystemShowcaseProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  
  const currentApp = ECOSYSTEM_APPS[currentIndex];
  
  // Auto-advance carousel
  useEffect(() => {
    if (!isOpen || !isAutoPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % ECOSYSTEM_APPS.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [isOpen, isAutoPlaying]);
  
  // Navigation handlers
  const goNext = useCallback(() => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev + 1) % ECOSYSTEM_APPS.length);
  }, []);
  
  const goPrev = useCallback(() => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev - 1 + ECOSYSTEM_APPS.length) % ECOSYSTEM_APPS.length);
  }, []);
  
  const goToIndex = useCallback((index: number) => {
    setIsAutoPlaying(false);
    setCurrentIndex(index);
  }, []);
  
  const handleNavigate = useCallback((route: string) => {
    onClose();
    onNavigate?.(route);
  }, [onClose, onNavigate]);
  
  if (!isOpen) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[90] flex items-end justify-center p-4 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Showcase panel */}
        <motion.div
          className="relative w-full max-w-md bg-gray-900/95 backdrop-blur-lg rounded-t-2xl border border-gray-700/50 shadow-2xl pointer-events-auto"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span className="font-semibold text-white">Explore the Ecosystem</span>
            </div>
            
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Carousel */}
          <div className="relative overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
              >
                <AppCard
                  app={currentApp}
                  isActive={true}
                  onNavigate={handleNavigate}
                />
              </motion.div>
            </AnimatePresence>
            
            {/* Navigation arrows */}
            <button
              onClick={goPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-gray-800/80 text-white hover:bg-gray-700/80 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <button
              onClick={goNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-gray-800/80 text-white hover:bg-gray-700/80 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          
          {/* Dots */}
          <div className="p-4">
            <CarouselDots
              total={ECOSYSTEM_APPS.length}
              current={currentIndex}
              onChange={goToIndex}
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ============================================================================
// Compact Showcase (inline pills)
// ============================================================================

export const EcosystemPills: React.FC<{
  onSelect?: (app: EcosystemApp) => void;
  className?: string;
}> = ({ onSelect, className = '' }) => {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {ECOSYSTEM_APPS.slice(0, 4).map((app) => (
        <motion.button
          key={app.id}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r ${app.gradient} border border-white/10 text-sm font-medium text-white hover:border-white/30 transition-colors`}
          onClick={() => onSelect?.(app)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <span className={`w-4 h-4 ${app.color}`}>{app.icon}</span>
          <span>{app.name}</span>
        </motion.button>
      ))}
    </div>
  );
};

export default EcosystemShowcase;

