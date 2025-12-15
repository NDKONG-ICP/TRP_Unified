/// <reference types="vite/client" />

// Image imports
declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.jpeg' {
  const src: string;
  export default src;
}

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.gif' {
  const src: string;
  export default src;
}

declare module '*.GIF' {
  const src: string;
  export default src;
}

declare module '*.PNG' {
  const src: string;
  export default src;
}

declare module '*.JPG' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  const src: string;
  export default src;
}

declare module '*.webp' {
  const src: string;
  export default src;
}

// Environment variables
interface ImportMetaEnv {
  readonly VITE_CANISTER_ID_CORE: string;
  readonly VITE_CANISTER_ID_NFT: string;
  readonly VITE_CANISTER_ID_KIP: string;
  readonly VITE_CANISTER_ID_TREASURY: string;
  readonly VITE_CANISTER_ID_ESCROW: string;
  readonly VITE_CANISTER_ID_LOGISTICS: string;
  readonly VITE_CANISTER_ID_AI_ENGINE: string;
  readonly VITE_CANISTER_ID_RAVEN_AI: string;
  readonly VITE_DFX_NETWORK: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}



