/**
 * Solana RPC Service
 * Interacts with Solana RPC canister for blockchain queries
 */

import { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { getCanisterId, getICHost, isMainnet } from '../canisterConfig';

export interface SolanaRPCRequest {
  method: string;
  params: any[];
}

export interface SolanaRPCResponse {
  result: any;
  error?: string;
}

// IDL Factory for Solana RPC canister
const solanaRpcIdlFactory = ({ IDL }: any) => {
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
  });
};

/**
 * Create Solana RPC actor
 */
async function createSolanaRPCActor() {
  const host = getICHost();
  const agent = new HttpAgent({ host });
  
  if (!isMainnet()) {
    await agent.fetchRootKey();
  }
  
  const canisterId = getCanisterId('solana_rpc_canister');
  return Actor.createActor(solanaRpcIdlFactory, {
    agent,
    canisterId: Principal.fromText(canisterId),
  });
}

/**
 * Call Solana RPC method
 */
export async function callSolanaRPC(method: string, params: any[]): Promise<any> {
  try {
    const actor = await createSolanaRPCActor();
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
    console.error('Solana RPC error:', error);
    throw new Error(`Solana RPC failed: ${error.message}`);
  }
}

/**
 * Get SOL balance via RPC canister
 */
export async function getSOLBalanceRPC(address: string): Promise<number> {
  try {
    const actor = await createSolanaRPCActor();
    const balance = await (actor as any).get_balance(address);
    return Number(balance) / 1e9; // Convert lamports to SOL
  } catch (error: any) {
    console.error('Error getting SOL balance:', error);
    // Fallback to direct RPC
    const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    const publicKey = new PublicKey(address);
    const balance = await connection.getBalance(publicKey);
    return balance / 1e9;
  }
}

/**
 * Get transaction via RPC canister
 */
export async function getTransactionRPC(signature: string): Promise<any> {
  try {
    const actor = await createSolanaRPCActor();
    const tx = await (actor as any).get_transaction(signature);
    return tx ? JSON.parse(tx) : null;
  } catch (error: any) {
    console.error('Error getting transaction:', error);
    // Fallback to direct RPC
    const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    return await connection.getTransaction(signature);
  }
}

/**
 * Send transaction via RPC canister
 */
export async function sendTransactionRPC(transaction: Transaction | VersionedTransaction): Promise<string> {
  try {
    const serialized = transaction.serialize();
    const base64 = Buffer.from(serialized).toString('base64');
    
    const result = await callSolanaRPC('sendTransaction', [base64, {
      encoding: 'base64',
      skipPreflight: false,
    }]);
    
    return result;
  } catch (error: any) {
    console.error('Error sending transaction:', error);
    throw error;
  }
}

