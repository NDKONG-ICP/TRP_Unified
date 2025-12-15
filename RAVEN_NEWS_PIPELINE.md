# Raven News Pipeline - SEO-Optimized Trending Articles

## Overview

Raven News uses a sophisticated **two-stage AI pipeline** to generate consistent, SEO-optimized trending articles. The system combines real-time web research (Perplexity) with advanced article generation (Hugging Face) to produce high-quality, search-engine-friendly content.

---

## 🏗️ Architecture

### Pipeline Flow:
```
Topic Selection (Persona-based)
    ↓
[Stage 1: Research]
Perplexity Sonar Pro (Real-time Search)
    ↓
Trending News Data + Sources
    ↓
[Stage 2: Generation]
Hugging Face Qwen2.5-72B-Instruct
    ↓
Full Article (1000+ words, SEO-optimized)
    ↓
[Stage 3: SEO Processing]
Title Extraction → Slug Generation → Meta Description → Keywords
    ↓
Article Storage (On-chain)
```

---

## 📝 Article Personas

The system generates articles using three distinct personas, each with unique topics and writing styles:

### 1. **Raven** (Tech/Crypto Journalist)
- **Topics**: Trending cryptocurrency and blockchain news
- **Style**: Professional yet accessible, knowledgeable, engaging
- **Category**: `news`
- **Tags**: `["crypto", "blockchain", "tech"]`
- **System Prompt**: *"You are Raven, a knowledgeable and engaging tech/crypto journalist. Write in a professional yet accessible style with personality. Focus on accuracy and provide context."*

### 2. **Harlee** (General Content Creator)
- **Topics**: General trending topics
- **Style**: Warm, conversational, makes complex topics easy to understand
- **Category**: `general`
- **Tags**: `["general", "trending"]`
- **System Prompt**: *"You are Harlee, a friendly and informative content creator. Write in a warm, conversational style that makes complex topics easy to understand."*

### 3. **Macho** (Health/Fitness Expert)
- **Topics**: Health and fitness tips, workout routines, nutrition
- **Style**: Energetic, motivational, actionable advice backed by science
- **Category**: `health`
- **Tags**: `["health", "fitness", "wellness"]`
- **System Prompt**: *"You are Macho, a fitness and health expert. Write in an energetic, motivational style. Provide actionable advice backed by science. Focus on workouts, nutrition, and wellness."*

---

## 🔄 Complete Pipeline Process

### Step 1: Topic Selection

**Function**: `generate_daily_article_internal()` (line 3865)

```rust
// Determine topic based on persona (or use provided topic)
let article_topic = topic.unwrap_or_else(|| {
    match persona {
        ArticlePersona::Raven => "trending cryptocurrency and blockchain news".to_string(),
        ArticlePersona::Harlee => "general trending topics".to_string(),
        ArticlePersona::Macho => "health and fitness tips, workout routines, nutrition".to_string(),
    }
});
```

**What happens:**
- If no topic provided, uses persona-specific default
- If topic provided (admin trigger), uses that topic
- Topic is used to query Perplexity for trending news

---

### Step 2: Real-Time Research (Perplexity)

**Function**: `call_perplexity_for_news()` (line 4054)

```rust
async fn call_perplexity_for_news(query: &str) -> Result<String, String> {
    let perplexity_query = format!(
        "What are the latest trending and breaking news stories about {}? Provide detailed information with sources.",
        article_topic
    );
    
    // HTTP Outcall to Perplexity API
    let body = json!({
        "model": "sonar-pro",
        "messages": [
            {
                "role": "system",
                "content": "You are a news research assistant. Provide detailed, factual information about trending topics with sources."
            },
            {
                "role": "user",
                "content": perplexity_query
            }
        ],
        "max_tokens": 1000,
        "temperature": 0.7,
        "return_citations": true,        // ✅ Includes source citations
        "search_recency_filter": "month"  // ✅ Only recent news (last month)
    });
    
    // Make HTTP outcall
    let (response,) = http_request(request, 50_000_000_000).await?;
    
    // Extract content from response
    let content = json["choices"][0]["message"]["content"].as_str();
    
    Ok(content.to_string())
}
```

**Key Features:**
- **Real-time search**: Perplexity searches the web for current trending topics
- **Source citations**: Includes URLs and sources for fact-checking
- **Recency filter**: Only returns news from the last month
- **Detailed information**: Provides comprehensive research data

**Example Query:**
```
"What are the latest trending and breaking news stories about 
trending cryptocurrency and blockchain news? 
Provide detailed information with sources."
```

**Example Response:**
```
"Bitcoin Surges 30% Following Institutional Adoption News

According to recent reports from CoinDesk and Bloomberg, 
Bitcoin has experienced a significant price surge following 
announcements from major institutional investors...

Sources:
- https://www.coindesk.com/...
- https://www.bloomberg.com/..."
```

---

### Step 3: Article Generation (Hugging Face)

**Function**: `generate_article_with_hf()` (line 4122)

```rust
async fn generate_article_with_hf(prompt: &str, system_prompt: &str) -> Result<String, String> {
    // Use Qwen2.5-72B-Instruct (capable model for long-form content)
    let model_url = "https://api-inference.huggingface.co/models/Qwen/Qwen2.5-72B-Instruct";
    
    let body = json!({
        "inputs": format!("{}\n\n{}", system_prompt, prompt),
        "parameters": {
            "max_new_tokens": 3000,      // ✅ 3000 tokens = ~2250 words
            "temperature": 0.7,          // ✅ Balanced creativity/accuracy
            "top_p": 0.95,
            "return_full_text": false,
            "do_sample": true,
            "repetition_penalty": 1.1     // ✅ Prevents repetition
        }
    });
    
    // HTTP outcall to Hugging Face
    let (response,) = http_request(request, 50_000_000_000).await?;
    
    // Extract generated text
    let article_content = json[0]["generated_text"].as_str();
    
    Ok(article_content.to_string())
}
```

**Article Generation Prompt** (line 3902):

The prompt is extremely detailed and structured:

```
"Write a FULL, comprehensive, SEO-optimized article about: {topic}

Use this research information: {perplexity_results}

CRITICAL REQUIREMENTS - Generate a COMPLETE article:

1. TITLE (60 characters max, keyword-rich, engaging):
   - Must be SEO-optimized with primary keyword
   - Compelling and click-worthy
   - Write the title on the first line starting with '# '

2. INTRODUCTION (150-200 words):
   - Hook the reader immediately
   - Provide context and background
   - State the main topic clearly
   - Include primary keyword naturally

3. MAIN BODY (800-1200 words minimum):
   - Use H2 headings (##) for major sections (3-5 sections)
   - Use H3 headings (###) for subsections
   - Each section should be 200-300 words
   - Include detailed explanations, examples, and insights
   - Integrate keywords naturally throughout
   - Use bullet points or numbered lists where appropriate
   - Include relevant statistics, data, or quotes from research
   - Add internal/external links where relevant (format: [link text](url))

4. CONCLUSION (100-150 words):
   - Summarize key points
   - Provide actionable takeaways
   - Include a call-to-action
   - Reinforce main message

5. SEO OPTIMIZATION:
   - Meta description (150-160 chars): Write a compelling summary
   - Keywords: Include 5-10 relevant keywords naturally
   - Use semantic HTML structure
   - Include alt text suggestions for images

6. WRITING STYLE:
   - Write in {persona}'s voice and personality
   - Professional yet accessible
   - Engaging and informative
   - Well-researched and accurate
   - Cite sources when referencing data

7. FORMAT:
   - Use Markdown formatting
   - Proper heading hierarchy (H2, H3)
   - Paragraphs should be 3-5 sentences
   - Use formatting (bold, italic) for emphasis

IMPORTANT: This must be a FULL, complete article - NOT an outline. 
Minimum 1000 words total. Write the complete article now:"
```

**What happens:**
- Combines persona system prompt with detailed article prompt
- Includes Perplexity research results for factual accuracy
- Generates 1000-1500 word article with proper structure
- Uses Markdown formatting (H2, H3 headings, lists, links)
- Follows persona's writing style

---

### Step 4: Content Parsing

**Function**: `parse_article_content()` (line 4187)

```rust
fn parse_article_content(content: &str) -> (String, String, String) {
    let lines: Vec<&str> = content.lines().collect();
    
    // Extract title from first line (should start with #)
    let title = lines.iter()
        .find(|line| line.trim().starts_with('#'))
        .map(|l| l.trim().trim_start_matches('#').trim().to_string())
        .unwrap_or_else(|| "Breaking News".to_string());
    
    // Extract content (everything after title)
    let content_start = lines.iter()
        .position(|l| l.trim().starts_with('#'))
        .map(|i| i + 1)
        .unwrap_or(0);
    
    let content = lines[content_start..]
        .join("\n")
        .trim()
        .to_string();
    
    // Generate excerpt from first meaningful paragraph (150-160 chars for SEO)
    let excerpt = lines.iter()
        .skip(content_start)
        .find(|l| l.trim().len() > 50)  // First substantial paragraph
        .map(|l| {
            let text = l.trim();
            if text.len() > 160 {
                text[..157].to_string() + "..."
            } else {
                text.to_string()
            }
        })
        .unwrap_or_else(|| {
            // Fallback: first 160 chars of content
            if content.len() > 160 {
                content[..157].to_string() + "..."
            } else {
                content.clone()
            }
        });
    
    // Validate word count
    let word_count = content.split_whitespace().count();
    if word_count < 500 {
        ic_cdk::println!("⚠️ Warning: Article has only {} words (minimum 500 recommended)", word_count);
    }
    
    (title, content, excerpt)
}
```

**What happens:**
- Extracts title from first `# ` line
- Removes title from content body
- Generates excerpt from first substantial paragraph (150-160 chars for SEO)
- Validates word count (warns if < 500 words)

---

### Step 5: SEO Optimization

#### A. Slug Generation

**Function**: `generate_slug()` (line 4262)

```rust
fn generate_slug(title: &str) -> String {
    title
        .to_lowercase()
        .chars()
        .map(|c| {
            if c.is_alphanumeric() || c == ' ' {
                c
            } else {
                '-'
            }
        })
        .collect::<String>()
        .split_whitespace()
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join("-")
        .chars()
        .take(100)  // Max 100 characters
        .collect()
}
```

**Example:**
- Title: `"Bitcoin Surges 30% Following Institutional Adoption"`
- Slug: `"bitcoin-surges-30-following-institutional-adoption"`

**SEO Benefits:**
- URL-friendly (lowercase, hyphens)
- Readable by humans
- Contains keywords
- Max 100 characters

---

#### B. SEO Description Generation

**Function**: `generate_seo_description()` (line 4277)

```rust
fn generate_seo_description(content: &str, title: &str) -> String {
    // Extract from introduction paragraph (first substantial paragraph)
    let intro = content
        .lines()
        .skip_while(|l| l.trim().is_empty() || l.trim().starts_with('#'))
        .find(|l| l.trim().len() > 50)
        .map(|l| l.trim().to_string())
        .unwrap_or_default();
    
    // Ensure 150-160 characters (optimal for search engines)
    let mut description = if intro.len() > 160 {
        intro[..157].to_string() + "..."
    } else if intro.len() < 150 {
        // Pad with title if too short
        format!("{} - {}", title, intro)
            .chars()
            .take(160)
            .collect::<String>()
    } else {
        intro
    };
    
    // Ensure description is exactly 150-160 chars
    if description.len() > 160 {
        description = description[..157].to_string() + "...";
    } else if description.len() < 150 {
        // Add more context if too short
        let additional = content
            .lines()
            .skip(1)
            .find(|l| l.trim().len() > 20)
            .map(|l| l.trim())
            .unwrap_or("");
        
        description = format!("{} {}", description, additional)
            .chars()
            .take(160)
            .collect::<String>();
    }
    
    description
}
```

**SEO Requirements:**
- **Length**: 150-160 characters (optimal for Google search results)
- **Source**: First meaningful paragraph (introduction)
- **Content**: Includes primary keyword, compelling summary
- **Format**: Natural language, no keyword stuffing

**Example:**
```
Title: "Bitcoin Surges 30% Following Institutional Adoption"
Description: "Bitcoin experiences significant price surge as major 
institutional investors announce adoption. Analysis of market trends 
and future implications for cryptocurrency..."
```

---

#### C. Keyword Extraction

**Function**: `extract_keywords()` (line 4330)

```rust
fn extract_keywords(content: &str, title: &str) -> Vec<String> {
    // Extract keywords from title (excluding stop words)
    let title_words: Vec<String> = title
        .to_lowercase()
        .split_whitespace()
        .filter(|w| {
            let word = w.trim_matches(|c: char| !c.is_alphanumeric());
            word.len() > 3 && !is_stop_word(word)
        })
        .map(|w| w.trim_matches(|c: char| !c.is_alphanumeric()).to_string())
        .collect();
    
    // Category-specific keywords
    let category_keywords = match detect_category(content) {
        "crypto" => vec!["cryptocurrency", "blockchain", "bitcoin", "ethereum", "defi"],
        "health" => vec!["fitness", "workout", "nutrition", "wellness", "exercise"],
        "tech" => vec!["technology", "innovation", "software", "hardware", "ai"],
        _ => vec!["trending", "news", "update", "latest"],
    };
    
    // Word frequency analysis from content
    let mut word_freq: HashMap<String, usize> = HashMap::new();
    for word in content
        .to_lowercase()
        .split_whitespace()
        .filter(|w| w.len() > 4 && !is_stop_word(w))
    {
        let clean_word = word.trim_matches(|c: char| !c.is_alphanumeric()).to_string();
        if !clean_word.is_empty() {
            *word_freq.entry(clean_word).or_insert(0) += 1;
        }
    }
    
    // Combine: title keywords + category keywords + top frequency words
    let mut keywords: Vec<String> = title_words;
    keywords.extend(category_keywords);
    
    // Add top 3-5 frequent words from content
    let mut freq_words: Vec<_> = word_freq.into_iter().collect();
    freq_words.sort_by(|a, b| b.1.cmp(&a.1));
    keywords.extend(
        freq_words
            .iter()
            .take(5)
            .map(|(word, _)| word.clone())
    );
    
    // Remove duplicates and limit to 10 keywords
    keywords.sort();
    keywords.dedup();
    keywords.truncate(10);
    
    keywords
}
```

**Keyword Sources:**
1. **Title keywords**: Extracted from article title (excluding stop words)
2. **Category keywords**: Pre-defined keywords based on article category
3. **Frequency analysis**: Most common words in content (excluding stop words)

**Example:**
```
Title: "Bitcoin Surges 30% Following Institutional Adoption"
Keywords: [
    "bitcoin",           // From title
    "surges",            // From title
    "institutional",     // From title
    "adoption",          // From title
    "cryptocurrency",    // Category keyword
    "blockchain",        // Category keyword
    "price",             // High frequency in content
    "market",            // High frequency in content
    "investors"          // High frequency in content
]
```

---

### Step 6: Article Storage

**Function**: `generate_daily_article_internal()` (line 3924)

```rust
// Create article with all SEO metadata
let article = NewsArticle {
    id: article_id,
    title: title.clone(),
    slug,                    // ✅ SEO-friendly URL
    excerpt,                 // ✅ 150-160 chars
    content,                 // ✅ 1000+ words, markdown
    author_persona: persona,
    category: category.to_string(),
    tags,
    seo_title: title,        // ✅ SEO-optimized title
    seo_description,         // ✅ 150-160 chars meta description
    seo_keywords,            // ✅ 5-10 relevant keywords
    published_at: ic_cdk::api::time(),
    views: 0,
    likes: 0,
    shares: 0,
    harlee_rewards: 0,
    featured: false,
};

// Store in stable storage
ARTICLES.with(|a| {
    a.borrow_mut().insert(StorableU64(article_id), article.clone());
});
```

**Storage:**
- Stored in `StableBTreeMap` (persistent across upgrades)
- Each article has unique ID (auto-incrementing)
- All SEO metadata included
- On-chain storage (decentralized, immutable)

---

## 🔄 Daily Generation (Automated)

### Heartbeat Function

**Function**: `heartbeat()` (line 1370)

```rust
#[heartbeat]
async fn heartbeat() {
    let now = ic_cdk::api::time();
    let last_generation = LAST_ARTICLE_GENERATION.with(|l| *l.borrow());
    
    // Generate articles once per day (24 hours = 86,400,000,000,000 nanoseconds)
    let day_ns = 86_400_000_000_000u64;
    
    if now - last_generation > day_ns {
        // Generate articles for each persona
        let _ = generate_daily_article_internal(ArticlePersona::Raven, None).await;
        let _ = generate_daily_article_internal(ArticlePersona::Harlee, None).await;
        let _ = generate_daily_article_internal(ArticlePersona::Macho, None).await;
        
        // Update last generation time
        LAST_ARTICLE_GENERATION.with(|l| *l.borrow_mut() = now);
    }
}
```

**What happens:**
- Runs automatically every ~1 minute (IC heartbeat)
- Checks if 24 hours have passed since last generation
- Generates 3 articles (one per persona) if needed
- Updates timestamp to prevent duplicate generation

**Result:**
- **3 articles per day** (one per persona)
- **Consistent quality** (same pipeline every time)
- **Trending topics** (Perplexity ensures current news)
- **SEO-optimized** (all metadata generated automatically)

---

## 🎯 SEO Optimization Features

### 1. **Title Optimization**
- ✅ Maximum 60 characters (optimal for search results)
- ✅ Primary keyword included
- ✅ Compelling and click-worthy
- ✅ Matches content topic

### 2. **Meta Description**
- ✅ 150-160 characters (optimal length)
- ✅ Extracted from introduction
- ✅ Includes primary keyword
- ✅ Compelling summary

### 3. **Keywords**
- ✅ 5-10 relevant keywords
- ✅ From title + category + content frequency
- ✅ Natural integration (no stuffing)
- ✅ Category-specific keywords included

### 4. **URL Structure**
- ✅ SEO-friendly slugs (lowercase, hyphens)
- ✅ Contains keywords
- ✅ Readable by humans
- ✅ Max 100 characters

### 5. **Content Structure**
- ✅ Proper heading hierarchy (H2, H3)
- ✅ 1000+ words (comprehensive content)
- ✅ Paragraphs 3-5 sentences
- ✅ Markdown formatting
- ✅ Internal/external links

### 6. **On-Chain Storage**
- ✅ Immutable (can't be deleted)
- ✅ Decentralized (no single point of failure)
- ✅ Permanent (survives upgrades)
- ✅ Transparent (verifiable)

---

## 📊 Article Structure

### Generated Article Format:

```markdown
# SEO-Optimized Title (60 chars max)

Introduction paragraph (150-200 words)
- Hook the reader
- Provide context
- State main topic
- Include primary keyword

## Major Section 1 (H2 heading)
Content (200-300 words)
- Detailed explanations
- Examples and insights
- Keywords naturally integrated

### Subsection 1.1 (H3 heading)
More detailed content...

## Major Section 2 (H2 heading)
Content (200-300 words)

## Major Section 3 (H2 heading)
Content (200-300 words)

## Conclusion (H2 heading)
Summary (100-150 words)
- Key takeaways
- Call-to-action
- Reinforce main message
```

**Word Count:**
- Minimum: 1000 words
- Target: 1200-1500 words
- Maximum: ~2250 words (3000 tokens)

---

## 🔧 Manual Triggers

### Admin-Triggered Generation

**Function**: `generate_daily_article()` (line 3972)

```rust
#[update]
async fn generate_daily_article(
    persona: ArticlePersona,
    topic: Option<String>,
) -> Result<NewsArticle, String> {
    let caller = ic_cdk::caller();
    
    if !is_admin(caller) {
        return Err("Admin access required".to_string());
    }
    
    generate_daily_article_internal(persona, topic).await
}
```

**Usage:**
```bash
# Generate Raven article on specific topic
dfx canister call raven_ai generate_daily_article \
  '(variant { Raven }, opt "Bitcoin price surge")'

# Generate Harlee article (default topic)
dfx canister call raven_ai generate_daily_article \
  '(variant { Harlee }, null)'
```

### Frontend Trigger

**Service**: `newsService.ts`

```typescript
async triggerArticleGeneration(
  persona: 'Raven' | 'Harlee' | 'Macho',
  topic?: string
): Promise<Article> {
  const result = await this.actor.trigger_article_generation(
    persona === 'Raven' ? { Raven: null } :
    persona === 'Harlee' ? { Harlee: null } :
    { Macho: null },
    topic ? [topic] : []
  );
  
  if ('Ok' in result) {
    return this.mapBackendArticle(result.Ok);
  } else {
    throw new Error(result.Err);
  }
}
```

---

## 🔄 Article Regeneration

**Function**: `regenerate_article()` (line 3988)

Allows admins to regenerate existing articles with full content:

```rust
#[update]
async fn regenerate_article(
    article_id: u64,
    persona: Option<ArticlePersona>,
    topic: Option<String>,
) -> Result<NewsArticle, String> {
    // Get existing article
    let existing = ARTICLES.with(|a| a.borrow().get(&StorableU64(article_id)));
    
    // Use existing persona/topic if not provided
    let persona_to_use = persona.unwrap_or_else(|| {
        existing.map(|a| a.author_persona.clone()).unwrap_or(ArticlePersona::Raven)
    });
    
    let topic_to_use = topic.or_else(|| {
        existing.map(|a| Some(a.title.clone())).flatten()
    });
    
    // Generate new article
    let new_article = generate_daily_article_internal(persona_to_use, topic_to_use).await?;
    
    // Update existing article (preserve ID, views, likes, shares)
    let updated = NewsArticle {
        id: article_id,  // ✅ Preserve ID
        // ... new content
        views: existing.map(|a| a.views).unwrap_or(0),  // ✅ Preserve views
        likes: existing.map(|a| a.likes).unwrap_or(0),  // ✅ Preserve likes
        shares: existing.map(|a| a.shares).unwrap_or(0),  // ✅ Preserve shares
        // ...
    };
    
    // Store updated article
    ARTICLES.with(|a| {
        a.borrow_mut().insert(StorableU64(article_id), updated.clone());
    });
    
    Ok(updated)
}
```

**Use Cases:**
- Regenerate short articles with full content
- Update articles with new information
- Fix formatting issues
- Improve SEO metadata

---

## 📈 Consistency Mechanisms

### 1. **Standardized Prompts**
- Same detailed prompt for all articles
- Persona-specific system prompts
- Consistent structure requirements

### 2. **Automated SEO**
- All SEO metadata generated automatically
- No manual intervention needed
- Consistent format across all articles

### 3. **Quality Validation**
- Word count validation (warns if < 500 words)
- Title extraction validation
- Excerpt length validation (150-160 chars)

### 4. **Daily Schedule**
- Heartbeat ensures daily generation
- Prevents duplicate generation (24-hour check)
- Consistent timing

### 5. **On-Chain Storage**
- Immutable articles (can't be modified accidentally)
- Permanent storage (survives upgrades)
- Transparent (verifiable)

---

## 🔍 SEO Best Practices Implemented

### ✅ Title Tags
- 60 characters max
- Primary keyword included
- Compelling and click-worthy

### ✅ Meta Descriptions
- 150-160 characters
- Includes primary keyword
- Compelling summary

### ✅ Keywords
- 5-10 relevant keywords
- Natural integration
- Category-specific

### ✅ URL Structure
- SEO-friendly slugs
- Contains keywords
- Readable

### ✅ Content Quality
- 1000+ words (comprehensive)
- Proper heading hierarchy
- Natural keyword integration
- Internal/external links

### ✅ Structured Data
- Markdown formatting
- Proper H2/H3 hierarchy
- Lists and formatting

---

## 💰 Performance & Costs

### Latency:
- **Perplexity query**: ~2-5 seconds
- **Hugging Face generation**: ~10-30 seconds (3000 tokens)
- **Total pipeline**: ~15-40 seconds per article

### Cycles Cost:
- **Perplexity HTTP outcall**: ~50B cycles
- **Hugging Face HTTP outcall**: ~50B cycles
- **Total per article**: ~100B cycles
- **Daily (3 articles)**: ~300B cycles

### Storage:
- Each article: ~5-10 KB (markdown content)
- 3 articles/day: ~15-30 KB/day
- 1 year: ~5-11 MB

---

## 🎯 Summary

The Raven News pipeline ensures **consistent, SEO-optimized trending articles** through:

1. **Real-time research** (Perplexity) for current trending topics
2. **Advanced generation** (Hugging Face) for high-quality content
3. **Automated SEO** (title, description, keywords, slug)
4. **Structured content** (1000+ words, proper headings)
5. **Daily automation** (heartbeat generates 3 articles/day)
6. **On-chain storage** (immutable, permanent)

**Result**: Every article is:
- ✅ SEO-optimized (title, description, keywords)
- ✅ Trending (Perplexity ensures current topics)
- ✅ High-quality (1000+ words, well-structured)
- ✅ Consistent (same pipeline, same quality)
- ✅ Permanent (on-chain, immutable)

