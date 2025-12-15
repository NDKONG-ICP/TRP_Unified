import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Package, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Truck, 
  Clock,
  Filter,
  Search,
  RefreshCw,
  Loader2,
  ArrowRight
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { EmptyState, LoadingSpinner, ErrorDisplay } from '../../components/shared/DataFetching';

interface Load {
  id: string;
  origin: string;
  destination: string;
  distance: number;
  weight: number;
  rate: number;
  equipmentType: string;
  pickupDate: string;
  deliveryDate: string;
  status: 'available' | 'booked' | 'in_transit' | 'delivered';
}

export default function LoadsPage() {
  const { isAuthenticated } = useAuthStore();
  const [loads, setLoads] = useState<Load[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEquipment, setFilterEquipment] = useState('all');

  // Fetch loads from logistics canister
  useEffect(() => {
    const fetchLoads = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const { logisticsService } = await import('../../services/logisticsService');
        const fetchedLoads = await logisticsService.getAvailableLoads();
        setLoads(fetchedLoads);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch loads');
        console.error('Failed to fetch loads:', err);
        setLoads([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchLoads();
  }, []);

  const handleRefresh = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { logisticsService } = await import('../../services/logisticsService');
      const fetchedLoads = await logisticsService.getAvailableLoads();
      setLoads(fetchedLoads);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch loads');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLoads = loads.filter(load => {
    const matchesSearch = 
      load.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      load.destination.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterEquipment === 'all' || load.equipmentType === filterEquipment;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: Load['status']) => {
    switch (status) {
      case 'available': return 'bg-green-500/20 text-green-400';
      case 'booked': return 'bg-blue-500/20 text-blue-400';
      case 'in_transit': return 'bg-yellow-500/20 text-yellow-400';
      case 'delivered': return 'bg-gray-500/20 text-gray-400';
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
          <span className="text-white">Available</span>{' '}
          <span className="text-logistics-blue">Loads</span>
        </h1>
        <p className="text-silver-400 max-w-2xl mx-auto">
          Find and bid on loads with AI-optimized routing and escrow-secured payments
        </p>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass rounded-2xl p-6 mb-8"
      >
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-silver-500" />
            <input
              type="text"
              placeholder="Search by origin or destination..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-raven-dark rounded-xl text-white placeholder-silver-500 focus:outline-none focus:ring-2 focus:ring-logistics-blue/50"
            />
          </div>
          
          {/* Equipment Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-silver-500" />
            <select
              value={filterEquipment}
              onChange={(e) => setFilterEquipment(e.target.value)}
              className="pl-10 pr-8 py-3 bg-raven-dark rounded-xl text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-logistics-blue/50"
            >
              <option value="all">All Equipment</option>
              <option value="Dry Van">Dry Van</option>
              <option value="Refrigerated">Refrigerated</option>
              <option value="Flatbed">Flatbed</option>
            </select>
          </div>

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-3 bg-logistics-blue/20 text-logistics-blue rounded-xl hover:bg-logistics-blue/30 transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <RefreshCw className="w-5 h-5" />
            )}
            Refresh
          </button>
        </div>
      </motion.div>

      {/* Stats Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
      >
        <div className="glass rounded-xl p-4 text-center border border-logistics-blue/10">
          <p className="text-2xl font-bold text-white">{loads.filter(l => l.status === 'available').length}</p>
          <p className="text-sm text-silver-500">Available Loads</p>
        </div>
        <div className="glass rounded-xl p-4 text-center border border-logistics-blue/10">
          <p className="text-2xl font-bold text-white">--</p>
          <p className="text-sm text-silver-500">Avg Rate/Mile</p>
        </div>
        <div className="glass rounded-xl p-4 text-center border border-logistics-blue/10">
          <p className="text-2xl font-bold text-white">0</p>
          <p className="text-sm text-silver-500">Active Bids</p>
        </div>
        <div className="glass rounded-xl p-4 text-center border border-logistics-blue/10">
          <p className="text-2xl font-bold text-white">0</p>
          <p className="text-sm text-silver-500">My Bookings</p>
        </div>
      </motion.div>

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
          <LoadingSpinner message="Loading available loads..." />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredLoads.length === 0 && (
        <EmptyState
          title="No Loads Available"
          message={searchTerm || filterEquipment !== 'all' 
            ? "No loads match your search criteria. Try adjusting your filters."
            : "There are no loads posted at the moment. Check back soon or post your own load!"}
          icon={<Package className="w-16 h-16" />}
          action={isAuthenticated ? {
            label: 'Post a Load',
            onClick: () => {
              // Navigate to post load page (to be implemented)
            }
          } : undefined}
        />
      )}

      {/* Loads List */}
      {filteredLoads.length > 0 && (
        <div className="space-y-4">
          {filteredLoads.map((load, i) => (
            <motion.div
              key={load.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              className="glass rounded-2xl p-6 border border-logistics-blue/20 hover:border-logistics-blue/40 transition-all"
            >
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Route Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-green-400" />
                      <span className="text-white font-medium">{load.origin}</span>
                    </div>
                    <ArrowRight className="w-5 h-5 text-silver-500" />
                    <div className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-red-400" />
                      <span className="text-white font-medium">{load.destination}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 text-sm text-silver-400">
                    <span className="flex items-center gap-1">
                      <Package className="w-4 h-4" />
                      {load.weight.toLocaleString()} lbs
                    </span>
                    <span className="flex items-center gap-1">
                      <Truck className="w-4 h-4" />
                      {load.equipmentType}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {load.distance} miles
                    </span>
                  </div>
                </div>

                {/* Dates */}
                <div className="flex gap-6 text-sm">
                  <div>
                    <p className="text-silver-500 text-xs mb-1">Pickup</p>
                    <div className="flex items-center gap-1 text-white">
                      <Calendar className="w-4 h-4 text-logistics-blue" />
                      {new Date(load.pickupDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <p className="text-silver-500 text-xs mb-1">Delivery</p>
                    <div className="flex items-center gap-1 text-white">
                      <Calendar className="w-4 h-4 text-logistics-teal" />
                      {new Date(load.deliveryDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Rate & Action */}
                <div className="flex flex-col items-end gap-2">
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">${load.rate.toLocaleString()}</p>
                    <p className="text-xs text-silver-500">${(load.rate / load.distance).toFixed(2)}/mile</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(load.status)}`}>
                    {load.status.replace('_', ' ')}
                  </span>
                  {load.status === 'available' && isAuthenticated && (
                    <button className="px-4 py-2 bg-gradient-to-r from-logistics-blue to-logistics-teal text-white font-medium rounded-lg text-sm hover:shadow-lg transition-all">
                      Place Bid
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
