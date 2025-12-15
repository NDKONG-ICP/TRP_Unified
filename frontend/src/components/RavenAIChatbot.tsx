/**
 * RavenAI Chatbot Component
 * 
 * Beautiful, interactive chatbot UI with:
 * - AI Council integration (7 LLMs)
 * - Eleven Labs voice synthesis & playback
 * - Conversational RavenAI Companion personality
 * - Works with main app and AXIOM NFTs
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  Send,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Loader2,
  X,
  Minimize2,
  Maximize2,
  Sparkles,
  Brain,
  Bot,
  User,
  Play,
  Pause,
  Trash2,
  Settings,
  ChevronDown,
} from 'lucide-react';
import { useRavenAICompanion } from '../hooks/useRavenAICompanion';
import { CompanionMessage } from '../services/ravenAICompanion';

// ============================================================================
// Types
// ============================================================================

interface RavenAIChatbotProps {
  agentId?: number; // AXIOM NFT ID if applicable
  agentName?: string;
  className?: string;
  initialOpen?: boolean;
  floating?: boolean; // Floating button vs inline
  onClose?: () => void;
}

// ============================================================================
// Message Component
// ============================================================================

interface MessageBubbleProps {
  message: CompanionMessage;
  isPlaying: boolean;
  onPlay: () => void;
  onStop: () => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isPlaying,
  onPlay,
  onStop,
}) => {
  const isUser = message.role === 'user';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div className={`flex items-end gap-2 max-w-[85%] ${isUser ? 'flex-row-reverse' : ''}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser 
            ? 'bg-gradient-to-br from-blue-500 to-purple-600' 
            : 'bg-gradient-to-br from-gold-400 to-amber-600'
        }`}>
          {isUser ? (
            <User className="w-4 h-4 text-white" />
          ) : (
            <Bot className="w-4 h-4 text-white" />
          )}
        </div>
        
        {/* Message Content */}
        <div className={`relative group ${
          isUser 
            ? 'bg-gradient-to-br from-blue-600 to-purple-700 text-white' 
            : 'bg-gradient-to-br from-raven-800 to-raven-900 text-white border border-gold-500/30'
        } rounded-2xl px-4 py-3 shadow-lg`}>
          {/* Message Text - Improved readability */}
          <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-normal">
            {message.content}
          </p>
          
          {/* Voice Playback Button (for assistant messages with audio) */}
          {!isUser && message.audioUrl && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={isPlaying ? onStop : onPlay}
              className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-gold-400 to-amber-600 flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 text-raven-900" />
              ) : (
                <Play className="w-4 h-4 text-raven-900 ml-0.5" />
              )}
            </motion.button>
          )}
          
          {/* Council Info Badge */}
          {!isUser && message.councilData && (
            <div className="flex items-center gap-1 mt-2 pt-2 border-t border-white/10">
              <Brain className="w-3 h-3 text-gold-400" />
              <span className="text-[10px] text-silver-500">
                AI Council • {Math.round(message.councilData.consensus.agreementLevel * 100)}% agreement
              </span>
            </div>
          )}
          
          {/* Timestamp */}
          <p className={`text-[10px] mt-1 ${isUser ? 'text-white/50' : 'text-silver-600'}`}>
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================================================
// Main Chatbot Component
// ============================================================================

export const RavenAIChatbot: React.FC<RavenAIChatbotProps> = ({
  agentId,
  agentName,
  className = '',
  initialOpen = false,
  floating = true,
  onClose,
}) => {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  
  // Initialize companion with agent-specific config
  const config = agentId 
    ? { agentId, name: agentName || `AXIOM Genesis #${agentId}` }
    : undefined;
  
  const {
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
  } = useRavenAICompanion(config);
  
  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };
      
      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
    
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);
  
  // Handle send message
  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;
    
    const message = input.trim();
    setInput('');
    await sendMessage(message);
  }, [input, isLoading, sendMessage]);
  
  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  // Toggle speech recognition
  const toggleListening = () => {
    if (!recognitionRef.current) return;
    
    if (isListening) {
      recognitionRef.current.abort();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };
  
  // Floating button for opening chat - Mobile optimized, high visibility
  if (floating && !isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-gradient-to-br from-gold-400 via-amber-500 to-gold-600 shadow-[0_0_30px_rgba(217,119,6,0.5)] flex items-center justify-center z-[9999] group touch-manipulation hover:scale-110 active:scale-95 transition-all duration-200 border-2 border-gold-300"
        aria-label="Open AI Chat"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <MessageCircle className="w-7 h-7 sm:w-8 sm:h-8 text-raven-900 drop-shadow-lg relative z-10" />
        <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-green-500 rounded-full border-2 border-white animate-pulse shadow-lg z-20" />
        {/* Pulsing ring effect - pointer-events-none so it doesn't capture clicks */}
        <span className="absolute inset-0 rounded-full bg-gold-400/30 animate-ping pointer-events-none" style={{ animationDuration: '2s' }} />
      </button>
    );
  }
  
  const chatContent = (
    <div className={`flex flex-col h-full ${isMinimized ? 'h-14' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-raven-900 via-raven-800 to-raven-900 border-b border-gold-500/30">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-400 to-amber-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-raven-900" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-raven-900" />
          </div>
          <div>
            <h3 className="font-semibold text-gold-300 text-sm">
              {agentName || 'RavenAI Companion'}
            </h3>
            <p className="text-[10px] text-silver-500 flex items-center gap-1">
              <Brain className="w-3 h-3" />
              AI Council Active • {isLoading ? 'Thinking...' : 'Online'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {/* Voice Toggle */}
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`p-2 rounded-lg transition-colors ${
              voiceEnabled ? 'text-gold-400 bg-gold-500/10' : 'text-silver-500 hover:text-silver-300'
            }`}
            title={voiceEnabled ? 'Voice On' : 'Voice Off'}
          >
            {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          
          {/* Settings */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-lg text-silver-500 hover:text-silver-300 transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
          
          {/* Minimize */}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-2 rounded-lg text-silver-500 hover:text-silver-300 transition-colors"
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          
          {/* Close */}
          {floating && (
            <button
              onClick={() => {
                setIsOpen(false);
                onClose?.();
              }}
              className="p-2 rounded-lg text-silver-500 hover:text-red-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      
      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && !isMinimized && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-gold-500/20 bg-raven-900/50 overflow-hidden"
          >
            <div className="p-3 space-y-2">
              <button
                onClick={clearHistory}
                className="flex items-center gap-2 text-sm text-silver-400 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Clear Conversation
              </button>
              <div className="flex items-center justify-between text-sm">
                <span className="text-silver-400">Voice Responses</span>
                <button
                  onClick={() => setVoiceEnabled(!voiceEnabled)}
                  className={`w-10 h-5 rounded-full transition-colors ${
                    voiceEnabled ? 'bg-gold-500' : 'bg-silver-700'
                  }`}
                >
                  <motion.div
                    animate={{ x: voiceEnabled ? 20 : 2 }}
                    className="w-4 h-4 rounded-full bg-white shadow"
                  />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Messages */}
      {!isMinimized && (
        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gradient-to-b from-raven-950 to-raven-900">
          {/* Welcome Message */}
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-8"
            >
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-gold-400/20 to-amber-600/20 flex items-center justify-center">
                <Sparkles className="w-10 h-10 text-gold-400" />
              </div>
              <h3 className="text-lg font-semibold text-gold-300 mb-2">
                {agentName || 'RavenAI Companion'}
              </h3>
              <p className="text-sm text-silver-500 max-w-xs mx-auto">
                Hey! I'm your AI companion powered by the AI Council - 7 different AI models working together. Ask me anything!
              </p>
              
              {/* Quick Suggestions */}
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {[
                  'What is AXIOM?',
                  'Tell me about Raven',
                  'How does AI Council work?',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setInput(suggestion);
                      inputRef.current?.focus();
                    }}
                    className="px-3 py-1.5 text-xs bg-raven-800 hover:bg-raven-700 text-silver-300 rounded-full border border-gold-500/20 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
          
          {/* Message List */}
          <AnimatePresence>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isPlaying={isPlaying && message.role === 'assistant'}
                onPlay={() => playMessage(message)}
                onStop={stopPlayback}
              />
            ))}
          </AnimatePresence>
          
          {/* Loading Indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 px-4 py-3"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold-400 to-amber-600 flex items-center justify-center">
                <Loader2 className="w-4 h-4 text-raven-900 animate-spin" />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-sm text-silver-400">Consulting AI Council</span>
                <motion.span
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-gold-400"
                >
                  ...
                </motion.span>
              </div>
            </motion.div>
          )}
          
          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mx-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
            >
              {error}
            </motion.div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      )}
      
      {/* Input Area */}
      {!isMinimized && (
        <div className="p-3 bg-raven-900 border-t border-gold-500/20">
          <div className="flex items-end gap-2">
            {/* Speech-to-Text Button */}
            <button
              onClick={toggleListening}
              disabled={!recognitionRef.current}
              className={`p-3 rounded-xl transition-all ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-raven-800 text-silver-400 hover:text-gold-400 hover:bg-raven-700'
              } ${!recognitionRef.current ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={isListening ? 'Stop listening' : 'Speak your message'}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            
            {/* Text Input */}
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything..."
                disabled={isLoading}
                rows={1}
                className="w-full px-4 py-3 bg-raven-800 border border-gold-500/20 rounded-xl text-silver-100 placeholder-silver-600 focus:outline-none focus:border-gold-500/50 resize-none transition-colors disabled:opacity-50"
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />
            </div>
            
            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="p-3 rounded-xl bg-gradient-to-br from-gold-400 to-amber-600 text-raven-900 hover:from-gold-300 hover:to-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          
          {/* Voice Status */}
          {isListening && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-center text-red-400 mt-2"
            >
              🎤 Listening... Speak now
            </motion.p>
          )}
        </div>
      )}
    </div>
  );
  
  // Floating chat window - Mobile responsive, solid background
  if (floating) {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className={`fixed z-[9999] ${
              isMinimized 
                ? 'bottom-4 right-4 sm:bottom-6 sm:right-6 w-[280px] sm:w-[320px] h-14' 
                : 'inset-2 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[400px] sm:h-[600px]'
            } rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.8)] border-2 border-gold-500/50 overflow-hidden ${className}`}
            style={{ 
              maxHeight: isMinimized ? '56px' : 'calc(100vh - 16px)',
              maxWidth: isMinimized ? 'auto' : 'calc(100vw - 16px)',
              backgroundColor: '#0a0a0a', // Solid dark background
            }}
          >
            {chatContent}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
  
  // Inline chat
  return (
    <div className={`w-full h-full bg-raven-950 rounded-2xl border border-gold-500/30 overflow-hidden ${className}`}>
      {chatContent}
    </div>
  );
};

export default RavenAIChatbot;

