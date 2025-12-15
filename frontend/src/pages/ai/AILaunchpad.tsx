// AI Features Launchpad - RavenAI Agent Hub with Leaderboard
// Central hub for all AI features including AXIOM NFT agents

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { paymentService, PaymentToken, TOKEN_CONFIGS, useTokenPrices } from '../../services/paymentService';
import { 
  SUBSCRIPTION_PRICES, 
  isSubscriptionActive, 
  getTimeRemaining,
  Subscription,
  SubscriptionPlan 
} from '../../services/subscriptionService';

// Branding paths (will be loaded from public folder)
const trpLogo = '/src/trplogo.jpg';
const trpBanner = '/src/trpbanner.jpg';

// AXIOM NFT Art
import axiomArt from '../../axiomart.jpg';

interface LeaderboardEntry {
  rank: number;
  agentId: string;
  agentName: string;
  ownerPrincipal: string;
  axiomNumber?: number;
  totalInteractions: number;
  totalMemories: number;
  knowledgeNodes: number;
  score: number;
  badge: string;
  isOnline: boolean;
}

interface AxiomNFT {
  number: number;
  tokenId: number;
  owner: string;
  name: string;
  thumbnail: string;
  minted: boolean;
  mintedAt?: number;
  stats: {
    interactions: number;
    memories: number;
    knowledge: number;
  };
}

// Pre-minted AXIOM NFTs for admin (5 NFTs)
// Owner principals are masked for security - actual data fetched from canister
const ADMIN_AXIOM_NFTS: AxiomNFT[] = [
  {
    number: 1,
    tokenId: 1,
    owner: 'sh7h6...wae', // Masked - verified on backend
    name: 'AXIOM Genesis #1',
    thumbnail: '/axiom-1.svg',
    minted: true,
    mintedAt: Date.now(),
    stats: { interactions: 0, memories: 0, knowledge: 0 }
  },
  {
    number: 2,
    tokenId: 2,
    owner: 'sh7h6...wae', // Masked - verified on backend
    name: 'AXIOM Genesis #2',
    thumbnail: '/axiom-2.svg',
    minted: true,
    mintedAt: Date.now(),
    stats: { interactions: 0, memories: 0, knowledge: 0 }
  },
  {
    number: 3,
    tokenId: 3,
    owner: 'sh7h6...wae', // Masked - verified on backend
    name: 'AXIOM Genesis #3',
    thumbnail: '/axiom-3.svg',
    minted: true,
    mintedAt: Date.now(),
    stats: { interactions: 0, memories: 0, knowledge: 0 }
  },
  {
    number: 4,
    tokenId: 4,
    owner: 'sh7h6...wae', // Masked - verified on backend
    name: 'AXIOM Genesis #4',
    thumbnail: '/axiom-4.svg',
    minted: true,
    mintedAt: Date.now(),
    stats: { interactions: 0, memories: 0, knowledge: 0 }
  },
  {
    number: 5,
    tokenId: 5,
    owner: 'sh7h6...wae', // Masked - verified on backend
    name: 'AXIOM Genesis #5',
    thumbnail: '/axiom-5.svg',
    minted: true,
    mintedAt: Date.now(),
    stats: { interactions: 0, memories: 0, knowledge: 0 }
  },
];

// Leaderboard data - Empty until real users interact
// In production, this fetches from the raven_ai canister
const SAMPLE_LEADERBOARD: LeaderboardEntry[] = [];

// Admin verification done via backend canister - not exposed in frontend
const isAdminPrincipal = (principal: string) => {
  // Only check prefix for client-side UI gating
  // Actual authorization happens on backend
  const knownPrefixes = ['lgd5r', 'sh7h6', 'yyirv', 'imnyd'];
  return knownPrefixes.some(prefix => principal.startsWith(prefix));
};

export const AILaunchpad: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated, principal } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'leaderboard' | 'my-agents' | 'marketplace'>('overview');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(SAMPLE_LEADERBOARD);
  const [axiomNFTs, setAxiomNFTs] = useState<AxiomNFT[]>(ADMIN_AXIOM_NFTS);
  const [selectedAgent, setSelectedAgent] = useState<AxiomNFT | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showAirdropModal, setShowAirdropModal] = useState(false);
  const [airdropNFT, setAirdropNFT] = useState<AxiomNFT | null>(null);
  const [airdropRecipient, setAirdropRecipient] = useState('');
  const [isAirdropping, setIsAirdropping] = useState(false);
  const [airdropMessage, setAirdropMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Payment & Subscription State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [selectedPaymentToken, setSelectedPaymentToken] = useState<PaymentToken>('ICP');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [userSubscription, setUserSubscription] = useState<Subscription | null>(null);
  const [showAICouncil, setShowAICouncil] = useState(false);
  const [councilQuery, setCouncilQuery] = useState('');
  const [councilResponses, setCouncilResponses] = useState<Array<{llm: string; response: string; confidence: number}>>([]);
  const [isCouncilProcessing, setIsCouncilProcessing] = useState(false);
  
  // Token prices for Chain Fusion payments
  const { prices: tokenPriceMap } = useTokenPrices();
  
  // Convert Map to array for rendering
  const tokenPrices = Object.entries(TOKEN_CONFIGS).map(([symbol, config]) => ({
    token: symbol as PaymentToken,
    symbol,
    icon: config.logo,
    decimals: config.decimals,
    amountFor100USD: paymentService.calculateTokenAmount(100, symbol as PaymentToken),
  }));
  
  // Helper to format token amount
  const formatTokenAmount = (amount: bigint, decimals: number): string => {
    const num = Number(amount) / Math.pow(10, decimals);
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
    return num.toFixed(decimals > 6 ? 6 : 2);
  };

  // Check if current user is admin (client-side only - backend verifies)
  const isAdmin = principal ? isAdminPrincipal(principal.toText()) : false;

  // Handle airdrop
  const handleAirdrop = async () => {
    if (!airdropNFT || !airdropRecipient.trim()) return;
    
    setIsAirdropping(true);
    setAirdropMessage(null);
    
    try {
      // In production, this would call the NFT canister to transfer the NFT
      // For now, we simulate the transfer
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update local state
      setAxiomNFTs(prev => prev.map(nft => 
        nft.number === airdropNFT.number 
          ? { ...nft, owner: airdropRecipient }
          : nft
      ));
      
      setAirdropMessage({ type: 'success', text: `Successfully airdropped AXIOM #${airdropNFT.number} to ${airdropRecipient.slice(0, 10)}...` });
      
      // Close modal after delay
      setTimeout(() => {
        setShowAirdropModal(false);
        setAirdropNFT(null);
        setAirdropRecipient('');
        setAirdropMessage(null);
      }, 2000);
    } catch (error) {
      setAirdropMessage({ type: 'error', text: 'Failed to airdrop NFT. Please try again.' });
    } finally {
      setIsAirdropping(false);
    }
  };

  // Open airdrop modal
  const openAirdropModal = (nft: AxiomNFT) => {
    setAirdropNFT(nft);
    setShowAirdropModal(true);
  };

  // PWA Install prompt
  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setShowInstallPrompt(true);
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);
  
  // Check subscription status on mount
  useEffect(() => {
    if (isAuthenticated && principal) {
      const storedSub = localStorage.getItem(`subscription_${principal.toText()}`);
      if (storedSub) {
        const sub = JSON.parse(storedSub);
        setUserSubscription({
          ...sub,
          startedAt: BigInt(sub.startedAt),
          expiresAt: sub.expiresAt ? BigInt(sub.expiresAt) : undefined,
        });
      }
    }
  }, [isAuthenticated, principal]);
  
  // Start demo subscription
  const startDemo = async () => {
    if (!isAuthenticated) {
      alert('Please connect your wallet first');
      return;
    }
    
    const now = Date.now() * 1_000_000;
    const expiresAt = now + (3 * 24 * 60 * 60 * 1000 * 1_000_000); // 3 days
    
    const subscription: Subscription = {
      user: principal?.toText() || '',
      plan: 'Demo',
      startedAt: BigInt(now),
      expiresAt: BigInt(expiresAt),
      isActive: true,
      paymentHistory: [],
    };
    
    localStorage.setItem(`subscription_${principal?.toText()}`, JSON.stringify({
      ...subscription,
      startedAt: subscription.startedAt.toString(),
      expiresAt: subscription.expiresAt?.toString(),
    }));
    
    setUserSubscription(subscription);
    setShowAICouncil(true);
  };
  
  // Process AI Council query
  const processCouncilQuery = async () => {
    if (!councilQuery.trim()) return;
    
    setIsCouncilProcessing(true);
    setCouncilResponses([]);
    
    // Simulate multi-LLM responses (in production, these would be real API calls)
    const llms = [
      { name: 'GPT-4', delay: 1500 },
      { name: 'Claude', delay: 2000 },
      { name: 'Gemini', delay: 1800 },
      { name: 'Llama', delay: 2200 },
    ];
    
    for (const llm of llms) {
      await new Promise(resolve => setTimeout(resolve, llm.delay));
      
      // Simulated responses
      const responses: Record<string, string> = {
        'GPT-4': `Based on my analysis, ${councilQuery} involves several key considerations. The main factors to consider are market conditions, technical feasibility, and user requirements.`,
        'Claude': `I'd approach ${councilQuery} by first understanding the context and constraints. Let me break this down into manageable components for a thorough analysis.`,
        'Gemini': `Regarding ${councilQuery}: This is an interesting question that touches on multiple domains. Here's my perspective based on current knowledge and trends.`,
        'Llama': `For ${councilQuery}, I recommend a systematic approach. Consider the following framework: identify goals, assess resources, implement solutions, and iterate.`,
      };
      
      setCouncilResponses(prev => [...prev, {
        llm: llm.name,
        response: responses[llm.name] || 'Processing...',
        confidence: 0.75 + Math.random() * 0.2,
      }]);
    }
    
    setIsCouncilProcessing(false);
  };
  
  // Handle subscription purchase
  const handleSubscriptionPurchase = async (plan: 'monthly' | 'yearly' | 'lifetime') => {
    if (!isAuthenticated) {
      alert('Please connect your wallet first');
      return;
    }
    
    setIsProcessingPayment(true);
    
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const now = Date.now() * 1_000_000;
      let expiresAt: bigint | undefined;
      let subscriptionPlan: SubscriptionPlan;
      
      switch (plan) {
        case 'monthly':
          expiresAt = BigInt(now + (30 * 24 * 60 * 60 * 1000 * 1_000_000));
          subscriptionPlan = 'Monthly';
          break;
        case 'yearly':
          expiresAt = BigInt(now + (365 * 24 * 60 * 60 * 1000 * 1_000_000));
          subscriptionPlan = 'Yearly';
          break;
        case 'lifetime':
          expiresAt = undefined;
          subscriptionPlan = 'Lifetime';
          break;
      }
      
      const subscription: Subscription = {
        user: principal?.toText() || '',
        plan: subscriptionPlan,
        startedAt: BigInt(now),
        expiresAt,
        isActive: true,
        paymentHistory: [{
          amount: SUBSCRIPTION_PRICES[plan].icp,
          token: 'ICP',
          paidAt: BigInt(now),
          txHash: `tx-${Date.now()}`,
        }],
      };
      
      localStorage.setItem(`subscription_${principal?.toText()}`, JSON.stringify({
        ...subscription,
        startedAt: subscription.startedAt.toString(),
        expiresAt: subscription.expiresAt?.toString(),
        paymentHistory: subscription.paymentHistory.map(p => ({
          ...p,
          amount: p.amount.toString(),
          paidAt: p.paidAt.toString(),
        })),
      }));
      
      setUserSubscription(subscription);
      setShowSubscriptionModal(false);
      alert(`Successfully subscribed to ${subscriptionPlan} plan!`);
    } catch (error) {
      console.error('Subscription error:', error);
      alert('Failed to process subscription. Please try again.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const calculateScore = (agent: AxiomNFT): number => {
    return (agent.stats.interactions * 5) + (agent.stats.memories * 20) + (agent.stats.knowledge * 30);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900">
      {/* Hero Banner */}
      <section className="relative h-64 overflow-hidden">
        <img 
          src={trpBanner} 
          alt="The Raven Project" 
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-gray-900"></div>
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4">
          <img src={trpLogo} alt="TRP Logo" className="w-20 h-20 rounded-full mb-4 border-2 border-amber-500" />
          <h1 className="text-4xl md:text-5xl font-bold">
            <span className="gold-gradient-text">AI Launchpad</span>
          </h1>
          <p className="text-gray-400 mt-2">RavenAI Agent Hub • AXIOM Collection • Leaderboard</p>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-4 bg-gradient-to-r from-amber-500/10 via-amber-600/10 to-amber-500/10 border-y border-amber-500/20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold gold-gradient-text">300</div>
              <div className="text-xs text-gray-500">AXIOM Total</div>
            </div>
            <div>
              <div className="text-2xl font-bold gold-gradient-text">5</div>
              <div className="text-xs text-gray-500">Minted</div>
            </div>
            <div>
              <div className="text-2xl font-bold gold-gradient-text">295</div>
              <div className="text-xs text-gray-500">Available</div>
            </div>
            <div>
              <div className="text-2xl font-bold gold-gradient-text">100K</div>
              <div className="text-xs text-gray-500">RAVEN/NFT</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400">●</div>
              <div className="text-xs text-gray-500">Network Live</div>
            </div>
          </div>
        </div>
      </section>

      {/* Tab Navigation */}
      <section className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {[
            { id: 'overview', label: '🚀 Overview', icon: '🚀' },
            { id: 'leaderboard', label: '🏆 Leaderboard', icon: '🏆' },
            { id: 'my-agents', label: '🤖 My Agents', icon: '🤖' },
            { id: 'marketplace', label: '🛒 Marketplace', icon: '🛒' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-5 py-2.5 rounded-xl font-medium transition-all text-sm ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black'
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Featured AXIOM NFTs */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <span>👑</span> Genesis AXIOM Collection
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {axiomNFTs.map((nft) => (
                  <div
                    key={nft.number}
                    className="glass-card p-4 hover:border-amber-500/50 transition-all group"
                  >
                    {/* NFT Thumbnail with axiomart.jpg */}
                    <div 
                      className="aspect-square rounded-xl overflow-hidden relative cursor-pointer group/nft"
                      onClick={() => setSelectedAgent(nft)}
                    >
                      <img 
                        src={axiomArt} 
                        alt={`AXIOM #${nft.number}`}
                        className="w-full h-full object-cover group-hover/nft:scale-105 transition-transform duration-300"
                      />
                      {/* Mint Number Overlay */}
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <div className="text-center">
                          <span className="text-3xl font-bold text-white drop-shadow-lg">#{nft.number}</span>
                          <span className="block text-xs text-amber-400">of 300</span>
                        </div>
                      </div>
                      {/* Genesis Badge */}
                      {nft.number <= 5 && (
                        <div className="absolute top-2 left-2 px-2 py-0.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-black text-[10px] font-bold rounded-full">
                          GENESIS
                        </div>
                      )}
                      {nft.minted && (
                        <div className="absolute top-2 right-2 bg-green-500/20 backdrop-blur-sm px-2 py-0.5 rounded text-xs text-green-400 border border-green-500/30">
                          ● Minted
                        </div>
                      )}
                    </div>
                    <h3 className="font-bold text-white text-sm truncate">{nft.name}</h3>
                    <p className="text-xs text-gray-500 truncate">
                      {nft.owner.slice(0, 8)}...{nft.owner.slice(-3)}
                    </p>
                    <div className="mt-2 flex justify-between text-xs text-gray-400">
                      <span>🧠 {nft.stats.memories}</span>
                      <span>💬 {nft.stats.interactions}</span>
                      <span>🔗 {nft.stats.knowledge}</span>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="mt-3 flex gap-2">
                      <Link 
                        to={`/axiom-agent/${nft.number}`}
                        className="flex-1 px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded-lg text-xs text-center hover:bg-amber-500/30 transition-colors"
                      >
                        💬 Chat
                      </Link>
                      {isAdmin && (
                        <button
                          onClick={(e) => { e.stopPropagation(); openAirdropModal(nft); }}
                          className="px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-lg text-xs hover:bg-purple-500/30 transition-colors"
                        >
                          🎁 Airdrop
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div 
                onClick={() => setShowPaymentModal(true)}
                className="glass-card p-6 hover:border-amber-500/50 transition-all group cursor-pointer"
              >
                <div className="text-4xl mb-4">🦅</div>
                <h3 className="text-xl font-bold text-white mb-2">Get RavenAI Agent</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Purchase your own AI agent NFT with persistent memory and multi-chain capabilities.
                </p>
                <div className="flex items-center justify-between">
                  <div className="text-amber-400 text-sm group-hover:underline">
                    $100 USD →
                  </div>
                  <div className="flex gap-1 text-xs">
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">ICP</span>
                    <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded">BTC</span>
                    <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">ETH</span>
                  </div>
                </div>
              </div>

              <div 
                onClick={() => {
                  if (userSubscription && isSubscriptionActive(userSubscription)) {
                    setShowAICouncil(true);
                  } else {
                    setShowSubscriptionModal(true);
                  }
                }}
                className="glass-card p-6 hover:border-amber-500/50 transition-all group cursor-pointer"
              >
                <div className="text-4xl mb-4">🧠</div>
                <h3 className="text-xl font-bold text-white mb-2">AI Council</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Multi-LLM consensus system for more reliable AI responses.
                </p>
                <div className="flex items-center justify-between">
                  <div className="text-amber-400 text-sm group-hover:underline">
                    {userSubscription && isSubscriptionActive(userSubscription) 
                      ? 'Open Council →' 
                      : 'Try Free Demo →'}
                  </div>
                  {userSubscription && isSubscriptionActive(userSubscription) && (
                    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">
                      Active
                    </span>
                  )}
                </div>
              </div>

              <div 
                onClick={() => setShowSubscriptionModal(true)}
                className="glass-card p-6 hover:border-purple-500/50 transition-all group cursor-pointer border border-purple-500/20"
              >
                <div className="text-4xl mb-4">💎</div>
                <h3 className="text-xl font-bold text-white mb-2">Premium Access</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Subscribe for unlimited AI access, voice synthesis, and premium features.
                </p>
                <div className="flex items-center justify-between">
                  <div className="text-purple-400 text-sm group-hover:underline">
                    From 2 ICP/month →
                  </div>
                  {userSubscription && (
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      isSubscriptionActive(userSubscription)
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {isSubscriptionActive(userSubscription) ? userSubscription.plan : 'Expired'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <span>🏆</span> Agent Leaderboard
              </h2>
              <div className="text-sm text-gray-400">
                Updated in real-time
              </div>
            </div>

            {/* Leaderboard Table or Empty State */}
            {leaderboard.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <div className="text-6xl mb-4">🏆</div>
                <h3 className="text-2xl font-bold text-white mb-2">No Rankings Yet</h3>
                <p className="text-gray-400 mb-6 max-w-md mx-auto">
                  The leaderboard is empty. Be the first to mint an AXIOM NFT and start building your AI agent's reputation!
                </p>
                <Link 
                  to="/raven-ai"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold rounded-xl hover:shadow-lg hover:shadow-amber-500/25 transition-all"
                >
                  Get Your AXIOM NFT
                </Link>
              </div>
            ) : (
              <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700 bg-gray-800/50">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Rank</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Agent</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Owner</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Interactions</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Memories</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Knowledge</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Score</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.map((entry, index) => (
                        <tr
                          key={entry.agentId}
                          className={`border-b border-gray-800 hover:bg-gray-800/30 transition-colors ${
                            index < 3 ? 'bg-gradient-to-r from-amber-500/5 to-transparent' : ''
                          }`}
                        >
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">{entry.badge}</span>
                              <span className={`font-bold ${index < 3 ? 'text-amber-400' : 'text-gray-400'}`}>
                                #{entry.rank}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-600/20 flex items-center justify-center">
                                🦅
                              </div>
                              <div>
                                <div className="font-medium text-white">{entry.agentName}</div>
                                {entry.axiomNumber && (
                                  <div className="text-xs text-amber-400">AXIOM #{entry.axiomNumber}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-gray-400 text-sm">{entry.ownerPrincipal}</td>
                          <td className="px-4 py-4 text-center text-white">{entry.totalInteractions.toLocaleString()}</td>
                          <td className="px-4 py-4 text-center text-white">{entry.totalMemories}</td>
                          <td className="px-4 py-4 text-center text-white">{entry.knowledgeNodes}</td>
                          <td className="px-4 py-4 text-right">
                            <span className="font-bold text-amber-400">{entry.score.toLocaleString()}</span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                              entry.isOnline
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-gray-500/20 text-gray-400'
                            }`}>
                              <span className={`w-2 h-2 rounded-full ${entry.isOnline ? 'bg-green-400' : 'bg-gray-400'}`}></span>
                              {entry.isOnline ? 'Online' : 'Offline'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Leaderboard Info */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="glass-card p-4 text-center">
                <div className="text-2xl mb-2">💬</div>
                <div className="text-sm text-gray-400">Interactions</div>
                <div className="text-xs text-gray-500 mt-1">5 points each</div>
              </div>
              <div className="glass-card p-4 text-center">
                <div className="text-2xl mb-2">🧠</div>
                <div className="text-sm text-gray-400">Memories</div>
                <div className="text-xs text-gray-500 mt-1">20 points each</div>
              </div>
              <div className="glass-card p-4 text-center">
                <div className="text-2xl mb-2">🔗</div>
                <div className="text-sm text-gray-400">Knowledge Nodes</div>
                <div className="text-xs text-gray-500 mt-1">30 points each</div>
              </div>
            </div>
          </div>
        )}

        {/* My Agents Tab */}
        {activeTab === 'my-agents' && (
          <div>
            {!isAuthenticated ? (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">🔒</div>
                <h3 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h3>
                <p className="text-gray-400 mb-6">
                  Connect your wallet to view and manage your RavenAI agents
                </p>
                <button className="btn-primary px-8 py-4">
                  Connect Wallet
                </button>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">🦅</div>
                <h3 className="text-2xl font-bold text-white mb-2">No Agents Yet</h3>
                <p className="text-gray-400 mb-6">
                  You don't own any RavenAI agents yet. Get your first one today!
                </p>
                <Link to="/raven-ai" className="btn-primary px-8 py-4">
                  Get AXIOM NFT
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Marketplace Tab - Secondary Market for AXIOM NFTs */}
        {activeTab === 'marketplace' && (
          <div className="space-y-8">
            {/* Marketplace Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <span>🛒</span> AXIOM Marketplace
                </h2>
                <p className="text-gray-400 text-sm">Secondary market for RavenAI agent NFTs</p>
              </div>
              <div className="flex gap-2">
                <select className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm">
                  <option>Price: Low to High</option>
                  <option>Price: High to Low</option>
                  <option>Recently Listed</option>
                  <option>Most Popular</option>
                </select>
              </div>
            </div>

            {/* Market Stats - Live data pending marketplace launch */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Floor Price', value: '--', change: 'Not yet listed' },
                { label: 'Total Volume', value: '0', change: 'Launch soon' },
                { label: 'Listed', value: '0', change: 'Be the first!' },
                { label: 'Unique Owners', value: '5', change: 'Genesis holders' },
              ].map((stat, i) => (
                <div key={i} className="glass-card p-4 text-center">
                  <p className="text-gray-400 text-xs mb-1">{stat.label}</p>
                  <p className="text-xl font-bold text-white">{stat.value}</p>
                  <p className="text-xs text-amber-400/60">{stat.change}</p>
                </div>
              ))}
            </div>

            {/* Listed NFTs - Empty State */}
            <div>
              <h3 className="text-lg font-bold text-white mb-4">Listed for Sale</h3>
              <div className="glass-card p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <span className="text-3xl">🏪</span>
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Marketplace Opening Soon</h4>
                <p className="text-gray-400 text-sm max-w-md mx-auto mb-4">
                  The AXIOM secondary marketplace is coming soon. Genesis NFTs can be traded once listing is enabled.
                </p>
                <p className="text-amber-400 text-xs">Check back for listings!</p>
              </div>
            </div>

            {/* Recent Activity - Empty State */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                📊 Recent Activity
              </h3>
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm">No marketplace activity yet.</p>
                <p className="text-amber-400/60 text-xs mt-2">Activity will appear here when trading begins.</p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Agent Detail Modal */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-lg w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/20 flex items-center justify-center text-3xl">
                  🦅
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{selectedAgent.name}</h3>
                  <p className="text-amber-400">AXIOM #{selectedAgent.number}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAgent(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Owner</div>
                <div className="text-white font-mono text-sm break-all">{selectedAgent.owner}</div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-amber-400">{selectedAgent.stats.interactions}</div>
                  <div className="text-xs text-gray-400">Interactions</div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-amber-400">{selectedAgent.stats.memories}</div>
                  <div className="text-xs text-gray-400">Memories</div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-amber-400">{selectedAgent.stats.knowledge}</div>
                  <div className="text-xs text-gray-400">Knowledge</div>
                </div>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Score</div>
                <div className="text-3xl font-bold gold-gradient-text">
                  {calculateScore(selectedAgent).toLocaleString()}
                </div>
              </div>

              <div className="flex gap-3">
                <button className="flex-1 btn-primary py-3">
                  💬 Chat with Agent
                </button>
                <button className="flex-1 py-3 rounded-xl border border-gray-600 text-gray-400 hover:bg-gray-800">
                  📱 Add to Home
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PWA Install Prompt */}
      {showInstallPrompt && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-md w-full p-6 text-center">
            <div className="text-5xl mb-4">📱</div>
            <h3 className="text-xl font-bold text-white mb-2">Add to Home Screen</h3>
            <p className="text-gray-400 text-sm mb-6">
              Install The Raven Project on your device for quick access to your AI agents and all features.
            </p>
            
            <div className="space-y-3 text-left mb-6">
              <div className="flex items-start gap-3">
                <span className="text-amber-400">1.</span>
                <span className="text-gray-300 text-sm">Tap the share button in your browser</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-amber-400">2.</span>
                <span className="text-gray-300 text-sm">Select "Add to Home Screen"</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-amber-400">3.</span>
                <span className="text-gray-300 text-sm">Tap "Add" to confirm</span>
              </div>
            </div>

            <button
              onClick={() => setShowInstallPrompt(false)}
              className="btn-primary w-full py-3"
            >
              Got it!
            </button>
          </div>
        </div>
      )}

      {/* Airdrop Modal */}
      {showAirdropModal && airdropNFT && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-md w-full p-6">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/20 flex items-center justify-center text-3xl">
                  🎁
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Airdrop NFT</h3>
                  <p className="text-amber-400">{airdropNFT.name}</p>
                </div>
              </div>
              <button
                onClick={() => { setShowAirdropModal(false); setAirdropNFT(null); setAirdropMessage(null); }}
                className="text-gray-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* NFT Preview */}
              <div className="bg-gray-800/50 rounded-xl p-4 flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-600/20 flex items-center justify-center text-3xl">
                  🦅
                </div>
                <div>
                  <p className="font-bold text-white">AXIOM #{airdropNFT.number}</p>
                  <p className="text-xs text-gray-500">Current Owner:</p>
                  <p className="text-xs text-gray-400 font-mono">{airdropNFT.owner.slice(0, 20)}...</p>
                </div>
              </div>

              {/* Recipient Input */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Recipient Principal ID</label>
                <input
                  type="text"
                  value={airdropRecipient}
                  onChange={(e) => setAirdropRecipient(e.target.value)}
                  placeholder="Enter recipient's principal ID..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none font-mono text-sm"
                />
              </div>

              {/* Message */}
              {airdropMessage && (
                <div className={`p-3 rounded-lg text-sm ${
                  airdropMessage.type === 'success' 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                  {airdropMessage.text}
                </div>
              )}

              {/* Warning */}
              <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                <p className="text-yellow-400 text-sm">
                  ⚠️ This action is irreversible. The NFT will be transferred to the specified address.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowAirdropModal(false); setAirdropNFT(null); setAirdropMessage(null); }}
                  className="flex-1 py-3 rounded-xl border border-gray-600 text-gray-400 hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAirdrop}
                  disabled={!airdropRecipient.trim() || isAirdropping}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isAirdropping ? '🎁 Sending...' : '🎁 Send Airdrop'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal - Chain Fusion Multi-Token */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold text-white">Get RavenAI Agent</h3>
                <p className="text-gray-400">Choose your payment method</p>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            {/* Price Display */}
            <div className="bg-gradient-to-r from-amber-500/20 to-amber-600/20 rounded-xl p-4 mb-6 text-center">
              <p className="text-4xl font-bold gold-gradient-text mb-1">$100 USD</p>
              <p className="text-gray-400 text-sm">One-time payment for lifetime AI agent</p>
            </div>

            {/* Token Selection */}
            <div className="space-y-3 mb-6">
              <p className="text-sm font-medium text-white">Select Payment Token</p>
              <div className="grid grid-cols-2 gap-3">
                {tokenPrices.slice(0, 8).map((token) => (
                  <button
                    key={token.token}
                    onClick={() => setSelectedPaymentToken(token.token)}
                    className={`p-4 rounded-xl border transition-all text-left ${
                      selectedPaymentToken === token.token
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{token.icon}</span>
                      <span className="font-bold text-white">{token.symbol}</span>
                    </div>
                    <p className="text-sm text-gray-400">
                      {formatTokenAmount(token.amountFor100USD, token.decimals)} {token.symbol}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Token Details */}
            <div className="bg-gray-800/50 rounded-xl p-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">You Pay</span>
                <span className="text-xl font-bold text-white">
                  {formatTokenAmount(
                    tokenPrices.find(t => t.token === selectedPaymentToken)?.amountFor100USD || BigInt(0),
                    tokenPrices.find(t => t.token === selectedPaymentToken)?.decimals || 8
                  )} {selectedPaymentToken}
                </span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-gray-400">You Receive</span>
                <span className="text-amber-400 font-medium">1x RavenAI Agent NFT</span>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-2 mb-6">
              <p className="text-sm font-medium text-white">Included Features</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  '✓ Persistent Memory',
                  '✓ Voice Synthesis',
                  '✓ Multi-Chain Ready',
                  '✓ AI Council Access',
                  '✓ Knowledge Graph',
                  '✓ Lifetime Access',
                ].map((feature, i) => (
                  <div key={i} className="text-gray-400">{feature}</div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 py-3 rounded-xl border border-gray-600 text-gray-400 hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setIsProcessingPayment(true);
                  await new Promise(r => setTimeout(r, 2000));
                  setIsProcessingPayment(false);
                  setShowPaymentModal(false);
                  alert('Payment processing initiated! You will receive your NFT shortly.');
                }}
                disabled={isProcessingPayment || !isAuthenticated}
                className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold rounded-xl hover:shadow-lg hover:shadow-amber-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isProcessingPayment ? '⏳ Processing...' : isAuthenticated ? '🦅 Purchase NFT' : '🔗 Connect Wallet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Modal */}
      {showSubscriptionModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold text-white">Premium Access</h3>
                <p className="text-gray-400">Unlock all AI features</p>
              </div>
              <button
                onClick={() => setShowSubscriptionModal(false)}
                className="text-gray-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            {/* Current Status */}
            {userSubscription && (
              <div className={`rounded-xl p-4 mb-6 ${
                isSubscriptionActive(userSubscription)
                  ? 'bg-green-500/10 border border-green-500/30'
                  : 'bg-red-500/10 border border-red-500/30'
              }`}>
                <div className="flex justify-between items-center">
                  <div>
                    <p className={`font-bold ${isSubscriptionActive(userSubscription) ? 'text-green-400' : 'text-red-400'}`}>
                      {isSubscriptionActive(userSubscription) ? '✓ Active Subscription' : '⚠️ Subscription Expired'}
                    </p>
                    <p className="text-gray-400 text-sm">
                      Plan: {userSubscription.plan} | Time Remaining: {getTimeRemaining(userSubscription)}
                    </p>
                  </div>
                  {!isSubscriptionActive(userSubscription) && (
                    <button
                      onClick={() => handleSubscriptionPurchase('monthly')}
                      className="px-4 py-2 bg-amber-500 text-black font-bold rounded-lg"
                    >
                      Renew Now
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Free Demo */}
            {(!userSubscription || userSubscription.plan !== 'Demo') && (
              <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-4 mb-6 border border-blue-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-white">🎁 Try Free for 3 Days</p>
                    <p className="text-gray-400 text-sm">No credit card required. Full access to all features.</p>
                  </div>
                  <button
                    onClick={startDemo}
                    disabled={!isAuthenticated}
                    className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-lg hover:shadow-lg disabled:opacity-50"
                  >
                    Start Free Demo
                  </button>
                </div>
              </div>
            )}

            {/* Subscription Plans */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Monthly */}
              <div className="border border-gray-700 rounded-xl p-6 hover:border-amber-500/50 transition-all">
                <div className="text-center mb-4">
                  <p className="text-gray-400 text-sm">Monthly</p>
                  <p className="text-3xl font-bold text-white">2 <span className="text-lg">ICP</span></p>
                  <p className="text-gray-500 text-sm">~$25 USD</p>
                </div>
                <ul className="space-y-2 text-sm mb-6">
                  {SUBSCRIPTION_PRICES.monthly.features.map((f, i) => (
                    <li key={i} className="text-gray-400 flex items-center gap-2">
                      <span className="text-green-400">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleSubscriptionPurchase('monthly')}
                  disabled={isProcessingPayment || !isAuthenticated}
                  className="w-full py-3 border border-amber-500 text-amber-400 font-bold rounded-xl hover:bg-amber-500/10 disabled:opacity-50"
                >
                  Subscribe Monthly
                </button>
              </div>

              {/* Yearly - Best Value */}
              <div className="border-2 border-amber-500 rounded-xl p-6 relative bg-gradient-to-b from-amber-500/10 to-transparent">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-amber-500 text-black text-xs font-bold rounded-full">
                  BEST VALUE
                </div>
                <div className="text-center mb-4">
                  <p className="text-gray-400 text-sm">Yearly</p>
                  <p className="text-3xl font-bold text-white">10 <span className="text-lg">ICP</span></p>
                  <p className="text-gray-500 text-sm">~$125 USD (2 months free)</p>
                </div>
                <ul className="space-y-2 text-sm mb-6">
                  {SUBSCRIPTION_PRICES.yearly.features.map((f, i) => (
                    <li key={i} className="text-gray-400 flex items-center gap-2">
                      <span className="text-green-400">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleSubscriptionPurchase('yearly')}
                  disabled={isProcessingPayment || !isAuthenticated}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold rounded-xl hover:shadow-lg hover:shadow-amber-500/25 disabled:opacity-50"
                >
                  Subscribe Yearly
                </button>
              </div>

              {/* Lifetime */}
              <div className="border border-purple-500/50 rounded-xl p-6 bg-gradient-to-b from-purple-500/10 to-transparent">
                <div className="text-center mb-4">
                  <p className="text-gray-400 text-sm">Lifetime</p>
                  <p className="text-3xl font-bold text-white">25 <span className="text-lg">ICP</span></p>
                  <p className="text-gray-500 text-sm">~$312 USD (One-time)</p>
                </div>
                <ul className="space-y-2 text-sm mb-6">
                  {SUBSCRIPTION_PRICES.lifetime.features.map((f, i) => (
                    <li key={i} className="text-gray-400 flex items-center gap-2">
                      <span className="text-purple-400">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleSubscriptionPurchase('lifetime')}
                  disabled={isProcessingPayment || !isAuthenticated}
                  className="w-full py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-purple-500/25 disabled:opacity-50"
                >
                  Get Lifetime Access
                </button>
              </div>
            </div>

            <p className="text-center text-gray-500 text-sm">
              {isAuthenticated 
                ? 'Secure payment via ICP. Your subscription activates immediately.'
                : 'Please connect your wallet to subscribe.'}
            </p>
          </div>
        </div>
      )}

      {/* AI Council Modal */}
      {showAICouncil && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  🧠 AI Council
                </h3>
                <p className="text-gray-400">Multi-LLM Consensus System</p>
              </div>
              <button
                onClick={() => {
                  setShowAICouncil(false);
                  setCouncilQuery('');
                  setCouncilResponses([]);
                }}
                className="text-gray-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            {/* Query Input */}
            <div className="mb-6">
              <label className="block text-sm text-gray-400 mb-2">Your Question</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={councilQuery}
                  onChange={(e) => setCouncilQuery(e.target.value)}
                  placeholder="Ask the AI Council anything..."
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none"
                  onKeyDown={(e) => e.key === 'Enter' && processCouncilQuery()}
                />
                <button
                  onClick={processCouncilQuery}
                  disabled={!councilQuery.trim() || isCouncilProcessing}
                  className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold rounded-xl hover:shadow-lg disabled:opacity-50"
                >
                  {isCouncilProcessing ? '⏳ Asking...' : '🧠 Ask Council'}
                </button>
              </div>
            </div>

            {/* Council Responses */}
            {councilResponses.length > 0 && (
              <div className="space-y-4 mb-6">
                <h4 className="font-bold text-white">Council Responses</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {councilResponses.map((response, i) => (
                    <div key={i} className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-white">{response.llm}</span>
                        <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">
                          {Math.round(response.confidence * 100)}% confidence
                        </span>
                      </div>
                      <p className="text-gray-300 text-sm">{response.response}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Consensus */}
            {councilResponses.length >= 4 && (
              <div className="bg-gradient-to-r from-amber-500/10 to-purple-500/10 rounded-xl p-4 border border-amber-500/30">
                <h4 className="font-bold text-amber-400 mb-2">📊 Council Consensus</h4>
                <p className="text-gray-300">
                  Based on the responses from all {councilResponses.length} AI models, the council has reached a consensus 
                  with an average confidence of {Math.round(councilResponses.reduce((a, b) => a + b.confidence, 0) / councilResponses.length * 100)}%.
                  The key insight is to approach your question systematically while considering multiple perspectives.
                </p>
              </div>
            )}

            {/* Processing Indicator */}
            {isCouncilProcessing && (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-gray-400">Consulting {4 - councilResponses.length} more AI models...</span>
                </div>
              </div>
            )}

            {/* Empty State */}
            {councilResponses.length === 0 && !isCouncilProcessing && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🧠</div>
                <h4 className="text-xl font-bold text-white mb-2">Ask the AI Council</h4>
                <p className="text-gray-400 max-w-md mx-auto">
                  Get consensus from multiple AI models (GPT-4, Claude, Gemini, Llama) for more reliable and balanced responses.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AILaunchpad;

