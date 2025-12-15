/**
 * Game Stats Service
 * Persists and retrieves game statistics from KIP canister
 * Covers: Sk8 Punks, Crossword Quest, and other games
 */

import { Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { kipService, KIPProfile } from './kipService';

// ============ TYPES ============

export interface Sk8PunksStats {
  highScore: number;
  gamesPlayed: number;
  totalHarleeEarned: bigint;
  achievements: Achievement[];
  currentStreak: number;
  longestStreak: number;
  lastPlayed: number;
  rank?: number;
}

export interface CrosswordStats {
  puzzlesSolved: number;
  currentStreak: number;
  longestStreak: number;
  totalXP: number;
  totalHarleeEarned: bigint;
  badges: Badge[];
  lastPlayed: number;
  averageTime: number; // seconds
  perfectPuzzles: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: number;
  progress?: number;
  target?: number;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  unlockedAt: number;
}

export interface LeaderboardEntry {
  rank: number;
  principal: string;
  username?: string;
  displayName?: string;
  avatar?: string;
  score: number;
  additionalStats?: Record<string, any>;
}

export interface GameSession {
  id: string;
  game: 'sk8punks' | 'crossword';
  principal: string;
  score: number;
  harleeEarned: bigint;
  startedAt: number;
  endedAt: number;
  metadata?: Record<string, any>;
}

// ============ ACHIEVEMENTS DATA ============

export const SK8_PUNKS_ACHIEVEMENTS: Achievement[] = [
  { id: 'first-trick', name: 'First Trick', description: 'Land your first trick', icon: '🛹', target: 1 },
  { id: 'combo-master', name: 'Combo Master', description: 'Achieve a 10x combo', icon: '🔥', target: 10 },
  { id: 'high-scorer', name: 'High Scorer', description: 'Score over 10,000 points', icon: '⭐', target: 10000 },
  { id: 'streak-warrior', name: 'Streak Warrior', description: 'Play 7 days in a row', icon: '📅', target: 7 },
  { id: 'harlee-hunter', name: '$HARLEE Hunter', description: 'Earn 1,000 $HARLEE', icon: '🦅', target: 1000 },
  { id: 'grind-king', name: 'Grind King', description: 'Complete 50 grinds', icon: '👑', target: 50 },
  { id: 'air-time', name: 'Air Time', description: 'Stay airborne for 5+ seconds', icon: '✈️', target: 5 },
  { id: 'perfect-landing', name: 'Perfect Landing', description: 'Land 100 perfect tricks', icon: '🎯', target: 100 },
];

export const CROSSWORD_BADGES: Badge[] = [
  { id: 'puzzle-novice', name: 'Puzzle Novice', icon: '📝', tier: 'bronze', unlockedAt: 0 },
  { id: 'word-warrior', name: 'Word Warrior', icon: '⚔️', tier: 'silver', unlockedAt: 0 },
  { id: 'crossword-champion', name: 'Crossword Champion', icon: '🏆', tier: 'gold', unlockedAt: 0 },
  { id: 'puzzle-master', name: 'Puzzle Master', icon: '👑', tier: 'platinum', unlockedAt: 0 },
];

// ============ SERVICE CLASS ============

export class GameStatsService {
  private identity?: Identity;

  async init(identity?: Identity): Promise<void> {
    this.identity = identity;
    await kipService.init(identity);
  }

  // ============ SK8 PUNKS ============

  async getSk8PunksStats(principal: string): Promise<Sk8PunksStats> {
    try {
      const profile = await kipService.getProfile(principal);
      
      if (profile) {
        return {
          highScore: profile.stats.sk8PunksHighScore,
          gamesPlayed: profile.stats.totalGamesPlayed,
          totalHarleeEarned: profile.stats.totalHarleeEarned,
          achievements: this.loadAchievements('sk8punks', principal),
          currentStreak: 0, // Would be calculated from last played dates
          longestStreak: 0,
          lastPlayed: profile.updatedAt,
        };
      }
    } catch (error) {
      console.error('Failed to fetch Sk8 Punks stats:', error);
    }
    
    // Return default stats
    return {
      highScore: 0,
      gamesPlayed: 0,
      totalHarleeEarned: BigInt(0),
      achievements: [],
      currentStreak: 0,
      longestStreak: 0,
      lastPlayed: 0,
    };
  }

  async updateSk8PunksScore(principal: string, score: number, harleeEarned: bigint): Promise<void> {
    try {
      // Update via KIP canister
      const principalObj = Principal.fromText(principal);
      
      // Call update_user_stats with the new score and harlee earned
      await kipService.updateUserStats(
        principalObj,
        {
          games_played: 1, // Increment by 1
          harlee_earned: Number(harleeEarned),
          sk8_high_score: score, // Will update if higher than current
        },
        this.identity
      );
      
      // Also save locally for quick access
      const profile = await kipService.getProfile(principal);
      if (profile) {
        this.saveLocalStats('sk8punks', principal, {
          highScore: Math.max(profile.stats.sk8PunksHighScore, score),
          gamesPlayed: profile.stats.totalGamesPlayed + 1,
          totalHarleeEarned: (profile.stats.totalHarleeEarned + harleeEarned).toString(),
          lastPlayed: Date.now(),
        });
      }
    } catch (error) {
      console.error('Failed to update Sk8 Punks stats:', error);
      // Fallback to local storage if backend call fails
      const localStats = this.loadLocalStats('sk8punks', principal);
      this.saveLocalStats('sk8punks', principal, {
        highScore: Math.max(localStats?.highScore || 0, score),
        gamesPlayed: (localStats?.gamesPlayed || 0) + 1,
        totalHarleeEarned: (BigInt(localStats?.totalHarleeEarned || 0) + harleeEarned).toString(),
        lastPlayed: Date.now(),
      });
      throw error;
    }
  }

  // ============ CROSSWORD ============

  async getCrosswordStats(principal: string): Promise<CrosswordStats> {
    try {
      const profile = await kipService.getProfile(principal);
      
      if (profile) {
        const localStats = this.loadLocalStats('crossword', principal);
        
        return {
          puzzlesSolved: profile.stats.crosswordPuzzlesSolved,
          currentStreak: localStats?.currentStreak || 0,
          longestStreak: localStats?.longestStreak || 0,
          totalXP: localStats?.totalXP || 0,
          totalHarleeEarned: BigInt(localStats?.totalHarleeEarned || 0),
          badges: this.loadBadges('crossword', principal),
          lastPlayed: profile.updatedAt,
          averageTime: localStats?.averageTime || 0,
          perfectPuzzles: localStats?.perfectPuzzles || 0,
        };
      }
    } catch (error) {
      console.error('Failed to fetch Crossword stats:', error);
    }
    
    return {
      puzzlesSolved: 0,
      currentStreak: 0,
      longestStreak: 0,
      totalXP: 0,
      totalHarleeEarned: BigInt(0),
      badges: [],
      lastPlayed: 0,
      averageTime: 0,
      perfectPuzzles: 0,
    };
  }

  async updateCrosswordStats(
    principal: string, 
    puzzleSolved: boolean, 
    timeSeconds: number, 
    xpEarned: number,
    harleeEarned: bigint,
    isPerfect: boolean
  ): Promise<void> {
    try {
      const currentStats = await this.getCrosswordStats(principal);
      
      const newStats = {
        puzzlesSolved: currentStats.puzzlesSolved + (puzzleSolved ? 1 : 0),
        currentStreak: puzzleSolved ? currentStats.currentStreak + 1 : 0,
        longestStreak: Math.max(currentStats.longestStreak, currentStats.currentStreak + 1),
        totalXP: currentStats.totalXP + xpEarned,
        totalHarleeEarned: (currentStats.totalHarleeEarned + harleeEarned).toString(),
        lastPlayed: Date.now(),
        averageTime: this.calculateNewAverage(currentStats.averageTime, timeSeconds, currentStats.puzzlesSolved),
        perfectPuzzles: currentStats.perfectPuzzles + (isPerfect ? 1 : 0),
      };
      
      this.saveLocalStats('crossword', principal, newStats);
      
      // Check for new badges
      this.checkAndAwardBadges('crossword', principal, newStats);
      
      // Crossword stats updated successfully
    } catch (error) {
      console.error('Failed to update Crossword stats:', error);
      throw error;
    }
  }

  // ============ LEADERBOARDS ============

  async getSk8PunksLeaderboard(limit: number = 20): Promise<LeaderboardEntry[]> {
    try {
      // Fetch from KIP canister
      const entries = await kipService.getLeaderboard('sk8_punks_high_score', limit);
      
      return entries.map((entry, index) => ({
        rank: index + 1,
        principal: entry.profile.principal,
        username: entry.profile.username,
        displayName: entry.profile.displayName,
        avatar: entry.profile.profilePictureUrl,
        score: Number(entry.score),
      }));
    } catch (error) {
      console.error('Failed to fetch Sk8 Punks leaderboard:', error);
      return [];
    }
  }

  async getCrosswordLeaderboard(limit: number = 20): Promise<LeaderboardEntry[]> {
    try {
      const entries = await kipService.getLeaderboard('crossword_puzzles_solved', limit);
      
      return entries.map((entry, index) => ({
        rank: index + 1,
        principal: entry.profile.principal,
        username: entry.profile.username,
        displayName: entry.profile.displayName,
        avatar: entry.profile.profilePictureUrl,
        score: Number(entry.score),
      }));
    } catch (error) {
      console.error('Failed to fetch Crossword leaderboard:', error);
      return [];
    }
  }

  async getHarleeLeaderboard(limit: number = 20): Promise<LeaderboardEntry[]> {
    try {
      const entries = await kipService.getLeaderboard('total_harlee_earned', limit);
      
      return entries.map((entry, index) => ({
        rank: index + 1,
        principal: entry.profile.principal,
        username: entry.profile.username,
        displayName: entry.profile.displayName,
        avatar: entry.profile.profilePictureUrl,
        score: Number(entry.score),
        additionalStats: {
          harleeFormatted: this.formatHarlee(entry.score),
        },
      }));
    } catch (error) {
      console.error('Failed to fetch HARLEE leaderboard:', error);
      return [];
    }
  }

  // ============ HELPERS ============

  private calculateNewAverage(currentAvg: number, newValue: number, count: number): number {
    if (count === 0) return newValue;
    return Math.round((currentAvg * count + newValue) / (count + 1));
  }

  private formatHarlee(amount: bigint): string {
    const num = Number(amount) / 100000000; // 8 decimals
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
    return num.toFixed(2);
  }

  // Local storage helpers (temporary until full backend integration)
  private saveLocalStats(game: string, principal: string, stats: any): void {
    try {
      const key = `raven_${game}_stats_${principal}`;
      localStorage.setItem(key, JSON.stringify(stats));
    } catch (error) {
      console.error('Failed to save local stats:', error);
    }
  }

  private loadLocalStats(game: string, principal: string): any {
    try {
      const key = `raven_${game}_stats_${principal}`;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to load local stats:', error);
      return null;
    }
  }

  private loadAchievements(game: string, principal: string): Achievement[] {
    try {
      const key = `raven_${game}_achievements_${principal}`;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      return [];
    }
  }

  private saveAchievements(game: string, principal: string, achievements: Achievement[]): void {
    try {
      const key = `raven_${game}_achievements_${principal}`;
      localStorage.setItem(key, JSON.stringify(achievements));
    } catch (error) {
      console.error('Failed to save achievements:', error);
    }
  }

  private loadBadges(game: string, principal: string): Badge[] {
    try {
      const key = `raven_${game}_badges_${principal}`;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      return [];
    }
  }

  private checkAndAwardBadges(game: string, principal: string, stats: any): void {
    if (game === 'crossword') {
      const currentBadges = this.loadBadges(game, principal);
      const newBadges: Badge[] = [...currentBadges];
      
      // Check badge criteria
      if (stats.puzzlesSolved >= 1 && !currentBadges.find(b => b.id === 'puzzle-novice')) {
        newBadges.push({ ...CROSSWORD_BADGES[0], unlockedAt: Date.now() });
      }
      if (stats.puzzlesSolved >= 25 && !currentBadges.find(b => b.id === 'word-warrior')) {
        newBadges.push({ ...CROSSWORD_BADGES[1], unlockedAt: Date.now() });
      }
      if (stats.puzzlesSolved >= 100 && !currentBadges.find(b => b.id === 'crossword-champion')) {
        newBadges.push({ ...CROSSWORD_BADGES[2], unlockedAt: Date.now() });
      }
      if (stats.puzzlesSolved >= 500 && !currentBadges.find(b => b.id === 'puzzle-master')) {
        newBadges.push({ ...CROSSWORD_BADGES[3], unlockedAt: Date.now() });
      }
      
      if (newBadges.length > currentBadges.length) {
        localStorage.setItem(`raven_${game}_badges_${principal}`, JSON.stringify(newBadges));
      }
    }
  }
}

// Singleton
export const gameStatsService = new GameStatsService();

// ============ REACT HOOKS ============

import { useState, useEffect, useCallback } from 'react';

export function useSk8PunksStats(principal?: string, identity?: Identity) {
  const [stats, setStats] = useState<Sk8PunksStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!principal) {
      setStats(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      await gameStatsService.init(identity);
      const data = await gameStatsService.getSk8PunksStats(principal);
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch stats');
    } finally {
      setIsLoading(false);
    }
  }, [principal, identity]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, isLoading, error, refresh: fetchStats };
}

export function useCrosswordStats(principal?: string, identity?: Identity) {
  const [stats, setStats] = useState<CrosswordStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!principal) {
      setStats(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      await gameStatsService.init(identity);
      const data = await gameStatsService.getCrosswordStats(principal);
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch stats');
    } finally {
      setIsLoading(false);
    }
  }, [principal, identity]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, isLoading, error, refresh: fetchStats };
}

export function useGameLeaderboard(
  game: 'sk8punks' | 'crossword' | 'harlee', 
  limit: number = 20,
  identity?: Identity
) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await gameStatsService.init(identity);
      
      let data: LeaderboardEntry[];
      switch (game) {
        case 'sk8punks':
          data = await gameStatsService.getSk8PunksLeaderboard(limit);
          break;
        case 'crossword':
          data = await gameStatsService.getCrosswordLeaderboard(limit);
          break;
        case 'harlee':
          data = await gameStatsService.getHarleeLeaderboard(limit);
          break;
        default:
          data = [];
      }
      
      setLeaderboard(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch leaderboard');
    } finally {
      setIsLoading(false);
    }
  }, [game, limit, identity]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return { leaderboard, isLoading, error, refresh: fetchLeaderboard };
}

export default gameStatsService;


