/**
 * IC SPICY RWA Co-op Page
 * Flagship Real World Asset (RWA) platform for pepper farming co-op
 * Features: SpicyAI Assistant, Shop, Menu, Live Inventory Control
 * Original site: https://vmcfj-haaaa-aaaao-a4o3q-cai.icp0.io
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Flame, 
  Users, 
  Leaf, 
  ShoppingCart, 
  Bot, 
  Menu as MenuIcon,
  Package,
  MapPin,
  Calendar,
  TrendingUp,
  Award,
  ExternalLink,
  MessageSquare,
  Send,
  Loader2,
  ChevronRight,
  Store,
  Utensils,
  BarChart3,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Globe
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { speakText } from '../../services/voiceService';
import { useFarmStats, useShopProducts, useCollectionNFTs, icSpicyService } from '../../services/icSpicyService';
import { queenBeeService } from '../../services/queenBeeService';
import { IcpayPayButton, IcpaySuccess } from '@ic-pay/icpay-widget/react';
import { Principal } from '@dfinity/principal';
import { ICPAY_PUBLISHABLE_KEY } from '../../services/canisterConfig';
import { parseHarlee } from '../../services/tokenService';
import icSpicyLogo from '../../icspicylogo.PNG';
import spicyBanner from '../../spicy_banner.svg';

const T3KNO_SHOP = 'https://t3kno.shop';
const IC_SPICY_SITE = 'https://vmcfj-haaaa-aaaao-a4o3q-cai.icp0.io';

type MenuItem = {
  id: string;
  category: string;
  name: string;
  price: number;
  description?: string;
  spiceLevel: number;
  inStock: boolean;
  inventory: number;
};

// Real SpicyAI Chat Component with Queen Bee Integration
function SpicyAIChat() {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: "🌶️ Hello! I'm SpicyAI, part of the AXIOM swarm specializing in pepper farming and RWA operations. How can I help you today?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setIsLoading(true);

    try {
      // Call Queen Bee orchestrator for swarm intelligence
      const response = await queenBeeService.processAIRequest({
        query_text: `[IC SPICY context] ${userMessage}`,
        system_prompt: "You are SpicyAI, an expert in rare chili peppers, organic farming, and the IC SPICY RWA co-op. Provide detailed, expert advice on growing, recipes, and nursery operations.",
        context: messages.map(m => ({ role: m.role, content: m.content, timestamp: BigInt(Date.now()) })),
        use_onchain: true,
        use_http_parallel: true
      });

      setMessages(prev => [...prev, { role: 'assistant', content: response.response }]);
      if (voiceEnabled) {
        speakText(response.response);
      }
    } catch (error) {
      console.error('AI error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble connecting to the Hive Mind. Please try again in a moment." }]);
    } finally {
      setIsLoading(false);
    }
  };
// ...

  return (
    <div className="glass rounded-2xl border border-red-500/30 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 p-4 border-b border-red-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={icSpicyLogo} alt="SpicyAI" className="w-10 h-10 rounded-lg" />
            <div>
              <h3 className="font-bold text-white">SpicyAI Assistant</h3>
              <p className="text-xs text-red-400">Powered by RavenAI</p>
            </div>
          </div>
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`p-2 rounded-lg ${voiceEnabled ? 'bg-red-500/20 text-red-400' : 'bg-gray-800 text-gray-500'}`}
          >
            🔊
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="h-64 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[95%] sm:max-w-[80%] p-3 rounded-xl ${
              msg.role === 'user' 
                ? 'bg-red-500/20 text-white' 
                : 'bg-gray-800 text-gray-200'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 p-3 rounded-xl">
              <Loader2 className="w-5 h-5 animate-spin text-red-400" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about peppers, recipes, farming..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none"
          />
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Menu Component
function SpicyMenu({ items }: { items: MenuItem[] }) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'All', icon: '🍽️' },
    { id: 'appetizer', label: 'Appetizers', icon: '🥟' },
    { id: 'main', label: 'Mains', icon: '🍔' },
    { id: 'sauce', label: 'Sauces', icon: '🌶️' },
    { id: 'drink', label: 'Drinks', icon: '🥤' },
  ];

  const filteredItems = selectedCategory === 'all' 
    ? items 
    : items.filter(item => item.category === selectedCategory);

  const getSpiceEmoji = (level: number) => '🌶️'.repeat(level);

  return (
    <div>
      {/* Category Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap ${
              selectedCategory === cat.id
                ? 'bg-red-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {/* Menu Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredItems.map((item) => (
          <div key={item.id} className="glass rounded-xl p-4 border border-gray-800 hover:border-red-500/30 transition-all">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-bold text-white">{item.name}</h4>
                <p className="text-gray-400 text-sm">{item.description}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-red-400">${item.price.toFixed(2)}</p>
                <p className="text-xs text-gray-500">{getSpiceEmoji(item.spiceLevel)}</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3">
              <span className={`px-2 py-1 rounded-full text-xs ${
                item.inStock ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {item.inStock ? `${item.inventory} in stock` : 'Out of stock'}
              </span>
              <button 
                className={`px-3 py-1 rounded-lg text-sm ${
                  item.inStock 
                    ? 'bg-red-500 text-white hover:bg-red-600' 
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
                disabled={!item.inStock}
              >
                Add to Order
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Inventory Control Component
function InventoryControl({ products }: { products: any[] }) {
  return (
    <div className="glass rounded-2xl p-6 border border-red-500/20">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Package className="w-5 h-5 text-red-400" />
          Live Inventory
        </h3>
        <span className="text-xs text-gray-500">Updated in real-time</span>
      </div>

      <div className="space-y-3">
        {products.map((item) => (
          <div key={item.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
            <div>
              <p className="font-medium text-white">{item.name}</p>
              <p className="text-[10px] text-gray-500">
                Category: {item.category}
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold text-white">{item.inventory} units</p>
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                item.in_stock ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {item.in_stock ? 'In Stock' : 'Out of Stock'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Main Page Component
export default function ICSpicyPage() {
  const { isAuthenticated, identity } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'home' | 'menu' | 'shop' | 'collectibles' | 'farm' | 'ai'>('home');
  
// Real Farm Stats fetched from backend
  const { stats: farmStatsData, isLoading: farmStatsLoading } = useFarmStats(identity || undefined);
  
  // Real Shop Products fetched from backend
  const { products: backendProducts, isLoading: productsLoading } = useShopProducts('all', identity || undefined);
  
  // Real Collection NFTs fetched from backend
  const { nfts: collectionNFTs, isLoading: collectionLoading, refresh: refreshCollection } = useCollectionNFTs(identity || undefined);
  
  // NFT Generator State
  const [generatedNFT, setGeneratedNFT] = useState<any | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isMintingNFT, setIsMintingNFT] = useState(false);
  const [mintSuccess, setMintSuccess] = useState<string | null>(null);
  const [isBuyingNFT, setIsBuyingNFT] = useState<bigint | null>(null);
  const [selectedNFT, setSelectedNFT] = useState<any | null>(null);

  // Check for OG NFT for discount display
  const [hasOGDiscount, setHasOGDiscount] = useState(false);
  const [userTokens, setUserTokens] = useState<bigint[]>([]);
  const [votingPower, setVotingPower] = useState<bigint>(BigInt(0));

  useEffect(() => {
    const checkOG = async () => {
      if (isAuthenticated && identity) {
        try {
          const principal = identity.getPrincipal();
          const tokens = await icSpicyService.getUserTokens(principal);
          setUserTokens(tokens);
          
          const power = await icSpicyService.getVotingPower(principal);
          setVotingPower(power);
          
          // Check if any of these tokens are OG
          let foundOG = false;
          for (const tokenId of tokens) {
            const nftInfo = await icSpicyService.getNFTInfo(tokenId);
            if (nftInfo?.is_og) {
              foundOG = true;
              break;
            }
          }
          setHasOGDiscount(foundOG);
        } catch (e) {
          console.error('Failed to check OG status:', e);
        }
      }
    };
    checkOG();
  }, [isAuthenticated, identity]);

  const handleGenerateNFT = async () => {
    setIsGenerating(true);
    setGeneratedNFT(null);
    try {
      const result = await icSpicyService.generateNFT();
      if ('Ok' in result) {
        setGeneratedNFT(result.Ok);
      } else {
        alert(`Generation failed: ${result.Err}`);
      }
    } catch (error) {
      console.error('Generation error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMintNFT = async () => {
    if (!isAuthenticated) return;
    setIsMintingNFT(true);
    try {
      const result = await icSpicyService.mintNFT();
      if ('Ok' in result) {
        setMintSuccess(`Successfully minted NFT #${result.Ok.token_ids[0]}!`);
        setTimeout(() => setMintSuccess(null), 5000);
      } else {
        alert(`Minting failed: ${result.Err}`);
      }
    } catch (error) {
      console.error('Minting error:', error);
    } finally {
      setIsMintingNFT(false);
    }
  };

  const handleBuyCollectionNFT = async (tokenId: bigint, fromToken: any, paymentAmount: bigint, txHash?: string) => {
    if (!isAuthenticated) return;
    setIsBuyingNFT(tokenId);
    try {
      const result = await icSpicyService.buyCollectionNFT(tokenId, fromToken, paymentAmount, txHash);
      if ('Ok' in result) {
        alert(`Successfully purchased NFT #${tokenId}!`);
        refreshCollection();
      } else {
        alert(`Purchase failed: ${result.Err}`);
      }
    } catch (error) {
      console.error('Purchase error:', error);
    } finally {
      setIsBuyingNFT(null);
    }
  };

  // Cart State
  const [cart, setCart] = useState<{ id: string; name: string; price: number; quantity: number }[]>([]);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'address' | 'payment' | 'success'>('cart');
  const [shippingAddress, setShippingAddress] = useState('');
  const [orderId, setOrderId] = useState<bigint | null>(null);

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { id: product.id, name: product.name, price: product.price_usd, quantity: 1 }];
    });
    setActiveTab('shop');
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleCheckout = async () => {
    if (!isAuthenticated) return;
    setIsCheckingOut(true);
    try {
      const items = cart.map(item => [item.id, item.quantity] as [string, number]);
      // Send the original total, the canister will verify OG status and apply discount on-chain
      const result = await icSpicyService.placeOrder(items, shippingAddress, cartTotal);
      if ('Ok' in result) {
        setOrderId(result.Ok);
        setCheckoutStep('success');
        setCart([]);
      } else {
        alert(`Checkout failed: ${result.Err}`);
      }
    } catch (error) {
      console.error('Checkout error:', error);
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Convert backend stats into the UI shape used by this page
  const farmStats: { pepperPlants: number; members: number; harvestYield: string; co2Offset: string } = farmStatsData ? {
    pepperPlants: farmStatsData.totalPlants,
    members: farmStatsData.members || 0,
    harvestYield: farmStatsData.harvestYield || '--',
    co2Offset: farmStatsData.co2Offset || '--',
  } : {
    pepperPlants: 0,
    members: 0,
    harvestYield: '--',
    co2Offset: '--',
  };

  const tabs = [
    { id: 'home', label: 'Home', icon: Flame },
    { id: 'shop', label: 'Shop', icon: Store },
    { id: 'collectibles', label: 'Collectibles', icon: Award },
    { id: 'farm', label: 'Farm', icon: Leaf },
    { id: 'ai', label: 'SpicyAI', icon: Bot },
  ];

  return (
    <div className="min-h-screen pt-20 pb-12">
      {/* Hero Banner */}
      <section className="relative h-64 md:h-80 overflow-hidden">
        <img 
          src={spicyBanner} 
          alt="IC SPICY" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <motion.img 
              src={icSpicyLogo} 
              alt="IC SPICY Logo" 
              className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-4 rounded-2xl shadow-2xl"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">IC SPICY</h1>
            <p className="text-red-400 text-lg">RWA Co-op | Fresh Florida Peppers 🌶️</p>
            
            {/* Visit Original Site Button */}
            <a
              href={IC_SPICY_SITE}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-4 px-6 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
            >
              Visit Original Site
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Features Bar - Real features, no fake stats */}
      <section className="py-6 bg-gradient-to-r from-red-500/10 via-orange-500/10 to-red-500/10 border-y border-red-500/20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-3xl mb-1">🌶️</div>
              <div className="text-sm text-gray-400">Fresh Pepper Pods</div>
            </div>
            <div>
              <div className="text-3xl mb-1">🌱</div>
              <div className="text-sm text-gray-400">FL Nursery Plants</div>
            </div>
            <div>
              <div className="text-3xl mb-1">🌰</div>
              <div className="text-sm text-gray-400">Authentic Seeds</div>
            </div>
            <div>
              <div className="text-3xl mb-1">🧂</div>
              <div className="text-sm text-gray-400">Spice Blends</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-6xl mx-auto px-4 py-8">
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Home Tab */}
            {activeTab === 'home' && (
              <div className="space-y-8">
                {/* About Section */}
                <div className="glass rounded-2xl p-6 md:p-8 border border-red-500/20">
                  <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                    <Flame className="w-6 h-6 text-red-400" />
                    About IC SPICY RWA Co-op
                  </h2>
                  <p className="text-gray-400 mb-6 leading-relaxed">
                    IC SPICY is a pioneering Real World Asset (RWA) cooperative that bridges blockchain 
                    technology with sustainable pepper farming. Our 5,000 members collectively own and 
                    govern 2,500 pepper plants, earning dividends in $HARLEE tokens while supporting 
                    regenerative agriculture practices.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                      <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                        <Leaf className="w-4 h-4 text-green-400" />
                        Sustainable Farming
                      </h4>
                      <p className="text-gray-400 text-sm">
                        100% organic, regenerative practices with blockchain-verified supply chain.
                      </p>
                    </div>
                    <div className="p-4 bg-orange-500/10 rounded-xl border border-orange-500/20">
                      <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                        <Users className="w-4 h-4 text-orange-400" />
                        Community Owned
                      </h4>
                      <p className="text-gray-400 text-sm">
                        SNS governance allows members to vote on co-op decisions.
                      </p>
                    </div>
                    <div className="p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
                      <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-yellow-400" />
                        $HARLEE Rewards
                      </h4>
                      <p className="text-gray-400 text-sm">
                        Quarterly dividends paid in $HARLEE tokens based on harvest yields.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Links */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <a
                    href={T3KNO_SHOP}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="glass rounded-2xl p-6 border border-red-500/20 hover:border-red-500/50 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                        <ShoppingCart className="w-6 h-6 text-red-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-white mb-1">Shop Spicy Merch</h3>
                        <p className="text-gray-400 text-sm">Hot sauce, apparel, and more at T3kno-Logic</p>
                      </div>
                      <ExternalLink className="w-5 h-5 text-red-400 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </a>

                  <a
                    href={IC_SPICY_SITE}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="glass rounded-2xl p-6 border border-orange-500/20 hover:border-orange-500/50 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                        <Flame className="w-6 h-6 text-orange-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-white mb-1">IC SPICY Original Site</h3>
                        <p className="text-gray-400 text-sm">Visit the full IC SPICY RWA platform</p>
                      </div>
                      <ExternalLink className="w-5 h-5 text-orange-400 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </a>
                </div>

                {/* SpicyAI Preview */}
                <SpicyAIChat />
              </div>
            )}

            {/* Collectibles Tab - NFT Generator & Collection */}
            {activeTab === 'collectibles' && (
              <div className="space-y-12">
                <div className="text-center max-w-2xl mx-auto">
                  <h2 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-3">
                    <Award className="w-8 h-8 text-yellow-500" />
                    IC Spicy Genesis Generator
                  </h2>
                  <p className="text-gray-400">
                    Generate unique, on-chain collectible seeds and plants. Each generation uses our swarm intelligence to combine rare traits.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  {/* ... (existing generator UI) */}
                </div>

                {/* Pre-minted Collection Section */}
                <div className="pt-12 border-t border-gray-800">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-2xl font-bold text-white">Genesis Collection</h3>
                      <p className="text-gray-400">888 Unique collectibles with rare OG status</p>
                    </div>
                    <div className="flex gap-4">
                      <div className="px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                        <p className="text-xs text-yellow-500">100 OG Slots</p>
                        <p className="text-lg font-bold text-white">20% OFF Store</p>
                      </div>
                    </div>
                  </div>

                  {collectionLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-red-500" />
                    </div>
                  ) : collectionNFTs.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {collectionNFTs.map((nft) => (
                        <div key={nft.token_id.toString()} className="glass rounded-xl p-3 border border-gray-800 hover:border-red-500/30 transition-all group">
                          <div className="aspect-square bg-gray-900 rounded-lg mb-3 overflow-hidden relative">
                            {nft.composite_image && nft.composite_image[0] ? (
                              <img 
                                src={`data:image/png;base64,${btoa(String.fromCharCode.apply(null, Array.from(nft.composite_image[0])))}`} 
                                alt={`NFT #${nft.token_id}`} 
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-3xl">🌶️</div>
                            )}
                            {nft.is_og && (
                              <div className="absolute top-2 left-2 bg-yellow-500 text-black text-[8px] font-black px-1.5 py-0.5 rounded shadow-lg animate-pulse">
                                OG
                              </div>
                            )}
                            <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[8px] text-gray-400">
                              #{nft.token_id.toString()}
                            </div>
                          </div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-white">${nft.price_usd[0]?.toFixed(2)}</span>
                            <span className="text-[8px] text-gray-500">RARITY: {(nft.rarity_score * 100).toFixed(0)}%</span>
                          </div>
                          
                          <button 
                            onClick={() => setSelectedNFT(nft)}
                            className="w-full mb-2 py-1 bg-gray-800 text-white text-[8px] font-bold rounded hover:bg-gray-700 transition-colors"
                          >
                            VIEW UTILITY
                          </button>

                          {nft.price_usd[0] === 100 ? (
                            <IcpayPayButton
                              config={{
                                publishableKey: ICPAY_PUBLISHABLE_KEY,
                                amountUsd: 100,
                                buttonLabel: 'BUY OG NFT',
                                theme: 'dark',
                                tokenShortcodes: ['ic_icp', 'ic_ckbtc', 'ic_cketh', 'ic_ckusdc', 'ic_harlee'],
                              }}
                              onSuccess={async (detail: IcpaySuccess) => {
                                // Extract tx hash from detail if available
                                const txHash =
                                  (detail as any).transactionHash ??
                                  (detail as any).transaction_hash ??
                                  '';
                                await handleBuyCollectionNFT(nft.token_id, { 'ICP': null }, BigInt(0), txHash); 
                              }}
                            />
                          ) : (
                            <button 
                              onClick={() => handleBuyCollectionNFT(nft.token_id, { 'HARLEE': null }, BigInt(parseHarlee('250')))}
                              disabled={isBuyingNFT === nft.token_id}
                              className="w-full py-1.5 bg-red-500 text-white text-[10px] font-bold rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-1"
                            >
                              {isBuyingNFT === nft.token_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShoppingCart className="w-3 h-3" />}
                              BUY NOW
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 glass rounded-2xl">
                      <Package className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                      <p className="text-gray-400 italic">No NFTs available in the collection yet.</p>
                      {identity && (
                        <button 
                          onClick={async () => {
                            for (let i = 0; i < 888; i += 10) {
                              const count = Math.min(10, 888 - i);
                              await icSpicyService.preMintCollection(BigInt(i), BigInt(count));
                              refreshCollection();
                            }
                          }}
                          className="mt-4 px-6 py-2 bg-gray-800 text-white rounded-xl hover:bg-gray-700 text-xs"
                        >
                          Admin: Pre-mint Collection (888 in batches)
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* NFT Utility Modal */}
                <AnimatePresence>
                  {selectedNFT && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                      onClick={() => setSelectedNFT(null)}
                    >
                      <motion.div 
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 20 }}
                        className="glass max-w-lg w-full p-8 rounded-3xl border border-red-500/30 overflow-hidden relative"
                        onClick={e => e.stopPropagation()}
                      >
                        <div className="flex gap-6 mb-8">
                          <div className="w-32 h-32 rounded-2xl overflow-hidden bg-gray-900 border border-white/10">
                            {selectedNFT.composite_image && selectedNFT.composite_image[0] ? (
                              <img 
                                src={`data:image/png;base64,${btoa(String.fromCharCode.apply(null, Array.from(selectedNFT.composite_image[0])))}`} 
                                alt="Selected NFT" 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-4xl">🌶️</div>
                            )}
                          </div>
                          <div>
                            <h3 className="text-2xl font-bold text-white mb-1">NFT #{selectedNFT.token_id.toString()}</h3>
                            <div className="flex gap-2 mb-3">
                              {selectedNFT.is_og && (
                                <span className="bg-yellow-500 text-black text-[10px] font-black px-2 py-0.5 rounded">OG SERIES</span>
                              )}
                              <span className="bg-gray-800 text-gray-400 text-[10px] px-2 py-0.5 rounded">RARITY: {(selectedNFT.rarity_score * 100).toFixed(1)}%</span>
                            </div>
                            <p className="text-sm text-gray-400">Fixed Cost: ${selectedNFT.price_usd[0]?.toFixed(2)} USD</p>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h4 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/5 pb-2">
                            <Globe className="w-4 h-4 text-blue-400" />
                            Multichain Utility
                          </h4>
                          <div className="grid grid-cols-1 gap-2">
                            <div className="p-3 bg-white/5 rounded-xl">
                              <p className="text-[10px] text-gray-500 uppercase">Ethereum (ERC-721)</p>
                              <code className="text-xs text-blue-300 break-all">{selectedNFT.multichain_metadata.eth_contract[0]}</code>
                            </div>
                            <div className="p-3 bg-white/5 rounded-xl">
                              <p className="text-[10px] text-gray-500 uppercase">Solana (Metaplex)</p>
                              <code className="text-xs text-purple-300 break-all">{selectedNFT.multichain_metadata.sol_mint[0]}</code>
                            </div>
                            <div className="p-3 bg-white/5 rounded-xl">
                              <p className="text-[10px] text-gray-500 uppercase">Bitcoin (Ordinals)</p>
                              <code className="text-xs text-orange-300 break-all">{selectedNFT.multichain_metadata.btc_inscription[0]}</code>
                            </div>
                          </div>

                          <h4 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/5 pb-2 mt-6">
                            <Award className="w-4 h-4 text-amber-400" />
                            Lifetime Privileges
                          </h4>
                          <ul className="space-y-2">
                            <li className="flex items-center gap-2 text-xs text-gray-300">
                              <CheckCircle2 className="w-3 h-3 text-green-500" />
                              20% Lifetime Discount on IC SPICY Products
                            </li>
                            <li className="flex items-center gap-2 text-xs text-gray-300">
                              <CheckCircle2 className="w-3 h-3 text-green-500" />
                              {selectedNFT.is_og ? '10x Voting Weight in IC SPICY DAO' : '1x Voting Weight in IC SPICY DAO'}
                            </li>
                            <li className="flex items-center gap-2 text-xs text-gray-300">
                              <CheckCircle2 className="w-3 h-3 text-green-500" />
                              Verified Florida Nursery Asset
                            </li>
                          </ul>
                        </div>

                        <button 
                          onClick={() => setSelectedNFT(null)}
                          className="mt-8 w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200"
                        >
                          CLOSE
                        </button>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Shop Tab - Real RWA Products */}
            {activeTab === 'shop' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Product Catalog */}
                <div className="lg:col-span-2 space-y-6">
                {/* Category Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {[
                    { id: 'all', label: 'All Products', icon: '🛒' },
                      { id: 'Pods', label: 'Fresh Pepper Pods', icon: '🌶️' },
                      { id: 'Plants', label: 'Nursery Plants', icon: '🌱' },
                      { id: 'Seeds', label: 'Seeds', icon: '🌰' },
                      { id: 'Blends', label: 'Spice Blends', icon: '🧂' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      className="px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap bg-gray-800 text-gray-400 hover:bg-red-500 hover:text-white transition-all"
                    >
                      {cat.icon} {cat.label}
                    </button>
                  ))}
                </div>

                {/* Florida Registered Nursery Badge */}
                <div className="glass rounded-xl p-4 border border-green-500/30 bg-green-500/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                      <Leaf className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className="font-bold text-white">Florida Registered Nursery</p>
                        <p className="text-sm text-gray-400">Cert #4802341 - Real organic heirloom peppers</p>
                    </div>
                  </div>
                </div>

                {/* Products Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {productsLoading ? (
                      <div className="col-span-full flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
                      </div>
                    ) : backendProducts.length > 0 ? (
                      backendProducts.map((product) => (
                    <div key={product.id} className="glass rounded-xl p-4 border border-gray-800 hover:border-red-500/30 transition-all">
                          <div className="h-32 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-lg mb-3 flex items-center justify-center relative overflow-hidden">
                            {product.image_url?.[0] ? (
                              <img src={product.image_url[0]} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-5xl opacity-50">🌶️</span>
                            )}
                            {!product.in_stock && (
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                <span className="text-white font-bold bg-red-500 px-3 py-1 rounded-full text-xs">SOLD OUT</span>
                      </div>
                            )}
                          </div>
                          <h4 className="font-bold text-white mb-1">{product.name}</h4>
                          <p className="text-gray-400 text-xs mb-3 line-clamp-2">{product.description}</p>
                      <div className="flex items-center justify-between">
                            <span className="text-xl font-bold text-red-400">${product.price_usd.toFixed(2)}</span>
                            <button 
                              onClick={() => addToCart(product)}
                              disabled={!product.in_stock}
                              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                                product.in_stock 
                                  ? 'bg-red-500 text-white hover:bg-red-600' 
                                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                              }`}
                            >
                          Add to Cart
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full text-center py-12 glass rounded-xl">
                        <p className="text-gray-400">No products available in this category yet.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Shopping Cart / Checkout */}
                <div className="space-y-6">
                  <div className="glass rounded-2xl p-6 border border-red-500/20 sticky top-24">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5 text-red-400" />
                      Checkout
                    </h3>

                    {checkoutStep === 'cart' && (
                      <div className="space-y-4">
                        {cart.length > 0 ? (
                          <>
                            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                              {cart.map((item) => (
                                <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-800">
                                  <div>
                                    <p className="text-white font-medium text-sm">{item.name}</p>
                                    <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-red-400 font-bold text-sm">${(item.price * item.quantity).toFixed(2)}</p>
                                    <button 
                                      onClick={() => removeFromCart(item.id)}
                                      className="text-[10px] text-gray-500 hover:text-red-400 underline"
                                    >
                                      Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                            <div className="pt-4 border-t border-gray-700">
                              <div className="flex justify-between items-center mb-6">
                                <span className="text-gray-400 font-medium">Total USD</span>
                                <span className="text-2xl font-bold text-white">${cartTotal.toFixed(2)}</span>
                              </div>
                              <button 
                                onClick={() => setCheckoutStep('address')}
                                className="w-full py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors"
                              >
                                Continue to Shipping
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-8">
                            <Package className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                            <p className="text-gray-500 text-sm">Your cart is empty</p>
                          </div>
                        )}
                      </div>
                    )}

                    {checkoutStep === 'address' && (
                      <div className="space-y-4">
                        <button 
                          onClick={() => setCheckoutStep('cart')}
                          className="text-xs text-red-400 mb-2 hover:underline"
                        >
                          ← Back to Cart
                        </button>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Shipping Address</label>
                          <textarea 
                            value={shippingAddress}
                            onChange={(e) => setShippingAddress(e.target.value)}
                            placeholder="Enter your full shipping address..."
                            className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-white text-sm focus:border-red-500 outline-none h-32"
                          />
                        </div>
                        <button 
                          disabled={!shippingAddress.trim()}
                          onClick={() => setCheckoutStep('payment')}
                          className="w-full py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 disabled:opacity-50"
                        >
                          Review & Pay
                        </button>
                      </div>
                    )}

                    {checkoutStep === 'payment' && (
                      <div className="space-y-4">
                        <button 
                          onClick={() => setCheckoutStep('address')}
                          className="text-xs text-red-400 mb-2 hover:underline"
                        >
                          ← Back to Shipping
                        </button>
                        <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                          <p className="text-xs text-gray-400 mb-2">Order Summary</p>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-300">Subtotal</span>
                            <span className="text-white font-bold">${cartTotal.toFixed(2)}</span>
                          </div>
                          {hasOGDiscount && (
                            <div className="flex justify-between text-sm mb-1 text-green-400">
                              <span className="font-medium flex items-center gap-1">
                                <Award className="w-3 h-3" /> OG Discount (20%)
                              </span>
                              <span className="font-bold">-${(cartTotal * 0.2).toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-300">Shipping</span>
                            <span className="text-white font-bold">$7.99</span>
                          </div>
                          <div className="pt-2 mt-2 border-t border-gray-700 flex justify-between font-bold">
                            <span className="text-white">Total</span>
                            <span className="text-red-400">
                              ${(hasOGDiscount ? cartTotal * 0.8 + 7.99 : cartTotal + 7.99).toFixed(2)}
                            </span>
                          </div>
                        </div>
                        <div className="p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20 flex gap-2">
                          <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                          <p className="text-[10px] text-yellow-200/70">
                            Payments are processed via $HARLEE or ICP. You will be prompted to sign the transaction.
                          </p>
                        </div>
                        <button 
                          onClick={handleCheckout}
                          disabled={isCheckingOut}
                          className="w-full py-4 bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-red-500/20 transition-all flex items-center justify-center gap-2"
                  >
                          {isCheckingOut ? <Loader2 className="w-5 h-5 animate-spin" /> : <Flame className="w-5 h-5" />}
                          PAY WITH CRYPTO
                        </button>
                      </div>
                    )}

                    {checkoutStep === 'success' && (
                      <div className="text-center py-8 space-y-4">
                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                          <CheckCircle2 className="w-10 h-10 text-green-400" />
                        </div>
                        <h4 className="text-xl font-bold text-white">Order Confirmed!</h4>
                        <p className="text-gray-400 text-sm">
                          Thank you for supporting our RWA pepper co-op. Your order ID is:
                        </p>
                        <code className="block p-2 bg-gray-800 rounded-lg text-red-400 text-xs">
                          {orderId?.toString()}
                        </code>
                        <button 
                          onClick={() => setCheckoutStep('cart')}
                          className="w-full py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700"
                        >
                          Return to Shop
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Farm Tab */}
            {activeTab === 'farm' && (
              <div className="space-y-6">
                <div className="glass rounded-2xl p-6 md:p-8 border border-green-500/20">
                  <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                    <Leaf className="w-6 h-6 text-green-400" />
                    Farm Dashboard
                  </h2>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="p-4 bg-green-500/10 rounded-xl text-center">
                      <p className="text-3xl font-bold text-green-400">
                        {farmStatsLoading ? '...' : farmStats.pepperPlants.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-400">Pepper Plants</p>
                    </div>
                    <div className="p-4 bg-red-500/10 rounded-xl text-center">
                      <p className="text-3xl font-bold text-red-400">
                        {farmStatsLoading ? '...' : farmStats.members.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-400">Members</p>
                    </div>
                    <div className="p-4 bg-yellow-500/10 rounded-xl text-center">
                      <p className="text-3xl font-bold text-yellow-400">
                        {farmStatsLoading ? '...' : farmStats.harvestYield}
                      </p>
                      <p className="text-sm text-gray-400">Harvest Yield</p>
                    </div>
                    <div className="p-4 bg-blue-500/10 rounded-xl text-center">
                      <p className="text-3xl font-bold text-blue-400">
                        {farmStatsLoading ? '...' : farmStats.co2Offset}
                      </p>
                      <p className="text-sm text-gray-400">CO₂ Offset</p>
                    </div>
                  </div>

                  {isAuthenticated && (
                    <div className="mb-8 p-6 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20 rounded-2xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <Award className="w-5 h-5 text-amber-400" />
                            DAO Governance
                          </h3>
                          <p className="text-sm text-gray-400">Your current voting power based on NFT holdings</p>
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-bold text-amber-400">{votingPower.toString()}</p>
                          <p className="text-[10px] text-gray-500 uppercase tracking-widest">Voting Weight</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Map Placeholder */}
                  <div className="bg-gray-800 rounded-xl h-64 flex items-center justify-center border border-gray-700">
                    <div className="text-center">
                      <MapPin className="w-12 h-12 text-red-400 mx-auto mb-2" />
                      <p className="text-gray-400">Interactive Farm Map</p>
                      <p className="text-gray-600 text-sm">View your pepper plant locations</p>
                    </div>
                  </div>
                </div>

                {/* Inventory Control */}
                <InventoryControl products={backendProducts} />
              </div>
            )}

            {/* AI Tab */}
            {activeTab === 'ai' && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-white mb-2">SpicyAI Assistant</h2>
                  <p className="text-gray-400">Your AI-powered pepper expert, recipes, and farm advisor</p>
                </div>
                <SpicyAIChat />
                
                {/* AI Features */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { icon: '🌶️', title: 'Pepper Knowledge', desc: 'Scoville ratings, growing tips, and varieties' },
                    { icon: '🍳', title: 'Recipe Generator', desc: 'Get custom spicy recipes based on ingredients' },
                    { icon: '🌱', title: 'Farm Advisor', desc: 'Planting schedules and harvest predictions' },
                  ].map((feature, i) => (
                    <div key={i} className="glass rounded-xl p-4 border border-red-500/20">
                      <span className="text-3xl mb-2 block">{feature.icon}</span>
                      <h4 className="font-bold text-white mb-1">{feature.title}</h4>
                      <p className="text-gray-400 text-sm">{feature.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </section>
    </div>
  );
}

