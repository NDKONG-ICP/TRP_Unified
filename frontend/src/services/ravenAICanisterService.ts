/**
 * RavenAI Canister Service - Conversation persistence with raven_ai canister
 * Uses auto-generated Candid declarations for 100% type safety.
 */

import type { Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { getCanisterId } from './canisterConfig';
import { createActorWithIdl } from './actorFactory';
import { idlFactory as ravenAiIdl } from '../declarations/raven_ai';
import type { _SERVICE as RavenAIService, RavenAIAgent as RawRavenAIAgent, AxiomNFT as RawAxiomNFT, Config as RawConfig } from '../declarations/raven_ai/raven_ai.did';

// Simplified Types for Frontend
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
  private actor: RavenAIService | null = null;

  async init(identity?: Identity): Promise<void> {
    const canisterId = getCanisterId('raven_ai');
    this.actor = await createActorWithIdl<RavenAIService>(canisterId, ravenAiIdl, identity);
  }

  private ensureActor(): RavenAIService {
    if (!this.actor) {
      throw new Error('RavenAICanisterService not initialized. Call init() first.');
    }
    return this.actor;
  }

  async getLlmProviders(): Promise<Array<{ name: string; ready: boolean }>> {
    const actor = this.ensureActor();
    const result = await actor.get_llm_providers();
    return result.map(([name, ready]) => ({ name, ready }));
  }

  async adminSetLlmApiKey(providerName: string, apiKey: string): Promise<void> {
    const actor = this.ensureActor();
    const result = await actor.admin_set_llm_api_key(providerName, apiKey);
    if ('Err' in result) {
      throw new Error(result.Err);
    }
  }

  async adminSetElevenLabsApiKey(apiKey: string): Promise<void> {
    const actor = this.ensureActor();
    const result = await actor.admin_set_eleven_labs_api_key(apiKey);
    if ('Err' in result) {
      throw new Error(result.Err);
    }
  }

  private parseAgent(raw: RawRavenAIAgent): RavenAIAgent {
    const agentType = 'RavenAI' in raw.agent_type 
      ? 'RavenAI' as const
      : { AXIOM: Number(raw.agent_type.AXIOM) };

    return {
      tokenId: raw.token_id,
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
      shortTermMemory: raw.short_term_memory.map((m) => ({
        id: m.id,
        memoryType: m.memory_type,
        content: m.content,
        importance: m.importance,
        timestamp: Number(m.timestamp),
        tags: m.tags,
      })),
      longTermMemory: raw.long_term_memory.map((m) => ({
        id: m.id,
        memoryType: m.memory_type,
        content: m.content,
        importance: m.importance,
        timestamp: Number(m.timestamp),
        tags: m.tags,
      })),
      conversationHistory: raw.conversation_history.map((m) => ({
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
    const actor = this.ensureActor();
    try {
      const result = await actor.get_config();
      return {
        totalAgentsMinted: Number(result.total_agents_minted),
        totalAxiomMinted: Number(result.total_axiom_minted),
        nextTokenId: result.next_token_id,
        nextAxiomNumber: result.next_axiom_number,
        paused: result.paused,
      };
    } catch (error) {
      console.error('Failed to fetch config:', error);
      throw error;
    }
  }

  async getAgent(tokenId: bigint): Promise<RavenAIAgent | null> {
    const actor = this.ensureActor();
    try {
      const result = await actor.get_agent(tokenId);
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
    const actor = this.ensureActor();
    try {
      const result = await actor.get_axiom(axiomNumber);
      if (result[0]) {
        const raw = result[0];
        return {
          number: raw.number,
          tokenId: raw.token_id,
          owner: raw.owner[0]?.toText(),
          minted: raw.minted,
          mintedAt: raw.minted_at[0] ? Number(raw.minted_at[0]) : undefined,
          dedicatedCanister: raw.dedicated_canister[0]?.toText(),
          agent: raw.agent[0] ? this.parseAgent(raw.agent[0]) : undefined,
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch AXIOM:', error);
      throw error;
    }
  }

  async getAgentsByOwner(owner: string): Promise<RavenAIAgent[]> {
    const actor = this.ensureActor();
    try {
      const result = await actor.get_agents_by_owner(Principal.fromText(owner));
      return result.map((agent) => this.parseAgent(agent));
    } catch (error) {
      console.error('Failed to fetch agents by owner:', error);
      throw error;
    }
  }

  async getConversationHistory(tokenId: bigint, limit: number = 50): Promise<ChatMessage[]> {
    const actor = this.ensureActor();
    try {
      const result = await actor.get_conversation_history(tokenId, limit);
      return result.map((msg) => ({
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
    const actor = this.ensureActor();
    try {
      const result = await actor.add_chat_message(tokenId, role, content);
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
    const actor = this.ensureActor();
    try {
      const result = await actor.add_memory(tokenId, memoryType, content, importance, tags);
      if ('Ok' in result) {
        return result.Ok;
      }
      throw new Error(result.Err);
    } catch (error) {
      console.error('Failed to add memory:', error);
      throw error;
    }
  }

  async recallMemories(tokenId: bigint, query: string, limit: number = 10): Promise<MemoryEntry[]> {
    const actor = this.ensureActor();
    try {
      const result = await actor.recall_memories(tokenId, query, limit);
      return result.map((m) => ({
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
    const actor = this.ensureActor();
    try {
      const [total, minted, available] = await actor.get_axiom_availability();
      return {
        total: Number(total),
        minted: Number(minted),
        available: Array.from(available as any).map((n: any) => Number(n)),
      };
    } catch (error) {
      console.error('Failed to fetch AXIOM availability:', error);
      throw error;
    }
  }

  async getTotalSupply(): Promise<{ agents: number; axiom: number }> {
    const actor = this.ensureActor();
    try {
      const [agents, axiom] = await actor.get_total_supply();
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
    const actor = this.ensureActor();
    return await actor.health();
  }

  async isAdmin(principal: Principal): Promise<boolean> {
    const actor = this.ensureActor();
    const config = await actor.get_config();
    return config.admins.some((p) => p.toText() === principal.toText());
  }

  async adminUploadAxiomWasm(wasm: Uint8Array): Promise<any> {
    const actor = this.ensureActor();
    return await (actor as any).admin_upload_axiom_wasm(Array.from(wasm));
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
