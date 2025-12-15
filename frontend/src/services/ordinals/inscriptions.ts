/**
 * Bitcoin Ordinals Inscriptions Service
 * Handles Bitcoin Ordinals inscription creation and management
 */

import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { getCanisterId, getICHost, isMainnet } from '../canisterConfig';
import { createMultiChainActor } from '../actorFactory';

export interface Inscription {
  id: string;
  content: Uint8Array;
  contentType: string;
  owner: string;
  sat: number;
  timestamp: number;
}

export interface CreateInscriptionRequest {
  content: Uint8Array;
  contentType: string;
  feeRate?: number;
}

// IDL Factory for Ordinals canister
const ordinalsIdlFactory = ({ IDL }: any) => {
  const Inscription = IDL.Record({
    id: IDL.Text,
    content: IDL.Vec(IDL.Nat8),
    content_type: IDL.Text,
    owner: IDL.Text,
    sat: IDL.Nat64,
    timestamp: IDL.Nat64,
  });
  
  const CreateRequest = IDL.Record({
    content: IDL.Vec(IDL.Nat8),
    content_type: IDL.Text,
    fee_rate: IDL.Opt(IDL.Nat64),
  });
  
  const CreateResult = IDL.Variant({
    Ok: IDL.Record({
      inscription_id: IDL.Text,
      tx_id: IDL.Text,
    }),
    Err: IDL.Text,
  });
  
  return IDL.Service({
    create_inscription: IDL.Func([CreateRequest], [CreateResult], []),
    get_inscription: IDL.Func([IDL.Text], [IDL.Opt(Inscription)], ['query']),
    get_user_inscriptions: IDL.Func([IDL.Text], [IDL.Vec(Inscription)], ['query']),
    transfer_inscription: IDL.Func([IDL.Text, IDL.Text], [IDL.Variant({ Ok: IDL.Text, Err: IDL.Text })], []),
  });
};

/**
 * Create Ordinals canister actor (uses actorFactory for Plug wallet support)
 */
async function createOrdinalsActor() {
  return createMultiChainActor('ordinals_canister', ordinalsIdlFactory);
}

/**
 * Create a new inscription
 */
export async function createInscription(request: CreateInscriptionRequest): Promise<{ inscriptionId: string; txId: string }> {
  try {
    const actor = await createOrdinalsActor();
    const backendRequest = {
      content: Array.from(request.content),
      content_type: request.contentType,
      fee_rate: request.feeRate ? [BigInt(request.feeRate)] : [],
    };
    
    const result = await (actor as any).create_inscription(backendRequest);
    
    if ('Err' in result) {
      throw new Error(result.Err);
    }
    
    return {
      inscriptionId: result.Ok.inscription_id,
      txId: result.Ok.tx_id,
    };
  } catch (error: any) {
    console.error('Error creating inscription:', error);
    throw new Error(`Failed to create inscription: ${error.message}`);
  }
}

/**
 * Get inscription by ID
 */
export async function getInscription(inscriptionId: string): Promise<Inscription | null> {
  try {
    const actor = await createOrdinalsActor();
    const inscription = await (actor as any).get_inscription(inscriptionId);
    
    if (!inscription) {
      return null;
    }
    
    return {
      id: inscription.id,
      content: new Uint8Array(inscription.content),
      contentType: inscription.content_type,
      owner: inscription.owner,
      sat: Number(inscription.sat),
      timestamp: Number(inscription.timestamp),
    };
  } catch (error: any) {
    console.error('Error getting inscription:', error);
    return null;
  }
}

/**
 * Get all inscriptions for a user
 */
export async function getUserInscriptions(address: string): Promise<Inscription[]> {
  try {
    const actor = await createOrdinalsActor();
    const inscriptions = await (actor as any).get_user_inscriptions(address);
    
    return inscriptions.map((inscription: any) => ({
      id: inscription.id,
      content: new Uint8Array(inscription.content),
      contentType: inscription.content_type,
      owner: inscription.owner,
      sat: Number(inscription.sat),
      timestamp: Number(inscription.timestamp),
    }));
  } catch (error: any) {
    console.error('Error getting user inscriptions:', error);
    return [];
  }
}

/**
 * Transfer inscription to another address
 */
export async function transferInscription(inscriptionId: string, toAddress: string): Promise<string> {
  try {
    const actor = await createOrdinalsActor();
    const result = await (actor as any).transfer_inscription(inscriptionId, toAddress);
    
    if ('Err' in result) {
      throw new Error(result.Err);
    }
    
    return result.Ok;
  } catch (error: any) {
    console.error('Error transferring inscription:', error);
    throw new Error(`Failed to transfer inscription: ${error.message}`);
  }
}

