# Raven Unified Ecosystem — Mainnet Release Gate

Use this checklist before every mainnet deployment / upgrade.

## 1) Config sanity

- Confirm canister IDs match:
  - `raven-unified-ecosystem/frontend/src/services/canisterConfig.ts`
  - `raven-unified-ecosystem/canister_ids.json`
- Confirm `getICHost()` returns `https://ic0.app` on mainnet.

## 2) Build + declarations

- From `raven-unified-ecosystem/frontend`:
  - `npm run build` (build should succeed even if `tsc` warnings exist)
- From repo root:
  - `dfx generate` (if you are regenerating declarations)

## 3) Canister reachability (pre-flight)

- Run:
  - `node raven-unified-ecosystem/mainnet_health_check.mjs`
- Expected: all listed canisters return `OK` (or their expected health string).

## 4) Auth invariants

- Connect via **II/NFID** and refresh: principal persists
- Connect via **Plug/OISY** and refresh: principal persists
- Ensure **external wallets do not replace the ICP principal**:
  - Phantom + Sui are linked wallets stored in KIP (`WALLET_LINKING_SPEC.md`)

## 5) E2E matrix

- Execute `raven-unified-ecosystem/MAINNET_TEST_MATRIX.md` once on desktop and once on mobile viewport.

## 6) Rollback readiness

- Confirm you have:
  - previous wasm artifacts for critical canisters
  - controller access for the deployment principal(s)
  - cycles balance sufficient for any canister creation/upgrades


