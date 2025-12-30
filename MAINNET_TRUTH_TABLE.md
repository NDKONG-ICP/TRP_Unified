# Raven Unified Ecosystem — Mainnet “Truth Table” (Route → Services → Canisters)

This file is the single checklist for verifying that **every route in the unified SPA** uses the **same canonical IC principal** and the correct **mainnet canister IDs**.

## Canonical config

- **Canister registry**: `raven-unified-ecosystem/frontend/src/services/canisterConfig.ts`
- **Mainnet host**: `https://ic0.app` (from `getICHost()` in `canisterConfig.ts`)

## Route mapping (SPA)

### Core landing

- **`/`** → `LandingPage`
  - **Services**: `marketplaceService`, `ravenAICanisterService` (stats), `tokenService` (balances)
  - **Canisters**: `raven_ai`, `assets`, token ledgers (`ICP_LEDGER_CANISTER_ID`, `CK_TOKEN_CANISTERS`, HARLEE/RAVEN ledgers)
  - **Auth**: optional (read-only without login)

### Raven News + HALO

- **`/news/*`** → `NewsPage`
  - **Services**: `newsService` → Raven AI canister methods (articles/comments + HALO suggestions)
  - **Canisters**: `raven_ai`
  - **Auth**: browse anonymous; submit/edit requires principal

- **`/halo`** → `HALOPage`
  - **Services**: `newsService.getHaloSuggestions(...)` and/or HALO components
  - **Canisters**: `raven_ai` (HALO assistant endpoints)
  - **Auth**: optional (depends on canister rules; verify)

### Raven AI + AXIOM

- **`/raven-ai/*`**, **`/axiom/*`** → `RavenAIPage`
  - **Services**: `ravenAIService`, `ravenAICanisterService`, `marketplaceService`
  - **Canisters**: `raven_ai`, `ai_engine`, `queen_bee`, `axiom_nft`, `axiom_1..axiom_5` (genesis), `vector_db`
  - **Auth**: required for chat persistence, minting, admin actions

- **`/axiom-agent/:agentId`** → `AxiomAgentPage`
  - **Services**: `ravenAICanisterService` (agent fetch/chat)
  - **Canisters**: `raven_ai`, `vector_db` (if used)
  - **Auth**: required for personalization / private state

- **`/axiom-collection`**, **`/axiom/:id`**
  - **Services**: `axiomService`, `marketplaceService`, `ravenAICanisterService`
  - **Canisters**: `axiom_nft`, `axiom_1..axiom_5`, `raven_ai`
  - **Auth**: mint/buy requires principal

### Expresso Logistics

- **`/expresso/*`** → `ExpressoPage`
  - **Services**: `logisticsService`
  - **Canisters**: `logistics`, (optionally `escrow`, `nft` for shipment NFTs, `kip` for verification)
  - **Auth**: required for “my loads”, bids, and any write calls; read-only load browse may be allowed

### IC SPICY + Forge

- **`/ic-spicy/*`** and **`/spicy/*`** → `ICSpicyPage`
  - **Services**: `icSpicyService`, `treasuryService`, `tokenService`, ICPay widget integration
  - **Canisters**: `icspicy`, `treasury`, `escrow`, token ledgers, `assets`
  - **Auth**: required for purchases/orders/minting; browse may be anonymous

- **`/forge/*`** → `ForgePage`
  - **Services**: `icSpicyMintService` (Forge mint + wallet view), `createNFTActor` (collection stats)
  - **Canisters**: `nft` (Forge minting), `assets`
  - **Auth**: mint + “my NFTs” require principal
  - **Known risk**: some Forge services create their own `AuthClient` per call; must be unified to shared principal

### Sk8 Punks (staking + game)

- **`/sk8-punks/*`** → `Sk8PunksPage`
  - **Services**: `Sk8PunksService` (collection), `StakingService` (staking), `gameStatsService`, `tokenService`
  - **Canisters**: `staking` (mainnet), Sk8 Punks collection `b4mk6-5qaaa-aaaah-arerq-cai` (EXT), token ledgers
  - **Auth**: required for staking, claiming, leaderboard personalization

### Crossword Quest

- **`/crossword/*`** → `CrosswordPage`
  - **Services**: `CrosswordService`, `tokenService`
  - **Canisters**: crossword backend canister(s) (verify in `CrosswordService`), token ledgers
  - **Auth**: required for streak/progress persistence and rewards

### User/Admin

- **`/wallet`** → main wallet dashboard
  - **Services**: `walletStore`, `tokenService`, collection services
  - **Canisters**: token ledgers, collection canisters

- **`/profile`** → profile/onboarding
  - **Services**: `authStore.completeOnboarding`, `kip` profile integration (verify)
  - **Canisters**: `kip`

- **`/admin/*`** → admin dashboard
  - **Services**: multiple; verify principal allowlist checks
  - **Canisters**: `raven_ai`, `axiom_*`, `icspicy`, and others used by admin actions

## Mainnet verification checklist (per route)

For each route above, verify:

1. **Principal consistency**: the principal displayed in UI matches the principal used in canister calls.
2. **No hidden sessions**: no per-service `AuthClient.create()` leading to a different principal than the global session.
3. **Correct canister IDs**: match `frontend/src/services/canisterConfig.ts`.
4. **Correct host**: calls go to `https://ic0.app` (or explicitly documented exceptions).
5. **Error handling**: user-visible errors are actionable (not just console logs).


