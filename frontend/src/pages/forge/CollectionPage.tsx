import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Grid, List, Sparkles, ExternalLink, Loader2 } from 'lucide-react';
import { createNFTActor } from '../../services/actorFactory';
import { CANISTER_IDS } from '../../services/canisterConfig';
import type { NFTMetadata, Rarity } from '../../declarations/nft';

interface NFT {
  id: string;
  tokenId: bigint;
  name: string;
  image: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  traits: { name: string; value: string }[];
  owner?: string;
  price?: number;
}

const rarityColors = {
  common: 'from-gray-500 to-gray-600',
  uncommon: 'from-green-500 to-emerald-600',
  rare: 'from-blue-500 to-indigo-600',
  epic: 'from-purple-500 to-pink-600',
  legendary: 'from-yellow-500 to-orange-500',
};

const rarityBadgeColors = {
  common: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  uncommon: 'bg-green-500/20 text-green-400 border-green-500/30',
  rare: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  epic: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  legendary: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
};

// Convert canister Rarity to string
function rarityToString(rarity: Rarity): 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' {
  if ('Common' in rarity) return 'common';
  if ('Uncommon' in rarity) return 'uncommon';
  if ('Rare' in rarity) return 'rare';
  if ('Epic' in rarity) return 'epic';
  if ('Legendary' in rarity) return 'legendary';
  return 'common';
}

export default function CollectionPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [rarityFilter, setRarityFilter] = useState<string>('all');
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalSupply: BigInt(0),
    minted: BigInt(0),
    available: BigInt(0),
    uniqueOwners: 0,
  });

  // Load NFTs from canister
  useEffect(() => {
    const loadNFTs = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const nftActor = await createNFTActor();
        
        // Get collection config for stats
        const config = await nftActor.get_collection_config();
        const totalSupply = await nftActor.icrc7_total_supply();
        
        setStats({
          totalSupply: config.max_supply,
          minted: config.minted,
          available: config.max_supply - config.minted,
          uniqueOwners: 0, // Would need to iterate through all tokens
        });
        
        // Get all minted NFTs (up to first 100 for now)
        const loadedNfts: NFT[] = [];
        const mintedCount = Number(config.minted);
        
        for (let i = 0; i < Math.min(mintedCount, 100); i++) {
          try {
            const metadata = await nftActor.get_nft_metadata(BigInt(i));
            const owner = await nftActor.icrc7_owner_of(BigInt(i));
            
            if (metadata && metadata.length > 0 && metadata[0]) {
              const meta = metadata[0];
              loadedNfts.push({
                id: `nft-${i}`,
                tokenId: BigInt(i),
                name: meta.name,
                image: meta.image || '/placeholder-nft.png',
                rarity: rarityToString(meta.rarity),
                traits: meta.attributes.map(attr => ({
                  name: attr.trait_type,
                  value: attr.value,
                })),
                owner: owner && owner.length > 0 && owner[0] ? owner[0].toText() : undefined,
              });
            }
          } catch (e) {
            console.error(`Failed to load NFT ${i}:`, e);
          }
        }
        
        setNfts(loadedNfts);
      } catch (err) {
        console.error('Failed to load NFTs:', err);
        setError('Failed to load NFT collection. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadNFTs();
  }, []);

  const filteredNFTs = nfts.filter((nft) => {
    const matchesSearch = nft.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRarity = rarityFilter === 'all' || nft.rarity === rarityFilter;
    return matchesSearch && matchesRarity;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl font-display font-bold mb-4">
          <span className="text-white">Raven</span>{' '}
          <span className="text-gold-400">Collection</span>
        </h1>
        <p className="text-silver-400 max-w-2xl mx-auto">
          Browse unique generative NFTs from The Forge
        </p>
      </motion.div>

      {/* Filters */}
      <div className="glass rounded-2xl p-4 mb-8 border border-gold-500/20">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-silver-500" />
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-12"
            />
          </div>

          {/* Rarity Filter */}
          <select
            value={rarityFilter}
            onChange={(e) => setRarityFilter(e.target.value)}
            className="input w-full md:w-48"
          >
            <option value="all">All Rarities</option>
            <option value="common">Common</option>
            <option value="uncommon">Uncommon</option>
            <option value="rare">Rare</option>
            <option value="epic">Epic</option>
            <option value="legendary">Legendary</option>
          </select>

          {/* View Toggle */}
          <div className="flex rounded-xl border border-raven-gray overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-3 transition-all ${
                viewMode === 'grid'
                  ? 'bg-gold-500 text-white'
                  : 'bg-raven-dark text-silver-500 hover:text-white'
              }`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-3 transition-all ${
                viewMode === 'list'
                  ? 'bg-gold-500 text-white'
                  : 'bg-raven-dark text-silver-500 hover:text-white'
              }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats - Real data from canister */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="glass rounded-xl p-4 text-center border border-gold-500/10">
          <p className="text-2xl font-bold text-white">{stats.totalSupply.toString()}</p>
          <p className="text-sm text-silver-500">Total Supply</p>
        </div>
        <div className="glass rounded-xl p-4 text-center border border-gold-500/10">
          <p className="text-2xl font-bold text-white">{stats.minted.toString()}</p>
          <p className="text-sm text-silver-500">Minted</p>
        </div>
        <div className="glass rounded-xl p-4 text-center border border-gold-500/10">
          <p className="text-2xl font-bold text-white">{stats.available.toString()}</p>
          <p className="text-sm text-silver-500">Available</p>
        </div>
        <div className="glass rounded-xl p-4 text-center border border-gold-500/10">
          <p className="text-2xl font-bold text-white">{nfts.length}</p>
          <p className="text-sm text-silver-500">Loaded</p>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="w-12 h-12 text-gold-400 animate-spin mb-4" />
          <p className="text-silver-400">Loading NFT collection from blockchain...</p>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="text-center py-16">
          <div className="glass rounded-2xl p-8 max-w-md mx-auto border border-red-500/20">
            <p className="text-red-400 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="btn-gold"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* NFT Grid */}
      {!isLoading && !error && (
        <div className={`grid gap-6 ${
          viewMode === 'grid'
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
            : 'grid-cols-1'
        }`}>
          {filteredNFTs.map((nft, i) => (
            <motion.div
              key={nft.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setSelectedNFT(nft)}
              className="cursor-pointer group"
            >
              <div className={`glass rounded-2xl overflow-hidden border border-gold-500/10 hover:border-gold-500/40 transition-all ${
                viewMode === 'list' ? 'flex' : ''
              }`}>
                {/* Image */}
                <div className={`relative ${viewMode === 'list' ? 'w-32 h-32' : 'aspect-square'}`}>
                  <div className={`absolute inset-0 bg-gradient-to-br ${rarityColors[nft.rarity]} opacity-20`} />
                  {nft.image && nft.image !== '/placeholder-nft.png' ? (
                    <img src={nft.image} alt={nft.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-6xl">🦅</span>
                    </div>
                  )}
                  {/* Rarity Badge */}
                  <div className="absolute top-2 left-2">
                    <span className={`badge text-xs capitalize ${rarityBadgeColors[nft.rarity]}`}>
                      {nft.rarity}
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className={`p-4 ${viewMode === 'list' ? 'flex-1 flex items-center justify-between' : ''}`}>
                  <div>
                    <h3 className="font-bold text-white group-hover:text-gold-400 transition-colors">
                      {nft.name}
                    </h3>
                    {viewMode === 'grid' && (
                      <p className="text-sm text-silver-500 mt-1">
                        {nft.traits.length} traits
                      </p>
                    )}
                  </div>

                  {viewMode === 'list' && (
                    <div className="flex items-center gap-4">
                      <div className="flex gap-2">
                        {nft.traits.slice(0, 3).map((trait) => (
                          <span key={trait.name} className="badge-gold text-xs">
                            {trait.value}
                          </span>
                        ))}
                      </div>
                      {nft.price && (
                        <span className="text-gold-400 font-bold">
                          {nft.price} ICP
                        </span>
                      )}
                    </div>
                  )}

                  {viewMode === 'grid' && nft.price && (
                    <div className="mt-3 pt-3 border-t border-raven-gray flex justify-between items-center">
                      <span className="text-sm text-silver-500">Price</span>
                      <span className="text-gold-400 font-bold">{nft.price} ICP</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredNFTs.length === 0 && (
        <div className="text-center py-16">
          <Sparkles className="w-16 h-16 text-silver-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No NFTs Found</h3>
          <p className="text-silver-500">
            {nfts.length === 0 
              ? 'No NFTs have been minted yet. Be the first to mint!'
              : 'Try adjusting your search or filters'}
          </p>
        </div>
      )}

      {/* NFT Detail Modal */}
      {selectedNFT && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
          onClick={() => setSelectedNFT(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Image */}
              <div className="relative aspect-square rounded-2xl overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${rarityColors[selectedNFT.rarity]} opacity-20`} />
                {selectedNFT.image && selectedNFT.image !== '/placeholder-nft.png' ? (
                  <img src={selectedNFT.image} alt={selectedNFT.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-8xl">🦅</span>
                  </div>
                )}
              </div>

              {/* Details */}
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className={`badge text-xs capitalize mb-2 inline-block ${rarityBadgeColors[selectedNFT.rarity]}`}>
                      {selectedNFT.rarity}
                    </span>
                    <h2 className="text-2xl font-bold text-white">{selectedNFT.name}</h2>
                    <p className="text-sm text-silver-500">Token ID: {selectedNFT.tokenId.toString()}</p>
                  </div>
                  <button
                    onClick={() => setSelectedNFT(null)}
                    className="text-silver-500 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                {/* Owner */}
                {selectedNFT.owner && (
                  <div className="mb-4 p-3 glass-dark rounded-lg">
                    <p className="text-xs text-silver-500 mb-1">Owner</p>
                    <p className="text-sm font-mono text-gold-300 truncate">{selectedNFT.owner}</p>
                  </div>
                )}

                {/* Traits */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-silver-500 mb-3">Traits</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedNFT.traits.map((trait) => (
                      <div key={trait.name} className="glass-dark rounded-lg p-3">
                        <p className="text-xs text-silver-500">{trait.name}</p>
                        <p className="text-sm font-medium text-white">{trait.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  {selectedNFT.price ? (
                    <button className="w-full py-3 bg-gradient-to-r from-gold-600 to-gold-400 text-raven-black font-bold rounded-xl">
                      Buy for {selectedNFT.price} ICP
                    </button>
                  ) : (
                    <button className="w-full py-3 btn-outline-gold">
                      Make Offer
                    </button>
                  )}
                  <a
                    href={`https://dashboard.internetcomputer.org/canister/${CANISTER_IDS.nft}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 glass-dark rounded-xl flex items-center justify-center text-silver-400 hover:text-white transition-colors"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View on Explorer
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
