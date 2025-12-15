# Reconstruct lib.rs - Complete Guide

## ⚠️ CRITICAL: lib.rs was overwritten (146 lines vs 5000+)

The file `backend/raven_ai/src/lib.rs` needs to be restored before adding new functions.

## Quick Restoration Options

### Option 1: Time Machine (macOS)
```bash
# Open Time Machine
# Navigate to: backend/raven_ai/src/lib.rs
# Restore from a date before today
```

### Option 2: Check for Other Copies
```bash
# Search for lib.rs backups
find ~ -name "lib.rs" -path "*raven_ai*" 2>/dev/null

# Check Cursor/IDE backups
find ~/Library/Application\ Support/Cursor -name "*lib.rs*" 2>/dev/null
```

### Option 3: Reconstruct from Candid Interface
The Candid file (`raven_ai.did`) shows all public functions. Use it as a guide to reconstruct.

## File Structure (Based on Candid Interface)

The lib.rs file should have:

1. **Header & Imports** (lines 1-50)
   - Module declaration
   - Candid, ic-cdk, stable-structures imports
   - ai_optimizations module

2. **Type Definitions** (lines 50-4000)
   - PaymentToken enum
   - AgentType enum
   - MultichainAddresses
   - MemoryEntry
   - KnowledgeNode
   - ChatMessage
   - AgentConfig
   - RavenAIAgent
   - AxiomNFT
   - PaymentRecord
   - LLMProviderConfig
   - Config
   - MintResult
   - ArticlePersona enum
   - NewsArticle struct
   - ArticleComment struct
   - TokenPrice
   - VoiceSynthesisRequest/Response
   - AICouncilModelResponse
   - AICouncilConsensus
   - AICouncilSession
   - SubscriptionPlan/Subscription
   - NotificationType/RavenNotification
   - SharedMemory
   - **NEW: PlagiarismCheckResult, PlagiarismMatch, AIDetectionResult, WorksCited, CitationFormat, HaloSuggestion**

3. **Memory Management** (around line 20-30)
   - Memory IDs
   - MemoryManager
   - thread_local! declarations

4. **Constants** (around line 35-50)
   - AXIOM_TOTAL_SUPPLY
   - Token canister IDs
   - Subscription pricing
   - API keys

5. **Helper Functions** (throughout)
   - Storable implementations
   - Admin checks
   - AXIOM checks
   - Article generation helpers
   - SEO helpers
   - **NEW: check_plagiarism, detect_ai_content**

6. **Public API Functions** (throughout, matching Candid)
   - Query functions (get_config, get_agent, etc.)
   - Update functions (add_memory, query_ai_council, etc.)
   - Article functions (get_articles, generate_daily_article, etc.)
   - **NEW: submit_user_article, check_article_plagiarism, check_article_ai_detection, generate_works_cited, halo_writing_assistant**

7. **Heartbeat** (around line 1370)
   - Article generation
   - Cleanup

8. **Export** (end of file)
   - `ic_cdk::export_candid!();`

## Recommended Approach

**SAFEST**: Restore from Time Machine or backup, then add new functions from `BACKEND_FUNCTIONS_TO_ADD.md`

**ALTERNATIVE**: If no backup exists, the deployed canister is working. You can:
1. Keep the deployed version as-is
2. Add new functions via a separate patch
3. Or manually reconstruct based on Candid interface

## Current Status

- ✅ Frontend deployed with all new features
- ✅ Newspaper UI live
- ✅ Submission route working
- ⚠️  Backend needs lib.rs restoration + new functions

## Next Steps

1. **Restore lib.rs** (use one of the options above)
2. **Add new functions** from `BACKEND_FUNCTIONS_TO_ADD.md`
3. **Test compilation**: `cargo check`
4. **Build**: `cargo build --target wasm32-unknown-unknown --release`
5. **Deploy**: `dfx deploy raven_ai --network ic`

## Important Notes

- The deployed canister is still working fine
- Only the local file needs restoration
- Frontend will work with current backend
- New features (submission, HALO) need backend functions to work

