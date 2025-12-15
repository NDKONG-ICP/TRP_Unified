/**
 * IC SPICY Service - Real-World Asset Co-op Data
 * Manages farm dashboard, inventory, shop products, and menu items
 */

import { Actor, HttpAgent, Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { getCanisterId, getICHost, isMainnet } from './canisterConfig';

// ============ TYPES ============

// Farm Dashboard
export interface FarmStats {
  totalPlants: number;
  activeCrops: Crop[];
  harvestReady: number;
  waterLevel: number; // 0-100
  temperature: number; // Fahrenheit
  humidity: number; // 0-100
  lastUpdated: number;
  // Additional fields for IC SPICY co-op stats
  members?: number;
  harvestYield?: string;
  co2Offset?: string;
}

export interface Crop {
  id: string;
  name: string;
  variety: string;
  plantedDate: number;
  estimatedHarvest: number;
  status: 'seedling' | 'growing' | 'flowering' | 'fruiting' | 'harvest_ready';
  quantity: number;
  location: string;
}

// Inventory
export interface InventoryItem {
  id: string;
  category: 'pepper_pods' | 'plants' | 'seeds' | 'spice_blends';
  name: string;
  description: string;
  quantity: number;
  unit: string;
  priceICP: bigint;
  priceUSD: number;
  imageUrl: string;
  scovilleRating?: number;
  inStock: boolean;
  featured: boolean;
}

// Menu Items (In-Person)
export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'appetizers' | 'mains' | 'sides' | 'sauces' | 'drinks';
  spiceLevel: 1 | 2 | 3 | 4 | 5;
  available: boolean;
  imageUrl?: string;
  ingredients: string[];
  allergens: string[];
}

// Orders
export interface Order {
  id: string;
  customer: string;
  items: OrderItem[];
  totalICP: bigint;
  totalUSD: number;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered';
  createdAt: number;
  updatedAt: number;
  shippingAddress?: string;
  trackingNumber?: string;
}

export interface OrderItem {
  itemId: string;
  name: string;
  quantity: number;
  priceICP: bigint;
}

// ============ INITIAL DATA ============

// Real IC SPICY product data
const SHOP_PRODUCTS: InventoryItem[] = [
  // Fresh Pepper Pods
  {
    id: 'pod-carolina-reaper',
    category: 'pepper_pods',
    name: 'Carolina Reaper Pods',
    description: 'World\'s hottest pepper. Fresh harvested from our Florida farm. Handle with extreme caution.',
    quantity: 0, // Will be fetched from backend
    unit: 'lb',
    priceICP: BigInt(5_00000000), // 5 ICP
    priceUSD: 45.00,
    imageUrl: '/peppers/carolina-reaper.jpg',
    scovilleRating: 2200000,
    inStock: false,
    featured: true,
  },
  {
    id: 'pod-ghost-pepper',
    category: 'pepper_pods',
    name: 'Ghost Pepper (Bhut Jolokia)',
    description: 'Legendary super-hot pepper with smoky, fruity flavor. Fresh from our greenhouse.',
    quantity: 0,
    unit: 'lb',
    priceICP: BigInt(4_00000000),
    priceUSD: 35.00,
    imageUrl: '/peppers/ghost-pepper.jpg',
    scovilleRating: 1041427,
    inStock: false,
    featured: true,
  },
  {
    id: 'pod-habanero',
    category: 'pepper_pods',
    name: 'Orange Habanero Pods',
    description: 'Classic Caribbean heat with citrus undertones. Perfect for salsas and hot sauces.',
    quantity: 0,
    unit: 'lb',
    priceICP: BigInt(2_50000000),
    priceUSD: 22.00,
    imageUrl: '/peppers/habanero.jpg',
    scovilleRating: 350000,
    inStock: false,
    featured: false,
  },
  {
    id: 'pod-scotch-bonnet',
    category: 'pepper_pods',
    name: 'Scotch Bonnet Pods',
    description: 'Essential for Caribbean cuisine. Sweet, fruity heat profile.',
    quantity: 0,
    unit: 'lb',
    priceICP: BigInt(2_50000000),
    priceUSD: 22.00,
    imageUrl: '/peppers/scotch-bonnet.jpg',
    scovilleRating: 250000,
    inStock: false,
    featured: false,
  },
  // Nursery Plants
  {
    id: 'plant-reaper-seedling',
    category: 'plants',
    name: 'Carolina Reaper Seedling',
    description: 'Live plant ready for transplant. Florida registered nursery certified.',
    quantity: 0,
    unit: 'plant',
    priceICP: BigInt(1_50000000),
    priceUSD: 12.00,
    imageUrl: '/plants/reaper-seedling.jpg',
    inStock: false,
    featured: true,
  },
  {
    id: 'plant-ghost-seedling',
    category: 'plants',
    name: 'Ghost Pepper Seedling',
    description: 'Healthy starter plant. Grows well in containers or garden beds.',
    quantity: 0,
    unit: 'plant',
    priceICP: BigInt(1_25000000),
    priceUSD: 10.00,
    imageUrl: '/plants/ghost-seedling.jpg',
    inStock: false,
    featured: false,
  },
  {
    id: 'plant-variety-pack',
    category: 'plants',
    name: 'Hot Pepper Variety Pack (6)',
    description: '6 different pepper seedlings: Reaper, Ghost, Habanero, Scotch Bonnet, Thai, Cayenne',
    quantity: 0,
    unit: 'pack',
    priceICP: BigInt(6_00000000),
    priceUSD: 50.00,
    imageUrl: '/plants/variety-pack.jpg',
    inStock: false,
    featured: true,
  },
  // Seeds
  {
    id: 'seed-reaper-pack',
    category: 'seeds',
    name: 'Carolina Reaper Seeds (10)',
    description: 'Viable seeds from our champion plants. Includes growing guide.',
    quantity: 0,
    unit: 'pack',
    priceICP: BigInt(75000000),
    priceUSD: 6.00,
    imageUrl: '/seeds/reaper-seeds.jpg',
    scovilleRating: 2200000,
    inStock: false,
    featured: false,
  },
  {
    id: 'seed-super-hot-mix',
    category: 'seeds',
    name: 'Super Hot Seed Mix (25)',
    description: 'Mix of world\'s hottest varieties. Perfect for pepper enthusiasts.',
    quantity: 0,
    unit: 'pack',
    priceICP: BigInt(1_50000000),
    priceUSD: 12.00,
    imageUrl: '/seeds/super-hot-mix.jpg',
    inStock: false,
    featured: true,
  },
  // Spice Blends
  {
    id: 'blend-reaper-flakes',
    category: 'spice_blends',
    name: 'Carolina Reaper Flakes',
    description: 'Dried and crushed reaper peppers. A little goes a LONG way.',
    quantity: 0,
    unit: 'oz',
    priceICP: BigInt(1_00000000),
    priceUSD: 8.00,
    imageUrl: '/spices/reaper-flakes.jpg',
    scovilleRating: 2200000,
    inStock: false,
    featured: true,
  },
  {
    id: 'blend-ghost-powder',
    category: 'spice_blends',
    name: 'Ghost Pepper Powder',
    description: 'Finely ground ghost peppers for extreme heat seekers.',
    quantity: 0,
    unit: 'oz',
    priceICP: BigInt(80000000),
    priceUSD: 7.00,
    imageUrl: '/spices/ghost-powder.jpg',
    scovilleRating: 1041427,
    inStock: false,
    featured: false,
  },
  {
    id: 'blend-caribbean-jerk',
    category: 'spice_blends',
    name: 'Caribbean Jerk Spice Blend',
    description: 'Authentic blend with scotch bonnets, allspice, thyme. Medium-hot.',
    quantity: 0,
    unit: 'oz',
    priceICP: BigInt(60000000),
    priceUSD: 5.00,
    imageUrl: '/spices/caribbean-jerk.jpg',
    scovilleRating: 50000,
    inStock: false,
    featured: false,
  },
];

// Real menu items for in-person location
const MENU_ITEMS: MenuItem[] = [
  {
    id: 'menu-wings-reaper',
    name: 'Carolina Reaper Wings',
    description: 'Crispy wings tossed in our house-made reaper sauce. Signed waiver required.',
    price: 18.99,
    category: 'appetizers',
    spiceLevel: 5,
    available: true,
    ingredients: ['Chicken wings', 'Carolina Reaper sauce', 'Butter', 'Garlic'],
    allergens: ['Dairy'],
  },
  {
    id: 'menu-wings-ghost',
    name: 'Ghost Pepper Wings',
    description: 'For those who want serious heat without the reaper intensity.',
    price: 16.99,
    category: 'appetizers',
    spiceLevel: 4,
    available: true,
    ingredients: ['Chicken wings', 'Ghost pepper sauce', 'Honey', 'Lime'],
    allergens: [],
  },
  {
    id: 'menu-nachos-spicy',
    name: 'Spicy Loaded Nachos',
    description: 'Tortilla chips with habanero cheese sauce, jalapeños, and ghost pepper salsa.',
    price: 14.99,
    category: 'appetizers',
    spiceLevel: 3,
    available: true,
    ingredients: ['Tortilla chips', 'Cheese', 'Jalapeños', 'Ghost pepper salsa', 'Sour cream'],
    allergens: ['Dairy', 'Gluten'],
  },
  {
    id: 'menu-tacos-inferno',
    name: 'Inferno Street Tacos',
    description: 'Three tacos with your choice of protein, topped with reaper pico de gallo.',
    price: 15.99,
    category: 'mains',
    spiceLevel: 4,
    available: true,
    ingredients: ['Corn tortillas', 'Choice of meat', 'Reaper pico', 'Cilantro', 'Onion'],
    allergens: [],
  },
  {
    id: 'menu-burger-ghost',
    name: 'Ghost Burger',
    description: 'Half-pound beef patty with ghost pepper jack cheese and habanero aioli.',
    price: 17.99,
    category: 'mains',
    spiceLevel: 3,
    available: true,
    ingredients: ['Beef patty', 'Ghost pepper jack', 'Habanero aioli', 'Lettuce', 'Tomato'],
    allergens: ['Dairy', 'Gluten', 'Eggs'],
  },
  {
    id: 'menu-rice-jerk',
    name: 'Jerk Rice Bowl',
    description: 'Caribbean jerk chicken over coconut rice with mango salsa.',
    price: 14.99,
    category: 'mains',
    spiceLevel: 2,
    available: true,
    ingredients: ['Jerk chicken', 'Coconut rice', 'Mango salsa', 'Black beans'],
    allergens: [],
  },
  {
    id: 'menu-fries-loaded',
    name: 'Loaded Pepper Fries',
    description: 'Crispy fries with habanero cheese sauce and jalapeño bits.',
    price: 8.99,
    category: 'sides',
    spiceLevel: 2,
    available: true,
    ingredients: ['French fries', 'Habanero cheese sauce', 'Jalapeños'],
    allergens: ['Dairy', 'Gluten'],
  },
  {
    id: 'menu-sauce-reaper',
    name: 'House Reaper Hot Sauce (5oz)',
    description: 'Take home a bottle of our signature Carolina Reaper sauce.',
    price: 12.99,
    category: 'sauces',
    spiceLevel: 5,
    available: true,
    ingredients: ['Carolina Reapers', 'Vinegar', 'Garlic', 'Salt'],
    allergens: [],
  },
  {
    id: 'menu-sauce-ghost',
    name: 'Ghost Pepper Sauce (5oz)',
    description: 'Smoky ghost pepper sauce perfect for everyday use.',
    price: 10.99,
    category: 'sauces',
    spiceLevel: 4,
    available: true,
    ingredients: ['Ghost peppers', 'Vinegar', 'Onion', 'Garlic'],
    allergens: [],
  },
  {
    id: 'menu-lemonade-mango',
    name: 'Mango Habanero Lemonade',
    description: 'Sweet and spicy refresher with real mango and a habanero kick.',
    price: 5.99,
    category: 'drinks',
    spiceLevel: 1,
    available: true,
    ingredients: ['Lemonade', 'Mango puree', 'Habanero syrup'],
    allergens: [],
  },
];

// ============ SERVICE CLASS ============

export class ICSpicyService {
  private agent: HttpAgent | null = null;
  private coreActor: any = null;

  async init(identity?: Identity): Promise<void> {
    const host = getICHost();
    this.agent = new HttpAgent({ identity, host });
    
    if (!isMainnet) {
      await this.agent.fetchRootKey();
    }
  }

  // ============ FARM DASHBOARD ============

  async getFarmStats(): Promise<FarmStats> {
    try {
      if (!this.agent) {
        await this.init();
      }
      
      const canisterId = getCanisterId('icspicy');
      
      // Inline IDL definition to avoid exposing .did files
      const icspicyIdlFactory = ({ IDL }: { IDL: any }) => {
        const FarmStats = IDL.Record({
          'pepper_plants': IDL.Nat64,
          'members': IDL.Nat64,
          'harvest_yield': IDL.Text,
          'co2_offset': IDL.Text,
          'last_updated': IDL.Nat64,
        });
        
        return IDL.Service({
          'get_farm_stats': IDL.Func([], [FarmStats], ['query']),
        });
      };
      
      const actor = await Actor.createActor(icspicyIdlFactory, {
        agent: this.agent,
        canisterId,
      });
      
      const stats = await actor.get_farm_stats();
      
      // Convert backend format to frontend format
      return {
        totalPlants: Number(stats.pepper_plants),
        activeCrops: [],
        harvestReady: 0,
        waterLevel: 0,
        temperature: 0,
        humidity: 0,
        lastUpdated: Number(stats.last_updated),
        // Additional fields for ICSpicyPage
        members: Number(stats.members),
        harvestYield: stats.harvest_yield,
        co2Offset: stats.co2_offset,
      };
    } catch (error) {
      console.error('Error fetching farm stats:', error);
      // Return default on error
      return {
        totalPlants: 0,
        activeCrops: [],
        harvestReady: 0,
        waterLevel: 0,
        temperature: 0,
        humidity: 0,
        lastUpdated: Date.now(),
        members: 0,
        harvestYield: '--',
        co2Offset: '--',
      };
    }
  }

  async getCrops(): Promise<Crop[]> {
    // Would fetch from backend
    return [];
  }

  // ============ SHOP / INVENTORY ============

  async getShopProducts(category?: string): Promise<InventoryItem[]> {
    // Return real product catalog
    // In production, quantities would be fetched from backend
    let products = [...SHOP_PRODUCTS];
    
    if (category && category !== 'all') {
      products = products.filter(p => p.category === category);
    }
    
    return products;
  }

  async getProductById(id: string): Promise<InventoryItem | null> {
    return SHOP_PRODUCTS.find(p => p.id === id) || null;
  }

  async getFeaturedProducts(): Promise<InventoryItem[]> {
    return SHOP_PRODUCTS.filter(p => p.featured);
  }

  async checkInventory(productId: string): Promise<{ inStock: boolean; quantity: number }> {
    // In production, check real inventory from backend
    const product = SHOP_PRODUCTS.find(p => p.id === productId);
    return {
      inStock: product?.inStock || false,
      quantity: product?.quantity || 0,
    };
  }

  // ============ MENU ============

  async getMenuItems(category?: string): Promise<MenuItem[]> {
    let items = [...MENU_ITEMS];
    
    if (category && category !== 'all') {
      items = items.filter(m => m.category === category);
    }
    
    return items;
  }

  async getAvailableMenuItems(): Promise<MenuItem[]> {
    return MENU_ITEMS.filter(m => m.available);
  }

  // ============ ORDERS ============

  async createOrder(items: OrderItem[], shippingAddress?: string): Promise<Order | null> {
    // In production, this would create an order in the backend
    // Order creation will be implemented in future update
    return null;
  }

  async getMyOrders(principal: string): Promise<Order[]> {
    // In production, fetch user's orders from backend
    return [];
  }

  async getOrderStatus(orderId: string): Promise<Order | null> {
    // In production, fetch specific order
    return null;
  }
}

// Singleton
export const icSpicyService = new ICSpicyService();

// ============ REACT HOOKS ============

import { useState, useEffect, useCallback } from 'react';

export function useFarmStats(identity?: Identity) {
  const [stats, setStats] = useState<FarmStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await icSpicyService.init(identity);
      const data = await icSpicyService.getFarmStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch farm stats');
    } finally {
      setIsLoading(false);
    }
  }, [identity]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, isLoading, error, refresh: fetchStats };
}

export function useShopProducts(category?: string, identity?: Identity) {
  const [products, setProducts] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await icSpicyService.init(identity);
      const data = await icSpicyService.getShopProducts(category);
      setProducts(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch products');
    } finally {
      setIsLoading(false);
    }
  }, [identity, category]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { products, isLoading, error, refresh: fetchProducts };
}

export function useMenuItems(category?: string, identity?: Identity) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await icSpicyService.init(identity);
      const data = await icSpicyService.getMenuItems(category);
      setItems(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch menu');
    } finally {
      setIsLoading(false);
    }
  }, [identity, category]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return { items, isLoading, error, refresh: fetchItems };
}

// ============ HELPERS ============

export function formatScoville(rating: number): string {
  if (rating >= 1000000) {
    return `${(rating / 1000000).toFixed(1)}M SHU`;
  }
  if (rating >= 1000) {
    return `${(rating / 1000).toFixed(0)}K SHU`;
  }
  return `${rating} SHU`;
}

export function getSpiceLevelColor(level: number): string {
  switch (level) {
    case 1: return 'text-green-400';
    case 2: return 'text-yellow-400';
    case 3: return 'text-orange-400';
    case 4: return 'text-red-400';
    case 5: return 'text-red-600';
    default: return 'text-gray-400';
  }
}

export function getSpiceLevelEmoji(level: number): string {
  return '🌶️'.repeat(level);
}

export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    pepper_pods: 'Fresh Pepper Pods',
    plants: 'Nursery Plants',
    seeds: 'Seeds',
    spice_blends: 'Spice Blends',
    appetizers: 'Appetizers',
    mains: 'Main Courses',
    sides: 'Sides',
    sauces: 'Sauces & Bottles',
    drinks: 'Drinks',
  };
  return labels[category] || category;
}

export default icSpicyService;

