import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Truck, 
  Package, 
  MapPin, 
  Users, 
  Settings, 
  FileText,
  Wallet,
  BarChart3
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import ExpressoHome from './ExpressoHome';
import LoadsPage from './LoadsPage';
import DriversPage from './DriversPage';
import TrackingPage from './TrackingPage';
import ManualsPage from './ManualsPage';

const expressoNav = [
  { name: 'Home', href: '/expresso', icon: Truck },
  { name: 'Loads', href: '/expresso/loads', icon: Package },
  { name: 'Drivers', href: '/expresso/drivers', icon: Users },
  { name: 'Tracking', href: '/expresso/tracking', icon: MapPin },
  { name: 'ASE Manuals', href: '/expresso/manuals', icon: FileText },
];

export default function ExpressoPage() {
  const location = useLocation();
  const { isAuthenticated, profile } = useAuthStore();
  const isAdmin = profile?.role === 'admin';

  return (
    <div className="min-h-screen">
      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-logistics-blue/5 via-raven-black to-logistics-teal/5 pointer-events-none" />

      {/* Sub Navigation */}
      <div className="sticky top-20 z-40 glass-dark border-b border-logistics-blue/20">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex items-center space-x-1 py-3 overflow-x-auto no-scrollbar">
            {expressoNav.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                  location.pathname === item.href
                    ? 'bg-logistics-blue/20 text-logistics-blue'
                    : 'text-silver-400 hover:text-logistics-blue hover:bg-logistics-blue/10'
                }`}
              >
                <item.icon className="w-4 h-4 mr-2" />
                {item.name}
              </Link>
            ))}
            {isAdmin && (
              <Link
                to="/expresso/admin"
                className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                  location.pathname === '/expresso/admin'
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
          <Route path="/" element={<ExpressoHome />} />
          <Route path="/loads" element={<LoadsPage />} />
          <Route path="/drivers" element={<DriversPage />} />
          <Route path="/tracking" element={<TrackingPage />} />
          <Route path="/manuals" element={<ManualsPage />} />
        </Routes>
      </div>
    </div>
  );
}






