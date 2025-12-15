import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Truck, 
  Package, 
  MapPin, 
  Users, 
  Bot,
  Shield,
  QrCode,
  Wallet,
  ArrowRight,
  Zap,
  FileText
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

const features = [
  {
    icon: Bot,
    title: 'AI Route Optimization',
    description: 'Real-time traffic and weather analysis for optimal routes',
    href: '/expresso/loads',
  },
  {
    icon: QrCode,
    title: 'NFT Escrow',
    description: 'ICRC-7 NFT shipment records with QR verification',
    href: '/expresso/tracking',
  },
  {
    icon: Shield,
    title: 'KIP Verification',
    description: 'Secure driver onboarding with document verification',
    href: '/expresso/drivers',
  },
  {
    icon: FileText,
    title: 'ASE Manuals',
    description: 'Comprehensive service manuals for top 20 US semi trucks',
    href: '/expresso/manuals',
  },
];

const stats = [
  { label: 'Active Loads', value: '500+', icon: Package },
  { label: 'Verified Drivers', value: '100+', icon: Users },
  { label: 'Routes Optimized', value: '2K+', icon: MapPin },
  { label: 'Fuel Saved', value: '30%', icon: Zap },
];

const roles = [
  {
    title: 'Shipper',
    description: 'Post loads and track shipments',
    features: ['Post loads', 'Track deliveries', 'Manage payments'],
    color: 'from-blue-500 to-indigo-600',
  },
  {
    title: 'Driver',
    description: 'Find loads and deliver',
    features: ['Browse loads', 'Bid on shipments', 'GPS tracking'],
    color: 'from-green-500 to-emerald-600',
  },
  {
    title: 'Warehouse',
    description: 'Confirm deliveries',
    features: ['Scan QR codes', 'Confirm receipt', 'Release payments'],
    color: 'from-purple-500 to-pink-600',
  },
];

export default function ExpressoHome() {
  const { isAuthenticated, login, isLoading } = useAuthStore();

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16"
      >
        <div className="relative w-32 h-32 mx-auto mb-8">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 bg-gradient-to-t from-logistics-blue to-logistics-teal rounded-3xl opacity-30 blur-xl"
          />
          <div className="relative w-full h-full bg-gradient-to-br from-raven-dark to-raven-charcoal rounded-3xl border border-logistics-blue/30 flex items-center justify-center">
            <Truck className="w-16 h-16 text-logistics-blue" />
          </div>
        </div>

        <h1 className="text-5xl sm:text-6xl font-display font-bold mb-4">
          <span className="text-white">Expresso</span>{' '}
          <span className="bg-gradient-to-r from-logistics-blue to-logistics-teal bg-clip-text text-transparent">
            Logistics
          </span>
        </h1>
        <p className="text-xl text-silver-400 max-w-2xl mx-auto mb-8">
          AI-powered decentralized logistics platform with NFT shipment records,
          real-time tracking, and secure escrow payments.
        </p>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {isAuthenticated ? (
            <Link
              to="/expresso/loads"
              className="px-8 py-4 bg-gradient-to-r from-logistics-blue to-logistics-teal hover:from-logistics-teal hover:to-logistics-blue text-white font-bold rounded-xl shadow-lg transition-all flex items-center"
            >
              <Package className="w-5 h-5 mr-2" />
              Browse Loads
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          ) : (
            <button
              onClick={login}
              disabled={isLoading}
              className="px-8 py-4 bg-gradient-to-r from-logistics-blue to-logistics-teal text-white font-bold rounded-xl shadow-lg transition-all flex items-center"
            >
              <Wallet className="w-5 h-5 mr-2" />
              {isLoading ? 'Connecting...' : 'Get Started'}
            </button>
          )}
          <Link
            to="/expresso/manuals"
            className="px-8 py-4 border-2 border-logistics-blue/50 text-logistics-blue hover:bg-logistics-blue/10 font-bold rounded-xl transition-all flex items-center"
          >
            <FileText className="w-5 h-5 mr-2" />
            ASE Manuals
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
            className="glass rounded-2xl p-6 text-center border border-logistics-blue/20 hover:border-logistics-blue/40 transition-all"
          >
            <stat.icon className="w-8 h-8 text-logistics-blue mx-auto mb-3" />
            <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
            <p className="text-sm text-silver-500">{stat.label}</p>
          </div>
        ))}
      </motion.div>

      {/* User Roles */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-16"
      >
        <h2 className="text-3xl font-display font-bold text-center mb-8">
          <span className="text-white">Choose Your</span>{' '}
          <span className="text-logistics-blue">Role</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {roles.map((role, i) => (
            <motion.div
              key={role.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className="glass rounded-2xl overflow-hidden border border-logistics-blue/20 hover:border-logistics-blue/40 transition-all"
            >
              <div className={`h-2 bg-gradient-to-r ${role.color}`} />
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-2">{role.title}</h3>
                <p className="text-silver-400 text-sm mb-4">{role.description}</p>
                <ul className="space-y-2">
                  {role.features.map((feature) => (
                    <li key={feature} className="flex items-center text-sm text-silver-300">
                      <Zap className="w-4 h-4 text-logistics-teal mr-2" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Features */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mb-16"
      >
        <h2 className="text-3xl font-display font-bold text-center mb-8">
          <span className="text-white">Platform</span>{' '}
          <span className="text-logistics-blue">Features</span>
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
                transition={{ delay: 0.6 + i * 0.1 }}
                className="glass rounded-2xl p-6 h-full border border-logistics-blue/10 hover:border-logistics-blue/40 hover:bg-logistics-blue/5 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-logistics-blue/20 to-logistics-teal/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6 text-logistics-blue" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-logistics-blue transition-colors">
                  {feature.title}
                </h3>
                <p className="text-silver-400 text-sm">{feature.description}</p>
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* ASE Manuals Preview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="glass rounded-3xl p-8 border border-logistics-blue/20"
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex-1">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-logistics-blue/20 text-logistics-blue text-sm font-medium mb-4">
              <FileText className="w-4 h-4 mr-2" />
              Featured
            </div>
            <h2 className="text-3xl font-display font-bold mb-4">
              <span className="text-white">ASE Service</span>{' '}
              <span className="text-logistics-blue">Manuals</span>
            </h2>
            <p className="text-silver-400 mb-6">
              Comprehensive service and repair manuals with static diagrams
              for the top 20 US semi trucks. Professional documentation for
              fleet maintenance.
            </p>
            <Link
              to="/expresso/manuals"
              className="inline-flex items-center text-logistics-blue hover:text-logistics-teal transition-colors font-semibold"
            >
              Browse Manuals
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
          <div className="flex-1 grid grid-cols-3 gap-3">
            {['Freightliner', 'Peterbilt', 'Kenworth', 'Volvo', 'Mack', 'International'].map((brand) => (
              <div
                key={brand}
                className="aspect-square rounded-xl bg-gradient-to-br from-logistics-blue/10 to-logistics-teal/10 border border-logistics-blue/20 flex items-center justify-center p-4"
              >
                <span className="text-sm text-silver-400 text-center">{brand}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}






