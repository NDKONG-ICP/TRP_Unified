#!/usr/bin/env node

/**
 * Simplified article loader - creates articles one at a time with proper error handling
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const NETWORK = 'ic';
const CANISTER = '3noas-jyaaa-aaaao-a4xda-cai';
const ARTICLES_FILE = path.join(__dirname, 'articles_data.json');

// Persona mapping
const personaMap = {
  'Raven': 'variant { Raven }',
  'Harlee': 'variant { Harlee }',
  'Macho': 'variant { Macho }'
};

// Escape for Candid strings
function escapeCandid(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

// Create article using dfx
function createArticle(article, index, total) {
  const num = index + 1;
  process.stdout.write(`[${num}/${total}] ${article.title.substring(0, 60)}... `);
  
  const persona = personaMap[article.persona] || 'variant { Raven }';
  const tags = `vec { ${article.tags.map(t => `"${escapeCandid(t)}"`).join('; ')} }`;
  const keywords = `vec { ${article.seoKeywords.map(k => `"${escapeCandid(k)}"`).join('; ')} }`;
  
  // For very long content, we'll truncate if needed or use a file
  let content = escapeCandid(article.content);
  if (content.length > 50000) {
    content = content.substring(0, 50000) + '...';
  }
  
  // Build Candid arguments
  const args = [
    `"${escapeCandid(article.title)}"`,
    `"${escapeCandid(article.slug)}"`,
    `"${escapeCandid(article.excerpt)}"`,
    `"${content}"`,
    persona,
    `"${escapeCandid(article.category)}"`,
    tags,
    `"${escapeCandid(article.seoTitle)}"`,
    `"${escapeCandid(article.seoDescription)}"`,
    keywords,
    article.featured ? 'true' : 'false'
  ].join(', ');
  
  const candidCall = `(${args})`;
  
  // Write to temp file to avoid shell escaping issues
  const tempFile = `/tmp/article_${index}.candid`;
  fs.writeFileSync(tempFile, candidCall);
  
  try {
    const env = { 
      ...process.env, 
      DFX_WARNING: '-mainnet_plaintext_identity',
      TERM: 'xterm-256color'
    };
    
    const command = `dfx canister call --network ${NETWORK} ${CANISTER} create_article "$(cat ${tempFile})"`;
    const output = execSync(command, {
      encoding: 'utf-8',
      env,
      timeout: 90000,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    // Clean up
    try { fs.unlinkSync(tempFile); } catch (e) {}
    
    if (output.includes('Ok =') || output.includes('ok =')) {
      console.log('✅');
      return true;
    } else {
      console.log('❌ (unexpected response)');
      return false;
    }
  } catch (error) {
    try { fs.unlinkSync(tempFile); } catch (e) {}
    const errMsg = error.stderr?.toString() || error.message || 'Unknown error';
    if (errMsg.includes('Admin access required')) {
      console.log('❌ (admin required)');
    } else {
      console.log(`❌ (${errMsg.substring(0, 50)})`);
    }
    return false;
  }
}

// Main
function main() {
  console.log('==========================================');
  console.log('Loading 20 SEO-Optimized Articles');
  console.log('==========================================\n');
  
  const articles = JSON.parse(fs.readFileSync(ARTICLES_FILE, 'utf-8'));
  console.log(`📝 Found ${articles.length} articles\n`);
  
  let success = 0;
  let failed = 0;
  
  for (let i = 0; i < articles.length; i++) {
    if (createArticle(articles[i], i, articles.length)) {
      success++;
    } else {
      failed++;
    }
    
    // Delay between calls (except last one)
    if (i < articles.length - 1) {
      process.stdout.write('   Waiting 2s... ');
      try {
        execSync('sleep 2', { stdio: 'ignore' });
        console.log('✓\n');
      } catch (e) {
        console.log('\n');
      }
    }
  }
  
  console.log('\n==========================================');
  console.log('Article Loading Complete');
  console.log('==========================================');
  console.log(`✅ Success: ${success}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('==========================================\n');
}

main();



