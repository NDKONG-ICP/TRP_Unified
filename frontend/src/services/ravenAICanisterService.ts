/**
 * RavenAI Canister Service - Conversation persistence with raven_ai canister
 */

import { Actor, HttpAgent, Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { getCanisterId, getICHost, isMainnet } from './canisterConfig';
import { createActorWithIdl } from './actorFactory';

// RavenAI Canister IDL
const ravenAIIdlFactory = ({ IDL }: { IDL: any }) => {
  const PaymentToken = IDL.Variant({
    'ICP': IDL.Null,
    'RAVEN': IDL.Null,
    'CkBTC': IDL.Null,
    'CkETH': IDL.Null,
    'CkUSDC': IDL.Null,
    'CkUSDT': IDL.Null,
    'CkSOL': IDL.Null,
    'SOL': IDL.Null,
    'SUI': IDL.Null,
    'BOB': IDL.Null,
    'MGSN': IDL.Null,
    'ZOMBIE': IDL.Null,
    'NAK': IDL.Null,
  });

  const AgentType = IDL.Variant({
    'RavenAI': IDL.Null,
    'AXIOM': IDL.Nat32,
  });

  const MultichainAddresses = IDL.Record({
    'icp_principal': IDL.Opt(IDL.Text),
    'evm_address': IDL.Opt(IDL.Text),
    'btc_address': IDL.Opt(IDL.Text),
    'sol_address': IDL.Opt(IDL.Text),
  });

  const MemoryEntry = IDL.Record({
    'id': IDL.Text,
    'memory_type': IDL.Text,
    'content': IDL.Text,
    'importance': IDL.Float32,
    'timestamp': IDL.Nat64,
    'tags': IDL.Vec(IDL.Text),
  });

  const KnowledgeNode = IDL.Record({
    'id': IDL.Text,
    'label': IDL.Text,
    'node_type': IDL.Text,
    'properties': IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
    'connections': IDL.Vec(IDL.Text),
    'created_at': IDL.Nat64,
  });

  const ChatMessage = IDL.Record({
    'role': IDL.Text,
    'content': IDL.Text,
    'timestamp': IDL.Nat64,
  });

  const AgentConfig = IDL.Record({
    'name': IDL.Text,
    'personality': IDL.Text,
    'language': IDL.Text,
    'voice_enabled': IDL.Bool,
    'accessibility_mode': IDL.Text,
    'custom_instructions': IDL.Text,
  });

  const RavenAIAgent = IDL.Record({
    'token_id': IDL.Nat64,
    'agent_type': AgentType,
    'owner': IDL.Principal,
    'canister_id': IDL.Opt(IDL.Principal),
    'multichain_addresses': MultichainAddresses,
    'config': AgentConfig,
    'short_term_memory': IDL.Vec(MemoryEntry),
    'long_term_memory': IDL.Vec(MemoryEntry),
    'conversation_history': IDL.Vec(ChatMessage),
    'knowledge_nodes': IDL.Vec(KnowledgeNode),
    'total_interactions': IDL.Nat64,
    'total_memories': IDL.Nat64,
    'created_at': IDL.Nat64,
    'last_active': IDL.Nat64,
    'metadata': IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
  });

  const AxiomNFT = IDL.Record({
    'number': IDL.Nat32,
    'token_id': IDL.Nat64,
    'owner': IDL.Opt(IDL.Principal),
    'minted': IDL.Bool,
    'minted_at': IDL.Opt(IDL.Nat64),
    'dedicated_canister': IDL.Opt(IDL.Principal),
    'agent': IDL.Opt(RavenAIAgent),
  });

  const Config = IDL.Record({
    'admins': IDL.Vec(IDL.Principal),
    'treasury_principal': IDL.Principal,
    'btc_address': IDL.Text,
    'raven_token_canister': IDL.Principal,
    'next_token_id': IDL.Nat64,
    'next_axiom_number': IDL.Nat32,
    'total_agents_minted': IDL.Nat64,
    'total_axiom_minted': IDL.Nat32,
    'paused': IDL.Bool,
  });

  const TokenPrice = IDL.Record({
    'token': PaymentToken,
    'usd_price': IDL.Float64,
    'amount_for_100_usd': IDL.Nat64,
    'decimals': IDL.Nat8,
  });

  const NotificationType = IDL.Variant({
    'MorningGreeting': IDL.Null,
    'MiddayUpdate': IDL.Null,
    'EveningMessage': IDL.Null,
    'AdminAnnouncement': IDL.Null,
    'SystemAlert': IDL.Null,
    'InterAgentMessage': IDL.Null,
  });

  const RavenNotification = IDL.Record({
    'id': IDL.Nat32,
    'notification_type': NotificationType,
    'title': IDL.Text,
    'message': IDL.Text,
    'sender': IDL.Text,
    'created_at': IDL.Nat64,
    'scheduled_for': IDL.Opt(IDL.Nat64),
    'sent': IDL.Bool,
    'sent_at': IDL.Opt(IDL.Nat64),
    'recipients': IDL.Vec(IDL.Nat32),
  });

  const MintResult = IDL.Record({
    'canister_id': IDL.Principal,
    'mint_number': IDL.Nat32,
    'token_id': IDL.Nat64,
    'cycles_allocated': IDL.Nat,
    'payment_token': PaymentToken,
    'payment_amount': IDL.Nat64,
  });

  return IDL.Service({
    // Query Functions
    'get_config': IDL.Func([], [Config], ['query']),
    'get_token_prices_info': IDL.Func([], [IDL.Vec(TokenPrice)], ['query']),
    'get_axiom_availability': IDL.Func([], [IDL.Nat32, IDL.Nat32, IDL.Vec(IDL.Nat32)], ['query']),
    'get_agent': IDL.Func([IDL.Nat64], [IDL.Opt(RavenAIAgent)], ['query']),
    'get_axiom': IDL.Func([IDL.Nat32], [IDL.Opt(AxiomNFT)], ['query']),
    'get_agents_by_owner': IDL.Func([IDL.Principal], [IDL.Vec(RavenAIAgent)], ['query']),
    'get_total_supply': IDL.Func([], [IDL.Nat64, IDL.Nat32], ['query']),
    'health': IDL.Func([], [IDL.Text], ['query']),
    
    // Memory Functions
    'add_memory': IDL.Func([IDL.Nat64, IDL.Text, IDL.Text, IDL.Float32, IDL.Vec(IDL.Text)], [IDL.Variant({ 'Ok': IDL.Text, 'Err': IDL.Text })], []),
    'upload_axiom_document': IDL.Func([IDL.Nat64, IDL.Text, IDL.Vec(IDL.Nat8), IDL.Text], [IDL.Variant({ 'Ok': IDL.Text, 'Err': IDL.Text })], []),
    'add_chat_message': IDL.Func([IDL.Nat64, IDL.Text, IDL.Text], [IDL.Variant({ 'Ok': IDL.Null, 'Err': IDL.Text })], []),
    'update_agent_config': IDL.Func([IDL.Nat64, AgentConfig], [IDL.Variant({ 'Ok': IDL.Null, 'Err': IDL.Text })], []),
    'get_conversation_history': IDL.Func([IDL.Nat64, IDL.Nat32], [IDL.Vec(ChatMessage)], ['query']),
    'recall_memories': IDL.Func([IDL.Nat64, IDL.Text, IDL.Nat32], [IDL.Vec(MemoryEntry)], ['query']),
    
    // Notification System
    'admin_send_notification': IDL.Func([IDL.Text, IDL.Text, IDL.Vec(IDL.Nat32)], [IDL.Variant({ 'Ok': RavenNotification, 'Err': IDL.Text })], []),
    'admin_get_all_notifications': IDL.Func([IDL.Nat32, IDL.Nat32], [IDL.Vec(RavenNotification)], ['query']),
    'get_collective_stats': IDL.Func([], [IDL.Nat64, IDL.Nat64, IDL.Nat64], ['query']),
    
    // AXIOM NFT Minting Orchestrator
    'mint_axiom_agent': IDL.Func([PaymentToken, IDL.Nat64, IDL.Text], [IDL.Variant({ 'Ok': MintResult, 'Err': IDL.Text })], []),
    'top_up_axiom_cycles': IDL.Func([IDL.Principal, PaymentToken, IDL.Nat64, IDL.Text], [IDL.Variant({ 'Ok': IDL.Nat, 'Err': IDL.Text })], []),
  });
};

// Types
export interface ChatMessage {
  role: string;
  content: string;
  timestamp: number;
}

export interface MemoryEntry {
  id: string;
  memoryType: string;
  content: string;
  importance: number;
  timestamp: number;
  tags: string[];
}

export interface AgentConfig {
  name: string;
  personality: string;
  language: string;
  voiceEnabled: boolean;
  accessibilityMode: string;
  customInstructions: string;
}

export interface RavenAIAgent {
  tokenId: bigint;
  agentType: 'RavenAI' | { AXIOM: number };
  owner: string;
  canisterId?: string;
  multichainAddresses: {
    icpPrincipal?: string;
    evmAddress?: string;
    btcAddress?: string;
    solAddress?: string;
  };
  config: AgentConfig;
  shortTermMemory: MemoryEntry[];
  longTermMemory: MemoryEntry[];
  conversationHistory: ChatMessage[];
  totalInteractions: number;
  totalMemories: number;
  createdAt: number;
  lastActive: number;
}

export interface AxiomNFT {
  number: number;
  tokenId: bigint;
  owner?: string;
  minted: boolean;
  mintedAt?: number;
  dedicatedCanister?: string;
  agent?: RavenAIAgent;
}

export interface RavenAIConfig {
  totalAgentsMinted: number;
  totalAxiomMinted: number;
  nextTokenId: bigint;
  nextAxiomNumber: number;
  paused: boolean;
}

export class RavenAICanisterService {
  private actor: any = null;
  private agent: HttpAgent | null = null;

  async init(identity?: Identity): Promise<void> {
    // Use actorFactory for proper wallet abstraction (supports Plug, II, OISY, etc.)
    const canisterId = getCanisterId('raven_ai');
    this.actor = await createActorWithIdl(canisterId, ravenAIIdlFactory, identity);
    
    // Keep agent reference for backward compatibility if needed
    const host = getICHost();
    this.agent = new HttpAgent({ identity, host });
    
    if (!isMainnet) {
      await this.agent.fetchRootKey();
    }
  }

  private ensureActor(): void {
    if (!this.actor) {
      throw new Error('RavenAICanisterService not initialized. Call init() first.');
    }
  }

  private parseAgent(raw: any): RavenAIAgent {
    const agentType = raw.agent_type.RavenAI !== undefined 
      ? 'RavenAI' as const
      : { AXIOM: Number(raw.agent_type.AXIOM) };

    return {
      tokenId: BigInt(raw.token_id),
      agentType,
      owner: raw.owner.toText(),
      canisterId: raw.canister_id[0]?.toText(),
      multichainAddresses: {
        icpPrincipal: raw.multichain_addresses.icp_principal[0],
        evmAddress: raw.multichain_addresses.evm_address[0],
        btcAddress: raw.multichain_addresses.btc_address[0],
        solAddress: raw.multichain_addresses.sol_address[0],
      },
      config: {
        name: raw.config.name,
        personality: raw.config.personality,
        language: raw.config.language,
        voiceEnabled: raw.config.voice_enabled,
        accessibilityMode: raw.config.accessibility_mode,
        customInstructions: raw.config.custom_instructions,
      },
      shortTermMemory: raw.short_term_memory.map((m: any) => ({
        id: m.id,
        memoryType: m.memory_type,
        content: m.content,
        importance: m.importance,
        timestamp: Number(m.timestamp),
        tags: m.tags,
      })),
      longTermMemory: raw.long_term_memory.map((m: any) => ({
        id: m.id,
        memoryType: m.memory_type,
        content: m.content,
        importance: m.importance,
        timestamp: Number(m.timestamp),
        tags: m.tags,
      })),
      conversationHistory: raw.conversation_history.map((m: any) => ({
        role: m.role,
        content: m.content,
        timestamp: Number(m.timestamp),
      })),
      totalInteractions: Number(raw.total_interactions),
      totalMemories: Number(raw.total_memories),
      createdAt: Number(raw.created_at),
      lastActive: Number(raw.last_active),
    };
  }

  async getConfig(): Promise<RavenAIConfig> {
    this.ensureActor();
    try {
      const result = await this.actor.get_config();
      return {
        totalAgentsMinted: Number(result.total_agents_minted),
        totalAxiomMinted: Number(result.total_axiom_minted),
        nextTokenId: BigInt(result.next_token_id),
        nextAxiomNumber: Number(result.next_axiom_number),
        paused: result.paused,
      };
    } catch (error) {
      console.error('Failed to fetch config:', error);
      throw error;
    }
  }

  async getAgent(tokenId: bigint): Promise<RavenAIAgent | null> {
    this.ensureActor();
    try {
      const result = await this.actor.get_agent(tokenId);
      if (result[0]) {
        return this.parseAgent(result[0]);
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch agent:', error);
      throw error;
    }
  }

  async getAxiom(axiomNumber: number): Promise<AxiomNFT | null> {
    this.ensureActor();
    try {
      const result = await this.actor.get_axiom(axiomNumber);
      if (result[0]) {
        return {
          number: Number(result[0].number),
          tokenId: BigInt(result[0].token_id),
          owner: result[0].owner[0]?.toText(),
          minted: result[0].minted,
          mintedAt: result[0].minted_at[0] ? Number(result[0].minted_at[0]) : undefined,
          dedicatedCanister: result[0].dedicated_canister[0]?.toText(),
          agent: result[0].agent[0] ? this.parseAgent(result[0].agent[0]) : undefined,
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch AXIOM:', error);
      throw error;
    }
  }

  async getAgentsByOwner(owner: string): Promise<RavenAIAgent[]> {
    this.ensureActor();
    try {
      const result = await this.actor.get_agents_by_owner(Principal.fromText(owner));
      return result.map((agent: any) => this.parseAgent(agent));
    } catch (error) {
      console.error('Failed to fetch agents by owner:', error);
      throw error;
    }
  }

  async getConversationHistory(tokenId: bigint, limit: number = 50): Promise<ChatMessage[]> {
    this.ensureActor();
    try {
      const result = await this.actor.get_conversation_history(tokenId, limit);
      return result.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
        timestamp: Number(msg.timestamp),
      }));
    } catch (error) {
      console.error('Failed to fetch conversation history:', error);
      throw error;
    }
  }

  async addChatMessage(tokenId: bigint, role: string, content: string): Promise<void> {
    this.ensureActor();
    try {
      const result = await this.actor.add_chat_message(tokenId, role, content);
      if ('Err' in result) {
        throw new Error(result.Err);
      }
    } catch (error) {
      console.error('Failed to add chat message:', error);
      throw error;
    }
  }

  async addMemory(
    tokenId: bigint, 
    memoryType: string, 
    content: string, 
    importance: number = 0.5, 
    tags: string[] = []
  ): Promise<string> {
    this.ensureActor();
    try {
      const result = await this.actor.add_memory(tokenId, memoryType, content, importance, tags);
      if ('Ok' in result) {
        return result.Ok;
      }
      throw new Error(result.Err);
    } catch (error) {
      console.error('Failed to add memory:', error);
      throw error;
    }
  }

  async uploadAxiomDocument(
    tokenId: bigint,
    documentName: string,
    documentContent: string, // Base64-encoded string or plain text
    documentType: string
  ): Promise<string> {
    this.ensureActor();
    try {
      // Backend expects Vec<u8> (bytes), so we need to convert string to Uint8Array
      // If it's base64, decode it; if it's plain text, encode it as UTF-8
      let bytes: Uint8Array;
      if (documentType === 'application/pdf') {
        // Base64 decode for PDFs
        const binaryString = atob(documentContent);
        bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
      } else {
        // UTF-8 encode for text files
        bytes = new TextEncoder().encode(documentContent);
      }
      
      const result = await this.actor.upload_axiom_document(
        tokenId,
        documentName,
        Array.from(bytes), // Convert to Array<number> for Candid
        documentType
      ) as { Ok?: string; Err?: string };
      
      if (result.Err) {
        throw new Error(result.Err);
      }
      
      return result.Ok || 'Document uploaded successfully';
    } catch (error: any) {
      console.error('Failed to upload document:', error);
      throw error;
    }
  }

  async recallMemories(tokenId: bigint, query: string, limit: number = 10): Promise<MemoryEntry[]> {
    this.ensureActor();
    try {
      const result = await this.actor.recall_memories(tokenId, query, limit);
      return result.map((m: any) => ({
        id: m.id,
        memoryType: m.memory_type,
        content: m.content,
        importance: m.importance,
        timestamp: Number(m.timestamp),
        tags: m.tags,
      }));
    } catch (error) {
      console.error('Failed to recall memories:', error);
      throw error;
    }
  }

  async getAxiomAvailability(): Promise<{ total: number; minted: number; available: number[] }> {
    this.ensureActor();
    try {
      const [total, minted, available] = await this.actor.get_axiom_availability();
      return {
        total: Number(total),
        minted: Number(minted),
        available: available.map((n: any) => Number(n)),
      };
    } catch (error) {
      console.error('Failed to fetch AXIOM availability:', error);
      throw error;
    }
  }

  async getTotalSupply(): Promise<{ agents: number; axiom: number }> {
    this.ensureActor();
    try {
      const [agents, axiom] = await this.actor.get_total_supply();
      return {
        agents: Number(agents),
        axiom: Number(axiom),
      };
    } catch (error) {
      console.error('Failed to fetch total supply:', error);
      throw error;
    }
  }

  async healthCheck(): Promise<string> {
    this.ensureActor();
    return await this.actor.health();
  }

  // Notification methods
  async adminSendNotification(title: string, message: string, recipients: number[] = []): Promise<any> {
    this.ensureActor();
    try {
      const result = await this.actor.admin_send_notification(title, message, recipients);
      if ('Ok' in result) {
        return result.Ok;
      }
      throw new Error(result.Err);
    } catch (error) {
      console.error('Failed to send notification:', error);
      throw error;
    }
  }

  async adminGetAllNotifications(limit: number, offset: number): Promise<any[]> {
    this.ensureActor();
    try {
      const result = await this.actor.admin_get_all_notifications(limit, offset);
      return result.map((n: any) => ({
        id: Number(n.id),
        notification_type: Object.keys(n.notification_type)[0],
        title: n.title,
        message: n.message,
        sender: n.sender,
        created_at: n.created_at,
        scheduled_for: n.scheduled_for[0] ? Number(n.scheduled_for[0]) : undefined,
        sent: n.sent,
        sent_at: n.sent_at[0] ? Number(n.sent_at[0]) : undefined,
        recipients: n.recipients.map((r: any) => Number(r)),
      }));
    } catch (error) {
      console.error('Failed to get notifications:', error);
      throw error;
    }
  }

  async getCollectiveStats(): Promise<{ sharedMemories: number; totalNotifications: number; sentCount: number }> {
    this.ensureActor();
    try {
      const [shared, total, sent] = await this.actor.get_collective_stats();
      return {
        sharedMemories: Number(shared),
        totalNotifications: Number(total),
        sentCount: Number(sent),
      };
    } catch (error) {
      console.error('Failed to get collective stats:', error);
      throw error;
    }
  }

  async mintAxiomAgent(
    paymentToken: any,
    paymentAmount: bigint,
    paymentTxHash: string
  ): Promise<{ Ok?: any; Err?: string }> {
    this.ensureActor();
    try {
      const result = await this.actor.mint_axiom_agent(paymentToken, paymentAmount, paymentTxHash);
      return result;
    } catch (error: any) {
      console.error('Failed to mint AXIOM agent:', error);
      return { Err: error.message || 'Minting failed' };
    }
  }

  async topUpAxiomCycles(
    axiomCanisterId: string,
    paymentToken: any,
    paymentAmount: bigint,
    paymentTxHash: string
  ): Promise<{ Ok?: bigint; Err?: string }> {
    this.ensureActor();
    try {
      const result = await this.actor.top_up_axiom_cycles(
        Principal.fromText(axiomCanisterId),
        paymentToken,
        paymentAmount,
        paymentTxHash
      );
      if ('Ok' in result) {
        return { Ok: BigInt(result.Ok.toString()) };
      }
      return { Err: result.Err };
    } catch (error: any) {
      console.error('Failed to top up cycles:', error);
      return { Err: error.message || 'Top-up failed' };
    }
  }
}

// Singleton instance
export const ravenAICanisterService = new RavenAICanisterService();

// React hooks
import { useState, useEffect, useCallback } from 'react';

export function useRavenAIAgent(tokenId: bigint | undefined, identity?: Identity) {
  const [agent, setAgent] = useState<RavenAIAgent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgent = useCallback(async () => {
    if (tokenId === undefined) {
      setAgent(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      await ravenAICanisterService.init(identity);
      const agentData = await ravenAICanisterService.getAgent(tokenId);
      setAgent(agentData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch agent');
      console.error('Agent fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tokenId, identity]);

  useEffect(() => {
    fetchAgent();
  }, [fetchAgent]);

  return {
    agent,
    isLoading,
    error,
    refresh: fetchAgent,
  };
}

export function useConversationHistory(tokenId: bigint | undefined, identity?: Identity) {
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (tokenId === undefined) {
      setHistory([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      await ravenAICanisterService.init(identity);
      const historyData = await ravenAICanisterService.getConversationHistory(tokenId);
      setHistory(historyData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch conversation history');
      console.error('History fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tokenId, identity]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const addMessage = useCallback(async (role: string, content: string) => {
    if (tokenId === undefined) return;
    
    try {
      await ravenAICanisterService.addChatMessage(tokenId, role, content);
      // Refresh history after adding
      await fetchHistory();
    } catch (err: any) {
      console.error('Failed to add message:', err);
      throw err;
    }
  }, [tokenId, fetchHistory]);

  return {
    history,
    isLoading,
    error,
    refresh: fetchHistory,
    addMessage,
  };
}

export function useMyAgents(owner: string | undefined, identity?: Identity) {
  const [agents, setAgents] = useState<RavenAIAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    if (!owner) {
      setAgents([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      await ravenAICanisterService.init(identity);
      const agentsData = await ravenAICanisterService.getAgentsByOwner(owner);
      setAgents(agentsData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch agents');
      console.error('Agents fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [owner, identity]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  return {
    agents,
    isLoading,
    error,
    refresh: fetchAgents,
  };
}

export default ravenAICanisterService;

