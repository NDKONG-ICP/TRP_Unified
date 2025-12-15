import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Flame, 
  Upload, 
  Palette, 
  Wallet, 
  Settings, 
  Gift,
  QrCode,
  Layers,
  Sparkles
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import ForgeHome from './ForgeHome';
import MintPage from './MintPage';
import CollectionPage from './CollectionPage';
import WalletPage from './WalletPage';
import ClaimPage from './ClaimPage';
import AdminPage from './AdminPage';

const forgeNav = [
  { name: 'Home', href: '/forge', icon: Flame },
  { name: 'Mint', href: '/forge/mint', icon: Palette },
  { name: 'Collection', href: '/forge/collection', icon: Layers },
  { name: 'Wallet', href: '/forge/wallet', icon: Wallet },
  { name: 'Claim', href: '/forge/claim', icon: QrCode },
];

export default function ForgePage() {
  const location = useLocation();
  const { isAuthenticated, profile } = useAuthStore();
  const isAdmin = profile?.role === 'admin';

  return (
    <div className="min-h-screen">
      {/* Forge Background */}
      <div className="fixed inset-0 bg-gradient-forge pointer-events-none" />
      <div className="fixed inset-0 bg-[url('/forge-texture.png')] opacity-5 pointer-events-none" />
      
      {/* Animated embers */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-spicy-flame rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              bottom: '0%',
            }}
            animate={{
              y: [0, -window.innerHeight],
              x: [0, (Math.random() - 0.5) * 100],
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
            }}
            transition={{
              duration: 4 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 5,
            }}
          />
        ))}
      </div>

      {/* Sub Navigation */}
      <div className="sticky top-20 z-40 glass-dark border-b border-gold-700/20">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex items-center space-x-1 py-3 overflow-x-auto no-scrollbar">
            {forgeNav.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                  location.pathname === item.href
                    ? 'bg-spicy-orange/20 text-spicy-flame'
                    : 'text-silver-400 hover:text-spicy-orange hover:bg-spicy-orange/10'
                }`}
              >
                <item.icon className="w-4 h-4 mr-2" />
                {item.name}
              </Link>
            ))}
            {isAdmin && (
              <Link
                to="/forge/admin"
                className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                  location.pathname === '/forge/admin'
                    ? 'bg-gold-500/20 text-gold-400'
                    : 'text-silver-400 hover:text-gold-400 hover:bg-gold-500/10'
                }`}
              >
                <Settings className="w-4 h-4 mr-2" />
                Admin
              </Link>
            )}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        <Routes>
          <Route path="/" element={<ForgeHome />} />
          <Route path="/mint" element={<MintPage />} />
          <Route path="/collection" element={<CollectionPage />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/claim" element={<ClaimPage />} />
          <Route path="/claim/:tokenId" element={<ClaimPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </div>
    </div>
  );
}






