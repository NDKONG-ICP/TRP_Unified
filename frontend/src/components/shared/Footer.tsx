import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Twitter, Github, MessageCircle, Globe, Mail, Send, Instagram, CheckCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Brand asset
import tokenLogo from '../../token.svg';

const footerLinks = {
  ecosystem: [
    { name: 'IC SPICY', href: '/ic-spicy' },
    { name: 'The Forge', href: '/forge' },
    { name: 'Expresso Logistics', href: '/expresso' },
    { name: 'Raven News', href: '/news' },
    { name: 'Sk8 Punks', href: '/sk8-punks' },
    { name: 'Crossword Quest', href: '/crossword' },
    { name: 'AI Launchpad', href: '/ai-launchpad' },
  ],
  resources: [
    { name: 'RavenAI', href: '/raven-ai' },
    { name: 'Tokenomics', href: '/tokenomics' },
    { name: 'Profile', href: '/profile' },
  ],
  community: [
    { name: 'Instagram', href: 'https://www.instagram.com/raven_icp', external: true },
    { name: 'TikTok', href: 'https://www.tiktok.com/@the.raven.project', external: true },
    { name: 'Twitter/X', href: 'https://x.com/ravenicp', external: true },
    { name: 'OpenChat', href: 'https://oc.app/community/tc7su-iqaaa-aaaaf-bifhq-cai', external: true },
  ],
  legal: [
    { name: 'Terms of Service', href: '/terms' },
    { name: 'Privacy Policy', href: '/privacy' },
  ],
};

// TikTok icon component
const TikTokIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
  </svg>
);

const socialLinks = [
  { 
    icon: Instagram, 
    href: 'https://www.instagram.com/raven_icp', 
    label: 'Instagram',
    gradient: 'from-purple-500 via-pink-500 to-orange-500',
    isTikTok: false,
  },
  { 
    icon: TikTokIcon, 
    href: 'https://www.tiktok.com/@the.raven.project', 
    label: 'TikTok',
    gradient: 'from-black to-gray-800',
    isTikTok: true,
  },
  { 
    icon: Twitter, 
    href: 'https://x.com/ravenicp', 
    label: 'Twitter/X',
    gradient: 'from-blue-400 to-blue-600',
    isTikTok: false,
  },
  { 
    icon: MessageCircle, 
    href: 'https://oc.app/community/tc7su-iqaaa-aaaaf-bifhq-cai', 
    label: 'OpenChat',
    gradient: 'from-emerald-400 to-emerald-600',
    isTikTok: false,
  },
];

export default function Footer() {
  const [email, setEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setIsSubscribing(true);
    
    // Store locally and log for admin
    try {
      const signups = JSON.parse(localStorage.getItem('newsletter_signups') || '[]');
      signups.push({
        email,
        timestamp: Date.now(),
        source: 'footer',
      });
      localStorage.setItem('newsletter_signups', JSON.stringify(signups));
      
      // Log for admin (would send to raven.icp@gmail.com in production)
      console.log('Newsletter signup:', { email, sendTo: 'raven.icp@gmail.com' });
      
      setSubscribed(true);
      setEmail('');
    } catch (err) {
      console.error('Failed to subscribe:', err);
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <footer className="bg-raven-charcoal border-t border-gold-700/20">
      {/* Newsletter Section */}
      <div className="bg-gradient-to-r from-amber-500/10 via-transparent to-amber-500/10 border-b border-amber-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="text-center lg:text-left">
              <h3 className="text-2xl font-bold text-white mb-2">
                Join Our Mailing List! 📬
              </h3>
              <p className="text-silver-400 max-w-md">
                Get exclusive updates, early access to features, and special offers delivered to your inbox.
              </p>
            </div>
            
            <AnimatePresence mode="wait">
              {subscribed ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-3 px-6 py-4 bg-green-500/10 border border-green-500/30 rounded-xl"
                >
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <span className="text-green-400 font-medium">Thanks for subscribing!</span>
                </motion.div>
              ) : (
                <motion.form
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onSubmit={handleSubscribe}
                  className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto"
                >
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      className="w-full sm:w-80 bg-gray-800 border border-gray-700 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubscribing || !email}
                    className="px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold rounded-xl hover:shadow-lg hover:shadow-amber-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    {isSubscribing ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        Subscribe
                        <Send className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-1">
            <Link to="/" className="flex items-center space-x-3 mb-4">
              <img src={tokenLogo} alt="Raven" className="w-10 h-10" />
              <span className="font-display text-lg font-bold text-gradient-gold">
                The Raven Project
              </span>
            </Link>
            <p className="text-silver-500 text-sm mb-4">
              A unified multi-chain dApp platform built on Internet Computer. 
              NFTs, AI agents, logistics, gaming, and more.
            </p>
            <div className="flex space-x-2">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-2.5 rounded-lg bg-gradient-to-r ${social.gradient} text-white hover:shadow-lg hover:scale-105 transition-all`}
                  aria-label={social.label}
                >
                  {social.isTikTok ? <TikTokIcon /> : <social.icon className="w-5 h-5" />}
                </a>
              ))}
            </div>
          </div>

          {/* Ecosystem */}
          <div>
            <h3 className="font-semibold text-gold-400 mb-4">Ecosystem</h3>
            <ul className="space-y-2">
              {footerLinks.ecosystem.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-silver-500 hover:text-gold-300 transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold text-gold-400 mb-4">Resources</h3>
            <ul className="space-y-2">
              {footerLinks.resources.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-silver-500 hover:text-gold-300 transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Community */}
          <div>
            <h3 className="font-semibold text-gold-400 mb-4">Community</h3>
            <ul className="space-y-2">
              {footerLinks.community.map((link) => (
                <li key={link.name}>
                  {link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-silver-500 hover:text-gold-300 transition-colors text-sm"
                    >
                      {link.name}
                    </a>
                  ) : (
                    <Link
                      to={link.href}
                      className="text-silver-500 hover:text-gold-300 transition-colors text-sm"
                    >
                      {link.name}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold text-gold-400 mb-4">Legal</h3>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-silver-500 hover:text-gold-300 transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="divider-gold mb-8" />

        {/* Bottom */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-silver-600 text-sm">
            © {new Date().getFullYear()} Raven Ecosystem. Built on Internet Computer.
          </p>
          <div className="flex items-center space-x-4">
            <span className="text-xs text-silver-600">Powered by</span>
            <div className="flex items-center space-x-2">
              <img 
                src="https://internetcomputer.org/img/IC_logo_horizontal.svg" 
                alt="Internet Computer" 
                className="h-5 opacity-60 hover:opacity-100 transition-opacity"
              />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}



