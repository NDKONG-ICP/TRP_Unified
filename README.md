# The Raven Project - Unified Web3 Ecosystem

<div align="center">

![Raven Logo](frontend/src/trplogo.jpg)

**The Most Comprehensive Decentralized Ecosystem on Internet Computer**

[![Deployed](https://img.shields.io/badge/Status-Production%20Ready-success)](https://3kpgg-eaaaa-aaaao-a4xdq-cai.icp0.io)
[![ICP](https://img.shields.io/badge/Built%20on-Internet%20Computer-blue)](https://internetcomputer.org)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

[Live Platform](https://3kpgg-eaaaa-aaaao-a4xdq-cai.icp0.io) • [Documentation](#documentation) • [Features](#features) • [Deployment](#deployment)

</div>

---

## 🌟 Overview

The Raven Project is a production-ready, unified Web3 ecosystem built entirely on the Internet Computer Protocol (ICP). It seamlessly integrates multiple decentralized applications, AI-powered services, gaming platforms, and real-world asset tokenization into a single, cohesive experience.

### Key Highlights

- ✅ **Fully Deployed** - All components live on mainnet
- ✅ **Zero Gas Fees** - Transactions cost fractions of a cent
- ✅ **On-Chain AI** - First platform with native LLM inference
- ✅ **Multi-Chain** - True cross-chain NFT support via Chain Fusion
- ✅ **Production Ready** - Real users, real transactions, real value

---

## 🎯 Platform Components

### 🔨 The Forge - Multi-Chain NFT Platform
Advanced NFT minting and management with:
- Multi-chain deployment (ICP, Ethereum, Solana, Bitcoin)
- Full standards compliance (ICRC-7, EXT, ERC-721, ERC-1155)
- Generative art engine with rarity scoring
- QR code claiming system
- Real-world asset integration

### 🚚 eXpresso Logistics - Decentralized Freight Platform
AI-powered logistics management featuring:
- Load posting and bidding marketplace
- KIP-verified driver system
- NFT-based payment escrow
- Real-time shipment tracking
- AI route optimization
- ASE service manuals

### 📰 Raven News - Automated Content Platform
Decentralized news generation with:
- AI-generated SEO-optimized articles
- Three distinct AI personas (Raven, Harlee, Macho)
- Automated daily publishing
- Community engagement (comments, likes, shares)
- HARLEE token rewards

### 🛹 Raven Sk8 Punks - Play-to-Earn Gaming
2D skateboarding game with:
- NFT staking for rewards
- On-chain score persistence
- Competitive leaderboards
- EXT standard NFT collection

### 🧩 Crossword Quest - AI Gaming
Daily AI-generated puzzles with:
- Backend AI puzzle generation
- HARLEE token rewards
- Progressive difficulty
- Achievement system

### 🤖 AXIOM AI Agents - Personalized AI NFTs
Revolutionary AI agent NFTs featuring:
- 5 genesis agents with unique personalities
- Document upload for custom knowledge bases
- Persistent memory systems
- Knowledge graph storage
- Multi-chain contract addresses

### 🌶️ IC SPICY RWA Co-op
Real-world asset tokenization:
- Tokenized pepper farming co-op
- Real-time farm statistics
- SpicyAI farming assistant
- E-commerce integration
- Florida registered nursery

---

## 🏗️ Architecture

### Backend (Rust Canisters)

```
raven-unified-ecosystem/
├── backend/
│   ├── core/              # User management, authentication
│   ├── nft/               # ICRC-7/ICRC-37 NFT standard
│   ├── kip/               # Know-Your-Identity Provider
│   ├── treasury/          # Platform fee collection
│   ├── escrow/            # NFT-based escrow
│   ├── logistics/         # Load management, tracking
│   ├── ai_engine/         # LLM orchestration, AI Council
│   ├── raven_ai/          # News generation, AXIOM agents
│   ├── deepseek_model/    # On-chain LLM inference
│   ├── vector_db/         # Semantic search, embeddings
│   ├── queen_bee/         # AI pipeline orchestrator
│   └── staking/           # NFT staking, rewards
```

### Frontend (React + TypeScript)

- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with custom design system
- **State**: Zustand for state management
- **Animation**: Framer Motion
- **i18n**: Multi-language support (10+ languages)
- **Wallets**: Internet Identity, Plug, OISY, NFID

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Rust 1.70+
- DFX 0.29+
- wasm32-unknown-unknown target

### Installation

```bash
# Clone the repository
git clone https://github.com/NDKONG-ICP/raven-unified-ecosystem.git
cd raven-unified-ecosystem

# Install frontend dependencies
cd frontend
npm install
cd ..

# Install Rust dependencies (handled automatically by Cargo)
```

### Local Development

```bash
# Start local replica
dfx start --background

# Deploy all canisters
dfx deploy

# Access frontend
open http://[assets-canister-id].localhost:4943
```

### Mainnet Deployment

```bash
# Set network to mainnet
export DFX_NETWORK=ic

# Deploy to mainnet
dfx deploy --network ic

# Or use deployment script
./scripts/deploy_mainnet.sh
```

---

## 📚 Documentation

### Core Documentation

- [Project Description](PROJECT_DESCRIPTION.md) - Comprehensive platform overview
- [Pitch Deck](PITCH_DECK.md) - Investor and partner presentation
- [Whitepaper](docs/WHITEPAPER.md) - Technical deep dive

### Component Documentation

- [AI Architecture](DEEPSEEK_R1_ARCHITECTURE.md) - On-chain AI implementation
- [Deployment Guide](DEPLOYMENT_COMPLETE.md) - Mainnet deployment instructions
- [API Reference](docs/API.md) - Canister interface documentation

---

## 🔐 Security

### Security Features

- **Internet Identity** - Passwordless authentication
- **Rate Limiting** - Protection against abuse
- **Input Validation** - Comprehensive validation on all endpoints
- **Role-Based Access** - Admin, User, Driver, Shipper, Warehouse roles
- **KYC Verification** - Document verification for drivers
- **Escrow Protection** - Secure payment handling

### Best Practices

- All canisters use stable memory for data persistence
- Comprehensive error handling
- Input sanitization
- Rate limiting on sensitive endpoints
- Admin-only functions properly protected

---

## 🎨 Design System

### Theme

- **Primary Colors**: Black (#000000), Gold (#FFD700), Silver (#C0C0C0)
- **Typography**: Playfair Display (headings), Inter (body), JetBrains Mono (code)
- **Effects**: Glassmorphism, gold gradients, animated particles
- **Responsive**: Mobile-first design, works on all screen sizes

### UI Components

- Glassmorphic cards and modals
- Animated transitions
- Loading states and error handling
- Responsive navigation
- Multi-language support

---

## 🔗 Links

- **Live Platform**: https://3kpgg-eaaaa-aaaao-a4xdq-cai.icp0.io
- **GitHub**: https://github.com/NDKONG-ICP
- **Twitter**: https://x.com/icspicyrwa
- **OpenChat**: https://oc.app/community/tc7su-iqaaa-aaaaf-bifhq-cai

---

## 📊 Canister IDs (Mainnet)

| Canister | ID | Purpose |
|----------|-----|---------|
| Assets | `3kpgg-eaaaa-aaaao-a4xdq-cai` | Frontend hosting |
| Core | `qb6fv-6aaaa-aaaao-a4w7q-cai` | User management |
| NFT | `37ixl-fiaaa-aaaao-a4xaa-cai` | NFT standard |
| KIP | `3yjr7-iqaaa-aaaao-a4xaq-cai` | Identity provider |
| Treasury | `3rk2d-6yaaa-aaaao-a4xba-cai` | Fee collection |
| Escrow | `3wl4x-taaaa-aaaao-a4xbq-cai` | Payment escrow |
| Logistics | `3dmn2-siaaa-aaaao-a4xca-cai` | Freight management |
| AI Engine | `3enlo-7qaaa-aaaao-a4xcq-cai` | LLM orchestration |
| Raven AI | `3noas-jyaaa-aaaao-a4xda-cai` | News & AXIOM |
| DeepSeek Model | `kqj56-2aaaa-aaaao-a4ygq-cai` | On-chain LLM |
| Vector DB | `kzkwc-miaaa-aaaao-a4yha-cai` | Semantic search |
| Queen Bee | `k6lqw-bqaaa-aaaao-a4yhq-cai` | AI orchestrator |
| Staking | `inutw-jiaaa-aaaao-a4yja-cai` | NFT staking |

---

## 🛠️ Development

### Project Structure

```
raven-unified-ecosystem/
├── backend/           # Rust canisters
├── frontend/          # React application
├── scripts/          # Deployment and utility scripts
├── docs/             # Documentation
└── dfx.json          # DFX configuration
```

### Building

```bash
# Build all canisters
dfx build

# Build specific canister
dfx build <canister_name>

# Build frontend
cd frontend
npm run build
```

### Testing

```bash
# Run Rust tests
cargo test

# Run frontend tests
cd frontend
npm test
```

---

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 👤 Admin

**Principal**: `lgd5r-y4x7q-lbrfa-mabgw-xurgu-4h3at-sw4sl-yyr3k-5kwgt-vlkao-jae`

---

## 🙏 Acknowledgments

- DFINITY Foundation for Internet Computer Protocol
- Community contributors and testers
- Open-source libraries and tools

---

<div align="center">

**Built with ❤️ on Internet Computer Protocol**

[Website](https://3kpgg-eaaaa-aaaao-a4xdq-cai.icp0.io) • [GitHub](https://github.com/NDKONG-ICP) • [Twitter](https://x.com/icspicyrwa)

</div>
