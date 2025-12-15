# Multi-Chain Wallet & Authentication Implementation Plan

## Executive Summary

**Current Status**: ✅ ICP Native Wallets (II, Plug, OISY) | ❌ External Chains (Ethereum, Solana, Bitcoin, Sui)

**Goal**: Implement comprehensive multi-chain authentication supporting Ethereum, Solana, Bitcoin, and Sui via Sign-In-With-X protocols.

**Timeline**: Phased implementation over 3 phases

---

## Phase 1: Foundation (Priority: HIGH) - Week 1-2

### 1.1 Complete IdentityKit Integration
**Status**: ⚠️ Partial
**Files**: `frontend/src/services/identityKitService.ts`
**Tasks**:
- [ ] Review and complete IdentityKit integration
- [ ] Test all wallet types through IdentityKit
- [ ] Add wallet switching functionality
- [ ] Implement persistence

### 1.2 Sign-In with Ethereum (SIWE)
**Status**: ❌ Missing
**Repos**: https://github.com/kristoferlund/ic-siwe
**Tasks**:
- [ ] Clone and review ic-siwe repo
- [ ] Create `backend/siwe_canister/` with Rust implementation
- [ ] Implement signature verification
- [ ] Create `frontend/src/services/auth/siwe.ts`
- [ ] Add MetaMask integration
- [ ] Map ETH addresses to ICP principals
- [ ] Test end-to-end flow

**Files to Create**:
```
backend/siwe_canister/
├── Cargo.toml
├── siwe_canister.did
└── src/lib.rs

frontend/src/services/auth/siwe.ts
frontend/src/services/wallets/ethereum.ts
```

### 1.3 MetaMask Integration
**Status**: ❌ Missing
**Tasks**:
- [ ] Install `ethers` or `web3` library
- [ ] Create `frontend/src/services/wallets/ethereum.ts`
- [ ] Implement connection flow
- [ ] Add transaction signing
- [ ] Integrate with SIWE
- [ ] Test balance queries

### 1.4 Sign-In with Solana (SIWS)
**Status**: ❌ Missing
**Repos**: https://github.com/kristoferlund/ic-siws
**Tasks**:
- [ ] Clone and review ic-siws repo
- [ ] Create `backend/siws_canister/`
- [ ] Implement Solana signature verification
- [ ] Create `frontend/src/services/auth/siws.ts`
- [ ] Add Phantom integration
- [ ] Map Solana addresses to ICP principals
- [ ] Test end-to-end flow

**Files to Create**:
```
backend/siws_canister/
├── Cargo.toml
├── siws_canister.did
└── src/lib.rs

frontend/src/services/auth/siws.ts
frontend/src/services/wallets/solana.ts
```

### 1.5 Phantom Wallet Integration
**Status**: ❌ Missing
**Tasks**:
- [ ] Install `@solana/web3.js` and wallet adapters
- [ ] Create `frontend/src/services/wallets/solana.ts`
- [ ] Implement connection flow
- [ ] Add transaction signing
- [ ] Integrate with SIWS
- [ ] Test balance queries

### 1.6 Solana RPC Integration
**Status**: ❌ Missing
**Repos**: https://github.com/dfinity/sol-rpc-canister
**Tasks**:
- [ ] Clone and review sol-rpc-canister
- [ ] Deploy Solana RPC canister
- [ ] Create `frontend/src/services/rpc/solana-rpc.ts`
- [ ] Implement RPC calls (balance, transactions)
- [ ] Add error handling
- [ ] Test RPC functionality

---

## Phase 2: Expansion (Priority: MEDIUM) - Week 3-4

### 2.1 Sign-In with Bitcoin (SIWB)
**Status**: ❌ Missing
**Repos**: https://github.com/AstroxNetwork/ic-siwb
**Tasks**:
- [ ] Clone and review ic-siwb repo
- [ ] Create `backend/siwb_canister/`
- [ ] Implement Bitcoin signature verification
- [ ] Create `frontend/src/services/auth/siwb.ts`
- [ ] Add Unisat/Xverse integration
- [ ] Map Bitcoin addresses to ICP principals
- [ ] Test end-to-end flow

### 2.2 Bitcoin Wallet Integration
**Status**: ❌ Missing
**Tasks**:
- [ ] Install Bitcoin libraries (`bitcoinjs-lib`, `@unisat/wallet-sdk`)
- [ ] Create `frontend/src/services/wallets/bitcoin.ts`
- [ ] Implement Unisat connection
- [ ] Implement Xverse connection
- [ ] Add transaction signing
- [ ] Test balance queries

### 2.3 Bitcoin RPC Integration
**Status**: ❌ Missing
**Tasks**:
- [ ] Create Bitcoin RPC canister (or use existing service)
- [ ] Create `frontend/src/services/rpc/bitcoin-rpc.ts`
- [ ] Implement RPC calls
- [ ] Add error handling
- [ ] Test RPC functionality

---

## Phase 3: Advanced (Priority: LOW) - Week 5-6

### 3.1 Sign-In with Sui (SIS)
**Status**: ❌ Missing
**Repos**: https://github.com/Talentum-id/ic_sis
**Tasks**:
- [ ] Clone and review ic_sis repo
- [ ] Create `backend/sis_canister/`
- [ ] Implement Sui signature verification
- [ ] Create `frontend/src/services/auth/sis.ts`
- [ ] Add Sui wallet integration
- [ ] Map Sui addresses to ICP principals
- [ ] Test end-to-end flow

### 3.2 Sui Wallet Integration
**Status**: ❌ Missing
**Tasks**:
- [ ] Install `@mysten/wallet-kit`
- [ ] Create `frontend/src/services/wallets/sui.ts`
- [ ] Implement connection flow
- [ ] Add transaction signing
- [ ] Test balance queries

### 3.3 Bitcoin Ordinals Support
**Status**: ❌ Missing
**Repos**: 
- https://github.com/sardariuss/ordinals_canister
- https://github.com/domwoe/inscription_canister
- https://github.com/octopus-network/ordinals-indexer
**Tasks**:
- [ ] Clone and review all ordinals repos
- [ ] Deploy ordinals canisters
- [ ] Create `frontend/src/services/ordinals/`
- [ ] Implement inscription display
- [ ] Add transfer functionality
- [ ] Test ordinals operations

---

## File Structure to Create

```
frontend/src/
├── services/
│   ├── auth/
│   │   ├── siwe.ts              # SIWE service
│   │   ├── siws.ts               # SIWS service
│   │   ├── siwb.ts               # SIWB service
│   │   ├── sis.ts                # SIS service
│   │   └── index.ts              # Unified auth service
│   ├── wallets/
│   │   ├── ethereum.ts           # MetaMask, WalletConnect
│   │   ├── solana.ts             # Phantom, Solflare
│   │   ├── bitcoin.ts            # Unisat, Xverse
│   │   ├── sui.ts                # Sui Wallet
│   │   └── icp.ts                # Plug, Stoic, NFID (existing)
│   ├── rpc/
│   │   ├── solana-rpc.ts         # Solana RPC calls
│   │   └── bitcoin-rpc.ts        # Bitcoin RPC calls
│   └── ordinals/
│       ├── inscriptions.ts       # Ordinals inscriptions
│       └── indexer.ts            # Ordinals queries

├── components/
│   ├── wallet/
│   │   ├── WalletConnect.tsx     # Multi-wallet modal
│   │   ├── WalletButton.tsx       # Connect button
│   │   └── WalletProfile.tsx      # Connected wallet UI
│   └── auth/
│       ├── AuthGuard.tsx          # Protected routes
│       └── SignInOptions.tsx      # Multi-chain signin

backend/
├── siwe_canister/                # SIWE backend
│   ├── Cargo.toml
│   ├── siwe_canister.did
│   └── src/lib.rs
├── siws_canister/                # SIWS backend
├── siwb_canister/                # SIWB backend
├── sis_canister/                 # SIS backend
└── ordinals_canister/            # Ordinals backend
```

---

## Dependencies to Install

### Frontend
```json
{
  "dependencies": {
    "@solana/web3.js": "^1.87.6",
    "@solana/wallet-adapter-react": "^0.15.35",
    "@solana/wallet-adapter-react-ui": "^0.9.35",
    "@solana/wallet-adapter-wallets": "^0.19.32",
    "ethers": "^6.9.0",
    "@unisat/wallet-sdk": "^1.0.0",
    "@mysten/wallet-kit": "^0.5.0",
    "bitcoinjs-lib": "^6.1.5"
  }
}
```

### Backend
- Standard Rust dependencies for each canister
- Cryptographic libraries for signature verification
- CANDID for interface definitions

---

## Implementation Checklist

### Authentication Flow
- [ ] User clicks "Connect Wallet"
- [ ] Modal shows all wallet options (all chains)
- [ ] User selects wallet type
- [ ] Wallet connects and requests signature
- [ ] Backend verifies signature
- [ ] Principal/address mapping stored
- [ ] User authenticated across all chains
- [ ] Session persists on refresh

### Multi-Chain State Management
- [ ] Track connected wallets per chain
- [ ] Store principal mappings
- [ ] Handle multi-wallet scenarios
- [ ] Support wallet switching
- [ ] Persist auth state
- [ ] Handle disconnection

### Error Handling
- [ ] Wallet not installed
- [ ] User rejects connection
- [ ] Signature verification fails
- [ ] Network errors
- [ ] Timeout errors
- [ ] Display user-friendly messages

### Testing Requirements
- [ ] Test each wallet connection
- [ ] Test each Sign-In-With-X flow
- [ ] Test wallet switching
- [ ] Test session persistence
- [ ] Test on mobile
- [ ] Test error scenarios

---

## Next Steps

1. **Start with Phase 1.1**: Complete IdentityKit integration
2. **Implement SIWE**: Highest priority external chain
3. **Add MetaMask**: Most popular Ethereum wallet
4. **Implement SIWS**: High demand Solana support
5. **Add Phantom**: Most popular Solana wallet
6. **Continue with remaining features**

---

**Status**: Ready to begin implementation
**First Task**: Complete IdentityKit integration and start SIWE implementation

