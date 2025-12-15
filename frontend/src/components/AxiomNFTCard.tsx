/**
 * AXIOM NFT Card Component
 * Displays AXIOM NFT with axiomart.jpg and mint number overlay
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

// Import the AXIOM art
import axiomArt from '../axiomart.jpg';

interface AxiomNFTCardProps {
  mintNumber: number;
  tokenId: number;
  owner?: string;
  name?: string;
  isMinted?: boolean;
  stats?: {
    interactions: number;
    memories: number;
    knowledge: number;
  };
  showChatLink?: boolean;
  showAirdropButton?: boolean;
  onAirdrop?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export const AxiomNFTCard: React.FC<AxiomNFTCardProps> = ({
  mintNumber,
  tokenId,
  owner,
  name,
  isMinted = true,
  stats,
  showChatLink = true,
  showAirdropButton = false,
  onAirdrop,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'w-32 h-32',
    md: 'w-48 h-48',
    lg: 'w-64 h-64',
  };

  const mintNumberSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      className="relative group"
    >
      {/* NFT Card */}
      <div className="glass-card overflow-hidden border border-amber-500/20 hover:border-amber-500/50 transition-all">
        {/* Art with Mint Number Overlay */}
        <div className={`relative ${sizeClasses[size]} mx-auto`}>
          <img
            src={axiomArt}
            alt={`AXIOM #${mintNumber}`}
            className="w-full h-full object-cover"
          />
          
          {/* Mint Number Overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="text-center">
              <span className={`font-bold text-white drop-shadow-lg ${mintNumberSizes[size]}`}>
                #{mintNumber}
              </span>
              <span className="block text-xs text-amber-400 font-medium">of 300</span>
            </div>
          </div>

          {/* Genesis Badge for first 5 */}
          {mintNumber <= 5 && (
            <div className="absolute top-2 left-2 px-2 py-1 bg-gradient-to-r from-amber-500 to-yellow-500 text-black text-xs font-bold rounded-full">
              GENESIS
            </div>
          )}

          {/* Minted Status */}
          <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-bold ${
            isMinted 
              ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
              : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
          }`}>
            {isMinted ? '● Minted' : '○ Available'}
          </div>
        </div>

        {/* Card Info */}
        <div className="p-4">
          <h3 className="font-bold text-white text-lg mb-1">
            {name || `AXIOM #${mintNumber}`}
          </h3>
          
          {owner && (
            <p className="text-gray-400 text-xs font-mono truncate mb-2">
              Owner: {owner.slice(0, 12)}...{owner.slice(-6)}
            </p>
          )}

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="text-center bg-gray-800/50 rounded-lg p-2">
                <p className="text-amber-400 font-bold text-sm">{stats.interactions}</p>
                <p className="text-gray-500 text-[10px]">Chats</p>
              </div>
              <div className="text-center bg-gray-800/50 rounded-lg p-2">
                <p className="text-purple-400 font-bold text-sm">{stats.memories}</p>
                <p className="text-gray-500 text-[10px]">Memories</p>
              </div>
              <div className="text-center bg-gray-800/50 rounded-lg p-2">
                <p className="text-blue-400 font-bold text-sm">{stats.knowledge}</p>
                <p className="text-gray-500 text-[10px]">Knowledge</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {showChatLink && isMinted && (
              <Link
                to={`/axiom-agent/${mintNumber}`}
                className="flex-1 py-2 text-center bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold rounded-lg hover:shadow-lg hover:shadow-amber-500/25 transition-all text-sm"
              >
                💬 Chat
              </Link>
            )}
            
            {showAirdropButton && onAirdrop && (
              <button
                onClick={onAirdrop}
                className="px-4 py-2 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg hover:bg-purple-500/30 transition-all text-sm"
              >
                🎁 Airdrop
              </button>
            )}

            {!isMinted && (
              <button className="flex-1 py-2 text-center bg-gray-700 text-white font-bold rounded-lg hover:bg-gray-600 transition-all text-sm">
                Mint Now
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/**
 * AXIOM NFT Grid Component
 * Displays a grid of AXIOM NFTs
 */
interface AxiomNFTGridProps {
  nfts: Array<{
    number: number;
    tokenId: number;
    owner?: string;
    name?: string;
    minted: boolean;
    stats?: {
      interactions: number;
      memories: number;
      knowledge: number;
    };
  }>;
  showAirdropForAdmin?: boolean;
  isAdmin?: boolean;
  onAirdrop?: (nft: any) => void;
}

export const AxiomNFTGrid: React.FC<AxiomNFTGridProps> = ({
  nfts,
  showAirdropForAdmin = false,
  isAdmin = false,
  onAirdrop,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {nfts.map((nft) => (
        <AxiomNFTCard
          key={nft.number}
          mintNumber={nft.number}
          tokenId={nft.tokenId}
          owner={nft.owner}
          name={nft.name}
          isMinted={nft.minted}
          stats={nft.stats}
          showAirdropButton={showAirdropForAdmin && isAdmin}
          onAirdrop={() => onAirdrop?.(nft)}
        />
      ))}
    </div>
  );
};

export default AxiomNFTCard;




