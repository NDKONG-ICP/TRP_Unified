import { Actor, HttpAgent } from '@dfinity/agent';
import { idlFactory as ravenAIIdlFactory } from '../declarations/raven_ai';
import { _SERVICE } from '../declarations/raven_ai/raven_ai.did';
import { Principal } from '@dfinity/principal';
import { HALOOptions, CitationFormat } from '../components/halo/HALOUpload';
import { getCanisterId, getICHost, isMainnet } from './canisterConfig';
import type { Identity } from '@dfinity/agent';

class HALOService {
  private actor: Actor | null = null;
  private identity: Identity | null = null;

  init(identity: Identity) {
    this.identity = identity;
    const agent = new HttpAgent({
      identity,
      host: getICHost(),
    });

    // Fetch root key for local development
    if (!isMainnet()) {
      agent.fetchRootKey().catch(console.error);
    }

    const canisterId = getCanisterId('raven_ai');
    this.actor = Actor.createActor<_SERVICE>(ravenAIIdlFactory, {
      agent,
      canisterId: Principal.fromText(canisterId),
    });
  }

  ensureActor() {
    if (!this.actor) {
      throw new Error('HALO service not initialized. Please connect your wallet.');
    }
  }

  async processDocument(
    documentData: number[],
    fileType: string,
    format: CitationFormat,
    options: HALOOptions
  ): Promise<any> {
    this.ensureActor();

    try {
      const formatVariant = format === 'MLA' ? { MLA: null } :
                           format === 'APA' ? { APA: null } :
                           format === 'Chicago' ? { Chicago: null } :
                           format === 'Harvard' ? { Harvard: null } :
                           { IEEE: null };

      const result = await (this.actor as any).process_halo_document(
        documentData,
        fileType,
        formatVariant,
        {
          rewrite: options.rewrite,
          generate_citations: options.generate_citations,
          check_plagiarism: options.check_plagiarism,
          grammar_check: options.grammar_check,
        }
      ) as { Ok?: any; Err?: string };

      if (result.Err) {
        throw new Error(result.Err);
      }

      if (!result.Ok) {
        throw new Error('Document processing failed');
      }

      return result.Ok;
    } catch (error: any) {
      console.error('Failed to process document:', error);
      throw error;
    }
  }
}

export const haloService = new HALOService();

