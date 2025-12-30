/**
 * Queen Bee Service - AI pipeline orchestrator (on-chain + HTTP parallel)
 */
import type { Identity } from '@dfinity/agent';
import { getCanisterId } from './canisterConfig';
import { createActorWithIdl } from './actorFactory';
import { idlFactory as queenBeeIdl } from '../declarations/queen_bee';
import type { _SERVICE as QueenBeeActor } from '../declarations/queen_bee/queen_bee.did';

export interface ChatMessage {
  role: string;
  content: string;
  timestamp: bigint;
}

export interface AIRequest {
  query_text: string;
  system_prompt?: string;
  context: ChatMessage[];
  token_id?: bigint;
  use_onchain: boolean;
  use_http_parallel: boolean;
}

export interface AIResponse {
  response: string;
  confidence_score: number;
  inference_method: string;
  tokens_used: number;
  latency_ms: bigint;
  model_responses: Array<[string, string, number]>;
}

export class QueenBeeService {
  private actor: QueenBeeActor | null = null;

  async init(identity?: Identity): Promise<void> {
    const canisterId = getCanisterId('queen_bee');
    this.actor = await createActorWithIdl<QueenBeeActor>(canisterId, queenBeeIdl, identity);
  }

  private ensureActor(): QueenBeeActor {
    if (!this.actor) {
      throw new Error('QueenBeeService not initialized. Call init() first.');
    }
    return this.actor;
  }

  async processAIRequest(req: AIRequest, identity?: Identity): Promise<AIResponse> {
    if (identity) {
      await this.init(identity);
    } else if (!this.actor) {
      await this.init();
    }

    const actor = this.ensureActor();
    const result = await actor.process_ai_request({
      query_text: req.query_text,
      system_prompt: req.system_prompt ? [req.system_prompt] : [],
      context: req.context.map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: BigInt(m.timestamp),
      })),
      token_id: req.token_id ? [BigInt(req.token_id)] : [],
      use_onchain: req.use_onchain,
      use_http_parallel: req.use_http_parallel,
    });

    if ('Err' in result) {
      throw new Error(result.Err);
    }
    return result.Ok as unknown as AIResponse;
  }
}

export const queenBeeService = new QueenBeeService();


