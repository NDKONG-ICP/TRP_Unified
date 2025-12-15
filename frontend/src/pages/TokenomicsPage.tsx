import { motion } from 'framer-motion';
import { Coins, PieChart, TrendingUp, Lock, Users, Zap, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const tokenDistribution = [
  { name: 'Community & Rewards', percentage: 40, color: 'bg-gold-500' },
  { name: 'Development', percentage: 20, color: 'bg-blue-500' },
  { name: 'Team & Advisors', percentage: 15, color: 'bg-purple-500' },
  { name: 'Treasury', percentage: 15, color: 'bg-green-500' },
  { name: 'Liquidity', percentage: 10, color: 'bg-orange-500' },
];

const utilities = [
  {
    icon: Zap,
    title: 'Platform Fees',
    description: 'Reduced fees when paying with native token',
  },
  {
    icon: Users,
    title: 'Governance',
    description: 'Vote on platform decisions and proposals',
  },
  {
    icon: Lock,
    title: 'Staking Rewards',
    description: 'Earn yield by staking tokens',
  },
  {
    icon: TrendingUp,
    title: 'Premium Features',
    description: 'Access exclusive features and early releases',
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
          <span className="text-gold-300 text-sm font-medium">Token Economics</span>
        </div>
        <h1 className="text-5xl font-display font-bold mb-4">
          <span className="text-white">Raven</span>{' '}
          <span className="text-gradient-gold">Tokenomics</span>
        </h1>
        <p className="text-xl text-silver-400 max-w-2xl mx-auto">
          Powering the Raven Ecosystem with sustainable token economics
        </p>
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
                <p className="text-sm text-silver-500">Total Supply</p>
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
                    <span className="text-gold-400 font-bold">{item.percentage}%</span>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {utilities.map((utility, i) => (
            <motion.div
              key={utility.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="glass-gold rounded-2xl p-6 text-center"
            >
              <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-gold-500/20 flex items-center justify-center">
                <utility.icon className="w-7 h-7 text-gold-400" />
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
          Revenue Streams
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
            <h3 className="text-lg font-bold text-gold-400 mb-2">Gaming</h3>
            <p className="text-silver-400 text-sm mb-4">
              5% fee on in-game purchases and tournament entries
            </p>
            <p className="text-2xl font-bold text-white">5%</p>
          </div>
        </div>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-center"
      >
        <p className="text-silver-400 mb-6">
          Token launch coming soon. Join our community to stay updated.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/" className="btn-gold flex items-center">
            Explore Ecosystem
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
          <a
            href="https://x.com/icspicyrwa"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline-gold"
          >
            Follow Updates
          </a>
        </div>
      </motion.div>
    </div>
  );
}






