/**
 * Canister Configuration for The Raven Project
 * Mainnet canister IDs for all deployed canisters
 */

// Mainnet canister IDs - deployed on IC mainnet
export const CANISTER_IDS = {
  core: 'qb6fv-6aaaa-aaaao-a4w7q-cai',
  nft: '37ixl-fiaaa-aaaao-a4xaa-cai',
  kip: '3yjr7-iqaaa-aaaao-a4xaq-cai',
  treasury: '3rk2d-6yaaa-aaaao-a4xba-cai',
  escrow: '3wl4x-taaaa-aaaao-a4xbq-cai',
  logistics: '3dmn2-siaaa-aaaao-a4xca-cai',
  ai_engine: '3enlo-7qaaa-aaaao-a4xcq-cai',
  raven_ai: '3noas-jyaaa-aaaao-a4xda-cai',
  assets: '3kpgg-eaaaa-aaaao-a4xdq-cai',
  // New AI infrastructure canisters
  deepseek_model: 'kqj56-2aaaa-aaaao-a4ygq-cai',
  vector_db: 'kzkwc-miaaa-aaaao-a4yha-cai',
  queen_bee: 'k6lqw-bqaaa-aaaao-a4yhq-cai',
  staking: 'inutw-jiaaa-aaaao-a4yja-cai',
  // AXIOM NFT canisters
  axiom_nft: 'arx4x-cqaaa-aaaao-a4z5q-cai',
  axiom_1: '46odg-5iaaa-aaaao-a4xqa-cai',
  axiom_2: '4zpfs-qqaaa-aaaao-a4xqq-cai',
  axiom_3: '4ckzx-kiaaa-aaaao-a4xsa-cai',
  axiom_4: '4fl7d-hqaaa-aaaao-a4xsq-cai',
  axiom_5: '4miu7-ryaaa-aaaao-a4xta-cai',
  // IC SPICY canister (Flagship RWA)
  icspicy: import.meta.env.VITE_ICSPICY_CANISTER_ID || 'vmcfj-haaaa-aaaao-a4o3q-cai',
  // Multi-chain authentication canisters
  siwe_canister: import.meta.env.VITE_SIWE_CANISTER_ID || 'ehdei-liaaa-aaaao-a4zfa-cai',
  siws_canister: import.meta.env.VITE_SIWS_CANISTER_ID || 'eacc4-gqaaa-aaaao-a4zfq-cai',
  siwb_canister: import.meta.env.VITE_SIWB_CANISTER_ID || 'evftr-hyaaa-aaaao-a4zga-cai',
  sis_canister: import.meta.env.VITE_SIS_CANISTER_ID || 'e3h6z-4iaaa-aaaao-a4zha-cai',
  ordinals_canister: import.meta.env.VITE_ORDINALS_CANISTER_ID || 'gb3wf-cyaaa-aaaao-a4zia-cai',
} as const;

// ICP Ledger canister for payments
export const ICP_LEDGER_CANISTER_ID = 'ryjl3-tyaaa-aaaaa-aaaba-cai';

// Chain-key token canisters
export const CK_TOKEN_CANISTERS = {
  ckBTC: 'mxzaz-hqaaa-aaaar-qaada-cai',
  ckETH: 'ss2fx-dyaaa-aaaar-qacoq-cai',
  ckUSDC: 'xevnm-gaaaa-aaaar-qafnq-cai',
} as const;

// ICPay Configuration
export const ICPAY_PUBLISHABLE_KEY = 'pk_live_55Z2W9X8Y7Z6A5B4C3D2E1'; // Updated from user query

// Detect if we're on mainnet
export const isMainnet = (): boolean => {
  if (typeof window === 'undefined') return true;
  const hostname = window.location.hostname;
  return (
    hostname.endsWith('.ic0.app') ||
    hostname.endsWith('.icp0.io') ||
    hostname.endsWith('.raw.ic0.app')
  );
};

// Get the IC host based on environment
export const getICHost = (): string => {
  // Use ic0.app for mainnet (standard IC endpoint)
  // Plug wallet and other tools expect this format
  return isMainnet() ? 'https://ic0.app' : 'http://127.0.0.1:4943';
};

// Get canister ID by name
export const getCanisterId = (name: keyof typeof CANISTER_IDS): string => {
  return CANISTER_IDS[name];
};

// Get all canister IDs for Plug wallet whitelist
export const getAllCanisterIds = (): string[] => {
  return [
    ...Object.values(CANISTER_IDS),
    ICP_LEDGER_CANISTER_ID,
    ...Object.values(CK_TOKEN_CANISTERS),
  ];
};


