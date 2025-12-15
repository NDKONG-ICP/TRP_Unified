# Backend Functions to Add to lib.rs

## ⚠️ CRITICAL: lib.rs was overwritten

The file `backend/raven_ai/src/lib.rs` was accidentally overwritten (146 lines instead of 5000+).

**DO NOT DEPLOY** until the file is restored and these functions are properly integrated.

## New Functions to Add

Add these functions to the **EXISTING** lib.rs file (after restoring it):

### 1. Types (add near other type definitions, around line 3800)

```rust
// Types for plagiarism and AI detection
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct PlagiarismCheckResult {
    pub score: u32, // 0-100, lower is better
    pub matches: Vec<PlagiarismMatch>,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct PlagiarismMatch {
    pub text: String,
    pub source_title: String,
    pub source_author: Option<String>,
    pub source_url: String,
    pub source_date: Option<String>,
    pub similarity: f32, // 0.0-1.0
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct AIDetectionResult {
    pub probability: f32, // 0.0-1.0, higher = more likely AI
    pub confidence: f32,
    pub indicators: Vec<String>,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct WorksCited {
    pub id: String,
    pub title: String,
    pub author: String,
    pub url: String,
    pub date: String,
    pub format: CitationFormat,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum CitationFormat {
    APA,
    MLA,
    Chicago,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct HaloSuggestion {
    pub suggestions: String,
    pub grammar_score: u32,
    pub clarity_score: u32,
    pub academic_score: u32,
    pub recommendations: Vec<String>,
}
```

### 2. Helper Functions (add after existing article functions, around line 4700)

```rust
/// Check plagiarism using external API
async fn check_plagiarism(content: &str) -> Result<PlagiarismCheckResult, String> {
    // TODO: Implement with actual plagiarism API (e.g., Copyscape, Grammarly API)
    // For now, return a mock result
    Ok(PlagiarismCheckResult {
        score: 5, // Low score = less plagiarism
        matches: vec![],
    })
}

/// Detect AI-generated content
async fn detect_ai_content(content: &str) -> Result<AIDetectionResult, String> {
    // TODO: Implement with AI detection API (e.g., GPTZero, Originality.ai)
    // For now, return mock result
    Ok(AIDetectionResult {
        probability: 0.3, // 30% chance of being AI
        confidence: 0.85,
        indicators: vec![],
    })
}
```

### 3. Public API Functions (add before `ic_cdk::export_candid!()`, around line 5170)

```rust
/// Submit user article with plagiarism and AI detection
#[update]
async fn submit_user_article(
    title: String,
    content: String,
    author_name: Option<String>,
) -> Result<u64, String> {
    let caller = ic_cdk::caller();
    
    if caller == Principal::anonymous() {
        return Err("Authentication required".to_string());
    }
    
    // Check plagiarism
    let plagiarism_result = check_plagiarism(&content).await?;
    
    // Check AI detection
    let ai_result = detect_ai_content(&content).await?;
    
    // Generate article ID
    let article_id = NEXT_ARTICLE_ID.with(|id| {
        let current = *id.borrow();
        *id.borrow_mut() = current + 1;
        current
    });
    
    // Create article
    let slug = generate_slug(&title);
    let excerpt = if content.len() > 200 {
        content.chars().take(200).collect::<String>() + "..."
    } else {
        content.clone()
    };
    
    let article = NewsArticle {
        id: article_id,
        title: title.clone(),
        slug,
        excerpt,
        content,
        author_persona: ArticlePersona::Raven, // Default for user submissions
        category: "user-submitted".to_string(),
        tags: vec![],
        seo_title: title,
        seo_description: excerpt.clone(),
        seo_keywords: vec![],
        published_at: ic_cdk::api::time(),
        views: 0,
        likes: 0,
        shares: 0,
        harlee_rewards: 0,
        featured: false,
    };
    
    // Store article
    ARTICLES.with(|a| {
        a.borrow_mut().insert(StorableU64(article_id), article.clone());
    });
    
    ic_cdk::println!("User article {} submitted by {}", article_id, caller);
    
    Ok(article_id)
}

/// Check plagiarism for submitted article
#[update]
async fn check_article_plagiarism(content: String) -> Result<PlagiarismCheckResult, String> {
    check_plagiarism(&content).await
}

/// Check AI detection for submitted article
#[update]
async fn check_article_ai_detection(content: String) -> Result<AIDetectionResult, String> {
    detect_ai_content(&content).await
}

/// Generate works cited from plagiarism matches
#[update]
async fn generate_works_cited(matches: Vec<PlagiarismMatch>) -> Result<Vec<WorksCited>, String> {
    // Generate citations in APA/MLA/Chicago format
    let mut citations = Vec::new();
    
    for (idx, m) in matches.iter().enumerate() {
        citations.push(WorksCited {
            id: format!("cite-{}", idx),
            title: m.source_title.clone(),
            author: m.source_author.clone().unwrap_or_else(|| "Unknown".to_string()),
            url: m.source_url.clone(),
            date: m.source_date.clone().unwrap_or_else(|| "n.d.".to_string()),
            format: CitationFormat::APA,
        });
    }
    
    Ok(citations)
}

/// HALO Academic Writing Assistant - Get writing suggestions
#[update]
async fn halo_writing_assistant(
    content: String,
    writing_style: Option<String>, // "academic", "journalistic", "creative"
) -> Result<HaloSuggestion, String> {
    let caller = ic_cdk::caller();
    
    if caller == Principal::anonymous() {
        return Err("Authentication required".to_string());
    }
    
    // Use AI Council to analyze writing and provide suggestions
    let system_prompt = format!(
        "You are HALO, an academic writing assistant. Analyze this text and provide suggestions for:\n\
        1. Grammar and syntax improvements\n\
        2. Academic tone and formality\n\
        3. Clarity and conciseness\n\
        4. Citation recommendations\n\
        5. Structure and organization\n\n\
        Writing style: {}",
        writing_style.as_ref().unwrap_or(&"academic".to_string())
    );
    
    let query = format!(
        "Analyze this text and provide detailed writing suggestions:\n\n{}",
        content
    );
    
    // Query AI Council
    match query_ai_council(query, Some(system_prompt), vec![], None).await {
        Ok(session) => {
            let suggestion_text = session.consensus
                .map(|c| c.response)
                .unwrap_or_else(|| "No suggestions available".to_string());
            
            Ok(HaloSuggestion {
                suggestions: suggestion_text,
                grammar_score: 85, // Mock score - could be calculated from AI response
                clarity_score: 80,
                academic_score: 75,
                recommendations: vec![
                    "Consider adding more citations".to_string(),
                    "Improve paragraph transitions".to_string(),
                ],
            })
        }
        Err(e) => Err(format!("Failed to get HALO suggestions: {}", e)),
    }
}
```

## Steps to Restore

1. **Restore lib.rs from backup or deployed canister**
2. **Add the types** (around line 3800, with other NewsArticle types)
3. **Add helper functions** (around line 4700, after existing article functions)
4. **Add public API functions** (before `ic_cdk::export_candid!()`)
5. **Test compilation**: `cargo check`
6. **Build**: `cargo build --target wasm32-unknown-unknown --release`
7. **Deploy**: `dfx deploy raven_ai --network ic`

## Frontend Integration

The frontend is already updated to call these functions:
- `newsService.submitArticle()`
- `newsService.checkPlagiarism()`
- `newsService.checkAIDetection()`
- `newsService.generateWorksCited()`
- `newsService.getHaloSuggestions()`

## Current Status

- ✅ Frontend components created
- ✅ Frontend service methods added
- ✅ Route `/news/submit` added
- ✅ NewspaperLayout integrated
- ⚠️  Backend lib.rs needs restoration + function addition

