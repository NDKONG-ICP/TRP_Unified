/**
 * Sign-In with Ethereum (SIWE) Service
 * Implements EIP-4361 standard for Ethereum authentication
 */

import { ethers } from 'ethers';
import { Actor, HttpAgent, Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { getCanisterId, getICHost, isMainnet } from '../canisterConfig';
import { connectMetaMask, signMessage, getMetaMaskConnection, EthereumConnection } from '../wallets/ethereum';
import { createAuthActor } from './actorHelper';

export interface SIWEMessage {
  domain: string;
  address: string;
  statement?: string;
  uri: string;
  version: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
  expirationTime?: string;
  notBefore?: string;
  requestId?: string;
  resources?: string[];
}

export interface SIWESession {
  sessionId: string;
  ethAddress: string;
  principal: Principal;
  createdAt: bigint;
  expiresAt: bigint;
}

export interface SIWEVerifyResult {
  Ok?: SIWESession;
  Err?: string;
}

// IDL Factory for SIWE canister
const siweIdlFactory = ({ IDL }: any) => {
  const SIWEMessage = IDL.Record({
    domain: IDL.Text,
    address: IDL.Text,
    statement: IDL.Opt(IDL.Text),
    uri: IDL.Text,
    version: IDL.Text,
    chain_id: IDL.Nat64,
    nonce: IDL.Text,
    issued_at: IDL.Text,
    expiration_time: IDL.Opt(IDL.Text),
    not_before: IDL.Opt(IDL.Text),
    request_id: IDL.Opt(IDL.Text),
    resources: IDL.Opt(IDL.Vec(IDL.Text)),
  });
  
  const SIWESession = IDL.Record({
    session_id: IDL.Text,
    eth_address: IDL.Text,
    principal: IDL.Principal,
    created_at: IDL.Nat64,
    expires_at: IDL.Nat64,
  });
  
  const VerifyResult = IDL.Variant({
    Ok: SIWESession,
    Err: IDL.Text,
  });
  
  return IDL.Service({
    verify_siwe: IDL.Func([SIWEMessage, IDL.Text], [VerifyResult], []),
    get_session: IDL.Func([IDL.Text], [IDL.Opt(SIWESession)], ['query']),
    get_principal_by_address: IDL.Func([IDL.Text], [IDL.Opt(IDL.Principal)], ['query']),
    get_address_by_principal: IDL.Func([IDL.Principal], [IDL.Opt(IDL.Text)], ['query']),
    revoke_session: IDL.Func([IDL.Text], [IDL.Bool], []),
    cleanup_sessions: IDL.Func([], [IDL.Nat64], []),
  });
};

/**
 * Format SIWE message according to EIP-4361
 */
export function formatSIWEMessage(message: SIWEMessage): string {
  let formatted = `${message.domain} wants you to sign in with your Ethereum account:\n`;
  formatted += `${message.address}\n\n`;
  
  if (message.statement) {
    formatted += `${message.statement}\n\n`;
  }
  
  formatted += `URI: ${message.uri}\n`;
  formatted += `Version: ${message.version}\n`;
  formatted += `Chain ID: ${message.chainId}\n`;
  formatted += `Nonce: ${message.nonce}\n`;
  formatted += `Issued At: ${message.issuedAt}`;
  
  if (message.expirationTime) {
    formatted += `\nExpiration Time: ${message.expirationTime}`;
  }
  
  if (message.notBefore) {
    formatted += `\nNot Before: ${message.notBefore}`;
  }
  
  if (message.requestId) {
    formatted += `\nRequest ID: ${message.requestId}`;
  }
  
  if (message.resources && message.resources.length > 0) {
    formatted += '\nResources:';
    for (const resource of message.resources) {
      formatted += `\n- ${resource}`;
    }
  }
  
  return formatted;
}

/**
 * Generate a random nonce
 */
export function generateNonce(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Create SIWE message
 */
export function createSIWEMessage(
  address: string,
  domain: string,
  uri: string,
  chainId: number,
  options?: {
    statement?: string;
    expirationTime?: string;
    notBefore?: string;
    requestId?: string;
    resources?: string[];
  }
): SIWEMessage {
  const now = new Date().toISOString();
  
  return {
    domain,
    address,
    statement: options?.statement,
    uri,
    version: '1',
    chainId,
    nonce: generateNonce(),
    issuedAt: now,
    expirationTime: options?.expirationTime,
    notBefore: options?.notBefore,
    requestId: options?.requestId,
    resources: options?.resources,
  };
}

/**
 * Sign in with Ethereum
 */
export async function signInWithEthereum(
  domain: string,
  uri: string,
  chainId: number = 1
): Promise<SIWESession> {
  // Connect to MetaMask
  const connection = await connectMetaMask();
  const { address } = connection.wallet;
  
  // Create SIWE message
  const message = createSIWEMessage(address, domain, uri, chainId, {
    statement: 'Sign in with Ethereum to the Raven Ecosystem',
  });
  
  // Format message
  const formattedMessage = formatSIWEMessage(message);
  
  // Sign message with MetaMask
  const signature = await signMessage(formattedMessage);
  
  // Verify with backend canister (uses actorFactory for Plug wallet support)
  const actor = await createAuthActor('siwe_canister', siweIdlFactory);
  
  // Convert message to backend format
  const backendMessage = {
    domain: message.domain,
    address: message.address,
    statement: message.statement ? [message.statement] : [],
    uri: message.uri,
    version: message.version,
    chain_id: BigInt(message.chainId),
    nonce: message.nonce,
    issued_at: message.issuedAt,
    expiration_time: message.expirationTime ? [message.expirationTime] : [],
    not_before: message.notBefore ? [message.notBefore] : [],
    request_id: message.requestId ? [message.requestId] : [],
    resources: message.resources ? [message.resources] : [],
  };
  
  const result = await (actor as any).verify_siwe(backendMessage, signature) as SIWEVerifyResult;
  
  if (result.Err) {
    throw new Error(result.Err);
  }
  
  if (!result.Ok) {
    throw new Error('SIWE verification failed');
  }
  
  return {
    sessionId: result.Ok.session_id,
    ethAddress: result.Ok.eth_address,
    principal: result.Ok.principal,
    createdAt: result.Ok.created_at,
    expiresAt: result.Ok.expires_at,
  };
}

/**
 * Get SIWE session
 */
export async function getSIWESession(sessionId: string): Promise<SIWESession | null> {
  const actor = await createAuthActor('siwe_canister', siweIdlFactory);
  
  const session = await (actor as any).get_session(sessionId);
  return session ? {
    sessionId: session.session_id,
    ethAddress: session.eth_address,
    principal: session.principal,
    createdAt: session.created_at,
    expiresAt: session.expires_at,
  } : null;
}

/**
 * Get principal by Ethereum address
 */
export async function getPrincipalByAddress(address: string): Promise<Principal | null> {
  const actor = await createAuthActor('siwe_canister', siweIdlFactory);
  
  return await (actor as any).get_principal_by_address(address);
}

/**
 * Get Ethereum address by principal
 */
export async function getAddressByPrincipal(principal: Principal): Promise<string | null> {
  const actor = await createAuthActor('siwe_canister', siweIdlFactory);
  
  return await (actor as any).get_address_by_principal(principal);
}

