/**
 * Demo Rate Limit Modal
 * 
 * Beautiful modal that appears when demo message limit is reached.
 * Encourages users to connect their wallet with animated feature previews.
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Sparkles,
  Brain,
  Volume2,
  Bot,
  Newspaper,
  Shield,
  Coins,
  Gamepad2,
  Clock,
  Wallet,
  Zap,
  Infinity,
  Gift,
} from 'lucide-react';
import { useDemoMode } from './DemoModeProvider';
import { ParticleBackground, AnimatedOrb } from './ParticleBackground';

// ============================================================================
// Types
// ============================================================================

interface DemoRateLimitModalProps {
  onClose: () => void;
  onConnectWallet: () => void;
}

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

// ============================================================================
// Features Data
// ============================================================================

const FEATURES: Feature[] = [
  {
    icon: <Infinity className="w-5 h-5" />,
    title: 'Unlimited AI Chat',
    description: 'No message limits with 7 LLM models',
    color: 'text-amber-400',
  },
  {
    icon: <Volume2 className="w-5 h-5" />,
    title: 'Voice Synthesis',
    description: 'Premium Eleven Labs AI voice',
    color: 'text-blue-400',
  },
  {
    icon: <Bot className="w-5 h-5" />,
    title: 'AXIOM NFT Agents',
    description: 'Own AI agents with persistent memory',
    color: 'text-purple-400',
  },
  {
    icon: <Brain className="w-5 h-5" />,
    title: 'AI Council Access',
    description: 'Multi-model consensus responses',
    color: 'text-green-400',
  },
  {
    icon: <Newspaper className="w-5 h-5" />,
    title: 'Raven News',
    description: 'AI-curated blockchain news',
    color: 'text-rose-400',
  },
  {
    icon: <Coins className="w-5 h-5" />,
    title: '$HARLEE Rewards',
    description: 'Earn 100/week staking, 1/puzzle',
    color: 'text-yellow-400',
  },
];

// ============================================================================
// Feature Card Component
// ============================================================================

const FeatureCard: React.FC<{ feature: Feature; index: number }> = ({ feature, index }) => {
  return (
    <motion.div
      className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 + index * 0.1, duration: 0.4 }}
    >
      <div className={`p-2 rounded-lg bg-gray-800/50 ${feature.color}`}>
        {feature.icon}
      </div>
      <div>
        <h4 className="text-sm font-semibold text-white">{feature.title}</h4>
        <p className="text-xs text-gray-400">{feature.description}</p>
      </div>
    </motion.div>
  );
};

// ============================================================================
// Wallet Options
// ============================================================================

const WalletOption: React.FC<{
  name: string;
  icon: string;
  onClick: () => void;
  delay: number;
}> = ({ name, icon, onClick, delay }) => {
  return (
    <motion.button
      className="flex items-center gap-3 w-full p-3 rounded-xl bg-gradient-to-r from-gray-800/50 to-gray-700/50 border border-gray-600/50 hover:border-amber-500/50 hover:from-gray-700/50 hover:to-gray-600/50 transition-all group"
      onClick={onClick}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 + delay * 0.1 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-sm font-medium text-white group-hover:text-amber-300 transition-colors">
        {name}
      </span>
      <Zap className="w-4 h-4 ml-auto text-gray-500 group-hover:text-amber-400 transition-colors" />
    </motion.button>
  );
};

// ============================================================================
// Main Modal Component
// ============================================================================

export const DemoRateLimitModal: React.FC<DemoRateLimitModalProps> = ({
  onClose,
  onConnectWallet,
}) => {
  const { formattedResetTime, resetHours } = useDemoMode();
  const [showWalletOptions, setShowWalletOptions] = useState(false);
  
  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);
  
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />
        
        {/* Modal */}
        <motion.div
          className="relative w-full max-w-lg max-h-[90vh] overflow-hidden rounded-2xl bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 border border-gray-700/50 shadow-2xl"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          {/* Particle background */}
          <div className="absolute inset-0 overflow-hidden rounded-2xl">
            <ParticleBackground intensity="subtle" particleCount={12} />
          </div>
          
          {/* Decorative orbs */}
          <div className="absolute top-10 right-10 opacity-30">
            <AnimatedOrb size={80} color="amber" />
          </div>
          <div className="absolute bottom-20 left-10 opacity-20">
            <AnimatedOrb size={60} color="purple" />
          </div>
          
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          {/* Content */}
          <div className="relative z-10 p-6 overflow-y-auto max-h-[90vh]">
            {/* Header */}
            <motion.div
              className="text-center mb-6"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <motion.div
                className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-500/30 to-orange-500/30 mb-4"
                animate={{
                  boxShadow: [
                    '0 0 20px rgba(251, 191, 36, 0.3)',
                    '0 0 40px rgba(251, 191, 36, 0.5)',
                    '0 0 20px rgba(251, 191, 36, 0.3)',
                  ],
                }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
              >
                <Sparkles className="w-8 h-8 text-amber-400" />
              </motion.div>
              
              <h2 className="text-2xl font-bold text-white mb-2">
                You&apos;ve Experienced RavenAI!
              </h2>
              <p className="text-gray-400">
                Connect your wallet to unlock the full power of our AI ecosystem
              </p>
            </motion.div>
            
            {/* Reset timer */}
            {formattedResetTime && (
              <motion.div
                className="flex items-center justify-center gap-2 mb-6 py-2 px-4 rounded-full bg-gray-800/50 border border-gray-700/50 mx-auto w-fit"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-400">
                  Demo resets in <span className="text-amber-400 font-medium">{formattedResetTime}</span>
                </span>
              </motion.div>
            )}
            
            {/* Features grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {FEATURES.map((feature, index) => (
                <FeatureCard key={feature.title} feature={feature} index={index} />
              ))}
            </div>
            
            {/* CTA Section */}
            {!showWalletOptions ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <motion.button
                  className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold text-lg shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow"
                  onClick={() => setShowWalletOptions(true)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="flex items-center justify-center gap-2">
                    <Wallet className="w-5 h-5" />
                    Connect Wallet to Continue
                  </span>
                </motion.button>
                
                <p className="text-center text-xs text-gray-500 mt-3">
                  No credit card required. Free to start!
                </p>
              </motion.div>
            ) : (
              <motion.div
                className="space-y-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h3 className="text-sm font-medium text-gray-400 mb-3">Choose your wallet:</h3>
                
                <WalletOption
                  name="Internet Identity"
                  icon="🔐"
                  onClick={onConnectWallet}
                  delay={0}
                />
                <WalletOption
                  name="NFID"
                  icon="🆔"
                  onClick={onConnectWallet}
                  delay={1}
                />
                <WalletOption
                  name="Plug Wallet"
                  icon="🔌"
                  onClick={onConnectWallet}
                  delay={2}
                />
                <WalletOption
                  name="OISY Wallet"
                  icon="🌊"
                  onClick={onConnectWallet}
                  delay={3}
                />
                
                <motion.button
                  className="w-full py-2 text-sm text-gray-500 hover:text-gray-300 transition-colors"
                  onClick={() => setShowWalletOptions(false)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  Back
                </motion.button>
              </motion.div>
            )}
            
            {/* Bonus teaser */}
            <motion.div
              className="mt-6 p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <Gift className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Start Earning $HARLEE</h4>
                  <p className="text-xs text-gray-400">
                    Stake NFTs for 100/week, complete puzzles for 1/puzzle!
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ============================================================================
// Soft Prompt Component (shown after 3 messages)
// ============================================================================

export const DemoSoftPrompt: React.FC<{
  onConnect: () => void;
  onDismiss: () => void;
  messagesRemaining: number;
}> = ({ onConnect, onDismiss, messagesRemaining }) => {
  return (
    <motion.div
      className="flex items-center justify-between gap-3 p-3 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20"
      initial={{ opacity: 0, y: 10, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, y: -10, height: 0 }}
    >
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-amber-400" />
        <span className="text-sm text-gray-300">
          <span className="text-amber-400 font-medium">{messagesRemaining}</span> demo messages left
        </span>
      </div>
      
      <div className="flex items-center gap-2">
        <button
          onClick={onConnect}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-500 text-black hover:bg-amber-400 transition-colors"
        >
          Connect
        </button>
        <button
          onClick={onDismiss}
          className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};

export default DemoRateLimitModal;

