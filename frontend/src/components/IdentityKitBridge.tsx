import { useEffect } from 'react';
import { useIdentity, useAuth } from "@nfid/identitykit/react";
import { useAuthStore } from '../stores/authStore';
import { ravenAICanisterService } from '../services/ravenAICanisterService';
import { useWalletStore } from '../stores/walletStore';
import { HttpAgent } from '@dfinity/agent';
import { getICHost, isMainnet } from '../services/canisterConfig';

export const IdentityKitBridge = () => {
  const identity = useIdentity();
  const { user } = useAuth();
  const { isAuthenticated, principal: storePrincipal, logout: storeLogout } = useAuthStore();

  useEffect(() => {
    if (identity && user?.principal) {
      const principal = user.principal;
      
      // If principal changed or store is not authenticated, update store
      if (!isAuthenticated || storePrincipal?.toText() !== principal.toText()) {
        console.log('🔄 Syncing IdentityKit with authStore:', principal.toText());
        
        // Update authStore state
        useAuthStore.setState({
          identity,
          principal,
          isAuthenticated: true,
          isLoading: false,
        });

        // Also sync into walletStore so ALL services can use one canonical agent/principal
        (async () => {
          try {
            const agent = new HttpAgent({ identity, host: getICHost() });
            if (!isMainnet()) {
              await agent.fetchRootKey();
            }
            useWalletStore.setState({
              isConnected: true,
              isConnecting: false,
              walletType: 'internet-identity',
              principal,
              identity,
              agent,
              error: null,
            } as any);
          } catch (e) {
            console.error('Failed to sync IdentityKit into walletStore:', e);
          }
        })();

        // Check admin status and update balances
        const syncState = async () => {
          try {
            await ravenAICanisterService.init(identity);
            const isAdmin = await ravenAICanisterService.isAdmin(principal);
            useAuthStore.setState({ isAdmin });
            await useAuthStore.getState().updateBalances();
          } catch (e) {
            console.error('Failed to sync state:', e);
          }
        };
        
        syncState();
      }
    }
  }, [identity, user, isAuthenticated, storePrincipal, storeLogout]);

  return null; // This component doesn't render anything
};








