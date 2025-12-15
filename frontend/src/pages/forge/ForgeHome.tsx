import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Flame, 
  Palette, 
  Layers, 
  QrCode, 
  Wallet,
  ArrowRight,
  Sparkles,
  Globe,
  Shield,
  Zap
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

const features = [
  {
    icon: Palette,
    title: 'Generative Art',
    description: 'AI-powered layer composition with rarity calculation',
    href: '/forge/mint',
  },
  {
    icon: Globe,
    title: 'Multi-Chain',
    description: 'ICP, EVM, BTC, SOL - mint across chains',
    href: '/forge/mint',
  },
  {
    icon: Layers,
    title: 'ICRC-7/ICRC-37',
    description: 'Full NFT standard compliance with EXT support',
    href: '/forge/collection',
  },
  {
    icon: QrCode,
    title: 'QR Claims',
    description: 'Unique QR codes for NFT claiming after purchase',
    href: '/forge/claim',
  },
];

const stats = [
  { label: 'Total NFTs', value: '1,000', icon: Layers },
  { label: 'Unique Traits', value: '50+', icon: Sparkles },
  { label: 'Chains', value: '5', icon: Globe },
  { label: 'Rarity Tiers', value: '5', icon: Shield },
];

export default function ForgeHome() {
  const { isAuthenticated, login, isLoading } = useAuthStore();

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16"
      >
        {/* Animated Anvil Icon */}
        <div className="relative w-32 h-32 mx-auto mb-8">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 bg-gradient-to-t from-spicy-red via-spicy-orange to-spicy-flame rounded-3xl opacity-30 blur-xl"
          />
          <div className="relative w-full h-full bg-gradient-to-br from-raven-dark to-raven-charcoal rounded-3xl border border-spicy-orange/30 flex items-center justify-center">
            <Flame className="w-16 h-16 text-spicy-flame animate-pulse" />
          </div>
        </div>

        <h1 className="text-5xl sm:text-6xl font-display font-bold mb-4">
          <span className="text-white">The</span>{' '}
          <span className="bg-gradient-to-r from-spicy-red via-spicy-orange to-spicy-flame bg-clip-text text-transparent">
            Forge
          </span>
        </h1>
        <p className="text-xl text-silver-400 max-w-2xl mx-auto mb-8">
          IC Spicy RWA NFT Minter - Where digital art meets real-world assets.
          Generative NFTs with multi-chain support.
        </p>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {isAuthenticated ? (
            <Link
              to="/forge/mint"
              className="px-8 py-4 bg-gradient-to-r from-spicy-red to-spicy-orange hover:from-spicy-orange hover:to-spicy-flame text-white font-bold rounded-xl shadow-lg hover:shadow-spicy-orange/30 transition-all flex items-center"
            >
              <Palette className="w-5 h-5 mr-2" />
              Start Minting
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          ) : (
            <button
              onClick={login}
              disabled={isLoading}
              className="px-8 py-4 bg-gradient-to-r from-spicy-red to-spicy-orange hover:from-spicy-orange hover:to-spicy-flame text-white font-bold rounded-xl shadow-lg transition-all flex items-center"
            >
              <Wallet className="w-5 h-5 mr-2" />
              {isLoading ? 'Connecting...' : 'Connect to Mint'}
            </button>
          )}
          <Link
            to="/forge/collection"
            className="px-8 py-4 border-2 border-spicy-orange/50 text-spicy-orange hover:bg-spicy-orange/10 font-bold rounded-xl transition-all flex items-center"
          >
            <Layers className="w-5 h-5 mr-2" />
            View Collection
          </Link>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16"
      >
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="glass rounded-2xl p-6 text-center border border-spicy-orange/20 hover:border-spicy-orange/40 transition-all"
          >
            <stat.icon className="w-8 h-8 text-spicy-orange mx-auto mb-3" />
            <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
            <p className="text-sm text-silver-500">{stat.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Features */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-16"
      >
        <h2 className="text-3xl font-display font-bold text-center mb-8">
          <span className="text-white">Forge</span>{' '}
          <span className="text-spicy-orange">Features</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, i) => (
            <Link
              key={feature.title}
              to={feature.href}
              className="group"
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="glass rounded-2xl p-6 h-full border border-spicy-orange/10 hover:border-spicy-orange/40 hover:bg-spicy-orange/5 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-spicy-red/20 to-spicy-orange/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6 text-spicy-orange" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-spicy-orange transition-colors">
                  {feature.title}
                </h3>
                <p className="text-silver-400 text-sm">{feature.description}</p>
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Collection Preview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass rounded-3xl p-8 border border-spicy-orange/20"
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex-1">
            <h2 className="text-3xl font-display font-bold mb-4">
              <span className="text-white">IC Spicy</span>{' '}
              <span className="text-spicy-orange">Collection</span>
            </h2>
            <p className="text-silver-400 mb-6">
              1,000 unique generative NFTs with real-world asset backing.
              Each NFT comes with a QR code for claiming after product purchase.
            </p>
            <ul className="space-y-2 mb-6">
              <li className="flex items-center text-silver-300">
                <Zap className="w-4 h-4 text-spicy-orange mr-2" />
                10 unique layer categories
              </li>
              <li className="flex items-center text-silver-300">
                <Zap className="w-4 h-4 text-spicy-orange mr-2" />
                50+ individual traits
              </li>
              <li className="flex items-center text-silver-300">
                <Zap className="w-4 h-4 text-spicy-orange mr-2" />
                5 rarity tiers
              </li>
              <li className="flex items-center text-silver-300">
                <Zap className="w-4 h-4 text-spicy-orange mr-2" />
                Multi-chain custody
              </li>
            </ul>
            <Link
              to="/forge/collection"
              className="inline-flex items-center text-spicy-orange hover:text-spicy-flame transition-colors font-semibold"
            >
              Explore Collection
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
          <div className="flex-1 grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="aspect-square rounded-xl bg-gradient-to-br from-spicy-red/20 to-spicy-orange/20 border border-spicy-orange/20 flex items-center justify-center"
              >
                <span className="text-3xl">🌶️</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}






