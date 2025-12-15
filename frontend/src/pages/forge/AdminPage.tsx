import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings, 
  Users, 
  Layers, 
  Wallet, 
  BarChart3, 
  Upload,
  AlertCircle,
  Check,
  Loader2
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

export default function AdminPage() {
  const { isAuthenticated, profile, principal } = useAuthStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [isUploading, setIsUploading] = useState(false);

  const isAdmin = profile?.role === 'admin';

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="glass rounded-3xl p-12 text-center border border-gold-500/20">
          <AlertCircle className="w-16 h-16 text-gold-400 mx-auto mb-6" />
          <h2 className="text-3xl font-display font-bold text-white mb-4">
            Authentication Required
          </h2>
          <p className="text-silver-400 mb-8">
            Please connect your wallet to access the admin panel
          </p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="glass rounded-3xl p-12 text-center border border-red-500/20">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-6" />
          <h2 className="text-3xl font-display font-bold text-white mb-4">
            Access Denied
          </h2>
          <p className="text-silver-400">
            You don't have admin privileges to access this page
          </p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: BarChart3 },
    { id: 'layers', name: 'Layer Upload', icon: Upload },
    { id: 'users', name: 'Users', icon: Users },
    { id: 'nfts', name: 'NFTs', icon: Layers },
    { id: 'treasury', name: 'Treasury', icon: Wallet },
    { id: 'settings', name: 'Settings', icon: Settings },
  ];

  // Mock stats
  const stats = {
    totalNFTs: 1000,
    mintedNFTs: 847,
    totalUsers: 312,
    totalRevenue: 4250,
    treasuryBalance: 1250,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-display font-bold mb-2">
          <span className="text-white">Admin</span>{' '}
          <span className="text-gold-400">Dashboard</span>
        </h1>
        <p className="text-silver-400">Manage The Forge NFT platform</p>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center px-4 py-2 rounded-xl font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-gold-500/20 text-gold-400'
                : 'text-silver-400 hover:text-gold-300 hover:bg-gold-500/10'
            }`}
          >
            <tab.icon className="w-4 h-4 mr-2" />
            {tab.name}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="glass rounded-2xl p-6 border border-gold-500/20">
              <Layers className="w-8 h-8 text-gold-400 mb-3" />
              <p className="text-3xl font-bold text-white">{stats.totalNFTs}</p>
              <p className="text-sm text-silver-500">Total NFTs</p>
            </div>
            <div className="glass rounded-2xl p-6 border border-gold-500/20">
              <Check className="w-8 h-8 text-green-400 mb-3" />
              <p className="text-3xl font-bold text-white">{stats.mintedNFTs}</p>
              <p className="text-sm text-silver-500">Minted</p>
            </div>
            <div className="glass rounded-2xl p-6 border border-gold-500/20">
              <Users className="w-8 h-8 text-blue-400 mb-3" />
              <p className="text-3xl font-bold text-white">{stats.totalUsers}</p>
              <p className="text-sm text-silver-500">Users</p>
            </div>
            <div className="glass rounded-2xl p-6 border border-gold-500/20">
              <BarChart3 className="w-8 h-8 text-purple-400 mb-3" />
              <p className="text-3xl font-bold text-white">{stats.totalRevenue} ICP</p>
              <p className="text-sm text-silver-500">Revenue</p>
            </div>
            <div className="glass rounded-2xl p-6 border border-gold-500/20">
              <Wallet className="w-8 h-8 text-gold-400 mb-3" />
              <p className="text-3xl font-bold text-white">{stats.treasuryBalance} ICP</p>
              <p className="text-sm text-silver-500">Treasury</p>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="glass rounded-2xl p-6 border border-gold-500/20">
            <h3 className="text-lg font-bold text-white mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {[
                { action: 'NFT Minted', user: 'abc...xyz', time: '5 min ago' },
                { action: 'New User', user: 'def...uvw', time: '15 min ago' },
                { action: 'NFT Transferred', user: 'ghi...rst', time: '1 hour ago' },
              ].map((activity, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-raven-gray last:border-0">
                  <div>
                    <p className="text-white font-medium">{activity.action}</p>
                    <p className="text-sm text-silver-500">{activity.user}</p>
                  </div>
                  <span className="text-xs text-silver-600">{activity.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'layers' && (
        <div className="glass rounded-2xl p-6 border border-gold-500/20">
          <h3 className="text-lg font-bold text-white mb-4">Upload Layer Assets</h3>
          <p className="text-silver-400 mb-6">
            Upload layer directories for generative NFT creation. Each directory should contain trait images.
          </p>
          
          <div className="border-2 border-dashed border-gold-500/30 rounded-2xl p-12 text-center hover:border-gold-500/50 transition-colors cursor-pointer">
            <Upload className="w-12 h-12 text-gold-400 mx-auto mb-4" />
            <p className="text-white font-medium mb-2">Drop layer folders here</p>
            <p className="text-silver-500 text-sm">or click to browse</p>
          </div>

          <div className="mt-6">
            <h4 className="text-sm font-semibold text-silver-400 mb-3">Expected Structure:</h4>
            <pre className="bg-raven-dark rounded-xl p-4 text-sm text-silver-400 overflow-x-auto">
{`layers/
├── 01_background/
│   ├── flame.png
│   ├── smoke.png
│   └── ...
├── 02_body/
│   ├── pepper_red.png
│   ├── pepper_green.png
│   └── ...
└── ...`}
            </pre>
          </div>
        </div>
      )}

      {activeTab === 'treasury' && (
        <div className="space-y-6">
          <div className="glass rounded-2xl p-6 border border-gold-500/20">
            <h3 className="text-lg font-bold text-white mb-4">Treasury Balance</h3>
            <div className="text-5xl font-bold text-gold-400 mb-2">
              {stats.treasuryBalance} ICP
            </div>
            <p className="text-silver-500">Platform fees collected</p>
          </div>

          <div className="glass rounded-2xl p-6 border border-gold-500/20">
            <h3 className="text-lg font-bold text-white mb-4">Withdraw Funds</h3>
            <div className="flex gap-4">
              <input
                type="number"
                placeholder="Amount in ICP"
                className="input flex-1"
              />
              <button className="btn-gold">Withdraw</button>
            </div>
          </div>
        </div>
      )}

      {/* Other tabs show placeholder content */}
      {!['overview', 'layers', 'treasury'].includes(activeTab) && (
        <div className="glass rounded-2xl p-12 text-center border border-gold-500/20">
          <Settings className="w-12 h-12 text-silver-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">{tabs.find(t => t.id === activeTab)?.name}</h3>
          <p className="text-silver-500">This section is under development</p>
        </div>
      )}
    </div>
  );
}






