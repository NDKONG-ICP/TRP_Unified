/**
 * Sign-In with Solana (SIWS) Service
 * Implements Solana authentication standard
 */

import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { getCanisterId, getICHost, isMainnet } from '../canisterConfig';
import { connectPhantom, signMessage, getPhantomConnection, SolanaConnection } from '../wallets/solana';
import { PublicKey } from '@solana/web3.js';
import { createAuthActor } from './actorHelper';
import bs58 from 'bs58';

export interface SIWSMessage {
  domain: string;
  address: string;
  statement?: string;
  uri: string;
  version: string;
  chainId: string;
  nonce: string;
  issuedAt: string;
  expirationTime?: string;
  notBefore?: string;
  requestId?: string;
  resources?: string[];
}

export interface SIWSSession {
  sessionId: string;
  solanaAddress: string;
  principal: Principal;
  createdAt: bigint;
  expiresAt: bigint;
}

interface BackendSIWSSession {
  session_id: string;
  solana_address: string;
  principal: Principal;
  created_at: bigint;
  expires_at: bigint;
}

export interface SIWSVerifyResult {
  Ok?: BackendSIWSSession;
  Err?: string;
}

// IDL Factory for SIWS canister
const siwsIdlFactory = ({ IDL }: any) => {
  const SIWSMessage = IDL.Record({
    domain: IDL.Text,
    address: IDL.Text,
    statement: IDL.Opt(IDL.Text),
    uri: IDL.Text,
    version: IDL.Text,
    chain_id: IDL.Text,
    nonce: IDL.Text,
    issued_at: IDL.Text,
    expiration_time: IDL.Opt(IDL.Text),
    not_before: IDL.Opt(IDL.Text),
    request_id: IDL.Opt(IDL.Text),
    resources: IDL.Opt(IDL.Vec(IDL.Text)),
  });
  
  const SIWSSession = IDL.Record({
    session_id: IDL.Text,
    solana_address: IDL.Text,
    principal: IDL.Principal,
    created_at: IDL.Nat64,
    expires_at: IDL.Nat64,
  });
  
  const VerifyResult = IDL.Variant({
    Ok: SIWSSession,
    Err: IDL.Text,
  });
  
  return IDL.Service({
    verify_siws: IDL.Func([SIWSMessage, IDL.Text], [VerifyResult], []),
    get_session: IDL.Func([IDL.Text], [IDL.Opt(SIWSSession)], ['query']),
    get_principal_by_address: IDL.Func([IDL.Text], [IDL.Opt(IDL.Principal)], ['query']),
    get_address_by_principal: IDL.Func([IDL.Principal], [IDL.Opt(IDL.Text)], ['query']),
    revoke_session: IDL.Func([IDL.Text], [IDL.Bool], []),
    cleanup_sessions: IDL.Func([], [IDL.Nat64], []),
  });
};

/**
 * Format SIWS message
 */
export function formatSIWSMessage(message: SIWSMessage): string {
  let formatted = `${message.domain} wants you to sign in with your Solana account:\n`;
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
 * Create SIWS message
 */
export function createSIWSMessage(
  address: string,
  domain: string,
  uri: string,
  chainId: string = 'mainnet-beta',
  options?: {
    statement?: string;
    expirationTime?: string;
    notBefore?: string;
    requestId?: string;
    resources?: string[];
  }
): SIWSMessage {
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
 * Sign in with Solana
 */
export async function signInWithSolana(
  domain: string,
  uri: string,
  chainId: string = 'mainnet-beta'
): Promise<SIWSSession> {
  // Connect to Phantom
  const connection = await connectPhantom();
  const { address } = connection.wallet;
  
  // Create SIWS message
  const message = createSIWSMessage(address, domain, uri, chainId, {
    statement: 'Sign in with Solana to the Raven Ecosystem',
  });
  
  // Format message
  const formattedMessage = formatSIWSMessage(message);
  
  // Sign message with Phantom
  const signatureBytes = await signMessage(formattedMessage);
  
  // Convert signature to base58 string (backend expects base58 or 0x hex)
  const signature = bs58.encode(signatureBytes);
  
  // Verify with backend canister (uses actorFactory for Plug wallet support)
  const actor = await createAuthActor('siws_canister', siwsIdlFactory);
  
  // Convert message to backend format
  const backendMessage = {
    domain: message.domain,
    address: message.address,
    statement: message.statement ? [message.statement] : [],
    uri: message.uri,
    version: message.version,
    chain_id: message.chainId,
    nonce: message.nonce,
    issued_at: message.issuedAt,
    expiration_time: message.expirationTime ? [message.expirationTime] : [],
    not_before: message.notBefore ? [message.notBefore] : [],
    request_id: message.requestId ? [message.requestId] : [],
    resources: message.resources ? [message.resources] : [],
  };
  
  const result = await (actor as any).verify_siws(backendMessage, signature) as SIWSVerifyResult;
  
  if (result.Err) {
    throw new Error(result.Err);
  }
  
  if (!result.Ok) {
    throw new Error('SIWS verification failed');
  }
  
  return {
    sessionId: result.Ok.session_id,
    solanaAddress: result.Ok.solana_address,
    principal: result.Ok.principal,
    createdAt: result.Ok.created_at,
    expiresAt: result.Ok.expires_at,
  };
}

/**
 * Get SIWS session
 */
export async function getSIWSSession(sessionId: string): Promise<SIWSSession | null> {
  const actor = await createAuthActor('siws_canister', siwsIdlFactory);
  
  const session = await (actor as any).get_session(sessionId);
  return session ? {
    sessionId: session.session_id,
    solanaAddress: session.solana_address,
    principal: session.principal,
    createdAt: session.created_at,
    expiresAt: session.expires_at,
  } : null;
}

/**
 * Get principal by Solana address
 */
export async function getPrincipalByAddress(address: string): Promise<Principal | null> {
  const actor = await createAuthActor('siws_canister', siwsIdlFactory);
  
  return await (actor as any).get_principal_by_address(address);
}

/**
 * Get Solana address by principal
 */
export async function getAddressByPrincipal(principal: Principal): Promise<string | null> {
  const actor = await createAuthActor('siws_canister', siwsIdlFactory);
  
  return await (actor as any).get_address_by_principal(principal);
}

