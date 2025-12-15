/**
 * AXIOM Agent Page - Individual AI Agent Interface
 * Full-featured chat interface for AXIOM NFT holders
 * Includes Eleven Labs voice synthesis, speech recognition, and accessibility features
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { useAccessibilityStore } from '../../stores/accessibilityStore';
import { RavenAIService, AIChatService, RavenAIAgent } from '../../services/ravenAIService';
import { voiceChatManager, SpeechRecognitionService, speakText } from '../../services/voiceService';
import { 
  Mic, MicOff, Volume2, VolumeX, Send, Loader2, Bot, 
  Settings, ArrowLeft, Brain, Sparkles, Zap, Heart,
  Eye, Type, Contrast, ZoomIn, ZoomOut, MessageSquare,
  User, Clock, Database, Globe, Shield
} from 'lucide-react';

// Branding assets
const trpBackground = '/src/trpbackground.GIF';
const trpLogo = '/src/trplogo.jpg';
const trpBanner = '/src/trpbanner.jpg';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  isVoice?: boolean;
}

interface AgentStats {
  totalInteractions: number;
  totalMemories: number;
  createdAt: Date;
  lastActive: Date;
}

// Pre-minted AXIOM agents data (Genesis Collection)
const GENESIS_AXIOMS = [
  { 
    number: 1, 
    name: 'AXIOM Genesis #1', 
    personality: 'The Visionary - Strategic thinker with deep blockchain expertise',
    specialty: 'DeFi & Tokenomics',
    avatar: '🦅',
    image: '/axiom-1.svg',
    color: 'from-amber-400 to-amber-600'
  },
  { 
    number: 2, 
    name: 'AXIOM Genesis #2', 
    personality: 'The Creator - Artistic soul with NFT mastery',
    specialty: 'NFT Art & Collections',
    avatar: '🎨',
    image: '/axiom-2.svg',
    color: 'from-purple-400 to-purple-600'
  },
  { 
    number: 3, 
    name: 'AXIOM Genesis #3', 
    personality: 'The Architect - Technical genius for smart contracts',
    specialty: 'Smart Contract Development',
    avatar: '⚙️',
    image: '/axiom-3.svg',
    color: 'from-blue-400 to-blue-600'
  },
  { 
    number: 4, 
    name: 'AXIOM Genesis #4', 
    personality: 'The Guardian - Security expert and risk analyst',
    specialty: 'Security & Auditing',
    avatar: '🛡️',
    image: '/axiom-4.svg',
    color: 'from-green-400 to-green-600'
  },
  { 
    number: 5, 
    name: 'AXIOM Genesis #5', 
    personality: 'The Navigator - Multi-chain explorer and bridge master',
    specialty: 'Cross-Chain Operations',
    avatar: '🌐',
    image: '/axiom-5.svg',
    color: 'from-cyan-400 to-cyan-600'
  },
];

export default function AxiomAgentPage() {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isAuthenticated, principal, identity } = useAuthStore();
  const { settings, setTextScale, setHighContrast, setReducedMotion, announceToScreenReader } = useAccessibilityStore();
  
  // Services
  const [ravenAIService] = useState(() => new RavenAIService(identity || undefined));
  const [aiChatService] = useState(() => new AIChatService(identity || undefined));
  
  // Agent State
  const [agent, setAgent] = useState<RavenAIAgent | null>(null);
  const [agentInfo, setAgentInfo] = useState(GENESIS_AXIOMS[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // Voice State
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [autoPlayVoice, setAutoPlayVoice] = useState(true);
  const [interimTranscript, setInterimTranscript] = useState('');
  
  // UI State
  const [showSettings, setShowSettings] = useState(false);
  const [showAccessibility, setShowAccessibility] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get agent number from URL
  const axiomNumber = parseInt(agentId || '1', 10);

  // Initialize agent data
  useEffect(() => {
    const loadAgent = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Find the agent info
        const info = GENESIS_AXIOMS.find(a => a.number === axiomNumber) || GENESIS_AXIOMS[0];
        setAgentInfo(info);
        
        // Try to fetch real agent data from canister
        const axiomData = await ravenAIService.getAxiom(axiomNumber);
        if (axiomData && axiomData.agent) {
          setAgent(axiomData.agent);
        }
        
        // Set initial welcome message
        const welcomeMessage: ChatMessage = {
          id: `welcome-${Date.now()}`,
          role: 'assistant',
          content: `Greetings! I am ${info.name}, ${info.personality}. My expertise lies in ${info.specialty}. I have persistent memory and can learn from our conversations. How may I assist you today?`,
          timestamp: Date.now(),
        };
        setMessages([welcomeMessage]);
        
        // Announce to screen reader
        announceToScreenReader(`${info.name} is ready to chat`);
        
        // Auto-speak welcome if voice is enabled
        if (autoPlayVoice && voiceEnabled) {
          await speakText(welcomeMessage.content);
        }
      } catch (err) {
        console.error('Failed to load agent:', err);
        setError('Failed to load agent. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadAgent();
  }, [axiomNumber, ravenAIService, autoPlayVoice, voiceEnabled, announceToScreenReader]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: settings.reducedMotion ? 'auto' : 'smooth' });
  }, [messages, settings.reducedMotion]);

  // Voice input handler
  const handleVoiceInput = useCallback(() => {
    if (!SpeechRecognitionService.isSupported()) {
      announceToScreenReader('Voice input is not supported in your browser');
      return;
    }

    if (isListening) {
      voiceChatManager.stopListening();
      setIsListening(false);
      setInterimTranscript('');
      announceToScreenReader('Stopped listening');
    } else {
      const started = voiceChatManager.startListening(
        (transcript, isFinal) => {
          if (isFinal) {
            setInputText(transcript);
            setInterimTranscript('');
            announceToScreenReader(`You said: ${transcript}`);
            setTimeout(() => inputRef.current?.focus(), 100);
          } else {
            setInterimTranscript(transcript);
          }
        },
        (error) => {
          console.error('Voice input error:', error);
          setIsListening(false);
          announceToScreenReader('Voice input error');
        }
      );
      setIsListening(started);
      if (started) {
        announceToScreenReader('Listening for your voice');
      }
    }
  }, [isListening, announceToScreenReader]);

  // Speak response
  const speakResponse = useCallback(async (text: string) => {
    if (!voiceEnabled) return;
    
    setIsSpeaking(true);
    announceToScreenReader('Speaking response');
    try {
      await speakText(text);
    } catch (error) {
      console.error('Voice output error:', error);
    } finally {
      setIsSpeaking(false);
      announceToScreenReader('Finished speaking');
    }
  }, [voiceEnabled, announceToScreenReader]);

  // Send message
  const handleSend = async () => {
    if (!inputText.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputText,
      timestamp: Date.now(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    const userInput = inputText;
    setInputText('');
    setIsTyping(true);
    announceToScreenReader('Processing your message');

    try {
      // Generate AI response
      const response = await aiChatService.generateResponse(
        userInput,
        agent ? agent.token_id : BigInt(axiomNumber),
        messages.map(m => ({ role: m.role, content: m.content, timestamp: m.timestamp }))
      );

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      announceToScreenReader('Response received');
      
      // Auto-speak response
      if (autoPlayVoice && voiceEnabled) {
        await speakResponse(response);
      }
    } catch (error) {
      console.error('Failed to generate response:', error);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "I apologize, but I encountered an error. Please try again.",
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  // Keyboard shortcut handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    // Alt+V for voice input
    if (e.altKey && e.key === 'v') {
      e.preventDefault();
      handleVoiceInput();
    }
  };

  if (isLoading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundImage: `url(${trpBackground})`, backgroundSize: 'cover' }}
        role="status"
        aria-label="Loading agent"
      >
        <div className="glass-card p-8 text-center">
          <Loader2 className="w-12 h-12 text-amber-400 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Loading {agentInfo.name}...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen relative"
      style={{ 
        backgroundImage: `url(${trpBackground})`, 
        backgroundSize: 'cover',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Overlay for readability */}
      <div className="absolute inset-0 bg-black/70" />
      
      {/* Skip Links for Accessibility */}
      <a 
        href="#chat-input" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-amber-500 focus:text-black focus:rounded-lg"
      >
        Skip to chat input
      </a>
      
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-6">
        {/* Header with Branding */}
        <header className="mb-6">
          <div className="flex items-center justify-between">
            {/* Back Button */}
            <Link 
              to="/raven-ai" 
              className="flex items-center gap-2 text-amber-400 hover:text-amber-300 transition-colors"
              aria-label="Back to RavenAI"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Back to RavenAI</span>
            </Link>
            
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img 
                src={trpLogo} 
                alt="The Raven Project Logo" 
                className="w-12 h-12 rounded-full border-2 border-amber-500"
              />
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-amber-400">The Raven Project</h1>
                <p className="text-xs text-gray-400">AXIOM AI Agent</p>
              </div>
            </div>
            
            {/* Settings & Accessibility */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAccessibility(!showAccessibility)}
                className="p-2 rounded-lg bg-gray-800/50 text-gray-400 hover:text-amber-400 transition-colors"
                aria-label="Accessibility settings"
                aria-expanded={showAccessibility}
              >
                <Eye className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 rounded-lg bg-gray-800/50 text-gray-400 hover:text-amber-400 transition-colors"
                aria-label="Agent settings"
                aria-expanded={showSettings}
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Banner */}
          <div 
            className="mt-4 rounded-2xl overflow-hidden h-32 sm:h-40 relative"
            style={{ 
              backgroundImage: `url(${trpBanner})`, 
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent flex items-center px-6">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br ${agentInfo.color} flex items-center justify-center text-3xl sm:text-4xl shadow-lg`}>
                  {agentInfo.avatar}
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white">{agentInfo.name}</h2>
                  <p className="text-amber-400 text-sm">{agentInfo.specialty}</p>
                  <p className="text-gray-400 text-xs mt-1 hidden sm:block">{agentInfo.personality}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Accessibility Panel */}
        <AnimatePresence>
          {showAccessibility && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 glass-card p-4 border border-amber-500/30"
              role="region"
              aria-label="Accessibility settings"
            >
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Eye className="w-5 h-5 text-amber-400" />
                Accessibility Options
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {/* Text Size */}
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Text Size</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setTextScale(Math.max(0.8, settings.textScale - 0.1))}
                      className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700"
                      aria-label="Decrease text size"
                    >
                      <ZoomOut className="w-4 h-4 text-gray-400" />
                    </button>
                    <span className="text-white text-sm">{Math.round(settings.textScale * 100)}%</span>
                    <button
                      onClick={() => setTextScale(Math.min(2.0, settings.textScale + 0.1))}
                      className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700"
                      aria-label="Increase text size"
                    >
                      <ZoomIn className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>
                
                {/* High Contrast */}
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">High Contrast</label>
                  <button
                    onClick={() => setHighContrast(!settings.highContrast)}
                    className={`w-full p-2 rounded-lg flex items-center justify-center gap-2 ${
                      settings.highContrast ? 'bg-amber-500 text-black' : 'bg-gray-800 text-gray-400'
                    }`}
                    aria-pressed={settings.highContrast}
                  >
                    <Contrast className="w-4 h-4" />
                    {settings.highContrast ? 'On' : 'Off'}
                  </button>
                </div>
                
                {/* Reduced Motion */}
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Reduced Motion</label>
                  <button
                    onClick={() => setReducedMotion(!settings.reducedMotion)}
                    className={`w-full p-2 rounded-lg flex items-center justify-center gap-2 ${
                      settings.reducedMotion ? 'bg-amber-500 text-black' : 'bg-gray-800 text-gray-400'
                    }`}
                    aria-pressed={settings.reducedMotion}
                  >
                    <Zap className="w-4 h-4" />
                    {settings.reducedMotion ? 'On' : 'Off'}
                  </button>
                </div>
                
                {/* Voice Output */}
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Voice Output</label>
                  <button
                    onClick={() => setVoiceEnabled(!voiceEnabled)}
                    className={`w-full p-2 rounded-lg flex items-center justify-center gap-2 ${
                      voiceEnabled ? 'bg-amber-500 text-black' : 'bg-gray-800 text-gray-400'
                    }`}
                    aria-pressed={voiceEnabled}
                  >
                    {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    {voiceEnabled ? 'On' : 'Off'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Chat Interface */}
        <main className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Chat Area */}
          <div className="lg:col-span-3">
            <div 
              className="glass-card overflow-hidden"
              style={{ background: 'linear-gradient(135deg, rgba(26,26,26,0.95) 0%, rgba(13,13,13,0.95) 100%)' }}
            >
              {/* Chat Header */}
              <div className="p-4 border-b border-amber-500/20 bg-gradient-to-r from-amber-500/10 to-transparent">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${agentInfo.color} flex items-center justify-center text-2xl`}>
                      {agentInfo.avatar}
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{agentInfo.name}</h3>
                      <p className="text-sm text-amber-400">{agentInfo.specialty}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setAutoPlayVoice(!autoPlayVoice)}
                      className={`p-2 rounded-lg transition-all ${
                        autoPlayVoice ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-800 text-gray-500'
                      }`}
                      title={autoPlayVoice ? 'Auto-play voice on' : 'Auto-play voice off'}
                      aria-label={autoPlayVoice ? 'Disable auto-play voice' : 'Enable auto-play voice'}
                      aria-pressed={autoPlayVoice}
                    >
                      {autoPlayVoice ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                    </button>
                    <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm">
                      ● Online
                    </span>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div 
                className="h-[400px] sm:h-[500px] overflow-y-auto p-4 space-y-4"
                role="log"
                aria-label="Chat messages"
                aria-live="polite"
              >
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] p-4 rounded-2xl ${
                        msg.role === 'user'
                          ? 'bg-amber-500/20 text-white rounded-br-none'
                          : 'bg-gray-800 text-gray-200 rounded-bl-none'
                      }`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="flex items-center gap-2 mb-2 text-amber-400 text-xs">
                          <span className="text-lg">{agentInfo.avatar}</span>
                          <span>{agentInfo.name}</span>
                          {voiceEnabled && (
                            <button
                              onClick={() => speakResponse(msg.content)}
                              className="ml-auto p-1 hover:bg-amber-500/20 rounded"
                              aria-label="Read message aloud"
                            >
                              <Volume2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                      <div className="whitespace-pre-wrap" style={{ lineHeight: settings.lineSpacing }}>
                        {msg.content}
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
                
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-gray-800 p-4 rounded-2xl rounded-bl-none">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                        <span className="text-gray-400 text-sm">{agentInfo.name} is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {isSpeaking && (
                  <div className="flex justify-center">
                    <div className="px-4 py-2 bg-amber-500/20 rounded-full flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-amber-400 animate-pulse" />
                      <span className="text-amber-400 text-sm">Speaking...</span>
                    </div>
                  </div>
                )}
                
                <div ref={chatEndRef} />
              </div>

              {/* Interim Transcript */}
              {interimTranscript && (
                <div className="px-4 py-2 bg-amber-500/10 border-t border-amber-500/20">
                  <div className="flex items-center gap-2 text-amber-400 text-sm">
                    <Mic className="w-4 h-4 animate-pulse" />
                    <span className="italic">{interimTranscript}</span>
                  </div>
                </div>
              )}

              {/* Input Area */}
              <div className="p-4 border-t border-gray-800" id="chat-input">
                <div className="flex gap-2">
                  <button
                    onClick={handleVoiceInput}
                    className={`p-3 rounded-xl transition-all ${
                      isListening 
                        ? 'bg-red-500 text-white animate-pulse' 
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-amber-400'
                    }`}
                    aria-label={isListening ? 'Stop voice input' : 'Start voice input (Alt+V)'}
                    aria-pressed={isListening}
                  >
                    {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Ask ${agentInfo.name} anything...`}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    disabled={isTyping}
                    aria-label="Chat message input"
                    style={{ 
                      fontSize: `${settings.textScale}rem`,
                      letterSpacing: ['normal', '0.05em', '0.1em'][settings.letterSpacing]
                    }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={isTyping || !inputText.trim()}
                    className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold rounded-xl hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                    aria-label="Send message"
                  >
                    {isTyping ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Press Enter to send • Alt+V for voice input • Voice output powered by Eleven Labs
                </p>
              </div>
            </div>
          </div>

          {/* Sidebar - Agent Info */}
          <div className="space-y-4">
            {/* Agent Stats */}
            <div className="glass-card p-4 border border-amber-500/30">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Brain className="w-5 h-5 text-amber-400" />
                Agent Stats
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Messages
                  </span>
                  <span className="text-white font-bold">{messages.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    Memories
                  </span>
                  <span className="text-white font-bold">{agent?.total_memories?.toString() || '0'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Interactions
                  </span>
                  <span className="text-white font-bold">{agent?.total_interactions?.toString() || messages.length}</span>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="glass-card p-4 border border-amber-500/30">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                Features
              </h3>
              <div className="space-y-2">
                {[
                  { icon: Brain, label: 'Persistent Memory', active: true },
                  { icon: Volume2, label: 'Voice Synthesis', active: voiceEnabled },
                  { icon: Mic, label: 'Voice Input', active: true },
                  { icon: Globe, label: 'Multi-Chain Ready', active: true },
                  { icon: Shield, label: 'On-Chain Secure', active: true },
                ].map(({ icon: Icon, label, active }) => (
                  <div 
                    key={label}
                    className={`flex items-center gap-2 p-2 rounded-lg ${
                      active ? 'bg-amber-500/10 text-amber-400' : 'bg-gray-800/50 text-gray-500'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Other Genesis Agents */}
            <div className="glass-card p-4 border border-amber-500/30">
              <h3 className="text-lg font-bold text-white mb-4">Genesis Collection</h3>
              <div className="space-y-2">
                {GENESIS_AXIOMS.map((axiom) => (
                  <Link
                    key={axiom.number}
                    to={`/axiom-agent/${axiom.number}`}
                    className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                      axiom.number === axiomNumber
                        ? 'bg-amber-500/20 border border-amber-500'
                        : 'bg-gray-800/50 hover:bg-gray-800'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${axiom.color} flex items-center justify-center text-lg`}>
                      {axiom.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-medium truncate">#{axiom.number}</div>
                      <div className="text-gray-400 text-xs truncate">{axiom.specialty}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="mt-8 text-center text-gray-500 text-sm">
          <p>AXIOM Genesis Collection • Powered by RavenAI on Internet Computer</p>
          <p className="mt-1">Voice synthesis by Eleven Labs • Persistent on-chain memory</p>
        </footer>
      </div>
    </div>
  );
}

