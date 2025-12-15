/**
 * The Raven Project - Investor Pitch Deck
 * Unified Multi-Chain dApp Ecosystem on Internet Computer
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Globe,
  Zap,
  Shield,
  Users,
  Coins,
  TrendingUp,
  Image,
  Cpu,
  Truck,
  Newspaper,
  Gamepad2,
  PenTool,
  ExternalLink,
  Check,
  ArrowRight,
  Server,
} from 'lucide-react';

// Brand assets
import tokenLogo from '../token.svg';

const SLIDES = [
  {
    id: 'cover',
    type: 'cover',
    title: 'The Raven Project',
    subtitle: 'Unified Multi-Chain dApp Ecosystem',
    tagline: 'Built on Internet Computer | Powered by Chain Fusion',
  },
  {
    id: 'problem',
    type: 'content',
    title: 'The Problem',
    points: [
      { icon: '🔗', text: 'Fragmented blockchain ecosystems with no interoperability' },
      { icon: '💸', text: 'High gas fees making micro-transactions impossible' },
      { icon: '🐌', text: 'Slow confirmation times hindering real-world adoption' },
      { icon: '🔐', text: 'Complex wallet management across multiple chains' },
      { icon: '🤖', text: 'AI and blockchain remain disconnected technologies' },
    ],
  },
  {
    id: 'solution',
    type: 'content',
    title: 'Our Solution',
    points: [
      { icon: '🌐', text: 'Unified ecosystem with 9 interconnected dApps' },
      { icon: '⚡', text: 'Near-zero transaction costs on Internet Computer' },
      { icon: '🔄', text: 'Chain Fusion enabling multi-chain operations' },
      { icon: '🤖', text: 'On-chain AI agents with persistent memory (AXIOM)' },
      { icon: '🎨', text: 'Multi-chain NFT standards (ICRC-7, ERC-721, Metaplex, Ordinals)' },
    ],
  },
  {
    id: 'ecosystem',
    type: 'ecosystem',
    title: 'The Ecosystem',
    apps: [
      { name: 'IC SPICY', desc: 'RWA Co-op for pepper farming', icon: '🌶️' },
      { name: 'The Forge', desc: 'Multi-chain NFT minting platform', icon: '🔨' },
      { name: 'AXIOM', desc: 'On-chain AI agents as NFTs', icon: '🧠' },
      { name: 'Expresso', desc: 'Freight logistics management', icon: '🚚' },
      { name: 'Raven News', desc: 'Community news & meme platform', icon: '📰' },
      { name: 'Sk8 Punks', desc: 'Play-to-earn gaming & NFT staking', icon: '🛹' },
      { name: 'Crossword Quest', desc: 'AI-powered puzzle rewards', icon: '🧩' },
      { name: 'AI Launchpad', desc: 'AI agent marketplace', icon: '🚀' },
    ],
  },
  {
    id: 'technology',
    type: 'content',
    title: 'Technology Stack',
    points: [
      { icon: '🏛️', text: 'Internet Computer (ICP) - 100% on-chain hosting' },
      { icon: '🔗', text: 'Chain Fusion - Bitcoin, Ethereum, Solana integration' },
      { icon: '📦', text: 'ICRC-7/ICRC-37 - Native NFT standards' },
      { icon: '🔊', text: 'Eleven Labs - AI voice synthesis' },
      { icon: '🗄️', text: 'Stable Structures - Persistent canister storage' },
    ],
  },
  {
    id: 'tokenomics',
    type: 'tokenomics',
    title: '$HARLEE Token',
    data: {
      totalSupply: '1,000,000,000',
      ledger: 'tlm4l-kaaaa-aaaah-qqeha-cai',
      utilities: [
        'In-game rewards (Sk8 Punks, Crossword Quest)',
        'NFT staking rewards',
        'Community content rewards',
        'Subscription payments',
        'Governance voting',
      ],
    },
  },
  {
    id: 'aicouncil',
    type: 'content',
    title: 'AI Council - 8 LLM Consensus',
    points: [
      { icon: '🔮', text: 'Perplexity Sonar Pro - Real-time web search & current events' },
      { icon: '🤖', text: 'Qwen2.5-72B, Llama-3.3-70B, DeepSeek - Deep reasoning' },
      { icon: '🧮', text: 'Mixtral-8x22B, Gemma-2, GLM-4, Mistral-7B - Diverse perspectives' },
      { icon: '🎯', text: 'Weighted consensus synthesis for accurate responses' },
      { icon: '🎤', text: 'Eleven Labs voice synthesis for natural conversation' },
    ],
  },
  {
    id: 'security',
    type: 'content',
    title: 'Security & Trust',
    points: [
      { icon: '🔐', text: 'All sensitive data secured in environment variables' },
      { icon: '🛡️', text: 'Backend canister verification for admin operations' },
      { icon: '💎', text: 'Multi-chain address masking for privacy' },
      { icon: '📝', text: 'Comprehensive audit logging for transparency' },
      { icon: '⚡', text: 'Internet Computer\'s native security model' },
    ],
  },
  {
    id: 'traction',
    type: 'metrics',
    title: 'Traction & Metrics',
    metrics: [
      { label: 'Deployed Canisters', value: '9', icon: Server },
      { label: 'Multi-Chain Support', value: '5+', icon: Globe },
      { label: 'NFT Collections', value: '3', icon: Image },
      { label: 'AI Models', value: '8', icon: Cpu },
    ],
  },
  {
    id: 'multichain',
    type: 'multichain',
    title: 'Multi-Chain NFT Standards',
    chains: [
      { chain: 'ICP', standards: ['ICRC-7', 'ICRC-37', 'EXT'] },
      { chain: 'Ethereum', standards: ['ERC-721', 'ERC-1155'] },
      { chain: 'Bitcoin', standards: ['Ordinals', 'Runes'] },
      { chain: 'Solana', standards: ['Metaplex'] },
      { chain: 'SUI', standards: ['SUI Objects'] },
    ],
  },
  {
    id: 'roadmap',
    type: 'roadmap',
    title: '2025 Roadmap',
    quarters: [
      { q: 'Q1', items: ['Mainnet Launch ✅', 'AXIOM Genesis Collection', 'Treasury Setup'] },
      { q: 'Q2', items: ['SNS DAO Launch', '$HARLEE Distribution', 'Mobile App'] },
      { q: 'Q3', items: ['Cross-chain Bridges', 'DEX Integration', 'Enterprise Partnerships'] },
      { q: 'Q4', items: ['AI Council Governance', 'RWA Tokenization', 'Global Expansion'] },
    ],
  },
  {
    id: 'team',
    type: 'content',
    title: 'Team',
    points: [
      { icon: '👨‍💻', text: 'Experienced blockchain developers with ICP expertise' },
      { icon: '🎨', text: 'Creative team for NFT art and branding' },
      { icon: '🤖', text: 'AI/ML engineers for AXIOM agent development' },
      { icon: '📈', text: 'Business development and partnership specialists' },
    ],
  },
  {
    id: 'contact',
    type: 'contact',
    title: 'Get Connected',
    links: {
      app: 'https://3kpgg-eaaaa-aaaao-a4xdq-cai.icp0.io',
      instagram: 'https://www.instagram.com/raven_icp',
      tiktok: 'https://www.tiktok.com/@the.raven.project',
      twitter: 'https://x.com/ravenicp',
      email: 'raven.icp@gmail.com',
    },
  },
];

export default function PitchDeck() {
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const nextSlide = () => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };
  
  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };
  
  const slide = SLIDES[currentSlide];
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex flex-col">
      {/* Progress Bar */}
      <div className="h-1 bg-gray-800">
        <motion.div
          className="h-full bg-gradient-to-r from-amber-500 to-yellow-500"
          animate={{ width: `${((currentSlide + 1) / SLIDES.length) * 100}%` }}
        />
      </div>
      
      {/* Header */}
      <div className="px-8 py-4 flex items-center justify-between border-b border-gray-800">
        <div className="flex items-center gap-3">
          <img src={tokenLogo} alt="Raven" className="w-10 h-10" />
          <span className="font-bold text-white">The Raven Project</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-400 text-sm">
            {currentSlide + 1} / {SLIDES.length}
          </span>
        </div>
      </div>
      
      {/* Slide Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="w-full max-w-5xl"
          >
            {/* Cover Slide */}
            {slide.type === 'cover' && (
              <div className="text-center">
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-40 h-40 mx-auto mb-8"
                >
                  <img src={tokenLogo} alt="Raven" className="w-full h-full" />
                </motion.div>
                <h1 className="text-6xl font-bold text-white mb-4">{slide.title}</h1>
                <p className="text-2xl text-amber-400 mb-6">{slide.subtitle}</p>
                <p className="text-gray-400">{slide.tagline}</p>
              </div>
            )}
            
            {/* Content Slide */}
            {slide.type === 'content' && (
              <div>
                <h2 className="text-4xl font-bold text-white mb-12 text-center">{slide.title}</h2>
                <div className="space-y-6">
                  {slide.points?.map((point, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center gap-4 p-4 rounded-xl bg-gray-800/50 border border-gray-700"
                    >
                      <span className="text-3xl">{point.icon}</span>
                      <span className="text-xl text-gray-200">{point.text}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Ecosystem Slide */}
            {slide.type === 'ecosystem' && (
              <div>
                <h2 className="text-4xl font-bold text-white mb-12 text-center">{slide.title}</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {slide.apps?.map((app, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className="p-6 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 border border-amber-500/20 text-center hover:border-amber-500/50 transition-colors"
                    >
                      <span className="text-4xl block mb-3">{app.icon}</span>
                      <h3 className="font-bold text-white mb-1">{app.name}</h3>
                      <p className="text-sm text-gray-400">{app.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Tokenomics Slide */}
            {slide.type === 'tokenomics' && (
              <div>
                <h2 className="text-4xl font-bold text-white mb-12 text-center">{slide.title}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="p-6 rounded-xl bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border border-amber-500/30">
                    <h3 className="text-2xl font-bold text-amber-400 mb-4">Token Info</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total Supply</span>
                        <span className="text-white font-bold">{slide.data?.totalSupply}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Ledger Canister</span>
                        <code className="text-amber-400 text-sm">{slide.data?.ledger}</code>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 rounded-xl bg-gray-800/50 border border-gray-700">
                    <h3 className="text-2xl font-bold text-white mb-4">Utilities</h3>
                    <ul className="space-y-2">
                      {slide.data?.utilities.map((util, i) => (
                        <li key={i} className="flex items-center gap-2 text-gray-300">
                          <Check className="w-4 h-4 text-green-400" />
                          {util}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
            
            {/* Metrics Slide */}
            {slide.type === 'metrics' && (
              <div>
                <h2 className="text-4xl font-bold text-white mb-12 text-center">{slide.title}</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {slide.metrics?.map((metric, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="p-6 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 text-center"
                    >
                      <metric.icon className="w-10 h-10 text-amber-400 mx-auto mb-3" />
                      <p className="text-4xl font-bold text-white mb-2">{metric.value}</p>
                      <p className="text-gray-400">{metric.label}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Multi-chain Slide */}
            {slide.type === 'multichain' && (
              <div>
                <h2 className="text-4xl font-bold text-white mb-12 text-center">{slide.title}</h2>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {slide.chains?.map((chain, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="p-4 rounded-xl bg-gray-800/50 border border-gray-700"
                    >
                      <h3 className="font-bold text-amber-400 mb-3 text-center">{chain.chain}</h3>
                      <ul className="space-y-1">
                        {chain.standards.map((std, j) => (
                          <li key={j} className="text-sm text-gray-300 text-center">{std}</li>
                        ))}
                      </ul>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Roadmap Slide */}
            {slide.type === 'roadmap' && (
              <div>
                <h2 className="text-4xl font-bold text-white mb-12 text-center">{slide.title}</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {slide.quarters?.map((quarter, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="p-6 rounded-xl bg-gray-800/50 border border-gray-700"
                    >
                      <h3 className="text-2xl font-bold text-amber-400 mb-4">{quarter.q}</h3>
                      <ul className="space-y-2">
                        {quarter.items.map((item, j) => (
                          <li key={j} className="text-gray-300 text-sm flex items-start gap-2">
                            <ArrowRight className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Contact Slide */}
            {slide.type === 'contact' && (
              <div className="text-center">
                <h2 className="text-4xl font-bold text-white mb-12">{slide.title}</h2>
                <div className="flex flex-wrap justify-center gap-4 mb-8">
                  {Object.entries(slide.links || {}).map(([key, url]) => (
                    <a
                      key={key}
                      href={url as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-3 rounded-xl bg-gray-800 border border-gray-700 hover:border-amber-500/50 text-white font-medium transition-colors flex items-center gap-2"
                    >
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  ))}
                </div>
                <p className="text-gray-400">
                  Ready to join the future of multi-chain dApps?
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      
      {/* Navigation */}
      <div className="p-6 flex items-center justify-between border-t border-gray-800">
        <button
          onClick={prevSlide}
          disabled={currentSlide === 0}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gray-800 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Previous
        </button>
        
        {/* Slide dots */}
        <div className="flex gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`w-3 h-3 rounded-full transition-colors ${
                i === currentSlide ? 'bg-amber-500' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            />
          ))}
        </div>
        
        <button
          onClick={nextSlide}
          disabled={currentSlide === SLIDES.length - 1}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-400 transition-colors"
        >
          Next
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

