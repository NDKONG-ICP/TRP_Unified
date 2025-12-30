import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wallet, Send, ArrowDownLeft, ArrowUpRight, Copy, Check, ExternalLink, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { ICSpicyMintService } from '../../services/icSpicyMintService';
import type { Transaction } from '../../services/icSpicyMintService';
import { Principal } from '@dfinity/principal';

interface UserNFT {
  id: string;
  name: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  tokenId: bigint;
}

export default function WalletPage() {
  const { isAuthenticated, login, principal, balances } = useAuthStore();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'nfts' | 'history'>('nfts');
  const [ownedNFTs, setOwnedNFTs] = useState<UserNFT[]>([]);
  const [isLoadingNFTs, setIsLoadingNFTs] = useState(false);
  const [nftError, setNftError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);

  const copyPrincipal = () => {
    if (principal) {
      navigator.clipboard.writeText(principal.toText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-3xl p-12 text-center border border-spicy-orange/20"
        >
          <Wallet className="w-16 h-16 text-spicy-orange mx-auto mb-6" />
          <h2 className="text-3xl font-display font-bold text-white mb-4">
            Connect Your Wallet
          </h2>
          <p className="text-silver-400 mb-8 max-w-md mx-auto">
            Connect with Internet Identity to view your NFTs and transaction history
          </p>
          <button onClick={login} className="btn-gold">
            Connect Wallet
          </button>
        </motion.div>
      </div>
    );
  }

  // Fetch user NFTs from backend
  useEffect(() => {
    const fetchNFTs = async () => {
      if (!isAuthenticated || !principal) {
        setOwnedNFTs([]);
        return;
      }

      setIsLoadingNFTs(true);
      setNftError(null);

      try {
        const tokenIds = await ICSpicyMintService.getUserTokens(Principal.fromText(principal.toString()));
        
        // Fetch metadata for each NFT
        const nftsPromises = tokenIds.map(async (tokenId) => {
          const metadata = await ICSpicyMintService.getNFTMetadata(tokenId);
          
          // Use metadata rarity if available, otherwise fallback to simplified calculation
          let rarity: UserNFT['rarity'] = 'common';
          if (metadata?.rarity) {
            const r = (metadata.rarity as any) as string;
            if (['common', 'uncommon', 'rare', 'epic', 'legendary'].includes(r)) {
              rarity = r as any;
            }
          } else {
            const rarityIndex = Number(tokenId) % 4;
            const rarities: UserNFT['rarity'][] = ['common', 'rare', 'epic', 'legendary'];
            rarity = rarities[rarityIndex];
          }
          
          return {
            id: `nft-${tokenId}`,
            name: `IC Spicy #${tokenId}`,
            rarity,
            tokenId,
          };
        });
        
        const nfts = await Promise.all(nftsPromises);
        setOwnedNFTs(nfts);
      } catch (error: any) {
        console.error('Failed to fetch NFTs:', error);
        setNftError(error.message || 'Failed to load NFTs');
        setOwnedNFTs([]);
      } finally {
        setIsLoadingNFTs(false);
      }
    };

    fetchNFTs();
  }, [isAuthenticated, principal]);

  // Fetch transaction history
  useEffect(() => {
    const fetchTransactions = async () => {
      if (!isAuthenticated || !principal) {
        setTransactions([]);
        return;
      }

      setIsLoadingTransactions(true);
      try {
        const backendTxs = await ICSpicyMintService.getUserTransactions(Principal.fromText(principal.toString()));
        setTransactions(backendTxs);
      } catch (error: any) {
        console.error('Failed to fetch transactions:', error);
        setTransactions([]);
      } finally {
        setIsLoadingTransactions(false);
      }
    };

    fetchTransactions();
  }, [isAuthenticated, principal, ownedNFTs]);

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
          <span className="text-spicy-orange">Wallet</span>
        </h1>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Wallet Info */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-1 space-y-6"
        >
          {/* Principal Card */}
          <div className="glass rounded-2xl p-6 border border-spicy-orange/20">
            <h3 className="text-sm font-semibold text-silver-500 mb-3">Principal ID</h3>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm text-white font-mono bg-raven-dark rounded-lg p-3 truncate">
                {principal?.toText()}
              </code>
              <button
                onClick={copyPrincipal}
                className="p-3 rounded-lg bg-raven-dark hover:bg-spicy-orange/20 transition-colors"
              >
                {copied ? (
                  <Check className="w-5 h-5 text-green-500" />
                ) : (
                  <Copy className="w-5 h-5 text-silver-500" />
                )}
              </button>
            </div>
          </div>

          {/* Balance Card */}
          <div className="glass rounded-2xl p-6 border border-spicy-orange/20">
            <h3 className="text-sm font-semibold text-silver-500 mb-4">Balances</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-silver-400">ICP</span>
                <span className="text-white font-bold">
                  {(Number(balances.icp) / 1e8).toFixed(4)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-silver-400">ckBTC</span>
                <span className="text-white font-bold">
                  {(Number(balances.ckBTC) / 1e8).toFixed(8)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-silver-400">ckETH</span>
                <span className="text-white font-bold">
                  {(Number(balances.ckETH) / 1e18).toFixed(6)}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="glass rounded-2xl p-6 border border-spicy-orange/20">
            <h3 className="text-sm font-semibold text-silver-500 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <button className="flex flex-col items-center p-4 rounded-xl bg-raven-dark hover:bg-spicy-orange/20 transition-colors">
                <Send className="w-6 h-6 text-spicy-orange mb-2" />
                <span className="text-sm text-silver-400">Send</span>
              </button>
              <button className="flex flex-col items-center p-4 rounded-xl bg-raven-dark hover:bg-spicy-orange/20 transition-colors">
                <ArrowDownLeft className="w-6 h-6 text-spicy-orange mb-2" />
                <span className="text-sm text-silver-400">Receive</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* NFTs & History */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2"
        >
          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('nfts')}
              className={`px-6 py-3 rounded-xl font-medium transition-all ${
                activeTab === 'nfts'
                  ? 'bg-spicy-orange text-white'
                  : 'glass text-silver-400 hover:text-white'
              }`}
            >
              My NFTs ({ownedNFTs.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-3 rounded-xl font-medium transition-all ${
                activeTab === 'history'
                  ? 'bg-spicy-orange text-white'
                  : 'glass text-silver-400 hover:text-white'
              }`}
            >
              History
            </button>
          </div>

          {/* Content */}
          {activeTab === 'nfts' ? (
            <>
              {isLoadingNFTs ? (
                <div className="text-center py-12 glass rounded-2xl border border-spicy-orange/20">
                  <Loader2 className="w-12 h-12 text-spicy-orange mx-auto mb-4 animate-spin" />
                  <p className="text-silver-400">Loading your NFTs...</p>
                </div>
              ) : nftError ? (
                <div className="text-center py-12 glass rounded-2xl border border-red-500/20">
                  <p className="text-red-400 mb-2">Error loading NFTs</p>
                  <p className="text-silver-500 text-sm">{nftError}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {ownedNFTs.map((nft) => (
                <div
                  key={nft.id}
                  className="glass rounded-2xl p-4 border border-spicy-orange/20 hover:border-spicy-orange/40 transition-all cursor-pointer"
                >
                  <div className="flex gap-4">
                    <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-spicy-red/20 to-spicy-orange/20 flex items-center justify-center">
                      <span className="text-3xl">🌶️</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-white">{nft.name}</h4>
                      <span className="text-xs text-spicy-orange capitalize">{nft.rarity}</span>
                      <div className="flex gap-2 mt-3">
                        <button className="px-3 py-1 text-xs rounded-lg bg-spicy-orange/20 text-spicy-orange hover:bg-spicy-orange/30 transition-colors">
                          Transfer
                        </button>
                        <button className="px-3 py-1 text-xs rounded-lg bg-raven-dark text-silver-400 hover:text-white transition-colors">
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

                  {ownedNFTs.length === 0 && !isLoadingNFTs && !nftError && (
                    <div className="col-span-2 text-center py-12 glass rounded-2xl border border-spicy-orange/20">
                      <Wallet className="w-12 h-12 text-silver-600 mx-auto mb-4" />
                      <h3 className="text-lg font-bold text-white mb-2">No NFTs Yet</h3>
                      <p className="text-silver-500 mb-4">Start minting to build your collection</p>
                      <a href="/forge/mint" className="btn-gold inline-block">
                        Mint Now
                      </a>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
                {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="glass rounded-xl p-4 border border-spicy-orange/10 hover:border-spicy-orange/30 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      tx.type === 'mint' ? 'bg-green-500/20' :
                      tx.type === 'claim' ? 'bg-purple-500/20' :
                      'bg-orange-500/20'
                    }`}>
                      {tx.type === 'mint' && <Wallet className="w-5 h-5 text-green-500" />}
                      {tx.type === 'claim' && <ArrowDownLeft className="w-5 h-5 text-purple-500" />}
                      {tx.type === 'transfer' && <ArrowUpRight className="w-5 h-5 text-orange-500" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-white capitalize">{tx.type} #{tx.tokenId}</p>
                      <p className="text-sm text-silver-500">
                        {tx.from ? `From: ${tx.from}` : null}
                        {tx.to ? `To: ${tx.to}` : null}
                        {tx.type === 'mint' && 'Minted'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-silver-400">{new Date(tx.timestamp).toLocaleDateString()}</p>
                      <a
                        href={`https://dashboard.internetcomputer.org/tx/${tx.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-spicy-orange hover:underline flex items-center justify-end mt-1"
                      >
                        View <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}




