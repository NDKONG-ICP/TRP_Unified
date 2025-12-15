import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Wallet, User, LogOut, ChevronDown, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import LanguageSelector from './LanguageSelector';
import AccessibilityMenu from './AccessibilityMenu';
import WalletModal from './WalletModal';

// Navigation items - will be translated in component
const navigation = [
  { key: 'home', href: '/' },
  { key: 'icSpicy', href: '/ic-spicy', badge: '🔥 RWA' },
  { key: 'theForge', href: '/forge', badge: 'NFT' },
  { key: 'expresso', href: '/expresso', badge: 'Logistics' },
  { key: 'ravenNews', href: '/news' },
  { key: 'sk8Punks', href: '/sk8-punks', badge: 'Game' },
  { key: 'crossword', href: '/crossword' },
];

export default function Header() {
  const { t } = useTranslation();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  
  const { 
    isAuthenticated, 
    isLoading, 
    logout, 
    principal,
    balances,
    profile 
  } = useAuthStore();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    if (isMenuOpen) {
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target.closest('header')) {
          setIsMenuOpen(false);
        }
      };
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isMenuOpen]);

  const formatBalance = (balance: bigint, decimals: number = 8) => {
    const num = Number(balance) / Math.pow(10, decimals);
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  };
  
  // Check if user is admin
  const isAdmin = principal ? (() => {
    const principalText = principal.toText();
    const adminPrincipals = [
      'lgd5r-y4x7q-lbrfa-mabgw-xurgu-4h3at-sw4sl-yyr3k-5kwgt-vlkao-jae', // Cursor
      'sh7h6-b7xcy-tjank-crj6d-idrcr-ormbi-22yqs-uanyl-itbp3-ur5ue-wae', // Plug
      'yyirv-5pjkg-oupac-gzja4-ljzfn-6mvon-r5w2i-6e7wm-sde75-wuses-nqe', // OISY
      'imnyd-k37s2-xlg7c-omeed-ezrzg-6oesa-r3ek6-xrwuz-qbliq-5h675-yae', // New
      'gqkko-43bbx-nwsp4-it2rg-pc2dy-w2pt2-fa5om-4y6es-oyhz2-5i5oh-5ae', // DFX
    ];
    return adminPrincipals.includes(principalText) || adminPrincipals.some(admin => principalText.startsWith(admin.split('-')[0]));
  })() : false;

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'glass-dark shadow-gold-sm' : 'bg-transparent'
      }`}
    >
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Logo - Always visible */}
          <Link 
            to="/" 
            className="flex items-center space-x-2 sm:space-x-3 group flex-shrink-0 z-10"
            onClick={() => setIsMenuOpen(false)}
          >
            <div className="relative w-10 h-10 sm:w-12 sm:h-12">
              <div className="absolute inset-0 bg-gradient-gold rounded-xl rotate-45 group-hover:rotate-[60deg] transition-transform duration-500" />
              <div className="absolute inset-1 bg-raven-black rounded-lg rotate-45 flex items-center justify-center">
                <span className="text-xl sm:text-2xl -rotate-45">🦅</span>
              </div>
            </div>
            <div className="hidden sm:block">
              <h1 className="font-display text-lg sm:text-xl font-bold text-gradient-gold">
                {t('common.ravenEcosystem')}
              </h1>
              <p className="text-xs text-silver-500">{t('common.multiChainPlatform')}</p>
            </div>
          </Link>

          {/* Desktop Navigation - Hidden on mobile, shown on large screens */}
          <nav className="hidden xl:flex items-center space-x-1 flex-shrink-0">
            {navigation.map((item) => (
              <Link
                key={item.key}
                to={item.href}
                className={`relative px-3 py-2 rounded-lg font-medium transition-all duration-200 whitespace-nowrap text-sm ${
                  location.pathname === item.href
                    ? 'text-gold-400'
                    : 'text-silver-400 hover:text-gold-300'
                }`}
              >
                {t(`navigation.${item.key}`)}
                {item.badge && (
                  <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-gold-500/20 text-gold-400 font-semibold">
                    {item.badge}
                  </span>
                )}
                {location.pathname === item.href && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-gold rounded-full"
                  />
                )}
              </Link>
            ))}
          </nav>

          {/* Right Section - Wallet, Settings, Menu Button */}
          <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
            {/* Language & Accessibility - Hidden on mobile */}
            <div className="hidden md:flex items-center space-x-2">
              <LanguageSelector />
              <AccessibilityMenu />
            </div>
            
            {/* Admin Panel Button - Desktop only, visible when admin */}
            {isAuthenticated && isAdmin && (
              <Link
                to="/admin"
                className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 hover:border-amber-500/50 rounded-lg transition-all group"
              >
                <Shield className="w-4 h-4 text-amber-400 group-hover:text-amber-300 flex-shrink-0" />
                <span className="text-xs font-medium text-amber-300 whitespace-nowrap">
                  Admin
                </span>
              </Link>
            )}
            
            {/* Wallet Button */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setIsWalletOpen(!isWalletOpen)}
                  className="flex items-center space-x-1.5 sm:space-x-2 px-2 sm:px-3 py-1.5 sm:py-2 glass-gold rounded-lg hover:border-gold-400 transition-all whitespace-nowrap"
                >
                  <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-gold-400 flex-shrink-0" />
                  <span className="hidden lg:inline text-xs sm:text-sm font-medium text-gold-300">
                    {formatBalance(balances.icp)} ICP
                  </span>
                  <ChevronDown className={`w-3 h-3 sm:w-4 sm:h-4 text-gold-400 transition-transform flex-shrink-0 ${isWalletOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {isWalletOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-72 glass-dark rounded-2xl p-4 border border-gold-500/30 z-50"
                    >
                      {/* Principal */}
                      <div className="mb-4 pb-4 border-b border-gold-700/30">
                        <p className="text-xs text-silver-500 mb-1">{t('common.principalId')}</p>
                        <p className="text-sm font-mono text-gold-300 truncate">
                          {principal?.toText()}
                        </p>
                      </div>

                      {/* Balances */}
                      <div className="space-y-3 mb-4">
                        <p className="text-xs text-silver-500 font-semibold uppercase tracking-wider">{t('common.balances')}</p>
                        <div className="grid gap-2">
                          <div className="flex justify-between items-center">
                            <span className="text-silver-400">ICP</span>
                            <span className="text-gold-300 font-medium">{formatBalance(balances.icp)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-silver-400">ckBTC</span>
                            <span className="text-gold-300 font-medium">{formatBalance(balances.ckBTC)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-silver-400">ckETH</span>
                            <span className="text-gold-300 font-medium">{formatBalance(balances.ckETH, 18)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-silver-400">ckUSDC</span>
                            <span className="text-gold-300 font-medium">{formatBalance(balances.ckUSDC, 6)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="space-y-2">
                        {isAdmin && (
                          <Link
                            to="/admin"
                            className="flex items-center justify-center w-full py-2 px-4 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg transition-all mb-2"
                            onClick={() => setIsWalletOpen(false)}
                          >
                            <Shield className="w-4 h-4 mr-2" />
                            Admin Panel
                          </Link>
                        )}
                        <Link
                          to="/wallet"
                          className="flex items-center justify-center w-full py-2 px-4 bg-gold-500/20 hover:bg-gold-500/30 text-gold-400 rounded-lg transition-all"
                          onClick={() => setIsWalletOpen(false)}
                        >
                          <Wallet className="w-4 h-4 mr-2" />
                          {t('common.viewWallet')}
                        </Link>
                        <Link
                          to="/profile"
                          className="flex items-center justify-center w-full py-2 px-4 hover:bg-silver-500/10 text-silver-400 rounded-lg transition-all"
                          onClick={() => setIsWalletOpen(false)}
                        >
                          <User className="w-4 h-4 mr-2" />
                          {t('common.profile')}
                        </Link>
                        <button
                          onClick={() => {
                            logout();
                            setIsWalletOpen(false);
                          }}
                          className="flex items-center justify-center w-full py-2 px-4 hover:bg-red-500/10 text-red-400 rounded-lg transition-all"
                        >
                          <LogOut className="w-4 h-4 mr-2" />
                          {t('common.disconnect')}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button
                onClick={() => setIsWalletModalOpen(true)}
                disabled={isLoading}
                className="btn-gold flex items-center space-x-2 px-3 sm:px-4 py-1.5 sm:py-2 text-sm"
              >
                <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">{isLoading ? t('common.connecting') : t('common.connect')}</span>
              </button>
            )}

            {/* Wallet Connection Modal */}
            <WalletModal 
              isOpen={isWalletModalOpen} 
              onClose={() => setIsWalletModalOpen(false)} 
            />

            {/* Hamburger Menu Button - Always visible on mobile/tablet, hidden on xl+ */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen(!isMenuOpen);
              }}
              className="xl:hidden p-2 rounded-lg hover:bg-gold-500/10 transition-colors relative z-50"
              aria-label="Toggle menu"
            >
              <motion.div
                animate={{ rotate: isMenuOpen ? 90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                {isMenuOpen ? (
                  <X className="w-6 h-6 text-gold-400" />
                ) : (
                  <Menu className="w-6 h-6 text-gold-400" />
                )}
              </motion.div>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile/Tablet Menu - Hamburger Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 xl:hidden"
            />
            
            {/* Menu Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-80 max-w-[85vw] glass-dark border-l border-gold-700/30 z-50 xl:hidden overflow-y-auto"
            >
              <div className="flex flex-col h-full">
                {/* Menu Header */}
                <div className="flex items-center justify-between p-4 border-b border-gold-700/30">
                  <h2 className="text-lg font-bold text-gradient-gold">Menu</h2>
                  <button
                    onClick={() => setIsMenuOpen(false)}
                    className="p-2 rounded-lg hover:bg-gold-500/10 transition-colors"
                  >
                    <X className="w-5 h-5 text-gold-400" />
                  </button>
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 px-4 py-6 space-y-2">
                  {navigation.map((item) => (
                    <Link
                      key={item.key}
                      to={item.href}
                      onClick={() => setIsMenuOpen(false)}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                        location.pathname === item.href
                          ? 'bg-gold-500/20 text-gold-400 border border-gold-500/30'
                          : 'text-silver-400 hover:bg-gold-500/10 hover:text-gold-300 border border-transparent'
                      }`}
                    >
                      <span className="font-medium">{t(`navigation.${item.key}`)}</span>
                      {item.badge && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gold-500/20 text-gold-400">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  ))}
                  
                  {/* Admin Panel Link in Mobile Menu */}
                  {isAuthenticated && isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setIsMenuOpen(false)}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                        location.pathname.startsWith('/admin')
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'text-silver-400 hover:bg-amber-500/10 hover:text-amber-300 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <Shield className="w-4 h-4" />
                        <span className="font-medium">Admin Panel</span>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                        Admin
                      </span>
                    </Link>
                  )}
                </nav>

                {/* Mobile Settings Section */}
                <div className="px-4 py-4 border-t border-gold-700/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-silver-500">Settings</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <LanguageSelector />
                    <AccessibilityMenu />
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
