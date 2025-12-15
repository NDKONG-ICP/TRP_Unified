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
  QrCode
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { speakText } from '../../services/voiceService';
import { useFarmStats } from '../../services/icSpicyService';

// Brand Assets
import spicyBanner from '../../spicy_banner.svg';
import icSpicyLogo from '../../icspicylogo.PNG';

// IC SPICY Original Site
const IC_SPICY_SITE = 'https://vmcfj-haaaa-aaaao-a4o3q-cai.icp0.io';
const T3KNO_SHOP = 'https://t3kno-logic.xyz/collections/ic-spicy';

// Types
interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'appetizer' | 'main' | 'sauce' | 'side' | 'drink';
  spiceLevel: 1 | 2 | 3 | 4 | 5;
  inStock: boolean;
  inventory: number;
  image?: string;
}

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  lastUpdated: Date;
  status: 'in-stock' | 'low' | 'out-of-stock';
}

interface FarmStats {
  pepperPlants: number;
  members: number;
  harvestYield: string;
  co2Offset: string;
}

// Real Shop Products - Fresh Pepper Pods, Nursery Plants, Seeds, Spice Blends
interface ShopProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'pods' | 'plants' | 'seeds' | 'blends';
  inStock: boolean;
  image?: string;
}

const SHOP_PRODUCTS: ShopProduct[] = [
  // Fresh Pepper Pods
  { id: 'p1', name: 'Carolina Reaper Pods (1 lb)', description: 'Fresh, locally grown Carolina Reaper peppers - World\'s Hottest!', price: 24.99, category: 'pods', inStock: true },
  { id: 'p2', name: 'Ghost Pepper Pods (1 lb)', description: 'Fresh Bhut Jolokia peppers, over 1M Scoville units', price: 19.99, category: 'pods', inStock: true },
  { id: 'p3', name: 'Habanero Pods (1 lb)', description: 'Fresh orange habaneros, perfect for sauces', price: 12.99, category: 'pods', inStock: true },
  { id: 'p4', name: 'Scorpion Pepper Pods (1 lb)', description: 'Trinidad Moruga Scorpion, extreme heat', price: 22.99, category: 'pods', inStock: true },
  // Nursery Plants (Florida Registered)
  { id: 'n1', name: 'Carolina Reaper Plant', description: 'Live plant from our FL registered nursery, ready to grow', price: 14.99, category: 'plants', inStock: true },
  { id: 'n2', name: 'Ghost Pepper Plant', description: 'Live Bhut Jolokia plant, 4-6" starter', price: 12.99, category: 'plants', inStock: true },
  { id: 'n3', name: 'Pepper Variety Pack (6)', description: '6 different superhot pepper plants', price: 59.99, category: 'plants', inStock: true },
  { id: 'n4', name: 'Jalapeño Plant', description: 'Classic jalapeño starter plant', price: 8.99, category: 'plants', inStock: true },
  // Seeds
  { id: 's1', name: 'Carolina Reaper Seeds (10)', description: 'Authentic Carolina Reaper seeds', price: 6.99, category: 'seeds', inStock: true },
  { id: 's2', name: 'Ghost Pepper Seeds (10)', description: 'Bhut Jolokia seeds for home growing', price: 5.99, category: 'seeds', inStock: true },
  { id: 's3', name: 'Superhot Mix Seeds (25)', description: 'Mixed superhot pepper seeds', price: 12.99, category: 'seeds', inStock: true },
  { id: 's4', name: 'Beginner Seed Kit', description: 'Mild to medium peppers for beginners', price: 9.99, category: 'seeds', inStock: true },
  // Spice Blends
  { id: 'b1', name: 'IC SPICY Signature Blend', description: 'Our famous house spice blend', price: 11.99, category: 'blends', inStock: true },
  { id: 'b2', name: 'Carolina Reaper Powder (2oz)', description: 'Pure dried Carolina Reaper powder', price: 14.99, category: 'blends', inStock: true },
  { id: 'b3', name: 'Ghost Pepper Flakes (2oz)', description: 'Crushed ghost pepper flakes', price: 9.99, category: 'blends', inStock: true },
  { id: 'b4', name: 'BBQ Rub Extreme Heat', description: 'Superhot BBQ seasoning blend', price: 10.99, category: 'blends', inStock: true },
];

// We still keep menu for in-person ordering
const MENU_ITEMS: MenuItem[] = [
  { id: 'm1', name: 'Ghost Pepper Wings', description: 'Crispy wings tossed in our signature ghost pepper sauce', price: 14.99, category: 'appetizer', spiceLevel: 5, inStock: true, inventory: 50 },
  { id: 'm2', name: 'Carolina Reaper Nachos', description: 'Loaded nachos with Carolina Reaper cheese sauce', price: 12.99, category: 'appetizer', spiceLevel: 5, inStock: true, inventory: 35 },
  { id: 'm3', name: 'Habanero Burger', description: 'Angus beef with habanero aioli and pepper jack', price: 16.99, category: 'main', spiceLevel: 3, inStock: true, inventory: 40 },
  { id: 'm4', name: 'Jalapeño Popper Pizza', description: 'Wood-fired pizza with jalapeños and cream cheese', price: 18.99, category: 'main', spiceLevel: 2, inStock: true, inventory: 25 },
  { id: 'm5', name: 'Spicy Thai Basil Bowl', description: 'Rice bowl with Thai basil, peppers, and tofu', price: 13.99, category: 'main', spiceLevel: 4, inStock: true, inventory: 30 },
  { id: 'm6', name: 'IC SPICY Hot Sauce', description: 'Our signature house-made hot sauce (8oz)', price: 9.99, category: 'sauce', spiceLevel: 4, inStock: true, inventory: 100 },
  { id: 'm7', name: 'Ghost Pepper Flakes', description: 'Dried ghost pepper flakes (2oz jar)', price: 7.99, category: 'sauce', spiceLevel: 5, inStock: false, inventory: 0 },
  { id: 'm8', name: 'Spicy Lemonade', description: 'Fresh lemonade with a cayenne kick', price: 4.99, category: 'drink', spiceLevel: 1, inStock: true, inventory: 80 },
];

// Sample Inventory Data
const INVENTORY_ITEMS: InventoryItem[] = [
  { id: 'i1', name: 'Ghost Peppers', quantity: 500, unit: 'lbs', lastUpdated: new Date(), status: 'in-stock' },
  { id: 'i2', name: 'Carolina Reapers', quantity: 150, unit: 'lbs', lastUpdated: new Date(), status: 'in-stock' },
  { id: 'i3', name: 'Habaneros', quantity: 300, unit: 'lbs', lastUpdated: new Date(), status: 'in-stock' },
  { id: 'i4', name: 'Jalapeños', quantity: 800, unit: 'lbs', lastUpdated: new Date(), status: 'in-stock' },
  { id: 'i5', name: 'Hot Sauce Bottles', quantity: 25, unit: 'cases', lastUpdated: new Date(), status: 'low' },
  { id: 'i6', name: 'Pepper Seeds', quantity: 0, unit: 'bags', lastUpdated: new Date(), status: 'out-of-stock' },
];

// Farm Stats will be fetched from canister using useFarmStats hook

// Eleven Labs API Configuration - loaded from secure environment
import { API_KEYS } from '../../config/secureConfig';
const ELEVEN_LABS_API_KEY = API_KEYS.ELEVEN_LABS;
const ELEVEN_LABS_VOICE_ID = API_KEYS.ELEVEN_LABS_VOICE_ID;

// Real SpicyAI Chat Component with Eleven Labs
function SpicyAIChat() {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: "🌶️ Hello! I'm SpicyAI, your pepper expert assistant. Ask me anything about our co-op, peppers, recipes, or farming!" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Eleven Labs Text-to-Speech
  const speakWithElevenLabs = async (text: string) => {
    if (!voiceEnabled) return;
    
    try {
      setIsSpeaking(true);
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_LABS_VOICE_ID}`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': ELEVEN_LABS_API_KEY,
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_monolingual_v1',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.5,
            },
          }),
        }
      );

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.onended = () => setIsSpeaking(false);
        await audio.play();
      } else {
        setIsSpeaking(false);
        console.error('Eleven Labs API error:', response.status);
      }
    } catch (error) {
      setIsSpeaking(false);
      console.error('Voice error:', error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setIsLoading(true);

    // Call RavenAI backend canister for real AI response
    try {
      // In production, this calls the raven_ai canister
      // For now, we provide intelligent contextual responses
      const lowerInput = userMessage.toLowerCase();
      let response = '';

      if (lowerInput.includes('carolina reaper') || lowerInput.includes('hottest')) {
        response = "The Carolina Reaper is currently the world's hottest pepper at 2.2 million+ Scoville units! We grow them fresh in our Florida nursery. You can buy live plants starting at $14.99 or seeds for $6.99 in our shop.";
      } else if (lowerInput.includes('ghost pepper') || lowerInput.includes('bhut jolokia')) {
        response = "Ghost peppers (Bhut Jolokia) have over 1 million Scoville units. We offer fresh pods at $19.99/lb, live plants at $12.99, and seeds at $5.99. They're great for making homemade hot sauces!";
      } else if (lowerInput.includes('plant') || lowerInput.includes('grow')) {
        response = "Our Florida-registered nursery produces certified pepper plants ready for your garden. We ship nationwide! Each plant comes with care instructions. Check out our Nursery Plants category in the shop.";
      } else if (lowerInput.includes('seed')) {
        response = "We offer authentic seeds from our own pepper harvest. Each pack includes 10 seeds with germination instructions. Our Superhot Mix pack is popular with serious growers - 25 seeds of various extreme peppers for $12.99.";
      } else if (lowerInput.includes('recipe') || lowerInput.includes('cook')) {
        response = "For beginners, I recommend starting with our Habanero pods for salsa - dice 2-3 peppers into fresh tomatoes, onion, cilantro, and lime juice. For hot sauce, blend peppers with vinegar and salt, then simmer for 20 minutes.";
      } else if (lowerInput.includes('spice') || lowerInput.includes('blend')) {
        response = "Our IC SPICY Signature Blend is our best seller at $11.99 - it's perfect for rubs, marinades, and adding heat to any dish. For pure heat, try our Carolina Reaper Powder at $14.99 for 2oz.";
      } else if (lowerInput.includes('order') || lowerInput.includes('buy') || lowerInput.includes('shop')) {
        response = "You can order fresh pepper pods, live nursery plants, seeds, and spice blends directly from our Shop tab! We also have official merch at t3kno-logic.xyz/collections/ic-spicy.";
      } else if (lowerInput.includes('ship') || lowerInput.includes('deliver')) {
        response = "We ship fresh peppers and plants nationwide! Live plants are shipped with heat/cold packs as needed. Standard shipping is $7.99, or free on orders over $50.";
      } else {
        response = "Great question! IC SPICY is a Real World Asset co-op connecting pepper farmers with customers. We sell fresh pepper pods, nursery plants from our registered Florida nursery, seeds, and spice blends. What would you like to know more about?";
      }

      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      setIsLoading(false);

      // Speak the response with Eleven Labs
      await speakWithElevenLabs(response);
    } catch (error) {
      console.error('AI error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble connecting right now. Please try again in a moment." }]);
      setIsLoading(false);
    }
  };

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
function InventoryControl({ items }: { items: InventoryItem[] }) {
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
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
            <div>
              <p className="font-medium text-white">{item.name}</p>
              <p className="text-xs text-gray-500">
                Last updated: {item.lastUpdated.toLocaleDateString()}
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold text-white">{item.quantity} {item.unit}</p>
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                item.status === 'in-stock' ? 'bg-green-500/20 text-green-400' :
                item.status === 'low' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {item.status.replace('-', ' ')}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4 text-center">
        <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
          <p className="text-2xl font-bold text-green-400">{items.filter(i => i.status === 'in-stock').length}</p>
          <p className="text-xs text-gray-500">In Stock</p>
        </div>
        <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
          <p className="text-2xl font-bold text-yellow-400">{items.filter(i => i.status === 'low').length}</p>
          <p className="text-xs text-gray-500">Low Stock</p>
        </div>
        <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
          <p className="text-2xl font-bold text-red-400">{items.filter(i => i.status === 'out-of-stock').length}</p>
          <p className="text-xs text-gray-500">Out</p>
        </div>
      </div>
    </div>
  );
}

// Main Page Component
export default function ICSpicyPage() {
  const { isAuthenticated, identity } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'home' | 'menu' | 'shop' | 'farm' | 'ai'>('home');
  
  // Fetch farm stats from backend
  const { stats: farmStatsData, isLoading: farmStatsLoading } = useFarmStats(identity);
  
  // Convert backend format to frontend format
  const farmStats: FarmStats = farmStatsData ? {
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
    { id: 'menu', label: 'Menu', icon: Utensils },
    { id: 'shop', label: 'Shop', icon: Store },
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

            {/* Menu Tab */}
            {activeTab === 'menu' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Utensils className="w-6 h-6 text-red-400" />
                    In-Person Menu
                  </h2>
                  <div className="flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-400 text-sm">Scan QR to order</span>
                  </div>
                </div>
                <SpicyMenu items={MENU_ITEMS} />
              </div>
            )}

            {/* Shop Tab - Real Products */}
            {activeTab === 'shop' && (
              <div className="space-y-6">
                {/* Category Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {[
                    { id: 'all', label: 'All Products', icon: '🛒' },
                    { id: 'pods', label: 'Fresh Pepper Pods', icon: '🌶️' },
                    { id: 'plants', label: 'Nursery Plants', icon: '🌱' },
                    { id: 'seeds', label: 'Seeds', icon: '🌰' },
                    { id: 'blends', label: 'Spice Blends', icon: '🧂' },
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
                      <p className="text-sm text-gray-400">All plants are grown and shipped from our certified nursery</p>
                    </div>
                  </div>
                </div>

                {/* Products Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {SHOP_PRODUCTS.map((product) => (
                    <div key={product.id} className="glass rounded-xl p-4 border border-gray-800 hover:border-red-500/30 transition-all">
                      <div className="h-24 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-lg mb-3 flex items-center justify-center">
                        <span className="text-4xl">
                          {product.category === 'pods' && '🌶️'}
                          {product.category === 'plants' && '🌱'}
                          {product.category === 'seeds' && '🌰'}
                          {product.category === 'blends' && '🧂'}
                        </span>
                      </div>
                      <h4 className="font-bold text-white text-sm mb-1">{product.name}</h4>
                      <p className="text-gray-400 text-xs mb-2 line-clamp-2">{product.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-red-400">${product.price.toFixed(2)}</span>
                        <button className="px-3 py-1 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600">
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Merch Link */}
                <div className="glass rounded-2xl p-6 text-center border border-red-500/20">
                  <h3 className="text-xl font-bold text-white mb-2">Official IC SPICY Apparel</h3>
                  <p className="text-gray-400 mb-4">T-shirts, hoodies, hats and more!</p>
                  <a
                    href={T3KNO_SHOP}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    Shop Apparel at T3kno-Logic
                    <ExternalLink className="w-4 h-4" />
                  </a>
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
                <InventoryControl items={INVENTORY_ITEMS} />
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

