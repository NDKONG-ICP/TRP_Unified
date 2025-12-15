import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  MapPin, 
  Package, 
  Truck, 
  CheckCircle2, 
  Clock, 
  Search,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { EmptyState, ErrorDisplay } from '../../components/shared/DataFetching';

interface ShipmentUpdate {
  time: string;
  message: string;
  location?: string;
}

interface Shipment {
  id: string;
  loadId: string;
  origin: string;
  destination: string;
  status: 'picked_up' | 'in_transit' | 'delivered' | 'delayed';
  estimatedDelivery: string;
  driver?: string;
  updates: ShipmentUpdate[];
}

export default function TrackingPage() {
  const [trackingId, setTrackingId] = useState('');
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleTrack = async () => {
    if (!trackingId.trim()) {
      setError('Please enter a tracking ID');
      return;
    }

    setIsSearching(true);
    setError(null);
    setHasSearched(true);
    
    try {
      const { logisticsService } = await import('../../services/logisticsService');
      const trackedShipment = await logisticsService.trackShipment(trackingId);
      
      if (!trackedShipment) {
        setError('Shipment not found. Please check the tracking ID.');
        setShipment(null);
      } else {
        setShipment(trackedShipment);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch shipment');
      console.error('Failed to track shipment:', err);
      setShipment(null);
    } finally {
      setIsSearching(false);
    }
  };

  const getStatusColor = (status: Shipment['status']) => {
    switch (status) {
      case 'picked_up': return 'text-blue-400';
      case 'in_transit': return 'text-yellow-400';
      case 'delivered': return 'text-green-400';
      case 'delayed': return 'text-red-400';
    }
  };

  const getStatusIcon = (status: Shipment['status']) => {
    switch (status) {
      case 'picked_up': return <Package className="w-6 h-6" />;
      case 'in_transit': return <Truck className="w-6 h-6" />;
      case 'delivered': return <CheckCircle2 className="w-6 h-6" />;
      case 'delayed': return <AlertCircle className="w-6 h-6" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl font-display font-bold mb-4">
          <span className="text-white">Shipment</span>{' '}
          <span className="text-logistics-blue">Tracking</span>
        </h1>
        <p className="text-silver-400 max-w-2xl mx-auto">
          Track your shipments in real-time with on-chain verification
        </p>
      </motion.div>

      {/* Search Box */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass rounded-2xl p-6 mb-8"
      >
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-silver-500" />
            <input
              type="text"
              placeholder="Enter tracking ID (e.g., SHIP-001)..."
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTrack()}
              className="w-full pl-12 pr-4 py-4 bg-raven-dark rounded-xl text-white placeholder-silver-500 focus:outline-none focus:ring-2 focus:ring-logistics-blue/50 text-lg"
            />
          </div>
          <button
            onClick={handleTrack}
            disabled={isSearching}
            className="px-8 py-4 bg-gradient-to-r from-logistics-blue to-logistics-teal text-white font-bold rounded-xl hover:shadow-lg hover:shadow-logistics-blue/25 transition-all disabled:opacity-50"
          >
            {isSearching ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Track'
            )}
          </button>
        </div>
      </motion.div>

      {/* Error State */}
      {error && (
        <ErrorDisplay 
          error={error}
          onRetry={handleTrack}
          className="mb-6"
        />
      )}

      {/* Loading State */}
      {isSearching && (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 text-logistics-blue animate-spin mx-auto mb-4" />
          <p className="text-silver-400">Searching for shipment...</p>
        </div>
      )}

      {/* Not Found State */}
      {!isSearching && !error && hasSearched && !shipment && (
        <EmptyState
          title="Shipment Not Found"
          message={`No shipment found with tracking ID "${trackingId}". Please check the ID and try again.`}
          icon={<Package className="w-16 h-16" />}
        />
      )}

      {/* Initial State */}
      {!hasSearched && !isSearching && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <Truck className="w-16 h-16 text-logistics-blue/50 mx-auto mb-4" />
          <p className="text-silver-400">Enter a tracking ID to view shipment status</p>
          <p className="text-silver-500 text-sm mt-2">Track any shipment made through eXpresso Logistics</p>
        </motion.div>
      )}

      {/* Shipment Details */}
      {shipment && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Status Card */}
          <div className="glass rounded-2xl p-6 border border-logistics-blue/20">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-silver-500 text-sm">Tracking ID</p>
                <p className="text-xl font-bold text-white">{shipment.id}</p>
              </div>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${getStatusColor(shipment.status)} bg-current/10`}>
                {getStatusIcon(shipment.status)}
                <span className="font-medium capitalize">{shipment.status.replace('_', ' ')}</span>
              </div>
            </div>

            {/* Route */}
            <div className="flex items-center gap-4 p-4 bg-raven-dark rounded-xl mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-green-400" />
                  <span className="text-white">{shipment.origin}</span>
                </div>
                <div className="border-l-2 border-dashed border-silver-700 h-4 ml-2" />
                <div className="flex items-center gap-2 mt-2">
                  <MapPin className="w-4 h-4 text-red-400" />
                  <span className="text-white">{shipment.destination}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-silver-500 text-sm">Est. Delivery</p>
                <p className="text-white font-medium">{new Date(shipment.estimatedDelivery).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Driver Info */}
            {shipment.driver && (
              <div className="flex items-center gap-3 p-3 bg-logistics-blue/10 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-logistics-blue/20 flex items-center justify-center">
                  <Truck className="w-5 h-5 text-logistics-blue" />
                </div>
                <div>
                  <p className="text-silver-500 text-xs">Driver</p>
                  <p className="text-white font-medium">{shipment.driver}</p>
                </div>
              </div>
            )}
          </div>

          {/* Updates Timeline */}
          <div className="glass rounded-2xl p-6 border border-logistics-blue/20">
            <h3 className="text-lg font-bold text-white mb-4">Tracking History</h3>
            <div className="space-y-4">
              {shipment.updates.map((update, i) => (
                <div key={i} className="flex gap-4">
                  <div className="relative">
                    <div className={`w-3 h-3 rounded-full ${i === 0 ? 'bg-logistics-teal' : 'bg-silver-600'}`} />
                    {i < shipment.updates.length - 1 && (
                      <div className="absolute top-3 left-1.5 w-0.5 h-full -translate-x-1/2 bg-silver-700" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-silver-500" />
                      <span className="text-silver-500 text-sm">{update.time}</span>
                    </div>
                    <p className="text-white">{update.message}</p>
                    {update.location && (
                      <p className="text-silver-400 text-sm flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" />
                        {update.location}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
