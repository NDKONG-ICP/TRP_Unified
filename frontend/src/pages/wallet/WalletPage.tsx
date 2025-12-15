import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Wallet, 
  Send, 
  ArrowDownLeft, 
  Copy, 
  Check, 
  RefreshCw,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  AlertCircle
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useTransactions, Transaction, formatTransactionType, getTransactionTypeColor } from '../../services/transactionService';
import { LoadingSpinner, TransactionSkeleton, ErrorDisplay, EmptyState } from '../../components/shared/DataFetching';

export default function WalletPage() {
  const { isAuthenticated, login, principal, balances, updateBalances, isLoadingBalances } = useAuthStore();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'send' | 'receive'>('overview');
  
  // Fetch real transaction history
  const { 
    transactions, 
    isLoading: txLoading, 
    error: txError, 
    refresh: refreshTx 
  } = useTransactions(undefined, {
    principal: principal?.toText(),
    limit: 10,
    autoRefresh: true,
    refreshInterval: 60000, // Refresh every minute
  });

  useEffect(() => {
    if (isAuthenticated) {
      updateBalances();
    }
  }, [isAuthenticated]);

  const copyPrincipal = () => {
    if (principal) {
      navigator.clipboard.writeText(principal.toText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatBalance = (balance: bigint, decimals: number = 8) => {
    const num = Number(balance) / Math.pow(10, decimals);
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  };

  const formatTxAmount = (amount: bigint, decimals: number = 8) => {
    const num = Number(amount) / Math.pow(10, decimals);
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateAddress = (address: string) => {
    if (address.length <= 16) return address;
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-gold rounded-3xl p-12 text-center"
        >
          <Wallet className="w-16 h-16 text-gold-400 mx-auto mb-6" />
          <h2 className="text-3xl font-display font-bold text-white mb-4">
            Connect Your Wallet
          </h2>
          <p className="text-silver-400 mb-8 max-w-md mx-auto">
            Connect with Internet Identity to view your balances and manage your assets
          </p>
          <button onClick={login} className="btn-gold">
            Connect Wallet
          </button>
        </motion.div>
      </div>
    );
  }

  const tokens = [
    { symbol: 'ICP', name: 'Internet Computer', balance: balances.icp, decimals: 8 },
    { symbol: 'ckBTC', name: 'Chain-Key Bitcoin', balance: balances.ckBTC, decimals: 8 },
    { symbol: 'ckETH', name: 'Chain-Key Ethereum', balance: balances.ckETH, decimals: 18 },
    { symbol: 'ckUSDC', name: 'Chain-Key USDC', balance: balances.ckUSDC, decimals: 6 },
    { symbol: '$HARLEE', name: 'HARLEE Token', balance: balances.harlee || 0n, decimals: 8 },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl font-display font-bold mb-4">
          <span className="text-white">My</span>{' '}
          <span className="text-gradient-gold">Wallet</span>
        </h1>
        <p className="text-silver-400">Manage your multi-chain assets</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Wallet Info */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-1 space-y-6"
        >
          {/* Principal Card */}
          <div className="glass-gold rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-silver-500 mb-3">Principal ID</h3>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm text-gold-300 font-mono bg-raven-dark rounded-lg p-3 truncate">
                {principal?.toText()}
              </code>
              <button
                onClick={copyPrincipal}
                className="p-3 rounded-lg bg-raven-dark hover:bg-gold-500/20 transition-colors"
                aria-label="Copy principal ID"
              >
                {copied ? (
                  <Check className="w-5 h-5 text-green-500" />
                ) : (
                  <Copy className="w-5 h-5 text-silver-500" />
                )}
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="glass-gold rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-silver-500 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setActiveTab('send')}
                className={`flex flex-col items-center p-4 rounded-xl transition-colors ${
                  activeTab === 'send'
                    ? 'bg-gold-500/20 border border-gold-500/30'
                    : 'bg-raven-dark hover:bg-gold-500/10'
                }`}
              >
                <Send className="w-6 h-6 text-gold-400 mb-2" />
                <span className="text-sm text-silver-400">Send</span>
              </button>
              <button
                onClick={() => setActiveTab('receive')}
                className={`flex flex-col items-center p-4 rounded-xl transition-colors ${
                  activeTab === 'receive'
                    ? 'bg-gold-500/20 border border-gold-500/30'
                    : 'bg-raven-dark hover:bg-gold-500/10'
                }`}
              >
                <ArrowDownLeft className="w-6 h-6 text-gold-400 mb-2" />
                <span className="text-sm text-silver-400">Receive</span>
              </button>
            </div>
          </div>

          {/* Refresh */}
          <button
            onClick={() => {
              updateBalances();
              refreshTx();
            }}
            disabled={isLoadingBalances || txLoading}
            className="w-full py-3 glass rounded-xl text-silver-400 hover:text-gold-400 transition-colors flex items-center justify-center disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 mr-2 ${(isLoadingBalances || txLoading) ? 'animate-spin' : ''}`} />
            {(isLoadingBalances || txLoading) ? 'Refreshing...' : 'Refresh'}
          </button>
        </motion.div>

        {/* Right Column - Balances & Activity */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2 space-y-6"
        >
          {/* Token Balances */}
          <div className="glass-gold rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Token Balances</h3>
              {isLoadingBalances && <LoadingSpinner size="sm" />}
            </div>
            <div className="space-y-3">
              {tokens.map((token) => (
                <div
                  key={token.symbol}
                  className="flex items-center justify-between p-4 bg-raven-dark rounded-xl hover:bg-gold-500/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gold-500/20 flex items-center justify-center">
                      <span className="text-gold-400 font-bold text-sm">
                        {token.symbol === '$HARLEE' ? '🦅' : token.symbol.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-white">{token.symbol}</p>
                      <p className="text-xs text-silver-500">{token.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-white">
                      {formatBalance(token.balance, token.decimals)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="glass-gold rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Recent Transactions</h3>
              {txLoading && !transactions.length && <LoadingSpinner size="sm" />}
            </div>
            
            {/* Error State */}
            {txError && (
              <ErrorDisplay 
                error={txError} 
                onRetry={refreshTx}
                variant="inline"
                className="mb-4"
              />
            )}

            {/* Loading State */}
            {txLoading && !transactions.length && (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <TransactionSkeleton key={i} />
                ))}
              </div>
            )}

            {/* Empty State */}
            {!txLoading && !txError && transactions.length === 0 && (
              <EmptyState
                title="No Transactions Yet"
                message="Your transaction history will appear here once you start making transfers."
                icon={<Wallet className="w-16 h-16" />}
              />
            )}

            {/* Transaction List */}
            {transactions.length > 0 && (
              <div className="space-y-3">
                {transactions.map((tx) => {
                  const isIncoming = tx.type === 'deposit' || tx.type === 'staking_reward' || tx.type === 'airdrop';
                  
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-4 bg-raven-dark rounded-xl hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isIncoming ? 'bg-green-500/20' : 'bg-orange-500/20'
                        }`}>
                          {isIncoming ? (
                            <ArrowDownLeft className="w-5 h-5 text-green-400" />
                          ) : (
                            <Send className="w-5 h-5 text-orange-400" />
                          )}
                        </div>
                        <div>
                          <p className={`font-medium ${getTransactionTypeColor(tx.type)}`}>
                            {formatTransactionType(tx.type)}
                          </p>
                          <p className="text-xs text-silver-500">
                            {tx.from ? `From: ${truncateAddress(tx.from)}` : 
                             tx.to ? `To: ${truncateAddress(tx.to)}` : 
                             tx.chain}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${isIncoming ? 'text-green-400' : 'text-orange-400'}`}>
                          {isIncoming ? '+' : '-'}{formatTxAmount(tx.amount)} {tx.token}
                        </p>
                        <p className="text-xs text-silver-500">{formatTimestamp(tx.timestamp)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <a
              href={`https://dashboard.internetcomputer.org/account/${principal?.toText()}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center text-sm text-gold-400 hover:text-gold-300 transition-colors"
            >
              View All on Explorer
              <ExternalLink className="w-4 h-4 ml-1" />
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
