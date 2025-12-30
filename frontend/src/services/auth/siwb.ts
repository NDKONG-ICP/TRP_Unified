/**
 * Sign-In with Bitcoin (SIWB) Service
 */

import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { getCanisterId, getICHost, isMainnet } from '../canisterConfig';
import { connectUnisat, signMessage, getUnisatConnection, BitcoinConnection } from '../wallets/bitcoin';
import { createAuthActor } from './actorHelper';

export interface SIWBMessage {
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

export interface SIWBSession {
  sessionId: string;
  bitcoinAddress: string;
  principal: Principal;
  createdAt: bigint;
  expiresAt: bigint;
}

interface BackendSIWBSession {
  session_id: string;
  bitcoin_address: string;
  principal: Principal;
  created_at: bigint;
  expires_at: bigint;
}

export interface SIWBVerifyResult {
  Ok?: BackendSIWBSession;
  Err?: string;
}

const siwbIdlFactory = ({ IDL }: any) => {
  const SIWBMessage = IDL.Record({
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
  
  const SIWBSession = IDL.Record({
    session_id: IDL.Text,
    bitcoin_address: IDL.Text,
    principal: IDL.Principal,
    created_at: IDL.Nat64,
    expires_at: IDL.Nat64,
  });
  
  const VerifyResult = IDL.Variant({
    Ok: SIWBSession,
    Err: IDL.Text,
  });
  
  return IDL.Service({
    verify_siwb: IDL.Func([SIWBMessage, IDL.Text], [VerifyResult], []),
    get_session: IDL.Func([IDL.Text], [IDL.Opt(SIWBSession)], ['query']),
    get_principal_by_address: IDL.Func([IDL.Text], [IDL.Opt(IDL.Principal)], ['query']),
    get_address_by_principal: IDL.Func([IDL.Principal], [IDL.Opt(IDL.Text)], ['query']),
    revoke_session: IDL.Func([IDL.Text], [IDL.Bool], []),
    cleanup_sessions: IDL.Func([], [IDL.Nat64], []),
  });
};

export function formatSIWBMessage(message: SIWBMessage): string {
  let formatted = `${message.domain} wants you to sign in with your Bitcoin account:\n`;
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

export function generateNonce(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function createSIWBMessage(
  address: string,
  domain: string,
  uri: string,
  chainId: string = 'mainnet',
  options?: {
    statement?: string;
    expirationTime?: string;
    notBefore?: string;
    requestId?: string;
    resources?: string[];
  }
): SIWBMessage {
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

export async function signInWithBitcoin(
  domain: string,
  uri: string,
  chainId: string = 'mainnet'
): Promise<SIWBSession> {
  const connection = await connectUnisat();
  const { address } = connection.wallet;
  
  const message = createSIWBMessage(address, domain, uri, chainId, {
    statement: 'Sign in with Bitcoin to the Raven Ecosystem',
  });
  
  const formattedMessage = formatSIWBMessage(message);
  const signature = await signMessage(formattedMessage);
  
  // Use actorFactory for Plug wallet support
  const actor = await createAuthActor('siwb_canister', siwbIdlFactory);
  
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
  
  const result = await (actor as any).verify_siwb(backendMessage, signature) as SIWBVerifyResult;
  
  if (result.Err) {
    throw new Error(result.Err);
  }
  
  if (!result.Ok) {
    throw new Error('SIWB verification failed');
  }
  
  return {
    sessionId: result.Ok.session_id,
    bitcoinAddress: result.Ok.bitcoin_address,
    principal: result.Ok.principal,
    createdAt: result.Ok.created_at,
    expiresAt: result.Ok.expires_at,
  };
}

export async function getSIWBSession(sessionId: string): Promise<SIWBSession | null> {
  const actor = await createAuthActor('siwb_canister', siwbIdlFactory);
  
  const session = await (actor as any).get_session(sessionId);
  return session ? {
    sessionId: session.session_id,
    bitcoinAddress: session.bitcoin_address,
    principal: session.principal,
    createdAt: session.created_at,
    expiresAt: session.expires_at,
  } : null;
}

export async function getPrincipalByAddress(address: string): Promise<Principal | null> {
  const actor = await createAuthActor('siwb_canister', siwbIdlFactory);
  
  return await (actor as any).get_principal_by_address(address);
}

export async function getAddressByPrincipal(principal: Principal): Promise<string | null> {
  const actor = await createAuthActor('siwb_canister', siwbIdlFactory);
  
  return await (actor as any).get_address_by_principal(principal);
}

