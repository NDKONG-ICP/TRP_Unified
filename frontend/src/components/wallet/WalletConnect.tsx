/**
 * Multi-Chain Wallet Connect Modal
 * Supports all wallet types across all chains
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wallet, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useWalletStore } from '../../stores/walletStore';
import { isMetaMaskInstalled } from '../../services/wallets/ethereum';
import { isPhantomInstalled } from '../../services/wallets/solana';
import { isUnisatInstalled, isXverseInstalled } from '../../services/wallets/bitcoin';
import { isSuiWalletInstalled } from '../../services/wallets/sui';
import type { AuthChain } from '../../services/auth';
import { kipService } from '../../services/kipService';
import { connectPhantom, signMessage as solanaSignMessage } from '../../services/wallets/solana';
import { connectSuiWallet, signMessage as suiSignMessage } from '../../services/wallets/sui';
import bs58 from 'bs58';

interface WalletOption {
  id: string;
  name: string;
  chain: AuthChain | 'icp';
  icon: string;
  description: string;
  available: boolean;
  recommended?: boolean;
}

const walletOptions: WalletOption[] = [
  // ICP Wallets
  {
    id: 'internet-identity',
    name: 'Internet Identity',
    chain: 'icp',
    icon: '🌐',
    description: 'Secure, anonymous authentication by DFINITY',
    available: true,
    recommended: true,
  },
  {
    id: 'plug',
    name: 'Plug Wallet',
    chain: 'icp',
    icon: '🔌',
    description: 'Browser extension wallet for ICP',
    available: typeof window !== 'undefined' && !!(window as any).ic?.plug,
  },
  {
    id: 'oisy',
    name: 'OISY Wallet',
    chain: 'icp',
    icon: '💎',
    description: 'Multi-chain wallet on Internet Computer',
    available: true,
  },
  {
    id: 'nfid',
    name: 'NFID',
    chain: 'icp',
    icon: '🔐',
    description: 'Web3 identity with email login',
    available: true,
  },
  // Ethereum Wallets
  {
    id: 'metamask',
    name: 'MetaMask',
    chain: 'ethereum',
    icon: '🦊',
    description: 'Connect with your Ethereum wallet',
    available: isMetaMaskInstalled(),
  },
  // Solana Wallets
  {
    id: 'phantom',
    name: 'Phantom',
    chain: 'solana',
    icon: '👻',
    description: 'Connect with your Solana wallet',
    available: isPhantomInstalled(),
  },
  // Bitcoin Wallets
  {
    id: 'unisat',
    name: 'Unisat',
    chain: 'bitcoin',
    icon: '₿',
    description: 'Connect with your Bitcoin wallet',
    available: isUnisatInstalled(),
  },
  {
    id: 'xverse',
    name: 'Xverse',
    chain: 'bitcoin',
    icon: '🔷',
    description: 'Connect with your Bitcoin wallet',
    available: isXverseInstalled(),
  },
  // Sui Wallets
  {
    id: 'sui-wallet',
    name: 'Sui Wallet',
    chain: 'sui',
    icon: '💧',
    description: 'Connect with your Sui wallet',
    available: isSuiWalletInstalled(),
  },
];

interface WalletConnectProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WalletConnect({ isOpen, onClose }: WalletConnectProps) {
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { login, isAuthenticated, identity } = useAuthStore();
  const { connect: connectWallet } = useWalletStore();

  const normalizeSignatureToBase58 = (sig: string): string => {
    if (sig.startsWith('0x')) return sig;
    try {
      const bytes = bs58.decode(sig);
      if (bytes.length === 64) return sig;
    } catch {
      // fallthrough
    }
    const raw = atob(sig);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    return bs58.encode(bytes);
  };

  const formatSIWSMessageBackend = (msg: any): string => {
    let formatted = `${msg.domain} wants you to sign in with your Solana account:\n`;
    formatted += `${msg.address}\n\n`;
    if (msg.statement && msg.statement.length > 0) {
      formatted += `${msg.statement[0]}\n\n`;
    }
    formatted += `URI: ${msg.uri}\n`;
    formatted += `Version: ${msg.version}\n`;
    formatted += `Chain ID: ${msg.chain_id}\n`;
    formatted += `Nonce: ${msg.nonce}\n`;
    formatted += `Issued At: ${msg.issued_at}`;
    return formatted;
  };

  const formatSISMessageBackend = (msg: any): string => {
    let formatted = `${msg.domain} wants you to sign in with your Sui account:\n`;
    formatted += `${msg.address}\n\n`;
    if (msg.statement && msg.statement.length > 0) {
      formatted += `${msg.statement[0]}\n\n`;
    }
    formatted += `URI: ${msg.uri}\n`;
    formatted += `Version: ${msg.version}\n`;
    formatted += `Chain ID: ${msg.chain_id}\n`;
    formatted += `Nonce: ${msg.nonce}\n`;
    formatted += `Issued At: ${msg.issued_at}`;
    return formatted;
  };

  const linkExternalWallet = async (walletId: string) => {
    if (!isAuthenticated || !identity) {
      throw new Error('Connect an ICP wallet first. External wallets are linked to your ICP principal.');
    }
    await kipService.init(identity);

    if (walletId === 'phantom') {
      const challenge = await kipService.startLinkWallet('phantom');
      const msg0 = challenge.payload?.Solana;
      if (!msg0) throw new Error('Unexpected challenge payload for Solana');
      const conn = await connectPhantom();
      const msg = { ...msg0, address: conn.wallet.address };
      const formatted = formatSIWSMessageBackend(msg);
      const sigBytes = await solanaSignMessage(formatted);
      const signature = bs58.encode(sigBytes);
      await kipService.confirmLinkWallet({ Solana: msg }, signature);
      return;
    }

    if (walletId === 'sui-wallet') {
      const challenge = await kipService.startLinkWallet('sui');
      const msg0 = challenge.payload?.Sui;
      if (!msg0) throw new Error('Unexpected challenge payload for Sui');
      const conn = await connectSuiWallet();
      const addrOrPubkey = conn.wallet.publicKey || conn.wallet.address;
      const msg = { ...msg0, address: addrOrPubkey };
      const formatted = formatSISMessageBackend(msg);
      const rawSig = await suiSignMessage(formatted);
      const signature = normalizeSignatureToBase58(rawSig);
      await kipService.confirmLinkWallet({ Sui: msg }, signature);
      return;
    }

    throw new Error('Linking for this wallet is not implemented yet.');
  };

  const handleConnect = async (walletId: string, chain: AuthChain | 'icp') => {
    setConnecting(walletId);
    setError(null);

    try {
      if (chain === 'icp') {
        // Handle ICP wallets
        switch (walletId) {
          case 'internet-identity': {
            const success = await login();
            if (success) {
              onClose();
            } else {
              setError('Failed to connect with Internet Identity');
            }
            break;
          }
          case 'plug':
          case 'oisy':
          case 'nfid': {
            const success = await connectWallet(walletId as any);
            if (success) {
              onClose();
            } else {
              setError(`Failed to connect with ${walletId}`);
            }
            break;
          }
          default:
            setError(`Unknown ICP wallet: ${walletId}`);
        }
      } else {
        // External chain wallets are linked to the canonical ICP principal (not used as IC-call identities)
        await linkExternalWallet(walletId);
        onClose();
      }
    } catch (err: any) {
      console.error('Wallet connection error:', err);
      setError(err.message || `Failed to connect ${walletId}`);
    } finally {
      setConnecting(null);
    }
  };

  const groupedWallets = walletOptions.reduce((acc, wallet) => {
    if (!acc[wallet.chain]) {
      acc[wallet.chain] = [];
    }
    acc[wallet.chain].push(wallet);
    return acc;
  }, {} as Record<string, WalletOption[]>);

  const chainLabels: Record<string, string> = {
    icp: 'Internet Computer',
    ethereum: 'Ethereum',
    solana: 'Solana',
    bitcoin: 'Bitcoin',
    sui: 'Sui',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass rounded-3xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-800"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Wallet className="w-6 h-6" />
                Connect Wallet
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-6">
              {Object.entries(groupedWallets).map(([chain, wallets]) => (
                <div key={chain}>
                  <h3 className="text-lg font-semibold text-gray-300 mb-3">
                    {chainLabels[chain] || chain.toUpperCase()}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {wallets.map((wallet) => (
                      <button
                        key={wallet.id}
                        onClick={() => handleConnect(wallet.id, wallet.chain)}
                        disabled={!wallet.available || connecting === wallet.id}
                        className={`
                          relative p-4 rounded-xl border transition-all
                          ${wallet.available
                            ? 'border-gray-700 hover:border-gray-600 bg-gray-900/50 hover:bg-gray-800/50 cursor-pointer'
                            : 'border-gray-800 bg-gray-900/30 opacity-50 cursor-not-allowed'
                          }
                          ${connecting === wallet.id ? 'animate-pulse' : ''}
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{wallet.icon}</span>
                          <div className="flex-1 text-left">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white">{wallet.name}</span>
                              {wallet.recommended && (
                                <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
                                  Recommended
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 mt-1">{wallet.description}</p>
                          </div>
                          {connecting === wallet.id ? (
                            <div className="w-5 h-5 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-500" />
                          )}
                        </div>
                        {!wallet.available && (
                          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 rounded-xl">
                            <span className="text-xs text-gray-500">Not Available</span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-800">
              <p className="text-xs text-gray-500 text-center">
                By connecting, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

