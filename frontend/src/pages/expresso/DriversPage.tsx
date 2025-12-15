import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Shield, Star, MapPin, Truck, FileCheck, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { coreService } from '../../services/coreService';
import { EmptyState, LoadingSpinner, ErrorDisplay } from '../../components/shared/DataFetching';

interface Driver {
  id: string;
  name: string;
  rating: number;
  completedLoads: number;
  location: string;
  verified: boolean;
  truckType: string;
  available: boolean;
}

export default function DriversPage() {
  const { isAuthenticated, profile } = useAuthStore();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isDriver = profile?.role === 'driver';

  // Fetch verified drivers from core canister
  useEffect(() => {
    const fetchDrivers = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        await coreService.init();
        const drivers = await coreService.getVerifiedDrivers();
        setDrivers(drivers);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch drivers');
        console.error('Failed to fetch drivers:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDrivers();
  }, []);

  const handleRefresh = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await coreService.init();
      const drivers = await coreService.getVerifiedDrivers();
      setDrivers(drivers);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch drivers');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl font-display font-bold mb-4">
          <span className="text-white">Verified</span>{' '}
          <span className="text-logistics-blue">Drivers</span>
        </h1>
        <p className="text-silver-400 max-w-2xl mx-auto">
          KIP-verified drivers with secure document verification and on-chain reputation
        </p>
      </motion.div>

      {/* Driver Onboarding CTA */}
      {isAuthenticated && !isDriver && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-6 mb-8 border border-logistics-teal/30 bg-gradient-to-r from-logistics-blue/10 to-logistics-teal/10"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-logistics-blue/20 flex items-center justify-center">
                <Shield className="w-6 h-6 text-logistics-blue" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Become a Verified Driver</h3>
                <p className="text-silver-400 text-sm">Complete KIP verification to start bidding on loads</p>
              </div>
            </div>
            <button
              onClick={() => setShowOnboarding(true)}
              className="px-6 py-3 bg-gradient-to-r from-logistics-blue to-logistics-teal text-white font-bold rounded-xl"
            >
              Start Onboarding
            </button>
          </div>
        </motion.div>
      )}

      {/* Stats - Real data from canister or zeros */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
      >
        <div className="glass rounded-xl p-4 text-center border border-logistics-blue/10">
          <p className="text-2xl font-bold text-white">{drivers.length}</p>
          <p className="text-sm text-silver-500">Verified Drivers</p>
        </div>
        <div className="glass rounded-xl p-4 text-center border border-logistics-blue/10">
          <p className="text-2xl font-bold text-white">--</p>
          <p className="text-sm text-silver-500">Avg Rating</p>
        </div>
        <div className="glass rounded-xl p-4 text-center border border-logistics-blue/10">
          <p className="text-2xl font-bold text-white">0</p>
          <p className="text-sm text-silver-500">Loads Delivered</p>
        </div>
        <div className="glass rounded-xl p-4 text-center border border-logistics-blue/10">
          <p className="text-2xl font-bold text-white">--</p>
          <p className="text-sm text-silver-500">On-Time Rate</p>
        </div>
      </motion.div>

      {/* Refresh Button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 text-sm text-silver-400 hover:text-white transition-colors disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Refresh
        </button>
      </div>

      {/* Error State */}
      {error && (
        <ErrorDisplay 
          error={error}
          onRetry={handleRefresh}
          className="mb-6"
        />
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="py-12">
          <LoadingSpinner message="Loading verified drivers..." />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && drivers.length === 0 && (
        <EmptyState
          title="No Verified Drivers Yet"
          message="Verified drivers will appear here once they complete KIP verification. Be the first to get verified!"
          icon={<Users className="w-16 h-16" />}
          action={{
            label: 'Become a Verified Driver',
            onClick: () => setShowOnboarding(true)
          }}
        />
      )}

      {/* Drivers Grid */}
      {drivers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {drivers.map((driver, i) => (
            <motion.div
              key={driver.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="glass rounded-2xl p-6 border border-logistics-blue/20 hover:border-logistics-blue/40 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-logistics-blue to-logistics-teal flex items-center justify-center text-white font-bold text-lg">
                    {driver.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-white flex items-center gap-2">
                      {driver.name}
                      {driver.verified && (
                        <Shield className="w-4 h-4 text-logistics-teal" />
                      )}
                    </h3>
                    <div className="flex items-center gap-1 text-sm text-silver-400">
                      <MapPin className="w-3 h-3" />
                      {driver.location}
                    </div>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  driver.available
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-gray-500/20 text-gray-400'
                }`}>
                  {driver.available ? 'Available' : 'On Route'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-yellow-400">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="font-bold">{driver.rating}</span>
                  </div>
                  <p className="text-xs text-silver-500">Rating</p>
                </div>
                <div className="text-center">
                  <p className="font-bold text-white">{driver.completedLoads}</p>
                  <p className="text-xs text-silver-500">Loads</p>
                </div>
                <div className="text-center">
                  <Truck className="w-5 h-5 text-logistics-blue mx-auto" />
                  <p className="text-xs text-silver-500">{driver.truckType}</p>
                </div>
              </div>

              <button className="w-full py-2 bg-logistics-blue/20 hover:bg-logistics-blue/30 text-logistics-blue font-medium rounded-xl transition-all">
                View Profile
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Onboarding Modal */}
      {showOnboarding && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
          onClick={() => setShowOnboarding(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass rounded-3xl p-8 max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-logistics-blue/20 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-logistics-blue" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">KIP Driver Verification</h2>
              <p className="text-silver-400 text-sm">
                Complete verification to start bidding on loads
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-3 p-4 glass-dark rounded-xl">
                <FileCheck className="w-5 h-5 text-logistics-teal" />
                <div className="flex-1">
                  <p className="text-white font-medium">Driver's License</p>
                  <p className="text-xs text-silver-500">Valid CDL required</p>
                </div>
                <button className="px-3 py-1 text-sm bg-logistics-blue/20 text-logistics-blue rounded-lg">
                  Upload
                </button>
              </div>
              <div className="flex items-center gap-3 p-4 glass-dark rounded-xl">
                <FileCheck className="w-5 h-5 text-logistics-teal" />
                <div className="flex-1">
                  <p className="text-white font-medium">Insurance</p>
                  <p className="text-xs text-silver-500">Proof of coverage</p>
                </div>
                <button className="px-3 py-1 text-sm bg-logistics-blue/20 text-logistics-blue rounded-lg">
                  Upload
                </button>
              </div>
              <div className="flex items-center gap-3 p-4 glass-dark rounded-xl">
                <FileCheck className="w-5 h-5 text-logistics-teal" />
                <div className="flex-1">
                  <p className="text-white font-medium">MC/DOT Number</p>
                  <p className="text-xs text-silver-500">Operating authority</p>
                </div>
                <button className="px-3 py-1 text-sm bg-logistics-blue/20 text-logistics-blue rounded-lg">
                  Upload
                </button>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setShowOnboarding(false)}
                className="flex-1 py-3 glass rounded-xl text-silver-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button className="flex-1 py-3 bg-gradient-to-r from-logistics-blue to-logistics-teal text-white font-bold rounded-xl">
                Submit for Review
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
