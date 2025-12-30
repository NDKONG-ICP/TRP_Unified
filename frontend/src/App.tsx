import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy, useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import Header from './components/shared/Header';
import Footer from './components/shared/Footer';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import LoadingScreen from './components/shared/LoadingScreen';
import Onboarding from './components/Onboarding';
import RavenAIChatbot from './components/RavenAIChatbot';
import { IdentityKitBridge } from './components/IdentityKitBridge';
import { DemoModeProvider } from './components/DemoMode';
import { LanguageProvider } from './contexts/LanguageContext';
import { useAuthStore } from './stores/authStore';
import { useWalletStore } from './stores/walletStore';
import { verifyPlugConnection, isPlugAvailable } from './services/plugService';
import AuthGuard from './components/auth/AuthGuard';

// NFID IdentityKit styles for wallet UI
// Reference: https://github.com/internet-identity-labs/identitykit
import "@nfid/identitykit/react/styles.css";

// Lazy load pages for better performance
const LandingPage = lazy(() => import('./pages/LandingPage'));
const ForgePage = lazy(() => import('./pages/forge/ForgePage'));
const ExpressoPage = lazy(() => import('./pages/expresso/ExpressoPage'));
const NewsPage = lazy(() => import('./pages/news/NewsPage'));
const Sk8PunksPage = lazy(() => import('./pages/sk8punks/Sk8PunksPage'));
const CrosswordPage = lazy(() => import('./pages/crossword/CrosswordPage'));
const WalletPage = lazy(() => import('./pages/wallet/WalletPage'));
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage'));
const AdminPage = lazy(() => import('./pages/admin/AdminPage'));
const TokenomicsPage = lazy(() => import('./pages/TokenomicsPage'));
const AIFeaturesPage = lazy(() => import('./pages/ai/AIFeaturesPage'));
const AILaunchpad = lazy(() => import('./pages/ai/AILaunchpad'));
const MarketingLandingPage = lazy(() => import('./pages/marketing/MarketingLandingPage'));
const RavenAIPage = lazy(() => import('./pages/raven-ai/RavenAIPage'));
const AxiomAgentPage = lazy(() => import('./pages/raven-ai/AxiomAgentPage'));
const ICSpicyPage = lazy(() => import('./pages/icspicy/ICSpicyPage'));
const PitchDeck = lazy(() => import('./pages/PitchDeck'));

// AXIOM Genesis NFT Pages
const AxiomNFTPage = lazy(() => import('./pages/axiom/AxiomNFTPage'));
const AxiomCollectionPage = lazy(() => import('./pages/axiom/AxiomCollectionPage'));

// HALO Academic Writing Assistant
const HALOPage = lazy(() => import('./pages/halo/HALOPage'));

function App() {
  const { isAuthenticated, needsOnboarding, setNeedsOnboarding, completeOnboarding } = useAuthStore();
  const { walletType, isConnected, connect } = useWalletStore();
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Persist Plug connection on app load
  // Reference: https://docs.plugwallet.ooo/developer-guides/connect-to-plug/#persisting-an-appplug-connection
  useEffect(() => {
    const verifyConnection = async () => {
      if (isPlugAvailable() && walletType === 'plug' && !isConnected) {
        try {
          const connected = await verifyPlugConnection();
          if (connected) {
            // Reconnect using wallet store
            await connect('plug');
          }
        } catch (error) {
          console.log('Plug connection verification:', error);
        }
      }
    };

    verifyConnection();
  }, []); // Only run on mount

  // Show onboarding when user needs it
  useEffect(() => {
    if (isAuthenticated && needsOnboarding) {
      setShowOnboarding(true);
    }
  }, [isAuthenticated, needsOnboarding]);

  const handleOnboardingComplete = async (profile: any) => {
    await completeOnboarding({
      displayName: profile.displayName,
      email: profile.email,
      avatar: profile.profilePictureUrl,
    });
    setShowOnboarding(false);
  };

  const handleOnboardingClose = () => {
    setShowOnboarding(false);
    // User can close and complete later
    setNeedsOnboarding(false);
  };

  return (
      <LanguageProvider>
        <DemoModeProvider>
        <IdentityKitBridge />
        <Router>
          <AuthGuard />
          <div className="min-h-screen min-h-dvh bg-raven-black flex flex-col overflow-x-hidden w-full max-w-full" style={{ width: '100%', maxWidth: '100vw', overflowX: 'hidden' }}>
            <Header />
        
        {/* Onboarding Modal */}
        <AnimatePresence>
          {showOnboarding && (
            <Onboarding
              onComplete={handleOnboardingComplete}
              onClose={handleOnboardingClose}
            />
          )}
        </AnimatePresence>
        
        <main className="flex-1 pt-20">
          <ErrorBoundary>
            <Suspense fallback={<LoadingScreen />}>
              <Routes>
                {/* Main Landing */}
                <Route path="/" element={<LandingPage />} />
                
                {/* The Forge - NFT Minter */}
                <Route path="/forge/*" element={<ForgePage />} />
                
                {/* Expresso Logistics */}
                <Route path="/expresso/*" element={<ExpressoPage />} />
                
                {/* Raven News */}
                <Route path="/news/*" element={<NewsPage />} />
                <Route path="/news/submit" element={<NewsPage />} />
                <Route path="/halo" element={<HALOPage />} />
                
                {/* Sk8 Punks Game */}
                <Route path="/sk8-punks/*" element={<Sk8PunksPage />} />
                <Route path="/sk8punks" element={<Navigate to="/sk8-punks" replace />} />
                <Route path="/sk8punks/*" element={<Navigate to="/sk8-punks" replace />} />
                
                {/* Crossword Quest */}
                <Route path="/crossword/*" element={<CrosswordPage />} />
                
                {/* IC SPICY RWA Co-op */}
                <Route path="/ic-spicy/*" element={<ICSpicyPage />} />
                <Route path="/spicy/*" element={<ICSpicyPage />} />
                {/* Backwards-compatible aliases */}
                <Route path="/icspicy" element={<Navigate to="/ic-spicy" replace />} />
                <Route path="/icspicy/*" element={<Navigate to="/ic-spicy" replace />} />
                
                {/* User Pages */}
                <Route path="/wallet" element={<WalletPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                
                {/* Admin */}
                <Route path="/admin/*" element={<AdminPage />} />
                
                {/* Info Pages */}
                <Route path="/tokenomics" element={<TokenomicsPage />} />
                
                {/* AI Features */}
                <Route path="/ai" element={<AIFeaturesPage />} />
                <Route path="/ai/council" element={<AIFeaturesPage />} />
                <Route path="/ai-launchpad" element={<AILaunchpad />} />
                <Route path="/launchpad" element={<AILaunchpad />} />
                
                {/* RavenAI Agent NFTs */}
                <Route path="/raven-ai/*" element={<RavenAIPage />} />
                <Route path="/axiom/*" element={<RavenAIPage />} />
                
                {/* Individual AXIOM Agent Pages */}
                <Route path="/axiom-agent/:agentId" element={<AxiomAgentPage />} />
                
                {/* AXIOM Genesis NFT Collection */}
                <Route path="/axiom-collection" element={<AxiomCollectionPage />} />
                <Route path="/axiom/:id" element={<AxiomNFTPage />} />
                
                {/* Marketing / About */}
                <Route path="/about" element={<MarketingLandingPage />} />
                <Route path="/marketing" element={<MarketingLandingPage />} />
                
                {/* Investor Pitch Deck */}
                <Route path="/pitch" element={<PitchDeck />} />
                <Route path="/deck" element={<PitchDeck />} />
                
                {/* 404 */}
                <Route path="*" element={
                  <div className="min-h-[60vh] flex items-center justify-center">
                    <div className="text-center">
                      <h1 className="text-6xl font-display font-bold text-gradient-gold mb-4">404</h1>
                      <p className="text-silver-400 mb-6">Page not found</p>
                      <a href="/" className="btn-gold">Return Home</a>
                    </div>
                  </div>
                } />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>
        <Footer />
        
            {/* Floating RavenAI Companion Chatbot */}
            <RavenAIChatbot floating={true} />
          </div>
        </Router>
        </DemoModeProvider>
      </LanguageProvider>
  );
}

export default App;

