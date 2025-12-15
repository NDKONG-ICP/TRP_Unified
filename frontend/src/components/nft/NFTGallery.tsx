/**
 * NFT Gallery Component
 * Multi-chain NFT gallery with filtering, sorting, and marketplace integration
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  Grid, 
  List, 
  Search, 
  Filter, 
  ChevronDown, 
  Heart, 
  ExternalLink,
  ShoppingCart,
  Tag,
  Sparkles
} from 'lucide-react';

// Chain icons mapping
const chainIcons: Record<string, string> = {
  ICP: '🌐',
  ETH: '⟠',
  BTC: '₿',
  SOL: '◎',
  SUI: '💧',
  TRON: '◆',
  AVAX: '🔺',
  MATIC: '⬡',
};

interface NFTItem {
  id: string;
  name: string;
  description: string;
  image: string;
  collection: string;
  chain: string;
  standard: string;
  price?: {
    amount: string;
    currency: string;
  };
  rarity?: {
    score: number;
    rank: number;
    total: number;
  };
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
  owner: string;
  creator: string;
  listed: boolean;
  liked: boolean;
  likeCount: number;
}

interface NFTGalleryProps {
  nfts: NFTItem[];
  onSelect?: (nft: NFTItem) => void;
  onBuy?: (nft: NFTItem) => void;
  onLike?: (nft: NFTItem) => void;
  showMarketplace?: boolean;
}

type ViewMode = 'grid' | 'list';
type SortOption = 'recent' | 'price_low' | 'price_high' | 'rarity';

export default function NFTGallery({ 
  nfts, 
  onSelect, 
  onBuy, 
  onLike,
  showMarketplace = true 
}: NFTGalleryProps) {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChain, setSelectedChain] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRarityRange, setSelectedRarityRange] = useState<[number, number]>([0, 100]);

  // Get unique chains from NFTs
  const availableChains = useMemo(() => {
    const chains = new Set(nfts.map(nft => nft.chain));
    return ['all', ...Array.from(chains)];
  }, [nfts]);

  // Filter and sort NFTs
  const filteredNFTs = useMemo(() => {
    let result = [...nfts];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(nft => 
        nft.name.toLowerCase().includes(query) ||
        nft.collection.toLowerCase().includes(query) ||
        nft.description.toLowerCase().includes(query)
      );
    }

    // Chain filter
    if (selectedChain !== 'all') {
      result = result.filter(nft => nft.chain === selectedChain);
    }

    // Rarity filter
    result = result.filter(nft => {
      if (!nft.rarity) return true;
      const percentile = (nft.rarity.rank / nft.rarity.total) * 100;
      return percentile >= selectedRarityRange[0] && percentile <= selectedRarityRange[1];
    });

    // Sort
    switch (sortBy) {
      case 'price_low':
        result.sort((a, b) => {
          if (!a.price) return 1;
          if (!b.price) return -1;
          return parseFloat(a.price.amount) - parseFloat(b.price.amount);
        });
        break;
      case 'price_high':
        result.sort((a, b) => {
          if (!a.price) return 1;
          if (!b.price) return -1;
          return parseFloat(b.price.amount) - parseFloat(a.price.amount);
        });
        break;
      case 'rarity':
        result.sort((a, b) => {
          if (!a.rarity) return 1;
          if (!b.rarity) return -1;
          return a.rarity.rank - b.rarity.rank;
        });
        break;
      default:
        // recent - keep original order
        break;
    }

    return result;
  }, [nfts, searchQuery, selectedChain, sortBy, selectedRarityRange]);

  const getRarityColor = (score: number) => {
    if (score >= 90) return 'text-yellow-400 bg-yellow-400/20';
    if (score >= 75) return 'text-purple-400 bg-purple-400/20';
    if (score >= 50) return 'text-blue-400 bg-blue-400/20';
    if (score >= 25) return 'text-green-400 bg-green-400/20';
    return 'text-gray-400 bg-gray-400/20';
  };

  const getRarityLabel = (score: number) => {
    if (score >= 90) return 'Legendary';
    if (score >= 75) return 'Epic';
    if (score >= 50) return 'Rare';
    if (score >= 25) return 'Uncommon';
    return 'Common';
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={t('common.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gold-600/30 rounded-xl text-gray-200 placeholder-gray-500 focus:outline-none focus:border-gold-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Chain Filter */}
          <div className="relative">
            <select
              value={selectedChain}
              onChange={(e) => setSelectedChain(e.target.value)}
              className="appearance-none px-4 py-2.5 pr-10 bg-gray-800/50 border border-gold-600/30 rounded-xl text-gray-200 focus:outline-none focus:border-gold-500 cursor-pointer"
            >
              {availableChains.map(chain => (
                <option key={chain} value={chain}>
                  {chain === 'all' ? t('common.all') + ' Chains' : `${chainIcons[chain] || ''} ${chain}`}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gold-400 pointer-events-none" />
          </div>

          {/* Sort */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="appearance-none px-4 py-2.5 pr-10 bg-gray-800/50 border border-gold-600/30 rounded-xl text-gray-200 focus:outline-none focus:border-gold-500 cursor-pointer"
            >
              <option value="recent">Recent</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
              <option value="rarity">Rarity</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gold-400 pointer-events-none" />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2.5 rounded-xl border transition-colors ${
              showFilters 
                ? 'bg-gold-600/20 border-gold-500 text-gold-400' 
                : 'bg-gray-800/50 border-gold-600/30 text-gray-400 hover:text-gold-400'
            }`}
          >
            <Filter className="w-5 h-5" />
          </button>

          {/* View Mode Toggle */}
          <div className="flex rounded-xl border border-gold-600/30 overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2.5 transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-gold-600/20 text-gold-400' 
                  : 'bg-gray-800/50 text-gray-400 hover:text-gold-400'
              }`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2.5 transition-colors ${
                viewMode === 'list' 
                  ? 'bg-gold-600/20 text-gold-400' 
                  : 'bg-gray-800/50 text-gray-400 hover:text-gold-400'
              }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 bg-gray-800/30 border border-gold-600/20 rounded-xl"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Rarity Range */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Rarity Range</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={selectedRarityRange[0]}
                    onChange={(e) => setSelectedRarityRange([parseInt(e.target.value), selectedRarityRange[1]])}
                    className="w-20 px-3 py-2 bg-gray-800/50 border border-gold-600/30 rounded-lg text-gray-200 text-center"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={selectedRarityRange[1]}
                    onChange={(e) => setSelectedRarityRange([selectedRarityRange[0], parseInt(e.target.value)])}
                    className="w-20 px-3 py-2 bg-gray-800/50 border border-gold-600/30 rounded-lg text-gray-200 text-center"
                  />
                  <span className="text-gray-500">%</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results Count */}
      <div className="text-sm text-gray-400">
        {filteredNFTs.length} {filteredNFTs.length === 1 ? 'item' : 'items'}
      </div>

      {/* NFT Grid/List */}
      <div className={
        viewMode === 'grid' 
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' 
          : 'space-y-4'
      }>
        <AnimatePresence mode="popLayout">
          {filteredNFTs.map((nft, index) => (
            <motion.div
              key={nft.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: index * 0.05 }}
              className={`group bg-gray-800/50 border border-gold-600/20 rounded-2xl overflow-hidden hover:border-gold-500/50 transition-all duration-300 ${
                viewMode === 'list' ? 'flex' : ''
              }`}
            >
              {/* Image */}
              <div 
                className={`relative overflow-hidden cursor-pointer ${
                  viewMode === 'list' ? 'w-48 flex-shrink-0' : 'aspect-square'
                }`}
                onClick={() => onSelect?.(nft)}
              >
                <img
                  src={nft.image}
                  alt={nft.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                
                {/* Chain Badge */}
                <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-lg text-xs font-medium text-white flex items-center gap-1">
                  <span>{chainIcons[nft.chain] || '🔗'}</span>
                  <span>{nft.chain}</span>
                </div>

                {/* Rarity Badge */}
                {nft.rarity && (
                  <div className={`absolute top-3 right-3 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${getRarityColor(nft.rarity.score)}`}>
                    <Sparkles className="w-3 h-3" />
                    {getRarityLabel(nft.rarity.score)}
                  </div>
                )}

                {/* Like Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onLike?.(nft);
                  }}
                  className={`absolute bottom-3 right-3 p-2 rounded-full backdrop-blur-sm transition-colors ${
                    nft.liked 
                      ? 'bg-red-500/80 text-white' 
                      : 'bg-black/60 text-gray-300 hover:text-red-400'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${nft.liked ? 'fill-current' : ''}`} />
                </button>
              </div>

              {/* Content */}
              <div className={`p-4 ${viewMode === 'list' ? 'flex-1 flex flex-col justify-between' : ''}`}>
                <div>
                  <p className="text-xs text-gold-400 font-medium mb-1">{nft.collection}</p>
                  <h3 className="text-lg font-semibold text-white mb-2 truncate">{nft.name}</h3>
                  
                  {viewMode === 'list' && (
                    <p className="text-sm text-gray-400 line-clamp-2 mb-3">{nft.description}</p>
                  )}

                  {/* Attributes Preview */}
                  {viewMode === 'grid' && nft.attributes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {nft.attributes.slice(0, 3).map((attr, i) => (
                        <span 
                          key={i}
                          className="text-xs px-2 py-0.5 bg-gray-700/50 text-gray-300 rounded"
                        >
                          {attr.value}
                        </span>
                      ))}
                      {nft.attributes.length > 3 && (
                        <span className="text-xs px-2 py-0.5 bg-gray-700/50 text-gray-400 rounded">
                          +{nft.attributes.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Price and Actions */}
                <div className={`flex items-center justify-between ${viewMode === 'list' ? 'mt-auto pt-4 border-t border-gray-700/50' : 'mt-3 pt-3 border-t border-gray-700/50'}`}>
                  {nft.price ? (
                    <div>
                      <p className="text-xs text-gray-400">Price</p>
                      <p className="text-lg font-bold text-gold-400">
                        {nft.price.amount} {nft.price.currency}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-500">Not listed</p>
                    </div>
                  )}

                  {showMarketplace && nft.listed && (
                    <button
                      onClick={() => onBuy?.(nft)}
                      className="flex items-center gap-2 px-4 py-2 bg-gold-600 hover:bg-gold-500 text-black font-semibold rounded-lg transition-colors"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      {t('nft.buy')}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {filteredNFTs.length === 0 && (
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-800/50 flex items-center justify-center">
            <Tag className="w-10 h-10 text-gray-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-400 mb-2">No NFTs Found</h3>
          <p className="text-gray-500">Try adjusting your filters or search query</p>
        </div>
      )}
    </div>
  );
}






