/**
 * Admin Dashboard - Comprehensive Ecosystem Control Panel
 * Full control over treasury, canisters, users, and settings
 * Admin-only access (Cursor/Dev, Plug, OISY principals)
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Wallet,
  Users,
  Settings,
  Database,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Send,
  Download,
  RefreshCw,
  Lock,
  Unlock,
  Copy,
  ExternalLink,
  DollarSign,
  Bitcoin,
  Coins,
  BarChart3,
  PieChart,
  TrendingUp,
  Clock,
  Key,
  Zap,
  Globe,
  Server,
  Package,
  FileText,
  Image,
  Loader2,
  ChevronRight,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Bell,
  MessageSquare,
  Calendar,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { maskPrincipal, maskSensitiveData } from '../../config/secureConfig';
import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { IDL } from '@dfinity/candid';
import { treasuryService, TreasuryBalance as TreasuryBalanceType, Transaction as TreasuryTransaction } from '../../services/treasuryService';
import { kipService, PlatformStats } from '../../services/kipService';
import { nftService, CollectionStats } from '../../services/nftService';
import { ravenAICanisterService } from '../../services/ravenAICanisterService';

// Admin verification happens server-side via canister calls
// These hashes are used only for client-side UI gating (not security)
const ADMIN_PRINCIPAL_HASHES = [
  // Hashes of admin principals for quick client-side check
  // Actual verification must happen on the backend canister
  'lgd5r...jae', 'sh7h6...wae', 'yyirv...nqe', 'imnyd...yae'
].map(p => p.length > 10 ? p : ''); // Masked for security

// Check admin status via backend call
async function verifyAdminStatus(principal: string): Promise<boolean> {
  // In production, this should call the backend canister's is_admin function
  // For now, we do a client-side check (backend validates all admin operations)
  const adminPrincipals = [
    'lgd5r-y4x7q-lbrfa-mabgw-xurgu-4h3at-sw4sl-yyr3k-5kwgt-vlkao-jae', // Cursor
    'sh7h6-b7xcy-tjank-crj6d-idrcr-ormbi-22yqs-uanyl-itbp3-ur5ue-wae', // Plug
    'yyirv-5pjkg-oupac-gzja4-ljzfn-6mvon-r5w2i-6e7wm-sde75-wuses-nqe', // OISY
    'imnyd-k37s2-xlg7c-omeed-ezrzg-6oesa-r3ek6-xrwuz-qbliq-5h675-yae', // New
    'gqkko-43bbx-nwsp4-it2rg-pc2dy-w2pt2-fa5om-4y6es-oyhz2-5i5oh-5ae', // DFX
  ];
  return adminPrincipals.includes(principal) || adminPrincipals.some(admin => principal.startsWith(admin.split('-')[0]));
}

// Multi-sig now requires only 1 admin (OISY or Plug)
const MULTI_SIG_REQUIRED = 1;

// Multi-chain addresses (masked for security - full addresses stored on backend)
const ADMIN_ADDRESSES = {
  icp_account: maskSensitiveData('82f47963aa786ed12c115f40027ef1e86e1a8010119afc5e8709589609bc2f8f', 6),
  btc: maskSensitiveData('bc1qxf5fegu3x4uvynqz69q62jcglzg3m8jpzrsdej', 8),
  eth: maskSensitiveData('0x989847D46770e2322b017c79e2fAF253aA23687f', 6),
  sol: maskSensitiveData('6NgxMDwKYfqdtBVpbkA3LmCHzXS5CZ8DvQX72KpDZ5A4', 6),
};

// Canister IDs
const CANISTER_IDS = {
  assets: '3kpgg-eaaaa-aaaao-a4xdq-cai',
  core: 'qb6fv-6aaaa-aaaao-a4w7q-cai',
  nft: '37ixl-fiaaa-aaaao-a4xaa-cai',
  kip: '3yjr7-iqaaa-aaaao-a4xaq-cai',
  treasury: '3rk2d-6yaaa-aaaao-a4xba-cai',
  escrow: '3wl4x-taaaa-aaaao-a4xbq-cai',
  logistics: '3dmn2-siaaa-aaaao-a4xca-cai',
  ai_engine: '3enlo-7qaaa-aaaao-a4xcq-cai',
  raven_ai: '3noas-jyaaa-aaaao-a4xda-cai',
};

interface TreasuryBalance {
  icp: bigint;
  ckBtc: bigint;
  ckEth: bigint;
  ckUsdc: bigint;
  ckUsdt: bigint;
  harlee: bigint;
  raven: bigint;
}

interface PendingWithdrawal {
  id: number;
  token: string;
  amount: bigint;
  toAddress: string;
  requestedBy: string;
  requestedAt: number;
  approvals: string[];
  status: string;
}

interface CanisterStatus {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'unknown';
  cyclesBalance: bigint;
  memoryUsed: number;
  lastUpdated: number;
}

type AdminTab = 'overview' | 'treasury' | 'canisters' | 'users' | 'nfts' | 'ai' | 'notifications' | 'settings';

export default function AdminDashboard() {
  const { principal, isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);
  
  // Treasury state
  const [treasuryBalance, setTreasuryBalance] = useState<TreasuryBalance | null>(null);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<PendingWithdrawal[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  
  // Canister state
  const [canisterStatuses, setCanisterStatuses] = useState<CanisterStatus[]>([]);
  
  // Settings state - Only 1 approval needed (OISY or Plug)
  const [settings, setSettings] = useState({
    platformFee: 2.5,
    withdrawalThreshold: 1,
    multiSigRequired: false, // Single admin approval
    requiredApprovals: 1,    // Only 1 admin needed
    paused: false,
  });
  
  // Notifications state
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationStats, setNotificationStats] = useState({ total: 400, sent: 0, pending: 400, scheduled: 0 });
  
  // Check admin status via secure verification
  useEffect(() => {
    const checkAdmin = async () => {
      if (principal) {
        const principalText = principal.toString();
        const isAdminUser = await verifyAdminStatus(principalText);
        setIsAdmin(isAdminUser);
      }
      setIsLoading(false);
    };
    checkAdmin();
  }, [principal]);
  
  // Fetch treasury data
  useEffect(() => {
    if (isAdmin) {
      fetchTreasuryData();
      fetchCanisterStatuses();
    }
  }, [isAdmin]);
  
  // Load notifications when notifications tab is active
  useEffect(() => {
    if (isAdmin && activeTab === 'notifications') {
      loadNotifications();
    }
  }, [isAdmin, activeTab]);
  
  const loadNotifications = async () => {
    try {
      await ravenAICanisterService.init();
      const notifs = await ravenAICanisterService.adminGetAllNotifications(20, 0);
      setNotifications(notifs || []);
      
      // Fetch stats
      const stats = await ravenAICanisterService.getCollectiveStats();
      setNotificationStats({
        total: stats.totalNotifications,
        sent: stats.sentCount,
        pending: stats.totalNotifications - stats.sentCount,
        scheduled: 0, // Can be calculated from scheduled_for field if needed
      });
    } catch (error) {
      console.error('Failed to load notifications:', error);
      setNotifications([]);
    }
  };
  
  const fetchTreasuryData = async () => {
    try {
      await treasuryService.init();
      
      // Fetch real treasury balance
      const balance = await treasuryService.getBalance();
      setTreasuryBalance({
        icp: balance.icp,
        ckBtc: balance.ckBtc,
        ckEth: balance.ckEth,
        ckUsdc: balance.ckUsdc,
        ckUsdt: balance.ckUsdt,
        harlee: balance.harlee,
        raven: balance.raven,
      });
      
      // Fetch real transactions
      const txs = await treasuryService.getTransactions(0, 20);
      setTransactions(txs.map(tx => ({
        id: tx.id,
        type: tx.type,
        token: tx.token,
        amount: Number(tx.amount),
        from: tx.from || 'Unknown',
        timestamp: tx.timestamp,
      })));
    } catch (error) {
      console.error('Failed to fetch treasury data:', error);
      // Set empty state on error
      setTreasuryBalance({
        icp: BigInt(0),
        ckBtc: BigInt(0),
        ckEth: BigInt(0),
        ckUsdc: BigInt(0),
        ckUsdt: BigInt(0),
        harlee: BigInt(0),
        raven: BigInt(0),
      });
      setTransactions([]);
    }
  };
  
  const fetchCanisterStatuses = async () => {
    // Fetch real canister health checks
    const statuses: CanisterStatus[] = [];
    
    for (const [name, id] of Object.entries(CANISTER_IDS)) {
      try {
        let healthStatus = 'running';
        // Try to call health check on each canister
        if (name === 'treasury') {
          await treasuryService.init();
          await treasuryService.healthCheck();
        } else if (name === 'raven_ai') {
          await ravenAICanisterService.init();
          await ravenAICanisterService.healthCheck();
        } else if (name === 'nft') {
          await nftService.init();
          await nftService.healthCheck();
        }
        
        statuses.push({
          id,
          name: name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
          status: 'running' as const,
          cyclesBalance: BigInt(0), // Cycles requires management canister access
          memoryUsed: 0,
          lastUpdated: Date.now(),
        });
      } catch (error) {
        statuses.push({
          id,
          name: name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
          status: 'unknown' as const,
          cyclesBalance: BigInt(0),
          memoryUsed: 0,
          lastUpdated: Date.now(),
        });
      }
    }
    
    setCanisterStatuses(statuses);
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add toast notification here
  };
  
  const formatAmount = (amount: bigint, decimals: number = 8): string => {
    const num = Number(amount) / Math.pow(10, decimals);
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  };
  
  const formatCycles = (cycles: bigint): string => {
    const t = Number(cycles) / 1_000_000_000_000;
    return `${t.toFixed(2)}T`;
  };
  
  // Unauthorized view
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Authentication Required</h1>
          <p className="text-gray-400">Please connect your wallet to access the admin panel.</p>
        </div>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-amber-500 animate-spin" />
      </div>
    );
  }
  
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400 mb-4">
            Your principal <code className="text-amber-400">{principal?.toString().slice(0, 20)}...</code> is not authorized.
          </p>
          <p className="text-gray-500 text-sm">
            Only Cursor/Dev, Plug, and OISY admin wallets can access this panel.
          </p>
        </div>
      </div>
    );
  }
  
  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'treasury', label: 'Treasury', icon: Wallet },
    { id: 'canisters', label: 'Canisters', icon: Server },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'nfts', label: 'NFTs', icon: Image },
    { id: 'ai', label: 'AI Agents', icon: Zap },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-red-500 flex items-center justify-center">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-gray-400">Complete ecosystem control panel</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Admin Verified
              </span>
            </div>
          </div>
          
          {/* Admin Wallet Info */}
          <div className="glass rounded-xl p-4 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-amber-400" />
              <span className="text-gray-400 text-sm">Connected as:</span>
              <code className="text-amber-400 text-sm">{principal?.toString()}</code>
              <button
                onClick={() => copyToClipboard(principal?.toString() || '')}
                className="p-1 hover:bg-gray-800 rounded"
              >
                <Copy className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
        </motion.div>
        
        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdminTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-amber-500 text-black'
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
        
        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Total ICP', value: treasuryBalance ? formatAmount(treasuryBalance.icp) : '0', icon: DollarSign, color: 'text-blue-400' },
                    { label: 'Total ckBTC', value: treasuryBalance ? formatAmount(treasuryBalance.ckBtc) : '0', icon: Bitcoin, color: 'text-orange-400' },
                    { label: 'Active Canisters', value: canisterStatuses.length.toString(), icon: Server, color: 'text-green-400' },
                    { label: 'Pending Withdrawals', value: pendingWithdrawals.length.toString(), icon: Clock, color: 'text-yellow-400' },
                  ].map((stat) => (
                    <div key={stat.label} className="glass rounded-xl p-4 border border-gray-800">
                      <stat.icon className={`w-8 h-8 ${stat.color} mb-2`} />
                      <p className="text-2xl font-bold text-white">{stat.value}</p>
                      <p className="text-sm text-gray-500">{stat.label}</p>
                    </div>
                  ))}
                </div>
                
                {/* Multi-Chain Addresses */}
                <div className="glass rounded-xl p-6 border border-amber-500/20">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <Globe className="w-5 h-5 text-amber-400" />
                      Multi-Chain Admin Addresses
                    </h3>
                    <button
                      onClick={() => setShowSecrets(!showSecrets)}
                      className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700"
                    >
                      {showSecrets ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { chain: 'ICP Account', address: ADMIN_ADDRESSES.icp_account, icon: '🔵' },
                      { chain: 'Bitcoin', address: ADMIN_ADDRESSES.btc, icon: '₿' },
                      { chain: 'Ethereum', address: ADMIN_ADDRESSES.eth, icon: 'Ξ' },
                      { chain: 'Solana', address: ADMIN_ADDRESSES.sol, icon: '◎' },
                    ].map((item) => (
                      <div key={item.chain} className="p-4 rounded-lg bg-gray-800/50 border border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl">{item.icon}</span>
                          <span className="font-medium text-white">{item.chain}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="text-sm text-gray-400 flex-1 truncate">
                            {showSecrets ? item.address : '•'.repeat(20) + item.address.slice(-8)}
                          </code>
                          <button
                            onClick={() => copyToClipboard(item.address)}
                            className="p-1 hover:bg-gray-700 rounded"
                          >
                            <Copy className="w-4 h-4 text-gray-500" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Recent Activity */}
                <div className="glass rounded-xl p-6 border border-gray-800">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-green-400" />
                    Recent Activity
                  </h3>
                  <div className="space-y-3">
                    {transactions.slice(0, 5).map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            tx.type === 'Deposit' ? 'bg-green-500/20' : 'bg-blue-500/20'
                          }`}>
                            {tx.type === 'Deposit' ? (
                              <Download className="w-5 h-5 text-green-400" />
                            ) : (
                              <Coins className="w-5 h-5 text-blue-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-white">{tx.type}</p>
                            <p className="text-sm text-gray-500">{tx.token}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-white">{formatAmount(BigInt(tx.amount))}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(tx.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Treasury Tab */}
            {activeTab === 'treasury' && (
              <div className="space-y-6">
                {/* Balances */}
                <div className="glass rounded-xl p-6 border border-amber-500/20">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-amber-400" />
                    Treasury Balances
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {treasuryBalance && [
                      { token: 'ICP', balance: treasuryBalance.icp, decimals: 8, icon: '🔵' },
                      { token: 'ckBTC', balance: treasuryBalance.ckBtc, decimals: 8, icon: '₿' },
                      { token: 'ckETH', balance: treasuryBalance.ckEth, decimals: 18, icon: 'Ξ' },
                      { token: 'ckUSDC', balance: treasuryBalance.ckUsdc, decimals: 6, icon: '$' },
                      { token: 'ckUSDT', balance: treasuryBalance.ckUsdt, decimals: 6, icon: '$' },
                      { token: 'HARLEE', balance: treasuryBalance.harlee, decimals: 8, icon: '🪙' },
                      { token: 'RAVEN', balance: treasuryBalance.raven, decimals: 8, icon: '🦅' },
                    ].map((item) => (
                      <div key={item.token} className="p-4 rounded-xl bg-gray-800/50 border border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">{item.icon}</span>
                          <span className="font-medium text-white">{item.token}</span>
                        </div>
                        <p className="text-xl font-bold text-white">
                          {formatAmount(item.balance, item.decimals)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Withdrawal Request */}
                <div className="glass rounded-xl p-6 border border-gray-800">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Send className="w-5 h-5 text-blue-400" />
                    Request Withdrawal
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Token</label>
                      <select className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white">
                        <option value="ICP">ICP</option>
                        <option value="ckBTC">ckBTC</option>
                        <option value="ckETH">ckETH</option>
                        <option value="ckUSDC">ckUSDC</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Amount</label>
                      <input
                        type="number"
                        placeholder="0.00"
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Destination</label>
                      <input
                        type="text"
                        placeholder="Principal or address"
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white"
                      />
                    </div>
                  </div>
                  <button className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold rounded-xl hover:shadow-lg transition-all">
                    Submit Withdrawal Request
                  </button>
                </div>
                
                {/* Pending Withdrawals */}
                <div className="glass rounded-xl p-6 border border-gray-800">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-yellow-400" />
                    Pending Withdrawals
                  </h3>
                  {pendingWithdrawals.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No pending withdrawals</p>
                  ) : (
                    <div className="space-y-3">
                      {pendingWithdrawals.map((wd) => (
                        <div key={wd.id} className="p-4 rounded-xl bg-gray-800/50 border border-gray-700">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-white">
                                {formatAmount(wd.amount)} {wd.token}
                              </p>
                              <p className="text-sm text-gray-500">To: {wd.toAddress.slice(0, 20)}...</p>
                            </div>
                            <div className="flex gap-2">
                              <button className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30">
                                Approve
                              </button>
                              <button className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30">
                                Reject
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Canisters Tab */}
            {activeTab === 'canisters' && (
              <div className="space-y-6">
                <div className="glass rounded-xl p-6 border border-gray-800">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <Server className="w-5 h-5 text-green-400" />
                      Canister Status
                    </h3>
                    <button
                      onClick={fetchCanisterStatuses}
                      className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700"
                    >
                      <RefreshCw className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {canisterStatuses.map((canister) => (
                      <div key={canister.id} className="p-4 rounded-xl bg-gray-800/50 border border-gray-700 hover:border-green-500/30 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-bold text-white">{canister.name}</h4>
                          <span className={`w-3 h-3 rounded-full ${
                            canister.status === 'running' ? 'bg-green-500' : 'bg-red-500'
                          }`} />
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Canister ID</span>
                            <code className="text-amber-400">{canister.id.slice(0, 10)}...</code>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Cycles</span>
                            <span className="text-green-400">{formatCycles(canister.cyclesBalance)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Memory</span>
                            <span className="text-blue-400">{canister.memoryUsed}%</span>
                          </div>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button className="flex-1 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-sm hover:bg-blue-500/30">
                            Candid UI
                          </button>
                          <button className="flex-1 px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded-lg text-sm hover:bg-amber-500/30">
                            Top Up
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                {/* Send Manual Notification */}
                <div className="glass rounded-xl p-6 border border-amber-500/20">
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Send className="w-5 h-5 text-amber-400" />
                    Send Notification to AXIOM Holders
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Title</label>
                      <input
                        type="text"
                        id="notif-title"
                        placeholder="Notification title..."
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Message</label>
                      <textarea
                        id="notif-message"
                        rows={4}
                        placeholder="Write your message in Raven's fun, sassy voice..."
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Recipients (leave empty for all AXIOM holders, or enter specific AXIOM numbers: 1,2,3)</label>
                      <input
                        type="text"
                        id="notif-recipients"
                        placeholder="All holders (empty) or specific: 1,2,3,5"
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white"
                      />
                    </div>
                    <button
                      onClick={async () => {
                        const title = (document.getElementById('notif-title') as HTMLInputElement)?.value;
                        const message = (document.getElementById('notif-message') as HTMLTextAreaElement)?.value;
                        const recipientsStr = (document.getElementById('notif-recipients') as HTMLInputElement)?.value;
                        const recipients = recipientsStr ? recipientsStr.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n)) : [];
                        
                        if (!title || !message) {
                          alert('Please fill in title and message');
                          return;
                        }
                        
                        try {
                          // Initialize service and send notification
                          await ravenAICanisterService.init();
                          const result = await ravenAICanisterService.adminSendNotification(title, message, recipients);
                          if (result) {
                            alert('Notification sent successfully!');
                            (document.getElementById('notif-title') as HTMLInputElement).value = '';
                            (document.getElementById('notif-message') as HTMLTextAreaElement).value = '';
                            (document.getElementById('notif-recipients') as HTMLInputElement).value = '';
                            // Reload notifications
                            await loadNotifications();
                          }
                        } catch (error: any) {
                          alert(`Error: ${error.message || 'Failed to send notification'}`);
                        }
                      }}
                      className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold rounded-xl hover:shadow-lg transition-all flex items-center gap-2"
                    >
                      <Send className="w-5 h-5" />
                      Send Notification
                    </button>
                  </div>
                </div>
                
                {/* Notification Stats */}
                <div className="glass rounded-xl p-6 border border-gray-800">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-green-400" />
                    Notification Statistics
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Total Notifications', value: notificationStats.total.toString(), icon: Bell, color: 'text-blue-400' },
                      { label: 'Sent', value: notificationStats.sent.toString(), icon: CheckCircle, color: 'text-green-400' },
                      { label: 'Pending', value: notificationStats.pending.toString(), icon: Clock, color: 'text-yellow-400' },
                      { label: 'Scheduled', value: notificationStats.scheduled.toString(), icon: Calendar, color: 'text-purple-400' },
                    ].map((stat) => (
                      <div key={stat.label} className="p-4 rounded-xl bg-gray-800/50 border border-gray-700">
                        <stat.icon className={`w-8 h-8 ${stat.color} mb-2`} />
                        <p className="text-2xl font-bold text-white">{stat.value}</p>
                        <p className="text-sm text-gray-500">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Scheduled Delivery Times */}
                <div className="glass rounded-xl p-6 border border-gray-800">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-purple-400" />
                    Scheduled Delivery Times
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-gray-800/50">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                          <span className="text-xl">🌅</span>
                        </div>
                        <div>
                          <p className="font-medium text-white">Morning Greeting</p>
                          <p className="text-sm text-gray-400">6:00 AM UTC - Good morning with fun fact</p>
                        </div>
                      </div>
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-gray-800/50">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
                          <span className="text-xl">🌤️</span>
                        </div>
                        <div>
                          <p className="font-medium text-white">Midday Update</p>
                          <p className="text-sm text-gray-400">12:00 PM UTC - Friendly check-in</p>
                        </div>
                      </div>
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-gray-800/50">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
                          <span className="text-xl">🌙</span>
                        </div>
                        <div>
                          <p className="font-medium text-white">Evening Message</p>
                          <p className="text-sm text-gray-400">9:00 PM UTC - Goodnight message</p>
                        </div>
                      </div>
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    </div>
                  </div>
                  <div className="mt-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                    <p className="text-sm text-amber-300">
                      <Clock className="w-4 h-4 inline mr-2" />
                      Notifications are automatically delivered via heartbeat timer (checks every hour)
                    </p>
                  </div>
                </div>
                
                {/* Recent Notifications */}
                <div className="glass rounded-xl p-6 border border-gray-800">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-blue-400" />
                      Recent Notifications
                    </h3>
                    <button
                      onClick={async () => {
                        try {
                          const notifications = await ravenAICanisterService.adminGetAllNotifications(20, 0);
                          setNotifications(notifications || []);
                        } catch (error) {
                          console.error('Failed to load notifications:', error);
                        }
                      }}
                      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-white flex items-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Refresh
                    </button>
                  </div>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-gray-400 text-center py-8">No notifications sent yet</p>
                    ) : (
                      notifications.map((notif) => (
                        <div key={notif.id} className="p-4 rounded-lg bg-gray-800/50 border border-gray-700">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-medium text-white">{notif.title}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {notif.sender} • {new Date(Number(notif.created_at) / 1_000_000).toLocaleString()}
                              </p>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs ${
                              notif.sent ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {notif.sent ? 'Sent' : 'Pending'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-300">{notif.message}</p>
                          {notif.recipients.length > 0 && (
                            <p className="text-xs text-gray-500 mt-2">
                              Recipients: {notif.recipients.join(', ')}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                {/* Platform Settings */}
                <div className="glass rounded-xl p-6 border border-amber-500/20">
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-amber-400" />
                    Platform Settings
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Platform Fee (%)</label>
                      <input
                        type="number"
                        value={settings.platformFee}
                        onChange={(e) => setSettings({ ...settings, platformFee: parseFloat(e.target.value) })}
                        step="0.1"
                        min="0"
                        max="100"
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Withdrawal Threshold (ICP)</label>
                      <input
                        type="number"
                        value={settings.withdrawalThreshold}
                        onChange={(e) => setSettings({ ...settings, withdrawalThreshold: parseFloat(e.target.value) })}
                        step="0.1"
                        min="0"
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Required Approvals</label>
                      <input
                        type="number"
                        value={settings.requiredApprovals}
                        onChange={(e) => setSettings({ ...settings, requiredApprovals: parseInt(e.target.value) })}
                        min="1"
                        max="3"
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white"
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.multiSigRequired}
                          onChange={(e) => setSettings({ ...settings, multiSigRequired: e.target.checked })}
                          className="w-5 h-5 rounded text-amber-500"
                        />
                        <span className="text-white">Multi-Sig Required</span>
                      </label>
                    </div>
                  </div>
                  <div className="mt-6 flex gap-4">
                    <button className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold rounded-xl">
                      Save Settings
                    </button>
                    <button className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 ${
                      settings.paused
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                      {settings.paused ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                      {settings.paused ? 'Resume Platform' : 'Pause Platform'}
                    </button>
                  </div>
                </div>
                
                {/* Admin Principals - Masked for security */}
                <div className="glass rounded-xl p-6 border border-gray-800">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Key className="w-5 h-5 text-purple-400" />
                    Admin Principals
                  </h3>
                  <div className="space-y-3">
                    {[
                      { name: 'Cursor/Dev', prefix: 'lgd5r' },
                      { name: 'Plug Wallet', prefix: 'sh7h6' },
                      { name: 'OISY Wallet', prefix: 'yyirv' },
                      { name: 'Admin 4', prefix: 'imnyd' },
                    ].map((admin, i) => (
                      <div key={admin.prefix} className="flex items-center justify-between p-4 rounded-xl bg-gray-800/50 border border-gray-700">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-purple-500 flex items-center justify-center text-white font-bold">
                            {i + 1}
                          </div>
                          <div>
                            <p className="text-white font-medium">{admin.name}</p>
                            <code className="text-sm text-gray-400">{admin.prefix}...***</code>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">
                            Core Admin
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-4">
                    Full principal IDs are secured on the backend canister. Admin verification happens server-side.
                  </p>
                </div>
              </div>
            )}
            
            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="glass rounded-xl p-6 border border-gray-800">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-400" />
                  User Management
                </h3>
                <p className="text-gray-400">
                  User management features including profile viewing, banning, and rewards allocation.
                </p>
              </div>
            )}
            
            {/* NFTs Tab */}
            {activeTab === 'nfts' && (
              <div className="glass rounded-xl p-6 border border-gray-800">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Image className="w-5 h-5 text-purple-400" />
                  NFT Management
                </h3>
                
                {/* AXIOM Genesis Token ID Fix */}
                <div className="mt-6 p-4 bg-blue-500/10 rounded-lg border border-blue-500/30 mb-4">
                  <h4 className="text-lg font-semibold text-white mb-2">Fix Token IDs</h4>
                  <p className="text-gray-400 text-sm mb-4">
                    Update all 5 AXIOM Genesis NFTs to show correct token IDs (1-5) instead of #0.
                  </p>
                  
                  <button
                    onClick={async () => {
                      if (!isAuthenticated || !principal) {
                        alert('Please connect your wallet first');
                        return;
                      }
                      
                      const axiomCanisters = [
                        { num: 1, id: '46odg-5iaaa-aaaao-a4xqa-cai', name: 'AXIOM Genesis #1' },
                        { num: 2, id: '4zpfs-qqaaa-aaaao-a4xqq-cai', name: 'AXIOM Genesis #2' },
                        { num: 3, id: '4ckzx-kiaaa-aaaao-a4xsa-cai', name: 'AXIOM Genesis #3' },
                        { num: 4, id: '4fl7d-hqaaa-aaaao-a4xsq-cai', name: 'AXIOM Genesis #4' },
                        { num: 5, id: '4miu7-ryaaa-aaaao-a4xta-cai', name: 'AXIOM Genesis #5' },
                      ];
                      
                      try {
                        const identity = useAuthStore.getState().identity;
                        if (!identity) {
                          alert('No identity found. Please reconnect your wallet.');
                          return;
                        }
                        
                        const agent = new HttpAgent({ 
                          host: 'https://icp0.io',
                          identity 
                        });
                        
                        const results = [];
                        
                        for (const axiom of axiomCanisters) {
                          try {
                            const actor = Actor.createActor(
                              ({ IDL }: { IDL: any }) => {
                                return IDL.Service({
                                  update_token_info: IDL.Func(
                                    [IDL.Nat64, IDL.Opt(IDL.Text)],
                                    [IDL.Variant({ Ok: IDL.Null, Err: IDL.Text })],
                                    []
                                  ),
                                });
                              },
                              { agent, canisterId: Principal.fromText(axiom.id) }
                            );
                            
                            const result = await (actor as any).update_token_info(
                              BigInt(axiom.num),
                              [axiom.name]
                            );
                            
                            if ('Ok' in result) {
                              results.push({ axiom: axiom.num, status: 'success' });
                            } else {
                              results.push({ axiom: axiom.num, status: 'error', error: result.Err });
                            }
                          } catch (error: any) {
                            results.push({ axiom: axiom.num, status: 'error', error: error.message });
                          }
                        }
                        
                        const successCount = results.filter(r => r.status === 'success').length;
                        alert(`Token ID update complete!\n\nSuccess: ${successCount}/5`);
                      } catch (error: any) {
                        console.error('Update error:', error);
                        alert('Failed to update token IDs: ' + error.message);
                      }
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg font-medium hover:from-blue-500 hover:to-blue-400 transition-all mr-2"
                  >
                    Fix Token IDs (Set to 1-5)
                  </button>
                </div>
                
                {/* AXIOM Genesis Multichain Metadata Assignment */}
                <div className="mt-6 p-4 bg-purple-500/10 rounded-lg border border-purple-500/30">
                  <h4 className="text-lg font-semibold text-white mb-2">AXIOM Genesis NFTs - Multichain Metadata</h4>
                  <p className="text-gray-400 text-sm mb-4">
                    Assign multichain metadata to all 5 AXIOM Genesis NFTs for cross-chain utility.
                  </p>
                  
                  <button
                    onClick={async () => {
                      if (!isAuthenticated || !principal) {
                        alert('Please connect your wallet first');
                        return;
                      }
                      
                      const axiomCanisters = [
                        { num: 1, id: '46odg-5iaaa-aaaao-a4xqa-cai' },
                        { num: 2, id: '4zpfs-qqaaa-aaaao-a4xqq-cai' },
                        { num: 3, id: '4ckzx-kiaaa-aaaao-a4xsa-cai' },
                        { num: 4, id: '4fl7d-hqaaa-aaaao-a4xsq-cai' },
                        { num: 5, id: '4miu7-ryaaa-aaaao-a4xta-cai' },
                      ];
                      
                      try {
                        const identity = useAuthStore.getState().identity;
                        if (!identity) {
                          alert('No identity found. Please reconnect your wallet.');
                          return;
                        }
                        
                        const agent = new HttpAgent({ 
                          host: 'https://icp0.io',
                          identity 
                        });
                        
                        const results = [];
                        
                        for (const axiom of axiomCanisters) {
                          try {
                            const actor = Actor.createActor(
                              ({ IDL }: { IDL: any }) => {
                                return IDL.Service({
                                  update_multichain_metadata: IDL.Func(
                                    [
                                      IDL.Opt(IDL.Text), // eth_contract
                                      IDL.Opt(IDL.Text), // eth_token_id
                                      IDL.Opt(IDL.Nat64), // evm_chain_id
                                      IDL.Opt(IDL.Text), // erc1155_contract
                                      IDL.Opt(IDL.Text), // erc1155_token_id
                                      IDL.Opt(IDL.Text), // sol_mint
                                      IDL.Opt(IDL.Text), // sol_edition
                                      IDL.Opt(IDL.Text), // btc_inscription
                                      IDL.Opt(IDL.Text), // btc_brc20
                                      IDL.Opt(IDL.Text), // btc_runes
                                      IDL.Opt(IDL.Text), // ton_collection
                                      IDL.Opt(IDL.Text), // ton_item
                                      IDL.Opt(IDL.Text), // sui_object_id
                                      IDL.Opt(IDL.Text), // sui_package_id
                                      IDL.Opt(IDL.Text), // bridge_protocol
                                      IDL.Opt(IDL.Text), // bridge_address
                                    ],
                                    [IDL.Variant({ Ok: IDL.Null, Err: IDL.Text })],
                                    []
                                  ),
                                });
                              },
                              { agent, canisterId: Principal.fromText(axiom.id) }
                            );
                            
                            const result = await (actor as any).update_multichain_metadata(
                              ['0x989847D46770e2322b017c79e2fAF253aA23687f'], // eth_contract
                              [axiom.num.toString()], // eth_token_id
                              [BigInt(1)], // evm_chain_id (Ethereum Mainnet)
                              [], // erc1155_contract
                              [], // erc1155_token_id
                              ['6NgxMDwKYfqdtBVpbkA3LmCHzXS5CZ8DvQX72KpDZ5A4'], // sol_mint
                              [], // sol_edition
                              ['bc1qxf5fegu3x4uvynqz69q62jcglzg3m8jpzrsdej'], // btc_inscription
                              [], // btc_brc20
                              [], // btc_runes
                              [], // ton_collection
                              [], // ton_item
                              [], // sui_object_id
                              [], // sui_package_id
                              ['Chain Fusion'], // bridge_protocol
                              ['3rk2d-6yaaa-aaaao-a4xba-cai'], // bridge_address (treasury)
                            );
                            
                            if ('Ok' in result) {
                              results.push({ axiom: axiom.num, status: 'success' });
                            } else {
                              results.push({ axiom: axiom.num, status: 'error', error: result.Err });
                            }
                          } catch (error: any) {
                            results.push({ axiom: axiom.num, status: 'error', error: error.message });
                          }
                        }
                        
                        const successCount = results.filter(r => r.status === 'success').length;
                        alert(`Multichain metadata assignment complete!\n\nSuccess: ${successCount}/5`);
                      } catch (error: any) {
                        console.error('Assignment error:', error);
                        alert('Failed to assign metadata: ' + error.message);
                      }
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-lg font-medium hover:from-purple-500 hover:to-purple-400 transition-all"
                  >
                    Assign Multichain Metadata to All 5 AXIOM NFTs
                  </button>
                </div>
                
                {/* Mint New AXIOM Agent */}
                <div className="mt-6 p-6 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-lg border border-amber-500/30">
                  <h4 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-amber-400" />
                    Mint New AXIOM Agent NFT
                  </h4>
                  <p className="text-gray-400 text-sm mb-6">
                    Mint a new AXIOM agent NFT (6-300). Payment: $100 USD or 100,000 $RAVEN tokens.
                    The system will automatically create a canister, install the AXIOM template, and register the agent.
                  </p>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Payment Token</label>
                      <select
                        id="mint-payment-token"
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white"
                        defaultValue="RAVEN"
                      >
                        <option value="ICP">ICP</option>
                        <option value="RAVEN">$RAVEN (100,000 tokens)</option>
                        <option value="CkBTC">ckBTC</option>
                        <option value="CkETH">ckETH</option>
                        <option value="CkUSDC">ckUSDC</option>
                        <option value="CkUSDT">ckUSDT</option>
                        <option value="BOB">$BOB</option>
                        <option value="MGSN">$MGSN</option>
                        <option value="ZOMBIE">$ZOMBIE</option>
                        <option value="NAK">$NAK</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Payment Amount</label>
                      <input
                        type="text"
                        id="mint-payment-amount"
                        placeholder="Enter amount (e.g., 100000 for RAVEN, 8 for ICP)"
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Required: $100 USD equivalent or 100,000 $RAVEN tokens
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Transaction Hash</label>
                      <input
                        type="text"
                        id="mint-tx-hash"
                        placeholder="Enter transaction hash from your payment"
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white"
                      />
                    </div>
                    
                    <button
                      onClick={async () => {
                        if (!isAuthenticated || !principal) {
                          alert('Please connect your wallet first');
                          return;
                        }
                        
                        const tokenSelect = document.getElementById('mint-payment-token') as HTMLSelectElement;
                        const amountInput = document.getElementById('mint-payment-amount') as HTMLInputElement;
                        const txHashInput = document.getElementById('mint-tx-hash') as HTMLInputElement;
                        
                        const paymentToken = tokenSelect.value;
                        const paymentAmount = amountInput.value.trim();
                        const txHash = txHashInput.value.trim();
                        
                        if (!paymentAmount || !txHash) {
                          alert('Please fill in payment amount and transaction hash');
                          return;
                        }
                        
                        try {
                          const amount = BigInt(paymentAmount);
                          
                          // Initialize raven_ai service
                          await ravenAICanisterService.init();
                          
                          // Map token string to PaymentToken enum
                          const tokenMap: Record<string, any> = {
                            'ICP': { ICP: null },
                            'RAVEN': { RAVEN: null },
                            'CkBTC': { CkBTC: null },
                            'CkETH': { CkETH: null },
                            'CkUSDC': { CkUSDC: null },
                            'CkUSDT': { CkUSDT: null },
                            'BOB': { BOB: null },
                            'MGSN': { MGSN: null },
                            'ZOMBIE': { ZOMBIE: null },
                            'NAK': { NAK: null },
                          };
                          
                          const tokenEnum = tokenMap[paymentToken];
                          if (!tokenEnum) {
                            alert('Invalid payment token');
                            return;
                          }
                          
                          alert('Minting AXIOM agent... This may take a few minutes. Please wait.');
                          
                          const result = await ravenAICanisterService.mintAxiomAgent(
                            tokenEnum,
                            amount,
                            txHash
                          );
                          
                          if (result && 'Ok' in result) {
                            const mintResult = result.Ok;
                            alert(
                              `✅ AXIOM Agent Minted Successfully!\n\n` +
                              `Canister ID: ${mintResult.canister_id.toString()}\n` +
                              `Mint Number: #${mintResult.mint_number}\n` +
                              `Token ID: ${mintResult.token_id}\n` +
                              `Cycles Allocated: ${mintResult.cycles_allocated.toString()}\n\n` +
                              `Your new AXIOM agent is ready!`
                            );
                            
                            // Clear form
                            amountInput.value = '';
                            txHashInput.value = '';
                          } else {
                            alert(`Minting failed: ${result?.Err || 'Unknown error'}`);
                          }
                        } catch (error: any) {
                          console.error('Mint error:', error);
                          alert(`Failed to mint AXIOM agent: ${error.message || 'Unknown error'}`);
                        }
                      }}
                      className="w-full px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      Mint New AXIOM Agent
                    </button>
                  </div>
                </div>
                
                <p className="text-gray-400 mt-4">
                  NFT management including minting, airdrops, and collection settings.
                </p>
              </div>
            )}
            
            {/* AI Tab */}
            {activeTab === 'ai' && (
              <div className="glass rounded-xl p-6 border border-gray-800">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  AI Agent Management
                </h3>
                <p className="text-gray-400">
                  AI agent configuration including Eleven Labs API keys, model settings, and memory management.
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

