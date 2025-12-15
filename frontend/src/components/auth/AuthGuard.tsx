/**
 * Authentication Guard Component
 * Protects routes that require authentication
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import WalletConnect from '../wallet/WalletConnect';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  allowedChains?: ('icp' | 'ethereum' | 'solana' | 'bitcoin' | 'sui')[];
}

export default function AuthGuard({ 
  children, 
  requireAuth = true,
  allowedChains 
}: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const [showWalletModal, setShowWalletModal] = React.useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    return (
      <>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Authentication Required</h2>
            <p className="text-gray-400 mb-6">Please connect your wallet to continue</p>
            <button
              onClick={() => setShowWalletModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold rounded-xl hover:shadow-lg transition-all"
            >
              Connect Wallet
            </button>
          </div>
        </div>
        <WalletConnect isOpen={showWalletModal} onClose={() => setShowWalletModal(false)} />
      </>
    );
  }

  return <>{children}</>;
}

