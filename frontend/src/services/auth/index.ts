/**
 * Unified Authentication Service
 * Provides a single interface for all Sign-In-With-X protocols
 */

import { Principal } from '@dfinity/principal';
import * as siwe from './siwe';
import * as siws from './siws';
import * as siwb from './siwb';
import * as sis from './sis';

export type AuthChain = 'ethereum' | 'solana' | 'bitcoin' | 'sui' | 'icp';

export interface AuthSession {
  chain: AuthChain;
  sessionId: string;
  address: string;
  principal: Principal;
  createdAt: bigint;
  expiresAt: bigint;
}

export interface UnifiedAuthResult {
  session: AuthSession;
  chain: AuthChain;
}

/**
 * Sign in with any supported chain
 */
export async function signInWithChain(
  chain: AuthChain,
  domain: string,
  uri: string
): Promise<UnifiedAuthResult> {
  switch (chain) {
    case 'ethereum':
      const siweSession = await siwe.signInWithEthereum(domain, uri);
      return {
        session: {
          chain: 'ethereum',
          sessionId: siweSession.sessionId,
          address: siweSession.ethAddress,
          principal: siweSession.principal,
          createdAt: siweSession.createdAt,
          expiresAt: siweSession.expiresAt,
        },
        chain: 'ethereum',
      };
      
    case 'solana':
      const siwsSession = await siws.signInWithSolana(domain, uri);
      return {
        session: {
          chain: 'solana',
          sessionId: siwsSession.sessionId,
          address: siwsSession.solanaAddress,
          principal: siwsSession.principal,
          createdAt: siwsSession.createdAt,
          expiresAt: siwsSession.expiresAt,
        },
        chain: 'solana',
      };
      
    case 'bitcoin':
      const siwbSession = await siwb.signInWithBitcoin(domain, uri);
      return {
        session: {
          chain: 'bitcoin',
          sessionId: siwbSession.sessionId,
          address: siwbSession.bitcoinAddress,
          principal: siwbSession.principal,
          createdAt: siwbSession.createdAt,
          expiresAt: siwbSession.expiresAt,
        },
        chain: 'bitcoin',
      };
      
    case 'sui':
      const sisSession = await sis.signInWithSui(domain, uri);
      return {
        session: {
          chain: 'sui',
          sessionId: sisSession.sessionId,
          address: sisSession.suiAddress,
          principal: sisSession.principal,
          createdAt: sisSession.createdAt,
          expiresAt: sisSession.expiresAt,
        },
        chain: 'sui',
      };
      
    case 'icp':
      // ICP uses Internet Identity, handled separately
      throw new Error('ICP authentication should use Internet Identity directly');
      
    default:
      throw new Error(`Unsupported chain: ${chain}`);
  }
}

/**
 * Get session for any chain
 */
export async function getSession(chain: AuthChain, sessionId: string): Promise<AuthSession | null> {
  switch (chain) {
    case 'ethereum':
      const siweSession = await siwe.getSIWESession(sessionId);
      return siweSession ? {
        chain: 'ethereum',
        sessionId: siweSession.sessionId,
        address: siweSession.ethAddress,
        principal: siweSession.principal,
        createdAt: siweSession.createdAt,
        expiresAt: siweSession.expiresAt,
      } : null;
      
    case 'solana':
      const siwsSession = await siws.getSIWSSession(sessionId);
      return siwsSession ? {
        chain: 'solana',
        sessionId: siwsSession.sessionId,
        address: siwsSession.solanaAddress,
        principal: siwsSession.principal,
        createdAt: siwsSession.createdAt,
        expiresAt: siwsSession.expiresAt,
      } : null;
      
    case 'bitcoin':
      const siwbSession = await siwb.getSIWBSession(sessionId);
      return siwbSession ? {
        chain: 'bitcoin',
        sessionId: siwbSession.sessionId,
        address: siwbSession.bitcoinAddress,
        principal: siwbSession.principal,
        createdAt: siwbSession.createdAt,
        expiresAt: siwbSession.expiresAt,
      } : null;
      
    case 'sui':
      const sisSession = await sis.getSISSession(sessionId);
      return sisSession ? {
        chain: 'sui',
        sessionId: sisSession.sessionId,
        address: sisSession.suiAddress,
        principal: sisSession.principal,
        createdAt: sisSession.createdAt,
        expiresAt: sisSession.expiresAt,
      } : null;
      
    default:
      return null;
  }
}

/**
 * Get principal by address for any chain
 */
export async function getPrincipalByAddress(chain: AuthChain, address: string): Promise<Principal | null> {
  switch (chain) {
    case 'ethereum':
      return await siwe.getPrincipalByAddress(address);
    case 'solana':
      return await siws.getPrincipalByAddress(address);
    case 'bitcoin':
      return await siwb.getPrincipalByAddress(address);
    case 'sui':
      return await sis.getPrincipalByAddress(address);
    default:
      return null;
  }
}

/**
 * Get address by principal for any chain
 */
export async function getAddressByPrincipal(chain: AuthChain, principal: Principal): Promise<string | null> {
  switch (chain) {
    case 'ethereum':
      return await siwe.getAddressByPrincipal(principal);
    case 'solana':
      return await siws.getAddressByPrincipal(principal);
    case 'bitcoin':
      return await siwb.getAddressByPrincipal(principal);
    case 'sui':
      return await sis.getAddressByPrincipal(principal);
    default:
      return null;
  }
}

// Re-export all services
export { siwe, siws, siwb, sis };

