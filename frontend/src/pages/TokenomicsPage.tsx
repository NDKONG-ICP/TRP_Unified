import { motion } from 'framer-motion';
import { Coins, PieChart, TrendingUp, Lock, Users, Zap, ArrowRight, Gamepad2, Newspaper, Puzzle, Layers, Gift, Flame } from 'lucide-react';
import { Link } from 'react-router-dom';

// $HARLEE Token Info
const HARLEE_TOKEN = {
  name: 'HARLEE',
  symbol: '$HARLEE',
  decimals: 8,
  totalSupply: '100,000,000',
  ledger: 'tlm4l-kaaaa-aaaah-qqeha-cai',
  index: '5ipsq-2iaaa-aaaae-qffka-cai',
};

const tokenDistribution = [
  { name: 'Community & Rewards', percentage: 40, color: 'bg-gold-500', amount: '40,000,000' },
  { name: 'Development', percentage: 20, color: 'bg-blue-500', amount: '20,000,000' },
  { name: 'Team & Advisors', percentage: 15, color: 'bg-purple-500', amount: '15,000,000' },
  { name: 'Treasury', percentage: 15, color: 'bg-green-500', amount: '15,000,000' },
  { name: 'Liquidity', percentage: 10, color: 'bg-orange-500', amount: '10,000,000' },
];

const rewardMechanics = [
  {
    icon: Layers,
    title: 'NFT Staking',
    description: 'Stake Sk8 Punks NFTs to earn $HARLEE rewards',
    reward: '100 $HARLEE/week',
    multipliers: [
      { rarity: 'Common', mult: '1x' },
      { rarity: 'Rare', mult: '1.5x' },
      { rarity: 'Epic', mult: '2x' },
      { rarity: 'Legendary', mult: '3x' },
    ],
  },
  {
    icon: Gamepad2,
    title: 'Sk8 Punks Game',
    description: 'Earn rewards through gameplay achievements',
    reward: 'Variable',
    details: 'Score-based rewards, tournament prizes',
  },
  {
    icon: Puzzle,
    title: 'Crossword Quest',
    description: 'Complete daily puzzles to earn tokens',
    reward: '1 $HARLEE/puzzle',
    details: 'Streak bonuses, difficulty multipliers',
  },
  {
    icon: Newspaper,
    title: 'Raven News',
    description: 'Create content and engage to earn',
    reward: 'Community tips',
    details: 'Article rewards, meme competitions',
  },
];

const utilities = [
  {
    icon: Zap,
    title: 'Platform Fees',
    description: 'Pay reduced fees with $HARLEE across all ecosystem apps',
  },
  {
    icon: Users,
    title: 'Governance',
    description: 'Vote on proposals and ecosystem decisions',
  },
  {
    icon: Lock,
    title: 'Staking Rewards',
    description: 'Earn 100 $HARLEE/week per staked NFT',
  },
  {
    icon: TrendingUp,
    title: 'Premium Features',
    description: 'Access RavenAI, AXIOM agents, and premium content',
  },
  {
    icon: Gift,
    title: 'NFT Purchases',
    description: 'Buy AXIOM Genesis NFTs and ecosystem items',
  },
  {
    icon: Flame,
    title: 'IC SPICY Co-op',
    description: 'Participate in real-world asset farming',
  },
];

export default function TokenomicsPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16"
      >
        <div className="inline-flex items-center px-4 py-2 rounded-full bg-gold-500/10 border border-gold-500/30 mb-6">
          <Coins className="w-4 h-4 text-gold-400 mr-2" />
          <span className="text-gold-300 text-sm font-medium">$HARLEE Token Economics</span>
        </div>
        <h1 className="text-5xl font-display font-bold mb-4">
          <span className="text-white">$HARLEE</span>{' '}
          <span className="text-gradient-gold">Tokenomics</span>
        </h1>
        <p className="text-xl text-silver-400 max-w-2xl mx-auto mb-8">
          The utility token powering the entire Raven Ecosystem
        </p>
        
        {/* Token Quick Stats */}
        <div className="flex flex-wrap justify-center gap-4">
          <div className="px-4 py-2 rounded-lg bg-raven-dark border border-gold-500/20">
            <span className="text-silver-500 text-sm">Total Supply:</span>{' '}
            <span className="text-gold-400 font-bold">{HARLEE_TOKEN.totalSupply}</span>
          </div>
          <div className="px-4 py-2 rounded-lg bg-raven-dark border border-gold-500/20">
            <span className="text-silver-500 text-sm">Decimals:</span>{' '}
            <span className="text-gold-400 font-bold">{HARLEE_TOKEN.decimals}</span>
          </div>
          <div className="px-4 py-2 rounded-lg bg-raven-dark border border-gold-500/20">
            <span className="text-silver-500 text-sm">Standard:</span>{' '}
            <span className="text-gold-400 font-bold">ICRC-1</span>
          </div>
        </div>
      </motion.div>

      {/* Token Contract Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass-gold rounded-2xl p-6 mb-12"
      >
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Coins className="w-5 h-5 text-gold-400" />
          Token Contract Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-raven-dark rounded-xl">
            <p className="text-silver-500 text-sm mb-1">Ledger Canister</p>
            <code className="text-gold-300 font-mono text-sm break-all">{HARLEE_TOKEN.ledger}</code>
          </div>
          <div className="p-4 bg-raven-dark rounded-xl">
            <p className="text-silver-500 text-sm mb-1">Index Canister</p>
            <code className="text-gold-300 font-mono text-sm break-all">{HARLEE_TOKEN.index}</code>
          </div>
        </div>
      </motion.div>

      {/* Token Distribution */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-gold rounded-3xl p-8 mb-12"
      >
        <h2 className="text-2xl font-display font-bold text-white mb-8 text-center">
          Token Distribution
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Chart Placeholder */}
          <div className="relative aspect-square max-w-sm mx-auto">
            <div className="absolute inset-0 rounded-full border-8 border-raven-dark" />
            {tokenDistribution.map((item, i) => {
              const rotation = tokenDistribution.slice(0, i).reduce((acc, curr) => acc + curr.percentage * 3.6, 0);
              return (
                <div
                  key={item.name}
                  className={`absolute inset-4 rounded-full ${item.color}`}
                  style={{
                    clipPath: `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.sin((rotation + item.percentage * 3.6) * Math.PI / 180)}% ${50 - 50 * Math.cos((rotation + item.percentage * 3.6) * Math.PI / 180)}%)`,
                    transform: `rotate(${rotation}deg)`,
                    opacity: 0.8,
                  }}
                />
              );
            })}
            <div className="absolute inset-12 rounded-full bg-raven-charcoal flex items-center justify-center">
              <div className="text-center">
                <p className="text-3xl font-bold text-gold-400">100M</p>
                <p className="text-sm text-silver-500">$HARLEE</p>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="space-y-4">
            {tokenDistribution.map((item) => (
              <div key={item.name} className="flex items-center gap-4">
                <div className={`w-4 h-4 rounded-full ${item.color}`} />
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-white font-medium">{item.name}</span>
                    <div className="text-right">
                      <span className="text-gold-400 font-bold">{item.percentage}%</span>
                      <span className="text-silver-500 text-sm ml-2">({item.amount})</span>
                    </div>
                  </div>
                  <div className="h-2 bg-raven-dark rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.percentage}%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                      className={`h-full ${item.color} rounded-full`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Reward Mechanics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mb-12"
      >
        <h2 className="text-2xl font-display font-bold text-white mb-8 text-center">
          How to Earn $HARLEE
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {rewardMechanics.map((mechanic, i) => (
            <motion.div
              key={mechanic.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="glass-gold rounded-2xl p-6"
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-gold-500/20 flex items-center justify-center flex-shrink-0">
                  <mechanic.icon className="w-7 h-7 text-gold-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-white">{mechanic.title}</h3>
                    <span className="text-gold-400 font-bold text-sm bg-gold-500/10 px-2 py-1 rounded">
                      {mechanic.reward}
                    </span>
                  </div>
                  <p className="text-silver-400 text-sm mb-3">{mechanic.description}</p>
                  
                  {mechanic.multipliers && (
                    <div className="flex flex-wrap gap-2">
                      {mechanic.multipliers.map((m) => (
                        <span key={m.rarity} className="text-xs px-2 py-1 rounded bg-raven-dark text-silver-300">
                          {m.rarity}: <span className="text-gold-400">{m.mult}</span>
                        </span>
                      ))}
                    </div>
                  )}
                  {mechanic.details && !mechanic.multipliers && (
                    <p className="text-xs text-silver-500">{mechanic.details}</p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Token Utility */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-12"
      >
        <h2 className="text-2xl font-display font-bold text-white mb-8 text-center">
          Token Utility
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {utilities.map((utility, i) => (
            <motion.div
              key={utility.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              className="glass-gold rounded-2xl p-6"
            >
              <div className="w-12 h-12 mb-4 rounded-xl bg-gold-500/20 flex items-center justify-center">
                <utility.icon className="w-6 h-6 text-gold-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{utility.title}</h3>
              <p className="text-silver-400 text-sm">{utility.description}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Revenue Streams */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-gold rounded-3xl p-8 mb-12"
      >
        <h2 className="text-2xl font-display font-bold text-white mb-6">
          Revenue Streams & Fee Distribution
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-raven-dark rounded-2xl">
            <h3 className="text-lg font-bold text-gold-400 mb-2">NFT Minting</h3>
            <p className="text-silver-400 text-sm mb-4">
              3% fee on all NFT mints across The Forge platform
            </p>
            <p className="text-2xl font-bold text-white">3%</p>
          </div>
          <div className="p-6 bg-raven-dark rounded-2xl">
            <h3 className="text-lg font-bold text-gold-400 mb-2">Logistics</h3>
            <p className="text-silver-400 text-sm mb-4">
              3% platform fee on completed shipments via Expresso
            </p>
            <p className="text-2xl font-bold text-white">3%</p>
          </div>
          <div className="p-6 bg-raven-dark rounded-2xl">
            <h3 className="text-lg font-bold text-gold-400 mb-2">Gaming & AI</h3>
            <p className="text-silver-400 text-sm mb-4">
              5% fee on in-game purchases, AI subscriptions, and premium features
            </p>
            <p className="text-2xl font-bold text-white">5%</p>
          </div>
        </div>
        <div className="mt-6 p-4 bg-raven-charcoal rounded-xl">
          <p className="text-silver-400 text-sm">
            <span className="text-gold-400 font-bold">Treasury Allocation:</span> All fees are distributed as follows: 
            50% to staking rewards pool, 30% to development fund, 20% to community treasury for governance proposals.
          </p>
        </div>
      </motion.div>

      {/* Staking APY Calculator */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="glass-gold rounded-3xl p-8 mb-12"
      >
        <h2 className="text-2xl font-display font-bold text-white mb-6 text-center">
          Staking Rewards Calculator
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { nfts: 1, weekly: 100, monthly: 400, yearly: 5200 },
            { nfts: 5, weekly: 500, monthly: 2000, yearly: 26000 },
            { nfts: 10, weekly: 1000, monthly: 4000, yearly: 52000 },
            { nfts: 25, weekly: 2500, monthly: 10000, yearly: 130000 },
          ].map((calc) => (
            <div key={calc.nfts} className="p-6 bg-raven-dark rounded-2xl text-center">
              <p className="text-3xl font-bold text-gold-400 mb-2">{calc.nfts}</p>
              <p className="text-silver-500 text-sm mb-4">Staked NFTs</p>
              <div className="space-y-2 text-sm">
                <p className="text-silver-400">
                  Weekly: <span className="text-white font-bold">{calc.weekly.toLocaleString()}</span>
                </p>
                <p className="text-silver-400">
                  Monthly: <span className="text-white font-bold">{calc.monthly.toLocaleString()}</span>
                </p>
                <p className="text-silver-400">
                  Yearly: <span className="text-gold-400 font-bold">{calc.yearly.toLocaleString()}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-center text-silver-500 text-sm mt-4">
          * Calculated at base rate of 100 $HARLEE/week. Rare, Epic, and Legendary NFTs earn 1.5x, 2x, and 3x respectively.
        </p>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-center"
      >
        <p className="text-silver-400 mb-6">
          Start earning $HARLEE today by staking NFTs, playing games, or creating content!
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/sk8-punks" className="btn-gold flex items-center">
            Start Staking
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
          <Link to="/crossword" className="btn-outline-gold">
            Play Crossword
          </Link>
          <Link to="/news" className="btn-outline-gold">
            Create Content
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
