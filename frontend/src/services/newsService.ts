/**
 * News Service - Backend Integration with raven_ai Canister
 * Fetches articles from on-chain storage with SEO optimization
 */

import { Actor, HttpAgent, Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { getCanisterId, getICHost, isMainnet } from './canisterConfig';

// ============ TYPES ============

export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: string;
  authorPrincipal: string;
  authorAvatar?: string;
  category: 'news' | 'crypto' | 'tech' | 'meme' | 'spicy' | 'health' | 'general';
  tags: string[];
  publishedAt: number;
  readTime: number;
  likes: number;
  comments: Comment[];
  shares: number;
  views: number;
  harleeRewards: bigint;
  featured: boolean;
  // SEO fields
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  // URL for sharing
  url: string;
}

export interface Comment {
  id: string;
  author: string;
  authorPrincipal: string;
  authorAvatar?: string;
  content: string;
  timestamp: number;
  likes: number;
  replies: Comment[];
  edited: boolean;
}

// Backend NewsArticle type from canister
interface BackendNewsArticle {
  id: bigint;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author_persona: { Raven: null } | { Harlee: null } | { Macho: null };
  author_principal: [] | [{ toText: () => string }];
  category: string;
  tags: string[];
  seo_title: string;
  seo_description: string;
  seo_keywords: string[];
  published_at: bigint;
  views: bigint;
  likes: bigint;
  shares: bigint;
  harlee_rewards: bigint;
  featured: boolean;
}

// Backend ArticleComment type
interface BackendArticleComment {
  id: bigint;
  article_id: bigint;
  author: { toText: () => string };
  content: string;
  timestamp: bigint;
  likes: bigint;
  edited: boolean;
}

// RavenAI Canister IDL Factory
const ravenAIIdlFactory = ({ IDL }: { IDL: any }) => {
  const ArticlePersona = IDL.Variant({
    'Raven': IDL.Null,
    'Harlee': IDL.Null,
    'Macho': IDL.Null,
  });

    const NewsArticle = IDL.Record({
        'id': IDL.Nat64,
        'title': IDL.Text,
        'slug': IDL.Text,
        'excerpt': IDL.Text,
        'content': IDL.Text,
        'author_persona': ArticlePersona,
        'author_principal': IDL.Opt(IDL.Principal),
        'category': IDL.Text,
        'tags': IDL.Vec(IDL.Text),
    'seo_title': IDL.Text,
    'seo_description': IDL.Text,
    'seo_keywords': IDL.Vec(IDL.Text),
    'published_at': IDL.Nat64,
    'views': IDL.Nat64,
    'likes': IDL.Nat64,
    'shares': IDL.Nat64,
    'harlee_rewards': IDL.Nat64,
    'featured': IDL.Bool,
  });

  const ArticleComment = IDL.Record({
    'id': IDL.Nat64,
    'article_id': IDL.Nat64,
    'author': IDL.Principal,
    'content': IDL.Text,
    'timestamp': IDL.Nat64,
    'likes': IDL.Nat64,
    'edited': IDL.Bool,
  });

  return IDL.Service({
    'get_articles': IDL.Func([IDL.Nat32, IDL.Nat32], [IDL.Vec(NewsArticle)], ['query']),
    'get_article': IDL.Func([IDL.Nat64], [IDL.Opt(NewsArticle)], ['query']),
    'increment_article_views': IDL.Func([IDL.Nat64], [IDL.Variant({ 'Ok': IDL.Nat64, 'Err': IDL.Text })], []),
    'like_article': IDL.Func([IDL.Nat64], [IDL.Variant({ 'Ok': IDL.Nat64, 'Err': IDL.Text })], []),
    'share_article': IDL.Func([IDL.Nat64], [IDL.Variant({ 'Ok': IDL.Nat64, 'Err': IDL.Text })], []),
    'trigger_article_generation': IDL.Func([ArticlePersona, IDL.Opt(IDL.Text)], [IDL.Variant({ 'Ok': NewsArticle, 'Err': IDL.Text })], []),
    'create_article': IDL.Func(
      [
        IDL.Text, // title
        IDL.Text, // slug
        IDL.Text, // excerpt
        IDL.Text, // content
        ArticlePersona, // persona
        IDL.Text, // category
        IDL.Vec(IDL.Text), // tags
        IDL.Text, // seo_title
        IDL.Text, // seo_description
        IDL.Vec(IDL.Text), // seo_keywords
        IDL.Bool, // featured
      ],
      [IDL.Variant({ 'Ok': NewsArticle, 'Err': IDL.Text })],
      []
    ),
    'distribute_article_harlee_rewards': IDL.Func([IDL.Nat64, IDL.Principal, IDL.Nat64], [IDL.Variant({ 'Ok': IDL.Nat64, 'Err': IDL.Text })], []),
    'add_article_comment': IDL.Func([IDL.Nat64, IDL.Text], [IDL.Variant({ 'Ok': ArticleComment, 'Err': IDL.Text })], []),
    'get_article_comments': IDL.Func([IDL.Nat64], [IDL.Vec(ArticleComment)], ['query']),
    'like_comment': IDL.Func([IDL.Nat64], [IDL.Variant({ 'Ok': IDL.Nat64, 'Err': IDL.Text })], []),
  });
};

// ============ SERVICE CLASS ============

export class NewsService {
  private actor: any = null;
  private agent: HttpAgent | null = null;
  private identity?: Identity;

  async init(identity?: Identity): Promise<void> {
    // Skip re-initialization if already initialized with same identity
    if (this.actor && this.identity === identity) {
      return;
    }
    
    this.identity = identity;
    const host = getICHost();
    this.agent = new HttpAgent({ identity, host });
    
    if (!isMainnet()) {
      await this.agent.fetchRootKey();
    }
    
    const canisterId = getCanisterId('raven_ai');
    this.actor = Actor.createActor(ravenAIIdlFactory, {
      agent: this.agent,
      canisterId: Principal.fromText(canisterId),
    });
  }

  private ensureActor(): void {
    if (!this.actor) {
      throw new Error('NewsService not initialized. Call init() first.');
    }
  }

  // Convert backend comment to frontend format
  private convertComment(backend: BackendArticleComment): Comment {
    return {
      id: backend.id.toString(),
      author: 'User', // Will be resolved from principal if needed
      authorPrincipal: typeof backend.author === 'object' && 'toText' in backend.author 
        ? backend.author.toText() 
        : String(backend.author),
      authorAvatar: '👤',
      content: backend.content,
      timestamp: Number(backend.timestamp) / 1_000_000, // Convert nanoseconds to milliseconds (Date expects milliseconds)
      likes: Number(backend.likes),
      replies: [], // Replies not yet implemented
      edited: backend.edited,
    };
  }

  // Convert backend article to frontend format
  private async convertArticle(backend: BackendNewsArticle): Promise<Article> {
    const persona = 'Raven' in backend.author_persona ? 'Raven' :
                   'Harlee' in backend.author_persona ? 'Harlee' : 'Macho';
    
    // Generate shareable URL
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : 'https://ravenproject.io';
    const url = `${baseUrl}/news/${backend.slug || backend.id.toString()}`;
    
    // Calculate read time (average 200 words per minute)
    const wordCount = backend.content.split(/\s+/).length;
    const readTime = Math.max(1, Math.ceil(wordCount / 200));

    // Fetch comments for this article
    let comments: Comment[] = [];
    try {
      const backendComments = await this.actor.get_article_comments(backend.id) as BackendArticleComment[];
      comments = backendComments.map(c => this.convertComment(c));
    } catch (error) {
      console.error('Failed to fetch comments:', error);
      // Continue with empty comments
    }

    return {
      id: backend.id.toString(),
      title: backend.title,
      slug: backend.slug,
      excerpt: backend.excerpt,
      content: backend.content,
      author: persona,
      authorPrincipal: backend.author_principal?.[0]?.toText() || '',
      authorAvatar: persona === 'Raven' ? '🦅' : persona === 'Harlee' ? '💎' : '💪',
      category: backend.category as Article['category'],
      tags: backend.tags,
      publishedAt: Number(backend.published_at) / 1_000_000, // Convert nanoseconds to milliseconds (Date expects milliseconds)
      readTime,
      likes: Number(backend.likes),
      comments,
      shares: Number(backend.shares),
      views: Number(backend.views),
      harleeRewards: backend.harlee_rewards,
      featured: backend.featured,
      seoTitle: backend.seo_title || backend.title,
      seoDescription: backend.seo_description || backend.excerpt,
      seoKeywords: backend.seo_keywords,
      url,
    };
  }

  // ============ ARTICLES ============

  async getArticles(options?: {
    category?: Article['category'];
    featured?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Article[]> {
    this.ensureActor();
    
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;
    
    try {
      const backendArticles = await this.actor.get_articles(limit, offset) as BackendNewsArticle[];
      
      if (!backendArticles || backendArticles.length === 0) {
        console.log('No articles found in backend');
        return [];
      }
      
      // Fetch comments for all articles (in parallel)
      const articlesWithComments = await Promise.all(
        backendArticles.map(async (a) => await this.convertArticle(a))
      );
      let articles = articlesWithComments;
      
      // Filter by category if specified
      if (options?.category) {
        articles = articles.filter(a => a.category === options.category);
      }
      
      // Filter by featured if specified
      if (options?.featured) {
        articles = articles.filter(a => a.featured);
      }
      
      // Sort by published date (newest first)
      articles.sort((a, b) => b.publishedAt - a.publishedAt);
      
      console.log(`Fetched ${articles.length} articles`);
      return articles;
    } catch (error: any) {
      console.error('Failed to fetch articles:', error);
      // Return empty array instead of throwing to prevent UI crash
      return [];
    }
  }

  async getArticle(id: string): Promise<Article | null> {
    this.ensureActor();
    
    try {
      const backendArticle = await this.actor.get_article(BigInt(id)) as BackendNewsArticle | [];
      if (!backendArticle || (Array.isArray(backendArticle) && backendArticle.length === 0)) {
        return null;
      }
      
      const article = await this.convertArticle(backendArticle as BackendNewsArticle);
      
      // Increment views when article is fetched
      await this.incrementViews(id);
      
      return article;
    } catch (error: any) {
      console.error('Failed to fetch article:', error);
      return null;
    }
  }

  async incrementViews(id: string): Promise<number> {
    this.ensureActor();
    
    try {
      const result = await this.actor.increment_article_views(BigInt(id)) as { Ok?: bigint; Err?: string };
      if (result.Err) {
        throw new Error(result.Err);
      }
      return Number(result.Ok || 0);
    } catch (error: any) {
      console.error('Failed to increment views:', error);
      return 0;
    }
  }

  async likeArticle(id: string): Promise<number> {
    this.ensureActor();
    
    try {
      const result = await this.actor.like_article(BigInt(id)) as { Ok?: bigint; Err?: string };
      if (result.Err) {
        throw new Error(result.Err);
      }
      return Number(result.Ok || 0);
    } catch (error: any) {
      console.error('Failed to like article:', error);
      throw error;
    }
  }

  async shareArticle(id: string): Promise<number> {
    this.ensureActor();
    
    try {
      const result = await this.actor.share_article(BigInt(id)) as { Ok?: bigint; Err?: string };
      if (result.Err) {
        throw new Error(result.Err);
      }
      return Number(result.Ok || 0);
    } catch (error: any) {
      console.error('Failed to share article:', error);
      throw error;
    }
  }

  async triggerArticleGeneration(
    persona: 'Raven' | 'Harlee' | 'Macho',
    topic?: string
  ): Promise<Article> {
    this.ensureActor();
    
    if (!this.identity) {
      throw new Error('Authentication required to trigger article generation');
    }
    
    try {
      const personaVariant = persona === 'Raven' ? { Raven: null } :
                            persona === 'Harlee' ? { Harlee: null } : { Macho: null };
      
      const result = await this.actor.trigger_article_generation(
        personaVariant,
        topic ? [topic] : []
      ) as { Ok?: BackendNewsArticle; Err?: string };
      
      if (result.Err) {
        throw new Error(result.Err);
      }
      
      if (!result.Ok) {
        throw new Error('Article generation failed');
      }
      
      return this.convertArticle(result.Ok);
    } catch (error: any) {
      console.error('Failed to trigger article generation:', error);
      throw error;
    }
  }

  async createArticle(args: {
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    persona: 'Raven' | 'Harlee' | 'Macho';
    category: string;
    tags: string[];
    seoTitle: string;
    seoDescription: string;
    seoKeywords: string[];
    featured: boolean;
  }): Promise<Article> {
    this.ensureActor();
    if (!this.identity) {
      throw new Error('Authentication required to create articles');
    }

    const personaVariant =
      args.persona === 'Raven' ? ({ Raven: null } as const) :
      args.persona === 'Harlee' ? ({ Harlee: null } as const) :
      ({ Macho: null } as const);

    const result = await (this.actor as any).create_article(
      args.title,
      args.slug,
      args.excerpt,
      args.content,
      personaVariant,
      args.category,
      args.tags,
      args.seoTitle,
      args.seoDescription,
      args.seoKeywords,
      args.featured
    ) as { Ok?: BackendNewsArticle; Err?: string };

    if (result.Err) {
      throw new Error(result.Err);
    }
    if (!result.Ok) {
      throw new Error('Article creation failed');
    }
    return this.convertArticle(result.Ok);
  }

  /**
   * Regenerate an existing article with full content (admin only)
   */
  async regenerateArticle(
    articleId: string,
    persona?: 'Raven' | 'Harlee' | 'Macho',
    topic?: string
  ): Promise<Article> {
    this.ensureActor();
    
    if (!this.identity) {
      throw new Error('Authentication required to regenerate articles');
    }
    
    try {
      const personaVariant = persona
        ? (persona === 'Raven' ? { Raven: null } : persona === 'Harlee' ? { Harlee: null } : { Macho: null })
        : null;
      
      const result = await (this.actor as any).regenerate_article(
        BigInt(articleId),
        personaVariant ? [personaVariant] : [],
        topic ? [topic] : []
      ) as { Ok?: BackendNewsArticle; Err?: string };
      
      if (result.Err) {
        throw new Error(result.Err);
      }
      
      if (!result.Ok) {
        throw new Error('Article regeneration failed');
      }
      
      return this.convertArticle(result.Ok);
    } catch (error: any) {
      console.error('Failed to regenerate article:', error);
      throw error;
    }
  }

  async distributeHarleeRewards(
    articleId: string,
    contributorPrincipal: string,
    amount: bigint
  ): Promise<bigint> {
    this.ensureActor();
    
    if (!this.identity) {
      throw new Error('Authentication required');
    }
    
    try {
      const result = await this.actor.distribute_article_harlee_rewards(
        BigInt(articleId),
        Principal.fromText(contributorPrincipal),
        amount
      ) as { Ok?: bigint; Err?: string };
      
      if (result.Err) {
        throw new Error(result.Err);
      }
      
      return result.Ok || BigInt(0);
    } catch (error: any) {
      console.error('Failed to distribute HARLEE rewards:', error);
      throw error;
    }
  }

  // Generate shareable URL for article
  getArticleUrl(article: Article): string {
    return article.url || `${typeof window !== 'undefined' ? window.location.origin : ''}/news/${article.slug || article.id}`;
  }

  // ============ COMMENTS ============

  async addComment(articleId: string, content: string): Promise<Comment> {
    this.ensureActor();
    
    if (!this.identity) {
      throw new Error('Authentication required to add comments');
    }
    
    try {
      const result = await this.actor.add_article_comment(
        BigInt(articleId),
        content
      ) as { Ok?: BackendArticleComment; Err?: string };
      
      if (result.Err) {
        throw new Error(result.Err);
      }
      
      if (!result.Ok) {
        throw new Error('Failed to add comment');
      }
      
      return this.convertComment(result.Ok);
    } catch (error: any) {
      console.error('Failed to add comment:', error);
      throw error;
    }
  }

  async getComments(articleId: string): Promise<Comment[]> {
    this.ensureActor();
    
    try {
      const backendComments = await this.actor.get_article_comments(BigInt(articleId)) as BackendArticleComment[];
      return backendComments.map(c => this.convertComment(c));
    } catch (error: any) {
      console.error('Failed to fetch comments:', error);
      return [];
    }
  }

  async likeComment(commentId: string): Promise<number> {
    this.ensureActor();
    
    try {
      const result = await this.actor.like_comment(BigInt(commentId)) as { Ok?: bigint; Err?: string };
      if (result.Err) {
        throw new Error(result.Err);
      }
      return Number(result.Ok || 0);
    } catch (error: any) {
      console.error('Failed to like comment:', error);
      throw error;
    }
  }

  // ============ ARTICLE SUBMISSION & PLAGIARISM ============

  async submitArticle(data: {
    title: string;
    content: string;
    plagiarismScore?: number;
    aiProbability?: number;
  }): Promise<boolean> {
    this.ensureActor();
    
    if (!this.identity) {
      throw new Error('Authentication required');
    }
    
    try {
      const result = await this.actor.submit_user_article(
        data.title,
        data.content,
        [] // author_name optional (empty array = null)
      ) as { Ok?: bigint; Err?: string };
      
      if (result.Err) {
        throw new Error(result.Err);
      }
      
      return result.Ok !== undefined;
    } catch (error: any) {
      console.error('Failed to submit article:', error);
      throw error;
    }
  }

  async checkPlagiarism(content: string): Promise<any> {
    this.ensureActor();
    
    try {
      return await this.actor.check_article_plagiarism(content);
    } catch (error: any) {
      console.error('Plagiarism check failed:', error);
      throw error;
    }
  }

  async checkAIDetection(content: string): Promise<any> {
    this.ensureActor();
    
    try {
      const result = await this.actor.check_article_ai_detection(content) as { Ok?: any; Err?: string };
      if (result.Err) {
        throw new Error(result.Err);
      }
      return result.Ok || { probability: 0, confidence: 0, indicators: [] };
    } catch (error: any) {
      console.error('AI detection failed:', error);
      throw error;
    }
  }

  async generateWorksCited(matches: any[]): Promise<any[]> {
    this.ensureActor();
    
    try {
      return await this.actor.generate_works_cited(matches);
    } catch (error: any) {
      console.error('Works cited generation failed:', error);
      throw error;
    }
  }

  async getHaloSuggestions(content: string, writingStyle?: string): Promise<any> {
    this.ensureActor();
    
    if (!this.identity) {
      throw new Error('Authentication required');
    }
    
    try {
      const result = await this.actor.halo_writing_assistant(
        content, 
        writingStyle ? [writingStyle] : []
      ) as { Ok?: any; Err?: string };
      
      if (result.Err) {
        throw new Error(result.Err);
      }
      
      return result.Ok || {
        suggestions: '',
        grammar_score: 0,
        clarity_score: 0,
        academic_score: 0,
        recommendations: []
      };
    } catch (error: any) {
      console.error('HALO suggestions failed:', error);
      throw error;
    }
  }
}

// Singleton
export const newsService = new NewsService();

// ============ REACT HOOKS ============

import { useState, useEffect, useCallback } from 'react';

export function useArticles(options?: {
  category?: Article['category'];
  featured?: boolean;
  limit?: number;
  offset?: number;
}, identity?: Identity) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchArticles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await newsService.init(identity);
      const data = await newsService.getArticles(options);
      setArticles(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch articles');
    } finally {
      setIsLoading(false);
    }
  }, [identity, options?.category, options?.featured, options?.limit, options?.offset]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  return { articles, isLoading, error, refresh: fetchArticles };
}

export default newsService;
