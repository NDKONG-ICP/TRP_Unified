/**
 * Demo Mode Provider
 * 
 * Context provider for managing demo mode state across the application.
 * Handles demo session creation, rate limiting, and UI state coordination.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import {
  createDemoSession,
  getDemoStatus,
  incrementDemoCount,
  isDemoLimitReached,
  DEMO_CONSTANTS,
  DemoSession,
} from '../../services/demoAuthService';
import { useAuthStore } from '../../stores/authStore';

// ============================================================================
// Types
// ============================================================================

interface DemoModeContextValue {
  // Demo state
  isDemoMode: boolean;
  isInitialized: boolean;
  demoSession: DemoSession | null;
  
  // Usage tracking
  messagesUsed: number;
  messagesRemaining: number;
  isLimitReached: boolean;
  resetTime: number | null;
  formattedResetTime: string | null;
  
  // Actions
  initDemoSession: () => Promise<void>;
  recordDemoMessage: () => void;
  showRateLimitModal: () => void;
  hideRateLimitModal: () => void;
  showEcosystemShowcase: () => void;
  hideEcosystemShowcase: () => void;
  
  // UI state
  isRateLimitModalOpen: boolean;
  isEcosystemShowcaseOpen: boolean;
  showWalletPrompt: boolean;
  
  // Constants
  messageLimit: number;
  resetHours: number;
}

interface DemoModeProviderProps {
  children: ReactNode;
}

// ============================================================================
// Context
// ============================================================================

const DemoModeContext = createContext<DemoModeContextValue | null>(null);

// ============================================================================
// Provider Component
// ============================================================================

export const DemoModeProvider: React.FC<DemoModeProviderProps> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  
  // Demo session state
  const [demoSession, setDemoSession] = useState<DemoSession | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Usage tracking state
  const [messagesUsed, setMessagesUsed] = useState(0);
  const [messagesRemaining, setMessagesRemaining] = useState(DEMO_CONSTANTS.MESSAGE_LIMIT);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [resetTime, setResetTime] = useState<number | null>(null);
  const [formattedResetTime, setFormattedResetTime] = useState<string | null>(null);
  
  // UI state
  const [isRateLimitModalOpen, setIsRateLimitModalOpen] = useState(false);
  const [isEcosystemShowcaseOpen, setIsEcosystemShowcaseOpen] = useState(false);
  const [showWalletPrompt, setShowWalletPrompt] = useState(false);
  
  // Compute if we're in demo mode (not authenticated)
  const isDemoMode = !isAuthenticated;
  
  // Refresh demo status from localStorage
  const refreshDemoStatus = useCallback(() => {
    const status = getDemoStatus();
    setMessagesUsed(status.messagesUsed);
    setMessagesRemaining(status.messagesRemaining);
    setIsLimitReached(status.isLimitReached);
    setResetTime(status.resetTime);
    setFormattedResetTime(status.formattedResetTime);
  }, []);
  
  // Initialize demo session
  const initDemoSession = useCallback(async () => {
    if (isAuthenticated) {
      // Clear demo session when authenticated
      setDemoSession(null);
      setIsInitialized(true);
      return;
    }
    
    try {
      const session = await createDemoSession();
      setDemoSession(session);
      setMessagesUsed(session.messagesUsed);
      setMessagesRemaining(session.messagesRemaining);
      setIsLimitReached(session.isLimitReached);
      setResetTime(session.resetTime);
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize demo session:', error);
      setIsInitialized(true);
    }
  }, [isAuthenticated]);
  
  // Record a demo message and update state
  const recordDemoMessage = useCallback(() => {
    if (isAuthenticated) return;
    
    const newCount = incrementDemoCount();
    const remaining = Math.max(0, DEMO_CONSTANTS.MESSAGE_LIMIT - newCount);
    
    setMessagesUsed(newCount);
    setMessagesRemaining(remaining);
    
    // Check if limit is now reached
    if (newCount >= DEMO_CONSTANTS.MESSAGE_LIMIT) {
      setIsLimitReached(true);
      setIsRateLimitModalOpen(true);
    }
    
    // Show wallet prompt after 3 messages
    if (newCount >= 3 && !showWalletPrompt) {
      setShowWalletPrompt(true);
    }
    
    // Show ecosystem showcase after 3 messages
    if (newCount === 3) {
      setIsEcosystemShowcaseOpen(true);
    }
    
    // Refresh reset time
    refreshDemoStatus();
  }, [isAuthenticated, showWalletPrompt, refreshDemoStatus]);
  
  // Modal controls
  const showRateLimitModal = useCallback(() => setIsRateLimitModalOpen(true), []);
  const hideRateLimitModal = useCallback(() => setIsRateLimitModalOpen(false), []);
  const showEcosystemShowcase = useCallback(() => setIsEcosystemShowcaseOpen(true), []);
  const hideEcosystemShowcase = useCallback(() => setIsEcosystemShowcaseOpen(false), []);
  
  // Initialize on mount
  useEffect(() => {
    initDemoSession();
  }, [initDemoSession]);
  
  // Refresh status periodically (for reset time countdown)
  useEffect(() => {
    if (!isDemoMode) return;
    
    const interval = setInterval(refreshDemoStatus, 60000); // Every minute
    return () => clearInterval(interval);
  }, [isDemoMode, refreshDemoStatus]);
  
  // Clear demo state when user authenticates
  useEffect(() => {
    if (isAuthenticated) {
      setDemoSession(null);
      setIsRateLimitModalOpen(false);
      setShowWalletPrompt(false);
    }
  }, [isAuthenticated]);
  
  const value: DemoModeContextValue = {
    isDemoMode,
    isInitialized,
    demoSession,
    messagesUsed,
    messagesRemaining,
    isLimitReached,
    resetTime,
    formattedResetTime,
    initDemoSession,
    recordDemoMessage,
    showRateLimitModal,
    hideRateLimitModal,
    showEcosystemShowcase,
    hideEcosystemShowcase,
    isRateLimitModalOpen,
    isEcosystemShowcaseOpen,
    showWalletPrompt,
    messageLimit: DEMO_CONSTANTS.MESSAGE_LIMIT,
    resetHours: DEMO_CONSTANTS.RESET_HOURS,
  };
  
  return (
    <DemoModeContext.Provider value={value}>
      {children}
    </DemoModeContext.Provider>
  );
};

// ============================================================================
// Hook
// ============================================================================

export function useDemoMode(): DemoModeContextValue {
  const context = useContext(DemoModeContext);
  if (!context) {
    throw new Error('useDemoMode must be used within a DemoModeProvider');
  }
  return context;
}

// ============================================================================
// Demo Badge Component (for showing remaining messages)
// ============================================================================

export const DemoBadge: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isDemoMode, messagesRemaining, messageLimit } = useDemoMode();
  
  if (!isDemoMode) return null;
  
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 ${className}`}>
      <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
      <span className="text-xs font-medium text-amber-300">
        Demo: {messagesRemaining} of {messageLimit} messages
      </span>
    </div>
  );
};

export default DemoModeProvider;

