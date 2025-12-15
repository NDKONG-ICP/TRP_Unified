# TRP Unified - The Raven Project Unified Ecosystem

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

**TRP Unified** (The Raven Project Unified Ecosystem) is a production-ready, unified Web3 ecosystem built entirely on the Internet Computer Protocol (ICP). It seamlessly integrates multiple decentralized applications, AI-powered services, gaming platforms, and real-world asset tokenization into a single, cohesive experience.

### Key Highlights

- ✅ **Fully Deployed** - All components live on mainnet
- ✅ **Zero Gas Fees** - Transactions cost fractions of a cent
- ✅ **On-Chain AI** - First platform with native LLM inference
- ✅ **Multi-Chain** - True cross-chain NFT support via Chain Fusion
- ✅ **Production Ready** - Real users, real transactions, real value
- ✅ **24 Canisters** - Comprehensive backend infrastructure
- ✅ **Modern Stack** - React 18, TypeScript, Rust, Tailwind CSS

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
- HALO Academic Writing Assistant

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

The platform consists of **24 production canisters** on Internet Computer mainnet:

#### Core Infrastructure
- **core** - User management, authentication, profiles
- **nft** - ICRC-7/ICRC-37 NFT standard implementation
- **kip** - Know-Your-Identity Provider (KYC/verification)
- **treasury** - Platform fee collection and distribution
- **escrow** - NFT-based payment escrow system
- **staking** - NFT staking and reward distribution

#### Logistics Platform
- **logistics** - Load management, tracking, marketplace

#### AI Infrastructure
- **ai_engine** - LLM orchestration, AI Council decision-making
- **raven_ai** - News generation, AXIOM agent management
- **deepseek_model** - On-chain LLM inference (DeepSeek R1)
- **vector_db** - Semantic search, embeddings storage
- **queen_bee** - AI pipeline orchestrator

#### Multi-Chain Support
- **siwe_canister** - Sign-In with Ethereum integration
- **siws_canister** - Sign-In with Solana integration
- **siwb_canister** - Sign-In with Bitcoin integration
- **sis_canister** - Sign-In with Sui integration
- **ordinals_canister** - Bitcoin Ordinals support

#### AXIOM Agents
- **axiom_nft** - Base AXIOM NFT canister
- **axiom_1** through **axiom_5** - Individual genesis agents

#### Frontend
- **assets** - Frontend hosting and static assets

### Frontend (React + TypeScript)

- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with custom design system
- **State**: Zustand for state management
- **Animation**: Framer Motion
- **i18n**: Multi-language support (10+ languages)
- **Wallets**: Internet Identity, Plug, OISY, NFID
- **Routing**: React Router v6
- **Build**: Vite for fast development and optimized builds

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **Rust** 1.70+ ([Install](https://www.rust-lang.org/tools/install))
- **DFX** 0.29+ ([Install](https://internetcomputer.org/docs/current/developer-docs/setup/install/))
- **wasm32-unknown-unknown** target: `rustup target add wasm32-unknown-unknown`

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/TRP_Unified.git
cd TRP_Unified

# Install frontend dependencies
cd frontend
npm install
cd ..

# Rust dependencies are managed by Cargo automatically
```

### Local Development

```bash
# Start local Internet Computer replica
dfx start --background

# Deploy all canisters locally
dfx deploy

# Build and serve frontend
cd frontend
npm run dev

# Access frontend at http://localhost:5173
# Or access via canister: http://[assets-canister-id].localhost:4943
```

### Mainnet Deployment

```bash
# Set network to mainnet
export DFX_NETWORK=ic

# Ensure you have cycles in your wallet
dfx wallet balance

# Deploy to mainnet
dfx deploy --network ic

# Or use deployment scripts
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
- [Multi-Chain Implementation](MULTI_CHAIN_IMPLEMENTATION_PLAN.md) - Cross-chain architecture

### Deployment & Operations

- [Deployment Status](DEPLOYMENT_COMPLETE.md) - Current deployment state
- [Health Checks](HEALTH_CHECK_REPORT.md) - System monitoring
- [Troubleshooting](RAVEN_AI_RESET_SOLUTION.md) - Common issues and solutions

---

## 🔐 Security

### Security Features

- **Internet Identity** - Passwordless authentication via WebAuthn
- **Rate Limiting** - Protection against abuse and DDoS
- **Input Validation** - Comprehensive validation on all endpoints
- **Role-Based Access** - Admin, User, Driver, Shipper, Warehouse roles
- **KYC Verification** - Document verification for drivers via KIP
- **Escrow Protection** - Secure payment handling with NFT-based escrow
- **Stable Memory** - All canisters use stable memory for data persistence

### Best Practices

- All canisters use stable memory for data persistence
- Comprehensive error handling and logging
- Input sanitization on all user inputs
- Rate limiting on sensitive endpoints
- Admin-only functions properly protected
- Regular security audits and updates

---

## 🎨 Design System

### Theme

- **Primary Colors**: Black (#000000), Gold (#FFD700), Silver (#C0C0C0)
- **Typography**: 
  - Playfair Display (headings)
  - Inter (body text)
  - JetBrains Mono (code)
- **Effects**: Glassmorphism, gold gradients, animated particles
- **Responsive**: Mobile-first design, works on all screen sizes

### UI Components

- Glassmorphic cards and modals
- Animated transitions with Framer Motion
- Loading states and error handling
- Responsive navigation with mobile menu
- Multi-language support with i18next
- Dark mode support

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
| AXIOM NFT | `arx4x-cqaaa-aaaao-a4z5q-cai` | AXIOM base |
| AXIOM 1-5 | `46odg-5iaaa...` | Individual agents |
| SIWE | `ehdei-liaaa-aaaao-a4zfa-cai` | Ethereum auth |
| SIWS | `eacc4-gqaaa-aaaao-a4zfq-cai` | Solana auth |
| SIWB | `evftr-hyaaa-aaaao-a4zga-cai` | Bitcoin auth |
| SIS | `e3h6z-4iaaa-aaaao-a4zha-cai` | Sui auth |
| Ordinals | `gb3wf-cyaaa-aaaao-a4zia-cai` | Bitcoin Ordinals |

---

## 🛠️ Development

### Project Structure

```
TRP_Unified/
├── backend/              # Rust canisters
│   ├── core/            # User management
│   ├── nft/             # NFT standard
│   ├── kip/             # Identity provider
│   ├── treasury/        # Fee collection
│   ├── escrow/          # Payment escrow
│   ├── logistics/       # Freight platform
│   ├── ai_engine/       # LLM orchestration
│   ├── raven_ai/        # News generation
│   ├── deepseek_model/  # On-chain LLM
│   ├── vector_db/       # Semantic search
│   ├── queen_bee/       # AI orchestrator
│   ├── staking/         # NFT staking
│   ├── axiom_nft/       # AXIOM agents
│   └── [multi-chain]/   # Cross-chain support
├── frontend/             # React application
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── services/    # API services
│   │   ├── stores/      # State management
│   │   └── styles/      # Styling
│   └── public/          # Static assets
├── scripts/             # Deployment scripts
├── docs/                # Documentation
└── dfx.json             # DFX configuration
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

# Full build (canisters + frontend)
dfx build && cd frontend && npm run build
```

### Testing

```bash
# Run Rust tests
cargo test

# Run frontend tests
cd frontend
npm test

# Type checking
cd frontend
npm run type-check
```

### Code Quality

```bash
# Lint frontend
cd frontend
npm run lint

# Format Rust code
cargo fmt

# Check Rust code
cargo clippy
```

---

## 🔗 Links

- **Live Platform**: https://3kpgg-eaaaa-aaaao-a4xdq-cai.icp0.io
- **GitHub**: https://github.com/YOUR_USERNAME/TRP_Unified
- **Twitter**: https://x.com/icspicyrwa
- **OpenChat**: https://oc.app/community/tc7su-iqaaa-aaaaf-bifhq-cai
- **Internet Computer**: https://internetcomputer.org

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit with clear messages (`git commit -m 'Add amazing feature'`)
5. Push to your branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

### Contribution Guidelines

- Follow the existing code style
- Write tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 👤 Admin

**Principal**: `lgd5r-y4x7q-lbrfa-mabgw-xurgu-4h3at-sw4sl-yyr3k-5kwgt-vlkao-jae`

---

## 🙏 Acknowledgments

- DFINITY Foundation for Internet Computer Protocol
- DeepSeek AI for on-chain LLM capabilities
- Community contributors and testers
- Open-source libraries and tools
- All early adopters and supporters

---

## 📈 Roadmap

### Completed ✅
- [x] Core infrastructure deployment
- [x] Multi-chain NFT support
- [x] AI-powered news generation
- [x] Logistics platform
- [x] On-chain LLM integration
- [x] AXIOM AI agents
- [x] Multi-chain authentication

### In Progress 🚧
- [ ] Enhanced AI capabilities
- [ ] Additional blockchain integrations
- [ ] Mobile app development
- [ ] Advanced analytics dashboard

### Planned 📋
- [ ] DAO governance
- [ ] Token launch
- [ ] Additional gaming platforms
- [ ] Expanded RWA tokenization

---

<div align="center">

**Built with ❤️ on Internet Computer Protocol**

[Website](https://3kpgg-eaaaa-aaaao-a4xdq-cai.icp0.io) • [GitHub](https://github.com/YOUR_USERNAME/TRP_Unified) • [Twitter](https://x.com/icspicyrwa)

**The Future of Decentralized Applications**

</div>
