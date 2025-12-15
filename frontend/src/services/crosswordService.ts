/**
 * Crossword Service - AI-Generated Crossword Puzzles
 * Connects to raven_ai canister for puzzle generation and verification
 */

import { Actor, HttpAgent, Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { IDL } from '@dfinity/candid';
import { getCanisterId, getICHost, isMainnet } from './canisterConfig';

// Types matching the backend
export interface CrosswordClue {
  number: number;
  direction: string;  // "across" or "down"
  clue: string;
  answer: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface CrosswordPuzzle {
  id: string;
  title: string;
  theme: string;
  grid_size: number;
  clues: CrosswordClue[];
  answers: Array<[number, number, string]>;  // (row, col, letter)
  difficulty: 'easy' | 'medium' | 'hard';
  ai_generated: boolean;
  created_at: bigint;
  rewards_harlee: bigint;  // in e8s
  rewards_xp: number;
}

// Crossword canister IDL
const crosswordIdlFactory = ({ IDL }: { IDL: typeof IDL }) => {
  const PuzzleDifficulty = IDL.Variant({
    'Easy': IDL.Null,
    'Medium': IDL.Null,
    'Hard': IDL.Null,
  });

  const CrosswordClue = IDL.Record({
    'number': IDL.Nat32,
    'direction': IDL.Text,
    'clue': IDL.Text,
    'answer': IDL.Text,
    'difficulty': PuzzleDifficulty,
  });

  const CrosswordPuzzle = IDL.Record({
    'id': IDL.Text,
    'title': IDL.Text,
    'theme': IDL.Text,
    'grid_size': IDL.Nat32,
    'clues': IDL.Vec(CrosswordClue),
    'answers': IDL.Vec(IDL.Tuple(IDL.Nat32, IDL.Nat32, IDL.Text)),
    'difficulty': PuzzleDifficulty,
    'ai_generated': IDL.Bool,
    'created_at': IDL.Nat64,
    'rewards_harlee': IDL.Nat64,
    'rewards_xp': IDL.Nat32,
  });

  return IDL.Service({
    'generate_crossword_puzzle': IDL.Func(
      [IDL.Text, PuzzleDifficulty],
      [IDL.Variant({ 'Ok': CrosswordPuzzle, 'Err': IDL.Text })],
      []
    ),
    'get_crossword_puzzle': IDL.Func([IDL.Text], [IDL.Opt(CrosswordPuzzle)], ['query']),
    'verify_crossword_solution': IDL.Func(
      [IDL.Text, IDL.Vec(IDL.Tuple(IDL.Nat32, IDL.Nat32, IDL.Text))],
      [IDL.Variant({ 'Ok': IDL.Tuple(IDL.Bool, IDL.Nat64, IDL.Nat32), 'Err': IDL.Text })],
      []
    ),
    'get_recent_crossword_puzzles': IDL.Func([IDL.Nat32], [IDL.Vec(CrosswordPuzzle)], ['query']),
  });
};

// Create actor for crossword functions
async function createCrosswordActor(identity: Identity | null): Promise<any> {
  const isLocal = !isMainnet();
  const agent = new HttpAgent({
    identity: identity || undefined,
    host: getICHost(),
  });

  if (isLocal) {
    await agent.fetchRootKey();
  }

  const canisterId = getCanisterId('raven_ai');
  return Actor.createActor(crosswordIdlFactory, {
    agent,
    canisterId,
  });
}

// Helper to convert backend difficulty to frontend
function convertDifficulty(difficulty: any): 'easy' | 'medium' | 'hard' {
  if (typeof difficulty === 'object') {
    if ('Easy' in difficulty) return 'easy';
    if ('Medium' in difficulty) return 'medium';
    if ('Hard' in difficulty) return 'hard';
  }
  return 'medium';
}

// Helper to convert frontend difficulty to backend
function convertDifficultyToBackend(difficulty: 'easy' | 'medium' | 'hard'): any {
  switch (difficulty) {
    case 'easy':
      return { Easy: null };
    case 'medium':
      return { Medium: null };
    case 'hard':
      return { Hard: null };
  }
}

export class CrosswordService {
  /**
   * Generate a new crossword puzzle using AI
   */
  static async generatePuzzle(
    theme: string,
    difficulty: 'easy' | 'medium' | 'hard',
    identity: Identity | null
  ): Promise<CrosswordPuzzle> {
    const actor = await createCrosswordActor(identity);
    const backendDifficulty = convertDifficultyToBackend(difficulty);
    
    const result = await actor.generate_crossword_puzzle(theme, backendDifficulty);
    
    if ('Ok' in result) {
      const puzzle = result.Ok;
      return {
        id: puzzle.id,
        title: puzzle.title,
        theme: puzzle.theme,
        grid_size: Number(puzzle.grid_size),
        clues: puzzle.clues.map((c: any) => ({
          number: Number(c.number),
          direction: c.direction,
          clue: c.clue,
          answer: c.answer,
          difficulty: convertDifficulty(c.difficulty),
        })),
        answers: puzzle.answers.map((a: any) => [Number(a[0]), Number(a[1]), a[2]]),
        difficulty: convertDifficulty(puzzle.difficulty),
        ai_generated: puzzle.ai_generated,
        created_at: BigInt(puzzle.created_at),
        rewards_harlee: BigInt(puzzle.rewards_harlee),
        rewards_xp: Number(puzzle.rewards_xp),
      };
    } else {
      throw new Error(result.Err);
    }
  }

  /**
   * Get a crossword puzzle by ID
   */
  static async getPuzzle(
    puzzleId: string,
    identity: Identity | null = null
  ): Promise<CrosswordPuzzle | null> {
    const actor = await createCrosswordActor(identity);
    const result = await actor.get_crossword_puzzle(puzzleId);
    
    if (result.length === 0 || !result[0]) {
      return null;
    }
    
    const puzzle = result[0];
    return {
      id: puzzle.id,
      title: puzzle.title,
      theme: puzzle.theme,
      grid_size: Number(puzzle.grid_size),
      clues: puzzle.clues.map((c: any) => ({
        number: Number(c.number),
        direction: c.direction,
        clue: c.clue,
        answer: c.answer,
        difficulty: convertDifficulty(c.difficulty),
      })),
      answers: puzzle.answers.map((a: any) => [Number(a[0]), Number(a[1]), a[2]]),
      difficulty: convertDifficulty(puzzle.difficulty),
      ai_generated: puzzle.ai_generated,
      created_at: BigInt(puzzle.created_at),
      rewards_harlee: BigInt(puzzle.rewards_harlee),
      rewards_xp: Number(puzzle.rewards_xp),
    };
  }

  /**
   * Verify a crossword solution
   */
  static async verifySolution(
    puzzleId: string,
    userAnswers: Array<[number, number, string]>,
    identity: Identity | null
  ): Promise<{ correct: boolean; harleeReward: bigint; xpReward: number }> {
    const actor = await createCrosswordActor(identity);
    
    const result = await actor.verify_crossword_solution(
      puzzleId,
      userAnswers.map(a => [a[0], a[1], a[2]])
    );
    
    if ('Ok' in result) {
      const [correct, harlee, xp] = result.Ok;
      return {
        correct,
        harleeReward: BigInt(harlee),
        xpReward: Number(xp),
      };
    } else {
      throw new Error(result.Err);
    }
  }

  /**
   * Get recent crossword puzzles
   */
  static async getRecentPuzzles(
    limit: number = 10,
    identity: Identity | null = null
  ): Promise<CrosswordPuzzle[]> {
    const actor = await createCrosswordActor(identity);
    const puzzles = await actor.get_recent_crossword_puzzles(limit);
    
    return puzzles.map((puzzle: any) => ({
      id: puzzle.id,
      title: puzzle.title,
      theme: puzzle.theme,
      grid_size: Number(puzzle.grid_size),
      clues: puzzle.clues.map((c: any) => ({
        number: Number(c.number),
        direction: c.direction,
        clue: c.clue,
        answer: c.answer,
        difficulty: convertDifficulty(c.difficulty),
      })),
      answers: puzzle.answers.map((a: any) => [Number(a[0]), Number(a[1]), a[2]]),
      difficulty: convertDifficulty(puzzle.difficulty),
      ai_generated: puzzle.ai_generated,
      created_at: BigInt(puzzle.created_at),
      rewards_harlee: BigInt(puzzle.rewards_harlee),
      rewards_xp: Number(puzzle.rewards_xp),
    }));
  }
}



