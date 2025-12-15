/**
 * Wallet Connect Button Component
 * Unified button for connecting any wallet type
 */

import React, { useState } from 'react';
import { Wallet } from 'lucide-react';
import WalletConnect from './WalletConnect';
import { useAuthStore } from '../../stores/authStore';
import { useWalletStore } from '../../stores/walletStore';

interface WalletButtonProps {
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
}

export default function WalletButton({ className = '', variant = 'default' }: WalletButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { isAuthenticated, principal } = useAuthStore();
  const { walletType } = useWalletStore();

  const buttonClasses = {
    default: 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold',
    outline: 'border-2 border-amber-500 text-amber-400 hover:bg-amber-500/10',
    ghost: 'text-amber-400 hover:bg-amber-500/10',
  };

  if (isAuthenticated && principal) {
    return (
      <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${className}`}>
        <Wallet className="w-4 h-4" />
        <span className="text-sm font-medium">
          {principal.toText().slice(0, 6)}...{principal.toText().slice(-4)}
        </span>
        {walletType && (
          <span className="text-xs text-gray-400 capitalize">{walletType}</span>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`
          flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all
          ${buttonClasses[variant]}
          ${className}
        `}
      >
        <Wallet className="w-5 h-5" />
        Connect Wallet
      </button>
      <WalletConnect isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}

