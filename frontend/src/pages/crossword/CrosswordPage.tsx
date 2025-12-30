/**
 * Raven's Knowledge Crossword Quest
 * AI-Generated Crossword Puzzles with $HARLEE Token Rewards
 * Features: Daily Puzzles, AI Generation, Streak Rewards, NFT Achievements
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PuzzleIcon, 
  Calendar, 
  Trophy, 
  Users, 
  Sparkles,
  Check,
  X,
  RefreshCw,
  Lightbulb,
  Clock,
  Flame,
  Award,
  Brain,
  Zap,
  Gift,
  ChevronRight,
  Coins
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { TOKEN_CANISTERS, formatHarlee, TokenService } from '../../services/tokenService';
import { CrosswordService, CrosswordPuzzle as BackendPuzzle } from '../../services/crosswordService';
import { Principal } from '@dfinity/principal';

// Brand Assets
import questBackground from '../../quest.svg';
import puzzleBoard from '../../puzzle_background.svg';

// $HARLEE Token Configuration
const HARLEE_TOKEN = TOKEN_CANISTERS.HARLEE;

// Types
interface CrosswordCell {
  letter: string;
  userInput: string;
  isBlocked: boolean;
  number?: number;
  isCorrect?: boolean;
  isRevealed?: boolean;
}

interface CrosswordClue {
  number: number;
  direction: 'across' | 'down';
  clue: string;
  answer: string;
  aiGenerated: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface PuzzleData {
  id: string;
  title: string;
  theme: string;
  grid: CrosswordCell[][];
  clues: {
    across: CrosswordClue[];
    down: CrosswordClue[];
  };
  difficulty: 'easy' | 'medium' | 'hard';
  aiGenerated: boolean;
  rewards: {
    harlee: bigint;
    xp: number;
    nftChance: number;
  };
}

interface UserStats {
  streak: number;
  totalSolved: number;
  bestTime: number;
  totalXP: number;
  totalHarlee: bigint;
  level: number;
  nftBadges: string[];
}

// AI Verification Component
function AIVerification({ 
  isVerifying, 
  result,
  reward,
}: { 
  isVerifying: boolean; 
  result: 'correct' | 'incorrect' | null;
  reward?: bigint;
}) {
  if (!isVerifying && !result) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
    >
      <div className="bg-raven-dark rounded-2xl p-8 text-center max-w-md mx-4 border border-emerald-500/30">
        {isVerifying ? (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="w-16 h-16 mx-auto mb-4"
            >
              <Brain className="w-full h-full text-emerald-400" />
            </motion.div>
            <h3 className="text-xl font-bold text-white mb-2">AI Verifying...</h3>
            <p className="text-silver-400">Our AI is checking your answers</p>
          </>
        ) : result === 'correct' ? (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 10 }}
            >
              <Check className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
            </motion.div>
            <h3 className="text-2xl font-bold text-emerald-400 mb-2">Puzzle Complete!</h3>
            <p className="text-silver-400 mb-4">All answers verified by AI</p>
            {reward && (
              <div className="bg-gold-500/20 rounded-xl p-4">
                <p className="text-gold-400 text-lg font-bold flex items-center justify-center gap-2">
                  <Coins className="w-5 h-5" />
                  +{formatHarlee(reward)} $HARLEE Earned!
                </p>
              </div>
            )}
          </>
        ) : (
          <>
            <X className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-red-400 mb-2">Some Answers Incorrect</h3>
            <p className="text-silver-400">Keep trying!</p>
          </>
        )}
      </div>
    </motion.div>
  );
}

// Crossword Grid Component with puzzle_background
function CrosswordGrid({
  puzzle,
  selectedCell,
  onCellSelect,
  onInputChange,
}: {
  puzzle: PuzzleData;
  selectedCell: { row: number; col: number } | null;
  onCellSelect: (row: number, col: number) => void;
  onInputChange: (row: number, col: number, value: string) => void;
}) {
  return (
    <div 
      className="inline-block p-4 rounded-xl relative overflow-hidden"
      style={{ 
        backgroundImage: `url(${puzzleBoard})`, 
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative z-10">
        {puzzle.grid.map((row, rowIndex) => (
          <div key={rowIndex} className="flex">
            {row.map((cell, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`relative w-8 h-8 sm:w-10 sm:h-10 border border-gray-600 ${
                  cell.isBlocked
                    ? 'bg-gray-800'
                    : selectedCell?.row === rowIndex && selectedCell?.col === colIndex
                    ? 'bg-emerald-500/30'
                    : cell.isCorrect
                    ? 'bg-emerald-500/20'
                    : cell.isRevealed
                    ? 'bg-yellow-500/20'
                    : 'bg-raven-charcoal/80 hover:bg-gray-700'
                } cursor-pointer transition-colors`}
                onClick={() => !cell.isBlocked && onCellSelect(rowIndex, colIndex)}
              >
                {cell.number && (
                  <span className="absolute top-0 left-0.5 text-[8px] text-silver-400">
                    {cell.number}
                  </span>
                )}
                {!cell.isBlocked && (
                  <input
                    type="text"
                    maxLength={1}
                    value={cell.userInput}
                    onChange={(e) => onInputChange(rowIndex, colIndex, e.target.value.toUpperCase())}
                    className={`w-full h-full bg-transparent text-center font-bold uppercase focus:outline-none ${
                      cell.isCorrect ? 'text-emerald-400' : cell.isRevealed ? 'text-yellow-400' : 'text-white'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Clues Panel Component
function CluesPanel({
  clues,
  selectedClue,
  onClueSelect,
}: {
  clues: { across: CrosswordClue[]; down: CrosswordClue[] };
  selectedClue: CrosswordClue | null;
  onClueSelect: (clue: CrosswordClue) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Across */}
      <div>
        <h4 className="font-semibold text-emerald-400 mb-3 flex items-center">
          <ChevronRight className="w-4 h-4 mr-1" />
          Across
        </h4>
        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
          {clues.across.map((clue) => (
            <button
              key={`across-${clue.number}`}
              onClick={() => onClueSelect(clue)}
              className={`w-full text-left p-2 rounded-lg text-sm transition-colors ${
                selectedClue?.number === clue.number && selectedClue?.direction === 'across'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'hover:bg-gray-800 text-silver-400'
              }`}
            >
              <span className="font-bold mr-2">{clue.number}.</span>
              {clue.clue}
              {clue.aiGenerated && (
                <Sparkles className="w-3 h-3 inline ml-1 text-gold-400" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Down */}
      <div>
        <h4 className="font-semibold text-emerald-400 mb-3 flex items-center">
          <ChevronRight className="w-4 h-4 mr-1 rotate-90" />
          Down
        </h4>
        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
          {clues.down.map((clue) => (
            <button
              key={`down-${clue.number}`}
              onClick={() => onClueSelect(clue)}
              className={`w-full text-left p-2 rounded-lg text-sm transition-colors ${
                selectedClue?.number === clue.number && selectedClue?.direction === 'down'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'hover:bg-gray-800 text-silver-400'
              }`}
            >
              <span className="font-bold mr-2">{clue.number}.</span>
              {clue.clue}
              {clue.aiGenerated && (
                <Sparkles className="w-3 h-3 inline ml-1 text-gold-400" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Stats Dashboard with $HARLEE
function StatsDashboard({ stats }: { stats: UserStats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-6 md:mb-8">
      <div className="glass rounded-xl p-3 md:p-4 text-center border border-emerald-500/20">
        <Flame className="w-5 h-5 md:w-6 md:h-6 text-orange-400 mx-auto mb-1 md:mb-2" />
        <p className="text-xl md:text-2xl font-bold text-white">{stats.streak}</p>
        <p className="text-[10px] md:text-xs text-silver-500">Day Streak</p>
      </div>
      <div className="glass rounded-xl p-3 md:p-4 text-center border border-emerald-500/20">
        <Trophy className="w-5 h-5 md:w-6 md:h-6 text-gold-400 mx-auto mb-1 md:mb-2" />
        <p className="text-xl md:text-2xl font-bold text-white">{stats.totalSolved}</p>
        <p className="text-[10px] md:text-xs text-silver-500">Puzzles Solved</p>
      </div>
      <div className="glass rounded-xl p-3 md:p-4 text-center border border-emerald-500/20">
        <Coins className="w-5 h-5 md:w-6 md:h-6 text-gold-400 mx-auto mb-1 md:mb-2" />
        <p className="text-xl md:text-2xl font-bold text-gold-400">{formatHarlee(stats.totalHarlee)}</p>
        <p className="text-[10px] md:text-xs text-silver-500">$HARLEE Earned</p>
      </div>
      <div className="glass rounded-xl p-3 md:p-4 text-center border border-emerald-500/20">
        <Zap className="w-5 h-5 md:w-6 md:h-6 text-emerald-400 mx-auto mb-1 md:mb-2" />
        <p className="text-xl md:text-2xl font-bold text-white">{stats.totalXP}</p>
        <p className="text-[10px] md:text-xs text-silver-500">Total XP</p>
      </div>
      <div className="glass rounded-xl p-3 md:p-4 text-center border border-emerald-500/20 col-span-2 md:col-span-1">
        <Award className="w-5 h-5 md:w-6 md:h-6 text-purple-400 mx-auto mb-1 md:mb-2" />
        <p className="text-xl md:text-2xl font-bold text-white">{stats.nftBadges.length}</p>
        <p className="text-[10px] md:text-xs text-silver-500">NFT Badges</p>
      </div>
    </div>
  );
}

// Main Page Component
export default function CrosswordPage() {
  const { t } = useTranslation();
  const { isAuthenticated, principal, identity } = useAuthStore();
  const [puzzle, setPuzzle] = useState<PuzzleData | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [selectedClue, setSelectedClue] = useState<CrosswordClue | null>(null);
  const [timer, setTimer] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<'correct' | 'incorrect' | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastReward, setLastReward] = useState<bigint | undefined>(undefined);

  const [stats, setStats] = useState<UserStats>({
    streak: 0,
    totalSolved: 0,
    bestTime: 0,
    totalXP: 0,
    totalHarlee: BigInt(0),
    level: 1,
    nftBadges: [],
  });

  // Fetch real $HARLEE balance on load
  useEffect(() => {
    const fetchBalance = async () => {
      if (isAuthenticated && principal) {
        try {
          const tokenService = new TokenService();
          const balance = await tokenService.getHarleeBalance(principal);
          // Use real balance if available
          if (balance.balance > BigInt(0)) {
            setStats(prev => ({ ...prev, totalHarlee: balance.balance }));
          }
        } catch (error) {
          console.error('Failed to fetch $HARLEE balance:', error);
        }
      }
    };
    fetchBalance();
  }, [isAuthenticated, principal]);

  // Generate new puzzle using backend AI
  const generatePuzzle = useCallback(async () => {
    setIsGenerating(true);
    try {
      // Generate puzzle from backend
      const backendPuzzle = await CrosswordService.generatePuzzle(
        'Cryptocurrency & Blockchain',
        'medium',
        identity
      );
      
      // Convert backend puzzle to frontend format
      const gridSize = backendPuzzle.grid_size;
      const grid: CrosswordCell[][] = Array(gridSize).fill(null).map(() =>
        Array(gridSize).fill(null).map(() => ({
          letter: '',
          userInput: '',
          isBlocked: true,
        }))
      );
      
      // Place answers in grid
      backendPuzzle.answers.forEach(([row, col, letter]) => {
        if (row < gridSize && col < gridSize) {
          grid[row][col] = {
            letter: letter.toUpperCase(),
            userInput: '',
            isBlocked: false,
          };
        }
      });
      
      // Add clue numbers
      let clueNumber = 1;
      const clueMap = new Map<string, number>();
      backendPuzzle.clues.forEach(clue => {
        const key = `${clue.direction}-${clue.number}`;
        if (!clueMap.has(key)) {
          clueMap.set(key, clueNumber++);
        }
      });
      
      // Convert clues to frontend format
      const acrossClues = backendPuzzle.clues
        .filter(c => c.direction === 'across')
        .map(c => ({
          number: c.number,
          direction: 'across' as const,
          clue: c.clue,
          answer: c.answer,
          aiGenerated: true,
          difficulty: c.difficulty,
        }));
      
      const downClues = backendPuzzle.clues
        .filter(c => c.direction === 'down')
        .map(c => ({
          number: c.number,
          direction: 'down' as const,
          clue: c.clue,
          answer: c.answer,
          aiGenerated: true,
          difficulty: c.difficulty,
        }));
      
      const newPuzzle: PuzzleData = {
        id: backendPuzzle.id,
        title: backendPuzzle.title,
        theme: backendPuzzle.theme,
        grid,
        clues: {
          across: acrossClues,
          down: downClues,
        },
        difficulty: backendPuzzle.difficulty,
        aiGenerated: true,
        rewards: {
          harlee: backendPuzzle.rewards_harlee,
          xp: backendPuzzle.rewards_xp,
          nftChance: 0.1,
        },
      };
      
      setPuzzle(newPuzzle);
      setTimer(0);
      setIsPlaying(true);
      setHintsUsed(0);
      setVerificationResult(null);
      setLastReward(undefined);
    } catch (error) {
      console.error('Failed to generate puzzle:', error);
      // No fallback to simulated data
      alert('Failed to generate puzzle via AI. Please check your connection and try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [identity]);

  // Timer
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setTimer(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Handle cell input
  const handleInputChange = (row: number, col: number, value: string) => {
    if (!puzzle) return;
    const newGrid = [...puzzle.grid];
    newGrid[row][col] = { ...newGrid[row][col], userInput: value };
    setPuzzle({ ...puzzle, grid: newGrid });
  };

  // Use hint (costs $HARLEE in production)
  const useHint = () => {
    if (!puzzle || !selectedCell) return;
    const cell = puzzle.grid[selectedCell.row][selectedCell.col];
    if (cell.isBlocked || cell.isRevealed) return;

    const newGrid = [...puzzle.grid];
    newGrid[selectedCell.row][selectedCell.col] = {
      ...cell,
      userInput: cell.letter,
      isRevealed: true,
    };
    setPuzzle({ ...puzzle, grid: newGrid });
    setHintsUsed(prev => prev + 1);
  };

  // Verify answers with backend AI
  const verifyAnswers = async () => {
    if (!puzzle) return;
    setIsVerifying(true);
    setVerificationResult(null);
    setLastReward(undefined);

    try {
      // Collect user answers from grid
      const userAnswers: Array<[number, number, string]> = [];
      puzzle.grid.forEach((row, rowIdx) => {
        row.forEach((cell, colIdx) => {
          if (!cell.isBlocked && cell.userInput) {
            userAnswers.push([rowIdx, colIdx, cell.userInput.toUpperCase()]);
          }
        });
      });

      // Verify with backend
      const result = await CrosswordService.verifySolution(
        puzzle.id,
        userAnswers,
        identity
      );

      // Update grid with correctness
      const newGrid = puzzle.grid.map((row, rowIdx) =>
        row.map((cell, colIdx) => {
          if (cell.isBlocked) return cell;
          const userAnswer = userAnswers.find(
            ([r, c]) => r === rowIdx && c === colIdx
          );
          const isCorrect = userAnswer 
            ? userAnswer[2].toUpperCase() === cell.letter.toUpperCase()
            : false;
          return { ...cell, isCorrect };
        })
      );

      setPuzzle({ ...puzzle, grid: newGrid });
      setVerificationResult(result.correct ? 'correct' : 'incorrect');
      
      if (result.correct) {
        setIsPlaying(false);
        
        // Use backend rewards
        const timeBonus = Math.max(0, (300 - timer) * 1000); // Bonus for fast completion
        const hintPenalty = hintsUsed * 5_000_000; // Penalty for hints
        const streakBonus = stats.streak * 2_000_000; // Streak bonus
        const finalReward = result.harleeReward + BigInt(timeBonus) + BigInt(streakBonus) - BigInt(hintPenalty);
        
        setLastReward(finalReward > BigInt(0) ? finalReward : result.harleeReward);
        
        // Update stats
        setStats(prev => ({
          ...prev,
          totalSolved: prev.totalSolved + 1,
          streak: prev.streak + 1,
          totalXP: prev.totalXP + result.xpReward,
          totalHarlee: prev.totalHarlee + (finalReward > BigInt(0) ? finalReward : result.harleeReward),
          bestTime: timer < prev.bestTime || prev.bestTime === 0 ? timer : prev.bestTime,
        }));

        // Update KIP stats
        if (principal) {
          try {
            const { kipService } = await import('../../services/kipService');
            const principalObj = Principal.fromText(principal.toString());
            await kipService.updateUserStats(
              principalObj,
              {
                crosswords_solved: 1,
                harlee_earned: Number(finalReward > BigInt(0) ? finalReward : result.harleeReward),
              },
              identity || undefined
            );
          } catch (error) {
            console.error('Failed to update KIP stats:', error);
          }
        }
      }
    } catch (error) {
      console.error('Failed to verify solution:', error);
      setVerificationResult('incorrect');
    } finally {
      setIsVerifying(false);
      setTimeout(() => {
        setVerificationResult(null);
        setLastReward(undefined);
      }, 5000);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      className="min-h-screen pt-20 md:pt-24 pb-12 relative"
      style={{ 
        backgroundImage: `url(${questBackground})`, 
        backgroundSize: 'contain',
        backgroundPosition: 'top center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'scroll'
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/80" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6 md:mb-8"
        >
          <div className="relative w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 md:mb-6">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 bg-gradient-to-t from-emerald-500 to-teal-400 rounded-2xl opacity-30 blur-xl"
            />
            <div className="relative w-full h-full bg-gradient-to-br from-raven-dark to-raven-charcoal rounded-2xl border border-emerald-500/30 flex items-center justify-center">
              <span className="text-3xl md:text-4xl">🧩</span>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold mb-2 md:mb-4">
            <span className="text-white">Raven's Knowledge</span>{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              Crossword Quest
            </span>
          </h1>
          <p className="text-base md:text-lg text-silver-400 max-w-xl mx-auto flex items-center justify-center gap-2">
            <Brain className="w-4 h-4 md:w-5 md:h-5 text-emerald-400" />
            AI-Generated Puzzles with $HARLEE Rewards
          </p>
          <p className="text-gold-400 text-sm mt-2">
            Powered by $HARLEE Token (Ledger: {HARLEE_TOKEN.ledger.slice(0, 10)}...)
          </p>
        </motion.div>

        {/* Stats Dashboard */}
        <StatsDashboard stats={stats} />

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Puzzle Area */}
          <div className="lg:col-span-2">
            <div className="glass rounded-2xl p-4 md:p-6 border border-emerald-500/20">
              {/* Puzzle Header */}
              <div className="flex items-center justify-between mb-4 md:mb-6 flex-wrap gap-2">
                <div>
                  <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2 flex-wrap">
                    {puzzle?.title || 'Daily Challenge'}
                    {puzzle?.aiGenerated && (
                      <span className="px-2 py-0.5 bg-gold-500/20 text-gold-400 text-xs rounded-full flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        AI Generated
                      </span>
                    )}
                  </h2>
                  <p className="text-sm text-silver-500">{puzzle?.theme || 'Generate a puzzle to start'}</p>
                </div>
                <div className="flex items-center gap-2 md:gap-4">
                  <div className="flex items-center gap-1 md:gap-2 text-silver-400">
                    <Clock className="w-4 h-4 md:w-5 md:h-5" />
                    <span className="font-mono text-base md:text-lg">{formatTime(timer)}</span>
                  </div>
                </div>
              </div>

              {/* Puzzle Grid */}
              {puzzle ? (
                <div className="flex justify-center mb-4 md:mb-6 overflow-x-auto pb-2">
                  <CrosswordGrid
                    puzzle={puzzle}
                    selectedCell={selectedCell}
                    onCellSelect={(row, col) => setSelectedCell({ row, col })}
                    onInputChange={handleInputChange}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-48 md:h-64">
                  <button
                    onClick={generatePuzzle}
                    disabled={isGenerating}
                    className="btn-gold flex items-center gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Generating with AI...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Generate AI Puzzle
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              {puzzle && (
                <div className="flex flex-wrap gap-2 md:gap-3 justify-center">
                  <button
                    onClick={useHint}
                    className="px-3 md:px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-colors flex items-center gap-1 md:gap-2 text-sm"
                  >
                    <Lightbulb className="w-4 h-4" />
                    Hint ({3 - hintsUsed} left)
                  </button>
                  <button
                    onClick={verifyAnswers}
                    disabled={isVerifying}
                    className="px-3 md:px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors flex items-center gap-1 md:gap-2 text-sm"
                  >
                    {isVerifying ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4" />
                        AI Verify
                      </>
                    )}
                  </button>
                  <button
                    onClick={generatePuzzle}
                    className="px-3 md:px-4 py-2 bg-gray-700 text-silver-300 rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-1 md:gap-2 text-sm"
                  >
                    <RefreshCw className="w-4 h-4" />
                    New Puzzle
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Clues Panel */}
          <div className="glass rounded-2xl p-4 md:p-6 border border-emerald-500/20">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <PuzzleIcon className="w-5 h-5 text-emerald-400" />
              Clues
            </h3>
            {puzzle ? (
              <CluesPanel
                clues={puzzle.clues}
                selectedClue={selectedClue}
                onClueSelect={setSelectedClue}
              />
            ) : (
              <p className="text-silver-500 text-center py-8">
                Generate a puzzle to see clues
              </p>
            )}

            {/* $HARLEE Rewards Info */}
            {puzzle && (
              <div className="mt-6 pt-6 border-t border-gray-700">
                <h4 className="text-sm font-semibold text-silver-400 mb-3 flex items-center gap-2">
                  <Coins className="w-4 h-4 text-gold-400" />
                  $HARLEE Rewards
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-silver-500">Base Reward</span>
                    <span className="text-gold-400 font-semibold">{formatHarlee(puzzle.rewards.harlee)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-silver-500">Time Bonus</span>
                    <span className="text-emerald-400 font-semibold">Up to +0.30</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-silver-500">Streak Bonus</span>
                    <span className="text-orange-400 font-semibold">+{(stats.streak * 0.02).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-silver-500">NFT Drop Chance</span>
                    <span className="text-purple-400 font-semibold">{puzzle.rewards.nftChance * 100}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* NFT Badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 md:mt-8"
        >
          <div className="glass rounded-2xl p-4 md:p-6 border border-emerald-500/20">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Gift className="w-5 h-5 text-purple-400" />
              Your NFT Badges
            </h3>
            <div className="flex flex-wrap gap-3 md:gap-4">
              {stats.nftBadges.map((badge, index) => (
                <div
                  key={index}
                  className="w-12 h-12 md:w-16 md:h-16 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center text-2xl md:text-3xl"
                >
                  {badge}
                </div>
              ))}
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl border-2 border-dashed border-gray-700 flex items-center justify-center">
                <span className="text-gray-600 text-xl md:text-2xl">?</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* AI Verification Modal */}
      <AIVerification isVerifying={isVerifying} result={verificationResult} reward={lastReward} />
    </div>
  );
}
