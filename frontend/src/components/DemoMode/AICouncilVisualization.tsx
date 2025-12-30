/**
 * AI Council Visualization Component
 * 
 * Animated display showing the 7 AI models "thinking" during query processing.
 * Features staggered animations, consensus building visualization, and confidence meter.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Sparkles, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface ModelState {
  id: string;
  name: string;
  shortName: string;
  status: 'idle' | 'thinking' | 'success' | 'error';
  response?: string;
  color: string;
  icon: string;
}

interface AICouncilVisualizationProps {
  isActive: boolean;
  responses?: Array<{ model: string; response: string; success: boolean }>;
  consensusScore?: number;
  onComplete?: () => void;
  className?: string;
  compact?: boolean;
}

// ============================================================================
// Model Configuration
// ============================================================================

const COUNCIL_MODELS: ModelState[] = [
  { id: 'perplexity', name: 'Perplexity-Sonar', shortName: 'Perplexity', status: 'idle', color: 'from-teal-400 to-cyan-500', icon: '🔍' },
  { id: 'qwen', name: 'Qwen2.5-72B', shortName: 'Qwen', status: 'idle', color: 'from-blue-400 to-indigo-500', icon: '🧠' },
  { id: 'llama', name: 'Llama-3.3-70B', shortName: 'Llama', status: 'idle', color: 'from-purple-400 to-pink-500', icon: '🦙' },
  { id: 'deepseek', name: 'DeepSeek-V2.5', shortName: 'DeepSeek', status: 'idle', color: 'from-emerald-400 to-green-500', icon: '🌊' },
  { id: 'mixtral', name: 'Mixtral-8x22B', shortName: 'Mixtral', status: 'idle', color: 'from-orange-400 to-red-500', icon: '🔥' },
  { id: 'glm', name: 'GLM-4-9B', shortName: 'GLM', status: 'idle', color: 'from-yellow-400 to-amber-500', icon: '✨' },
  { id: 'gemma', name: 'Gemma-2-27B', shortName: 'Gemma', status: 'idle', color: 'from-rose-400 to-pink-500', icon: '💎' },
];

// ============================================================================
// Individual Model Node Component
// ============================================================================

const ModelNode: React.FC<{
  model: ModelState;
  index: number;
  isActive: boolean;
  compact: boolean;
}> = ({ model, index, isActive, compact }) => {
  const [currentStatus, setCurrentStatus] = useState<ModelState['status']>('idle');
  
  useEffect(() => {
    if (isActive && currentStatus === 'idle') {
      // Stagger the thinking animation
      const thinkingDelay = index * 200 + Math.random() * 300;
      const completeDelay = thinkingDelay + 1500 + Math.random() * 2000;
      
      const thinkingTimer = setTimeout(() => setCurrentStatus('thinking'), thinkingDelay);
      const completeTimer = setTimeout(() => {
        setCurrentStatus(Math.random() > 0.15 ? 'success' : 'error');
      }, completeDelay);
      
      return () => {
        clearTimeout(thinkingTimer);
        clearTimeout(completeTimer);
      };
    }
    
    if (!isActive) {
      setCurrentStatus('idle');
    }
  }, [isActive, index, currentStatus]);
  
  // Use actual response status if provided
  useEffect(() => {
    if (model.status !== 'idle') {
      setCurrentStatus(model.status);
    }
  }, [model.status]);
  
  const size = compact ? 40 : 56;
  
  return (
    <motion.div
      className="flex flex-col items-center gap-1"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
    >
      <motion.div
        className={`relative rounded-full bg-gradient-to-br ${model.color} flex items-center justify-center shadow-lg`}
        style={{ width: size, height: size }}
        animate={
          currentStatus === 'thinking'
            ? {
                scale: [1, 1.1, 1],
                boxShadow: [
                  '0 0 0 0 rgba(251, 191, 36, 0)',
                  '0 0 20px 5px rgba(251, 191, 36, 0.4)',
                  '0 0 0 0 rgba(251, 191, 36, 0)',
                ],
              }
            : currentStatus === 'success'
            ? { scale: [1, 1.15, 1] }
            : {}
        }
        transition={
          currentStatus === 'thinking'
            ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 0.3 }
        }
      >
        {/* Model icon/emoji */}
        <span className="text-lg">{model.icon}</span>
        
        {/* Status indicator overlay */}
        <AnimatePresence>
          {currentStatus === 'thinking' && (
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-white/30"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1.3, opacity: [0, 0.5, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
          {currentStatus === 'success' && (
            <motion.div
              className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center shadow-md"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            >
              <CheckCircle2 className="w-3 h-3 text-white" />
            </motion.div>
          )}
          {currentStatus === 'error' && (
            <motion.div
              className="absolute -bottom-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center shadow-md"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            >
              <XCircle className="w-3 h-3 text-white" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      
      {/* Model name */}
      {!compact && (
        <span className="text-xs text-gray-400 font-medium text-center leading-tight">
          {model.shortName}
        </span>
      )}
    </motion.div>
  );
};

// ============================================================================
// Consensus Meter Component
// ============================================================================

const ConsensusMeter: React.FC<{
  score: number;
  isActive: boolean;
}> = ({ score, isActive }) => {
  const [displayScore, setDisplayScore] = useState(0);
  
  useEffect(() => {
    if (isActive && score > 0) {
      // Animate the score
      const duration = 1500;
      const startTime = Date.now();
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = 1 - Math.pow(1 - progress, 3); // easeOutCubic
        setDisplayScore(score * easedProgress);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      requestAnimationFrame(animate);
    } else if (!isActive) {
      setDisplayScore(0);
    }
  }, [score, isActive]);
  
  const percentage = Math.round(displayScore * 100);
  
  // Color based on consensus level
  const getColor = () => {
    if (percentage >= 80) return 'from-green-400 to-emerald-500';
    if (percentage >= 60) return 'from-amber-400 to-yellow-500';
    return 'from-orange-400 to-red-500';
  };
  
  return (
    <motion.div
      className="flex flex-col items-center gap-2"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-amber-400" />
        <span className="text-sm font-medium text-gray-300">Consensus</span>
      </div>
      
      {/* Meter bar */}
      <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className={`h-full bg-gradient-to-r ${getColor()} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />
      </div>
      
      {/* Percentage */}
      <motion.span
        className="text-2xl font-bold text-white"
        key={percentage}
      >
        {percentage}%
      </motion.span>
    </motion.div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const AICouncilVisualization: React.FC<AICouncilVisualizationProps> = ({
  isActive,
  responses,
  consensusScore = 0.85,
  onComplete,
  className = '',
  compact = false,
}) => {
  const [showConsensus, setShowConsensus] = useState(false);
  
  // Update model states based on actual responses
  const models = useMemo(() => {
    if (!responses) return COUNCIL_MODELS;
    
    return COUNCIL_MODELS.map(model => {
      const response = responses.find(r => 
        r.model.toLowerCase().includes(model.id) ||
        model.name.toLowerCase().includes(r.model.toLowerCase())
      );
      
      if (response) {
        return {
          ...model,
          status: response.success ? 'success' as const : 'error' as const,
          response: response.response,
        };
      }
      
      return model;
    });
  }, [responses]);
  
  // Show consensus after models finish
  useEffect(() => {
    if (isActive) {
      const timer = setTimeout(() => {
        setShowConsensus(true);
        onComplete?.();
      }, 3500);
      
      return () => clearTimeout(timer);
    } else {
      setShowConsensus(false);
    }
  }, [isActive, onComplete]);
  
  if (!isActive && !showConsensus) return null;
  
  return (
    <motion.div
      className={`${className}`}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className={`bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 ${compact ? 'p-3' : 'p-4'}`}>
        {/* Header */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <Brain className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-medium text-gray-300">AI Council Deliberating</span>
          {isActive && !showConsensus && (
            <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
          )}
        </div>
        
        {/* Model nodes */}
        <div className={`flex flex-wrap justify-center ${compact ? 'gap-2' : 'gap-4'} mb-4`}>
          {models.map((model, index) => (
            <ModelNode
              key={model.id}
              model={model}
              index={index}
              isActive={isActive}
              compact={compact}
            />
          ))}
        </div>
        
        {/* Consensus meter */}
        <AnimatePresence>
          {showConsensus && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <ConsensusMeter score={consensusScore} isActive={showConsensus} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// ============================================================================
// Compact Inline Version
// ============================================================================

export const CouncilThinkingIndicator: React.FC<{
  isActive: boolean;
  className?: string;
}> = ({ isActive, className = '' }) => {
  if (!isActive) return null;
  
  return (
    <motion.div
      className={`flex items-center gap-2 ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="flex -space-x-2">
        {COUNCIL_MODELS.slice(0, 5).map((model, index) => (
          <motion.div
            key={model.id}
            className={`w-6 h-6 rounded-full bg-gradient-to-br ${model.color} border-2 border-gray-800 flex items-center justify-center text-xs`}
            animate={{
              y: [0, -4, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 0.8,
              delay: index * 0.15,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            {model.icon}
          </motion.div>
        ))}
      </div>
      <span className="text-xs text-gray-400">7 models thinking...</span>
    </motion.div>
  );
};

export default AICouncilVisualization;

