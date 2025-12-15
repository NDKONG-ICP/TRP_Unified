// RavenAI Agent Page - AXIOM NFT Collection
// Personalized on-chain AI agents with persistent memory
// Integrated with Eleven Labs voice synthesis and speech recognition

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { RavenAIService, AIChatService, RavenAIAgent } from '../../services/ravenAIService';
import { voiceChatManager, SpeechRecognitionService, speakText } from '../../services/voiceService';
import { Mic, MicOff, Volume2, VolumeX, Send, Loader2, Bot, Sparkles, Brain, Zap, Crown, ExternalLink } from 'lucide-react';

// Genesis AXIOM agents (pre-minted, not for sale)
const GENESIS_AXIOMS = [
  { number: 1, name: 'AXIOM Genesis #1', specialty: 'DeFi & Tokenomics', avatar: '🦅', color: 'from-amber-400 to-amber-600', image: '/axiom-1.svg' },
  { number: 2, name: 'AXIOM Genesis #2', specialty: 'NFT Art & Collections', avatar: '🎨', color: 'from-purple-400 to-purple-600', image: '/axiom-2.svg' },
  { number: 3, name: 'AXIOM Genesis #3', specialty: 'Smart Contract Development', avatar: '⚙️', color: 'from-blue-400 to-blue-600', image: '/axiom-3.svg' },
  { number: 4, name: 'AXIOM Genesis #4', specialty: 'Security & Auditing', avatar: '🛡️', color: 'from-green-400 to-green-600', image: '/axiom-4.svg' },
  { number: 5, name: 'AXIOM Genesis #5', specialty: 'Cross-Chain Operations', avatar: '🌐', color: 'from-cyan-400 to-cyan-600', image: '/axiom-5.svg' },
];

// Types
interface PaymentToken {
  id: string;
  name: string;
  symbol: string;
  icon: string;
  usdPrice: number;
  amountFor100USD: string;
  decimals: number;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

// Constants
const PAYMENT_TOKENS: PaymentToken[] = [
  { id: 'icp', name: 'Internet Computer', symbol: 'ICP', icon: '🌐', usdPrice: 12.50, amountFor100USD: '8', decimals: 8 },
  { id: 'raven', name: 'RAVEN Token', symbol: 'RAVEN', icon: '🦅', usdPrice: 0.001, amountFor100USD: '100,000', decimals: 8 },
  { id: 'ckbtc', name: 'Chain-Key Bitcoin', symbol: 'ckBTC', icon: '₿', usdPrice: 97500, amountFor100USD: '0.00103', decimals: 8 },
  { id: 'cketh', name: 'Chain-Key Ethereum', symbol: 'ckETH', icon: 'Ξ', usdPrice: 3200, amountFor100USD: '0.03125', decimals: 18 },
  { id: 'ckusdc', name: 'Chain-Key USDC', symbol: 'ckUSDC', icon: '💵', usdPrice: 1.0, amountFor100USD: '100', decimals: 6 },
  { id: 'cksol', name: 'Chain-Key Solana', symbol: 'ckSOL', icon: '◎', usdPrice: 185, amountFor100USD: '0.54', decimals: 9 },
];

const AXIOM_TOTAL = 300;
const RAVEN_TOKEN_CANISTER = '4k7jk-vyaaa-aaaam-qcyaa-cai';

export const RavenAIPage: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated, principal, identity } = useAuthStore();
  
  // Services
  const [ravenAIService] = useState(() => new RavenAIService(identity || undefined));
  const [aiChatService] = useState(() => new AIChatService(identity || undefined));
  
  // State
  const [activeTab, setActiveTab] = useState<'demo' | 'axiom' | 'my-agents'>('demo');
  const [selectedToken, setSelectedToken] = useState<PaymentToken>(PAYMENT_TOKENS[0]);
  const [selectedAxiom, setSelectedAxiom] = useState<number | null>(null);
  const [axiomAvailable, setAxiomAvailable] = useState<number[]>([]);
  const [axiomMinted, setAxiomMinted] = useState<number>(5);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseType, setPurchaseType] = useState<'standard' | 'axiom'>('standard');
  const [isLoading, setIsLoading] = useState(true);
  const [canisterHealth, setCanisterHealth] = useState<boolean | null>(null);
  
  // Voice State
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [autoPlayVoice, setAutoPlayVoice] = useState(true);
  const [interimTranscript, setInterimTranscript] = useState('');
  
  // Demo Chat State
  const [demoMessages, setDemoMessages] = useState<ChatMessage[]>([
    { 
      role: 'assistant', 
      content: "Hello! I'm RavenAI, your on-chain AI companion with persistent memory. I can help you explore blockchain, NFTs, and the Internet Computer ecosystem. Try asking me anything, or use the microphone for voice chat!", 
      timestamp: Date.now() 
    }
  ]);
  const [demoInput, setDemoInput] = useState('');
  const [isDemoTyping, setIsDemoTyping] = useState(false);
  
  // My Agents State
  const [myAgents, setMyAgents] = useState<RavenAIAgent[]>([]);
  const [activeAgent, setActiveAgent] = useState<RavenAIAgent | null>(null);
  const [agentMessages, setAgentMessages] = useState<ChatMessage[]>([]);
  const [agentInput, setAgentInput] = useState('');
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize and fetch real data from canister
  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      try {
        // Check canister health
        const health = await ravenAIService.checkHealth();
        setCanisterHealth(health);

        // Get AXIOM availability from canister
        const availability = await ravenAIService.getAxiomAvailability();
        setAxiomMinted(availability.minted);
        setAxiomAvailable(availability.available);

        console.log('RavenAI canister initialized:', { health, availability });
      } catch (error) {
        console.error('Failed to initialize RavenAI data:', error);
        // Fallback to generated data if canister is unavailable
        const available = Array.from({ length: AXIOM_TOTAL }, (_, i) => i + 1)
          .filter(n => n > 5); // First 5 are pre-minted
        setAxiomAvailable(available);
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, [ravenAIService]);

  // Fetch user's agents when authenticated
  useEffect(() => {
    const fetchMyAgents = async () => {
      if (isAuthenticated && principal) {
        try {
          const agents = await ravenAIService.getAgentsByOwner(principal);
          setMyAgents(agents);
          console.log('Fetched user agents:', agents);
        } catch (error) {
          console.error('Failed to fetch user agents:', error);
        }
      }
    };

    fetchMyAgents();
  }, [isAuthenticated, principal, ravenAIService]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [demoMessages, agentMessages]);

  // Voice input handler
  const handleVoiceInput = useCallback(() => {
    if (!SpeechRecognitionService.isSupported()) {
      alert('Voice input is not supported in your browser. Please use Chrome or Edge.');
      return;
    }

    if (isListening) {
      voiceChatManager.stopListening();
      setIsListening(false);
      setInterimTranscript('');
    } else {
      const started = voiceChatManager.startListening(
        (transcript, isFinal) => {
          if (isFinal) {
            setDemoInput(transcript);
            setInterimTranscript('');
            // Auto-send after voice input
            setTimeout(() => {
              inputRef.current?.focus();
            }, 100);
          } else {
            setInterimTranscript(transcript);
          }
        },
        (error) => {
          console.error('Voice input error:', error);
          setIsListening(false);
        }
      );
      setIsListening(started);
    }
  }, [isListening]);

  // Speak AI response
  const speakResponse = useCallback(async (text: string) => {
    if (!autoPlayVoice || !voiceEnabled) return;
    
    setIsSpeaking(true);
    try {
      await speakText(text);
    } catch (error) {
      console.error('Voice output error:', error);
    } finally {
      setIsSpeaking(false);
    }
  }, [autoPlayVoice, voiceEnabled]);

  // Handle demo chat send
  const handleDemoSend = async () => {
    if (!demoInput.trim() || isDemoTyping) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: demoInput,
      timestamp: Date.now(),
    };
    
    setDemoMessages(prev => [...prev, userMessage]);
    const userInput = demoInput;
    setDemoInput('');
    setIsDemoTyping(true);

    try {
      // Generate AI response using the real service
      const response = await aiChatService.generateResponse(
        userInput,
        undefined, // No token ID for demo
        demoMessages
      );

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      };

      setDemoMessages(prev => [...prev, assistantMessage]);
      
      // Speak the response
      await speakResponse(response);
    } catch (error) {
      console.error('Failed to generate response:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: "I apologize, but I encountered an error processing your request. Please try again.",
        timestamp: Date.now(),
      };
      setDemoMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsDemoTyping(false);
    }
  };

  // Handle agent chat send
  const handleAgentSend = async () => {
    if (!agentInput.trim() || isAgentTyping || !activeAgent) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: agentInput,
      timestamp: Date.now(),
    };
    
    setAgentMessages(prev => [...prev, userMessage]);
    const userInput = agentInput;
    setAgentInput('');
    setIsAgentTyping(true);

    try {
      // Generate AI response using the real service with agent context
      const response = await aiChatService.generateResponse(
        userInput,
        activeAgent.token_id,
        agentMessages
      );

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      };

      setAgentMessages(prev => [...prev, assistantMessage]);
      
      // Speak the response
      await speakResponse(response);
    } catch (error) {
      console.error('Failed to generate agent response:', error);
    } finally {
      setIsAgentTyping(false);
    }
  };

  const handlePurchase = async () => {
    if (!isAuthenticated) {
      alert('Please connect your wallet first');
      return;
    }

    setIsProcessing(true);

    try {
      // In production, this would initiate real payment
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (purchaseType === 'axiom' && selectedAxiom) {
        setAxiomAvailable(prev => prev.filter(n => n !== selectedAxiom));
        setAxiomMinted(prev => prev + 1);
        alert(`🎉 Congratulations! You've minted AXIOM #${selectedAxiom}!`);
      } else {
        alert('🎉 Congratulations! You\'ve minted a RavenAI agent!');
      }

      setShowPurchaseModal(false);
    } catch (error) {
      alert('Purchase failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const openPurchaseModal = (type: 'standard' | 'axiom', axiomNum?: number) => {
    setPurchaseType(type);
    if (axiomNum) setSelectedAxiom(axiomNum);
    if (type === 'axiom') {
      setSelectedToken(PAYMENT_TOKENS[1]); // RAVEN token for AXIOM
    }
    setShowPurchaseModal(true);
  };

  // Chat Interface Component
  const ChatInterface = ({ 
    messages, 
    input, 
    setInput, 
    onSend, 
    isTyping, 
    title, 
    subtitle,
    isAgent = false 
  }: {
    messages: ChatMessage[];
    input: string;
    setInput: (value: string) => void;
    onSend: () => void;
    isTyping: boolean;
    title: string;
    subtitle: string;
    isAgent?: boolean;
  }) => (
    <div className="glass-card overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%)' }}>
      {/* Chat Header */}
      <div className="p-4 border-b border-amber-500/20 bg-gradient-to-r from-amber-500/10 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-2xl animate-pulse">
            🦅
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-white">{title}</h3>
            <p className="text-sm text-amber-400">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Voice Controls */}
            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`p-2 rounded-lg transition-all ${
                voiceEnabled ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-800 text-gray-500'
              }`}
              title={voiceEnabled ? 'Disable voice' : 'Enable voice'}
            >
              {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
            <span className={`px-3 py-1 rounded-full text-sm ${
              canisterHealth ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
            }`}>
              {canisterHealth ? '● On-Chain' : '● Connecting...'}
            </span>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="h-96 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[95%] sm:max-w-[80%] p-4 rounded-2xl ${
                msg.role === 'user'
                  ? 'bg-amber-500/20 text-white rounded-br-none'
                  : 'bg-gray-800 text-gray-200 rounded-bl-none'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-2 text-amber-400 text-xs">
                  <Bot className="w-4 h-4" />
                  <span>RavenAI</span>
                  {voiceEnabled && (
                    <button
                      onClick={() => speakText(msg.content)}
                      className="ml-auto p-1 hover:bg-amber-500/20 rounded"
                      title="Read aloud"
                    >
                      <Volume2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-800 p-4 rounded-2xl rounded-bl-none">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                <span className="text-gray-400 text-sm">RavenAI is thinking...</span>
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

      {/* Chat Input */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex gap-2">
          <button
            onClick={handleVoiceInput}
            className={`p-3 rounded-xl transition-all ${
              isListening 
                ? 'bg-red-500 text-white animate-pulse' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
            title={isListening ? 'Stop listening' : 'Start voice input'}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && onSend()}
            placeholder={t('ravenai.askAnything', 'Ask me anything... or use voice input')}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none"
            disabled={isTyping}
          />
          <button
            onClick={onSend}
            disabled={isTyping || !input.trim()}
            className="btn-primary px-6 flex items-center gap-2"
          >
            {isTyping ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900">
      {/* Hero Section */}
      <section className="relative py-16 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-900/20 via-transparent to-transparent"></div>
        
        <div className="relative max-w-6xl mx-auto text-center">
          <div className="text-7xl mb-6 animate-bounce">🦅</div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            <span className="gold-gradient-text">RavenAI</span>
            <span className="text-white"> Agents</span>
          </h1>
          <p className="text-xl text-gray-400 mb-6 max-w-2xl mx-auto">
            {t('ravenai.tagline', 'Your personal on-chain AI companion with persistent memory, voice interaction, and multi-chain capabilities.')}
          </p>
          
          {/* Features */}
          <div className="flex justify-center gap-4 mb-6 flex-wrap">
            {[
              { icon: Brain, label: 'On-Chain AI' },
              { icon: Sparkles, label: 'Persistent Memory' },
              { icon: Volume2, label: 'Voice Enabled' },
              { icon: Zap, label: 'Real-time' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 rounded-full">
                <Icon className="w-4 h-4 text-amber-400" />
                <span className="text-amber-400 text-sm">{label}</span>
              </div>
            ))}
          </div>
          
          {/* Stats */}
          <div className="flex justify-center gap-8 mb-8">
            <div className="text-center">
              <div className="text-3xl font-bold gold-gradient-text">{AXIOM_TOTAL}</div>
              <div className="text-gray-500 text-sm">AXIOM Collection</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold gold-gradient-text">{AXIOM_TOTAL - axiomMinted}</div>
              <div className="text-gray-500 text-sm">Available</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold gold-gradient-text">$100</div>
              <div className="text-gray-500 text-sm">Starting Price</div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex justify-center gap-2 mb-8">
            {[
              { id: 'demo', label: '🎮 Free Demo', icon: '🎮' },
              { id: 'axiom', label: '👑 AXIOM Collection', icon: '👑' },
              { id: 'my-agents', label: '🤖 My Agents', icon: '🤖' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-3 rounded-xl font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black'
                    : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
            <span className="ml-3 text-gray-400">Connecting to on-chain AI...</span>
          </div>
        )}

        {/* Demo Tab */}
        {!isLoading && activeTab === 'demo' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chat Interface */}
            <div className="lg:col-span-2">
              <ChatInterface
                messages={demoMessages}
                input={demoInput}
                setInput={setDemoInput}
                onSend={handleDemoSend}
                isTyping={isDemoTyping}
                title="RavenAI Demo"
                subtitle="Free Demo • Voice Enabled • On-Chain AI"
              />
            </div>

            {/* Upgrade CTA */}
            <div className="space-y-4">
              <div className="glass-card p-6 border-amber-500/30">
                <div className="text-center mb-6">
                  <div className="text-4xl mb-2">👑</div>
                  <h3 className="text-xl font-bold text-white mb-2">Upgrade to AXIOM</h3>
                  <p className="text-gray-400 text-sm">
                    Unlock the full power of RavenAI with an exclusive AXIOM NFT
                  </p>
                </div>

                <div className="space-y-3 mb-6">
                  {[
                    '♾️ Persistent Long-term Memory',
                    '🔗 Multi-chain Transferable NFT',
                    '🧠 Knowledge Graph Learning',
                    '🎙️ Premium Voice Features',
                    '🌐 10+ Language Support',
                    '♿ Full Accessibility Features',
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center gap-2 text-gray-300 text-sm">
                      <span className="text-amber-400">✓</span>
                      {feature}
                    </div>
                  ))}
                </div>

                <div className="text-center mb-4">
                  <div className="text-3xl font-bold gold-gradient-text">100,000 RAVEN</div>
                  <div className="text-gray-500 text-sm">or $100 USD equivalent</div>
                </div>

                <button
                  onClick={() => openPurchaseModal('axiom')}
                  className="btn-primary w-full py-4 text-lg font-bold"
                >
                  🦅 Get AXIOM NFT
                </button>
              </div>

              {/* Voice Features Info */}
              <div className="glass-card p-6">
                <h4 className="font-bold text-white mb-3 flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-amber-400" />
                  Voice Features
                </h4>
                <p className="text-gray-400 text-sm mb-4">
                  RavenAI uses Eleven Labs for natural voice synthesis and Web Speech API for voice input.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Auto-play responses</span>
                    <button
                      onClick={() => setAutoPlayVoice(!autoPlayVoice)}
                      className={`w-12 h-6 rounded-full transition-all ${
                        autoPlayVoice ? 'bg-amber-500' : 'bg-gray-700'
                      }`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full transition-all ${
                        autoPlayVoice ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AXIOM Collection Tab */}
        {!isLoading && activeTab === 'axiom' && (
          <div>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">AXIOM Collection</h2>
              <p className="text-gray-400">
                300 Exclusive Sequentially Numbered AI Agent NFTs
              </p>
            </div>

            {/* Genesis Collection - Pre-minted AXIOMs */}
            <div className="mb-12">
              <div className="flex items-center justify-center gap-3 mb-6">
                <Crown className="w-6 h-6 text-amber-400" />
                <h3 className="text-2xl font-bold text-white">Genesis Collection</h3>
                <Crown className="w-6 h-6 text-amber-400" />
              </div>
              <p className="text-center text-gray-400 mb-6">
                The first 5 AXIOM agents - Fully operational AI companions with voice features
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {GENESIS_AXIOMS.map((axiom) => (
                  <Link
                    key={axiom.number}
                    to={`/axiom-agent/${axiom.number}`}
                    className="glass-card p-4 border border-amber-500/30 hover:border-amber-400 transition-all group hover:scale-105"
                  >
                    <div className={`w-16 h-16 mx-auto rounded-full bg-gradient-to-br ${axiom.color} flex items-center justify-center text-3xl mb-3 group-hover:scale-110 transition-transform`}>
                      {axiom.avatar}
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-white text-sm">{axiom.name}</div>
                      <div className="text-amber-400 text-xs mt-1">{axiom.specialty}</div>
                      <div className="flex items-center justify-center gap-1 mt-2 text-gray-400 text-xs">
                        <span>Chat Now</span>
                        <ExternalLink className="w-3 h-3" />
                      </div>
                    </div>
                    <div className="mt-3 flex justify-center gap-2">
                      <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">Voice</span>
                      <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">Online</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-800 pt-8 mb-8">
              <h3 className="text-xl font-bold text-white text-center mb-6">Available for Minting</h3>
            </div>

            {/* AXIOM Grid */}
            <div className="grid grid-cols-5 md:grid-cols-10 gap-2 mb-8">
              {Array.from({ length: AXIOM_TOTAL }, (_, i) => i + 1).map((num) => {
                const isAvailable = axiomAvailable.includes(num);
                return (
                  <button
                    key={num}
                    onClick={() => isAvailable && openPurchaseModal('axiom', num)}
                    disabled={!isAvailable}
                    className={`aspect-square rounded-lg flex items-center justify-center text-sm font-bold transition-all ${
                      isAvailable
                        ? 'bg-gradient-to-br from-amber-500/20 to-amber-600/20 border border-amber-500/50 text-amber-400 hover:scale-110 hover:border-amber-400 cursor-pointer'
                        : 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
                    }`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gradient-to-br from-amber-500/20 to-amber-600/20 border border-amber-500/50"></div>
                <span className="text-gray-400">Available ({AXIOM_TOTAL - axiomMinted})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gray-800/50"></div>
                <span className="text-gray-400">Minted ({axiomMinted})</span>
              </div>
            </div>

            {/* AXIOM Benefits */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: '🎯', title: 'Exclusive Numbering', desc: 'Each AXIOM is uniquely numbered 1-300, making it a collectible asset' },
                { icon: '🧬', title: 'Dedicated AI Agent', desc: 'Your personal on-chain AI with persistent memory and learning' },
                { icon: '🎙️', title: 'Voice Integration', desc: 'Natural voice synthesis powered by Eleven Labs technology' },
              ].map((item, i) => (
                <div key={i} className="glass-card p-6 text-center">
                  <div className="text-4xl mb-4">{item.icon}</div>
                  <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-gray-400 text-sm">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My Agents Tab */}
        {!isLoading && activeTab === 'my-agents' && (
          <div>
            {!isAuthenticated ? (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">🔒</div>
                <h3 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h3>
                <p className="text-gray-400 mb-6">
                  Connect your wallet to view and interact with your RavenAI agents
                </p>
                <button className="btn-primary px-8 py-4">
                  Connect Wallet
                </button>
              </div>
            ) : myAgents.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">🦅</div>
                <h3 className="text-2xl font-bold text-white mb-2">No Agents Yet</h3>
                <p className="text-gray-400 mb-6">
                  You don't have any RavenAI agents. Get started with a demo or purchase your first agent!
                </p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => setActiveTab('demo')}
                    className="px-6 py-3 rounded-xl border border-gray-600 text-gray-300 hover:bg-gray-800"
                  >
                    Try Demo
                  </button>
                  <button
                    onClick={() => openPurchaseModal('axiom')}
                    className="btn-primary px-6 py-3"
                  >
                    Get AXIOM NFT
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Agent List */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-white mb-4">Your Agents ({myAgents.length})</h3>
                  {myAgents.map((agent) => (
                    <button
                      key={Number(agent.token_id)}
                      onClick={() => {
                        setActiveAgent(agent);
                        setAgentMessages([]);
                      }}
                      className={`w-full p-4 rounded-xl text-left transition-all ${
                        activeAgent?.token_id === agent.token_id
                          ? 'bg-amber-500/20 border border-amber-500'
                          : 'bg-gray-800/50 border border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                          🦅
                        </div>
                        <div>
                          <div className="font-bold text-white">{agent.config.name}</div>
                          <div className="text-sm text-gray-400">
                            {'AXIOM' in agent.agent_type 
                              ? `AXIOM #${agent.agent_type.AXIOM}` 
                              : 'Standard'}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex gap-4 text-xs text-gray-500">
                        <span>{Number(agent.total_memories)} memories</span>
                        <span>{Number(agent.total_interactions)} interactions</span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Active Agent Chat */}
                <div className="lg:col-span-2">
                  {activeAgent ? (
                    <ChatInterface
                      messages={agentMessages}
                      input={agentInput}
                      setInput={setAgentInput}
                      onSend={handleAgentSend}
                      isTyping={isAgentTyping}
                      title={activeAgent.config.name}
                      subtitle={`${'AXIOM' in activeAgent.agent_type ? `AXIOM #${activeAgent.agent_type.AXIOM}` : 'Standard'} • ${Number(activeAgent.total_memories)} memories`}
                      isAgent={true}
                    />
                  ) : (
                    <div className="glass-card p-8 text-center h-full flex items-center justify-center">
                      <div>
                        <Bot className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400">Select an agent to start chatting</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Purchase Modal */}
      {showPurchaseModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-lg w-full p-6" style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%)' }}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">
                {purchaseType === 'axiom' ? `Mint AXIOM #${selectedAxiom}` : 'Mint RavenAI Agent'}
              </h3>
              <button
                onClick={() => setShowPurchaseModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Token Selection */}
            <div className="mb-6">
              <label className="text-sm text-gray-400 mb-2 block">Payment Token</label>
              <div className="grid grid-cols-2 gap-2">
                {(purchaseType === 'axiom' ? [PAYMENT_TOKENS[1]] : PAYMENT_TOKENS).map((token) => (
                  <button
                    key={token.id}
                    onClick={() => setSelectedToken(token)}
                    className={`p-3 rounded-xl border transition-all ${
                      selectedToken.id === token.id
                        ? 'border-amber-500 bg-amber-500/20'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{token.icon}</span>
                      <div className="text-left">
                        <div className="text-white font-medium">{token.symbol}</div>
                        <div className="text-xs text-gray-400">{token.amountFor100USD}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Price Summary */}
            <div className="bg-gray-800/50 rounded-xl p-4 mb-6">
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">Price</span>
                <span className="text-white font-bold">
                  {purchaseType === 'axiom' ? '100,000 RAVEN' : `${selectedToken.amountFor100USD} ${selectedToken.symbol}`}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">USD Value</span>
                <span className="text-gray-400">$100.00</span>
              </div>
              {purchaseType === 'axiom' && (
                <div className="mt-2 pt-2 border-t border-gray-700">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">RAVEN Canister</span>
                    <span className="text-amber-400 text-xs">{RAVEN_TOKEN_CANISTER}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowPurchaseModal(false)}
                className="flex-1 py-3 rounded-xl border border-gray-600 text-gray-400 hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handlePurchase}
                disabled={isProcessing || !isAuthenticated}
                className="flex-1 btn-primary py-3"
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </span>
                ) : !isAuthenticated ? (
                  'Connect Wallet'
                ) : (
                  `Mint ${purchaseType === 'axiom' ? 'AXIOM' : 'Agent'}`
                )}
              </button>
            </div>

            {/* Wallet Info */}
            {isAuthenticated && principal && (
              <div className="mt-4 text-center text-sm text-gray-500">
                Connected: {String(principal).slice(0, 10)}...{String(principal).slice(-5)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RavenAIPage;
