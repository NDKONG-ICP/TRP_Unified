import type { ActorSubclass } from '@dfinity/agent';
import { _SERVICE } from './icspicy.did';

// IDL Factory - will be generated from .did file if needed
// For now, using a minimal stub that can be replaced with generated code
export const idlFactory = ({ IDL }: { IDL: typeof import('@dfinity/candid').IDL }) => {
  // This is a placeholder - should be generated from icspicy.did using dfx generate
  return IDL.Service({});
};

export type _SERVICE = _SERVICE;

