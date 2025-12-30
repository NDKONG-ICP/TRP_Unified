/**
 * AXIOM Collection Page - Genesis AI Agent NFT Gallery
 * Showcases all 300 AXIOM NFTs with filtering and marketplace integration
 * Compatible with ICRC-7, ICRC-37, DIP721, and EXT standards
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Brain,
  Sparkles,
  Crown,
  Shield,
  Zap,
  Heart,
  Search,
  Filter,
  Grid,
  List,
  ExternalLink,
  Wallet,
  Star,
  TrendingUp,
  Users,
  Activity,
  ChevronRight,
  Play,
  Copy,
  Check,
  Globe,
  Loader2
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { axiomService, MultichainMetadata } from '../../services/axiomService';

// AXIOM Genesis NFTs (1-5 are deployed)
const GENESIS_AXIOMS = [
  {
    id: 1,
    canisterId: '46odg-5iaaa-aaaao-a4xqa-cai',
    name: 'AXIOM Genesis #1',
    title: 'The First Oracle',
    personality: 'Wise and analytical',
    specialization: 'Blockchain Expert',
    gradient: 'from-amber-500 via-orange-500 to-red-500',
    icon: Crown,
    rarity: 'Legendary',
    stats: { conversations: 0, messages: 0, uptime: '99.9%' }
  },
  {
    id: 2,
    canisterId: '4zpfs-qqaaa-aaaao-a4xqq-cai',
    name: 'AXIOM Genesis #2',
    title: 'The Creative Mind',
    personality: 'Creative and visionary',
    specialization: 'NFT Art Expert',
    gradient: 'from-purple-500 via-pink-500 to-rose-500',
    icon: Sparkles,
    rarity: 'Legendary',
    stats: { conversations: 0, messages: 0, uptime: '99.9%' }
  },
  {
    id: 3,
    canisterId: '4ckzx-kiaaa-aaaao-a4xsa-cai',
    name: 'AXIOM Genesis #3',
    title: 'The DeFi Sage',
    personality: 'Calculated and precise',
    specialization: 'DeFi Strategist',
    gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
    icon: Zap,
    rarity: 'Legendary',
    stats: { conversations: 0, messages: 0, uptime: '99.9%' }
  },
  {
    id: 4,
    canisterId: '4fl7d-hqaaa-aaaao-a4xsq-cai',
    name: 'AXIOM Genesis #4',
    title: 'The Tech Architect',
    personality: 'Technical and thorough',
    specialization: 'Smart Contract Developer',
    gradient: 'from-blue-500 via-indigo-500 to-violet-500',
    icon: Shield,
    rarity: 'Legendary',
    stats: { conversations: 0, messages: 0, uptime: '99.9%' }
  },
  {
    id: 5,
    canisterId: '4miu7-ryaaa-aaaao-a4xta-cai',
    name: 'AXIOM Genesis #5',
    title: 'The Community Builder',
    personality: 'Friendly and engaging',
    specialization: 'Community Manager',
    gradient: 'from-rose-500 via-red-500 to-orange-500',
    icon: Heart,
    rarity: 'Legendary',
    stats: { conversations: 0, messages: 0, uptime: '99.9%' }
  },
];

const RARITY_COLORS = {
  Legendary: 'from-amber-500 to-orange-500',
  Epic: 'from-purple-500 to-pink-500',
  Rare: 'from-blue-500 to-cyan-500',
  Common: 'from-gray-500 to-gray-600',
};

export const AxiomCollectionPage: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRarity, setSelectedRarity] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [multichainData, setMultichainData] = useState<Record<number, MultichainMetadata | null>>({});
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [showMultichainModal, setShowMultichainModal] = useState<number | null>(null);

  // Fetch multichain addresses on mount
  useEffect(() => {
    const fetchMultichainAddresses = async () => {
      setLoadingAddresses(true);
      try {
        const addresses = await axiomService.getAllGenesisMultichainAddresses();
        const dataMap: Record<number, MultichainMetadata | null> = {};
        addresses.forEach(({ tokenId, metadata }) => {
          dataMap[tokenId] = metadata;
        });
        setMultichainData(dataMap);
      } catch (error) {
        console.error('Failed to fetch multichain addresses:', error);
      } finally {
        setLoadingAddresses(false);
      }
    };

    fetchMultichainAddresses();
  }, []);

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAddress(id);
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const filteredAxioms = GENESIS_AXIOMS.filter(axiom => {
    const matchesSearch = axiom.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         axiom.specialization.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRarity = !selectedRarity || axiom.rarity === selectedRarity;
    return matchesSearch && matchesRarity;
  });

  return (
    <div className="min-h-screen bg-obsidian-950 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] md:w-[600px] md:h-[600px] bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-16"
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 rounded-full mb-6"
            animate={{ 
              boxShadow: [
                '0 0 0 0 rgba(251,191,36,0.4)',
                '0 0 0 20px rgba(251,191,36,0)',
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Brain className="w-5 h-5 text-amber-500" />
            <span className="text-amber-400 font-medium">Genesis Collection</span>
          </motion.div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
            AXIOM <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-red-500">Genesis</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
            300 unique AI agents with persistent memory, each with their own personality and specialization.
            Powered by the Internet Computer blockchain.
          </p>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 mb-8">
            {[
              { label: 'Total Supply', value: '300', icon: Users },
              { label: 'Minted', value: '5', icon: Activity },
              { label: 'Floor Price', value: '100 ICP', icon: TrendingUp },
              { label: 'Total Volume', value: '500 ICP', icon: Star },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="flex items-center justify-center gap-2 mb-1">
                  <stat.icon className="w-4 h-4 text-amber-500" />
                  <span className="text-2xl font-bold text-white">{stat.value}</span>
                </div>
                <span className="text-gray-500 text-sm">{stat.label}</span>
              </motion.div>
            ))}
          </div>

          {/* Marketplace Links */}
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="https://dgdg.app/nfts/collections/axiom_genesis"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-medium text-white hover:opacity-90 transition-opacity"
            >
              <ExternalLink className="w-5 h-5" />
              View on DGDG
            </a>
            <a
              href="https://toko.ooo/collection/axiom_genesis"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl font-medium text-white hover:opacity-90 transition-opacity"
            >
              <ExternalLink className="w-5 h-5" />
              View on TOKO
            </a>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap items-center justify-between gap-4 mb-8"
        >
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Search AXIOM..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-obsidian-900 border border-obsidian-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 w-64"
              />
            </div>

            {/* Rarity Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-500" />
              {Object.keys(RARITY_COLORS).map(rarity => (
                <button
                  key={rarity}
                  onClick={() => setSelectedRarity(selectedRarity === rarity ? null : rarity)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    selectedRarity === rarity
                      ? `bg-gradient-to-r ${RARITY_COLORS[rarity as keyof typeof RARITY_COLORS]} text-white`
                      : 'bg-obsidian-800 text-gray-400 hover:text-white'
                  }`}
                >
                  {rarity}
                </button>
              ))}
            </div>
          </div>

          {/* View Mode */}
          <div className="flex items-center gap-2 bg-obsidian-900 rounded-xl p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-amber-500/20 text-amber-400' : 'text-gray-500 hover:text-white'
              }`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-amber-500/20 text-amber-400' : 'text-gray-500 hover:text-white'
              }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </motion.div>

        {/* NFT Grid */}
        <div className={viewMode === 'grid' 
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
          : 'space-y-4'
        }>
          {filteredAxioms.map((axiom, index) => {
            const Icon = axiom.icon;
            
            return (
              <motion.div
                key={axiom.id}
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                onMouseEnter={() => setHoveredId(axiom.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={viewMode === 'grid' ? '' : 'flex gap-6'}
              >
                <Link to={`/axiom/${axiom.id}`}>
                  <div className={`relative rounded-2xl overflow-hidden bg-gradient-to-br ${axiom.gradient} p-[2px] group cursor-pointer`}>
                    <div className="bg-obsidian-900 rounded-2xl p-4 h-full">
                      {/* Image */}
                      <div className="relative aspect-square rounded-xl overflow-hidden mb-4 bg-obsidian-800">
                        <img
                          src="/axiomart.jpg"
                          alt={axiom.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className={`absolute inset-0 bg-gradient-to-t ${axiom.gradient} opacity-20`} />
                        
                        {/* Token ID */}
                        <div className={`absolute top-3 left-3 px-2 py-1 bg-gradient-to-r ${axiom.gradient} rounded-full`}>
                          <span className="text-white font-bold text-xs">#{axiom.id}</span>
                        </div>
                        
                        {/* Rarity */}
                        <div className={`absolute top-3 right-3 px-2 py-1 bg-gradient-to-r ${RARITY_COLORS[axiom.rarity as keyof typeof RARITY_COLORS]} rounded-full`}>
                          <span className="text-white font-bold text-xs">{axiom.rarity}</span>
                        </div>
                        
                        {/* Hover Overlay */}
                        <AnimatePresence>
                          {hoveredId === axiom.id && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="absolute inset-0 bg-black/60 flex items-center justify-center"
                            >
                              <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                                className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full"
                              >
                                <Play className="w-5 h-5 text-white" />
                                <span className="text-white font-medium">Chat Now</span>
                              </motion.div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      
                      {/* Info */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${axiom.gradient} flex items-center justify-center`}>
                            <Icon className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <h3 className="text-white font-bold text-sm">{axiom.name}</h3>
                            <p className="text-gray-500 text-xs">{axiom.title}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-400">{axiom.specialization}</span>
                          <span className="text-emerald-400 flex items-center gap-1">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                            Online
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between pt-3 border-t border-obsidian-800">
                          <div>
                            <p className="text-gray-500 text-xs">Price</p>
                            <p className="text-white font-bold">100 ICP</p>
                          </div>
                          <div className="flex gap-2">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setShowMultichainModal(axiom.id);
                              }}
                              className="px-3 py-2 bg-obsidian-800 hover:bg-obsidian-700 rounded-lg text-white text-xs font-medium flex items-center gap-1"
                            >
                              <Globe className="w-4 h-4" />
                              Chains
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className={`px-4 py-2 bg-gradient-to-r ${axiom.gradient} rounded-lg text-white text-sm font-medium`}
                            >
                              View
                            </motion.button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Coming Soon Section */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-16 text-center"
        >
          <div className="max-w-2xl mx-auto p-8 bg-obsidian-900/50 backdrop-blur-xl rounded-3xl border border-obsidian-800">
            <Brain className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">295 More AXIOM NFTs Coming Soon</h3>
            <p className="text-gray-400 mb-6">
              The Genesis collection features 300 unique AI agents. Mint your own AXIOM and join the future of AI-powered NFTs.
            </p>
            <Link
              to="/ai-launchpad"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl font-medium text-white hover:opacity-90 transition-opacity"
            >
              <Wallet className="w-5 h-5" />
              Mint Your AXIOM
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </motion.div>

        {/* Standards Info */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-16 grid md:grid-cols-4 gap-6"
        >
          {[
            { standard: 'ICRC-7', desc: 'Base NFT Standard', color: 'emerald' },
            { standard: 'ICRC-37', desc: 'Approval Standard', color: 'blue' },
            { standard: 'DIP721', desc: 'ERC721 Compatible', color: 'purple' },
            { standard: 'EXT', desc: 'Extendable Token', color: 'amber' },
          ].map((item, i) => (
            <div 
              key={item.standard}
              className={`p-4 bg-obsidian-900/50 rounded-2xl border border-${item.color}-500/20`}
            >
              <div className={`w-10 h-10 rounded-xl bg-${item.color}-500/20 flex items-center justify-center mb-3`}>
                <Shield className={`w-5 h-5 text-${item.color}-500`} />
              </div>
              <h4 className="text-white font-bold mb-1">{item.standard}</h4>
              <p className="text-gray-500 text-sm">{item.desc}</p>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Multichain Addresses Modal */}
      <AnimatePresence>
        {showMultichainModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowMultichainModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-obsidian-900 rounded-3xl border border-obsidian-800 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-obsidian-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      {GENESIS_AXIOMS.find(a => a.id === showMultichainModal)?.name}
                    </h2>
                    <p className="text-gray-400 mt-1">Multichain Contract Addresses</p>
                  </div>
                  <button
                    onClick={() => setShowMultichainModal(null)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {loadingAddresses ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                    <span className="ml-3 text-gray-400">Loading contract addresses...</span>
                  </div>
                ) : (
                  <>
                    {/* ICP */}
                    <div className="bg-obsidian-800/50 rounded-xl p-4 border border-obsidian-700">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                          <Globe className="w-4 h-4 text-white" />
                        </div>
                        <h3 className="text-white font-bold">Internet Computer (ICP)</h3>
                        <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded">ICRC-7</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 text-sm">Canister ID:</span>
                          <div className="flex items-center gap-2">
                            <code className="text-white text-sm font-mono">
                              {multichainData[showMultichainModal]?.icpCanister || GENESIS_AXIOMS.find(a => a.id === showMultichainModal)?.canisterId}
                            </code>
                            <button
                              onClick={() => copyToClipboard(
                                multichainData[showMultichainModal]?.icpCanister || GENESIS_AXIOMS.find(a => a.id === showMultichainModal)?.canisterId || '',
                                `icp-${showMultichainModal}`
                              )}
                              className="p-1.5 hover:bg-obsidian-700 rounded transition-colors"
                            >
                              {copiedAddress === `icp-${showMultichainModal}` ? (
                                <Check className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Copy className="w-4 h-4 text-gray-400" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Ethereum */}
                    {multichainData[showMultichainModal]?.ethContract && (
                      <div className="bg-obsidian-800/50 rounded-xl p-4 border border-obsidian-700">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                            <Globe className="w-4 h-4 text-white" />
                          </div>
                          <h3 className="text-white font-bold">Ethereum</h3>
                          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">ERC-721</span>
                          {multichainData[showMultichainModal]?.evmChainId !== undefined &&
                            multichainData[showMultichainModal]?.evmChainId !== 0n && (
                            <span className="px-2 py-1 bg-gray-500/20 text-gray-400 text-xs rounded">
                              Chain ID: {String(multichainData[showMultichainModal]?.evmChainId)}
                            </span>
                          )}
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400 text-sm">Contract Address:</span>
                            <div className="flex items-center gap-2">
                              <code className="text-white text-sm font-mono">
                                {multichainData[showMultichainModal]?.ethContract}
                              </code>
                              <button
                                onClick={() => copyToClipboard(
                                  multichainData[showMultichainModal]?.ethContract || '',
                                  `eth-${showMultichainModal}`
                                )}
                                className="p-1.5 hover:bg-obsidian-700 rounded transition-colors"
                              >
                                {copiedAddress === `eth-${showMultichainModal}` ? (
                                  <Check className="w-4 h-4 text-emerald-400" />
                                ) : (
                                  <Copy className="w-4 h-4 text-gray-400" />
                                )}
                              </button>
                            </div>
                          </div>
                          {multichainData[showMultichainModal]?.ethTokenId && (
                            <div className="flex items-center justify-between">
                              <span className="text-gray-400 text-sm">Token ID:</span>
                              <code className="text-white text-sm font-mono">
                                {multichainData[showMultichainModal]?.ethTokenId}
                              </code>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Solana */}
                    {multichainData[showMultichainModal]?.solMint && (
                      <div className="bg-obsidian-800/50 rounded-xl p-4 border border-obsidian-700">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                            <Globe className="w-4 h-4 text-white" />
                          </div>
                          <h3 className="text-white font-bold">Solana</h3>
                          <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded">Metaplex</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400 text-sm">Mint Address:</span>
                            <div className="flex items-center gap-2">
                              <code className="text-white text-sm font-mono break-all">
                                {multichainData[showMultichainModal]?.solMint}
                              </code>
                              <button
                                onClick={() => copyToClipboard(
                                  multichainData[showMultichainModal]?.solMint || '',
                                  `sol-${showMultichainModal}`
                                )}
                                className="p-1.5 hover:bg-obsidian-700 rounded transition-colors flex-shrink-0"
                              >
                                {copiedAddress === `sol-${showMultichainModal}` ? (
                                  <Check className="w-4 h-4 text-emerald-400" />
                                ) : (
                                  <Copy className="w-4 h-4 text-gray-400" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Bitcoin */}
                    {multichainData[showMultichainModal]?.btcInscription && (
                      <div className="bg-obsidian-800/50 rounded-xl p-4 border border-obsidian-700">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
                            <Globe className="w-4 h-4 text-white" />
                          </div>
                          <h3 className="text-white font-bold">Bitcoin</h3>
                          <span className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded">Ordinals</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400 text-sm">Inscription ID:</span>
                            <div className="flex items-center gap-2">
                              <code className="text-white text-sm font-mono">
                                {multichainData[showMultichainModal]?.btcInscription}
                              </code>
                              <button
                                onClick={() => copyToClipboard(
                                  multichainData[showMultichainModal]?.btcInscription || '',
                                  `btc-${showMultichainModal}`
                                )}
                                className="p-1.5 hover:bg-obsidian-700 rounded transition-colors"
                              >
                                {copiedAddress === `btc-${showMultichainModal}` ? (
                                  <Check className="w-4 h-4 text-emerald-400" />
                                ) : (
                                  <Copy className="w-4 h-4 text-gray-400" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Standards */}
                    {multichainData[showMultichainModal]?.standards && multichainData[showMultichainModal]!.standards.length > 0 && (
                      <div className="bg-obsidian-800/50 rounded-xl p-4 border border-obsidian-700">
                        <h3 className="text-white font-bold mb-3">Supported Standards</h3>
                        <div className="flex flex-wrap gap-2">
                          {multichainData[showMultichainModal]!.standards.map((standard) => (
                            <span
                              key={standard}
                              className="px-3 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-full"
                            >
                              {standard}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {!multichainData[showMultichainModal] && (
                      <div className="text-center py-12 text-gray-400">
                        <p>No multichain addresses found for this NFT.</p>
                        <p className="text-sm mt-2">Addresses are generated automatically on mint.</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AxiomCollectionPage;


