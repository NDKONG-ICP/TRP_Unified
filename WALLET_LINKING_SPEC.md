# Wallet Linking Spec (Raven Unified Ecosystem)

This document defines the **canonical** way to link external wallets (Solana/Phantom and Sui) to a user’s **IC principal** via the Raven `kip` canister.

## Canonical identity model

- **Canonical account key**: IC **principal** (the caller of `kip` methods).
- **External wallets** (Phantom/Sui) are **linked** via signature challenges.
- External wallets are **not** used as direct IC-call identities.

## Backend API (KIP)

Implemented in:

- `raven-unified-ecosystem/backend/kip/src/lib.rs`
- Interface: `raven-unified-ecosystem/backend/kip/kip.did`

### Methods

- `start_link_wallet(kind: text) -> WalletLinkResult`
  - `kind`: `"phantom"` or `"sui"`
  - returns `WalletLinkChallenge { kind, issued_at, expires_at, payload }`

- `confirm_link_wallet(payload: LinkPayload, signature: text) -> variant { Ok; Err: text }`
  - verifies signature and stores address under caller principal

- `get_my_linked_wallets() -> opt LinkedWallets`
- `get_linked_wallets(principal) -> opt LinkedWallets`

### Types

- `LinkedWallets`
  - `solana_pubkeys: vec text`
  - `sui_addresses: vec text`
  - `evm_addresses: vec text` (reserved)

**Important note (Sui)**: current SIS/Sui verification logic in this ecosystem treats the “address” field as a **32-byte Ed25519 public key** (encoded as base58 or `0x` hex). If your Sui wallet provider returns a separate `publicKey`, prefer that.

## Message format (must match canister verification)

KIP uses the same message formatting as `siws_canister`/`sis_canister`:

- Solana:
  - `"${domain} wants you to sign in with your Solana account:"`
- Sui:
  - `"${domain} wants you to sign in with your Sui account:"`

The message is then appended with:

- `address`
- optional `statement` (KIP sets this to include the caller principal)
- `URI`, `Version`, `Chain ID`, `Nonce`, `Issued At` (+ optional fields)

Frontends should **sign the exact formatted string** derived from the challenge payload.

## Signature encoding rules

KIP verification accepts:

- **base58** signature (preferred), or
- **`0x` prefixed hex** signature

Frontends should:

- Phantom: `Uint8Array` signature → base58
- Sui: if wallet returns base64 signature string → decode base64 to bytes → base58 encode

## UI entrypoints

- Profile linking UI: `raven-unified-ecosystem/frontend/src/pages/profile/ProfilePage.tsx`
- Wallet modal linking: `raven-unified-ecosystem/frontend/src/components/wallet/WalletConnect.tsx`


