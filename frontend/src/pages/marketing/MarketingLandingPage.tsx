// Marketing Landing Page - The Raven Ecosystem
// Comprehensive overview with downloadable pitch deck

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

interface EcosystemProject {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  features: string[];
  status: 'live' | 'beta' | 'coming-soon';
  link: string;
}

const ECOSYSTEM_PROJECTS: EcosystemProject[] = [
  {
    id: 'forge',
    name: 'The Forge',
    tagline: 'Multi-Chain NFT Minting Platform',
    description: 'Create, mint, and deploy NFTs across ICP, Ethereum, Bitcoin, Solana, and more. Full ICRC-7/ICRC-37, EXT, and ERC-721 compliance.',
    icon: '🔨',
    features: ['Multi-chain minting', 'Generative art engine', 'QR code claiming', 'Fractional ownership'],
    status: 'live',
    link: '/forge',
  },
  {
    id: 'expresso',
    name: 'Expresso Logistics',
    tagline: 'AI-Powered Decentralized Logistics',
    description: 'Connect shippers, drivers, and warehouses with real-time tracking, AI route optimization, and NFT-based escrow.',
    icon: '🚚',
    features: ['AI route optimization', 'NFT escrow', 'KIP onboarding', 'ASE service manuals'],
    status: 'live',
    link: '/expresso',
  },
  {
    id: 'sk8punks',
    name: 'Raven Sk8 Punks',
    tagline: 'Play-to-Earn Skateboarding Game',
    description: 'A 2D skateboarding game with NFT staking, token rewards, and competitive leaderboards.',
    icon: '🛹',
    features: ['2D gameplay', 'NFT staking', 'Token rewards', 'Leaderboards'],
    status: 'live',
    link: '/sk8punks',
  },
  {
    id: 'crossword',
    name: "Raven's Knowledge Quest",
    tagline: 'AI-Generated Crossword Puzzles',
    description: 'Challenge your mind with AI-generated crossword puzzles. Earn tokens and NFTs for completing puzzles.',
    icon: '📝',
    features: ['AI generation', 'Token rewards', 'Daily challenges', 'NFT prizes'],
    status: 'live',
    link: '/crossword',
  },
  {
    id: 'news',
    name: 'Raven News',
    tagline: 'Decentralized News Platform',
    description: 'Community-driven news platform with token-curated content and verifiable sources.',
    icon: '📰',
    features: ['Token curation', 'Verified sources', 'Community governance', 'Tip system'],
    status: 'beta',
    link: '/news',
  },
  {
    id: 'ai-council',
    name: 'AI Council',
    tagline: 'Multi-LLM Consensus System',
    description: 'Harness the power of multiple AI models working together to provide reliable, consensus-based answers.',
    icon: '🧠',
    features: ['Multi-model queries', 'Persistent memory', 'Knowledge graphs', 'On-chain AI'],
    status: 'live',
    link: '/ai',
  },
];

const TOKENOMICS = {
  totalSupply: '1,000,000,000',
  symbol: 'RAVEN',
  distribution: [
    { name: 'Community & Rewards', percentage: 40, color: 'bg-amber-500' },
    { name: 'Development', percentage: 20, color: 'bg-purple-500' },
    { name: 'Treasury', percentage: 15, color: 'bg-blue-500' },
    { name: 'Team & Advisors', percentage: 15, color: 'bg-green-500' },
    { name: 'Liquidity', percentage: 10, color: 'bg-pink-500' },
  ],
};

const ROADMAP = [
  {
    quarter: 'Q1 2025',
    title: 'Foundation',
    items: ['Launch The Forge NFT platform', 'Deploy core canisters', 'Internet Identity integration'],
    status: 'completed',
  },
  {
    quarter: 'Q2 2025',
    title: 'Expansion',
    items: ['Expresso Logistics launch', 'Multi-chain NFT support', 'AI Council integration'],
    status: 'current',
  },
  {
    quarter: 'Q3 2025',
    title: 'Gaming',
    items: ['Sk8 Punks game launch', 'Crossword Quest release', 'Token staking'],
    status: 'upcoming',
  },
  {
    quarter: 'Q4 2025',
    title: 'Scale',
    items: ['Mobile apps', 'DEX integration', 'Governance launch'],
    status: 'upcoming',
  },
];

const TEAM = [
  { name: 'The Raven', role: 'Founder & Visionary', avatar: '🦅' },
  { name: 'Core Team', role: 'Development', avatar: '👨‍💻' },
  { name: 'Community', role: 'Governance', avatar: '👥' },
];

export const MarketingLandingPage: React.FC = () => {
  const { t } = useTranslation();
  const [showPitchDeck, setShowPitchDeck] = useState(false);

  const handleDownloadPitchDeck = () => {
    // In production, this would download an actual PDF
    const pitchDeckContent = generatePitchDeckContent();
    const blob = new Blob([pitchDeckContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Raven_Ecosystem_Pitch_Deck.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const generatePitchDeckContent = () => {
    return `
THE RAVEN PROJECT
Pitch Deck - ${new Date().toLocaleDateString()}

================================================================================
EXECUTIVE SUMMARY
================================================================================

The Raven Project is a comprehensive Web3 ecosystem built on the Internet Computer Protocol (ICP), 
featuring multi-chain NFT minting, decentralized logistics, AI-powered applications, and gaming.

Vision: To create a fully decentralized, multi-chain ecosystem that empowers users with 
ownership, transparency, and innovative applications.

================================================================================
THE PROBLEM
================================================================================

1. Fragmented Web3 Experience
   - Users need multiple wallets and platforms
   - High gas fees on traditional blockchains
   - Complex user onboarding

2. Centralized AI Services
   - Single points of failure
   - Lack of transparency
   - No user ownership of data

3. Traditional Logistics Inefficiencies
   - Paper-based processes
   - Payment delays
   - Lack of transparency

================================================================================
OUR SOLUTION
================================================================================

The Raven Ecosystem - A unified platform featuring:

🔨 THE FORGE - Multi-Chain NFT Platform
   - Mint NFTs on ICP, ETH, BTC, SOL, and more
   - Full standard compliance (ICRC-7, EXT, ERC-721)
   - Generative art engine with rarity system

🚚 EXPRESSO LOGISTICS - Decentralized Logistics
   - AI-powered route optimization
   - NFT-based payment escrow
   - Real-time tracking and verification

🧠 AI COUNCIL - Multi-LLM Consensus
   - Multiple AI models working together
   - Persistent memory and knowledge graphs
   - On-chain AI execution

🛹 SK8 PUNKS - Play-to-Earn Gaming
   - 2D skateboarding game
   - NFT staking for rewards
   - Competitive leaderboards

📝 CROSSWORD QUEST - AI Gaming
   - AI-generated puzzles
   - Token rewards
   - Educational content

================================================================================
TECHNOLOGY STACK
================================================================================

- Internet Computer Protocol (ICP)
- Rust backend canisters
- React + TypeScript frontend
- Chain Fusion for multi-chain
- Threshold ECDSA for cross-chain signing
- HTTPS outcalls for AI integration

================================================================================
TOKENOMICS
================================================================================

Token: RAVEN
Total Supply: 1,000,000,000

Distribution:
- Community & Rewards: 40%
- Development: 20%
- Treasury: 15%
- Team & Advisors: 15%
- Liquidity: 10%

Utility:
- Platform fees
- Staking rewards
- Governance voting
- NFT purchases
- Premium features

================================================================================
ROADMAP
================================================================================

Q1 2025 - Foundation
✓ Launch The Forge NFT platform
✓ Deploy core canisters
✓ Internet Identity integration

Q2 2025 - Expansion
→ Expresso Logistics launch
→ Multi-chain NFT support
→ AI Council integration

Q3 2025 - Gaming
○ Sk8 Punks game launch
○ Crossword Quest release
○ Token staking

Q4 2025 - Scale
○ Mobile apps
○ DEX integration
○ Governance launch

================================================================================
TEAM
================================================================================

The Raven Project is built by a dedicated team of blockchain developers,
AI engineers, and Web3 enthusiasts committed to decentralization.

================================================================================
INVESTMENT OPPORTUNITY
================================================================================

Seeking: Strategic partners and early supporters

Use of Funds:
- 40% Development
- 25% Marketing & Community
- 20% Operations
- 15% Legal & Compliance

================================================================================
CONTACT
================================================================================

Website: https://ravenproject.io
GitHub: https://github.com/NDKONG-ICP
Twitter: @TheRavenProject

================================================================================

© ${new Date().getFullYear()} The Raven Project. All rights reserved.
    `;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/forge-bg.png')] opacity-10"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gray-900/50 to-gray-900"></div>
        
        <div className="relative max-w-6xl mx-auto text-center">
          <div className="text-8xl mb-6 animate-float">🦅</div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="gold-gradient-text">The Raven Project</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
            A comprehensive Web3 ecosystem featuring multi-chain NFTs, 
            decentralized logistics, AI-powered applications, and gaming.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/" className="btn-primary px-8 py-4 text-lg">
              <span>🚀</span> Explore Ecosystem
            </Link>
            <button
              onClick={handleDownloadPitchDeck}
              className="px-8 py-4 text-lg rounded-xl border-2 border-amber-500 text-amber-400 hover:bg-amber-500/20 transition-all"
            >
              <span>📄</span> Download Pitch Deck
            </button>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-8 bg-gradient-to-r from-amber-500/10 via-amber-600/10 to-amber-500/10 border-y border-amber-500/20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl md:text-4xl font-bold gold-gradient-text">6+</div>
              <div className="text-gray-400">dApps</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold gold-gradient-text">10+</div>
              <div className="text-gray-400">Blockchains</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold gold-gradient-text">100%</div>
              <div className="text-gray-400">On-Chain</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold gold-gradient-text">∞</div>
              <div className="text-gray-400">Possibilities</div>
            </div>
          </div>
        </div>
      </section>

      {/* Ecosystem Projects */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4">
            <span className="gold-gradient-text">The Ecosystem</span>
          </h2>
          <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
            A unified platform of interconnected applications, each designed to work 
            seamlessly together while providing standalone value.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ECOSYSTEM_PROJECTS.map((project) => (
              <div key={project.id} className="glass-card p-6 hover:border-amber-500/50 transition-all group">
                <div className="flex items-start justify-between mb-4">
                  <div className="text-4xl">{project.icon}</div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    project.status === 'live' ? 'bg-green-500/20 text-green-400' :
                    project.status === 'beta' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {project.status.toUpperCase()}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mb-1">{project.name}</h3>
                <p className="text-amber-400 text-sm mb-3">{project.tagline}</p>
                <p className="text-gray-400 text-sm mb-4">{project.description}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {project.features.map((feature, i) => (
                    <span key={i} className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded">
                      {feature}
                    </span>
                  ))}
                </div>
                <Link
                  to={project.link}
                  className="text-amber-400 text-sm hover:underline group-hover:text-amber-300"
                >
                  Explore →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tokenomics */}
      <section className="py-20 px-4 bg-gradient-to-b from-gray-900 via-gray-800/50 to-gray-900">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4">
            <span className="gold-gradient-text">Tokenomics</span>
          </h2>
          <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
            The RAVEN token powers the entire ecosystem, enabling governance, 
            rewards, and seamless transactions across all applications.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Token Info */}
            <div className="glass-card p-8">
              <div className="text-center mb-8">
                <div className="text-6xl mb-4">🪙</div>
                <h3 className="text-3xl font-bold text-white">{TOKENOMICS.symbol}</h3>
                <p className="text-gray-400">Total Supply: {TOKENOMICS.totalSupply}</p>
              </div>
              
              <div className="space-y-4">
                {TOKENOMICS.distribution.map((item) => (
                  <div key={item.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300">{item.name}</span>
                      <span className="text-white font-bold">{item.percentage}%</span>
                    </div>
                    <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${item.color} rounded-full transition-all`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Token Utility */}
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-white mb-6">Token Utility</h3>
              {[
                { icon: '💰', title: 'Platform Fees', desc: 'Pay for services across all ecosystem apps' },
                { icon: '🎁', title: 'Staking Rewards', desc: 'Earn passive income by staking RAVEN' },
                { icon: '🗳️', title: 'Governance', desc: 'Vote on proposals and shape the future' },
                { icon: '🖼️', title: 'NFT Purchases', desc: 'Buy, sell, and trade NFTs across chains' },
                { icon: '⭐', title: 'Premium Features', desc: 'Access exclusive features and content' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4 p-4 bg-gray-800/50 rounded-xl">
                  <div className="text-2xl">{item.icon}</div>
                  <div>
                    <h4 className="font-bold text-white">{item.title}</h4>
                    <p className="text-gray-400 text-sm">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4">
            <span className="gold-gradient-text">Roadmap</span>
          </h2>
          <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
            Our journey to building the most comprehensive Web3 ecosystem.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {ROADMAP.map((phase, index) => (
              <div
                key={phase.quarter}
                className={`glass-card p-6 relative ${
                  phase.status === 'current' ? 'border-amber-500' : ''
                }`}
              >
                {phase.status === 'current' && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-xs px-3 py-1 rounded-full font-bold">
                    CURRENT
                  </div>
                )}
                <div className="text-amber-400 font-bold mb-2">{phase.quarter}</div>
                <h3 className="text-xl font-bold text-white mb-4">{phase.title}</h3>
                <ul className="space-y-2">
                  {phase.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                      <span className={
                        phase.status === 'completed' ? 'text-green-400' :
                        phase.status === 'current' ? 'text-amber-400' :
                        'text-gray-500'
                      }>
                        {phase.status === 'completed' ? '✓' : phase.status === 'current' ? '→' : '○'}
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technology */}
      <section className="py-20 px-4 bg-gradient-to-b from-gray-900 via-gray-800/50 to-gray-900">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4">
            <span className="gold-gradient-text">Technology</span>
          </h2>
          <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
            Built on cutting-edge blockchain technology for speed, security, and scalability.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { name: 'ICP', icon: '🌐' },
              { name: 'Rust', icon: '🦀' },
              { name: 'React', icon: '⚛️' },
              { name: 'Bitcoin', icon: '₿' },
              { name: 'Ethereum', icon: 'Ξ' },
              { name: 'Solana', icon: '◎' },
            ].map((tech) => (
              <div key={tech.name} className="glass-card p-6 text-center">
                <div className="text-3xl mb-2">{tech.icon}</div>
                <div className="text-white font-medium">{tech.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">
            <span className="gold-gradient-text">Join The Raven Project</span>
          </h2>
          <p className="text-gray-400 text-lg mb-8">
            Be part of the next generation of decentralized applications. 
            Whether you're a user, developer, or investor, there's a place for you in our ecosystem.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/" className="btn-primary px-8 py-4 text-lg">
              <span>🚀</span> Launch App
            </Link>
            <button
              onClick={handleDownloadPitchDeck}
              className="px-8 py-4 text-lg rounded-xl border-2 border-amber-500 text-amber-400 hover:bg-amber-500/20 transition-all"
            >
              <span>📄</span> Pitch Deck
            </button>
            <a
              href="https://github.com/NDKONG-ICP"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 text-lg rounded-xl border-2 border-gray-600 text-gray-300 hover:bg-gray-800 transition-all"
            >
              <span>💻</span> GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-gray-800">
        <div className="max-w-6xl mx-auto text-center text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} The Raven Project. All rights reserved.</p>
          <p className="mt-2">Built with ❤️ on the Internet Computer</p>
        </div>
      </footer>

      {/* Float animation style */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default MarketingLandingPage;






