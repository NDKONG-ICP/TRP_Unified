/**
 * Wallet Profile Component
 * Displays connected wallet information across all chains
 */

import React from 'react';
import { Wallet, Copy, ExternalLink, LogOut } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useWalletStore } from '../../stores/walletStore';
import { Principal } from '@dfinity/principal';

interface WalletProfileProps {
  onDisconnect?: () => void;
}

export default function WalletProfile({ onDisconnect }: WalletProfileProps) {
  const { principal, isAuthenticated } = useAuthStore();
  const { walletType, balances } = useWalletStore();

  if (!isAuthenticated || !principal) {
    return null;
  }

  const principalText = principal.toText();
  const shortPrincipal = `${principalText.slice(0, 6)}...${principalText.slice(-4)}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add toast notification here
  };

  const viewOnExplorer = () => {
    const url = `https://dashboard.internetcomputer.org/account/${principalText}`;
    window.open(url, '_blank');
  };

  return (
    <div className="glass rounded-2xl p-6 border border-gray-800">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center">
          <Wallet className="w-6 h-6 text-black" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-white">Connected Wallet</h3>
          <p className="text-sm text-gray-400 capitalize">{walletType || 'Internet Identity'}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Principal</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-gray-900 rounded-lg text-sm text-gray-300">
              {shortPrincipal}
            </code>
            <button
              onClick={() => copyToClipboard(principalText)}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              title="Copy full principal"
            >
              <Copy className="w-4 h-4 text-gray-400" />
            </button>
            <button
              onClick={viewOnExplorer}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              title="View on IC Dashboard"
            >
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {balances && (
          <div>
            <label className="text-xs text-gray-500 mb-2 block">Balances</label>
            <div className="space-y-2">
              {Number(balances.icp) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">ICP</span>
                  <span className="text-white">{(Number(balances.icp) / 1e8).toFixed(4)}</span>
                </div>
              )}
              {Number(balances.harlee) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">HARLEE</span>
                  <span className="text-white">{(Number(balances.harlee) / 1e8).toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {onDisconnect && (
          <button
            onClick={onDisconnect}
            className="w-full mt-4 px-4 py-2 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Disconnect
          </button>
        )}
      </div>
    </div>
  );
}

