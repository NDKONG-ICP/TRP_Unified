/**
 * React Hook for RavenAI Companion
 * 
 * Provides easy integration of RavenAI Companion in React components
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  RavenAICompanion, 
  CompanionMessage, 
  CompanionConfig 
} from '../services/ravenAICompanion';

export interface UseCompanionReturn {
  messages: CompanionMessage[];
  isLoading: boolean;
  isPlaying: boolean;
  error: string | null;
  sendMessage: (message: string) => Promise<void>;
  playMessage: (message: CompanionMessage) => Promise<void>;
  stopPlayback: () => void;
  clearHistory: () => void;
  voiceEnabled: boolean;
  setVoiceEnabled: (enabled: boolean) => void;
}

export function useRavenAICompanion(config?: Partial<CompanionConfig>): UseCompanionReturn {
  const companionRef = useRef<RavenAICompanion | null>(null);
  const [messages, setMessages] = useState<CompanionMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceEnabled, setVoiceEnabledState] = useState(config?.voiceEnabled ?? true);

  // Initialize companion
  useEffect(() => {
    companionRef.current = new RavenAICompanion(config);
    return () => {
      companionRef.current?.stopAudio();
    };
  }, []);

  const sendMessage = useCallback(async (message: string) => {
    if (!companionRef.current || isLoading) return;
    
    setIsLoading(true);
    setError(null);
    
    // Add user message immediately
    const userMsg: CompanionMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);
    
    try {
      const response = await companionRef.current.chat(message);
      setMessages(prev => [...prev.slice(0, -1), userMsg, response]);
      
      // Auto-play voice if enabled
      if (voiceEnabled && response.audioUrl) {
        setIsPlaying(true);
        try {
          await companionRef.current.playAudio(response.audioUrl);
        } catch (e) {
          console.warn('Auto-play failed:', e);
        } finally {
          setIsPlaying(false);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to get response');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, voiceEnabled]);

  const playMessage = useCallback(async (message: CompanionMessage) => {
    if (!companionRef.current || !message.audioUrl) return;
    
    setIsPlaying(true);
    try {
      await companionRef.current.playAudio(message.audioUrl);
    } catch (err: any) {
      console.error('Playback error:', err);
    } finally {
      setIsPlaying(false);
    }
  }, []);

  const stopPlayback = useCallback(() => {
    companionRef.current?.stopAudio();
    setIsPlaying(false);
  }, []);

  const clearHistory = useCallback(() => {
    companionRef.current?.clearHistory();
    setMessages([]);
  }, []);

  const setVoiceEnabled = useCallback((enabled: boolean) => {
    setVoiceEnabledState(enabled);
    companionRef.current?.setVoiceEnabled(enabled);
  }, []);

  return {
    messages,
    isLoading,
    isPlaying,
    error,
    sendMessage,
    playMessage,
    stopPlayback,
    clearHistory,
    voiceEnabled,
    setVoiceEnabled,
  };
}

export default useRavenAICompanion;




