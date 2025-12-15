/**
 * Bitcoin RPC Service
 * Interacts with Bitcoin RPC canister for blockchain queries
 */

import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { getCanisterId, getICHost, isMainnet } from '../canisterConfig';

export interface BitcoinRPCRequest {
  method: string;
  params: any[];
}

export interface BitcoinRPCResponse {
  result: any;
  error?: string;
}

// IDL Factory for Bitcoin RPC canister
const bitcoinRpcIdlFactory = ({ IDL }: any) => {
  const RPCRequest = IDL.Record({
    method: IDL.Text,
    params: IDL.Vec(IDL.Text),
  });
  
  const RPCResponse = IDL.Record({
    result: IDL.Text,
    error: IDL.Opt(IDL.Text),
  });
  
  return IDL.Service({
    call_rpc: IDL.Func([RPCRequest], [RPCResponse], []),
    get_balance: IDL.Func([IDL.Text], [IDL.Nat64], ['query']),
    get_transaction: IDL.Func([IDL.Text], [IDL.Opt(IDL.Text)], ['query']),
    get_utxos: IDL.Func([IDL.Text], [IDL.Vec(IDL.Text)], ['query']),
  });
};

/**
 * Create Bitcoin RPC actor
 */
async function createBitcoinRPCActor() {
  const host = getICHost();
  const agent = new HttpAgent({ host });
  
  if (!isMainnet()) {
    await agent.fetchRootKey();
  }
  
  const canisterId = getCanisterId('bitcoin_rpc_canister');
  return Actor.createActor(bitcoinRpcIdlFactory, {
    agent,
    canisterId: Principal.fromText(canisterId),
  });
}

/**
 * Call Bitcoin RPC method
 */
export async function callBitcoinRPC(method: string, params: any[]): Promise<any> {
  try {
    const actor = await createBitcoinRPCActor();
    const request = {
      method,
      params: params.map(p => JSON.stringify(p)),
    };
    
    const response = await (actor as any).call_rpc(request);
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return JSON.parse(response.result);
  } catch (error: any) {
    console.error('Bitcoin RPC error:', error);
    // Fallback to public API
    return await callBitcoinAPIFallback(method, params);
  }
}

/**
 * Fallback to public Bitcoin API
 */
async function callBitcoinAPIFallback(method: string, params: any[]): Promise<any> {
  try {
    const response = await fetch('https://blockstream.info/api/' + method.toLowerCase().replace('_', '/'), {
      method: 'GET',
    });
    return await response.json();
  } catch (error) {
    throw new Error(`Bitcoin RPC failed: ${error}`);
  }
}

/**
 * Get BTC balance via RPC canister
 */
export async function getBTCBalanceRPC(address: string): Promise<number> {
  try {
    const actor = await createBitcoinRPCActor();
    const balance = await (actor as any).get_balance(address);
    return Number(balance) / 100000000; // Convert satoshis to BTC
  } catch (error: any) {
    console.error('Error getting BTC balance:', error);
    // Fallback to blockstream API
    try {
      const response = await fetch(`https://blockstream.info/api/address/${address}`);
      const data = await response.json();
      return (data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum) / 100000000;
    } catch (fallbackError) {
      return 0;
    }
  }
}

/**
 * Get transaction via RPC canister
 */
export async function getTransactionRPC(txid: string): Promise<any> {
  try {
    const actor = await createBitcoinRPCActor();
    const tx = await (actor as any).get_transaction(txid);
    return tx ? JSON.parse(tx) : null;
  } catch (error: any) {
    console.error('Error getting transaction:', error);
    // Fallback to blockstream API
    try {
      const response = await fetch(`https://blockstream.info/api/tx/${txid}`);
      return await response.json();
    } catch (fallbackError) {
      return null;
    }
  }
}

/**
 * Get UTXOs for an address
 */
export async function getUTXOsRPC(address: string): Promise<any[]> {
  try {
    const actor = await createBitcoinRPCActor();
    const utxos = await (actor as any).get_utxos(address);
    return utxos.map((utxo: string) => JSON.parse(utxo));
  } catch (error: any) {
    console.error('Error getting UTXOs:', error);
    // Fallback to blockstream API
    try {
      const response = await fetch(`https://blockstream.info/api/address/${address}/utxo`);
      return await response.json();
    } catch (fallbackError) {
      return [];
    }
  }
}

