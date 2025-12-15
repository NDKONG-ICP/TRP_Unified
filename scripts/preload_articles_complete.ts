/**
 * Complete Article Preload Script
 * Preloads 20 SEO-optimized articles into Raven News
 * 
 * Run with: npx ts-node scripts/preload_articles_complete.ts
 * Requires: dfx identity with admin access
 */

import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { readFileSync } from 'fs';
import { join } from 'path';

const RAVEN_AI_CANISTER_ID = '3noas-jyaaa-aaaao-a4xda-cai';
const NETWORK = process.env.DFX_NETWORK || 'ic';

// Import articles from separate JSON file for maintainability
// For now, we'll define them inline
const ARTICLES = require('./articles_data.json');

async function preloadArticles() {
  console.log('🚀 Starting article preload...');
  
  // Create agent (requires identity)
  const agent = new HttpAgent({
    host: NETWORK === 'ic' 
      ? 'https://icp-api.io' 
      : 'http://127.0.0.1:4943'
  });
  
  // Load identity (user must have dfx identity set)
  await agent.fetchRootKey();
  
  // Create actor
  const actor = Actor.createActor(
    ({ IDL }: any) => IDL.Service({
      create_article: IDL.Func(
        [
          IDL.Text, // title
          IDL.Text, // slug
          IDL.Text, // excerpt
          IDL.Text, // content
          IDL.Variant({ Raven: IDL.Null, Harlee: IDL.Null, Macho: IDL.Null }), // persona
          IDL.Text, // category
          IDL.Vec(IDL.Text), // tags
          IDL.Text, // seo_title
          IDL.Text, // seo_description
          IDL.Vec(IDL.Text), // seo_keywords
          IDL.Bool, // featured
        ],
        [IDL.Variant({ Ok: IDL.Record({
          id: IDL.Nat64,
          title: IDL.Text,
          slug: IDL.Text,
          excerpt: IDL.Text,
          content: IDL.Text,
          author_persona: IDL.Variant({ Raven: IDL.Null, Harlee: IDL.Null, Macho: IDL.Null }),
          category: IDL.Text,
          tags: IDL.Vec(IDL.Text),
          seo_title: IDL.Text,
          seo_description: IDL.Text,
          seo_keywords: IDL.Vec(IDL.Text),
          published_at: IDL.Nat64,
          views: IDL.Nat64,
          likes: IDL.Nat64,
          shares: IDL.Nat64,
          harlee_rewards: IDL.Nat64,
          featured: IDL.Bool,
        }), Err: IDL.Text })],
        []
      ),
    }),
    {
      agent,
      canisterId: Principal.fromText(RAVEN_AI_CANISTER_ID),
    }
  );
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const article of ARTICLES) {
    try {
      console.log(`📝 Creating: ${article.title.substring(0, 50)}...`);
      
      const persona = article.persona === 'Raven' 
        ? { Raven: null }
        : article.persona === 'Harlee'
        ? { Harlee: null }
        : { Macho: null };
      
      const result: any = await actor.create_article(
        article.title,
        article.slug,
        article.excerpt,
        article.content,
        persona,
        article.category,
        article.tags,
        article.seoTitle,
        article.seoDescription,
        article.seoKeywords,
        article.featured || false,
      );
      
      if ('Ok' in result) {
        console.log(`✅ Created article ID: ${result.Ok.id}`);
        successCount++;
      } else {
        console.error(`❌ Error: ${result.Err}`);
        errorCount++;
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error: any) {
      console.error(`❌ Failed to create article: ${error.message}`);
      errorCount++;
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📝 Total: ${ARTICLES.length}`);
}

// Run if called directly
if (require.main === module) {
  preloadArticles().catch(console.error);
}

export { preloadArticles };



