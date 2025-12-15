/**
 * AXIOM NFT Page - Individual AI Agent NFT Experience
 * Beautiful, branded UI with personalized claim experience
 * Integrates with Plug, OISY wallets and ICRC-7/ICRC-37 standards
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Brain, 
  Sparkles, 
  Wallet, 
  MessageCircle, 
  Crown, 
  Shield, 
  Zap,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Settings,
  History,
  Star,
  Award,
  ChevronRight,
  ExternalLink,
  Copy,
  Check,
  Loader2,
  Heart,
  Share2,
  Upload,
  FileText,
  X,
  AlertCircle
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { ravenAICanisterService } from '../../services/ravenAICanisterService';
import { getICHost } from '../../services/canisterConfig';
// Import generated IDL factories for axiom canisters
import { idlFactory as axiom1Idl } from '../../declarations/axiom_1';
import { idlFactory as axiom2Idl } from '../../declarations/axiom_2';
import { idlFactory as axiom3Idl } from '../../declarations/axiom_3';
import { idlFactory as axiom4Idl } from '../../declarations/axiom_4';
import { idlFactory as axiom5Idl } from '../../declarations/axiom_5';

// AXIOM canister IDs
const AXIOM_CANISTERS: Record<number, string> = {
  1: '46odg-5iaaa-aaaao-a4xqa-cai',
  2: '4zpfs-qqaaa-aaaao-a4xqq-cai',
  3: '4ckzx-kiaaa-aaaao-a4xsa-cai',
  4: '4fl7d-hqaaa-aaaao-a4xsq-cai',
  5: '4miu7-ryaaa-aaaao-a4xta-cai',
};

// AXIOM personalities and themes
const AXIOM_THEMES: Record<number, {
  name: string;
  title: string;
  personality: string;
  specialization: string;
  gradient: string;
  accent: string;
  icon: React.ReactNode;
  bgPattern: string;
}> = {
  1: {
    name: 'AXIOM Genesis #1',
    title: 'The First Oracle',
    personality: 'Wise and analytical',
    specialization: 'Blockchain Expert',
    gradient: 'from-amber-500 via-orange-500 to-red-500',
    accent: 'amber',
    icon: <Crown className="w-8 h-8" />,
    bgPattern: 'radial-gradient(circle at 20% 80%, rgba(251,191,36,0.15) 0%, transparent 50%)',
  },
  2: {
    name: 'AXIOM Genesis #2',
    title: 'The Creative Mind',
    personality: 'Creative and visionary',
    specialization: 'NFT Art Expert',
    gradient: 'from-purple-500 via-pink-500 to-rose-500',
    accent: 'purple',
    icon: <Sparkles className="w-8 h-8" />,
    bgPattern: 'radial-gradient(circle at 80% 20%, rgba(168,85,247,0.15) 0%, transparent 50%)',
  },
  3: {
    name: 'AXIOM Genesis #3',
    title: 'The DeFi Sage',
    personality: 'Calculated and precise',
    specialization: 'DeFi Strategist',
    gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
    accent: 'emerald',
    icon: <Zap className="w-8 h-8" />,
    bgPattern: 'radial-gradient(circle at 50% 50%, rgba(16,185,129,0.15) 0%, transparent 50%)',
  },
  4: {
    name: 'AXIOM Genesis #4',
    title: 'The Tech Architect',
    personality: 'Technical and thorough',
    specialization: 'Smart Contract Developer',
    gradient: 'from-blue-500 via-indigo-500 to-violet-500',
    accent: 'blue',
    icon: <Shield className="w-8 h-8" />,
    bgPattern: 'radial-gradient(circle at 20% 20%, rgba(59,130,246,0.15) 0%, transparent 50%)',
  },
  5: {
    name: 'AXIOM Genesis #5',
    title: 'The Community Builder',
    personality: 'Friendly and engaging',
    specialization: 'Community Manager',
    gradient: 'from-rose-500 via-red-500 to-orange-500',
    accent: 'rose',
    icon: <Heart className="w-8 h-8" />,
    bgPattern: 'radial-gradient(circle at 80% 80%, rgba(244,63,94,0.15) 0%, transparent 50%)',
  },
};

interface AxiomMetadata {
  token_id: bigint;
  name: string;
  description: string;
  image_url: string;
  owner: Principal;
  personality: string;
  specialization: string;
  total_conversations: bigint;
  total_messages: bigint;
  last_active: bigint;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  voiceUrl?: string;
}

export const AxiomNFTPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Validate and parse token ID
  const tokenId = id ? (parseInt(id, 10) || 1) : 1;
  const validTokenId = (tokenId >= 1 && tokenId <= 5) ? tokenId : 1;
  
  // Redirect if invalid token ID
  useEffect(() => {
    if (tokenId !== validTokenId) {
      navigate(`/axiom/${validTokenId}`, { replace: true });
    }
  }, [tokenId, validTokenId, navigate]);
  
  const theme = AXIOM_THEMES[validTokenId] || AXIOM_THEMES[1];
  const canisterId = AXIOM_CANISTERS[validTokenId];
  
  const { isAuthenticated, principal, identity } = useAuthStore();
  
  const [metadata, setMetadata] = useState<AxiomMetadata | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [showClaimSuccess, setShowClaimSuccess] = useState(false);
  
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  
  // UI state
  const [activeTab, setActiveTab] = useState<'chat' | 'memories' | 'settings'>('chat');
  const [copied, setCopied] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTo, setTransferTo] = useState('');
  const [transferring, setTransferring] = useState(false);
  
  // Document upload state
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Get AXIOM IDL factory helper
  const getAxiomIdl = useCallback((canisterId: string) => {
    const idlMap: Record<string, any> = {
      '46odg-5iaaa-aaaao-a4xqa-cai': axiom1Idl,
      '4zpfs-qqaaa-aaaao-a4xqq-cai': axiom2Idl,
      '4ckzx-kiaaa-aaaao-a4xsa-cai': axiom3Idl,
      '4fl7d-hqaaa-aaaao-a4xsq-cai': axiom4Idl,
      '4miu7-ryaaa-aaaao-a4xta-cai': axiom5Idl,
    };
    return idlMap[canisterId] || axiom1Idl;
  }, []);
  
  // Fetch AXIOM metadata
  useEffect(() => {
    const fetchMetadata = async () => {
      if (!canisterId) {
        console.error('Invalid canister ID for token:', validTokenId);
        setError('Invalid AXIOM NFT ID');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        const host = getICHost();
        const agent = new HttpAgent({ host });
        
        // Only fetch root key in development
        if (host.includes('127.0.0.1') || host.includes('localhost')) {
          await agent.fetchRootKey();
        }
        
        // Create actor for the AXIOM canister using generated IDL
        const actor = Actor.createActor(
          getAxiomIdl(canisterId),
          { agent, canisterId: Principal.fromText(canisterId) }
        );
        
        const meta = await actor.get_metadata() as any;
        setMetadata(meta);
        
        if (isAuthenticated && principal) {
          try {
            const ownership = await actor.verify_ownership() as any;
            setIsOwner(ownership.is_owner || false);
          } catch (ownershipError) {
            console.warn('Could not verify ownership:', ownershipError);
            setIsOwner(false);
          }
        }
      } catch (error: any) {
        console.error('Failed to fetch AXIOM metadata:', error);
        setError(error.message || 'Failed to load AXIOM NFT. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMetadata();
  }, [canisterId, validTokenId, isAuthenticated, principal, getAxiomIdl]);
  
  // Handle transfer
  const handleTransfer = async () => {
    if (!transferTo.trim() || !isAuthenticated || !principal || !identity) return;
    
    try {
      const recipientPrincipal = Principal.fromText(transferTo.trim());
      setTransferring(true);
      
      const host = getICHost();
      const agent = new HttpAgent({ 
        host,
        identity: identity
      });
      
      if (host.includes('127.0.0.1') || host.includes('localhost')) {
        await agent.fetchRootKey();
      }
      
      const actor = Actor.createActor(
        getAxiomIdl(canisterId),
        { agent, canisterId: Principal.fromText(canisterId) }
      );
      
      const result = await actor.transfer(recipientPrincipal) as any;
      
      if ('Ok' in result) {
        setShowTransferModal(false);
        setTransferTo('');
        // Refresh metadata
        window.location.reload();
      } else {
        throw new Error(result.Err || 'Transfer failed');
      }
    } catch (error: any) {
      console.error('Transfer error:', error);
      alert(`Transfer failed: ${error.message}`);
    } finally {
      setTransferring(false);
    }
  };
  
  // Handle chat
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isSending) return;
    
    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsSending(true);
    
    try {
      const host = getICHost();
      const agent = new HttpAgent({ 
        host,
        identity: identity || undefined
      });
      
      if (host.includes('127.0.0.1') || host.includes('localhost')) {
        await agent.fetchRootKey();
      }
      
      const actor = Actor.createActor(
        getAxiomIdl(canisterId),
        { agent, canisterId: Principal.fromText(canisterId) }
      );
      
      const result = await actor.chat(inputMessage, []) as any;
      
      if ('Ok' in result) {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: result.Ok.message,
          timestamp: new Date(),
          voiceUrl: result.Ok.voice_url?.[0],
        };
        setMessages(prev => [...prev, assistantMessage]);
        
        // Auto-play voice if enabled
        if (voiceEnabled && result.Ok.voice_url?.[0]) {
          // Play audio
        }
      } else {
        throw new Error(result.Err || 'Chat failed');
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I apologize, I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsSending(false);
    }
  };

  const copyCanisterId = () => {
    navigator.clipboard.writeText(canisterId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-obsidian-950 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <Brain className={`w-16 h-16 text-${theme.accent}-500`} />
        </motion.div>
      </div>
    );
  }

  if (error && !metadata) {
    return (
      <div className="min-h-screen bg-obsidian-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Error Loading AXIOM NFT</h2>
          <p className="text-silver-400 mb-6">{error}</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg"
            >
              Retry
            </button>
            <Link
              to="/axiom-collection"
              className="px-6 py-2 bg-silver-500 hover:bg-silver-600 text-white rounded-lg"
            >
              View Collection
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-obsidian-950 relative overflow-hidden"
      style={{ background: theme.bgPattern }}
    >
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className={`absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br ${theme.gradient} opacity-5 rounded-full blur-3xl`}
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      </div>

      {/* Header */}
      <div className="relative z-10 pt-20 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <Link
            to="/axiom-collection"
            className="inline-flex items-center text-silver-400 hover:text-white mb-6 transition-colors"
          >
            <ChevronRight className="w-4 h-4 rotate-180 mr-2" />
            Back to Collection
          </Link>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4 mb-4"
              >
                <div className={`p-4 rounded-2xl bg-gradient-to-br ${theme.gradient} bg-opacity-20`}>
                  {theme.icon}
                </div>
                <div>
                  <h1 className="text-4xl font-display font-bold text-white mb-2">
                    {theme.name}
                  </h1>
                  <p className="text-silver-400">{theme.title}</p>
                </div>
              </motion.div>

              {metadata && (
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="px-3 py-1 bg-obsidian-800 rounded-full text-silver-300">
                    {metadata.personality}
                  </div>
                  <div className="px-3 py-1 bg-obsidian-800 rounded-full text-silver-300">
                    {metadata.specialization}
                  </div>
                  <div className="px-3 py-1 bg-obsidian-800 rounded-full text-silver-300">
                    Token #{metadata.token_id.toString()}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={copyCanisterId}
                className="px-4 py-2 bg-obsidian-800 hover:bg-obsidian-700 rounded-lg text-silver-300 text-sm flex items-center gap-2 transition-colors"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy Canister ID'}
              </button>
              
              {isOwner && (
                <button
                  onClick={() => setShowTransferModal(true)}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-white text-sm transition-colors"
                >
                  Transfer
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 px-4 sm:px-6 lg:px-8 pb-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - NFT Info */}
            <div className="lg:col-span-1">
              <div className="bg-obsidian-900 rounded-2xl p-6 border border-obsidian-800">
                {metadata && (
                  <>
                    <div className="aspect-square rounded-xl overflow-hidden mb-6 bg-obsidian-800">
                      {metadata.image_url ? (
                        <img
                          src={metadata.image_url}
                          alt={metadata.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Brain className={`w-24 h-24 text-${theme.accent}-500 opacity-50`} />
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm text-silver-400 mb-1">Description</h3>
                        <p className="text-white">{metadata.description}</p>
                      </div>

                      <div>
                        <h3 className="text-sm text-silver-400 mb-1">Owner</h3>
                        <p className="text-white font-mono text-sm break-all">
                          {metadata.owner.toText()}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-obsidian-800">
                        <div>
                          <p className="text-sm text-silver-400">Conversations</p>
                          <p className="text-2xl font-bold text-white">
                            {metadata.total_conversations.toString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-silver-400">Messages</p>
                          <p className="text-2xl font-bold text-white">
                            {metadata.total_messages.toString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right Column - Chat Interface */}
            <div className="lg:col-span-2">
              <div className="bg-obsidian-900 rounded-2xl border border-obsidian-800 overflow-hidden">
                {/* Tabs */}
                <div className="flex border-b border-obsidian-800">
                  <button
                    onClick={() => setActiveTab('chat')}
                    className={`flex-1 px-6 py-4 text-center transition-colors ${
                      activeTab === 'chat'
                        ? 'bg-obsidian-800 text-white border-b-2 border-amber-500'
                        : 'text-silver-400 hover:text-white'
                    }`}
                  >
                    <MessageCircle className="w-5 h-5 inline-block mr-2" />
                    Chat
                  </button>
                  <button
                    onClick={() => setActiveTab('memories')}
                    className={`flex-1 px-6 py-4 text-center transition-colors ${
                      activeTab === 'memories'
                        ? 'bg-obsidian-800 text-white border-b-2 border-amber-500'
                        : 'text-silver-400 hover:text-white'
                    }`}
                  >
                    <History className="w-5 h-5 inline-block mr-2" />
                    Memories
                  </button>
                  <button
                    onClick={() => setActiveTab('settings')}
                    className={`flex-1 px-6 py-4 text-center transition-colors ${
                      activeTab === 'settings'
                        ? 'bg-obsidian-800 text-white border-b-2 border-amber-500'
                        : 'text-silver-400 hover:text-white'
                    }`}
                  >
                    <Settings className="w-5 h-5 inline-block mr-2" />
                    Settings
                  </button>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                  {activeTab === 'chat' && (
                    <div className="flex flex-col h-[600px]">
                      {/* Messages */}
                      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
                        {messages.length === 0 ? (
                          <div className="text-center text-silver-400 py-12">
                            <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>Start a conversation with {theme.name}</p>
                            <p className="text-sm mt-2">{theme.personality}</p>
                          </div>
                        ) : (
                          messages.map((msg, idx) => (
                            <div
                              key={idx}
                              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[80%] rounded-lg p-4 ${
                                  msg.role === 'user'
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-obsidian-800 text-white'
                                }`}
                              >
                                <p>{msg.content}</p>
                                {msg.voiceUrl && (
                                  <audio src={msg.voiceUrl} controls className="mt-2 w-full" />
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Input */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={inputMessage}
                          onChange={(e) => setInputMessage(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                          placeholder="Type your message..."
                          className="flex-1 px-4 py-3 bg-obsidian-800 border border-obsidian-700 rounded-lg text-white placeholder-silver-500 focus:outline-none focus:border-amber-500"
                          disabled={isSending}
                        />
                        <button
                          onClick={handleSendMessage}
                          disabled={isSending || !inputMessage.trim()}
                          className="px-6 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-obsidian-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                        >
                          {isSending ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Send className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {activeTab === 'memories' && (
                    <div className="text-center text-silver-400 py-12">
                      <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Memory system coming soon</p>
                    </div>
                  )}

                  {activeTab === 'settings' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">Voice Responses</p>
                          <p className="text-sm text-silver-400">Enable voice synthesis for responses</p>
                        </div>
                        <button
                          onClick={() => setVoiceEnabled(!voiceEnabled)}
                          className={`w-12 h-6 rounded-full transition-colors ${
                            voiceEnabled ? 'bg-amber-500' : 'bg-obsidian-700'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 bg-white rounded-full transition-transform ${
                              voiceEnabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transfer Modal */}
      <AnimatePresence>
        {showTransferModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-obsidian-900 rounded-2xl p-6 max-w-md w-full border border-obsidian-800"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Transfer AXIOM NFT</h3>
                <button
                  onClick={() => setShowTransferModal(false)}
                  className="text-silver-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-silver-400 mb-2">
                    Recipient Principal ID
                  </label>
                  <input
                    type="text"
                    value={transferTo}
                    onChange={(e) => setTransferTo(e.target.value)}
                    placeholder="Enter principal ID..."
                    className="w-full px-4 py-3 bg-obsidian-800 border border-obsidian-700 rounded-lg text-white placeholder-silver-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setShowTransferModal(false)}
                    className="flex-1 px-4 py-3 bg-obsidian-800 hover:bg-obsidian-700 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleTransfer}
                    disabled={transferring || !transferTo.trim()}
                    className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 disabled:bg-obsidian-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    {transferring ? 'Transferring...' : 'Transfer'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
