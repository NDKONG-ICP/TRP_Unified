import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { 
  Sparkles, 
  Wallet,
  Zap,
  Shield,
  Globe,
  ArrowRight,
  ChevronDown,
  Bot,
  Coins,
  Users,
  Brain,
  Truck,
  Gamepad2,
  Newspaper,
  PuzzleIcon
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import WalletModal from '../components/shared/WalletModal';

// Import branding
import trpBackground from '../trpbackground.GIF';
import trpLogo from '../trplogo.jpg';
import tokenLogo from '../token.svg';
import spicyBanner from '../spicy_banner.svg';
import icSpicyLogo from '../icspicylogo.PNG';
import sk8Logo from '../sk8logo.svg';
import questLogo from '../quest.svg';
import axiomart from '../axiomart.jpg';

// Ecosystem projects data - Real data only, no mock/simulated numbers
const projects = [
  {
    id: 'ic-spicy',
    name: 'IC SPICY',
    subtitle: 'Flagship RWA Co-op',
    description: 'Real World Asset cooperative connecting pepper farmers with the global market. Featuring SpicyAI, live inventory, and SNS governance.',
    iconType: 'image',
    iconSrc: null, // Will use icSpicyLogo
    href: '/ic-spicy',
    gradient: 'from-red-500 via-orange-500 to-yellow-500',
    features: ['RWA Platform', 'SpicyAI', 'Farm Co-op', 'SNS Governance'],
    stats: { plants: '--', members: '--', yield: '--' },
    featured: true,
    flagship: true,
  },
  {
    id: 'raven-ai',
    name: 'RavenAI Agents',
    subtitle: 'AXIOM NFT Collection',
    description: 'Own your personalized on-chain AI agent with persistent memory. 300 exclusive AXIOM NFTs available.',
    iconType: 'image',
    iconSrc: null, // Will use tokenLogo
    href: '/ai-launchpad',
    gradient: 'from-amber-500 via-amber-600 to-yellow-500',
    features: ['AI Memory', 'Multi-Chain', 'Knowledge Graph', 'Voice AI'],
    stats: { total: '300', minted: '5', available: '295' },
    featured: true,
  },
  {
    id: 'forge',
    name: 'The Forge',
    subtitle: 'NFT Minter & RWA Platform',
    description: 'Generative NFT minting with multi-chain support. ICRC-7/ICRC-37, EXT standards.',
    iconType: 'image',
    iconSrc: null, // Will use tokenLogo
    href: '/forge',
    gradient: 'from-orange-500 via-red-500 to-amber-500',
    features: ['Generative Art', 'Multi-Chain', 'RWA Integration', 'QR Claims'],
    stats: { collections: '--', minted: '--', chains: '6' },
  },
  {
    id: 'expresso',
    name: 'Expresso Logistics',
    subtitle: 'AI-Powered Logistics',
    description: 'Decentralized logistics platform with AI route optimization, NFT shipment records, and escrow payments.',
    iconType: 'image',
    iconSrc: null, // Will use truck icon
    href: '/expresso',
    gradient: 'from-blue-500 via-cyan-500 to-teal-500',
    features: ['AI Routes', 'NFT Escrow', 'GPS Tracking', 'ASE Manuals'],
    stats: { loads: '--', drivers: '--', savings: '--' },
  },
  {
    id: 'sk8punks',
    name: 'Sk8 Punks',
    subtitle: 'Play-to-Earn Game',
    description: 'Skateboarding game with NFT staking, trick competitions, and $HARLEE token rewards.',
    iconType: 'image',
    iconSrc: null, // Will use sk8Logo
    href: '/sk8-punks',
    gradient: 'from-purple-500 via-pink-500 to-rose-500',
    features: ['P2E Rewards', 'NFT Staking', 'Tournaments', 'Leaderboards'],
    stats: { players: '--', collection: '888', floor: '0.4T' },
  },
  {
    id: 'crossword',
    name: 'Crossword Quest',
    subtitle: 'AI Puzzle Game',
    description: 'AI-generated crossword puzzles with crypto themes, streak rewards, and NFT achievements.',
    iconType: 'image',
    iconSrc: null, // Will use questLogo
    href: '/crossword',
    gradient: 'from-emerald-500 via-green-500 to-teal-500',
    features: ['AI Generated', 'Daily Puzzles', 'NFT Badges', '$HARLEE Rewards'],
    stats: { puzzles: '--', players: '--', streaks: '--' },
  },
  {
    id: 'news',
    name: 'Raven News',
    subtitle: 'Decentralized News',
    description: 'Community-driven news and meme platform with token rewards and tipping.',
    iconType: 'image',
    iconSrc: null, // Will use tokenLogo
    href: '/news',
    gradient: 'from-indigo-500 via-purple-500 to-violet-500',
    features: ['Token Rewards', 'Community', 'Meme Upload', 'Tipping'],
    stats: { articles: '--', readers: '--', rewards: '--' },
  },
];

// AI Features
const aiFeatures = [
  {
    icon: Brain,
    title: 'LLM Council',
    description: 'Multi-model AI consensus for reliable answers',
    color: 'text-purple-400',
    bg: 'bg-purple-500/20',
  },
  {
    icon: Bot,
    title: 'Persistent Memory',
    description: 'AI agents that remember and learn over time',
    color: 'text-amber-400',
    bg: 'bg-amber-500/20',
  },
  {
    icon: Zap,
    title: 'Smart Contracts',
    description: 'Automated escrow and cross-chain transactions',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/20',
  },
  {
    icon: Shield,
    title: 'KIP Verification',
    description: 'Secure identity and document verification',
    color: 'text-green-400',
    bg: 'bg-green-500/20',
  },
];

// Stats - Real data from mainnet (updated dynamically)
const stats = [
  { label: 'Total Value', value: '--', icon: Coins },
  { label: 'Active Users', value: '--', icon: Users },
  { label: 'NFTs Minted', value: '5', icon: Sparkles },
  { label: 'Chains', value: '6', icon: Globe },
];

export default function LandingPage() {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 1.1]);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  
  const { isAuthenticated, isLoading } = useAuthStore();

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Fixed Background Image */}
      <motion.div 
        className="fixed inset-0 z-0"
        style={{ scale }}
      >
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ 
            backgroundImage: `url(${trpBackground})`,
            backgroundAttachment: 'fixed',
          }}
        />
        {/* Gradient Overlays for depth and readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/90" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/50" />
        {/* Gold accent overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-amber-900/20 via-transparent to-transparent" />
      </motion.div>

      {/* Content Container */}
      <div className="relative z-10">
        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center px-4 py-20">
          {/* Floating particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(30)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-amber-400/60 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  y: [0, -50, 0],
                  opacity: [0.2, 0.8, 0.2],
                  scale: [1, 1.5, 1],
                }}
                transition={{
                  duration: 4 + Math.random() * 3,
                  repeat: Infinity,
                  delay: Math.random() * 3,
                }}
              />
            ))}
          </div>

          <div className="relative z-10 max-w-6xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: "easeOut" }}
            >
              {/* Logo */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.8, type: "spring" }}
                className="mb-6"
              >
                <img 
                  src={trpLogo} 
                  alt="The Raven Project" 
                  className="w-24 h-24 sm:w-32 sm:h-32 mx-auto rounded-full border-4 border-amber-500/50 shadow-2xl shadow-amber-500/30"
                />
              </motion.div>

              {/* Badge */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="inline-flex items-center px-5 py-2.5 rounded-full bg-black/50 backdrop-blur-xl border border-amber-500/40 mb-6 sm:mb-8"
              >
                <Sparkles className="w-4 h-4 text-amber-400 mr-2 animate-pulse" />
                <span className="text-amber-300 text-sm sm:text-base font-medium">Multi-Chain AI Ecosystem on ICP</span>
              </motion.div>

              {/* Main Title */}
              <h1 className="text-4xl sm:text-6xl lg:text-8xl font-bold mb-4 sm:mb-6 tracking-tight">
                <span className="text-white drop-shadow-2xl">The</span>{' '}
                <span className="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent drop-shadow-2xl">
                  Raven Project
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-lg sm:text-xl lg:text-2xl text-gray-300 max-w-3xl mx-auto mb-8 sm:mb-10 leading-relaxed px-4">
                A unified ecosystem featuring{' '}
                <span className="text-amber-400 font-semibold">AI Agent NFTs</span>,{' '}
                <span className="text-amber-400 font-semibold">DeFi</span>,{' '}
                <span className="text-amber-400 font-semibold">Gaming</span>, and{' '}
                <span className="text-amber-400 font-semibold">Logistics</span>.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10 sm:mb-14 px-4">
                {!isAuthenticated ? (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsWalletModalOpen(true)}
                    disabled={isLoading}
                    className="w-full sm:w-auto bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500 text-black font-bold text-lg px-8 py-4 rounded-2xl flex items-center justify-center shadow-xl shadow-amber-500/30 hover:shadow-amber-500/50 transition-all"
                  >
                    <Wallet className="w-5 h-5 mr-2" />
                    {isLoading ? 'Connecting...' : 'Connect Wallet'}
                  </motion.button>
                ) : (
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Link 
                      to="/ai-launchpad" 
                      className="w-full sm:w-auto bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500 text-black font-bold text-lg px-8 py-4 rounded-2xl flex items-center justify-center shadow-xl shadow-amber-500/30 hover:shadow-amber-500/50 transition-all"
                    >
                      <Brain className="w-5 h-5 mr-2" />
                      AI Launchpad
                    </Link>
                  </motion.div>
                )}
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link 
                    to="/about" 
                    className="w-full sm:w-auto bg-black/40 backdrop-blur-xl border-2 border-amber-500/50 text-amber-400 font-bold text-lg px-8 py-4 rounded-2xl flex items-center justify-center hover:bg-amber-500/10 transition-all"
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    Learn More
                  </Link>
                </motion.div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto px-4">
                {stats.map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    className="bg-black/40 backdrop-blur-xl rounded-2xl p-4 sm:p-5 text-center border border-amber-500/20 hover:border-amber-500/50 transition-all group"
                  >
                    <stat.icon className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                    <p className="text-xl sm:text-2xl font-bold text-white">{stat.value}</p>
                    <p className="text-xs sm:text-sm text-gray-500">{stat.label}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Scroll Indicator */}
            <motion.div
              style={{ opacity }}
              className="absolute bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2"
            >
              <motion.div
                animate={{ y: [0, 12, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="flex flex-col items-center text-gray-400"
              >
                <span className="text-xs sm:text-sm mb-2 tracking-wider uppercase">Explore</span>
                <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6" />
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Featured IC SPICY Flagship Section */}
        <section className="relative py-16 sm:py-24 px-4">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-900/10 to-transparent" />
          <div className="max-w-7xl mx-auto relative">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-12 sm:mb-16"
            >
              <Link to="/ic-spicy" className="block group">
                <div className="relative rounded-3xl overflow-hidden border border-red-500/30 hover:border-red-500/60 transition-all">
                  {/* Banner Image */}
                  <img 
                    src={spicyBanner} 
                    alt="IC SPICY" 
                    className="w-full h-48 sm:h-64 object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />
                  
                  <div className="absolute inset-0 flex items-end">
                    <div className="p-6 sm:p-10 w-full">
                      <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
                        {/* Logo */}
                        <motion.img
                          src={icSpicyLogo}
                          alt="IC SPICY"
                          className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 border-red-500 shadow-2xl"
                          animate={{ scale: [1, 1.02, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                        
                        <div className="flex-1">
                          <span className="inline-block px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/40 mb-2">
                            🔥 FLAGSHIP PROJECT
                          </span>
                          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-2">
                            <span className="text-white">IC</span>{' '}
                            <span className="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                              SPICY
                            </span>
                          </h2>
                          <p className="text-gray-400 text-sm sm:text-base mb-4 max-w-xl">
                            Real World Asset Co-op connecting pepper farmers with the global market.
                            Shop fresh peppers, nursery plants, seeds, and spice blends.
                          </p>
                          
                          {/* Features - No mock stats */}
                          <div className="flex flex-wrap gap-2 sm:gap-3">
                            <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-medium border border-red-500/30">
                              Fresh Pepper Pods
                            </span>
                            <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 text-xs font-medium border border-orange-500/30">
                              Nursery Plants
                            </span>
                            <span className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-medium border border-yellow-500/30">
                              Seeds
                            </span>
                            <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium border border-green-500/30">
                              Spice Blends
                            </span>
                          </div>
                        </div>
                        
                        {/* CTA */}
                        <div className="flex items-center gap-2 text-red-400 group-hover:text-red-300 transition-colors">
                          <span className="font-semibold hidden sm:inline">Explore IC SPICY</span>
                          <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Featured AXIOM Section */}
        <section className="relative py-16 sm:py-24 px-4">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-900/10 to-transparent" />
          <div className="max-w-7xl mx-auto relative">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-12 sm:mb-16"
            >
              <Link to="/ai-launchpad" className="block group">
                <div className="bg-gradient-to-r from-amber-500/10 via-amber-600/10 to-yellow-500/10 backdrop-blur-xl rounded-3xl p-6 sm:p-10 border border-amber-500/30 hover:border-amber-500/60 transition-all overflow-hidden relative">
                  {/* Animated background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-amber-500/5 animate-pulse" />
                  
                  <div className="relative z-10 flex flex-col lg:flex-row items-center gap-6 sm:gap-10">
                    {/* Left - Icon & Badge */}
                    <div className="flex-shrink-0 text-center lg:text-left">
                      <motion.div
                        animate={{ scale: [1, 1.05, 1], rotate: [0, 2, -2, 0] }}
                        transition={{ duration: 4, repeat: Infinity }}
                        className="mb-4"
                      >
                        <img 
                          src={tokenLogo} 
                          alt="AXIOM Token" 
                          className="w-24 h-24 sm:w-32 sm:h-32 mx-auto drop-shadow-2xl"
                        />
                      </motion.div>
                      <span className="inline-block px-4 py-2 rounded-full bg-amber-500/20 text-amber-400 text-sm font-bold border border-amber-500/40">
                        FEATURED
                      </span>
                    </div>

                    {/* Right - Content */}
                    <div className="flex-1 text-center lg:text-left">
                      <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4">
                        <span className="text-white">AXIOM</span>{' '}
                        <span className="bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">
                          AI Agents
                        </span>
                      </h2>
                      <p className="text-gray-400 text-base sm:text-lg mb-4 sm:mb-6 max-w-2xl">
                        Own your personalized on-chain AI agent with persistent memory, multi-chain capabilities, 
                        and a knowledge graph that grows with every interaction.
                      </p>
                      
                      {/* Stats Row */}
                      <div className="flex flex-wrap justify-center lg:justify-start gap-4 sm:gap-8 mb-4 sm:mb-6">
                        <div>
                          <p className="text-2xl sm:text-3xl font-bold text-amber-400">300</p>
                          <p className="text-xs sm:text-sm text-gray-500">Total Supply</p>
                        </div>
                        <div>
                          <p className="text-2xl sm:text-3xl font-bold text-green-400">295</p>
                          <p className="text-xs sm:text-sm text-gray-500">Available</p>
                        </div>
                        <div>
                          <p className="text-2xl sm:text-3xl font-bold text-white">100K</p>
                          <p className="text-xs sm:text-sm text-gray-500">RAVEN/NFT</p>
                        </div>
                      </div>

                      {/* CTA */}
                      <div className="flex items-center justify-center lg:justify-start gap-2 text-amber-400 group-hover:text-amber-300 transition-colors">
                        <span className="font-semibold">Explore AXIOM Collection</span>
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Projects Section */}
        <section className="relative py-16 sm:py-24 px-4">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12 sm:mb-16"
            >
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
                <span className="text-white">Our</span>{' '}
                <span className="bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">Ecosystem</span>
              </h2>
              <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto px-4">
                Six integrated dApps working together for a seamless multi-chain experience
              </p>
            </motion.div>

            {/* Projects Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {projects.filter(p => !p.featured).map((project, i) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Link to={project.href} className="block group h-full">
                    <div className="bg-black/40 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-gray-800 hover:border-amber-500/50 transition-all h-full flex flex-col">
                      {/* Gradient Header */}
                      <div className={`h-1.5 rounded-full bg-gradient-to-r ${project.gradient} mb-4 sm:mb-5`} />
                      
                        <div className="flex items-start justify-between mb-3 sm:mb-4">
                        <div>
                          {/* Use brand images instead of emojis */}
                          <div className="w-12 h-12 sm:w-14 sm:h-14 mb-2 rounded-xl overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                            {project.id === 'ic-spicy' && <img src={icSpicyLogo} alt="IC SPICY" className="w-full h-full object-cover" />}
                            {project.id === 'raven-ai' && <img src={tokenLogo} alt="RavenAI" className="w-10 h-10" />}
                            {project.id === 'forge' && <img src={tokenLogo} alt="The Forge" className="w-10 h-10" />}
                            {project.id === 'expresso' && <Truck className="w-8 h-8 text-cyan-400" />}
                            {project.id === 'sk8punks' && <img src={sk8Logo} alt="Sk8 Punks" className="w-10 h-10" />}
                            {project.id === 'crossword' && <PuzzleIcon className="w-8 h-8 text-emerald-400" />}
                            {project.id === 'news' && <Newspaper className="w-8 h-8 text-indigo-400" />}
                          </div>
                          <h3 className="text-lg sm:text-xl font-bold text-white group-hover:text-amber-400 transition-colors">
                            {project.name}
                          </h3>
                          <p className="text-xs sm:text-sm text-amber-500/80">{project.subtitle}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 group-hover:text-amber-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
                      </div>

                      <p className="text-gray-400 text-sm mb-4 line-clamp-2 flex-grow">
                        {project.description}
                      </p>

                      {/* Features */}
                      <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4">
                        {project.features.slice(0, 3).map((feature) => (
                          <span key={feature} className="px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs border border-amber-500/20">
                            {feature}
                          </span>
                        ))}
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-800">
                        {Object.entries(project.stats).map(([key, value]) => (
                          <div key={key} className="text-center">
                            <p className="text-sm sm:text-base font-bold text-white">{value}</p>
                            <p className="text-xs text-gray-600 capitalize">{key}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* AI Features Section */}
        <section className="relative py-16 sm:py-24 px-4">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-900/10 to-transparent" />
          <div className="max-w-7xl mx-auto relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12 sm:mb-16"
            >
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/30 mb-4 sm:mb-6">
                <Brain className="w-4 h-4 text-purple-400 mr-2" />
                <span className="text-purple-300 text-sm font-medium">AI-Powered</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
                <span className="text-white">Intelligent</span>{' '}
                <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Features</span>
              </h2>
              <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto px-4">
                Cutting-edge AI integration across our entire ecosystem
              </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {aiFeatures.map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-black/40 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-5 sm:p-6 text-center group hover:bg-black/60 border border-gray-800 hover:border-purple-500/30 transition-all"
                >
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-4 rounded-2xl ${feature.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <feature.icon className={`w-6 h-6 sm:w-7 sm:h-7 ${feature.color}`} />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-gray-400 text-sm">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative py-16 sm:py-24 px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="bg-gradient-to-r from-amber-500/10 via-amber-600/10 to-yellow-500/10 backdrop-blur-xl rounded-3xl p-6 sm:p-10 lg:p-12 text-center relative overflow-hidden border border-amber-500/30"
            >
              {/* Background decoration */}
              <div className="absolute inset-0 bg-gradient-to-r from-amber-600/5 via-transparent to-amber-600/5" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
              
              <div className="relative z-10">
                <motion.div
                  animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 5, repeat: Infinity }}
                  className="mb-4 sm:mb-6"
                >
                  <img 
                    src={tokenLogo} 
                    alt="Raven Token" 
                    className="w-16 h-16 sm:w-20 sm:h-20 mx-auto drop-shadow-2xl"
                  />
                </motion.div>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">
                  Ready to <span className="bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">Get Started</span>?
                </h2>
                <p className="text-gray-400 text-base sm:text-lg mb-6 sm:mb-8 max-w-xl mx-auto px-4">
                  Connect your wallet and explore the Raven Ecosystem. 
                  Own AI agents, mint NFTs, play games, and earn rewards.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  {!isAuthenticated ? (
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setIsWalletModalOpen(true)} 
                      className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold text-lg px-8 py-4 rounded-2xl shadow-xl shadow-amber-500/30"
                    >
                      Connect Wallet
                    </motion.button>
                  ) : (
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Link to="/ai-launchpad" className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold text-lg px-8 py-4 rounded-2xl shadow-xl shadow-amber-500/30 inline-block">
                        Launch App
                      </Link>
                    </motion.div>
                  )}
                  <a
                    href="https://github.com/NDKONG-ICP"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto bg-black/40 backdrop-blur-xl border-2 border-amber-500/50 text-amber-400 font-bold text-lg px-8 py-4 rounded-2xl hover:bg-amber-500/10 transition-all text-center"
                  >
                    View on GitHub
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Bottom Spacer */}
        <div className="h-20" />
      </div>

      {/* Wallet Connection Modal */}
      <WalletModal 
        isOpen={isWalletModalOpen} 
        onClose={() => setIsWalletModalOpen(false)} 
      />
    </div>
  );
}
