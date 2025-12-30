# Raven Unified Ecosystem — Mainnet Test Matrix (E2E)

This is the end-to-end **mainnet** verification checklist for the unified SPA (`raven-unified-ecosystem/frontend`). It is designed to confirm **principal consistency**, **correct canister wiring**, and **critical user journeys** across every product surface.

Prerequisites:

- App is deployed to IC mainnet and reachable (e.g. `*.ic0.app` / `*.icp0.io`)
- You can connect with at least one ICP wallet (II/NFID/Plug/OISY)
- Optional: Phantom + Sui wallet installed for linking tests

Reference:

- Route → service → canister mapping: `raven-unified-ecosystem/MAINNET_TRUTH_TABLE.md`

## Global invariants (must hold everywhere)

For every authenticated action across the app:

1. **Canonical principal**: the principal shown in UI is the same principal used in canister calls.
2. **No “hidden auth”**: services do not silently create new sessions; they use the unified session/agent.
3. **Host + canister IDs**: calls use `https://ic0.app` and canister IDs from `frontend/src/services/canisterConfig.ts`.

## Auth & session flows

### A1 — Internet Identity / NFID (delegation)

- Open the app → Connect wallet (IdentityKit UI)
- Expected:
  - principal appears in header/profile
  - refresh the page: principal persists (delegation still valid)
  - logout clears principal

### A2 — Plug / OISY

- Connect via Plug and/or OISY
- Expected:
  - wallet connection persists across refresh (Plug) if supported
  - principal is consistent across pages

### A3 — Linked wallets (Phantom + Sui)

Go to **Profile** and link:

- Link Phantom (Solana)
  - Expected:
    - challenge created by `kip.start_link_wallet("phantom")`
    - Phantom signs message
    - `kip.confirm_link_wallet(...)` succeeds
    - Profile shows Solana linked (checkmark)

- Link Sui
  - Expected:
    - challenge created by `kip.start_link_wallet("sui")`
    - Sui wallet signs message
    - `kip.confirm_link_wallet(...)` succeeds
    - Profile shows Sui linked (checkmark)

Spec: `raven-unified-ecosystem/WALLET_LINKING_SPEC.md`

## Product surfaces

### P1 — Raven News (`/news/*`)

- Anonymous browse
  - Open `/news`, view article list, open an article
  - Expected: loads without login
- Authenticated actions
  - Connect ICP wallet
  - Submit/like/comment (as available in UI)
  - Expected: author principal attribution uses your canonical principal
- HALO integration
  - Use HALO suggestion feature from news flow (where present)
  - Expected: HALO results return successfully and are stable across refresh

### P2 — HALO (`/halo`)

- Open `/halo`
- Run core feature (upload/input → analysis)
- Expected:
  - correct rendering of results
  - error states are user-friendly on failure

### P3 — Raven AI / AXIOM (`/raven-ai/*`, `/axiom/*`)

- Open Raven AI, start chat
- Check agent memory persistence (refresh)
- AXIOM:
  - view genesis collection pages
  - mint flow (if enabled)
- Expected:
  - principal is consistent for chat/mint
  - admin-only actions are gated (if you’re not admin, you can’t run them)

### P4 — Expresso Logistics (`/expresso/*`)

- Open `/expresso/loads`
  - Expected: loads list renders
- Open `/expresso/tracking`
  - track a known ID (or verify “not found” message)
- Expected:
  - no crashes
  - authenticated calls (my loads / posting) require login

### P5 — IC SPICY (`/ic-spicy/*`)

- Browse farm stats + shop
- (If enabled) place an order / initiate checkout
- ICPay:
  - Verify checkout returns a success payload and UI handles it
- Expected:
  - canister calls succeed with correct principal

### P6 — The Forge (`/forge/*`)

- Go to `/forge/mint`
  - Mint 1 (if enabled)
- Go to `/forge/wallet`
  - Verify minted token appears under same principal
- Expected:
  - no per-call AuthClient sessions (mint/wallet should use the unified session)

### P7 — Sk8 Punks (`/sk8-punks/*`)

- Load NFT list (requires connected principal)
- Stake/unstake (if enabled)
- Play game (score updates)
- Leaderboards load
- Expected:
  - staking and rewards calls are principal-bound
  - no stale identity issues

### P8 — Crossword Quest (`/crossword/*`)

- Generate puzzle
- Enter answers and verify
- Rewards (if enabled) accrue to principal

## Post-test capture (for mainnet sign-off)

For each failing case, record:

- route
- action
- principal
- canister ID
- error text
- screenshot + console log excerpt

Recommended: run the full matrix once on desktop and once on mobile viewport.


