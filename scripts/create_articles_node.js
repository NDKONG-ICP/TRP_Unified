#!/usr/bin/env node

/**
 * Node.js script to create all 20 articles
 * This handles JSON parsing and dfx calls more reliably
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

// Escape string for Candid
function escapeCandid(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n');
}

// Create a single article
function createArticle(article, index, total) {
  console.log(`\n[${index + 1}/${total}] Creating: ${article.title.substring(0, 50)}...`);
  
  const persona = personaMap[article.persona] || 'variant { Raven }';
  const tags = `vec { ${article.tags.map(t => `"${escapeCandid(t)}"`).join('; ')} }`;
  const keywords = `vec { ${article.seoKeywords.map(k => `"${escapeCandid(k)}"`).join('; ')} }`;
  const content = escapeCandid(article.content);
  
  const candidArgs = `(
    "${escapeCandid(article.title)}",
    "${escapeCandid(article.slug)}",
    "${escapeCandid(article.excerpt)}",
    "${content}",
    ${persona},
    "${escapeCandid(article.category)}",
    ${tags},
    "${escapeCandid(article.seoTitle)}",
    "${escapeCandid(article.seoDescription)}",
    ${keywords},
    ${article.featured ? 'true' : 'false'}
  )`;
  
  // Write args to a file to avoid shell escaping issues
  const argsFile = `/tmp/article_${index}_args.txt`;
  fs.writeFileSync(argsFile, candidArgs);
  
  const command = `dfx canister call --network ${NETWORK} ${CANISTER} create_article "$(cat ${argsFile})"`;
  
  try {
    const env = { ...process.env, DFX_WARNING: '-mainnet_plaintext_identity', TERM: 'xterm-256color' };
    const output = execSync(command, { 
      encoding: 'utf-8',
      env,
      timeout: 60000, // 60 second timeout per article
      stdio: 'pipe'
    });
    
    // Clean up temp file
    try { fs.unlinkSync(argsFile); } catch (e) {}
    
    if (output.includes('Ok') || output.toLowerCase().includes('ok')) {
      console.log(`✅ Success!`);
      return true;
    } else {
      console.log(`❌ Unexpected response: ${output.substring(0, 100)}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message.substring(0, 100)}`);
    return false;
  }
}

// Main execution
function main() {
  console.log('==========================================');
  console.log('Creating 20 SEO-Optimized Articles');
  console.log('==========================================\n');
  
  // Load articles
  const articles = JSON.parse(fs.readFileSync(ARTICLES_FILE, 'utf-8'));
  console.log(`📝 Found ${articles.length} articles to create\n`);
  
  let success = 0;
  let failed = 0;
  
  // Create each article
  for (let i = 0; i < articles.length; i++) {
    if (createArticle(articles[i], i, articles.length)) {
      success++;
    } else {
      failed++;
    }
    
    // Small delay between calls
    if (i < articles.length - 1) {
      console.log('Waiting 2 seconds before next article...');
      execSync('sleep 2');
    }
  }
  
  console.log('\n==========================================');
  console.log('Article Creation Complete');
  console.log('==========================================');
  console.log(`✅ Success: ${success}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('==========================================\n');
}

main();

