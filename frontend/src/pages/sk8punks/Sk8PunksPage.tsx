/**
 * Raven Sk8 Punks - Play-to-Earn Skateboarding Game
 * Features: NFT Staking, 2D Game, Tournaments, Leaderboards
 * Rewards: $HARLEE Token (Ledger: tlm4l-kaaaa-aaaah-qqeha-cai)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Gamepad2, 
  Trophy, 
  Users, 
  Coins, 
  Play, 
  Pause,
  RotateCcw,
  Lock,
  Unlock,
  Star,
  Zap,
  Timer,
  Award,
  ChevronRight,
  ExternalLink,
  ShoppingCart
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { TokenService, TOKEN_CANISTERS, formatHarlee } from '../../services/tokenService';
import { StakingService, StakedNFT as BackendStakedNFT } from '../../services/stakingService';
import { gameStatsService } from '../../services/gameStatsService';
import { Sk8PunksService } from '../../services/sk8PunksService';
import { Principal } from '@dfinity/principal';

// Brand Assets
import stakeBackground from '../../stake.svg';
import sk8Logo from '../../sk8logo.svg';
import sk8PunksBanner from '../../sk8punksbanner.JPG';

// $HARLEE Token Configuration
const HARLEE_TOKEN = TOKEN_CANISTERS.HARLEE;

// External Links
const YUKU_MARKETPLACE = 'https://yuku.app/market/b4mk6-5qaaa-aaaah-arerq-cai';
const DGDG_MARKETPLACE = 'https://dgdg.app/nfts/collections/ravens_sk8_punks';

// Sk8 Punks NFT Collection Canister
const SK8_PUNKS_CANISTER_ID = 'b4mk6-5qaaa-aaaah-arerq-cai';
const SK8_PUNKS_COLLECTION = {
  canisterId: SK8_PUNKS_CANISTER_ID,
  totalSupply: 888,
  listed: 230,
  floorPrice: '0.4T', // in cycles
  dashboardUrl: 'https://dashboard.internetcomputer.org/canister/b4mk6-5qaaa-aaaah-arerq-cai',
};

// Staking Reward Rate: 100 $HARLEE per week per NFT (in e8s)
// 100 $HARLEE * 10^8 decimals = 10,000,000,000 e8s
const WEEKLY_HARLEE_REWARD = BigInt(10_000_000_000); // 100 $HARLEE with 8 decimals
const SECONDS_PER_WEEK = 604800;

// Game Types
interface Skater {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  isJumping: boolean;
  isGrinding: boolean;
  currentTrick: string | null;
  combo: number;
  health: number;
}

interface Obstacle {
  type: 'rail' | 'ramp' | 'gap' | 'coin' | 'powerup';
  x: number;
  y: number;
  width: number;
  height: number;
  points: number;
}

interface GameState {
  score: number;
  combo: number;
  multiplier: number;
  time: number;
  isPlaying: boolean;
  isPaused: boolean;
  isGameOver: boolean;
  level: number;
  tricks: string[];
  harleeEarned: bigint;
}

// Staking Types
interface StakedNFT {
  id: string;
  name: string;
  image: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  stakedAt: number;
  rewards: bigint;
  multiplier: number;
}

// Tricks available
const TRICKS = [
  { name: 'Kickflip', points: 100, key: 'z', harlee: BigInt(100000) },
  { name: 'Heelflip', points: 100, key: 'x', harlee: BigInt(100000) },
  { name: 'Pop Shove-it', points: 150, key: 'c', harlee: BigInt(150000) },
  { name: '360 Flip', points: 300, key: 'v', harlee: BigInt(300000) },
  { name: 'Impossible', points: 400, key: 'b', harlee: BigInt(400000) },
  { name: 'Hardflip', points: 350, key: 'n', harlee: BigInt(350000) },
];

// Mobile Touch Controls Component
function MobileControls({
  onJump,
  onTrick,
  isPlaying,
}: {
  onJump: () => void;
  onTrick: (trickKey: string) => void;
  isPlaying: boolean;
}) {
  if (!isPlaying) return null;

  return (
    <div className="md:hidden fixed bottom-4 left-0 right-0 px-4 z-50">
      <div className="flex justify-between items-center gap-2">
        {/* Jump Button */}
        <button
          onTouchStart={onJump}
          className="flex-1 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg active:scale-95 transition-transform"
        >
          JUMP
        </button>
        
        {/* Trick Buttons */}
        <div className="flex gap-1">
          {TRICKS.slice(0, 3).map((trick) => (
            <button
              key={trick.key}
              onTouchStart={() => onTrick(trick.key)}
              className="w-12 h-16 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl flex flex-col items-center justify-center text-white font-bold text-xs shadow-lg active:scale-95 transition-transform"
            >
              <span className="uppercase">{trick.key}</span>
              <span className="text-[8px] opacity-75">{trick.name.slice(0, 4)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Game Component - Mobile Optimized
function SkateGame({ 
  onScoreUpdate,
  onHarleeEarned,
  multiplier = 1,
  characterSkin = '🛹'
}: { 
  onScoreUpdate: (score: number) => void;
  onHarleeEarned: (amount: bigint) => void;
  multiplier?: number;
  characterSkin?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 400 });
  const { principal, identity } = useAuthStore();
  
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    combo: 0,
    multiplier: multiplier,
    time: 60,
    isPlaying: false,
    isPaused: false,
    isGameOver: false,
    level: 1,
    tricks: [],
    harleeEarned: BigInt(0),
  });
  
  const [skater, setSkater] = useState<Skater>({
    x: 100,
    y: 300,
    vx: 0,
    vy: 0,
    rotation: 0,
    isJumping: false,
    isGrinding: false,
    currentTrick: null,
    combo: 0,
    health: 100,
  });

  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [lastTrick, setLastTrick] = useState<string | null>(null);
  const gameLoopRef = useRef<number>();
  const keysPressed = useRef<Set<string>>(new Set());

  // Responsive canvas sizing
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const width = Math.min(containerRef.current.clientWidth, 800);
        const height = Math.min(width * 0.5, 400);
        setCanvasSize({ width, height });
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Initialize obstacles
  useEffect(() => {
    const generateObstacles = () => {
      const newObstacles: Obstacle[] = [];
      for (let i = 0; i < 10; i++) {
        const type = ['rail', 'ramp', 'gap', 'coin', 'powerup'][Math.floor(Math.random() * 5)] as Obstacle['type'];
        newObstacles.push({
          type,
          x: 400 + i * 300 + Math.random() * 100,
          y: type === 'coin' || type === 'powerup' ? 250 : 350,
          width: type === 'rail' ? 150 : type === 'ramp' ? 80 : 50,
          height: type === 'rail' ? 20 : type === 'ramp' ? 60 : 30,
          points: type === 'coin' ? 50 : type === 'powerup' ? 0 : 200,
        });
      }
      setObstacles(newObstacles);
    };
    generateObstacles();
  }, [gameState.level]);

  // Game loop
  useEffect(() => {
    if (!gameState.isPlaying || gameState.isPaused || gameState.isGameOver) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = () => {
      // Clear canvas with gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#1a1a2e');
      gradient.addColorStop(1, '#16213e');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw ground with gradient
      const groundGradient = ctx.createLinearGradient(0, 380, 0, 400);
      groundGradient.addColorStop(0, '#4a4a5a');
      groundGradient.addColorStop(1, '#2a2a3a');
      ctx.fillStyle = groundGradient;
      ctx.fillRect(0, 380, canvas.width, 20);

      // Draw obstacles
      obstacles.forEach(obstacle => {
        const screenX = obstacle.x - skater.x + 100;
        if (screenX > -100 && screenX < canvas.width + 100) {
          switch (obstacle.type) {
            case 'rail':
              ctx.fillStyle = '#888';
              ctx.fillRect(screenX, obstacle.y, obstacle.width, obstacle.height);
              break;
            case 'ramp':
              ctx.fillStyle = '#666';
              ctx.beginPath();
              ctx.moveTo(screenX, obstacle.y + obstacle.height);
              ctx.lineTo(screenX + obstacle.width, obstacle.y);
              ctx.lineTo(screenX + obstacle.width, obstacle.y + obstacle.height);
              ctx.fill();
              break;
            case 'coin':
              // $HARLEE coin
              ctx.fillStyle = '#ffd700';
              ctx.beginPath();
              ctx.arc(screenX, obstacle.y, 15, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#000';
              ctx.font = 'bold 10px Arial';
              ctx.textAlign = 'center';
              ctx.fillText('$H', screenX, obstacle.y + 4);
              break;
            case 'powerup':
              ctx.fillStyle = '#00ff00';
              ctx.beginPath();
              ctx.arc(screenX, obstacle.y, 15, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#000';
              ctx.font = '12px Arial';
              ctx.textAlign = 'center';
              ctx.fillText('⚡', screenX, obstacle.y + 4);
              break;
            case 'gap':
              ctx.fillStyle = '#000';
              ctx.fillRect(screenX, 380, obstacle.width, 20);
              break;
          }
        }
      });

      // Draw skater
      ctx.save();
      ctx.translate(100, skater.y);
      ctx.rotate(skater.rotation * Math.PI / 180);
      ctx.font = '40px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(characterSkin, 0, 0);
      ctx.restore();

      // Draw trick name with glow effect
      if (lastTrick) {
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(lastTrick, canvas.width / 2, 100);
        ctx.shadowBlur = 0;
      }

      // Draw HUD
      ctx.fillStyle = '#fff';
      ctx.font = '16px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`Score: ${gameState.score}`, 20, 30);
      ctx.fillText(`Combo: x${gameState.combo}`, 20, 50);
      
      // $HARLEE earned
      ctx.fillStyle = '#ffd700';
      ctx.fillText(`$HARLEE: ${formatHarlee(gameState.harleeEarned)}`, 20, 70);
      
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'right';
      ctx.fillText(`Time: ${gameState.time}s`, canvas.width - 20, 30);

      // Update physics
      setSkater(prev => {
        let newY = prev.y + prev.vy;
        let newVy = prev.vy;
        let newRotation = prev.rotation;
        let isJumping = prev.isJumping;

        // Gravity
        if (isJumping) {
          newVy += 0.8;
          newRotation += 15;
        }

        // Ground collision
        if (newY >= 340) {
          newY = 340;
          newVy = 0;
          isJumping = false;
          newRotation = 0;
          
          // Land trick and earn $HARLEE
          if (prev.currentTrick) {
            const trick = TRICKS.find(t => t.name === prev.currentTrick);
            const trickPoints = trick?.points || 100;
            const trickHarlee = trick?.harlee || BigInt(100000);
            const totalPoints = trickPoints * gameState.multiplier * (gameState.combo + 1);
            const totalHarlee = trickHarlee * BigInt(gameState.combo + 1);
            
            setGameState(gs => ({
              ...gs,
              score: gs.score + totalPoints,
              combo: gs.combo + 1,
              harleeEarned: gs.harleeEarned + totalHarlee,
            }));
            onScoreUpdate(gameState.score + totalPoints);
            onHarleeEarned(totalHarlee);
          }
        }

        return {
          ...prev,
          x: prev.x + 5,
          y: newY,
          vy: newVy,
          rotation: newRotation,
          isJumping,
          currentTrick: isJumping ? prev.currentTrick : null,
        };
      });

      // Check collisions with obstacles
      obstacles.forEach((obstacle, index) => {
        const dx = skater.x - obstacle.x;
        const dy = skater.y - obstacle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 50) {
          if (obstacle.type === 'coin') {
            // Collect $HARLEE coin
            const coinHarlee = BigInt(50000); // 0.0005 $HARLEE
            setGameState(gs => ({ 
              ...gs, 
              score: gs.score + obstacle.points,
              harleeEarned: gs.harleeEarned + coinHarlee,
            }));
            onHarleeEarned(coinHarlee);
            setObstacles(obs => obs.filter((_, i) => i !== index));
          } else if (obstacle.type === 'powerup') {
            setGameState(gs => ({ ...gs, multiplier: gs.multiplier + 0.5 }));
            setObstacles(obs => obs.filter((_, i) => i !== index));
          }
        }
      });

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState.isPlaying, gameState.isPaused, skater, obstacles, lastTrick]);

  // Timer
  useEffect(() => {
    if (!gameState.isPlaying || gameState.isPaused || gameState.isGameOver) return;

    const timer = setInterval(() => {
      setGameState(prev => {
        if (prev.time <= 1) {
          return { ...prev, time: 0, isGameOver: true, isPlaying: false };
        }
        return { ...prev, time: prev.time - 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState.isPlaying, gameState.isPaused, gameState.isGameOver]);

  // Save score to backend when game ends
  useEffect(() => {
    if (gameState.isGameOver && gameState.score > 0 && principal && identity) {
      const saveScore = async () => {
        try {
          await gameStatsService.init(identity);
          await gameStatsService.updateSk8PunksScore(
            principal.toString(),
            gameState.score,
            gameState.harleeEarned
          );
          // Score saved to backend successfully
        } catch (error) {
          console.error('Failed to save score to backend:', error);
          // Score will be saved locally as fallback
        }
      };
      saveScore();
    }
  }, [gameState.isGameOver, gameState.score, gameState.harleeEarned, principal, identity]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current.add(e.key.toLowerCase());

      if (!gameState.isPlaying || gameState.isPaused) return;

      if (e.key === ' ' && !skater.isJumping) {
        handleJump();
      }

      const trick = TRICKS.find(t => t.key === e.key.toLowerCase());
      if (trick && skater.isJumping) {
        handleTrick(e.key.toLowerCase());
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState.isPlaying, gameState.isPaused, skater.isJumping]);

  const handleJump = () => {
    if (!skater.isJumping) {
      setSkater(prev => ({ ...prev, vy: -15, isJumping: true }));
    }
  };

  const handleTrick = (key: string) => {
    const trick = TRICKS.find(t => t.key === key);
    if (trick && skater.isJumping) {
      setSkater(prev => ({ ...prev, currentTrick: trick.name }));
      setLastTrick(trick.name);
      setTimeout(() => setLastTrick(null), 1000);
    }
  };

  const startGame = () => {
    setGameState({
      score: 0,
      combo: 0,
      multiplier: multiplier,
      time: 60,
      isPlaying: true,
      isPaused: false,
      isGameOver: false,
      level: 1,
      tricks: [],
      harleeEarned: BigInt(0),
    });
    setSkater({
      x: 100,
      y: 340,
      vx: 0,
      vy: 0,
      rotation: 0,
      isJumping: false,
      isGrinding: false,
      currentTrick: null,
      combo: 0,
      health: 100,
    });
  };

  const togglePause = () => {
    setGameState(prev => ({ ...prev, isPaused: !prev.isPaused }));
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="w-full rounded-xl border border-gaming-purple/30 bg-raven-dark touch-none"
      />
      
      {/* Mobile Controls */}
      <MobileControls 
        onJump={handleJump}
        onTrick={handleTrick}
        isPlaying={gameState.isPlaying && !gameState.isPaused && !gameState.isGameOver}
      />
      
      {/* Controls Overlay */}
      {!gameState.isPlaying && !gameState.isGameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-xl">
          <div className="text-center p-6">
            <h3 className="text-2xl font-bold text-white mb-2">Sk8 Punks</h3>
            <p className="text-silver-400 mb-4 text-sm md:text-base">
              <span className="hidden md:inline">Press SPACE to jump, Z-N for tricks!</span>
              <span className="md:hidden">Tap JUMP and trick buttons!</span>
            </p>
            <p className="text-gold-400 text-sm mb-4">Earn $HARLEE tokens!</p>
            <button
              onClick={startGame}
              className="btn-gold flex items-center mx-auto"
            >
              <Play className="w-5 h-5 mr-2" />
              Start Game
            </button>
          </div>
        </div>
      )}

      {/* Game Over */}
      {gameState.isGameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-xl">
          <div className="text-center p-6">
            <h3 className="text-3xl font-bold text-gaming-purple mb-2">Game Over!</h3>
            <p className="text-4xl font-bold text-gold-400 mb-2">{gameState.score} pts</p>
            <p className="text-lg text-gold-400 mb-4">
              +{formatHarlee(gameState.harleeEarned)} $HARLEE
            </p>
            <button
              onClick={startGame}
              className="btn-gold flex items-center mx-auto"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              Play Again
            </button>
          </div>
        </div>
      )}

      {/* Pause Button */}
      {gameState.isPlaying && !gameState.isGameOver && (
        <button
          onClick={togglePause}
          className="absolute top-4 right-4 p-2 bg-black/50 rounded-lg"
        >
          {gameState.isPaused ? <Play className="w-6 h-6 text-white" /> : <Pause className="w-6 h-6 text-white" />}
        </button>
      )}

      {/* Controls Guide - Desktop Only */}
      <div className="hidden md:grid mt-4 grid-cols-3 gap-2 text-center text-sm">
        <div className="bg-raven-dark rounded-lg p-2">
          <kbd className="px-2 py-1 bg-gray-700 rounded text-white">SPACE</kbd>
          <p className="text-silver-500 mt-1">Jump</p>
        </div>
        <div className="bg-raven-dark rounded-lg p-2">
          <kbd className="px-2 py-1 bg-gray-700 rounded text-white">Z-N</kbd>
          <p className="text-silver-500 mt-1">Tricks</p>
        </div>
        <div className="bg-raven-dark rounded-lg p-2">
          <span className="text-gold-400 font-bold">$HARLEE</span>
          <p className="text-silver-500 mt-1">Rewards</p>
        </div>
      </div>
    </div>
  );
}

// Staking Leaderboard Data Type
interface StakingLeaderEntry {
  rank: number;
  principal: string;
  nftsStaked: number;
  totalEarned: bigint;
  weeklyRate: bigint;
  avatar: string;
}

// Staking leaderboard will be fetched from backend

// NFT Staking Component with $HARLEE rewards - 100 $HARLEE per week per NFT
function NFTStaking() {
  const { isAuthenticated, principal, identity } = useAuthStore();
  const [stakedNFTs, setStakedNFTs] = useState<StakedNFT[]>([]);
  const [backendStakedNFTs, setBackendStakedNFTs] = useState<BackendStakedNFT[]>([]);
  const [availableNFTs, setAvailableNFTs] = useState<StakedNFT[]>([]);
  const [isLoadingAvailableNFTs, setIsLoadingAvailableNFTs] = useState(false);
  const [totalRewards, setTotalRewards] = useState<bigint>(BigInt(0));
  const [harleeBalance, setHarleeBalance] = useState<string>('0.0000');
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [stakingLeaderboard, setStakingLeaderboard] = useState<StakingLeaderEntry[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [isStaking, setIsStaking] = useState(false);
  const [isUnstaking, setIsUnstaking] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch user's available Sk8 Punks NFTs from collection canister
  useEffect(() => {
    const fetchAvailableNFTs = async () => {
      if (!isAuthenticated || !principal || !identity) {
        setAvailableNFTs([]);
        return;
      }

      setIsLoadingAvailableNFTs(true);
      try {
        const owner = Principal.fromText(principal.toString());
        const userNFTs = await Sk8PunksService.getUserNFTs(owner, identity);
        
        // Get staked token IDs to filter them out
        const stakedTokenIds = new Set(
          backendStakedNFTs.map(nft => nft.token_id.toString())
        );

        // Convert to frontend format and filter out already staked NFTs
        const available = userNFTs
          .filter(nft => !stakedTokenIds.has(nft.tokenId.toString()))
          .map(nft => ({
            id: nft.tokenId.toString(),
            name: nft.metadata?.name || `Punk #${nft.tokenId.toString().padStart(3, '0')}`,
            image: getEmojiForRarity(nft.rarity || 'common'),
            rarity: nft.rarity || 'common',
            stakedAt: 0,
            rewards: BigInt(0),
            multiplier: getMultiplierForRarity(nft.rarity || 'common'),
          }));

        setAvailableNFTs(available);
      } catch (error) {
        console.error('Failed to fetch available NFTs:', error);
        setAvailableNFTs([]);
      } finally {
        setIsLoadingAvailableNFTs(false);
      }
    };

    fetchAvailableNFTs();
  }, [isAuthenticated, principal, identity, backendStakedNFTs]);

  // Fetch real staked NFTs and rewards from backend
  useEffect(() => {
    const fetchStakedNFTs = async () => {
      if (isAuthenticated && principal) {
        setIsLoading(true);
        try {
          const owner = Principal.fromText(principal.toString());
          const staked = await StakingService.getStakedNFTs(owner, identity);
          setBackendStakedNFTs(staked);
          
          // Convert backend format to frontend format
          const converted = staked.map(nft => ({
            id: nft.token_id.toString(),
            name: `Punk #${nft.token_id.toString().padStart(3, '0')}`,
            image: getEmojiForRarity(nft.rarity),
            rarity: (nft.rarity as 'common' | 'rare' | 'epic' | 'legendary') || 'common',
            stakedAt: Number(nft.staked_at),
            rewards: nft.pending_rewards,
            multiplier: nft.multiplier,
          }));
          setStakedNFTs(converted);
          
          // Fetch pending rewards
          const pending = await StakingService.getPendingRewards(owner, identity);
          setTotalRewards(pending);
        } catch (error) {
          console.error('Failed to fetch staked NFTs:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    fetchStakedNFTs();
    const interval = setInterval(fetchStakedNFTs, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [isAuthenticated, principal, identity]);

  // Fetch real $HARLEE balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (isAuthenticated && principal) {
        try {
          const tokenService = new TokenService();
          const balance = await tokenService.getHarleeBalance(principal);
          setHarleeBalance(balance.formatted);
        } catch (error) {
          console.error('Failed to fetch $HARLEE balance:', error);
        }
      }
    };
    
    fetchBalance();
    const interval = setInterval(fetchBalance, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [isAuthenticated, principal]);

  // Fetch staking leaderboard from backend
  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!showLeaderboard) return; // Only fetch when leaderboard is shown
      
      setIsLoadingLeaderboard(true);
      try {
        const entries = await StakingService.getLeaderboard(20, identity);
        
        // Convert backend format to frontend format
        const converted: StakingLeaderEntry[] = entries.map((entry, index) => ({
          rank: index + 1,
          principal: entry.principal.toText(),
          nftsStaked: entry.total_staked,
          totalEarned: entry.total_rewards_earned,
          weeklyRate: BigInt(entry.total_staked) * WEEKLY_HARLEE_REWARD, // Approximate weekly rate
          avatar: getAvatarForRank(index + 1),
        }));
        
        setStakingLeaderboard(converted);
      } catch (error) {
        console.error('Failed to fetch staking leaderboard:', error);
        setStakingLeaderboard([]);
      } finally {
        setIsLoadingLeaderboard(false);
      }
    };

    fetchLeaderboard();
  }, [showLeaderboard, identity]);

  const getAvatarForRank = (rank: number): string => {
    if (rank === 1) return '👑';
    if (rank === 2) return '🏆';
    if (rank === 3) return '🥉';
    if (rank <= 10) return '⭐';
    if (rank <= 20) return '🛹';
    return '🎯';
  };

  const getEmojiForRarity = (rarity: string): string => {
    switch (rarity) {
      case 'legendary': return '⛷️';
      case 'epic': return '🏄';
      case 'rare': return '🎿';
      default: return '🛹';
    }
  };

  const getMultiplierForRarity = (rarity: string): number => {
    switch (rarity) {
      case 'legendary': return 3.0;
      case 'epic': return 2.0;
      case 'rare': return 1.5;
      default: return 1.0;
    }
  };

  // Calculate rewards - 100 $HARLEE per week per NFT
  useEffect(() => {
    const interval = setInterval(() => {
      // 100 $HARLEE per week = 100 / 604800 per second = ~0.000165 $HARLEE per second
      // In e8s: 100_00_000_000 / 604800 = ~165,343 e8s per second per NFT
      const rewardPerSecondPerNFT = WEEKLY_HARLEE_REWARD / BigInt(SECONDS_PER_WEEK);
      
      setStakedNFTs(prev => prev.map(nft => {
        // Apply rarity multiplier: common=1x, rare=1.5x, epic=2x, legendary=3x
        const multipliedReward = rewardPerSecondPerNFT * BigInt(Math.floor(nft.multiplier * 100)) / BigInt(100);
        return {
          ...nft,
          rewards: nft.rewards + multipliedReward,
        };
      }));
      
      setTotalRewards(prev => {
        const newRewards = stakedNFTs.reduce((acc, nft) => {
          const multipliedReward = rewardPerSecondPerNFT * BigInt(Math.floor(nft.multiplier * 100)) / BigInt(100);
          return acc + multipliedReward;
        }, BigInt(0));
        return prev + newRewards;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [stakedNFTs]);

  const stakeNFT = async (nft: StakedNFT) => {
    if (!principal || !identity) return;
    
    setIsStaking(true);
    try {
      const tokenId = BigInt(nft.id);
      const collection = SK8_PUNKS_CANISTER_ID;
      
      const staked = await StakingService.stakeNFT(tokenId, collection, identity);
      
      // Update local state
      setAvailableNFTs(prev => prev.filter(n => n.id !== nft.id));
      setStakedNFTs(prev => [...prev, { 
        ...nft, 
        stakedAt: Number(staked.staked_at),
        rewards: BigInt(0),
        multiplier: staked.multiplier,
        rarity: (staked.rarity as 'common' | 'rare' | 'epic' | 'legendary') || 'common',
      }]);
      
      // Refresh backend data
      const owner = Principal.fromText(principal.toString());
      const pending = await StakingService.getPendingRewards(owner, identity);
      setTotalRewards(pending);
    } catch (error) {
      console.error('Failed to stake NFT:', error);
      alert(`Failed to stake NFT: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsStaking(false);
    }
  };

  const unstakeNFT = async (nft: StakedNFT) => {
    if (!principal || !identity) return;
    
    setIsUnstaking(nft.id);
    try {
      const tokenId = BigInt(nft.id);
      const collection = SK8_PUNKS_CANISTER_ID;
      
      const rewards = await StakingService.unstakeNFT(tokenId, collection, identity);
      
      // Update local state
      setStakedNFTs(prev => prev.filter(n => n.id !== nft.id));
      setAvailableNFTs(prev => [...prev, { ...nft, stakedAt: 0, rewards: BigInt(0) }]);
      
      if (rewards > BigInt(0)) {
        alert(`🎉 Unstaked NFT! You earned ${formatHarlee(rewards)} $HARLEE tokens!`);
      }
      
      // Refresh backend data
      const owner = Principal.fromText(principal.toString());
      const pending = await StakingService.getPendingRewards(owner, identity);
      setTotalRewards(pending);
    } catch (error) {
      console.error('Failed to unstake NFT:', error);
      alert(`Failed to unstake NFT: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUnstaking(null);
    }
  };

  const claimRewards = async () => {
    if (!principal || !identity || stakedNFTs.length === 0) return;
    
    try {
      // Claim rewards for all staked NFTs
      let totalClaimed = BigInt(0);
      for (const nft of stakedNFTs) {
        try {
          const tokenId = BigInt(nft.id);
          const collection = SK8_PUNKS_CANISTER_ID;
          const rewards = await StakingService.claimRewards(tokenId, collection, identity);
          totalClaimed += rewards;
        } catch (error) {
          console.error(`Failed to claim rewards for NFT ${nft.id}:`, error);
        }
      }
      
      if (totalClaimed > BigInt(0)) {
        alert(`🎉 Claimed ${formatHarlee(totalClaimed)} $HARLEE tokens!\n\nTokens sent to your connected wallet.`);
      }
      
      // Refresh backend data
      const owner = Principal.fromText(principal.toString());
      const pending = await StakingService.getPendingRewards(owner, identity);
      setTotalRewards(pending);
      
      // Refresh staked NFTs to update pending_rewards
      const staked = await StakingService.getStakedNFTs(owner, identity);
      setBackendStakedNFTs(staked);
      const converted = staked.map(nft => ({
        id: nft.token_id.toString(),
        name: `Punk #${nft.token_id.toString().padStart(3, '0')}`,
        image: getEmojiForRarity(nft.rarity),
        rarity: (nft.rarity as 'common' | 'rare' | 'epic' | 'legendary') || 'common',
        stakedAt: Number(nft.staked_at),
        rewards: nft.pending_rewards,
        multiplier: nft.multiplier,
      }));
      setStakedNFTs(converted);
    } catch (error) {
      console.error('Failed to claim rewards:', error);
      alert(`Failed to claim rewards: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'from-yellow-400 to-orange-500';
      case 'epic': return 'from-purple-400 to-pink-500';
      case 'rare': return 'from-blue-400 to-cyan-500';
      default: return 'from-gray-400 to-gray-500';
    }
  };

  // Not authenticated view
  if (!isAuthenticated) {
    return (
      <div 
        className="glass rounded-2xl p-8 text-center border border-gaming-purple/20 relative overflow-hidden"
        style={{ backgroundImage: `url(${stakeBackground})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="absolute inset-0 bg-black/70" />
        <div className="relative z-10">
          <Lock className="w-12 h-12 text-gaming-purple mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Connect Wallet to Stake</h3>
          <p className="text-silver-400 mb-6">Stake your Sk8 Punk NFTs to earn 100 $HARLEE per week per NFT!</p>
          
          {/* Don't have a Sk8 Punk? CTA */}
          <div className="border-t border-gaming-purple/30 pt-6 mt-6">
            <h4 className="text-lg font-bold text-gaming-purple mb-4">
              🛹 Don't have a Sk8 Punk? Click one of these links and get to staking!
            </h4>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href={YUKU_MARKETPLACE}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-gradient-to-r from-gaming-purple to-purple-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:shadow-lg transition-all"
              >
                <img src="https://yuku.app/favicon.ico" alt="Yuku" className="w-5 h-5" onError={(e) => (e.currentTarget.style.display = 'none')} />
                Buy on Yuku
                <ExternalLink className="w-4 h-4" />
              </a>
              <a
                href={DGDG_MARKETPLACE}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-gradient-to-r from-gaming-pink to-pink-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:shadow-lg transition-all"
              >
                <span className="text-lg">🎲</span>
                Buy on DGDG
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
            <p className="text-silver-500 text-sm mt-4">
              Collection: <span className="text-gaming-purple font-mono">{SK8_PUNKS_CANISTER_ID}</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="space-y-6 relative"
      style={{ backgroundImage: `url(${stakeBackground})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}
    >
      <div className="absolute inset-0 bg-black/60 rounded-2xl" />
      
      <div className="relative z-10 space-y-6 p-4">
        {/* Collection Info Header */}
        <div className="glass rounded-2xl p-4 border border-gaming-purple/30">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img src={sk8Logo} alt="Sk8 Punks" className="w-16 h-16 rounded-xl border border-gaming-purple/50" />
              <div>
                <h3 className="text-xl font-bold text-white">Raven's Sk8 Punks</h3>
                <p className="text-gaming-purple text-sm">Canister: {SK8_PUNKS_CANISTER_ID.slice(0, 10)}...</p>
                <a 
                  href={SK8_PUNKS_COLLECTION.dashboardUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-silver-400 text-xs hover:text-white flex items-center gap-1"
                >
                  View on IC Dashboard <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
            <div className="flex gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-white">{SK8_PUNKS_COLLECTION.totalSupply}</p>
                <p className="text-xs text-silver-500">Total Supply</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gaming-purple">{SK8_PUNKS_COLLECTION.listed}</p>
                <p className="text-xs text-silver-500">Listed</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gold-400">{SK8_PUNKS_COLLECTION.floorPrice}</p>
                <p className="text-xs text-silver-500">Floor (Cycles)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Don't have a Sk8 Punk? CTA */}
        <div className="glass rounded-2xl p-6 border-2 border-dashed border-gaming-purple/50 text-center">
          <h4 className="text-xl font-bold text-white mb-2">
            🛹 Don't have a Sk8 Punk?
          </h4>
          <p className="text-silver-400 mb-4">Click one of these links and get to staking!</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={YUKU_MARKETPLACE}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-gradient-to-r from-gaming-purple to-purple-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:scale-105 transition-all"
            >
              Buy on Yuku
              <ExternalLink className="w-4 h-4" />
            </a>
            <a
              href={DGDG_MARKETPLACE}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-gradient-to-r from-gaming-pink to-pink-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:scale-105 transition-all"
            >
              Buy on DGDG
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
          <p className="text-gold-400 text-sm mt-4 font-semibold">
            💰 Earn 100 $HARLEE per week for each NFT staked!
          </p>
        </div>

        {/* Wallet Balance */}
        <div className="glass rounded-2xl p-4 border border-gaming-purple/20 text-center">
          <p className="text-silver-400 text-sm">Your $HARLEE Balance</p>
          <p className="text-3xl font-bold text-gold-400">{harleeBalance}</p>
          <p className="text-xs text-silver-500 mt-1">Powered by Plug Wallet</p>
        </div>

        {/* Staking Rewards Info */}
        <div className="glass rounded-2xl p-6 border border-gaming-purple/20">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h3 className="text-xl font-bold text-white">Staking Rewards</h3>
              <p className="text-sm text-gold-400">100 $HARLEE / week / NFT (base rate)</p>
            </div>
            <button
              onClick={claimRewards}
              disabled={totalRewards < BigInt(1_00_000_000)} // Min 1 $HARLEE to claim
              className="btn-gold text-sm disabled:opacity-50"
            >
              Claim {formatHarlee(totalRewards)} $HARLEE
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold text-gaming-purple">{stakedNFTs.length}</p>
              <p className="text-sm text-silver-500">Staked NFTs</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-gold-400">{formatHarlee(totalRewards)}</p>
              <p className="text-sm text-silver-500">Pending $HARLEE</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-emerald-400">
                {formatHarlee(BigInt(stakedNFTs.length) * WEEKLY_HARLEE_REWARD)}
              </p>
              <p className="text-sm text-silver-500">Weekly Rate</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-purple-400">
                {stakedNFTs.reduce((acc, nft) => acc + nft.multiplier, 1).toFixed(1)}x
              </p>
              <p className="text-sm text-silver-500">Game Multiplier</p>
            </div>
          </div>
        </div>

        {/* Staked NFTs */}
        <div>
          <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Lock className="w-5 h-5 mr-2 text-gaming-purple" />
            Staked NFTs ({stakedNFTs.length})
          </h4>
          {stakedNFTs.length === 0 ? (
            <div className="glass rounded-xl p-8 text-center border border-gray-700">
              <p className="text-silver-500">No NFTs staked yet</p>
              <p className="text-sm text-gaming-purple mt-2">Stake your Sk8 Punks below to start earning!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stakedNFTs.map(nft => (
                <div
                  key={nft.id}
                  className="glass rounded-xl p-4 border border-gaming-purple/30"
                >
                  <div className={`text-4xl text-center mb-2 p-4 rounded-lg bg-gradient-to-br ${getRarityColor(nft.rarity)}`}>
                    {nft.image}
                  </div>
                  <h5 className="font-semibold text-white text-sm truncate">{nft.name}</h5>
                  <p className="text-xs text-silver-500 capitalize">{nft.rarity} • {nft.multiplier}x</p>
                  <p className="text-xs text-gold-400 mt-1">+{formatHarlee(nft.rewards)} $HARLEE</p>
                  <p className="text-[10px] text-silver-600">~{formatHarlee(WEEKLY_HARLEE_REWARD * BigInt(Math.floor(nft.multiplier * 100)) / BigInt(100))}/week</p>
                  <button
                    onClick={() => unstakeNFT(nft)}
                    disabled={isUnstaking === nft.id}
                    className="w-full mt-2 py-2 text-xs bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    {isUnstaking === nft.id ? (
                      <>Unlocking...</>
                    ) : (
                      <>
                        <Unlock className="w-3 h-3" />
                        Unstake / Unlock
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Available NFTs */}
        <div>
          <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Unlock className="w-5 h-5 mr-2 text-silver-400" />
            Available to Stake ({availableNFTs.length})
          </h4>
          {availableNFTs.length === 0 ? (
            <div className="glass rounded-xl p-8 text-center border border-gray-700">
              <p className="text-silver-500">All your NFTs are staked!</p>
              <p className="text-sm text-emerald-400 mt-2">🎉 Maximum rewards activated!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {availableNFTs.map(nft => (
                <div
                  key={nft.id}
                  className="glass rounded-xl p-4 border border-silver-700/30 hover:border-gaming-purple/50 transition-colors"
                >
                  <div className={`text-4xl text-center mb-2 p-4 rounded-lg bg-gradient-to-br ${getRarityColor(nft.rarity)}`}>
                    {nft.image}
                  </div>
                  <h5 className="font-semibold text-white text-sm truncate">{nft.name}</h5>
                  <p className="text-xs text-silver-500 capitalize">{nft.rarity}</p>
                  <p className="text-xs text-emerald-400 mt-1">{nft.multiplier}x multiplier</p>
                  <p className="text-[10px] text-gold-400">Earn ~{formatHarlee(WEEKLY_HARLEE_REWARD * BigInt(Math.floor(nft.multiplier * 100)) / BigInt(100))}/week</p>
                  <button
                    onClick={() => stakeNFT(nft)}
                    disabled={isStaking}
                    className="w-full mt-2 py-2 text-xs bg-gaming-purple/20 text-gaming-purple rounded-lg hover:bg-gaming-purple/30 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    {isStaking ? (
                      <>Staking...</>
                    ) : (
                      <>
                        <Lock className="w-3 h-3" />
                        Stake NFT
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Staking Leaderboard Toggle */}
        <button
          onClick={() => setShowLeaderboard(!showLeaderboard)}
          className="w-full py-3 bg-gradient-to-r from-gaming-purple/20 to-gaming-pink/20 text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:from-gaming-purple/30 hover:to-gaming-pink/30 transition-all border border-gaming-purple/30"
        >
          <Trophy className="w-5 h-5 text-gold-400" />
          {showLeaderboard ? 'Hide' : 'Show'} Staking Leaderboard (Top 20)
          <ChevronRight className={`w-4 h-4 transition-transform ${showLeaderboard ? 'rotate-90' : ''}`} />
        </button>

        {/* Staking Leaderboard */}
        <AnimatePresence>
          {showLeaderboard && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="glass rounded-2xl p-6 border border-gold-500/20 overflow-hidden"
            >
              <h4 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Trophy className="w-6 h-6 text-gold-400" />
                Top 20 Stakers
                <span className="ml-auto text-sm font-normal text-silver-400">$HARLEE Earnings</span>
              </h4>
              {isLoadingLeaderboard ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-400"></div>
                  <span className="ml-3 text-silver-400">Loading leaderboard...</span>
                </div>
              ) : stakingLeaderboard.length === 0 ? (
                <div className="text-center py-12 text-silver-500">
                  <p>No staking data available yet.</p>
                  <p className="text-sm mt-2">Be the first to stake your NFTs!</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {stakingLeaderboard.map((entry) => (
                    <div
                      key={entry.rank}
                      className={`flex items-center justify-between p-3 rounded-xl ${
                        entry.rank <= 3 ? 'bg-gradient-to-r from-gold-500/10 to-transparent' : 'bg-raven-dark/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`text-xl font-bold ${
                          entry.rank === 1 ? 'text-gold-400' :
                          entry.rank === 2 ? 'text-silver-300' :
                          entry.rank === 3 ? 'text-amber-600' : 'text-silver-500'
                        }`}>
                          #{entry.rank}
                        </span>
                        <span className="text-xl">{entry.avatar}</span>
                        <div>
                          <p className="font-semibold text-white text-sm truncate max-w-[150px] sm:max-w-[200px]">
                            {entry.principal.length > 20 ? `${entry.principal.substring(0, 10)}...${entry.principal.substring(entry.principal.length - 6)}` : entry.principal}
                          </p>
                          <p className="text-xs text-silver-500">{entry.nftsStaked} NFTs staked</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gold-400">{formatHarlee(entry.totalEarned)}</p>
                        <p className="text-xs text-silver-500">{formatHarlee(entry.weeklyRate)}/week</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Leaderboard Component - Fetches real data from KIP canister
function Leaderboard() {
  const [leaderboardData, setLeaderboardData] = useState<Array<{ 
    rank: number; 
    name: string; 
    username: string;
    score: number; 
    harlee: string; 
    nfts: number; 
    avatar: string;
    profilePic?: string;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeLeaderboard, setActiveLeaderboard] = useState<'sk8_punks' | 'harlee_earned' | 'games_played'>('sk8_punks');
  const { identity } = useAuthStore();
  
  // Fetch leaderboard from backend
  useEffect(() => {
    const fetchLeaderboard = async () => {
      setIsLoading(true);
      try {
        await gameStatsService.init(identity || undefined);
        
        let entries: Array<{
          rank: number;
          principal: string;
          username?: string;
          displayName?: string;
          avatar?: string;
          score: number;
          additionalStats?: Record<string, any>;
        }> = [];
        
        switch (activeLeaderboard) {
          case 'sk8_punks':
            entries = await gameStatsService.getSk8PunksLeaderboard(20);
            break;
          case 'harlee_earned':
            entries = await gameStatsService.getHarleeLeaderboard(20);
            break;
          case 'games_played':
            // For games played, we'll use a combination of stats
            entries = await gameStatsService.getSk8PunksLeaderboard(20);
            break;
          default:
            entries = [];
        }
        
        const formatted = entries.map((entry) => ({
          rank: entry.rank,
          name: entry.displayName || 'Anonymous',
          username: entry.username || 'anon',
          score: entry.score,
          harlee: activeLeaderboard === 'harlee_earned' 
            ? entry.additionalStats?.harleeFormatted || formatHarlee(BigInt(entry.score))
            : formatHarlee(BigInt(entry.additionalStats?.harleeEarned || 0)),
          nfts: 0, // Would need to fetch from staking canister
          avatar: entry.avatar || '🛹',
          profilePic: entry.avatar,
        }));
        
        setLeaderboardData(formatted);
      } catch (error) {
        console.error('Failed to fetch leaderboard from backend:', error);
        // Fallback to localStorage if backend fails
        try {
          const localScores = JSON.parse(localStorage.getItem('sk8_punk_scores') || '[]');
          if (localScores.length > 0) {
            const sortedScores = localScores
              .sort((a: any, b: any) => b.score - a.score)
              .slice(0, 20)
              .map((entry: any, idx: number) => ({
                rank: idx + 1,
                name: entry.displayName || 'Anonymous',
                username: entry.username || 'anon',
                score: entry.score || 0,
                harlee: formatHarlee(BigInt(entry.harleeEarned || 0)),
                nfts: entry.nftsStaked || 0,
                avatar: entry.avatar || '🛹',
                profilePic: entry.profilePictureUrl,
              }));
            setLeaderboardData(sortedScores);
          }
        } catch (fallbackError) {
          console.error('Failed to load fallback leaderboard:', fallbackError);
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchLeaderboard();
  }, [activeLeaderboard, identity]);

  return (
    <div className="glass rounded-2xl p-6 border border-gaming-purple/20">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center">
        <Trophy className="w-6 h-6 mr-2 text-gold-400" />
        Global Leaderboard
        <span className="ml-auto text-sm font-normal text-gold-400">$HARLEE Rewards</span>
      </h3>
      
      {/* Leaderboard Type Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'sk8_punks', label: 'High Score' },
          { id: 'harlee_earned', label: '$HARLEE Earned' },
          { id: 'games_played', label: 'Games Played' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveLeaderboard(tab.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeLeaderboard === tab.id
                ? 'bg-gaming-purple text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      {isLoading ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-gaming-purple border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading leaderboard...</p>
        </div>
      ) : leaderboardData.length === 0 ? (
        <div className="text-center py-12">
          <Trophy className="w-16 h-16 text-gold-400/30 mx-auto mb-4" />
          <h4 className="text-lg font-bold text-white mb-2">No Players Yet</h4>
          <p className="text-silver-400 mb-6">
            Be the first to play and claim your spot on the leaderboard!
          </p>
          <p className="text-gold-400 text-sm">
            Earn $HARLEE by playing the game and staking your Sk8 Punk NFTs.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {leaderboardData.map((player) => (
            <div
              key={player.rank}
              className={`flex items-center justify-between p-3 rounded-xl transition-all hover:bg-gaming-purple/10 ${
                player.rank <= 3 ? 'bg-gradient-to-r from-gold-500/10 to-transparent' : 'bg-raven-dark/50'
              }`}
            >
              <div className="flex items-center gap-4">
                <span className={`text-2xl font-bold w-8 ${
                  player.rank === 1 ? 'text-gold-400' :
                  player.rank === 2 ? 'text-silver-300' :
                  player.rank === 3 ? 'text-amber-600' : 'text-silver-500'
                }`}>
                  #{player.rank}
                </span>
                {player.profilePic ? (
                  <img 
                    src={player.profilePic} 
                    alt={player.name}
                    className="w-10 h-10 rounded-full object-cover border-2 border-gaming-purple/30"
                  />
                ) : (
                  <span className="w-10 h-10 rounded-full bg-gaming-purple/20 flex items-center justify-center text-2xl">
                    {player.avatar}
                  </span>
                )}
                <div>
                  <p className="font-semibold text-white">{player.name}</p>
                  <p className="text-xs text-silver-500">@{player.username} · {player.nfts} NFTs staked</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-gaming-purple">{player.score.toLocaleString()}</p>
                <p className="text-xs text-gold-400">{player.harlee} $HARLEE</p>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Your Rank */}
      <div className="mt-6 pt-6 border-t border-gray-800">
        <div className="flex items-center justify-between p-4 rounded-xl bg-gaming-purple/10 border border-gaming-purple/30">
          <div className="flex items-center gap-3">
            <span className="text-gray-400 text-sm">Your Rank:</span>
            <span className="text-xl font-bold text-gaming-purple">--</span>
          </div>
          <p className="text-sm text-gray-400">Play to get ranked!</p>
        </div>
      </div>
    </div>
  );
}

// Main Page Component
export default function Sk8PunksPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'play' | 'stake' | 'leaderboard'>('play');
  const [totalScore, setTotalScore] = useState(0);
  const [totalHarlee, setTotalHarlee] = useState<bigint>(BigInt(0));
  const { isAuthenticated } = useAuthStore();

  const tabs = [
    { id: 'play', label: 'Play Game', icon: Gamepad2 },
    { id: 'stake', label: 'NFT Staking', icon: Lock },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  ];

  const handleHarleeEarned = (amount: bigint) => {
    setTotalHarlee(prev => prev + amount);
  };

  return (
    <div className="min-h-screen pt-20 md:pt-24 pb-24 md:pb-12">
      {/* Hero Banner */}
      <div className="relative h-48 md:h-64 mb-8 overflow-hidden">
        <img 
          src={sk8PunksBanner} 
          alt="Raven Sk8 Punks" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 md:mb-12"
        >
          <div className="relative w-24 h-24 md:w-32 md:h-32 mx-auto mb-4 md:mb-6">
            <motion.div
              animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 bg-gradient-to-t from-gaming-purple to-gaming-pink rounded-2xl opacity-30 blur-xl"
            />
            <img 
              src={sk8Logo} 
              alt="Raven Sk8 Punks" 
              className="relative w-full h-full rounded-2xl border border-gaming-purple/30 object-contain"
            />
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold mb-2 md:mb-4">
            <span className="text-white">Raven</span>{' '}
            <span className="bg-gradient-to-r from-gaming-purple to-gaming-pink bg-clip-text text-transparent">
              Sk8 Punks
            </span>
          </h1>
          <p className="text-base md:text-lg text-silver-400 max-w-xl mx-auto mb-4">
            Play-to-earn skateboarding game. Stake NFTs, perform tricks, earn $HARLEE!
          </p>
          <p className="text-gold-400 text-sm mb-6">
            Powered by $HARLEE Token (Ledger: {HARLEE_TOKEN.ledger.slice(0, 10)}...)
          </p>

          {/* Shop Merch Button */}
          <a
            href="https://t3kno-logic.xyz/collections/raven-sk8-punks"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gaming-purple to-gaming-pink text-white font-bold rounded-xl hover:shadow-lg hover:shadow-purple-500/25 transition-all"
          >
            <ShoppingCart className="w-5 h-5" />
            Shop our exclusive Raven Sk8 Punks Merch
            <ExternalLink className="w-4 h-4" />
          </a>
        </motion.div>

        {/* Stats Bar - Real data only */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8"
        >
          {[
            { label: 'Your Score', value: totalScore.toLocaleString(), icon: Star, color: 'text-gold-400' },
            { label: '$HARLEE Earned', value: formatHarlee(totalHarlee), icon: Coins, color: 'text-gold-400' },
            { label: 'Collection Size', value: '888', icon: Users, color: 'text-gaming-purple' },
            { label: 'Floor Price', value: '0.4T', icon: Timer, color: 'text-red-400' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="glass rounded-xl p-3 md:p-4 text-center border border-gaming-purple/20"
            >
              <stat.icon className={`w-5 h-5 md:w-6 md:h-6 ${stat.color} mx-auto mb-1 md:mb-2`} />
              <p className="text-lg md:text-xl font-bold text-white">{stat.value}</p>
              <p className="text-[10px] md:text-xs text-silver-500">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 md:mb-8 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 rounded-xl font-medium transition-all whitespace-nowrap text-sm md:text-base ${
                activeTab === tab.id
                  ? 'bg-gaming-purple text-white'
                  : 'bg-raven-dark text-silver-400 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4 md:w-5 md:h-5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'play' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                <div className="lg:col-span-2">
                  <SkateGame 
                    onScoreUpdate={setTotalScore}
                    onHarleeEarned={handleHarleeEarned}
                    multiplier={1.5}
                    characterSkin="🛹"
                  />
                </div>
                <div className="space-y-4 md:space-y-6">
                  {/* Tricks Guide */}
                  <div className="glass rounded-xl p-4 border border-gaming-purple/20">
                    <h4 className="font-semibold text-white mb-3 flex items-center">
                      <Zap className="w-5 h-5 mr-2 text-gold-400" />
                      Trick Guide
                    </h4>
                    <div className="space-y-2">
                      {TRICKS.map((trick) => (
                        <div key={trick.name} className="flex justify-between items-center text-sm">
                          <div className="flex items-center gap-2">
                            <kbd className="px-2 py-0.5 bg-gray-700 rounded text-xs text-white uppercase">
                              {trick.key}
                            </kbd>
                            <span className="text-silver-300">{trick.name}</span>
                          </div>
                          <span className="text-gold-400">{formatHarlee(trick.harlee)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="glass rounded-xl p-4 border border-gaming-purple/20">
                    <h4 className="font-semibold text-white mb-3 flex items-center">
                      <Award className="w-5 h-5 mr-2 text-gaming-purple" />
                      Session Stats
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-silver-400">High Score</span>
                        <span className="text-white font-semibold">{totalScore.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-silver-400">$HARLEE Earned</span>
                        <span className="text-gold-400 font-semibold">{formatHarlee(totalHarlee)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-silver-400">Best Combo</span>
                        <span className="text-white font-semibold">x12</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'stake' && <NFTStaking />}

            {activeTab === 'leaderboard' && <Leaderboard />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
