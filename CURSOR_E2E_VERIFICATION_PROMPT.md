# Cursor E2E Verification Prompt for The Raven Project

Use this prompt to verify that the entire Raven Unified Ecosystem is working correctly end-to-end on IC mainnet.

---

## 🔍 VERIFICATION PROMPT

```
I need you to perform a comprehensive end-to-end verification of The Raven Project unified ecosystem deployed on IC mainnet.

**Frontend URL:** https://3kpgg-eaaaa-aaaao-a4xdq-cai.icp0.io/

**Core Canisters:**
- raven_ai: 3noas-jyaaa-aaaao-a4xda-cai
- kip: 3yjr7-iqaaa-aaaao-a4xaq-cai
- treasury: 3rk2d-6yaaa-aaaao-a4xba-cai
- nft: 37ixl-fiaaa-aaaao-a4xaa-cai
- staking: inutw-jiaaa-aaaao-a4yja-cai
- queen_bee: k6lqw-bqaaa-aaaao-a4yhq-cai
- logistics: 3dmn2-siaaa-aaaao-a4xca-cai

**Verify each feature systematically:**

### 1. Authentication & Wallet Connection
- [ ] Navigate to https://3kpgg-eaaaa-aaaao-a4xdq-cai.icp0.io/
- [ ] Verify landing page loads with proper styling (not broken CSS)
- [ ] Click "Connect Wallet" button
- [ ] Test Internet Identity login flow
- [ ] Confirm principal displays after login
- [ ] Verify balance loading for ICP and HARLEE tokens
- [ ] Test logout and session persistence on refresh

### 2. Demo Mode (Unauthenticated)
- [ ] Without logging in, click the RavenAI chatbot bubble (bottom right)
- [ ] Send a test message like "What is The Raven Project?"
- [ ] Verify animated AI Council visualization appears
- [ ] Confirm demo message counter shows (e.g., "4/5 demo messages")
- [ ] Exhaust demo messages and verify rate limit modal appears
- [ ] Check that modal offers wallet connection option

### 3. Raven News (/news)
- [ ] Navigate to /news
- [ ] Verify articles load and display
- [ ] Check article cards have proper formatting
- [ ] Test article detail view by clicking an article
- [ ] Verify HARLEE reward display for engagement

### 4. HALO Academic Assistant (/halo)
- [ ] Navigate to /halo
- [ ] Verify HALO upload interface loads
- [ ] Test document upload (if authenticated)
- [ ] Check plagiarism and grammar check UI components

### 5. RavenAI (/raven-ai)
- [ ] Navigate to /raven-ai
- [ ] Verify AI agent interface loads
- [ ] Test chat functionality
- [ ] Toggle voice synthesis (uses browser TTS as fallback)
- [ ] Verify AI Council visualization during responses

### 6. AXIOM Genesis NFTs (/axiom-collection)
- [ ] Navigate to /axiom-collection
- [ ] Verify AXIOM NFT cards display
- [ ] Check multichain address display (EVM, SOL, SUI)
- [ ] Test NFT detail view

### 7. Sk8 Punks Staking (/sk8-punks)
- [ ] Navigate to /sk8-punks
- [ ] Verify staking interface loads
- [ ] Check HARLEE reward calculations display
- [ ] Verify 100 HARLEE/week per staked NFT is shown

### 8. The Forge NFT Minter (/forge)
- [ ] Navigate to /forge
- [ ] Verify minting interface loads
- [ ] Check layer upload capability
- [ ] Test NFT generation preview

### 9. IC SPICY RWA Co-op (/ic-spicy)
- [ ] Navigate to /ic-spicy
- [ ] Verify farm stats display
- [ ] Check co-op membership UI
- [ ] Verify ICPay widget loads (if authenticated)

### 10. eXpresso Logistics (/expresso)
- [ ] Navigate to /expresso
- [ ] Verify logistics dashboard loads
- [ ] Check available loads display
- [ ] Test shipment tracking UI

### 11. Crossword Quest (/crossword)
- [ ] Navigate to /crossword
- [ ] Verify crossword puzzle loads
- [ ] Test puzzle interaction
- [ ] Check HARLEE reward display

### 12. Wallet & Profile
- [ ] Navigate to /wallet
- [ ] Verify token balances display (ICP, HARLEE, ckBTC, ckETH)
- [ ] Navigate to /profile
- [ ] Verify profile information displays
- [ ] Test wallet linking UI for external chains

### 13. Tokenomics (/tokenomics)
- [ ] Navigate to /tokenomics
- [ ] Verify tokenomics charts display
- [ ] Check HARLEE distribution breakdown
- [ ] Verify staking calculator works

### 14. Pitch Deck (/pitch)
- [ ] Navigate to /pitch
- [ ] Verify all slides load with animations
- [ ] Check navigation between slides
- [ ] Verify professional presentation quality

### 15. Admin Dashboard (/admin) - Admin Only
- [ ] Navigate to /admin (requires admin principal)
- [ ] Verify admin controls display
- [ ] Check API key configuration UI
- [ ] Verify canister management options

### 16. Console Verification
- [ ] Open browser DevTools (F12)
- [ ] Check Console tab for errors
- [ ] Verify no CORS errors on mainnet
- [ ] Confirm no 401/403 authentication errors
- [ ] Check Network tab for successful canister calls

### 17. Mobile Responsiveness
- [ ] Test on mobile viewport (or DevTools mobile simulation)
- [ ] Verify navigation menu works
- [ ] Check touch interactions
- [ ] Confirm no horizontal overflow

**Report any issues found with:**
1. Route path
2. Error message (console or UI)
3. Expected vs actual behavior
4. Screenshots if applicable

**Success Criteria:**
- All routes load without 404 errors
- No JavaScript console errors blocking functionality
- Authentication flow works end-to-end
- Token balances display correctly after login
- AI features respond (with browser TTS fallback for voice)
- All major UI components render properly
```

---

## 🛠 QUICK FIXES PROMPT

If issues are found, use this follow-up prompt:

```
Based on the E2E verification, I found the following issues:

[PASTE ISSUES HERE]

Please investigate and fix each issue. For each:
1. Identify the root cause
2. Propose a solution
3. Implement the fix
4. Rebuild and redeploy to mainnet
5. Verify the fix works

Prioritize blocking issues (broken routes, auth failures) over cosmetic issues.
```

---

## 📊 CANISTER HEALTH CHECK

Run this command to verify all canisters are healthy:

```bash
cd "/Users/williambeck/The Forge NFT Minter/raven-unified-ecosystem"
source scripts/dfx_safe_env.sh

# Check core canister status
for canister in raven_ai kip treasury nft staking queen_bee logistics core escrow; do
  echo "=== $canister ===" 
  dfx canister status $canister --network ic 2>&1 | head -10
done
```

---

## 🔑 API KEY VERIFICATION

Verify API keys are configured on raven_ai:

```bash
dfx canister call raven_ai get_llm_providers '()' --network ic
```

Expected: HuggingFace and Perplexity-Sonar should show `enabled = true`

---

## 🎤 VOICE SYNTHESIS NOTE

**Important:** ElevenLabs voice synthesis via IC HTTP outcalls has a known limitation due to IC consensus requirements. Each replica receives different audio bytes, preventing consensus.

**Current Behavior:**
- Backend voice synthesis will fail with consensus error
- Frontend automatically falls back to browser's built-in speech synthesis (Web Speech API)
- Users still get voice output, just using browser TTS

**Future Solution:**
- Consider a server-side proxy for audio caching
- Or accept browser TTS as the primary voice solution

---

## 🚀 DEPLOYMENT CHECKLIST

Before any mainnet deployment:

- [ ] Run `npm run build` in frontend directory
- [ ] Copy `.ic-assets.json5` to `dist/` for SPA routing
- [ ] Source `scripts/dfx_safe_env.sh` to prevent dfx panics
- [ ] Deploy with `dfx deploy assets --network ic`
- [ ] Verify deployment at https://3kpgg-eaaaa-aaaao-a4xdq-cai.icp0.io/
- [ ] Test critical paths (auth, balances, navigation)
- [ ] Commit and push changes to GitHub

---

## 📝 KNOWN LIMITATIONS

1. **Voice Synthesis**: Uses browser TTS fallback due to IC consensus requirements
2. **CORS**: All external API calls must go through backend canisters
3. **Rate Limits**: Demo mode limited to 5 messages per hour
4. **Admin Features**: Require specific principal to be in admin list

---

*Generated for The Raven Project - IC Mainnet*
*Last Updated: December 30, 2024*

