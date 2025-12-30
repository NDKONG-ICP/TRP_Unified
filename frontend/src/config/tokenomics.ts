/**
 * $HARLEE Tokenomics Configuration
 * 
 * Central source of truth for all tokenomics-related constants.
 * All components should import from here to ensure consistency.
 */

// ============================================================================
// Token Information
// ============================================================================

export const HARLEE_TOKEN = {
  name: 'HARLEE',
  symbol: '$HARLEE',
  decimals: 8,
  totalSupply: 100_000_000, // 100 million
  totalSupplyFormatted: '100,000,000',
  ledgerCanisterId: 'tlm4l-kaaaa-aaaah-qqeha-cai',
  indexCanisterId: '5ipsq-2iaaa-aaaae-qffka-cai',
  standard: 'ICRC-1',
} as const;

// ============================================================================
// Token Distribution
// ============================================================================

export const TOKEN_DISTRIBUTION = {
  communityRewards: { percentage: 40, amount: 40_000_000, label: 'Community & Rewards' },
  development: { percentage: 20, amount: 20_000_000, label: 'Development' },
  teamAdvisors: { percentage: 15, amount: 15_000_000, label: 'Team & Advisors' },
  treasury: { percentage: 15, amount: 15_000_000, label: 'Treasury' },
  liquidity: { percentage: 10, amount: 10_000_000, label: 'Liquidity' },
} as const;

// ============================================================================
// Staking Rewards
// ============================================================================

export const STAKING_REWARDS = {
  /** Base reward per week per NFT (in $HARLEE, not e8s) */
  weeklyRewardPerNFT: 100,
  
  /** Reward per week in e8s (100 * 10^8) */
  weeklyRewardE8s: 10_000_000_000n,
  
  /** Seconds per week for calculations */
  secondsPerWeek: 604800,
  
  /** Rarity multipliers */
  rarityMultipliers: {
    common: 1.0,
    rare: 1.5,
    epic: 2.0,
    legendary: 3.0,
  },
  
  /** Sk8 Punks collection canister */
  sk8PunksCollection: 'b4mk6-5qaaa-aaaah-arerq-cai',
} as const;

// ============================================================================
// Game Rewards
// ============================================================================

export const GAME_REWARDS = {
  crossword: {
    /** Reward per completed puzzle in $HARLEE */
    perPuzzle: 1,
    /** Reward per completed puzzle in e8s */
    perPuzzleE8s: 100_000_000n,
    /** Streak bonus multiplier per 5 days */
    streakMultiplier: 1.5,
  },
  sk8Punks: {
    /** Base reward for high score achievements */
    highScoreReward: 10,
    /** Tournament entry rewards */
    tournamentRewards: {
      first: 1000,
      second: 500,
      third: 250,
    },
  },
} as const;

// ============================================================================
// News & Content Rewards
// ============================================================================

export const CONTENT_REWARDS = {
  /** Minimum tip amount in e8s */
  minTipE8s: 10_000_000n, // 0.1 $HARLEE
  
  /** Tip presets in e8s */
  tipPresets: [
    { label: '0.1 $HARLEE', value: 10_000_000n },
    { label: '1 $HARLEE', value: 100_000_000n },
    { label: '5 $HARLEE', value: 500_000_000n },
    { label: '10 $HARLEE', value: 1_000_000_000n },
  ],
  
  /** Article generation reward */
  articleRewardE8s: 100_000_000n, // 1 $HARLEE
  
  /** Meme creation reward */
  memeRewardE8s: 50_000_000n, // 0.5 $HARLEE
} as const;

// ============================================================================
// Platform Fees
// ============================================================================

export const PLATFORM_FEES = {
  /** NFT minting fee percentage */
  nftMintingFee: 3,
  
  /** Logistics platform fee percentage */
  logisticsFee: 3,
  
  /** Gaming/AI subscription fee percentage */
  gamingAIFee: 5,
  
  /** Fee distribution */
  feeDistribution: {
    stakingPool: 50, // 50% to staking rewards
    development: 30, // 30% to development
    treasury: 20,    // 20% to community treasury
  },
} as const;

// ============================================================================
// AI Subscription Tiers
// ============================================================================

export const AI_SUBSCRIPTIONS = {
  demo: {
    name: 'Demo',
    priceHarlee: 0,
    priceE8s: 0n,
    queriesPerDay: 5,
    durationDays: 7,
  },
  basic: {
    name: 'Basic',
    priceHarlee: 100,
    priceE8s: 10_000_000_000n,
    queriesPerDay: 50,
    durationDays: 30,
  },
  pro: {
    name: 'Pro',
    priceHarlee: 500,
    priceE8s: 50_000_000_000n,
    queriesPerDay: 500,
    durationDays: 30,
  },
  enterprise: {
    name: 'Enterprise',
    priceHarlee: 2000,
    priceE8s: 200_000_000_000n,
    queriesPerDay: -1, // unlimited
    durationDays: 30,
  },
} as const;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert e8s to $HARLEE (human readable)
 */
export function e8sToHarlee(e8s: bigint): number {
  return Number(e8s) / Math.pow(10, HARLEE_TOKEN.decimals);
}

/**
 * Convert $HARLEE to e8s
 */
export function harleeToE8s(harlee: number): bigint {
  return BigInt(Math.floor(harlee * Math.pow(10, HARLEE_TOKEN.decimals)));
}

/**
 * Format e8s as $HARLEE string
 */
export function formatHarleeFromE8s(e8s: bigint, decimals: number = 2): string {
  const value = e8sToHarlee(e8s);
  return value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format $HARLEE number with symbol
 */
export function formatHarlee(amount: number, decimals: number = 2): string {
  return `${amount.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} $HARLEE`;
}

/**
 * Calculate weekly staking reward for a rarity
 */
export function calculateWeeklyReward(
  nftCount: number,
  rarity: keyof typeof STAKING_REWARDS.rarityMultipliers = 'common'
): number {
  const multiplier = STAKING_REWARDS.rarityMultipliers[rarity];
  return STAKING_REWARDS.weeklyRewardPerNFT * nftCount * multiplier;
}

/**
 * Calculate monthly staking reward
 */
export function calculateMonthlyReward(
  nftCount: number,
  rarity: keyof typeof STAKING_REWARDS.rarityMultipliers = 'common'
): number {
  return calculateWeeklyReward(nftCount, rarity) * 4;
}

/**
 * Calculate yearly staking reward
 */
export function calculateYearlyReward(
  nftCount: number,
  rarity: keyof typeof STAKING_REWARDS.rarityMultipliers = 'common'
): number {
  return calculateWeeklyReward(nftCount, rarity) * 52;
}

